import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { httpLogger, logger, dbLogger, logError } from "./logger";
import { initializeJobs, startAllJobs, stopAllJobs } from "./jobs";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

const app = express();

// Trust proxy para logging
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

// Servir archivos estáticos de uploads
app.use("/uploads", express.static("uploads"));

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

/**
 * Creates initial admin user if no admin exists in the system
 * Uses environment variables: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD
 */
async function createInitialAdmin() {
  try {
    // Get admin role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'Administrador' }
    });

    if (!adminRole) {
      logger.warn('⚠️  Rol Administrador no encontrado. Ejecuta las migraciones primero.');
      return;
    }

    // Check if any admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { roleId: adminRole.id }
    });

    if (existingAdmin) {
      logger.info('ℹ️  Usuario administrador ya existe en el sistema');
      return;
    }

    // SECURITY: Require environment variables - no default credentials
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminUsername || !adminPassword) {
      logger.fatal(
        '\n' +
        '╔═══════════════════════════════════════════════════════════════════════╗\n' +
        '║  ❌ ERROR CRÍTICO: CONFIGURACIÓN DE ADMINISTRADOR REQUERIDA           ║\n' +
        '╠═══════════════════════════════════════════════════════════════════════╣\n' +
        '║                                                                       ║\n' +
        '║  No existe ningún usuario administrador en el sistema y las           ║\n' +
        '║  variables de entorno no están configuradas.                          ║\n' +
        '║                                                                       ║\n' +
        '║  Configura las siguientes variables en tu archivo .env:              ║\n' +
        '║                                                                       ║\n' +
        '║    ADMIN_EMAIL=tu-email@ejemplo.com                                   ║\n' +
        '║    ADMIN_USERNAME=tu-usuario                                          ║\n' +
        '║    ADMIN_PASSWORD=tu-contraseña-segura                                ║\n' +
        '║                                                                       ║\n' +
        '║  Requisitos:                                                          ║\n' +
        '║    - Email válido (debe contener @)                                   ║\n' +
        '║    - Usuario mínimo 3 caracteres                                      ║\n' +
        '║    - Contraseña mínimo 6 caracteres                                   ║\n' +
        '║                                                                       ║\n' +
        '║  El servidor se detendrá por seguridad.                               ║\n' +
        '║                                                                       ║\n' +
        '╚═══════════════════════════════════════════════════════════════════════╝\n'
      );
      process.exit(1);
    }

    // Validate credentials format
    const validationErrors: string[] = [];

    // Check for exact placeholder values from .env.example (SECURITY)
    const forbiddenPlaceholders = {
      email: [
        'CAMBIAR_ESTE_EMAIL@ejemplo.com',
        'CAMBIAR_ESTE_EMAIL@EJEMPLO.COM',
        'admin@asesoriallave.com',  // Old example
        'admin@tuempresa.com',      // Documentation example
      ],
      username: [
        'CAMBIAR_ESTE_USUARIO',
        'admin',                    // Common default
        'administrator',            // Common default
        'root',                     // Common default
      ],
      password: [
        'CAMBIAR_ESTA_CONTRASEÑA_AHORA',
        'CAMBIAR_ESTA_CONTRASENA_AHORA',  // Without tilde
        'Admin123!',                       // Old example
        'admin123',                        // Common weak
        'password',                        // Common weak
        'password123',                     // Common weak
        'CambiaEstoAhora123!',            // Documentation example
      ]
    };

    // Check email against known placeholders (case-insensitive)
    if (forbiddenPlaceholders.email.some(p => p.toLowerCase() === adminEmail.toLowerCase())) {
      validationErrors.push('- ADMIN_EMAIL es un valor de ejemplo. Usa un email real único.');
    }

    // Check username against known placeholders (case-insensitive)
    if (forbiddenPlaceholders.username.some(p => p.toLowerCase() === adminUsername.toLowerCase())) {
      validationErrors.push('- ADMIN_USERNAME es un valor de ejemplo o común. Usa un usuario único.');
    }

    // Check password against known placeholders and weak passwords (case-insensitive)
    if (forbiddenPlaceholders.password.some(p => p.toLowerCase() === adminPassword.toLowerCase())) {
      validationErrors.push('- ADMIN_PASSWORD es un valor de ejemplo o muy débil. Usa una contraseña segura única.');
    }

    if (adminUsername.length < 3) {
      validationErrors.push('- ADMIN_USERNAME debe tener al menos 3 caracteres');
    }

    if (adminPassword.length < 6) {
      validationErrors.push('- ADMIN_PASSWORD debe tener al menos 6 caracteres');
    }

    if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
      validationErrors.push('- ADMIN_EMAIL debe ser un email válido (ejemplo: admin@ejemplo.com)');
    }

    if (validationErrors.length > 0) {
      logger.fatal(
        '\n' +
        '╔═══════════════════════════════════════════════════════════════════════╗\n' +
        '║  ❌ ERROR: CREDENCIALES DE ADMINISTRADOR INVÁLIDAS                    ║\n' +
        '╠═══════════════════════════════════════════════════════════════════════╣\n' +
        '║                                                                       ║\n' +
        `║  ${validationErrors.join('\n║  ')}                                   ║\n` +
        '║                                                                       ║\n' +
        '║  Corrige las variables en tu archivo .env y reinicia el servidor.    ║\n' +
        '║                                                                       ║\n' +
        '╚═══════════════════════════════════════════════════════════════════════╝\n'
      );
      process.exit(1);
    }

    // Check if user with same email or username exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username: adminUsername }
        ]
      }
    });

    if (existingUser) {
      logger.fatal(
        `\n❌ ERROR: Usuario con email ${adminEmail} o username ${adminUsername} ya existe.\n` +
        '   Usa credenciales diferentes para el administrador inicial.\n'
      );
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole.id,
      }
    });

    logger.info(
      '\n' +
      '╔═══════════════════════════════════════════════════════════════════════╗\n' +
      '║  ✅ ADMINISTRADOR INICIAL CREADO EXITOSAMENTE                         ║\n' +
      '╠═══════════════════════════════════════════════════════════════════════╣\n' +
      '║                                                                       ║\n' +
      `║  Usuario: ${adminUser.username.padEnd(56)} ║\n` +
      `║  Email:   ${adminUser.email.padEnd(56)} ║\n` +
      '║                                                                       ║\n' +
      '║  🔐 IMPORTANTE: Cambia la contraseña después del primer login         ║\n' +
      '║                                                                       ║\n' +
      '╚═══════════════════════════════════════════════════════════════════════╝\n'
    );

  } catch (error) {
    logger.fatal({ err: error }, '❌ Error crítico creando usuario administrador inicial');
    process.exit(1);
  }
}

(async () => {
  // Create initial admin user if needed
  await createInitialAdmin();

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
