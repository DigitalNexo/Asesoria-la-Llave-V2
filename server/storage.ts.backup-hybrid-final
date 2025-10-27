// @ts-nocheck
import {
  type User, type InsertUser,
  type Client, type InsertClient,
  type Task, type InsertTask,
  type Manual, type InsertManual,
  type ManualAttachment, type InsertManualAttachment,
  type ManualVersion, type InsertManualVersion,
  type ActivityLog, type InsertActivityLog,
  type AuditTrail, type InsertAuditTrail,
  type SystemSettings, type InsertSystemSettings
} from "@shared/schema";
import { randomUUID } from "crypto";
import { calculateDerivedFields } from "./services/tax-calendar-service";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientByNif(nifCif: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getAllClients(): Promise<Client[]>;

  // Impuestos
  getAllImpuestos(): Promise<any[]>;
  getImpuesto(id: string): Promise<any>;
  getImpuestoByModelo(modelo: string): Promise<any>;
  createImpuesto(data: any): Promise<any>;
  updateImpuesto(id: string, data: any): Promise<any>;
  deleteImpuesto(id: string): Promise<boolean>;

  // Obligaciones Fiscales
  getAllObligacionesFiscales(): Promise<any[]>;
  getObligacionFiscal(id: string): Promise<any>;
  getObligacionesByCliente(clienteId: string): Promise<any[]>;
  createObligacionFiscal(data: any): Promise<any>;
  updateObligacionFiscal(id: string, data: any): Promise<any>;
  deleteObligacionFiscal(id: string): Promise<boolean>;

  // Tax Calendar
  listTaxCalendar(params?: { year?: number; modelCode?: string; active?: boolean }): Promise<any[]>;
  getTaxCalendar(id: string): Promise<any>;
  createTaxCalendar(data: any): Promise<any>;
  updateTaxCalendar(id: string, data: any): Promise<any>;
  deleteTaxCalendar(id: string): Promise<boolean>;
  cloneTaxCalendarYear(year: number): Promise<any[]>;

  // Declaraciones
  getAllDeclaraciones(): Promise<any[]>;
  getDeclaracion(id: string): Promise<any>;
  getDeclaracionesByObligacion(obligacionId: string): Promise<any[]>;
  getDeclaracionesByCliente(clienteId: string): Promise<any[]>;
  createDeclaracion(data: any): Promise<any>;
  updateDeclaracion(id: string, data: any): Promise<any>;
  deleteDeclaracion(id: string): Promise<boolean>;

  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getAllTasks(): Promise<Task[]>;

  // Manuals
  getManual(id: string): Promise<Manual | undefined>;
  createManual(manual: InsertManual): Promise<Manual>;
  updateManual(id: string, manual: Partial<InsertManual>): Promise<Manual | undefined>;
  deleteManual(id: string): Promise<boolean>;
  getAllManuals(): Promise<Manual[]>;

  // Manual Attachments
  getManualAttachment(id: string): Promise<ManualAttachment | undefined>;
  createManualAttachment(attachment: InsertManualAttachment): Promise<ManualAttachment>;
  deleteManualAttachment(id: string): Promise<boolean>;
  getManualAttachments(manualId: string): Promise<ManualAttachment[]>;

  // Manual Versions
  getManualVersion(id: string): Promise<ManualVersion | undefined>;
  createManualVersion(version: InsertManualVersion): Promise<ManualVersion>;
  getManualVersions(manualId: string): Promise<ManualVersion[]>;
  getNextVersionNumber(manualId: string): Promise<number>;
  restoreManualVersion(manualId: string, versionId: string): Promise<Manual | undefined>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getAllActivityLogs(): Promise<ActivityLog[]>;

  // Audit Trail
  createAuditEntry(audit: InsertAuditTrail): Promise<AuditTrail>;
  getAllAuditEntries(): Promise<AuditTrail[]>;
  getAuditEntriesByTable(tabla: string): Promise<AuditTrail[]>;
  getAuditEntriesByRecord(tabla: string, registroId: string): Promise<AuditTrail[]>;
  getAuditEntriesByUser(usuarioId: string): Promise<AuditTrail[]>;

  // Global Search
  globalSearch(query: string): Promise<{
    clientes: any[];
    tareas: any[];
    impuestos: any[];
    manuales: any[];
    total: number;
  }>;

  // System Settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings>;

  // SMTP Accounts
  getSMTPAccount(id: string): Promise<any>;
  getAllSMTPAccounts(): Promise<any[]>;
  getDefaultSMTPAccount(): Promise<any>;
  createSMTPAccount(account: any): Promise<any>;
  updateSMTPAccount(id: string, account: any): Promise<any>;
  deleteSMTPAccount(id: string): Promise<boolean>;

  // Notification Templates
  getNotificationTemplate(id: string): Promise<any>;
  getAllNotificationTemplates(): Promise<any[]>;
  createNotificationTemplate(template: any): Promise<any>;
  updateNotificationTemplate(id: string, template: any): Promise<any>;
  deleteNotificationTemplate(id: string): Promise<boolean>;

  // Notification Logs
  getNotificationLog(id: string): Promise<any>;
  getAllNotificationLogs(): Promise<any[]>;
  createNotificationLog(log: any): Promise<any>;

  // Scheduled Notifications
  getScheduledNotification(id: string): Promise<any>;
  getAllScheduledNotifications(): Promise<any[]>;
  getPendingScheduledNotifications(): Promise<any[]>;
  createScheduledNotification(notification: any): Promise<any>;
  updateScheduledNotification(id: string, notification: any): Promise<any>;
  deleteScheduledNotification(id: string): Promise<boolean>;

  // Tax control 2.0
  getTaxAssignmentHistory(assignmentId: string): Promise<any[]>;
  getFiscalPeriodsSummary(year?: number): Promise<any[]>;
  getFiscalPeriod(id: string): Promise<any | null>;
  createFiscalYear(year: number): Promise<any[]>;
  createFiscalPeriod(data: any): Promise<any>;
  toggleFiscalPeriodStatus(id: string, status: any, userId?: string): Promise<any>;
  getTaxFilings(filters: any): Promise<any[]>;
  updateTaxFiling(id: string, data: any, options?: any): Promise<any>;
}

export class MemStorage {
  private users: Map<string, any> = new Map();
  private clients: Map<string, any> = new Map();
  private impuestos: Map<string, any> = new Map();
  private obligacionesFiscales: Map<string, any> = new Map();
  private taxCalendars: Map<string, any> = new Map();
  private declaraciones: Map<string, any> = new Map();
  private tasks: Map<string, any> = new Map();
  private manuals: Map<string, any> = new Map();
  private activityLogs: Map<string, any> = new Map();
  // Extra in-memory stores to satisfy full IStorage interface
  private smtpAccounts: Map<string, any> = new Map();
  private notificationTemplates: Map<string, any> = new Map();
  private notificationLogs: Map<string, any> = new Map();
  private scheduledNotifications: Map<string, any> = new Map();
  private systemSettings: any = null;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create seed users
    const adminId = randomUUID();
    const gestorId = randomUUID();
    const lecturaId = randomUUID();

    this.users.set(adminId, {
      id: adminId,
      username: "admin",
      email: "admin@asesoria.com",
      password: "$2b$10$PPKmXUMSXZoPLRsxHQn95OCrn8rPMAz9Wr8vCqR6Lzb9WWgVNUx4W", // password: admin123
      role: "ADMIN",
      createdAt: new Date(),
    });

    this.users.set(gestorId, {
      id: gestorId,
      username: "gestor",
      email: "gestor@asesoria.com",
      password: "$2b$10$PPKmXUMSXZoPLRsxHQn95OCrn8rPMAz9Wr8vCqR6Lzb9WWgVNUx4W", // password: admin123
      role: "GESTOR",
      createdAt: new Date(),
    });

    this.users.set(lecturaId, {
      id: lecturaId,
      username: "lectura",
      email: "lectura@asesoria.com",
      password: "$2b$10$PPKmXUMSXZoPLRsxHQn95OCrn8rPMAz9Wr8vCqR6Lzb9WWgVNUx4W", // password: admin123
      role: "LECTURA",
      createdAt: new Date(),
    });

    // Create seed clients
    const clientIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    
    this.clients.set(clientIds[0], {
      id: clientIds[0],
      razonSocial: "Comercial López S.L.",
      nifCif: "B12345678",
      tipo: "empresa",
      email: "comercial@lopez.com",
      telefono: "912345678",
      direccion: "Calle Mayor 123, Madrid",
      fechaAlta: new Date(),
      responsableAsignado: gestorId,
    });

    this.clients.set(clientIds[1], {
      id: clientIds[1],
      razonSocial: "Juan García Pérez",
      nifCif: "12345678A",
      tipo: "autonomo",
      email: "juan@garcia.com",
      telefono: "654321987",
      direccion: "Avenida de la Constitución 45, Barcelona",
      fechaAlta: new Date(),
      responsableAsignado: gestorId,
    });

    this.clients.set(clientIds[2], {
      id: clientIds[2],
      razonSocial: "Tecnologías Avanzadas S.A.",
      nifCif: "A87654321",
      tipo: "empresa",
      email: "info@tecavanzadas.com",
      telefono: "934567890",
      direccion: "Polígono Industrial Norte, Valencia",
      fechaAlta: new Date(),
      responsableAsignado: gestorId,
    });

    this.clients.set(clientIds[3], {
      id: clientIds[3],
      razonSocial: "María Rodríguez Sánchez",
      nifCif: "87654321B",
      tipo: "autonomo",
      email: "maria@rodriguez.com",
      telefono: "678901234",
      direccion: "Plaza España 8, Sevilla",
      fechaAlta: new Date(),
      responsableAsignado: null,
    });

    this.clients.set(clientIds[4], {
      id: clientIds[4],
      razonSocial: "Distribuciones del Sur S.L.",
      nifCif: "B11223344",
      tipo: "empresa",
      email: "contacto@distrisur.com",
      telefono: "955123456",
      direccion: "Calle Industria 56, Málaga",
      fechaAlta: new Date(),
      responsableAsignado: gestorId,
    });

    // Note: Tax system seed data removed - new AEAT system uses Prisma migrations

    // Create seed tasks
    const taskIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];

    this.tasks.set(taskIds[0], {
      id: taskIds[0],
      titulo: "Revisar documentación fiscal Comercial López",
      descripcion: "Verificar que toda la documentación del Q1 esté completa",
      clienteId: clientIds[0],
      asignadoA: gestorId,
      prioridad: "ALTA",
      estado: "PENDIENTE",
      visibilidad: "GENERAL",
      fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    this.tasks.set(taskIds[1], {
      id: taskIds[1],
      titulo: "Preparar presentación modelo 303",
      descripcion: "Calcular IVA trimestral para todos los clientes",
      clienteId: null,
      asignadoA: gestorId,
      prioridad: "MEDIA",
      estado: "EN_PROGRESO",
      visibilidad: "GENERAL",
      fechaVencimiento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    this.tasks.set(taskIds[2], {
      id: taskIds[2],
      titulo: "Reunión con Juan García",
      descripcion: "Revisar situación fiscal y planificación 2024",
      clienteId: clientIds[1],
      asignadoA: gestorId,
      prioridad: "MEDIA",
      estado: "COMPLETADA",
      visibilidad: "PERSONAL",
      fechaVencimiento: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    this.tasks.set(taskIds[3], {
      id: taskIds[3],
      titulo: "Actualizar software de gestión",
      descripcion: "Instalar última versión y verificar compatibilidad",
      clienteId: null,
      asignadoA: adminId,
      prioridad: "BAJA",
      estado: "PENDIENTE",
      visibilidad: "GENERAL",
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    this.tasks.set(taskIds[4], {
      id: taskIds[4],
      titulo: "Revisar normativa fiscal 2024",
      descripcion: "Estudiar cambios en deducciones y tipos impositivos",
      clienteId: null,
      asignadoA: gestorId,
      prioridad: "MEDIA",
      estado: "EN_PROGRESO",
      visibilidad: "PERSONAL",
      fechaVencimiento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    // Create seed manuals
    const manual1Id = randomUUID();
    const manual2Id = randomUUID();

    this.manuals.set(manual1Id, {
      id: manual1Id,
      titulo: "Guía de Presentación Modelo 303",
      contenidoHtml: "<h2>Introducción</h2><p>El modelo 303 es la declaración trimestral del IVA que deben presentar los autónomos y empresas.</p><h2>Plazos</h2><ul><li>Primer trimestre: hasta el 20 de abril</li><li>Segundo trimestre: hasta el 20 de julio</li><li>Tercer trimestre: hasta el 20 de octubre</li><li>Cuarto trimestre: hasta el 30 de enero</li></ul><h2>Documentación Necesaria</h2><p>Para completar el modelo 303 necesitarás:</p><ul><li>Facturas emitidas del trimestre</li><li>Facturas recibidas del trimestre</li><li>Libro registro de IVA</li></ul>",
      autorId: adminId,
      etiquetas: ["fiscal", "iva", "modelo-303"],
      categoria: "Fiscalidad",
      publicado: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    this.manuals.set(manual2Id, {
      id: manual2Id,
      titulo: "Procedimiento de Alta de Nuevos Clientes",
      contenidoHtml: "<h2>Proceso de Alta</h2><p>Este manual describe el procedimiento para dar de alta nuevos clientes en el sistema.</p><h2>Documentación Requerida</h2><ol><li>DNI/NIF o CIF</li><li>Escritura de constitución (si es empresa)</li><li>Alta en Hacienda y Seguridad Social</li><li>Datos bancarios</li></ol><h2>Pasos a Seguir</h2><p>1. Verificar la documentación<br/>2. Crear ficha en el sistema<br/>3. Asignar gestor responsable<br/>4. Configurar calendario fiscal</p>",
      autorId: adminId,
      etiquetas: ["procedimientos", "clientes", "alta"],
      categoria: "Administrativo",
      publicado: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || "LECTURA",
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updateData };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Client methods
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByNif(nifCif: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(client => client.nifCif === nifCif);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { 
      ...insertClient,
      email: insertClient.email || null,
      telefono: insertClient.telefono || null,
      direccion: insertClient.direccion || null,
      responsableAsignado: insertClient.responsableAsignado || null,
      id, 
      fechaAlta: new Date() 
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    const updated = { ...client, ...updateData };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  // Impuestos methods
  async getAllImpuestos(): Promise<any[]> {
    return Array.from(this.impuestos.values());
  }

  async getImpuesto(id: string): Promise<any> {
    return this.impuestos.get(id);
  }

  async getImpuestoByModelo(modelo: string): Promise<any> {
    return Array.from(this.impuestos.values()).find(i => i.modelo === modelo);
  }

  async createImpuesto(data: any): Promise<any> {
    const id = randomUUID();
    const impuesto = { id, ...data };
    this.impuestos.set(id, impuesto);
    return impuesto;
  }

  async updateImpuesto(id: string, data: any): Promise<any> {
    const impuesto = this.impuestos.get(id);
    if (!impuesto) throw new Error('Impuesto not found');
    const updated = { ...impuesto, ...data };
    this.impuestos.set(id, updated);
    return updated;
  }

  async deleteImpuesto(id: string): Promise<boolean> {
    return this.impuestos.delete(id);
  }

  // Obligaciones Fiscales methods
  async getAllObligacionesFiscales(): Promise<any[]> {
    return Array.from(this.obligacionesFiscales.values());
  }

  async getObligacionFiscal(id: string): Promise<any> {
    return this.obligacionesFiscales.get(id);
  }

  async getObligacionesByCliente(clienteId: string): Promise<any[]> {
    return Array.from(this.obligacionesFiscales.values()).filter(o => o.clienteId === clienteId);
  }

  async createObligacionFiscal(data: any): Promise<any> {
    const id = randomUUID();
    const obligacion = { id, ...data };
    this.obligacionesFiscales.set(id, obligacion);
    return obligacion;
  }

  async updateObligacionFiscal(id: string, data: any): Promise<any> {
    const obligacion = this.obligacionesFiscales.get(id);
    if (!obligacion) throw new Error('Obligacion not found');
    const updated = { ...obligacion, ...data };
    this.obligacionesFiscales.set(id, updated);
    return updated;
  }

  async deleteObligacionFiscal(id: string): Promise<boolean> {
    return this.obligacionesFiscales.delete(id);
  }

  // Tax calendar methods
  async listTaxCalendar(params?: { year?: number; modelCode?: string; active?: boolean }): Promise<any[]> {
    let items = Array.from(this.taxCalendars.values());
    if (!params) return items;

    if (typeof params.year === "number") {
      items = items.filter(item => item.year === params.year);
    }

    if (params.modelCode) {
      items = items.filter(item => item.modelCode === params.modelCode);
    }

    if (typeof params.active === "boolean") {
      items = items.filter(item => item.active === params.active);
    }

    return items;
  }

  async getTaxCalendar(id: string): Promise<any> {
    return this.taxCalendars.get(id);
  }

  async createTaxCalendar(data: any): Promise<any> {
    const id = randomUUID();
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const derived = calculateDerivedFields(startDate, endDate);
    const calendario = {
      id,
      ...data,
      startDate,
      endDate,
      status: derived.status,
      daysToStart: derived.daysToStart,
      daysToEnd: derived.daysToEnd,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.taxCalendars.set(id, calendario);
    return calendario;
  }

  async updateTaxCalendar(id: string, data: any): Promise<any> {
    const calendario = this.taxCalendars.get(id);
    if (!calendario) throw new Error("Tax calendar not found");
    const startDate = data.startDate ? new Date(data.startDate) : new Date(calendario.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : new Date(calendario.endDate);
    const derived = calculateDerivedFields(startDate, endDate);
    const updated = {
      ...calendario,
      ...data,
      startDate,
      endDate,
      status: derived.status,
      daysToStart: derived.daysToStart,
      daysToEnd: derived.daysToEnd,
      updatedAt: new Date(),
    };
    this.taxCalendars.set(id, updated);
    return updated;
  }

  async deleteTaxCalendar(id: string): Promise<boolean> {
    return this.taxCalendars.delete(id);
  }

  async cloneTaxCalendarYear(year: number): Promise<any[]> {
    const source = Array.from(this.taxCalendars.values()).filter(item => item.year === year);
    if (source.length === 0) return [];

    const targetYear = year + 1;
    const clones = source.map(item => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      startDate.setFullYear(startDate.getFullYear() + 1);
      endDate.setFullYear(endDate.getFullYear() + 1);
      const derived = calculateDerivedFields(startDate, endDate);

      const cloned = {
        ...item,
        id: randomUUID(),
        year: targetYear,
        startDate,
        endDate,
        status: derived.status,
        daysToStart: derived.daysToStart,
        daysToEnd: derived.daysToEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.taxCalendars.set(cloned.id, cloned);
      return cloned;
    });

    return clones;
  }

  // Declaraciones methods
  async getAllDeclaraciones(): Promise<any[]> {
    return Array.from(this.declaraciones.values());
  }

  async getDeclaracion(id: string): Promise<any> {
    return this.declaraciones.get(id);
  }

  async getDeclaracionesByObligacion(obligacionId: string): Promise<any[]> {
    return Array.from(this.declaraciones.values()).filter(d => d.obligacionId === obligacionId);
  }

  async getDeclaracionesByCliente(clienteId: string): Promise<any[]> {
    // Nota: En MemStorage no podemos hacer joins, retornamos array vacío
    return [];
  }

  async createDeclaracion(data: any): Promise<any> {
    const id = randomUUID();
    const declaracion = { id, ...data };
    this.declaraciones.set(id, declaracion);
    return declaracion;
  }

  async updateDeclaracion(id: string, data: any): Promise<any> {
    const declaracion = this.declaraciones.get(id);
    if (!declaracion) throw new Error('Declaracion not found');
    const updated = { ...declaracion, ...data };
    this.declaraciones.set(id, updated);
    return updated;
  }

  async deleteDeclaracion(id: string): Promise<boolean> {
    return this.declaraciones.delete(id);
  }

  // Task methods
  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = { 
      ...insertTask,
      descripcion: insertTask.descripcion || null,
      clienteId: insertTask.clienteId || null,
      asignadoA: insertTask.asignadoA || null,
      prioridad: insertTask.prioridad || "MEDIA",
      estado: insertTask.estado || "PENDIENTE",
      visibilidad: insertTask.visibilidad || "GENERAL",
      fechaVencimiento: insertTask.fechaVencimiento || null,
      id, 
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...updateData, fechaActualizacion: new Date() };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  // Manual methods
  async getManual(id: string): Promise<Manual | undefined> {
    return this.manuals.get(id);
  }

  async createManual(insertManual: InsertManual): Promise<Manual> {
    const id = randomUUID();
    const manual: Manual = { 
      ...insertManual,
      etiquetas: insertManual.etiquetas || null,
      categoria: insertManual.categoria || null,
      publicado: insertManual.publicado !== undefined ? insertManual.publicado : false,
      id, 
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    this.manuals.set(id, manual);
    return manual;
  }

  async updateManual(id: string, updateData: Partial<InsertManual>): Promise<Manual | undefined> {
    const manual = this.manuals.get(id);
    if (!manual) return undefined;
    const updated = { ...manual, ...updateData, fechaActualizacion: new Date() };
    this.manuals.set(id, updated);
    return updated;
  }

  async deleteManual(id: string): Promise<boolean> {
    return this.manuals.delete(id);
  }

  async getAllManuals(): Promise<Manual[]> {
    return Array.from(this.manuals.values());
  }

  // Activity Log methods
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = { 
      ...insertLog,
      detalles: insertLog.detalles || null,
      id, 
      fecha: new Date() 
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).sort((a, b) => 
      b.fecha.getTime() - a.fecha.getTime()
    );
  }

  // Audit Trail methods (stub implementation for MemStorage)
  async createAuditEntry(insertAudit: InsertAuditTrail): Promise<AuditTrail> {
    const id = randomUUID();
    const audit: AuditTrail = {
      ...insertAudit,
      valorAnterior: insertAudit.valorAnterior || null,
      valorNuevo: insertAudit.valorNuevo || null,
      cambios: insertAudit.cambios || null,
      id,
      fecha: new Date()
    };
    return audit;
  }

  async getAllAuditEntries(): Promise<AuditTrail[]> {
    return [];
  }

  async getAuditEntriesByTable(tabla: string): Promise<AuditTrail[]> {
    return [];
  }

  async getAuditEntriesByRecord(tabla: string, registroId: string): Promise<AuditTrail[]> {
    return [];
  }

  async getAuditEntriesByUser(usuarioId: string): Promise<AuditTrail[]> {
    return [];
  }

  // Global Search (stub for MemStorage)
  async globalSearch(query: string): Promise<{
    clientes: Client[];
    tareas: Task[];
    impuestos: any[];
    manuales: Manual[];
    total: number;
  }> {
    const searchTerm = query.toLowerCase();
    
    const clientes = Array.from(this.clients.values()).filter(c => 
      c.razonSocial.toLowerCase().includes(searchTerm) ||
      c.nifCif.toLowerCase().includes(searchTerm)
    );

    const tareas = Array.from(this.tasks.values()).filter(t => 
      t.titulo.toLowerCase().includes(searchTerm)
    );

    const manuales = Array.from(this.manuals.values()).filter(m => 
      m.titulo.toLowerCase().includes(searchTerm)
    );

    return {
      clientes,
      tareas,
      impuestos: [],
      manuales,
      total: clientes.length + tareas.length + manuales.length
    };
  }
}

export const storage = new MemStorage();
