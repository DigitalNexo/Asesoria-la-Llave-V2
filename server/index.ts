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

// Ensure DATABASE_URL is configured and points to MySQL/MariaDB
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  logger.fatal('\n\n❌ FATAL: DATABASE_URL no está configurada. Este proyecto requiere una base de datos MariaDB externa.\n' +
    'Por favor añade DATABASE_URL en tu archivo .env con el formato:\n' +
    '  mysql://USER:PASS@HOST:3306/asesoria_llave?socket_timeout=60&connect_timeout=60\n' +
    'o\n' +
    '  mariadb://USER:PASS@HOST:3306/asesoria_llave\n\n');
  process.exit(1);
}

// Accept both mysql:// and mariadb:// schemes
if (!/^mysql:\/\//i.test(dbUrl) && !/^mariadb:\/\//i.test(dbUrl)) {
  logger.fatal('\n\n❌ FATAL: DATABASE_URL debe usar el driver MySQL/MariaDB (mysql:// o mariadb://).\n' +
    `Valor actual: ${dbUrl}\n` +
    'Asegúrate de usar MariaDB como base de datos externa.\n\n');
  process.exit(1);
}

// If not explicitly allowed, disallow localhost/internal DBs to enforce external MariaDB
try {
  const parsed = new URL(dbUrl);
  const host = parsed.hostname;
  const allowLocal = process.env.ALLOW_LOCAL_DB === "true";

  const localHosts = ["localhost", "127.0.0.1", "::1", "db"];
  if (!allowLocal && localHosts.includes(host)) {
    logger.fatal('\n\n❌ FATAL: Se requiere una base de datos MariaDB EXTERNA.\n' +
      `DATABASE_URL apunta a un host local/internal: ${host}\n` +
      'Si quieres permitir uso de una base de datos local (ej. docker-compose) define ALLOW_LOCAL_DB=true en tu .env\n\n');
    process.exit(1);
  }
} catch (e) {
  // If URL parsing fails, it was already validated earlier; log and proceed
  logger.warn({ err: e }, 'No se pudo parsear DATABASE_URL para validación de host');
}

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
    // No abortar el arranque si la base de datos no está disponible en desarrollo
    const msg = (error as any)?.message || String(error);
    logger.error({ err: error }, '⚠️ No se pudo crear usuario administrador inicial');
    if (msg.includes("Can't reach database server") || msg.includes('PrismaClientInitializationError')) {
      logger.warn('DB no disponible. Continuando arranque para permitir trabajo de frontend/API stub.');
      return;
    }
    // Para otros errores, no tumbar el proceso
    return;
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
  
  // Some platforms (macOS, others) may not support SO_REUSEPORT and Node will
  // throw ENOTSUP when trying to listen with reusePort: true. Only enable
  // reusePort on platforms where it's commonly supported (Linux).
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };

  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }

  // Try listening on the desired port; if it's in use, try the next one up to +10
  const maxAttempts = 10;
  let attempts = 0;
  const startPort = port;

  const tryListen = (p: number) => {
    attempts += 1;
    const opts = { ...listenOptions, port: p };

    // Attach one-time handlers: 'error' to retry on EADDRINUSE, and 'listening' to log the actual bound port
    const onError = (err: any) => {
      if (err && err.code === 'EADDRINUSE') {
        logger.warn({ port: p }, `Puerto ${p} en uso, intentando puerto ${p + 1}...`);
        if (attempts <= maxAttempts) {
          // small delay before retrying to avoid tight loop
          setTimeout(() => tryListen(p + 1), 200);
          return;
        }
      }
      // if not handled above, rethrow/log and exit
      logger.fatal({ err }, `Error iniciando servidor en puerto ${p}`);
      process.exit(1);
    };

    const onListening = () => {
      // Remove the error handler now that listen succeeded
      server.removeListener('error', onError as any);
      const addr = server.address();
      const boundPort = typeof addr === 'object' && addr ? (addr as any).port : p;
      logger.info({
        port: boundPort,
        env: process.env.NODE_ENV,
        nodeVersion: process.version,
        reusePort: Boolean(listenOptions.reusePort),
      }, `🚀 Server listening on port ${boundPort}`);
    };

    server.once('error', onError);
    server.once('listening', onListening as any);
    server.listen(opts);
  };

  tryListen(startPort);

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
