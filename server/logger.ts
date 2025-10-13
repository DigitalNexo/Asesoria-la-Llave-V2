import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

// Crear directorio de logs si no existe
const logsDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de rotación diaria
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
const logFile = path.join(logsDir, `app-${today}.log`);

// Logger base con pino
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  ...( process.env.NODE_ENV !== "development" && {
    // En producción, escribir a archivo
    stream: pino.destination({
      dest: logFile,
      sync: false,
    }),
  }),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

/**
 * Middleware HTTP con pino-http
 * Añade request-id automático y logging de todas las peticiones
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    // Usar request-id existente o generar uno nuevo
    const existingId = req.headers["x-request-id"];
    if (existingId && typeof existingId === "string") {
      return existingId;
    }
    return randomUUID();
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "info";
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "duration",
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers?.host,
        "user-agent": req.headers?.["user-agent"],
        "content-type": req.headers?.["content-type"],
      },
      remoteAddress: req.socket?.remoteAddress,
      remotePort: req.socket?.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type": typeof res.getHeader === "function" ? res.getHeader("content-type") : undefined,
        "content-length": typeof res.getHeader === "function" ? res.getHeader("content-length") : undefined,
      },
    }),
    err: pino.stdSerializers.err,
  },
  autoLogging: {
    ignore: (req) => {
      // Ignorar health checks y assets estáticos
      return !!(
        req.url === "/health" ||
        req.url === "/ready" ||
        req.url?.startsWith("/assets/") ||
        req.url?.startsWith("/favicon")
      );
    },
  },
});

/**
 * Logger de seguridad para eventos críticos
 */
export const securityLogger = logger.child({ module: "security" });

/**
 * Logger de base de datos
 */
export const dbLogger = logger.child({ module: "database" });

/**
 * Logger de autenticación
 */
export const authLogger = logger.child({ module: "auth" });

/**
 * Logger de jobs/cron
 */
export const jobLogger = logger.child({ module: "jobs" });

/**
 * Logger de S3/storage
 */
export const storageLogger = logger.child({ module: "storage" });

/**
 * Utilidad para logging de errores con stack trace
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      err: error,
      stack: error.stack,
      ...context,
    },
    error.message
  );
}

/**
 * Utilidad para logging de eventos de auditoría
 */
export function logAudit(
  action: string,
  userId: string,
  details: Record<string, any>
) {
  logger.info(
    {
      type: "audit",
      action,
      userId,
      ...details,
    },
    `Audit: ${action} by user ${userId}`
  );
}

/**
 * Rotación de logs - eliminar logs antiguos
 * Mantener solo los últimos N días de logs
 */
export function rotateOldLogs(retentionDays: number = 30) {
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000; // días a milisegundos

    files.forEach((file) => {
      if (!file.startsWith("app-") || !file.endsWith(".log")) return;

      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted old log file: ${file}`);
      }
    });
  } catch (error) {
    logger.error({ err: error }, "Error rotating logs");
  }
}

// Ejecutar rotación al iniciar (limpieza)
rotateOldLogs(30);

export default logger;
