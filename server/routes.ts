import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { prismaStorage as storage } from "./prisma-storage";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import {
  registerSchema,
  validateZod,
  userCreateSchema,
  smtpConfigSchema,
  smtpAccountSchema,
  githubConfigSchema,
  clientCreateSchema,
  clientUpdateSchema,
  taskCreateSchema,
  taxAssignmentCreateSchema,
  taxAssignmentUpdateSchema,
  validateTaxAssignmentAgainstRules,
} from "./utils/validators";
import multer from "multer";
import path from "path";
import fs from "fs";
import { configureSMTP, getSMTPConfig, checkAndSendReminders } from "./email";
import { setSocketIO, notifyTaskChange, notifyClientChange, notifyTaxChange, notifyManualChange } from "./websocket";
import adminSessionsRouter from './admin-sessions';
import priceCatalogRouter from './price-catalog';
import budgetsRouter from './budgets';
import publicBudgetsRouter from './public-budgets';
import budgetParametersRouter from './budget-parameters';
import budgetTemplatesRouter from './budget-templates';
import { documentsRouter } from './documents';
import { checkForUpdates, getCurrentVersion } from "./services/version-service.js";
import { createSystemBackup, listBackups, restoreFromBackup } from "./services/backup-service.js";
import { performSystemUpdate, verifyGitSetup, getUpdateHistory } from "./services/update-service.js";
import { StorageFactory, encryptPassword, decryptPassword } from "./services/storage-factory";
import { uploadToStorage } from "./middleware/storage-upload";
import { TAX_RULES, type ClientType, type TaxPeriodicity } from "@shared/tax-rules";
import { logger } from "./logger";
import { buildTaxControlCsv, buildTaxControlXlsx } from "./services/tax-control-utils";
import { loginLimiter, registerLimiter, apiLimiter, strictLimiter } from "./middleware/rate-limit";
import { validateSecurityConfig } from "./middleware/security-validation";
import { registerEpicTasksRoutes } from "./epic-tasks-routes";

const prisma = new PrismaClient();

// SEGURIDAD: JWT_SECRET sin fallback inseguro
// La validación se hace en server/index.ts con validateSecurityConfig()
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET no está configurado. Este valor es OBLIGATORIO para la seguridad del sistema.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Configuración de Multer para subida de archivos
const uploadsDir = path.join(process.cwd(), "uploads");
const manualsImagesDir = path.join(uploadsDir, "manuals", "images");
const manualsAttachmentsDir = path.join(uploadsDir, "manuals", "attachments");

// Crear directorios si no existen
[uploadsDir, manualsImagesDir, manualsAttachmentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Tipos MIME permitidos
const imagesMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const attachmentsMimeTypes = [
  ...imagesMimeTypes,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
];

const multerStorageImages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const multerStorageAttachments = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

const uploadManualImage = multer({
  storage: multerStorageImages,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max para imágenes
  fileFilter: (req, file, cb) => {
    if (imagesMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'));
    }
  },
});

const uploadManualAttachment = multer({
  storage: multerStorageAttachments,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max para adjuntos
  fileFilter: (req, file, cb) => {
    if (attachmentsMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  },
});

// Middleware de autenticación
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    roleId: string;
    roleName?: string | null;
    permissions: string[];
  };
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; roleId: string };
    const user = await storage.getUserWithPermissions(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    // Extraer permisos en formato "resource:action"
    const permissions = user.roles?.role_permissions?.map((rp: any) => 
      `${rp.permissions.resource}:${rp.permissions.action}`
    ) || [];

    req.user = { 
      id: user.id, 
      username: user.username, 
      roleId: user.roleId,
      roleName: user.roles?.name || null,
      permissions 
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido" });
  }
};

// Middleware de autorización por rol (deprecated - usar checkPermission)
const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.roleId)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};

// Middleware de autorización por permiso (RBAC)
export const checkPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Si el usuario es administrador, tiene acceso a todo
    if (req.user.roleName === 'Administrador') {
      return next();
    }

    // Para otros usuarios, verificar si tienen el permiso específico
    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: "No tienes permisos para esta acción",
        required: requiredPermission 
      });
    }
    
    next();
  };
};

// Helper para registrar auditorías
async function createAudit(
  usuarioId: string,
  accion: 'CREATE' | 'UPDATE' | 'DELETE',
  tabla: string,
  registroId: string,
  valorAnterior: any = null,
  valorNuevo: any = null
) {
  try {
    let cambios = '';
    
    if (accion === 'CREATE') {
      cambios = `Nuevo registro creado en ${tabla}`;
    } else if (accion === 'DELETE') {
      cambios = `Registro eliminado de ${tabla}`;
    } else if (accion === 'UPDATE' && valorAnterior && valorNuevo) {
      const cambiosArray: string[] = [];
      Object.keys(valorNuevo).forEach(key => {
        if (valorAnterior[key] !== valorNuevo[key] && !['fechaActualizacion', 'updated_at'].includes(key)) {
          cambiosArray.push(`${key}: "${valorAnterior[key]}" → "${valorNuevo[key]}"`);
        }
      });
      cambios = cambiosArray.length > 0 ? cambiosArray.join(', ') : 'Sin cambios detectados';
    }

    await storage.createAuditEntry({
      usuarioId,
      accion,
      tabla,
      registroId,
      valorAnterior: valorAnterior ? JSON.stringify(valorAnterior) : null,
      valorNuevo: valorNuevo ? JSON.stringify(valorNuevo) : null,
      cambios,
    });
  } catch (error) {
    console.error('Error al crear auditoría:', error);
  }
}

export async function registerRoutes(app: Express, options?: { skipDbInit?: boolean }): Promise<Server> {
  if (!options?.skipDbInit) {
    try {
      await storage.ensureTaxModelsConfigSeeded();
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : "No se pudo inicializar tax_models_config";
      logger.fatal(
        {
          err: error,
          remediation: "Ejecuta `npx prisma db push` y reinicia el servidor",
        },
        message
      );
      throw error;
    }
  } else {
    logger.warn('Se ha saltado la inicialización de tax_models_config por configuración (skipDbInit=true)');
  }

  // SEGURIDAD: Rate limiting general para todos los endpoints /api/*
  // Excluye /api/health para permitir health checks ilimitados
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }
    return apiLimiter(req, res, next);
  });

  // ==================== HEALTH CHECK ====================
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Verificar conexión a base de datos
      await storage.getAllUsers();
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({ 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        database: "disconnected"
      });
    }
  });

  // ==================== AUTH ROUTES ====================
  // SEGURIDAD: Rate limiting aplicado - máximo 3 registros por hora por IP
  app.post(
    "/api/auth/register",
    registerLimiter,
    validateZod(registerSchema),
    async (req: Request, res: Response) => {

      try {
  const { username, email, password, roleId } = req.body;

        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "El usuario ya existe" });
        }

        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "El email ya está registrado" });
        }

        // Si no se proporciona roleId, buscar el rol "Gestor" por defecto
        // (permite crear/editar/eliminar clientes, tareas, impuestos, etc.)
        let defaultRoleId = roleId;
        if (!defaultRoleId) {
          const defaultRole = await prisma.roles.findUnique({
            where: { name: "Gestor" }
          });
          if (defaultRole) {
            defaultRoleId = defaultRole.id;
          }
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          roleId: defaultRoleId || null,
        });

        const token = jwt.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET, {
          expiresIn: "24h",
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // SEGURIDAD: Rate limiting aplicado - máximo 5 intentos cada 15 minutos
  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        return res.status(403).json({ error: "Usuario desactivado. Contacte al administrador" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET, {
        expiresIn: "24h",
      });

      // Obtener usuario completo con permisos y rol
      const fullUser = await storage.getUserWithPermissions(user.id);
      if (!fullUser) {
        return res.status(500).json({ error: "Error al obtener información del usuario" });
      }

      const { password: _, ...userWithoutPassword } = fullUser;
      
      // Incluir permisos formateados
      const permissions = fullUser.roles?.role_permissions?.map((rp: any) => 
        `${rp.permissions.resource}:${rp.permissions.action}`
      ) || [];
      
      // Incluir roleName para fácil acceso en el frontend
      const roleName = fullUser.roles?.name || null;

      res.json({ user: { ...userWithoutPassword, permissions, roleName }, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.json({ message: "Sesión cerrada exitosamente" });
  });

  app.get("/api/auth/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUserWithPermissions(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      
      // Incluir permisos formateados
      const permissions = user.roles?.role_permissions?.map((rp: any) => 
        `${rp.permissions.resource}:${rp.permissions.action}`
      ) || [];
      
      // Incluir roleName para fácil acceso en el frontend
      const roleName = user.roles?.name || null;
      
      // Incluir is_owner flag
      const isOwner = (user as any).is_owner || false;
      
      res.json({ ...userWithoutPassword, permissions, roleName, is_owner: isOwner });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== USER ROUTES ====================
  app.get("/api/users", authenticateToken, async (req: Request, res: Response) => {
    try {
      const users = await prisma.users.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          isActive: true,
          is_owner: true,
          roleId: true,
          roles: {
            select: {
              name: true,
              description: true
            }
          }
        }
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/users",
    authenticateToken,
    checkPermission("users:create"),
    validateZod(userCreateSchema),
    async (req: Request, res: Response) => {
      try {
        const { username, email, password, roleId } = req.body;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          roleId,
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/users/:id",
    authenticateToken,
    checkPermission("users:update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updateData: any = { ...req.body };
        
        if (updateData.password) {
          updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
        }

        const user = await storage.updateUser(id, updateData);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/users/:id/toggle-active",
    authenticateToken,
    checkPermission("users:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const user = await storage.getUser(id);
        
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const newActiveState = !user.isActive;
        const updatedUser = await storage.updateUser(id, { isActive: newActiveState });
        
        if (!updatedUser) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: newActiveState ? `Activó el usuario ${user.username}` : `Desactivó el usuario ${user.username}`,
          modulo: "admin",
          detalles: `Estado: ${newActiveState ? 'Activo' : 'Inactivo'}`,
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Endpoint para transferir el rol de Owner a otro usuario (solo Owner puede hacerlo)
  app.post(
    "/api/users/:id/transfer-owner",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const currentUserId = req.user!.id;

        // Verificar que el usuario actual es Owner
        const currentUser = await prisma.users.findUnique({
          where: { id: currentUserId },
          select: { is_owner: true }
        });

        if (!currentUser?.is_owner) {
          return res.status(403).json({ 
            error: 'Acceso denegado: Solo el Owner puede transferir este rol',
            code: 'NOT_OWNER'
          });
        }

        // Verificar que el usuario destino existe
        const targetUser = await prisma.users.findUnique({
          where: { id }
        });

        if (!targetUser) {
          return res.status(404).json({ error: 'Usuario destino no encontrado' });
        }

        if (targetUser.id === currentUserId) {
          return res.status(400).json({ error: 'No puedes transferir el rol a ti mismo' });
        }

        // Transferir el rol
        await prisma.users.update({
          where: { id: currentUserId },
          data: { is_owner: false }
        });

        const newOwner = await prisma.users.update({
          where: { id },
          data: { is_owner: true }
        });

        // Registrar en auditoría
        await storage.createActivityLog({
          usuarioId: currentUserId,
          accion: `Transfirió el rol de Owner a ${targetUser.username}`,
          modulo: "admin",
          detalles: `Nuevo Owner: ${targetUser.username} (${targetUser.email})`,
        });

        const { password: _, ...userWithoutPassword } = newOwner;
        res.json({ 
          message: 'Rol de Owner transferido exitosamente',
          newOwner: userWithoutPassword 
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/users/:id/set-owner - Establecer usuario como Owner (Solo para admin en desarrollo)
  app.post(
    "/api/users/:id/set-owner",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const currentUserId = req.user!.id;

        // Verificar que el usuario destino existe
        const targetUser = await prisma.users.findUnique({
          where: { id },
          select: { id: true, username: true, email: true, is_owner: true }
        });

        if (!targetUser) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        if (targetUser.is_owner) {
          return res.status(400).json({ error: "Este usuario ya es Owner" });
        }

        // Remover Owner de todos los demás
        await prisma.users.updateMany({
          where: { is_owner: true },
          data: { is_owner: false }
        });

        // Establecer como Owner
        const newOwner = await prisma.users.update({
          where: { id },
          data: { is_owner: true }
        });

        // Registrar en auditoría
        await storage.createActivityLog({
          usuarioId: currentUserId,
          accion: `Estableció a ${targetUser.username} como Owner`,
          modulo: "admin",
          detalles: `Nuevo Owner: ${targetUser.username} (${targetUser.email})`,
        });

        const { password: _, ...userWithoutPassword } = newOwner;
        res.json({ 
          message: 'Usuario establecido como Owner exitosamente',
          owner: userWithoutPassword 
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/users/:id",
    authenticateToken,
    checkPermission("users:delete"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        
        // Verificar si el usuario existe
        const user = await storage.getUser(id);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // ⛔ NO PERMITIR ELIMINAR AL OWNER
        const userToDelete = await prisma.users.findUnique({
          where: { id },
          select: { is_owner: true, username: true }
        });

        if (userToDelete?.is_owner) {
          return res.status(403).json({ 
            error: `No se puede eliminar al usuario Owner (${userToDelete.username}). Solo el Owner puede transferir su rol a otro usuario antes de poder ser eliminado.`,
            code: 'CANNOT_DELETE_OWNER'
          });
        }

        // Verificar relaciones que se borrarán en cascada
        const manuals = await prisma.manuals.count({ where: { autor_id: id } });
        const activityLogs = await prisma.activity_logs.count({ where: { usuarioId: id } });
        const auditTrails = await prisma.audit_trail.count({ where: { usuarioId: id } });

        // Mostrar advertencia si hay manuales (se borrarán)
        if (manuals > 0) {
          return res.status(409).json({ 
            error: `No se puede eliminar: el usuario tiene ${manuals} manual(es) asignado(s) que se borrarían permanentemente. Reasigne los manuales a otro usuario primero.` 
          });
        }

        // Proceder con eliminación
        const deleted = await storage.deleteUser(id);
        if (!deleted) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Eliminó el usuario ${user.username}`,
          modulo: "admin",
          detalles: `Se eliminaron ${activityLogs} logs de actividad y ${auditTrails} registros de auditoría`,
        });

        res.json({ 
          message: "Usuario eliminado exitosamente",
          deletedRelations: {
            activityLogs,
            auditTrails
          }
        });
      } catch (error: any) {
        if (error?.code === 'CANNOT_DELETE_OWNER') {
          return res.status(403).json({ error: error.message || 'No se puede eliminar al Owner', code: 'CANNOT_DELETE_OWNER' });
        }

        if (error?.code === 'P2003') {
          return res.status(409).json({ 
            error: "No se puede eliminar el usuario: tiene relaciones activas con otros registros del sistema" 
          });
        }

        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== CLIENT ROUTES ====================
  app.get("/api/clients", authenticateToken, async (req: Request, res: Response) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/clients/:id",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const client = await storage.getClient(req.params.id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.json(client);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/clients",
    authenticateToken,
    checkPermission("clients:create"),
    validateZod(clientCreateSchema),
    async (req: Request, res: Response) => {
      try {
        const client = await storage.createClient(req.body);

        await storage.createActivityLog({
          usuarioId: (req as AuthRequest).user!.id,
          accion: `Creó el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `NIF/CIF: ${client.nifCif}`,
        });
        
        // Registrar auditoría
        await createAudit(
          (req as AuthRequest).user!.id,
          'CREATE',
          'clients',
          client.id,
          null,
          client
        );

        notifyClientChange("created", client);
        
        res.json(client);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/clients/:id",
    authenticateToken,
    checkPermission("clients:update"),
    validateZod(clientUpdateSchema),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        // Obtener estado anterior
        const oldClient = await storage.getClient(id);
        
        const client = await storage.updateClient(id, req.body);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
                
        await storage.createActivityLog({
          usuarioId: (req as AuthRequest).user!.id,
          accion: `Actualizó el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: null,
        });
        
        // Registrar auditoría
        await createAudit(
          (req as AuthRequest).user!.id,
          'UPDATE',
          'clients',
          client.id,
          oldClient,
          client
        );

        notifyClientChange("updated", client);
        
        res.json(client);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/clients/:id",
    authenticateToken,
    checkPermission("clients:delete"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const client = await storage.getClient(id);
        
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        
        // Verificar si el cliente tiene impuestos asociados
        const clientTaxes = await prisma.client_tax.findMany({
          where: { clientId: id }
        });
        
        const assignmentCount = await prisma.client_tax_assignments.count({
          where: { clientId: id },
        });
        
        if (clientTaxes.length > 0 || assignmentCount > 0) {
          // SOFT DELETE: Solo desactivar si tiene impuestos
          const updated = await storage.updateClient(id, { isActive: false });
          
          await storage.createActivityLog({
            usuarioId: (req as AuthRequest).user!.id,
            accion: `Desactivó el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: `Cliente con ${clientTaxes.length} impuestos y ${assignmentCount} asignaciones fiscales asociadas`,
          });
          
          // Registrar auditoría
          await createAudit(
            (req as AuthRequest).user!.id,
            'UPDATE',
            'clients',
            id,
            client,
            updated
          );
          
          res.json({ 
            message: "Cliente desactivado (posee impuestos o asignaciones fiscales)",
            softDelete: true,
            client: updated
          });
        } else {
          // HARD DELETE: Eliminar permanentemente si NO tiene impuestos
          const deleted = await storage.deleteClient(id);
          
          if (!deleted) {
            return res.status(404).json({ error: "Error al eliminar cliente" });
          }
          
          await storage.createActivityLog({
            usuarioId: (req as AuthRequest).user!.id,
            accion: `Eliminó permanentemente el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: "Sin impuestos asociados",
          });
          
          // Registrar auditoría
          await createAudit(
            (req as AuthRequest).user!.id,
            'DELETE',
            'clients',
            id,
            client,
            null
          );
          
          res.json({ 
            message: "Cliente eliminado permanentemente",
            hardDelete: true
          });
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== CLIENT TAX ASSIGNMENTS ====================
  const handleGetTaxConfigs = async (_req: Request, res: Response) => {
    try {
      const configs = await storage.getActiveTaxModelsConfig();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  app.get(
    "/api/tax-models-config",
    authenticateToken,
    checkPermission("taxes:read"),
    handleGetTaxConfigs
  );

  app.get(
    "/api/tax/config",
    authenticateToken,
    checkPermission("taxes:read"),
    handleGetTaxConfigs
  );

  app.get(
    "/api/tax/assignments",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: Request, res: Response) => {
      try {
        const clientId = req.query.clientId as string | undefined;
        if (!clientId) {
          return res.status(400).json({ error: "clientId es requerido" });
        }
        const assignments = await storage.getClientTaxAssignments(clientId);
        res.json(assignments);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/tax-assignments/:assignmentId/history",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: Request, res: Response) => {
      try {
        const { assignmentId } = req.params;
        const history = await storage.getTaxAssignmentHistory(assignmentId);
        res.json(history);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/clients/:id/tax-assignments",
    authenticateToken,
    checkPermission("clients:update"),
    validateZod(taxAssignmentCreateSchema),
    async (req: AuthRequest, res: Response) => {
      try {
        const clientId = req.params.id;
        const client = await storage.getClient(clientId);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }

        const taxModelCode = String(req.body.taxModelCode).toUpperCase();
        const periodicity = String(req.body.periodicity).toUpperCase() as TaxPeriodicity;
        const clientType = String(client.tipo || "").toUpperCase() as ClientType;

        validateTaxAssignmentAgainstRules(clientType, {
          taxModelCode,
          periodicity,
        });

        const startDate = new Date(req.body.startDate);
        const endDate = req.body.endDate ? new Date(req.body.endDate) : null;
        const activeFlag = endDate ? false : req.body.activeFlag ?? true;

        // Permitir nueva asignación del mismo modelo sólo si la previa está cerrada y no solapa
        const existing = await storage.findClientTaxAssignmentByCode(clientId, taxModelCode);
        if (existing) {
          const existingEnd = existing.endDate ? new Date(existing.endDate) : null;
          const overlaps = !existingEnd || existingEnd >= startDate;
          if (overlaps) {
            return res.status(409).json({ error: `El modelo ${taxModelCode} ya está asignado y vigente o solapa con la nueva fecha de alta` });
          }
        }

        const assignment = await storage.createClientTaxAssignment(clientId, {
          taxModelCode,
          periodicity,
          startDate,
          endDate,
          activeFlag,
          notes: req.body.notes ?? null,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Asignó modelo ${taxModelCode} al cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Periodicidad: ${periodicity}, Activo: ${assignment.effectiveActive ? "Sí" : "No"}`,
        });

        await createAudit(
          req.user!.id,
          'CREATE',
          'client_tax_assignments',
          assignment.id,
          null,
          assignment
        );

        notifyTaxChange("created", assignment);
        res.status(201).json(assignment);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );


  app.patch(
    "/api/tax-assignments/:assignmentId",
    authenticateToken,
    checkPermission("clients:update"),
    validateZod(taxAssignmentUpdateSchema),
    async (req: AuthRequest, res: Response) => {
      try {
        const { assignmentId } = req.params;
        const existing = await storage.getClientTaxAssignment(assignmentId);

        if (!existing) {
          return res.status(404).json({ error: "Asignación no encontrada" });
        }

        const client = await storage.getClient(existing.clientId);
        if (!client) {
          return res.status(404).json({ error: "Cliente asociado no encontrado" });
        }

        const taxModelCode = req.body.taxModelCode
          ? String(req.body.taxModelCode).toUpperCase()
          : existing.taxModelCode;
        const periodicity = (req.body.periodicity
          ? String(req.body.periodicity).toUpperCase()
          : existing.periodicity) as TaxPeriodicity;
        const clientType = String(client.tipo || "").toUpperCase() as ClientType;

        validateTaxAssignmentAgainstRules(clientType, {
          taxModelCode,
          periodicity,
        });

        if (taxModelCode !== existing.taxModelCode) {
          const duplicate = await storage.findClientTaxAssignmentByCode(existing.clientId, taxModelCode);
          if (duplicate && duplicate.id !== assignmentId) {
            return res.status(409).json({ error: `El modelo ${taxModelCode} ya está asignado al cliente` });
          }
        }

        let endDate: Date | null | undefined;
        if (Object.prototype.hasOwnProperty.call(req.body, "endDate")) {
          if (req.body.endDate === null || req.body.endDate === undefined) {
            endDate = null;
          } else {
            endDate = new Date(req.body.endDate);
          }
        }

        const startDate =
          req.body.startDate !== undefined ? new Date(req.body.startDate) : undefined;

        const activeFlag =
          endDate && endDate !== null
            ? false
            : req.body.activeFlag !== undefined
              ? req.body.activeFlag
              : undefined;

        const updated = await storage.updateClientTaxAssignment(assignmentId, {
          taxModelCode,
          periodicity,
          startDate,
          endDate: endDate ?? undefined,
          activeFlag: activeFlag ?? undefined,
          notes: Object.prototype.hasOwnProperty.call(req.body, "notes")
            ? req.body.notes ?? null
            : undefined,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó modelo ${taxModelCode} del cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Activo: ${updated.effectiveActive ? "Sí" : "No"}`,
        });

        await createAudit(
          req.user!.id,
          'UPDATE',
          'client_tax_assignments',
          assignmentId,
          existing,
          updated
        );

        notifyTaxChange("updated", updated);
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/tax-assignments/:assignmentId",
    authenticateToken,
    checkPermission("clients:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { assignmentId } = req.params;
        const existing = await storage.getClientTaxAssignment(assignmentId);
        if (!existing) {
          return res.status(404).json({ error: "Asignación no encontrada" });
        }

        const hasHistory = await storage.hasAssignmentHistoricFilings(
          existing.clientId,
          existing.taxModelCode
        );

        let result;
        let message;
        let action: "DELETE" | "UPDATE" = "DELETE";

        if (hasHistory) {
          result = await storage.softDeactivateClientTaxAssignment(assignmentId, new Date());
          message = "Asignación desactivada. Posee histórico de presentaciones.";
          action = "UPDATE";
        } else {
          result = await storage.deleteClientTaxAssignment(assignmentId);
          message = "Asignación eliminada correctamente.";
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion:
            action === "DELETE"
              ? `Eliminó modelo ${existing.taxModelCode} del cliente`
              : `Desactivó modelo ${existing.taxModelCode} del cliente`,
          modulo: "clientes",
          detalles: message,
        });

        await createAudit(
          req.user!.id,
          action,
          'client_tax_assignments',
          assignmentId,
          existing,
          action === "DELETE" ? null : result
        );

        notifyTaxChange(action === "DELETE" ? "deleted" : "updated", result);

        res.json({
          assignment: result,
          softDeleted: hasHistory,
          message,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Toggle client active status
  app.patch(
    "/api/clients/:id/toggle-active",
    authenticateToken,
    checkPermission("clients:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const client = await storage.getClient(id);
        
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }

        const newActiveState = !(client as any).isActive;
        const updatedClient = await storage.updateClient(id, { isActive: newActiveState });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: newActiveState ? `Activó el cliente ${client.razonSocial}` : `Desactivó el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Estado cambiado a: ${newActiveState ? 'Activo' : 'Inactivo'}`,
        });

        await createAudit(
          req.user!.id,
          'UPDATE',
          'clients',
          id,
          client,
          updatedClient
        );

        res.json(updatedClient);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update client employees (replace all)
  app.put(
    "/api/clients/:id/employees",
    authenticateToken,
    checkPermission("clients:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { employeeIds, primaryEmployeeId } = req.body;

        const client = await storage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }

        // Eliminar empleados existentes
        await prisma.client_employees.deleteMany({
          where: { clientId: id }
        });

        // Crear nuevas asignaciones
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
          await prisma.client_employees.createMany({
            data: employeeIds.map((userId: string) => ({
              clientId: id,
              userId,
              is_primary: userId === primaryEmployeeId
            }))
          });

          // Si hay un empleado principal, actualizar responsableAsignado del cliente
          if (primaryEmployeeId) {
            await storage.updateClient(id, { responsableAsignado: primaryEmployeeId });
          }
        } else {
          // Si no hay empleados, limpiar responsableAsignado
          await storage.updateClient(id, { responsableAsignado: null });
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó empleados del cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `${employeeIds?.length || 0} empleados asignados`,
        });

        const updatedClient = await storage.getClient(id);
        res.json(updatedClient);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Add employee to client
  app.post(
    "/api/clients/:id/employees/:userId",
    authenticateToken,
    checkPermission("clients:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id, userId } = req.params;
        const { isPrimary } = req.body;
        const client = await storage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }

        // Verificar que el usuario existe
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Si se marca como primario, desmarcar otros
        if (isPrimary) {
          await prisma.client_employees.updateMany({
            where: { clientId: id },
            data: { is_primary: false }
          });
        }

        // Crear o actualizar la asignación
        await prisma.client_employees.upsert({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          },
          create: {
            clientId: id,
            userId,
            is_primary: isPrimary || false
          },
          update: {
            is_primary: isPrimary || false
          }
        });

        // Actualizar responsableAsignado: si es primario usa este userId, sino limpia si no hay primario
        if (isPrimary) {
          await storage.updateClient(id, { responsableAsignado: userId });
        } else {
          // Si estamos desmarcando como primario, verificar si hay otro primario
          const primaryEmployee = await prisma.client_employees.findFirst({
            where: { clientId: id, is_primary: true }
          });
          await storage.updateClient(id, { 
            responsableAsignado: primaryEmployee ? primaryEmployee.userId : null 
          });
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Asignó empleado ${user.username} al cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: isPrimary ? 'Como responsable principal' : 'Como colaborador',
        });

        const updatedClient = await storage.getClient(id);
        res.json(updatedClient);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Remove employee from client
  app.delete(
    "/api/clients/:id/employees/:userId",
    authenticateToken,
    checkPermission("clients:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id, userId } = req.params;

        const client = await storage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }

        const user = await storage.getUser(userId);

        // Verificar si el empleado a eliminar era el primario
        const employeeToDelete = await prisma.client_employees.findUnique({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });

        await prisma.client_employees.delete({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });

        // Si era primario, buscar otro empleado y marcarlo como primario, o limpiar responsableAsignado
        if (employeeToDelete?.is_primary) {
          const remainingEmployee = await prisma.client_employees.findFirst({
            where: { clientId: id }
          });
          
          if (remainingEmployee) {
            // Marcar el primer empleado restante como primario
            await prisma.client_employees.update({
              where: {
                clientId_userId: {
                  clientId: id,
                  userId: remainingEmployee.userId
                }
              },
              data: { is_primary: true }
            });
            await storage.updateClient(id, { responsableAsignado: remainingEmployee.userId });
          } else {
            // No quedan empleados, limpiar responsableAsignado
            await storage.updateClient(id, { responsableAsignado: null });
          }
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Desasignó empleado ${user?.username || userId} del cliente ${client.razonSocial}`,
          modulo: "clientes",
        });

        const updatedClient = await storage.getClient(id);
        res.json(updatedClient);
      } catch (error: any) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: "Asignación no encontrada" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== IMPUESTOS ROUTES ====================
  // GET /api/impuestos - Listar todos los impuestos
  app.get(
    "/api/impuestos",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const impuestos = await storage.getAllImpuestos();
        res.json(impuestos);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/impuestos - Crear nuevo impuesto
  app.post(
    "/api/impuestos",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { modelo, nombre, descripcion } = req.body;
        
        if (!modelo || !nombre) {
          return res.status(400).json({ error: "Modelo y nombre son requeridos" });
        }

        const impuesto = await storage.createImpuesto({ modelo, nombre, descripcion });
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Creó el impuesto: ${modelo} - ${nombre}`,
          modulo: "impuestos",
          detalles: descripcion || "",
        });

        res.status(201).json(impuesto);
      } catch (error: any) {
        if (error.code === 'P2002') {
          return res.status(400).json({ error: "Ya existe un impuesto con ese modelo" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  // PATCH /api/impuestos/:id - Actualizar impuesto
  app.patch(
    "/api/impuestos/:id",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { modelo, nombre, descripcion } = req.body;
        const impuesto = await storage.updateImpuesto(req.params.id, { modelo, nombre, descripcion });
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó el impuesto: ${impuesto.modelo}`,
          modulo: "impuestos",
          detalles: JSON.stringify({ modelo, nombre, descripcion }),
        });

        res.json(impuesto);
      } catch (error: any) {
        if (error.code === 'P2002') {
          return res.status(400).json({ error: "Ya existe un impuesto con ese modelo" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  // DELETE /api/impuestos/:id - Eliminar impuesto
  app.delete(
    "/api/impuestos/:id",
    authenticateToken,
    checkPermission("taxes:delete"),
    async (req: AuthRequest, res: Response) => {
      try {
        await storage.deleteImpuesto(req.params.id);
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Eliminó un impuesto`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== OBLIGACIONES FISCALES ROUTES ====================
  // GET /api/obligaciones-fiscales - Listar todas las obligaciones fiscales
  app.get(
    "/api/obligaciones-fiscales",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const obligaciones = await storage.getAllObligacionesFiscales();
        res.json(obligaciones);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/obligaciones-fiscales/cliente/:clienteId - Listar obligaciones de un cliente
  app.get(
    "/api/obligaciones-fiscales/cliente/:clienteId",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const obligaciones = await storage.getObligacionesByCliente(req.params.clienteId);
        res.json(obligaciones);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/obligaciones-fiscales - Crear nueva obligación fiscal
  app.post(
    "/api/obligaciones-fiscales",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { clienteId, impuestoId, periodicidad, diaVencimiento, observaciones, fechaInicio, fechaFin, activo } = req.body;
        
        if (!clienteId || !impuestoId || !periodicidad || !fechaInicio) {
          return res.status(400).json({ error: "Cliente, impuesto, periodicidad y fecha de inicio son requeridos" });
        }

        const obligacion = await storage.createObligacionFiscal({
          clienteId,
          impuestoId,
          periodicidad,
          diaVencimiento: diaVencimiento || null,
          observaciones: observaciones || null,
          fechaInicio: new Date(fechaInicio),
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          activo: activo !== undefined ? activo : true,
          fechaAsignacion: new Date()
        });
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Creó obligación fiscal para cliente`,
          modulo: "impuestos",
          detalles: `Cliente: ${clienteId}, Impuesto: ${impuestoId}`,
        });

        res.status(201).json(obligacion);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // PATCH /api/obligaciones-fiscales/:id - Actualizar obligación fiscal
  app.patch(
    "/api/obligaciones-fiscales/:id",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const updateData = { ...req.body };
        
        // Convertir fechas de string a Date si están presentes
        if (updateData.fechaInicio && typeof updateData.fechaInicio === 'string') {
          updateData.fechaInicio = new Date(updateData.fechaInicio);
        }
        if (updateData.fechaFin && typeof updateData.fechaFin === 'string') {
          updateData.fechaFin = new Date(updateData.fechaFin);
        }
        
        const obligacion = await storage.updateObligacionFiscal(req.params.id, updateData);
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó obligación fiscal`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`,
        });

        res.json(obligacion);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // DELETE /api/obligaciones-fiscales/:id - Eliminar obligación fiscal
  app.delete(
    "/api/obligaciones-fiscales/:id",
    authenticateToken,
    checkPermission("taxes:delete"),
    async (req: AuthRequest, res: Response) => {
      try {
        await storage.deleteObligacionFiscal(req.params.id);
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Eliminó obligación fiscal`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );


  // ==================== TASK ROUTES ====================
  app.get("/api/tasks", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      const clients = await storage.getAllClients();
      const users = await storage.getAllUsers();
      
      const enriched = tasks.map(task => ({
        ...task,
        client: clients.find(c => c.id === task.clienteId),
        assignedUser: users.find(u => u.id === task.asignadoA),
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/tasks",
    authenticateToken,
    checkPermission("tasks:create"),
    validateZod(taskCreateSchema),
    async (req: Request, res: Response) => {
      try {
        // Convertir fecha YYYY-MM-DD a ISO DateTime si es necesario
        const taskData = { ...req.body };
        if (taskData.fechaVencimiento && /^\d{4}-\d{2}-\d{2}$/.test(taskData.fechaVencimiento)) {
          taskData.fechaVencimiento = new Date(taskData.fechaVencimiento + 'T00:00:00.000Z').toISOString();
        }
        
        // Limpiar campos opcionales si están vacíos para evitar FK violations
        if (!taskData.asignadoA || taskData.asignadoA === '') {
          delete taskData.asignadoA;
        }
        if (!taskData.clienteId || taskData.clienteId === '') {
          delete taskData.clienteId;
        }
        
        const task = await storage.createTask(taskData);
        await storage.createActivityLog({
          usuarioId: (req as AuthRequest).user!.id,
          accion: `Creó la tarea "${task.titulo}"`,
          modulo: "tareas",
          detalles: null,
        });
        
        // Notificar por WebSocket
        notifyTaskChange("created", task, task.asignadoA || undefined);
        
        res.json(task);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/tasks/:id",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        // Convertir fecha YYYY-MM-DD a ISO DateTime si es necesario
        const taskData = { ...req.body };
        if (taskData.fechaVencimiento && /^\d{4}-\d{2}-\d{2}$/.test(taskData.fechaVencimiento)) {
          taskData.fechaVencimiento = new Date(taskData.fechaVencimiento + 'T00:00:00.000Z').toISOString();
        }
        
        // Limpiar campos opcionales si están vacíos para evitar FK violations
        if (!taskData.asignadoA || taskData.asignadoA === '') {
          delete taskData.asignadoA;
        }
        if (!taskData.clienteId || taskData.clienteId === '') {
          delete taskData.clienteId;
        }
        
        const task = await storage.updateTask(id, taskData);
        if (!task) {
          return res.status(404).json({ error: "Tarea no encontrada" });
        }
        
        // Notificar por WebSocket
        notifyTaskChange("updated", task, task.asignadoA || undefined);
        
        res.json(task);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== MANUAL ROUTES ====================
  app.get("/api/manuals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const manuals = await storage.getAllManuals();
      res.json(manuals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/manuals/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const manual = await storage.getManual(id);
      if (!manual) {
        return res.status(404).json({ error: "Manual no encontrado" });
      }
      res.json(manual);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/manuals",
    authenticateToken,
    checkPermission("manuals:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const manual = await storage.createManual({
          ...req.body,
          autor_id: req.user!.id,
        });
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Creó el manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: null,
        });
        res.json(manual);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/manuals/:id",
    authenticateToken,
    checkPermission("manuals:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        
        // Si se está guardando una nueva versión, crear primero el versionado
        const currentManual = await storage.getManual(id);
        if (currentManual && req.body.createVersion) {
          const nextVersion = await storage.getNextVersionNumber(id);
          await storage.createManualVersion({
            manualId: id,
            versionNumber: nextVersion,
            titulo: currentManual.titulo,
            contenidoHtml: currentManual.contenidoHtml,
            etiquetas: currentManual.etiquetas || null,
            categoria: currentManual.categoria || null,
            createdBy: req.user!.id,
          });
        }
        
        const manual = await storage.updateManual(id, req.body);
        if (!manual) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó el manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: null,
        });
        res.json(manual);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/manuals/:id",
    authenticateToken,
    checkPermission("manuals:update"),
    async (req: AuthRequest, res: Response) => {
      const { id } = req.params;
      try {
        const ok = await storage.deleteManual(id);
        if (!ok) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Eliminó un manual`,
          modulo: "manuales",
          detalles: `ID: ${id}`,
        });
        res.status(204).end();
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'No se pudo eliminar' });
      }
    }
  );

  // ==================== MANUAL IMAGE UPLOAD ====================
  // Configuración específica para imágenes de manuales
  app.post(
    "/api/manuals/upload-image",
    authenticateToken,
    checkPermission("manuals:update"),
    uploadManualImage.single("image"),
    uploadToStorage,
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcionó imagen" });
        }
        
        // Retornar URL relativa para el editor
        const imageUrl = `/uploads/manuals/images/${req.file.filename}`;
        res.json({ url: imageUrl });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== MANUAL ATTACHMENTS ====================
  app.post(
    "/api/manuals/:id/attachments",
    authenticateToken,
    checkPermission("manuals:update"),
    uploadManualAttachment.single("file"),
    uploadToStorage,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcionó archivo" });
        }
        
        const manual = await storage.getManual(id);
        if (!manual) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        
        const attachment = await storage.createManualAttachment({
          manualId: id,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
          fileType: path.extname(req.file.originalname).toLowerCase(),
          fileSize: req.file.size,
          uploadedBy: req.user!.id,
        });
        
        res.json(attachment);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/manuals/:id/attachments",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const attachments = await storage.getManualAttachments(id);
        res.json(attachments);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/manuals/:manualId/attachments/:attachmentId",
    authenticateToken,
    checkPermission("manuals:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { attachmentId } = req.params;
        
        const attachment = await storage.getManualAttachment(attachmentId);
        if (!attachment) {
          return res.status(404).json({ error: "Adjunto no encontrado" });
        }
        
        // Eliminar archivo físico
        if (fs.existsSync(attachment.filePath)) {
          fs.unlinkSync(attachment.filePath);
        }
        
        const deleted = await storage.deleteManualAttachment(attachmentId);
        if (!deleted) {
          return res.status(500).json({ error: "Error al eliminar adjunto" });
        }
        
        res.json({ message: "Adjunto eliminado correctamente" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== MANUAL VERSIONS ====================
  app.get(
    "/api/manuals/:id/versions",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const versions = await storage.getManualVersions(id);
        res.json(versions);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/manuals/:id/versions/restore/:versionId",
    authenticateToken,
    checkPermission("manuals:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id, versionId } = req.params;
        
        const manual = await storage.restoreManualVersion(id, versionId);
        if (!manual) {
          return res.status(404).json({ error: "No se pudo restaurar la versión" });
        }
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Restauró versión del manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: `Versión ID: ${versionId}`,
        });
        
        res.json(manual);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== ACTIVITY LOG ROUTES ====================
  app.get(
    "/api/activity-logs",
    authenticateToken,
    checkPermission("audits:read"),
    async (req: Request, res: Response) => {
      try {
        const logs = await storage.getAllActivityLogs();
        const users = await storage.getAllUsers();
        
        const enriched = logs.map(log => ({
          ...log,
          user: users.find(u => u.id === log.usuarioId),
        }));
        
        res.json(enriched);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== DASHBOARD STATS ====================
  app.get("/api/dashboard/stats", authenticateToken, async (req: Request, res: Response) => {
    try {
      const clients = await storage.getAllClients();
      const tasks = await storage.getAllTasks();
      const manuals = await storage.getAllManuals();

      const stats = {
        totalClientes: clients.length,
        clientesActivos: clients.filter(c => c.responsableAsignado).length,
        tareasGenerales: tasks.filter(t => t.visibilidad === "GENERAL").length,
        tareasPersonales: tasks.filter(t => t.visibilidad === "PERSONAL").length,
        tareasPendientes: tasks.filter(t => t.estado === "PENDIENTE").length,
        tareasEnProgreso: tasks.filter(t => t.estado === "EN_PROGRESO").length,
        tareasCompletadas: tasks.filter(t => t.estado === "COMPLETADA").length,
        manualesPublicados: manuals.filter(m => m.publicado).length,
        manualesTotal: manuals.length,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== EMAIL CONFIGURATION ROUTES ====================
  app.post(
    "/api/admin/smtp-config",
    authenticateToken,
    checkPermission("admin:settings"),
    validateZod(smtpConfigSchema),
    async (req: AuthRequest, res: Response) => {
      try {
        const { host, port, user, pass } = req.body;
        
        if (!host || !port || !user || !pass) {
          return res.status(400).json({ error: "Faltan parámetros de configuración SMTP" });
        }

        // Basic host validation: allow hostnames and IPs, no credentials
        if (typeof host !== 'string' || host.length > 200) {
          return res.status(400).json({ error: "Host SMTP inválido" });
        }

        // Simple hostname/ip regex (doesn't validate everything but prevents suspicious input)
        const hostPattern = /^[a-zA-Z0-9._:-]+$/;
        if (!hostPattern.test(host)) {
          return res.status(400).json({ error: "Host SMTP inválido" });
        }

        const portNum = parseInt(String(port), 10);
        if (Number.isNaN(portNum) || portNum <= 0 || portNum > 65535) {
          return res.status(400).json({ error: "Puerto SMTP inválido" });
        }

        configureSMTP({ host, port: portNum, user, pass });
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Configuró los parámetros SMTP",
          modulo: "admin",
          detalles: `Host: ${host}, Puerto: ${port}`,
        });

        res.json({ success: true, message: "Configuración SMTP guardada exitosamente" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/admin/smtp-config",
    authenticateToken,
    checkPermission("admin:settings"),
    async (req: Request, res: Response) => {
      try {
        const config = getSMTPConfig();
        if (!config) {
          return res.json({ configured: false });
        }
        
        // No enviar la contraseña al frontend
        res.json({
          configured: true,
          host: config.host,
          port: config.port,
          user: config.user,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== SMTP ACCOUNTS ROUTES (MÚLTIPLES CUENTAS) ====================
  // Endpoint para obtener conteo de usuarios conectados
  app.get("/api/admin/online-count", authenticateToken, async (req: Request, res: Response) => {
    try {
      const count = await prisma.sessions.count({
        where: { ended_at: null }
      });
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting online count:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount admin sessions router (list/detail/terminate/flag)
  app.use('/api/admin/sessions', adminSessionsRouter);
  // Price catalog and budgets routes
  app.use('/api/price-catalog', priceCatalogRouter);
  app.use('/api/budgets', budgetsRouter);
  app.use('/public/budgets', publicBudgetsRouter);
  app.use('/api/budget-parameters', budgetParametersRouter);
  app.use('/api/budget-templates', budgetTemplatesRouter);
  // Documents routes
  app.use('/api/documents', documentsRouter);
  app.get(
    "/api/admin/smtp-accounts",
    authenticateToken,
    checkPermission("admin:smtp_manage"),
    async (req: Request, res: Response) => {
      try {
        const accounts = await storage.getAllSMTPAccounts();
        // No enviar contraseñas al frontend
        const accountsWithoutPassword = accounts.map(acc => ({
          ...acc,
          password: undefined,
        }));
        res.json(accountsWithoutPassword);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/admin/smtp-accounts",
    authenticateToken,
    checkPermission("admin:smtp_manage"),
    validateZod(smtpAccountSchema),
    async (req: AuthRequest, res: Response) => {
      try {
        const { nombre, host, port, user, password, isPredeterminada, activa } = req.body;
        
        if (!nombre || !host || !port || !user || !password) {
          return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        const account = await storage.createSMTPAccount({
          nombre,
          host,
          port: parseInt(port),
          user,
          password,
          isPredeterminada: isPredeterminada || false,
          activa: activa !== undefined ? activa : true,
          creadaPor: req.user!.id,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Creó cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta: ${nombre} (${user})`,
        });

        res.json({ ...account, password: undefined });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/admin/smtp-accounts/:id",
    authenticateToken,
    checkPermission("admin:smtp_manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        // Si se incluye port, convertir a número
        if (updates.port) {
          updates.port = parseInt(updates.port);
        }

        const account = await storage.updateSMTPAccount(id, updates);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Actualizó cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta ID: ${id}`,
        });

        res.json({ ...account, password: undefined });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/admin/smtp-accounts/:id",
    authenticateToken,
    checkPermission("admin:smtp_manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        await storage.deleteSMTPAccount(id);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Eliminó cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta ID: ${id}`,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Endpoint para probar conexión SMTP
  app.post(
    "/api/admin/smtp-accounts/test",
    authenticateToken,
    checkPermission("admin:smtp_manage"),
    async (req: Request, res: Response) => {
      try {
        const { host, port, user, password } = req.body;
        
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port),
          secure: parseInt(port) === 465,
          auth: { user, pass: password },
        });

        await transporter.verify();
        res.json({ success: true, message: "Conexión SMTP exitosa" });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ==================== MIGRATIONS ====================
  // POST /api/admin/apply-migrations - Aplicar migraciones de datos
  app.post(
    "/api/admin/apply-migrations",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        console.log('🚀 Iniciando migraciones...');

        // 1. Marcar al admin como Owner
        const updatedUsers = await prisma.users.updateMany({
          where: { username: 'CarlosAdmin' },
          data: { is_owner: true }
        });

        // 2. Verificar admin
        const adminUser = await prisma.users.findFirst({
          where: { username: 'CarlosAdmin' },
          select: { username: true, email: true, is_owner: true }
        });

        // 3. Obtener información de roles
        const roles = await prisma.roles.findMany({
          select: {
            id: true,
            name: true,
            is_system: true
          }
        });

        res.json({
          success: true,
          message: '✅ Migraciones aplicadas exitosamente',
          migrations: {
            usersUpdated: updatedUsers.count,
            adminUser: adminUser,
            rolesCount: roles.length,
            roles: roles
          }
        });
      } catch (error: any) {
        console.error('❌ Error en migraciones:', error);
        res.status(500).json({ 
          success: false,
          error: error.message 
        });
      }
    }
  );

  // ==================== STORAGE CONFIG ROUTES ====================
  // GET /api/admin/storage-config - Obtener configuración de almacenamiento activa
  app.get(
    "/api/admin/storage-config",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const config = await prisma.storage_configs.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        });

        if (!config) {
          return res.json({ 
            type: 'LOCAL',
            base_path: '/uploads',
            isActive: true
          });
        }

        // No enviar contraseña cifrada al frontend
        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          base_path: config.base_path,
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/admin/storage-config - Crear/actualizar configuración de almacenamiento
  app.post(
    "/api/admin/storage-config",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { type, host, port, username, password, basePath } = req.body;

        if (!type) {
          return res.status(400).json({ error: "El tipo de almacenamiento es requerido" });
        }

        // Validar campos según tipo
        if (type === 'FTP' || type === 'SMB') {
          if (!host || !port || !username || !password) {
            return res.status(400).json({ 
              error: "Para FTP/SMB se requieren: host, port, username y password" 
            });
          }
        }

        // Cifrar la contraseña
        const encryptedPassword = password ? encryptPassword(password) : null;

        // Desactivar configuraciones anteriores
        await prisma.storage_configs.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        });
        // Crear nueva configuración
        const config = await prisma.storage_configs.create({
          data: ({
            id: randomUUID(),
            type,
            name: `${type} - ${new Date().toISOString()}`,
            host,
            port: port ? parseInt(port) : null,
            username,
            encrypted_password: encryptedPassword,
            base_path: basePath || (type === 'LOCAL' ? '/uploads' : '/'),
            isActive: true
          } as any)
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Configuró almacenamiento ${type}`,
          modulo: "admin",
          detalles: type === 'LOCAL' ? 'Almacenamiento local' : `${host}:${port}`
        });

        // Limpiar instancia del factory para forzar recarga
        await StorageFactory.clearInstance();

        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          base_path: config.base_path,
          isActive: config.isActive
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/admin/storage-config/test - Probar conexión de almacenamiento
  app.post(
    "/api/admin/storage-config/test",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: Request, res: Response) => {
      try {
        const { type, host, port, username, password, basePath } = req.body;

        if (!type) {
          return res.status(400).json({ error: "El tipo de almacenamiento es requerido" });
        }

        // Validar campos según tipo
        if (type === 'FTP' || type === 'SMB') {
          if (!host || !port || !username || !password) {
            return res.status(400).json({ 
              error: "Para FTP/SMB se requieren: host, port, username y password" 
            });
          }
        }

        const config = {
          type,
          host,
          port: port ? parseInt(port) : undefined,
          username,
          encryptedPassword: password ? encryptPassword(password) : null,
          base_path: basePath || (type === 'LOCAL' ? '/uploads' : '/')
        };

        const result = await StorageFactory.testConfigurationData(config);

        if (result.success) {
          res.json({ 
            success: true, 
            message: `Conexión ${type} exitosa`,
            details: result.message
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: result.message 
          });
        }
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // POST /api/admin/storage-config/migrate - Migrar archivos entre almacenamientos
  app.post(
    "/api/admin/storage-config/migrate",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { targetConfigId } = req.body;
        
        if (!targetConfigId) {
          return res.status(400).json({ 
            error: "Se requiere targetConfigId" 
          });
        }
        
        // Importar el servicio de migración
        const { migrateStorage } = await import('./services/migration-service');
        
        // Ejecutar migración (esto emitirá logs en tiempo real vía WebSocket)
        const result = await migrateStorage(targetConfigId);
        
        res.json({
          success: result.success,
          totalFiles: result.totalFiles,
          migratedFiles: result.migratedFiles,
          errors: result.errors,
          message: result.success 
            ? `Migración exitosa: ${result.migratedFiles} archivos migrados`
            : `Migración con errores: ${result.migratedFiles}/${result.totalFiles} archivos migrados`
        });
      } catch (error: any) {
        res.status(500).json({ 
          error: error.message,
          success: false 
        });
      }
    }
  );

  // ==================== SYSTEM SETTINGS ROUTES ====================
  app.get(
    "/api/admin/system-settings",
    async (req: Request, res: Response) => {
      try {
        const settings = await storage.getSystemSettings();
        if (!settings) {
          // Devolver valores por defecto si no existen
          return res.json({ registrationEnabled: true });
        }
        res.json(settings);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/admin/system-settings",
    authenticateToken,
    checkPermission("admin:settings"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { registrationEnabled } = req.body;
        
        const settings = await storage.updateSystemSettings({
          registrationEnabled,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: registrationEnabled ? "Habilitó el registro de usuarios" : "Deshabilitó el registro de usuarios",
          modulo: "admin",
          detalles: `Registro de usuarios: ${registrationEnabled ? 'Habilitado' : 'Deshabilitado'}`,
        });

        res.json(settings);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== SYSTEM CONFIG ROUTES ====================
  // GET /api/system/config - Obtener todas las configuraciones del sistema
  app.get(
    "/api/system/config",
    authenticateToken,
    checkPermission("admin:settings"),
    async (req: AuthRequest, res: Response) => {
      try {
        const configs = await prisma.system_config.findMany({
          orderBy: { key: 'asc' },
        });
        res.json(configs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/system/config/:key - Obtener una configuración específica
  app.get(
    "/api/system/config/:key",
    authenticateToken,
    checkPermission("admin:settings"),
    async (req: AuthRequest, res: Response) => {
      try {
        const config = await prisma.system_config.findUnique({
          where: { key: req.params.key },
        });
        
        if (!config) {
          return res.status(404).json({ error: "Configuración no encontrada" });
        }
        
        res.json(config);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // PUT /api/system/config/:key - Actualizar una configuración específica
  app.put(
    "/api/system/config/:key",
    authenticateToken,
    checkPermission("admin:settings"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { value } = req.body;
        
        if (value === undefined || value === null) {
          return res.status(400).json({ error: "El valor de la configuración es requerido" });
        }

        // Verificar que la configuración existe y es editable
        const existing = await prisma.system_config.findUnique({
          where: { key: req.params.key },
        });

        if (!existing) {
          return res.status(404).json({ error: "Configuración no encontrada" });
        }

        if (!existing.is_editable) {
          return res.status(403).json({ error: "Esta configuración no es editable" });
        }

        const config = await prisma.system_config.update({
          where: { key: req.params.key },
          data: { value: String(value) },
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó configuración del sistema`,
          modulo: "admin",
          detalles: `Configuración "${req.params.key}" actualizada a: ${value}`,
        });

        res.json(config);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== GITHUB CONFIG ROUTES ====================
  // GET /api/admin/github-config - Obtener configuración de GitHub
  app.get(
    "/api/admin/github-config",
    authenticateToken,
    checkPermission("admin:settings"),
    async (req: AuthRequest, res: Response) => {
      try {
        const repoConfig = await prisma.system_config.findUnique({
          where: { key: 'github_repo_url' }
        });
        const branchConfig = await prisma.system_config.findUnique({
          where: { key: 'github_branch' }
        });

        res.json({
          repoUrl: repoConfig?.value || '',
          branch: branchConfig?.value || 'main',
          configured: !!repoConfig?.value
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // PUT /api/admin/github-config - Actualizar configuración de GitHub
  app.put(
    "/api/admin/github-config",
    authenticateToken,
    checkPermission("admin:settings"),
    validateZod(githubConfigSchema),
    async (req: AuthRequest, res: Response) => {
      try {
        const { repoUrl, branch } = req.body;

        // Hardened validation for repoUrl: accept owner/repo or a GitHub URL (no credentials, host github.com)
        if (repoUrl) {
          if (typeof repoUrl !== 'string' || repoUrl.length > 300) {
            return res.status(400).json({ error: "Formato inválido de repoUrl" });
          }

          const ownerRepoMatch = repoUrl.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
          if (!ownerRepoMatch) {
            try {
              const candidate = repoUrl.startsWith('http://') || repoUrl.startsWith('https://') ? repoUrl : `https://${repoUrl}`;
              const parsed = new URL(candidate);
              const hostname = parsed.hostname.toLowerCase();
              if (!(hostname === 'github.com' || hostname.endsWith('.github.com'))) {
                return res.status(400).json({ error: "Solo se permiten URLs de GitHub en repoUrl" });
              }
              if (parsed.username || parsed.password) {
                return res.status(400).json({ error: "URL inválida en repoUrl" });
              }
              const parts = parsed.pathname.split('/').filter(Boolean);
              if (parts.length < 2) {
                return res.status(400).json({ error: "URL de GitHub inválida, debe apuntar a owner/repo" });
              }
              const owner = parts[0];
              const repo = parts[1];
              req.body.repoUrl = `https://github.com/${owner}/${repo}`;
            } catch (e) {
              return res.status(400).json({ error: "Formato inválido. Use 'owner/repo' o una URL válida de GitHub" });
            }
          }
        }

        // Actualizar o crear github_repo_url
        if (repoUrl !== undefined) {
          await prisma.system_config.upsert({
            where: { key: 'github_repo_url' },
            create: {
              id: randomUUID(),
              key: 'github_repo_url',
              value: repoUrl,
              description: 'URL del repositorio de GitHub para actualizaciones',
              is_editable: true,
              updatedAt: new Date()
            },
            update: { value: repoUrl }
          });
        }

        // Actualizar o crear github_branch
        if (branch !== undefined) {
          await prisma.system_config.upsert({
            where: { key: 'github_branch' },
            create: {
              id: randomUUID(),
              key: 'github_branch',
              value: branch,
              description: 'Rama de GitHub para actualizaciones',
              is_editable: true,
              updatedAt: new Date()
            },
            update: { value: branch }
          });
        }

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Actualizó configuración de GitHub",
          modulo: "admin",
          detalles: `Repositorio: ${repoUrl || 'sin cambios'}, Rama: ${branch || 'sin cambios'}`,
        });

        res.json({ 
          success: true, 
          message: "Configuración de GitHub actualizada exitosamente",
          repoUrl,
          branch
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== SYSTEM UPDATE ROUTES ====================
  // GET /api/system/version - Obtener información de versiones
  app.get(
    "/api/system/version",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const currentVersion = await getCurrentVersion();
        
        // Obtener configuración del repositorio
        const repoConfig = await prisma.system_config.findUnique({
          where: { key: 'github_repo_url' }
        });

        if (!repoConfig?.value) {
          return res.json({
            current: currentVersion,
            latest: null,
            updateAvailable: false,
            configured: false,
            message: 'Repositorio de GitHub no configurado'
          });
        }

        const match = repoConfig.value.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
          return res.json({
            current: currentVersion,
            latest: null,
            updateAvailable: false,
            configured: false,
            message: 'URL de GitHub no válida'
          });
        }

        const [, owner, repo] = match;
        const versionInfo = await checkForUpdates(owner, repo.replace('.git', ''));

        res.json({
          ...versionInfo,
          configured: true
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/system/update - Iniciar actualización del sistema
  app.post(
    "/api/system/update",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        // Verificar configuración de Git
        const gitCheck = await verifyGitSetup();
        if (!gitCheck.installed) {
          return res.status(400).json({ 
            error: 'Git no está instalado',
            message: gitCheck.message 
          });
        }

        if (!gitCheck.configured) {
          return res.status(400).json({ 
            error: 'Repositorio Git no configurado',
            message: gitCheck.message 
          });
        }

        // Ejecutar actualización en background
        performSystemUpdate(req.user!.id, (progress) => {
          // Emitir progreso via WebSocket si está disponible
          const io = (req.app as any).io;
          if (io) {
            io.to(`user:${req.user!.id}`).emit('update:progress', progress);
          }
        }).then(result => {
          const io = (req.app as any).io;
          if (io) {
            io.to(`user:${req.user!.id}`).emit('update:complete', result);
          }
        }).catch(error => {
          const io = (req.app as any).io;
          if (io) {
            io.to(`user:${req.user!.id}`).emit('update:error', { error: error.message });
          }
        });

        res.json({ 
          success: true, 
          message: 'Actualización iniciada. Recibirá notificaciones del progreso.'
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/system/backups - Listar todos los backups
  app.get(
    "/api/system/backups",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const backups = await listBackups();
        res.json(backups);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/system/backups - Crear un nuevo backup
  app.post(
    "/api/system/backups",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const backup = await createSystemBackup(req.user!.id);
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: 'Creó backup del sistema',
          modulo: 'sistema',
          detalles: `Backup ID: ${backup.id}, Versión: ${backup.version}`
        });

        res.json(backup);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/system/restore/:id - Restaurar desde un backup
  app.post(
    "/api/system/restore/:id",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        await restoreFromBackup(req.params.id, req.user!.id);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: 'Restauró sistema desde backup',
          modulo: 'sistema',
          detalles: `Backup ID: ${req.params.id}`
        });

        res.json({ 
          success: true, 
          message: 'Sistema restaurado exitosamente. Reinicie el servidor para aplicar los cambios.'
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/system/updates - Obtener historial de actualizaciones
  app.get(
    "/api/system/updates",
    authenticateToken,
    checkPermission("admin:system"),
    async (req: AuthRequest, res: Response) => {
      try {
        const updates = await getUpdateHistory(20);
        res.json(updates);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== ROLES & PERMISSIONS ROUTES ====================
  // GET /api/roles - Listar todos los roles
  app.get(
    "/api/roles",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const roles = await storage.getAllRoles();
        
        // Enriquecer roles con valores por defecto para campos pendientes
        const enrichedRoles = roles.map((role: any) => ({
          ...role,
          color: role.color || "#6366f1",
          icon: role.icon || "shield",
          can_create_users: role.can_create_users !== undefined ? role.can_create_users : false,
          can_delete_users: role.can_delete_users !== undefined ? role.can_delete_users : false,
          can_manage_roles: role.can_manage_roles !== undefined ? role.can_manage_roles : false,
          is_active: role.is_active !== undefined ? role.is_active : true
        }));
        
        res.json(enrichedRoles);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/roles/:id - Obtener rol por ID
  app.get(
    "/api/roles/:id",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const role = await storage.getRoleById(req.params.id);
        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }
        
        // Enriquecer rol con valores por defecto
        const enrichedRole = {
          ...role,
          color: role.color || "#6366f1",
          icon: role.icon || "shield",
          can_create_users: role.can_create_users !== undefined ? role.can_create_users : false,
          can_delete_users: role.can_delete_users !== undefined ? role.can_delete_users : false,
          can_manage_roles: role.can_manage_roles !== undefined ? role.can_manage_roles : false,
          is_active: role.is_active !== undefined ? role.is_active : true
        };
        
        res.json(enrichedRole);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/roles - Crear un nuevo rol personalizado
  app.post(
    "/api/roles",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { 
          name, 
          description, 
          color,
          icon,
          can_create_users,
          can_delete_users,
          can_manage_roles
        } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: "El nombre del rol es requerido" });
        }

        // Validar que el nombre sea único
        const existingRole = await prisma.roles.findUnique({
          where: { name }
        });

        if (existingRole) {
          return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
        }

        // Crear el nuevo rol
        const role = await prisma.roles.create({
          data: {
            id: randomUUID(),
            name,
            description: description || null,
            is_system: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        });
        
        // Agregar campos adicionales si existen en la BD
        const enrichedRole = {
          ...role,
          color: color || "#6366f1",
          icon: icon || "shield",
          can_create_users: can_create_users || false,
          can_delete_users: can_delete_users || false,
          can_manage_roles: can_manage_roles || false,
          is_active: true,
          created_by: req.user!.id
        };
        
        // Registrar en auditoría
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Creó el rol personalizado: ${name}`,
          modulo: "admin",
          detalles: JSON.stringify({
            description,
            color,
            icon,
            can_create_users,
            can_delete_users,
            can_manage_roles
          }),
        });

        res.status(201).json(enrichedRole);
      } catch (error: any) {
        console.error('Error creando rol:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // PATCH /api/roles/:id - Actualizar un rol personalizado
  app.patch(
    "/api/roles/:id",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { 
          name, 
          description, 
          color,
          icon,
          can_create_users,
          can_delete_users,
          can_manage_roles,
          is_active
        } = req.body;

        // Verificar que el rol existe
        const existingRole = await prisma.roles.findUnique({
          where: { id }
        });

        if (!existingRole) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }

        // No permitir modificar roles del sistema
        if (existingRole.is_system) {
          return res.status(403).json({ 
            error: "No se pueden modificar roles del sistema",
            code: "SYSTEM_ROLE_PROTECTED"
          });
        }

        // Si se intenta cambiar el nombre, verificar que sea único
        if (name && name !== existingRole.name) {
          const duplicateRole = await prisma.roles.findUnique({
            where: { name }
          });
          if (duplicateRole) {
            return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
          }
        }

        // Preparar datos para actualización (solo campos que existen en BD)
        const updateData: any = {
          updatedAt: new Date()
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        
        // Estos campos se agregarán cuando la migración se aplique
        const additionalFields: any = {};
        if (color !== undefined) additionalFields.color = color;
        if (icon !== undefined) additionalFields.icon = icon;
        if (can_create_users !== undefined) additionalFields.can_create_users = can_create_users;
        if (can_delete_users !== undefined) additionalFields.can_delete_users = can_delete_users;
        if (can_manage_roles !== undefined) additionalFields.can_manage_roles = can_manage_roles;
        if (is_active !== undefined) additionalFields.is_active = is_active;

        const role = await prisma.roles.update({
          where: { id },
          data: updateData,
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        });
        
        // Agregar campos enriquecidos a la respuesta
        const enrichedRole = {
          ...role,
          ...additionalFields,
          color: additionalFields.color || "#6366f1",
          icon: additionalFields.icon || "shield",
          can_create_users: additionalFields.can_create_users || false,
          can_delete_users: additionalFields.can_delete_users || false,
          can_manage_roles: additionalFields.can_manage_roles || false,
          is_active: additionalFields.is_active !== undefined ? additionalFields.is_active : true
        };
        
        // Registrar en auditoría
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Actualizó el rol personalizado: ${role.name}`,
          modulo: "admin",
          detalles: JSON.stringify({...updateData, ...additionalFields}),
        });

        res.json(enrichedRole);
      } catch (error: any) {
        console.error('Error actualizando rol:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // DELETE /api/roles/:id - Eliminar un rol personalizado
  app.delete(
    "/api/roles/:id",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;

        // Verificar que el rol existe
        const role = await prisma.roles.findUnique({
          where: { id }
        });

        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }

        // No permitir eliminar roles del sistema
        if (role.is_system) {
          return res.status(403).json({ 
            error: "No se pueden eliminar roles del sistema",
            code: "SYSTEM_ROLE_PROTECTED"
          });
        }

        // Verificar que no hay usuarios con este rol
        const usersWithRole = await prisma.users.count({
          where: { roleId: id }
        });

        if (usersWithRole > 0) {
          return res.status(409).json({ 
            error: `No se puede eliminar el rol: hay ${usersWithRole} usuario(s) asignado(s) a este rol. Reasignalos a otro rol primero.`,
            code: "ROLE_IN_USE"
          });
        }

        // Eliminar permisos asociados
        await prisma.role_permissions.deleteMany({
          where: { roleId: id }
        });

        // Eliminar el rol
        await prisma.roles.delete({
          where: { id }
        });
        
        // Registrar en auditoría
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Eliminó el rol personalizado: ${role.name}`,
          modulo: "admin",
          detalles: `ID: ${id}`,
        });

        res.json({ 
          success: true, 
          message: `Rol "${role.name}" eliminado exitosamente`
        });
      } catch (error: any) {
        console.error('Error eliminando rol:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/permissions - Listar todos los permisos
  app.get(
    "/api/permissions",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const permissions = await storage.getAllPermissions();
        res.json(permissions);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/roles/:id/permissions - Asignar permisos a un rol
  app.post(
    "/api/roles/:id/permissions",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { permissionIds } = req.body;
        
        if (!Array.isArray(permissionIds)) {
          return res.status(400).json({ error: "permissionIds debe ser un array" });
        }

        const role = await storage.assignPermissionsToRole(req.params.id, permissionIds);
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Asignó permisos al rol: ${role?.name}`,
          modulo: "admin",
          detalles: `${permissionIds.length} permisos asignados`,
        });

        res.json(role);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/roles/:id/assign-permissions - Asignar permisos a un rol
  app.post(
    "/api/roles/:id/assign-permissions",
    authenticateToken,
    checkPermission("admin:roles"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { permissionIds } = req.body;

        if (!Array.isArray(permissionIds)) {
          return res.status(400).json({ error: "permissionIds debe ser un array" });
        }

        // Verificar que el rol existe y no es del sistema
        const role = await prisma.roles.findUnique({
          where: { id }
        });

        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }

        if (role.is_system) {
          return res.status(403).json({ 
            error: "No se pueden modificar permisos de roles del sistema",
            code: "SYSTEM_ROLE_PROTECTED"
          });
        }

        // Eliminar permisos actuales
        await prisma.role_permissions.deleteMany({
          where: { roleId: id }
        });

        // Asignar nuevos permisos
        const rolePermissions = await Promise.all(
          permissionIds.map((permissionId: string) =>
            prisma.role_permissions.create({
              data: {
                id: randomUUID(),
                roleId: id,
                permissionId: permissionId
              }
            })
          )
        );

        // Obtener el rol actualizado con sus permisos
        const updatedRole = await prisma.roles.findUnique({
          where: { id },
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        });

        // Enriquecer con valores por defecto
        const enrichedRole = {
          ...updatedRole,
          color: updatedRole?.color || "#6366f1",
          icon: updatedRole?.icon || "shield",
          can_create_users: updatedRole?.can_create_users !== undefined ? updatedRole.can_create_users : false,
          can_delete_users: updatedRole?.can_delete_users !== undefined ? updatedRole.can_delete_users : false,
          can_manage_roles: updatedRole?.can_manage_roles !== undefined ? updatedRole.can_manage_roles : false,
          is_active: updatedRole?.is_active !== undefined ? updatedRole.is_active : true
        };

        // Registrar en auditoría
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Asignó ${permissionIds.length} permisos al rol: ${role.name}`,
          modulo: "admin",
          detalles: JSON.stringify({ 
            permissionIds,
            totalPermissions: permissionIds.length
          }),
        });

        res.json({
          success: true,
          message: `${permissionIds.length} permisos asignados al rol "${role.name}"`,
          role: enrichedRole
        });
      } catch (error: any) {
        console.error('Error asignando permisos:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== AUDIT TRAIL ROUTES ====================
  app.get(
    "/api/audit",
    authenticateToken,
    checkPermission("audits:read"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { table, recordId, userId } = req.query;

        let audits;
        if (table && recordId) {
          audits = await storage.getAuditEntriesByRecord(table as string, recordId as string);
        } else if (table) {
          audits = await storage.getAuditEntriesByTable(table as string);
        } else if (userId) {
          audits = await storage.getAuditEntriesByUser(userId as string);
        } else {
          audits = await storage.getAllAuditEntries();
        }

        // Obtener información de usuarios para mostrar nombres
        const usersMap = new Map();
        const users = await storage.getAllUsers();
        users.forEach(u => usersMap.set(u.id, u));

        const auditsWithUsers = audits.map(audit => ({
          ...audit,
          usuario: usersMap.get(audit.usuarioId),
        }));

        res.json(auditsWithUsers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== GLOBAL SEARCH ROUTES ====================
  app.get(
    "/api/search",
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
          return res.status(400).json({ error: "Consulta de búsqueda demasiado corta (mínimo 2 caracteres)" });
        }

        console.log('About to call globalSearch with:', q.trim());
        const results = await storage.globalSearch(q.trim());
        console.log('globalSearch returned successfully');
        
        // Log para debugging
        console.log('Search results:', {
          clientes: results.clientes.length,
          tareas: results.tareas.length,
          impuestos: results.impuestos.length,
          manuales: results.manuales.length,
        });

        // Forzar serialización completa para eliminar referencias circulares de Drizzle
        const serializedResults = JSON.parse(JSON.stringify(results));
        
        res.json(serializedResults);
      } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== TAX CONTROL - REQUIREMENTS ====================
  app.get("/api/tax-requirements", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const requirements = await prisma.client_tax_requirements.findMany({
        include: { clients: true }
      });
      res.json(requirements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tax-requirements", authenticateToken, checkPermission("taxes:create"), async (req: AuthRequest, res: Response) => {
    try {
      const { clientId, taxModelCode, impuesto, required = true, note, colorTag, detalle } = req.body;
      const requirement = await prisma.client_tax_requirements.create({
        data: {
          id: randomUUID(),
          clientId,
          taxModelCode: taxModelCode || null,
          impuesto: impuesto || taxModelCode || 'SIN_ESPECIFICAR',
          detalle: detalle || null,
          required,
          note: note || null,
          color_tag: colorTag || null,
        },
        include: { clients: true }
      });
      res.json(requirement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tax-requirements/:id/toggle", authenticateToken, checkPermission("taxes:update"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const current = await prisma.client_tax_requirements.findUnique({ where: { id } });
      if (!current) {
        return res.status(404).json({ error: "Requisito no encontrado" });
      }

      const updated = await prisma.client_tax_requirements.update({
        where: { id },
        data: { required: !current.required },
        include: { clients: true }
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tax-requirements/:id", authenticateToken, checkPermission("taxes:update"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { note, color_tag: colorTag } = req.body;
      const updated = await prisma.client_tax_requirements.update({
        where: { id },
        data: { note, color_tag: colorTag },
        include: { clients: true }
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TAX CONTROL - FISCAL PERIODS ====================
  app.get("/api/fiscal-periods", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const periods = await prisma.fiscal_periods.findMany({
        orderBy: [{ year: 'desc' }, { quarter: 'asc' }]
      });
      res.json(periods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TAX PERIODS ====================
  app.get(
    "/api/tax/periods",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: Request, res: Response) => {
      try {
        const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
        const periods = await storage.getFiscalPeriodsSummary(year);
        res.json(periods);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/tax/periods/:id",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: Request, res: Response) => {
      try {
        const period = await storage.getFiscalPeriod(req.params.id);
        if (!period) {
          return res.status(404).json({ error: "Periodo no encontrado" });
        }
        res.json(period);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/tax/periods/create-year",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const year = parseInt(req.body?.year, 10);
        if (!Number.isFinite(year)) {
          return res.status(400).json({ error: "Año inválido" });
        }
        const periods = await storage.createFiscalYear(year);
        res.json(periods);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/tax/periods/create",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { year, kind, label, quarter, startsAt, endsAt } = req.body;
        if (!year || !kind || !label || !startsAt || !endsAt) {
          return res.status(400).json({ error: "Faltan campos obligatorios" });
        }
        const summary = await storage.createFiscalPeriod({
          year: parseInt(year, 10),
          kind: kind,
          label,
          quarter: quarter ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        });
        res.json(summary);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/tax/periods/:id/status",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
          return res.status(400).json({ error: "Estado requerido" });
        }
        const updated = await storage.toggleFiscalPeriodStatus(id, status, req.user?.id);
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== TAX CALENDAR (AEAT) ====================
  // GET /api/tax/calendar - Listar periodos del calendario fiscal
  app.get(
    "/api/tax/calendar",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: AuthRequest, res: Response) => {
      try {
        const y = Number(req.query.year);
        const model = (req.query.model as string | undefined)?.toUpperCase();
        const periodicity = (req.query.periodicity as string | undefined)?.toLowerCase();
        const status = (req.query.status as string | undefined)?.toUpperCase();
        const where: any = {};
        if (!Number.isNaN(y)) where.year = y;
        if (model) where.modelCode = model;
        if (periodicity === 'monthly') where.period = { startsWith: 'M' } as any;
        if (periodicity === 'quarterly') where.period = { in: ['1T', '2T', '3T', '4T'] } as any;
        if (periodicity === 'annual') where.period = 'ANUAL';
        if (periodicity === 'special') where.period = { in: ['M04', 'M10', 'M12'] } as any;
        if (status && ['PENDIENTE','ABIERTO','CERRADO'].includes(status)) where.status = status;

        const list = await prisma.tax_calendar.findMany({ where, orderBy: [{ endDate: 'asc' }] });
        const rows = list.map((r) => ({
          id: r.id,
          modelCode: r.modelCode,
          period: r.period,
          year: r.year,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          daysToStart: r.days_to_start,
          daysToEnd: r.days_to_end,
        }));
        res.json(rows);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/tax/calendar - Crear periodo
  app.post(
    "/api/tax/calendar",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { modelCode, period, year, startDate, endDate, active = true } = req.body || {};
        if (!modelCode || !period || !year || !startDate || !endDate) {
          return res.status(400).json({ error: "Campos requeridos: modelCode, period, year, startDate, endDate" });
        }
        const parsedYear = Number(year);
        if (!Number.isFinite(parsedYear)) return res.status(400).json({ error: "Año inválido" });
        const entry = await storage.createTaxCalendar({
          modelCode: String(modelCode).toUpperCase(),
          period: String(period).toUpperCase(),
          year: parsedYear,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          active: Boolean(active),
        });
        res.status(201).json(entry);
      } catch (error: any) {
        if (error?.code === 'P2002') {
          return res.status(409).json({ error: "Ya existe un periodo para ese Modelo/Periodo/Año" });
        }
        res.status(500).json({ error: error?.message || 'Error desconocido' });
      }
    }
  );

  // PATCH /api/tax/calendar/:id - Editar fechas/activo
  app.patch(
    "/api/tax/calendar/:id",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const data: any = {};
        if (req.body.startDate) data.startDate = new Date(req.body.startDate);
        if (req.body.endDate) data.endDate = new Date(req.body.endDate);
        if (typeof req.body.active !== 'undefined') data.active = Boolean(req.body.active);
        const updated = await storage.updateTaxCalendar(req.params.id, data);
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // DELETE /api/tax/calendar/:id - Borrar periodo
  app.delete(
    "/api/tax/calendar/:id",
    authenticateToken,
    checkPermission("taxes:delete"),
    async (req: AuthRequest, res: Response) => {
      try {
        const ok = await storage.deleteTaxCalendar(req.params.id);
        if (!ok) return res.status(404).json({ error: "Periodo no encontrado" });
        res.status(204).end();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/tax/calendar/create-year - Duplicar año
  app.post(
    "/api/tax/calendar/create-year",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: 'Año inválido' });
        const created = await storage.cloneTaxCalendarYear(y);
        res.json({ created: created.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/tax/calendar/seed-year - Crear todos los periodos del año
  app.post(
    "/api/tax/calendar/seed-year",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: 'Año inválido' });
        const model = (req.body?.model as string | undefined)?.toUpperCase();
        const periodicity = (req.body?.periodicity as string | undefined)?.toLowerCase() as any;
        const result = await storage.seedTaxCalendarYear(y, {
          modelCode: model,
          periodicity: periodicity === 'monthly' || periodicity === 'quarterly' || periodicity === 'annual' || periodicity === 'special' ? periodicity : 'all',
        });
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // GET /api/tax/calendar/:year.ics - Exportar a formato ICS
  app.get(
    "/api/tax/calendar/:year.ics",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: Request, res: Response) => {
      try {
        const y = Number(req.params.year);
        if (!Number.isFinite(y)) return res.status(400).send('');
        const rows = await prisma.tax_calendar.findMany({ where: { year: y }, orderBy: [{ startDate: 'asc' }] });
        
        const toICSDate = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          const yyyy = d.getUTCFullYear();
          const mm = pad(d.getUTCMonth() + 1);
          const dd = pad(d.getUTCDate());
          const hh = pad(d.getUTCHours());
          const mi = pad(d.getUTCMinutes());
          const ss = pad(d.getUTCSeconds());
          return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
        };
        
        const lines: string[] = [];
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//Asesoria La Llave//Calendario AEAT//ES');
        for (const r of rows) {
          const dtStart = toICSDate(r.startDate);
          const dtEnd = toICSDate(r.endDate);
          const summary = `${r.modelCode} ${r.period}/${r.year}`;
          lines.push('BEGIN:VEVENT');
          lines.push(`UID:${r.id}@asesoria-la-llave`);
          lines.push(`DTSTAMP:${toICSDate(new Date())}`);
          lines.push(`DTSTART:${dtStart}`);
          lines.push(`DTEND:${dtEnd}`);
          lines.push(`SUMMARY:${summary}`);
          lines.push('END:VEVENT');
        }
        lines.push('END:VCALENDAR');
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.send(lines.join('\r\n'));
      } catch (error: any) {
        res.status(500).send('');
      }
    }
  );

  // ==================== TAX FILINGS ====================
  app.get(
    "/api/tax/filings",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req: Request, res: Response) => {
      try {
        const filings = await storage.getTaxFilings({
          periodId: req.query.periodId as string | undefined,
          status: req.query.status as string | undefined,
          model: req.query.model as string | undefined,
          search: req.query.search as string | undefined,
        });
        res.json(filings);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/tax/filings/:id",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const isAdmin = (req.user as any)?.roleName === "Administrador";
        const updated = await storage.updateTaxFiling(
          req.params.id,
          {
            status: req.body.status ?? undefined,
            notes: req.body.notes ?? undefined,
            presentedAt: req.body.presentedAt ? new Date(req.body.presentedAt) : req.body.presentedAt === null ? null : undefined,
            assigneeId: req.body.assigneeId ?? undefined,
          },
          { allowClosed: isAdmin }
        );
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Ejecutar verificación de recordatorios cada hora
  setInterval(() => {
    checkAndSendReminders(storage).catch(console.error);
  }, 60 * 60 * 1000);

  // 🚀 REGISTRAR RUTAS ÉPICAS DE TAREAS
  registerEpicTasksRoutes(app);

  const httpServer = createServer(app);
  
  // Configurar Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware de autenticación para Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; roleId: string };
      const user = await storage.getUser(decoded.id);

      if (!user) {
        return next(new Error("User not found"));
      }

      // Obtener el rol completo para tener el nombre del rol
      const userWithRole = await storage.getUserWithPermissions(decoded.id);
      const roleName = userWithRole?.roles?.name || 'Solo Lectura';

      socket.data.user = { 
        id: user.id, 
        username: user.username, 
        role: roleName,
        roleId: user.roleId 
      };
      next();
    } catch (error) {
      console.error("Socket.IO auth error:", error);
      next(new Error("Invalid token"));
    }
  });

  // ==================== NOTIFICATION TEMPLATES ROUTES ====================
  app.get(
    "/api/notification-templates",
    authenticateToken,
    checkPermission("notifications:view_history"),
    async (req: Request, res: Response) => {
      try {
        const templates = await storage.getAllNotificationTemplates();
        res.json(templates);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/notification-templates",
    authenticateToken,
    checkPermission("notifications:create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { nombre, asunto, contenidoHTML, variables, tipo, activa } = req.body;
        
        if (!nombre || !asunto || !contenidoHTML) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const template = await storage.createNotificationTemplate({
          nombre,
          asunto,
          contenidoHTML,
          variables: variables || null,
          tipo: tipo || "INFORMATIVO",
          activa: activa !== undefined ? activa : true,
          creadoPor: req.user!.id,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Creó plantilla de notificación",
          modulo: "notificaciones",
          detalles: `Plantilla: ${nombre}`,
        });

        res.json(template);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/notification-templates/:id",
    authenticateToken,
    checkPermission("notifications:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const template = await storage.updateNotificationTemplate(id, updates);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Actualizó plantilla de notificación",
          modulo: "notificaciones",
          detalles: `Plantilla ID: ${id}`,
        });

        res.json(template);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/notification-templates/:id",
    authenticateToken,
    checkPermission("notifications:delete"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        await storage.deleteNotificationTemplate(id);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Eliminó plantilla de notificación",
          modulo: "notificaciones",
          detalles: `Plantilla ID: ${id}`,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== NOTIFICATION SENDING & HISTORY ====================
  app.post(
    "/api/notifications/send",
    authenticateToken,
    checkPermission("notifications:send"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { plantillaId, smtpAccountId, destinatarios, asunto, contenido } = req.body;
        
        if (!destinatarios || destinatarios.length === 0) {
          return res.status(400).json({ error: "Debe seleccionar al menos un destinatario" });
        }

        // TODO: Implementar envío real de emails usando la cuenta SMTP seleccionada
        
        // Registrar en el log
        const log = await storage.createNotificationLog({
          plantillaId: plantillaId || null,
          smtpAccountId: smtpAccountId || null,
          destinatarios,
          asunto,
          contenido,
          tipo: "EMAIL",
          estado: "ENVIADO",
          fechaEnvio: new Date(),
          enviadoPor: req.user!.id,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Envió notificación",
          modulo: "notificaciones",
          detalles: `${destinatarios.length} destinatarios`,
        });

        res.json(log);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/notifications/history",
    authenticateToken,
    checkPermission("notifications:view_history"),
    async (req: Request, res: Response) => {
      try {
        const logs = await storage.getAllNotificationLogs();
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/notifications/scheduled",
    authenticateToken,
    checkPermission("notifications:view_history"),
    async (req: Request, res: Response) => {
      try {
        const scheduled = await storage.getAllScheduledNotifications();
        res.json(scheduled);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/notifications/schedule",
    authenticateToken,
    checkPermission("notifications:send"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { plantillaId, smtpAccountId, destinatariosSeleccionados, fechaProgramada, recurrencia } = req.body;
        
        if (!plantillaId || !fechaProgramada) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const notification = await storage.createScheduledNotification({
          plantillaId,
          smtpAccountId: smtpAccountId || null,
          destinatariosSeleccionados,
          fechaProgramada: new Date(fechaProgramada),
          estado: "PENDIENTE",
          recurrencia: recurrencia || "NINGUNA",
          creadoPor: req.user!.id,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Programó notificación",
          modulo: "notificaciones",
          detalles: `Fecha: ${fechaProgramada}`,
        });

        res.json(notification);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/notifications/scheduled/:id",
    authenticateToken,
    checkPermission("notifications:update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.fechaProgramada) {
          updates.fechaProgramada = new Date(updates.fechaProgramada);
        }

        const notification = await storage.updateScheduledNotification(id, updates);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Actualizó notificación programada",
          modulo: "notificaciones",
          detalles: `Notificación ID: ${id}`,
        });

        res.json(notification);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/notifications/scheduled/:id",
    authenticateToken,
    checkPermission("notifications:delete"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        await storage.deleteScheduledNotification(id);

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: "Eliminó notificación programada",
          modulo: "notificaciones",
          detalles: `Notificación ID: ${id}`,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Eventos de Socket.IO
  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`Usuario conectado: ${user.username} (${socket.id})`);

    // Unirse a sala personal
    socket.join(`user:${user.id}`);
    
    // Unirse a sala de rol
    socket.join(`role:${user.role}`);

    // Sistema de heartbeat para mantener sesiones activas
    let heartbeatInterval: NodeJS.Timeout;
    let lastHeartbeat = Date.now();
    
    // Configurar heartbeat cada 30 segundos
    heartbeatInterval = setInterval(async () => {
      try {
        // Actualizar last_seen_at en la base de datos
        await prisma.sessions.updateMany({
          where: { socket_id: socket.id, ended_at: null as any },
          data: { last_seen_at: new Date() } as any,
        });
        
        // Verificar si el socket sigue conectado
        if (socket.connected) {
          socket.emit("heartbeat", { timestamp: Date.now() });
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch (err) {
        console.error('Error en heartbeat:', err);
      }
    }, 30000); // 30 segundos

    // Manejar respuesta de heartbeat del cliente
    socket.on("heartbeat-response", async () => {
      lastHeartbeat = Date.now();
      try {
        await prisma.sessions.updateMany({
          where: { socket_id: socket.id, ended_at: null as any },
          data: { last_seen_at: new Date() } as any,
        });
      } catch (err) {
        console.error('Error actualizando heartbeat:', err);
      }
    });

    // Emitir conteo actualizado de usuarios conectados
    const connectedCount = io.sockets.sockets.size;
    io.emit("online-count", connectedCount);

    // Emitir evento de conexión
    io.emit("user:connected", {
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString()
    });

    // Notificar a administradores sobre nueva sesión sospechosa
    (async () => {
      try {
        // Verificar si la sesión es sospechosa (VPN, IP diferente, etc.)
        const ipHeader = (socket.handshake.headers['x-forwarded-for'] as string) || '';
        const ip = ipHeader ? ipHeader.split(',')[0].trim() : socket.handshake.address;
        
        // Aquí podrías agregar lógica para detectar sesiones sospechosas
        // Por ejemplo: múltiples sesiones desde diferentes IPs, uso de VPN, etc.
        
        // Notificar a administradores sobre nueva sesión
        io.to('role:Administrador').emit('session:new', {
          userId: user.id,
          username: user.username,
          ip: ip,
          timestamp: new Date().toISOString(),
          socket_id: socket.id
        });
      } catch (err) {
        console.error('Error notificando nueva sesión:', err);
      }
    })();

    // Registrar sesión en base de datos (si existe el modelo Session)
    (async () => {
      try {
        const ipHeader = (socket.handshake.headers['x-forwarded-for'] as string) || '';
        const ip = ipHeader ? ipHeader.split(',')[0].trim() : socket.handshake.address;
        const userAgent = String(socket.handshake.headers['user-agent'] || '');

        // Verificar que la tabla Session existe antes de crear el registro
        await prisma.sessions.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            socket_id: socket.id,
            ip: ip as any,
            user_agent: userAgent as any,
            last_seen_at: new Date(),
            createdAt: new Date(),
          } as any,
        });
        
        console.log(`✅ Sesión creada para usuario ${user.username} (${socket.id})`);
      } catch (err) {
        console.error('❌ Error al crear sesión:', err);
        // No fallar la conexión por esto, solo loguear el error
        // Esto puede pasar si la tabla Session no está sincronizada con Prisma
      }
    })();

    // Manejar solicitud de conteo de usuarios conectados
    socket.on("get:online-count", () => {
      const connectedCount = io.sockets.sockets.size;
      socket.emit("online-count", connectedCount);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Usuario desconectado: ${user.username} - Razón: ${reason}`);
      
      // Limpiar intervalo de heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Solo marcar como desconectado si es una desconexión real (no temporal)
      const isTemporaryDisconnect = reason === 'client namespace disconnect' || 
                                   reason === 'server namespace disconnect' ||
                                   reason === 'ping timeout';
      
      if (!isTemporaryDisconnect) {
        // Emitir conteo actualizado de usuarios conectados
        const connectedCount = io.sockets.sockets.size;
        io.emit("online-count", connectedCount);
        
        io.emit("user:disconnected", {
          userId: user.id,
          username: user.username,
          timestamp: new Date().toISOString(),
          reason: reason
        });
        
        // Marcar sesión como finalizada solo si es una desconexión real
        (async () => {
          try {
            await prisma.sessions.updateMany({
              where: { socket_id: socket.id, ended_at: null as any },
              data: { ended_at: new Date(), last_seen_at: new Date() } as any,
            });
            console.log(`✅ Sesión finalizada para usuario ${user.username} (${socket.id}) - Razón: ${reason}`);
          } catch (err) {
            console.error('❌ Error al finalizar sesión:', err);
          }
        })();
      } else {
        console.log(`🔄 Desconexión temporal para usuario ${user.username} - No cerrando sesión`);
      }
    });
  });

  // Exportar io para uso en otros módulos
  (httpServer as any).io = io;
  
  // Inicializar helper de websocket
  setSocketIO(io);

  return httpServer;
}
