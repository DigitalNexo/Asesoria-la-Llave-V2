import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { httpLogger, logger, dbLogger, logError } from "./logger";
import { initializeJobs, startAllJobs, stopAllJobs } from "./jobs";
import rateLimit from "express-rate-limit";

const app = express();

// Trust proxy for rate limiting and logging
app.set("trust proxy", 1);

const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

// Logging de Prisma
prisma.$on("query", (e) => {
  dbLogger.debug({ duration: e.duration, query: e.query }, "Database query");
});

prisma.$on("error", (e) => {
  dbLogger.error({ target: e.target }, e.message);
});

prisma.$on("warn", (e) => {
  dbLogger.warn({ target: e.target }, e.message);
});

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde",
});

app.use(limiter);

// Security middleware
const isDev = process.env.NODE_ENV === "development";

app.use(helmet({
  contentSecurityPolicy: isDev ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || (isDev ? "*" : false),
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Pino HTTP logger con request-id
app.use(httpLogger);

// Health check endpoints (sin autenticación)
app.get("/health", async (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/ready", async (_req: Request, res: Response) => {
  try {
    // Verificar conexión a base de datos
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      database: "connected",
      s3: process.env.S3_ENDPOINT ? "configured" : "not configured",
      smtp: process.env.SMTP_HOST ? "configured" : "not configured",
    });
  } catch (error) {
    logger.error({ err: error }, "Readiness check failed");
    res.status(503).json({
      status: "not ready",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

(async () => {
  // Inicializar sistema de jobs con PrismaClient compartido
  initializeJobs(prisma);

  // Iniciar jobs programados SOLO en entornos con procesos persistentes
  // NO en Autoscale Deployments (se escalan a cero cuando están inactivos)
  // 
  // Para habilitar jobs en Reserved VM Deployments, configura:
  // ENABLE_CRON_JOBS=true en las variables de entorno del deployment
  const enableCronJobs = process.env.ENABLE_CRON_JOBS === "true";
  
  if (isDev || enableCronJobs) {
    try {
      startAllJobs();
      logger.info("✅ Cron jobs iniciados");
    } catch (error) {
      logger.error({ err: error }, "Error iniciando jobs");
    }
  } else {
    logger.info(
      "ℹ️  Cron jobs deshabilitados (entorno Autoscale). " +
      "Use Scheduled Deployments de Replit para tareas programadas."
    );
  }

  const server = await registerRoutes(app);

  // Error handler global
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log del error con contexto
    logError(err, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      status,
    });

    res.status(status).json({
      error: message,
      ...(isDev && { stack: err.stack }),
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info({
      port,
      env: process.env.NODE_ENV,
      nodeVersion: process.version,
    }, `🚀 Server listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Detener jobs solo si fueron iniciados
    if (isDev || enableCronJobs) {
      try {
        stopAllJobs();
      } catch (error) {
        logger.error({ err: error }, "Error deteniendo jobs");
      }
    }
    
    // Cerrar conexión de base de datos
    await prisma.$disconnect();
    logger.info("Database connection closed");
    
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
