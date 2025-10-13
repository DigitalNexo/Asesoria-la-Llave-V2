import { 
  type User, type InsertUser,
  type Client, type InsertClient,
  type TaxModel, type InsertTaxModel,
  type TaxPeriod, type InsertTaxPeriod,
  type ClientTax, type InsertClientTax,
  type TaxFile, type InsertTaxFile,
  type Task, type InsertTask,
  type Manual, type InsertManual,
  type ActivityLog, type InsertActivityLog,
  type AuditTrail, type InsertAuditTrail
} from "@shared/schema";
import { randomUUID } from "crypto";

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

  // Tax Models
  getTaxModel(id: string): Promise<TaxModel | undefined>;
  createTaxModel(model: InsertTaxModel): Promise<TaxModel>;
  getAllTaxModels(): Promise<TaxModel[]>;

  // Tax Periods
  getTaxPeriod(id: string): Promise<TaxPeriod | undefined>;
  createTaxPeriod(period: InsertTaxPeriod): Promise<TaxPeriod>;
  getAllTaxPeriods(): Promise<TaxPeriod[]>;

  // Client Tax
  getClientTax(id: string): Promise<ClientTax | undefined>;
  createClientTax(clientTax: InsertClientTax): Promise<ClientTax>;
  updateClientTax(id: string, clientTax: Partial<InsertClientTax>): Promise<ClientTax | undefined>;
  deleteClientTax(id: string): Promise<boolean>;
  getAllClientTax(): Promise<ClientTax[]>;

  // Tax Files
  getTaxFile(id: string): Promise<TaxFile | undefined>;
  createTaxFile(file: InsertTaxFile): Promise<TaxFile>;
  deleteTaxFile(id: string): Promise<boolean>;
  getTaxFilesByClientTax(clientTaxId: string): Promise<TaxFile[]>;

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private clients: Map<string, Client> = new Map();
  private taxModels: Map<string, TaxModel> = new Map();
  private taxPeriods: Map<string, TaxPeriod> = new Map();
  private clientTax: Map<string, ClientTax> = new Map();
  private taxFiles: Map<string, TaxFile> = new Map();
  private tasks: Map<string, Task> = new Map();
  private manuals: Map<string, Manual> = new Map();
  private activityLogs: Map<string, ActivityLog> = new Map();

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

    // Create seed tax models
    const modelIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];

    this.taxModels.set(modelIds[0], {
      id: modelIds[0],
      nombre: "303",
      descripcion: "IVA - Declaración trimestral",
    });

    this.taxModels.set(modelIds[1], {
      id: modelIds[1],
      nombre: "390",
      descripcion: "IVA - Resumen anual",
    });

    this.taxModels.set(modelIds[2], {
      id: modelIds[2],
      nombre: "130",
      descripcion: "IRPF - Pago fraccionado trimestral",
    });

    this.taxModels.set(modelIds[3], {
      id: modelIds[3],
      nombre: "131",
      descripcion: "IRPF - Estimación objetiva trimestral",
    });

    // Create seed tax periods for current year
    const currentYear = new Date().getFullYear();
    const periodIds: string[] = [];

    for (let i = 1; i <= 4; i++) {
      const periodId = randomUUID();
      periodIds.push(periodId);
      this.taxPeriods.set(periodId, {
        id: periodId,
        modeloId: modelIds[0], // Model 303
        anio: currentYear,
        trimestre: i,
        mes: null,
        inicioPresentacion: new Date(currentYear, (i - 1) * 3, 1),
        finPresentacion: new Date(currentYear, i * 3 - 1, 20),
      });
    }

    // Create some client tax assignments
    this.clientTax.set(randomUUID(), {
      id: randomUUID(),
      clientId: clientIds[0],
      taxPeriodId: periodIds[0],
      estado: "PENDIENTE",
      notas: "Pendiente de recibir documentación",
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

    this.clientTax.set(randomUUID(), {
      id: randomUUID(),
      clientId: clientIds[1],
      taxPeriodId: periodIds[0],
      estado: "REALIZADO",
      notas: "Presentado correctamente",
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    });

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

  // Tax Model methods
  async getTaxModel(id: string): Promise<TaxModel | undefined> {
    return this.taxModels.get(id);
  }

  async createTaxModel(insertModel: InsertTaxModel): Promise<TaxModel> {
    const id = randomUUID();
    const model: TaxModel = { 
      ...insertModel, 
      descripcion: insertModel.descripcion || null,
      id 
    };
    this.taxModels.set(id, model);
    return model;
  }

  async getAllTaxModels(): Promise<TaxModel[]> {
    return Array.from(this.taxModels.values());
  }

  // Tax Period methods
  async getTaxPeriod(id: string): Promise<TaxPeriod | undefined> {
    return this.taxPeriods.get(id);
  }

  async createTaxPeriod(insertPeriod: InsertTaxPeriod): Promise<TaxPeriod> {
    const id = randomUUID();
    const period: TaxPeriod = { 
      ...insertPeriod, 
      trimestre: insertPeriod.trimestre || null,
      mes: insertPeriod.mes || null,
      id 
    };
    this.taxPeriods.set(id, period);
    return period;
  }

  async getAllTaxPeriods(): Promise<TaxPeriod[]> {
    return Array.from(this.taxPeriods.values());
  }

  // Client Tax methods
  async getClientTax(id: string): Promise<ClientTax | undefined> {
    return this.clientTax.get(id);
  }

  async createClientTax(insertClientTax: InsertClientTax): Promise<ClientTax> {
    const id = randomUUID();
    const clientTax: ClientTax = { 
      ...insertClientTax,
      estado: insertClientTax.estado || "PENDIENTE",
      notas: insertClientTax.notas || null,
      id, 
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    this.clientTax.set(id, clientTax);
    return clientTax;
  }

  async updateClientTax(id: string, updateData: Partial<InsertClientTax>): Promise<ClientTax | undefined> {
    const clientTax = this.clientTax.get(id);
    if (!clientTax) return undefined;
    const updated = { ...clientTax, ...updateData, fechaActualizacion: new Date() };
    this.clientTax.set(id, updated);
    return updated;
  }

  async deleteClientTax(id: string): Promise<boolean> {
    return this.clientTax.delete(id);
  }

  async getAllClientTax(): Promise<ClientTax[]> {
    return Array.from(this.clientTax.values());
  }

  // Tax File methods
  async getTaxFile(id: string): Promise<TaxFile | undefined> {
    return this.taxFiles.get(id);
  }

  async createTaxFile(insertFile: InsertTaxFile): Promise<TaxFile> {
    const id = randomUUID();
    const file: TaxFile = { 
      ...insertFile,
      tipo: insertFile.tipo || null,
      subidoPor: insertFile.subidoPor || null,
      id, 
      fechaSubida: new Date() 
    };
    this.taxFiles.set(id, file);
    return file;
  }

  async deleteTaxFile(id: string): Promise<boolean> {
    return this.taxFiles.delete(id);
  }

  async getTaxFilesByClientTax(clientTaxId: string): Promise<TaxFile[]> {
    return Array.from(this.taxFiles.values()).filter(file => file.clientTaxId === clientTaxId);
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
