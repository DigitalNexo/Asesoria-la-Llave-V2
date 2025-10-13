import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { prismaStorage as storage } from "./prisma-storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { configureSMTP, getSMTPConfig, checkAndSendReminders } from "./email";
import { setSocketIO, notifyTaskChange, notifyClientChange, notifyTaxChange, notifyManualChange } from "./websocket";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
const SALT_ROUNDS = 10;

// Configuración de Multer para subida de archivos
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Middleware de autenticación
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    const user = await storage.getUser(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido" });
  }
};

// Middleware de autorización por rol
const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};

// Rate limiter para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: "Demasiados intentos de inicio de sesión, intenta de nuevo más tarde",
});

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

export async function registerRoutes(app: Express): Promise<Server> {
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
  app.post(
    "/api/auth/register",
    [
      body("username").trim().isLength({ min: 3 }).withMessage("El usuario debe tener al menos 3 caracteres"),
      body("email").isEmail().withMessage("Email inválido"),
      body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { username, email, password, role } = req.body;

        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "El usuario ya existe" });
        }

        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "El email ya está registrado" });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          role: role || "LECTURA",
        });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
          expiresIn: "24h",
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

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

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
        expiresIn: "24h",
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.json({ message: "Sesión cerrada exitosamente" });
  });

  app.get("/api/auth/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== USER ROUTES ====================
  app.get("/api/users", authenticateToken, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/users",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req: Request, res: Response) => {
      try {
        const { username, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          role: role || "LECTURA",
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
    authorizeRoles("ADMIN"),
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

  app.delete(
    "/api/users/:id",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const deleted = await storage.deleteUser(id);
        if (!deleted) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json({ message: "Usuario eliminado" });
      } catch (error: any) {
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

  app.post(
    "/api/clients",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
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
        
        res.json(client);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/clients/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
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
        
        res.json(client);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/clients/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const client = await storage.getClient(id);
        const deleted = await storage.deleteClient(id);
        if (!deleted) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await storage.createActivityLog({
          usuarioId: (req as AuthRequest).user!.id,
          accion: `Eliminó el cliente ${client?.razonSocial}`,
          modulo: "clientes",
          detalles: null,
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
        
        res.json({ message: "Cliente eliminado" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== TAX MODEL ROUTES ====================
  app.get("/api/tax-models", authenticateToken, async (req: Request, res: Response) => {
    try {
      const models = await storage.getAllTaxModels();
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TAX PERIOD ROUTES ====================
  app.get("/api/tax-periods", authenticateToken, async (req: Request, res: Response) => {
    try {
      const periods = await storage.getAllTaxPeriods();
      const models = await storage.getAllTaxModels();
      
      const periodsWithModels = periods.map(period => ({
        ...period,
        taxModel: models.find(m => m.id === period.modeloId),
      }));
      
      res.json(periodsWithModels);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CLIENT TAX ROUTES ====================
  app.get("/api/client-tax", authenticateToken, async (req: Request, res: Response) => {
    try {
      const clientTaxes = await storage.getAllClientTax();
      const clients = await storage.getAllClients();
      const periods = await storage.getAllTaxPeriods();
      const models = await storage.getAllTaxModels();
      
      const enriched = clientTaxes.map(ct => ({
        ...ct,
        client: clients.find(c => c.id === ct.clientId),
        taxPeriod: {
          ...periods.find(p => p.id === ct.taxPeriodId),
          taxModel: models.find(m => m.id === periods.find(p => p.id === ct.taxPeriodId)?.modeloId),
        },
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/client-tax",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: Request, res: Response) => {
      try {
        const clientTax = await storage.createClientTax(req.body);
        await storage.createActivityLog({
          usuarioId: (req as AuthRequest).user!.id,
          accion: "Asignó un impuesto a un cliente",
          modulo: "impuestos",
          detalles: null,
        });
        res.json(clientTax);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch(
    "/api/client-tax/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const clientTax = await storage.updateClientTax(id, req.body);
        if (!clientTax) {
          return res.status(404).json({ error: "Impuesto no encontrado" });
        }
        await storage.createActivityLog({
          usuarioId: (req as AuthRequest).user!.id,
          accion: `Actualizó estado de impuesto a ${req.body.estado}`,
          modulo: "impuestos",
          detalles: null,
        });
        res.json(clientTax);
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
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: Request, res: Response) => {
      try {
        const task = await storage.createTask(req.body);
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
        const task = await storage.updateTask(id, req.body);
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
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: AuthRequest, res: Response) => {
      try {
        const manual = await storage.createManual({
          ...req.body,
          autorId: req.user!.id,
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
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
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

  // ==================== ACTIVITY LOG ROUTES ====================
  app.get(
    "/api/activity-logs",
    authenticateToken,
    authorizeRoles("ADMIN"),
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
      const clientTaxes = await storage.getAllClientTax();
      const tasks = await storage.getAllTasks();
      const manuals = await storage.getAllManuals();

      const stats = {
        totalClientes: clients.length,
        clientesActivos: clients.filter(c => c.responsableAsignado).length,
        impuestosPendientes: clientTaxes.filter(ct => ct.estado === "PENDIENTE").length,
        impuestosCalculados: clientTaxes.filter(ct => ct.estado === "CALCULADO").length,
        impuestosRealizados: clientTaxes.filter(ct => ct.estado === "REALIZADO").length,
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

  // ==================== FILE UPLOAD ROUTES ====================
  app.post(
    "/api/tax-files/upload",
    authenticateToken,
    upload.single("file"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcionó ningún archivo" });
        }

        const { clientTaxId, tipo } = req.body;
        
        const taxFile = await storage.createTaxFile({
          clientTaxId,
          nombreArchivo: req.file.originalname,
          ruta: req.file.path,
          tipo: tipo || null,
          subidoPor: req.user?.id || null,
        });

        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Subió archivo "${req.file.originalname}" para impuesto`,
          modulo: "impuestos",
          detalles: `Tipo: ${tipo || 'Sin especificar'}`,
        });

        res.json(taxFile);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/tax-files/:clientTaxId",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { clientTaxId } = req.params;
        const files = await storage.getTaxFilesByClientTax(clientTaxId);
        res.json(files);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/tax-files/:id",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const file = await storage.getTaxFile(id);
        
        if (!file) {
          return res.status(404).json({ error: "Archivo no encontrado" });
        }

        // Delete physical file
        if (fs.existsSync(file.ruta)) {
          fs.unlinkSync(file.ruta);
        }

        await storage.deleteTaxFile(id);
        
        await storage.createActivityLog({
          usuarioId: req.user!.id,
          accion: `Eliminó archivo "${file.nombreArchivo}"`,
          modulo: "impuestos",
          detalles: null,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== EMAIL CONFIGURATION ROUTES ====================
  app.post(
    "/api/admin/smtp-config",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { host, port, user, pass } = req.body;
        
        if (!host || !port || !user || !pass) {
          return res.status(400).json({ error: "Faltan parámetros de configuración SMTP" });
        }

        configureSMTP({ host, port: parseInt(port), user, pass });
        
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
    authorizeRoles("ADMIN"),
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

  // ==================== AUDIT TRAIL ROUTES ====================
  app.get(
    "/api/audit",
    authenticateToken,
    authorizeRoles("ADMIN", "GESTOR"),
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

  // Ejecutar verificación de recordatorios cada hora
  setInterval(() => {
    checkAndSendReminders(storage).catch(console.error);
  }, 60 * 60 * 1000);

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

      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
      const user = await storage.getUser(decoded.id);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.user = { id: user.id, username: user.username, role: user.role };
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  // Eventos de Socket.IO
  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`Usuario conectado: ${user.username} (${socket.id})`);

    // Unirse a sala personal
    socket.join(`user:${user.id}`);
    
    // Unirse a sala de rol
    socket.join(`role:${user.role}`);

    // Emitir evento de conexión
    io.emit("user:connected", {
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString()
    });

    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${user.username}`);
      io.emit("user:disconnected", {
        userId: user.id,
        username: user.username,
        timestamp: new Date().toISOString()
      });
    });
  });

  // Exportar io para uso en otros módulos
  (httpServer as any).io = io;
  
  // Inicializar helper de websocket
  setSocketIO(io);

  return httpServer;
}
