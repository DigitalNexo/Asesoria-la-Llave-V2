import { PrismaClient } from '@prisma/client';
import type { IStorage } from './storage';
import type {
  User, InsertUser,
  Client, InsertClient,
  TaxModel, InsertTaxModel,
  TaxPeriod, InsertTaxPeriod,
  ClientTax, InsertClientTax,
  TaxFile, InsertTaxFile,
  Task, InsertTask,
  Manual, InsertManual,
  ActivityLog, InsertActivityLog,
  AuditTrail, InsertAuditTrail
} from '../shared/schema';

// Validar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Please set it in your environment variables.');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Mappers: Convertir tipos de Prisma a tipos de Drizzle/shared
function mapPrismaUser(user: any): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password: user.password,
    role: user.role as 'ADMIN' | 'GESTOR' | 'LECTURA',
    createdAt: user.createdAt,
  };
}

function mapPrismaClient(client: any): Client {
  return {
    id: client.id,
    razonSocial: client.razonSocial,
    nifCif: client.nifCif,
    tipo: client.tipo.toLowerCase() as 'autonomo' | 'empresa',
    email: client.email,
    telefono: client.telefono,
    direccion: client.direccion,
    fechaAlta: client.fechaAlta,
    responsableAsignado: client.responsableAsignado,
  };
}

function mapPrismaTaxModel(model: any): TaxModel {
  return {
    id: model.id,
    nombre: model.nombre,
    descripcion: model.descripcion,
  };
}

function mapPrismaTaxPeriod(period: any): TaxPeriod {
  return {
    id: period.id,
    modeloId: period.modeloId,
    anio: period.anio,
    trimestre: period.trimestre,
    mes: period.mes,
    inicioPresentacion: period.inicioPresentacion,
    finPresentacion: period.finPresentacion,
  };
}

function mapPrismaClientTax(clientTax: any): ClientTax {
  return {
    id: clientTax.id,
    clientId: clientTax.clientId,
    taxPeriodId: clientTax.taxPeriodId,
    estado: clientTax.estado as 'PENDIENTE' | 'CALCULADO' | 'REALIZADO',
    notas: clientTax.notas,
    fechaCreacion: clientTax.fechaCreacion,
    fechaActualizacion: clientTax.fechaActualizacion,
  };
}

function mapPrismaTaxFile(file: any): TaxFile {
  return {
    id: file.id,
    clientTaxId: file.clientTaxId,
    nombreArchivo: file.nombreArchivo,
    ruta: file.s3Url, // Mantener compatibilidad (ruta = s3Url)
    tipo: file.tipo,
    fechaSubida: file.fechaSubida,
    subidoPor: file.subidoPor,
  };
}

function mapPrismaTask(task: any): Task {
  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion,
    clienteId: task.clienteId,
    asignadoA: task.asignadoA,
    prioridad: task.prioridad as 'BAJA' | 'MEDIA' | 'ALTA',
    estado: task.estado as 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA',
    visibilidad: task.visibilidad as 'GENERAL' | 'PERSONAL',
    fechaVencimiento: task.fechaVencimiento,
    fechaCreacion: task.fechaCreacion,
    fechaActualizacion: task.fechaActualizacion,
  };
}

function mapPrismaManual(manual: any): Manual {
  return {
    id: manual.id,
    titulo: manual.titulo,
    contenidoHtml: manual.contenidoHtml,
    autorId: manual.autorId,
    etiquetas: manual.etiquetas ? JSON.parse(manual.etiquetas) : null,
    categoria: manual.categoria,
    publicado: manual.publicado,
    fechaCreacion: manual.fechaCreacion,
    fechaActualizacion: manual.fechaActualizacion,
  };
}

function mapPrismaActivityLog(log: any): ActivityLog {
  return {
    id: log.id,
    usuarioId: log.usuarioId,
    accion: log.accion,
    modulo: log.modulo,
    detalles: log.detalles,
    fecha: log.fecha,
  };
}

function mapPrismaAuditTrail(audit: any): AuditTrail {
  return {
    id: audit.id,
    usuarioId: audit.usuarioId,
    accion: audit.accion as 'CREATE' | 'UPDATE' | 'DELETE',
    tabla: audit.tabla,
    registroId: audit.registroId,
    valorAnterior: audit.valorAnterior,
    valorNuevo: audit.valorNuevo,
    cambios: audit.cambios,
    fecha: audit.fecha,
  };
}

export class PrismaStorage implements IStorage {
  // ==================== USER METHODS ====================
  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(mapPrismaUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapPrismaUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? mapPrismaUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? mapPrismaUser(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        role: insertUser.role as any,
      },
    });
    return mapPrismaUser(user);
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updateData as any,
      });
      return mapPrismaUser(user);
    } catch {
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== CLIENT METHODS ====================
  async getAllClients(): Promise<Client[]> {
    const clients = await prisma.client.findMany();
    return clients.map(mapPrismaClient);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const client = await prisma.client.findUnique({ where: { id } });
    return client ? mapPrismaClient(client) : undefined;
  }

  async getClientByNif(nifCif: string): Promise<Client | undefined> {
    const client = await prisma.client.findUnique({ where: { nifCif } });
    return client ? mapPrismaClient(client) : undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const client = await prisma.client.create({
      data: {
        razonSocial: insertClient.razonSocial,
        nifCif: insertClient.nifCif,
        tipo: insertClient.tipo.toUpperCase() as any,
        email: insertClient.email,
        telefono: insertClient.telefono,
        direccion: insertClient.direccion,
        responsableAsignado: insertClient.responsableAsignado,
      },
    });
    return mapPrismaClient(client);
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      const data: any = { ...updateData };
      if (data.tipo) data.tipo = data.tipo.toUpperCase();
      
      const client = await prisma.client.update({
        where: { id },
        data,
      });
      return mapPrismaClient(client);
    } catch {
      return undefined;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      await prisma.client.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== TAX MODEL METHODS ====================
  async getTaxModel(id: string): Promise<TaxModel | undefined> {
    const model = await prisma.taxModel.findUnique({ where: { id } });
    return model ? mapPrismaTaxModel(model) : undefined;
  }

  async createTaxModel(insertModel: InsertTaxModel): Promise<TaxModel> {
    const model = await prisma.taxModel.create({
      data: {
        nombre: insertModel.nombre,
        descripcion: insertModel.descripcion,
      },
    });
    return mapPrismaTaxModel(model);
  }

  async getAllTaxModels(): Promise<TaxModel[]> {
    const models = await prisma.taxModel.findMany();
    return models.map(mapPrismaTaxModel);
  }

  // ==================== TAX PERIOD METHODS ====================
  async getTaxPeriod(id: string): Promise<TaxPeriod | undefined> {
    const period = await prisma.taxPeriod.findUnique({ where: { id } });
    return period ? mapPrismaTaxPeriod(period) : undefined;
  }

  async createTaxPeriod(insertPeriod: InsertTaxPeriod): Promise<TaxPeriod> {
    const period = await prisma.taxPeriod.create({
      data: {
        modeloId: insertPeriod.modeloId,
        anio: insertPeriod.anio,
        trimestre: insertPeriod.trimestre,
        mes: insertPeriod.mes,
        inicioPresentacion: insertPeriod.inicioPresentacion,
        finPresentacion: insertPeriod.finPresentacion,
      },
    });
    return mapPrismaTaxPeriod(period);
  }

  async getAllTaxPeriods(): Promise<TaxPeriod[]> {
    const periods = await prisma.taxPeriod.findMany();
    return periods.map(mapPrismaTaxPeriod);
  }

  // ==================== CLIENT TAX METHODS ====================
  async getClientTax(id: string): Promise<ClientTax | undefined> {
    const clientTax = await prisma.clientTax.findUnique({ where: { id } });
    return clientTax ? mapPrismaClientTax(clientTax) : undefined;
  }

  async createClientTax(insertClientTax: InsertClientTax): Promise<ClientTax> {
    const clientTax = await prisma.clientTax.create({
      data: {
        clientId: insertClientTax.clientId,
        taxPeriodId: insertClientTax.taxPeriodId,
        estado: insertClientTax.estado as any,
        notas: insertClientTax.notas,
      },
    });
    return mapPrismaClientTax(clientTax);
  }

  async updateClientTax(id: string, updateData: Partial<InsertClientTax>): Promise<ClientTax | undefined> {
    try {
      const clientTax = await prisma.clientTax.update({
        where: { id },
        data: updateData as any,
      });
      return mapPrismaClientTax(clientTax);
    } catch {
      return undefined;
    }
  }

  async deleteClientTax(id: string): Promise<boolean> {
    try {
      await prisma.clientTax.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async getAllClientTax(): Promise<ClientTax[]> {
    const clientTaxes = await prisma.clientTax.findMany();
    return clientTaxes.map(mapPrismaClientTax);
  }

  // ==================== TAX FILE METHODS ====================
  async getTaxFile(id: string): Promise<TaxFile | undefined> {
    const file = await prisma.taxFile.findUnique({ where: { id } });
    return file ? mapPrismaTaxFile(file) : undefined;
  }

  async createTaxFile(insertFile: InsertTaxFile): Promise<TaxFile> {
    const file = await prisma.taxFile.create({
      data: {
        clientTaxId: insertFile.clientTaxId,
        nombreArchivo: insertFile.nombreArchivo,
        s3Url: insertFile.ruta, // ruta -> s3Url
        s3Key: insertFile.ruta, // Temporal hasta migrar completamente
        tipo: insertFile.tipo,
        subidoPor: insertFile.subidoPor,
      },
    });
    return mapPrismaTaxFile(file);
  }

  async deleteTaxFile(id: string): Promise<boolean> {
    try {
      await prisma.taxFile.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async getTaxFilesByClientTax(clientTaxId: string): Promise<TaxFile[]> {
    const files = await prisma.taxFile.findMany({
      where: { clientTaxId },
    });
    return files.map(mapPrismaTaxFile);
  }

  // ==================== TASK METHODS ====================
  async getAllTasks(): Promise<Task[]> {
    const tasks = await prisma.task.findMany();
    return tasks.map(mapPrismaTask);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const task = await prisma.task.findUnique({ where: { id } });
    return task ? mapPrismaTask(task) : undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        titulo: insertTask.titulo,
        descripcion: insertTask.descripcion,
        clienteId: insertTask.clienteId,
        asignadoA: insertTask.asignadoA,
        prioridad: insertTask.prioridad as any,
        estado: insertTask.estado as any,
        visibilidad: insertTask.visibilidad as any,
        fechaVencimiento: insertTask.fechaVencimiento,
      },
    });
    return mapPrismaTask(task);
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      const task = await prisma.task.update({
        where: { id },
        data: updateData as any,
      });
      return mapPrismaTask(task);
    } catch {
      return undefined;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      await prisma.task.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== MANUAL METHODS ====================
  async getAllManuals(): Promise<Manual[]> {
    const manuals = await prisma.manual.findMany();
    return manuals.map(mapPrismaManual);
  }

  async getManual(id: string): Promise<Manual | undefined> {
    const manual = await prisma.manual.findUnique({ where: { id } });
    return manual ? mapPrismaManual(manual) : undefined;
  }

  async createManual(insertManual: InsertManual): Promise<Manual> {
    const manual = await prisma.manual.create({
      data: {
        titulo: insertManual.titulo,
        contenidoHtml: insertManual.contenidoHtml,
        autorId: insertManual.autorId,
        etiquetas: insertManual.etiquetas ? JSON.stringify(insertManual.etiquetas) : null,
        categoria: insertManual.categoria,
        publicado: insertManual.publicado ?? false,
      },
    });
    return mapPrismaManual(manual);
  }

  async updateManual(id: string, updateData: Partial<InsertManual>): Promise<Manual | undefined> {
    try {
      const data: any = { ...updateData };
      if (data.etiquetas) {
        data.etiquetas = JSON.stringify(data.etiquetas);
      }
      
      const manual = await prisma.manual.update({
        where: { id },
        data,
      });
      return mapPrismaManual(manual);
    } catch {
      return undefined;
    }
  }

  async deleteManual(id: string): Promise<boolean> {
    try {
      await prisma.manual.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== ACTIVITY LOG METHODS ====================
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const log = await prisma.activityLog.create({
      data: {
        usuarioId: insertLog.usuarioId,
        accion: insertLog.accion,
        modulo: insertLog.modulo,
        detalles: insertLog.detalles,
      },
    });
    return mapPrismaActivityLog(log);
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    const logs = await prisma.activityLog.findMany({
      orderBy: { fecha: 'desc' },
    });
    return logs.map(mapPrismaActivityLog);
  }

  // ==================== AUDIT TRAIL METHODS ====================
  async createAuditEntry(insertAudit: InsertAuditTrail): Promise<AuditTrail> {
    const audit = await prisma.auditTrail.create({
      data: {
        usuarioId: insertAudit.usuarioId,
        accion: insertAudit.accion as any,
        tabla: insertAudit.tabla,
        registroId: insertAudit.registroId,
        valorAnterior: insertAudit.valorAnterior,
        valorNuevo: insertAudit.valorNuevo,
        cambios: insertAudit.cambios,
      },
    });
    return mapPrismaAuditTrail(audit);
  }

  async getAllAuditEntries(): Promise<AuditTrail[]> {
    const audits = await prisma.auditTrail.findMany({
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  async getAuditEntriesByTable(tabla: string): Promise<AuditTrail[]> {
    const audits = await prisma.auditTrail.findMany({
      where: { tabla },
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  async getAuditEntriesByRecord(tabla: string, registroId: string): Promise<AuditTrail[]> {
    const audits = await prisma.auditTrail.findMany({
      where: { tabla, registroId },
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  async getAuditEntriesByUser(usuarioId: string): Promise<AuditTrail[]> {
    const audits = await prisma.auditTrail.findMany({
      where: { usuarioId },
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  // ==================== GLOBAL SEARCH ====================
  async globalSearch(query: string): Promise<{
    clientes: any[];
    tareas: any[];
    impuestos: any[];
    manuales: any[];
    total: number;
  }> {
    const searchTerm = query.toLowerCase();

    // Búsqueda en clientes
    const allClients = await this.getAllClients();
    const clientes = allClients.filter(c => 
      c.razonSocial.toLowerCase().includes(searchTerm) ||
      c.nifCif.toLowerCase().includes(searchTerm)
    ).slice(0, 10);

    // Búsqueda en tareas
    const allTasks = await this.getAllTasks();
    const tareas = allTasks.filter(t => 
      t.titulo.toLowerCase().includes(searchTerm) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(searchTerm))
    ).slice(0, 10);

    // Búsqueda en manuales
    const allManuals = await this.getAllManuals();
    const manuales = allManuals.filter(m => 
      m.titulo.toLowerCase().includes(searchTerm)
    ).slice(0, 10);

    const impuestos: any[] = [];
    const total = clientes.length + tareas.length + impuestos.length + manuales.length;

    return { clientes, tareas, impuestos, manuales, total };
  }
}

export const prismaStorage = new PrismaStorage();
