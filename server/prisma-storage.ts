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
  ManualAttachment, InsertManualAttachment,
  ManualVersion, InsertManualVersion,
  ActivityLog, InsertActivityLog,
  AuditTrail, InsertAuditTrail,
  SystemSettings, InsertSystemSettings
} from '../shared/schema';
import { encryptPassword, decryptPassword } from './crypto-utils';

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
    role: user.role || null,
    roleId: user.roleId || null,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt,
  };
}

function mapPrismaClient(client: any): any {
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
    taxModels: client.taxModels || null,
    isActive: client.isActive ?? true,
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
    displayText: clientTax.displayText,
    colorTag: clientTax.colorTag,
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
    publicado: manual.status === 'PUBLISHED', // Convertir status a publicado
    fechaCreacion: manual.fechaCreacion,
    fechaActualizacion: manual.fechaActualizacion,
  };
}

function mapPrismaManualAttachment(attachment: any): ManualAttachment {
  return {
    id: attachment.id,
    manualId: attachment.manualId,
    fileName: attachment.fileName,
    originalName: attachment.originalName,
    filePath: attachment.filePath,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    uploadedBy: attachment.uploadedBy,
    uploadedAt: attachment.uploadedAt,
  };
}

function mapPrismaManualVersion(version: any): ManualVersion {
  return {
    id: version.id,
    manualId: version.manualId,
    versionNumber: version.versionNumber,
    titulo: version.titulo,
    contenidoHtml: version.contenidoHtml,
    etiquetas: version.etiquetas ? JSON.parse(version.etiquetas) : null,
    categoria: version.categoria,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
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
    const users = await prisma.user.findMany({
      include: { role: true }
    });
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

  async getUserWithPermissions(id: string): Promise<any> {
    const user = await prisma.user.findUnique({ 
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        roleId: insertUser.roleId,
      },
    });
    return mapPrismaUser(user);
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updateData as any,
        include: { role: true }
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
    const clients = await prisma.client.findMany({
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    });
    return clients.map((client: any) => ({
      ...mapPrismaClient(client),
      employees: client.employees || []
    }));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const client = await prisma.client.findUnique({ 
      where: { id },
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    });
    return client ? {
      ...mapPrismaClient(client),
      employees: (client as any).employees || []
    } : undefined;
  }

  async getClientByNif(nifCif: string): Promise<Client | undefined> {
    const client = await prisma.client.findUnique({ where: { nifCif } });
    return client ? mapPrismaClient(client) : undefined;
  }

  async createClient(insertClient: any): Promise<any> {
    const client = await prisma.client.create({
      data: {
        razonSocial: insertClient.razonSocial,
        nifCif: insertClient.nifCif,
        tipo: insertClient.tipo.toUpperCase() as any,
        email: insertClient.email,
        telefono: insertClient.telefono,
        direccion: insertClient.direccion,
        responsableAsignado: insertClient.responsableAsignado || null, // Convertir string vacío a null
        taxModels: insertClient.taxModels || null,
        isActive: insertClient.isActive ?? true,
      },
    });
    return mapPrismaClient(client);
  }

  async updateClient(id: string, updateData: any): Promise<any> {
    try {
      const data: any = { ...updateData };
      if (data.tipo) data.tipo = data.tipo.toUpperCase();
      if (data.taxModels !== undefined) data.taxModels = data.taxModels;
      if (data.isActive !== undefined) data.isActive = data.isActive;
      if (data.responsableAsignado === "") data.responsableAsignado = null; // Convertir string vacío a null
      
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
        displayText: (insertClientTax as any).displayText,
        colorTag: (insertClientTax as any).colorTag,
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
        status: insertManual.publicado ? 'PUBLISHED' : 'DRAFT', // Convertir publicado a status
        fechaPublicacion: insertManual.publicado ? new Date() : null,
      },
    });
    return mapPrismaManual(manual);
  }

  async updateManual(id: string, updateData: Partial<InsertManual>): Promise<Manual | undefined> {
    try {
      const data: any = {};
      
      if (updateData.titulo !== undefined) data.titulo = updateData.titulo;
      if (updateData.contenidoHtml !== undefined) data.contenidoHtml = updateData.contenidoHtml;
      if (updateData.categoria !== undefined) data.categoria = updateData.categoria;
      
      if (updateData.etiquetas !== undefined) {
        data.etiquetas = updateData.etiquetas ? JSON.stringify(updateData.etiquetas) : null;
      }
      
      if (updateData.publicado !== undefined) {
        data.status = updateData.publicado ? 'PUBLISHED' : 'DRAFT';
        if (updateData.publicado) {
          data.fechaPublicacion = new Date();
        }
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

  // ==================== MANUAL ATTACHMENT METHODS ====================
  async getManualAttachment(id: string): Promise<ManualAttachment | undefined> {
    const attachment = await prisma.manualAttachment.findUnique({ where: { id } });
    return attachment ? mapPrismaManualAttachment(attachment) : undefined;
  }

  async createManualAttachment(insertAttachment: InsertManualAttachment): Promise<ManualAttachment> {
    const attachment = await prisma.manualAttachment.create({
      data: {
        manualId: insertAttachment.manualId,
        fileName: insertAttachment.fileName,
        originalName: insertAttachment.originalName,
        filePath: insertAttachment.filePath,
        fileType: insertAttachment.fileType,
        fileSize: insertAttachment.fileSize,
        uploadedBy: insertAttachment.uploadedBy,
      },
    });
    return mapPrismaManualAttachment(attachment);
  }

  async deleteManualAttachment(id: string): Promise<boolean> {
    try {
      await prisma.manualAttachment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async getManualAttachments(manualId: string): Promise<ManualAttachment[]> {
    const attachments = await prisma.manualAttachment.findMany({
      where: { manualId },
      orderBy: { uploadedAt: 'desc' },
    });
    return attachments.map(mapPrismaManualAttachment);
  }

  // ==================== MANUAL VERSION METHODS ====================
  async getManualVersion(id: string): Promise<ManualVersion | undefined> {
    const version = await prisma.manualVersion.findUnique({ where: { id } });
    return version ? mapPrismaManualVersion(version) : undefined;
  }

  async createManualVersion(insertVersion: InsertManualVersion): Promise<ManualVersion> {
    const version = await prisma.manualVersion.create({
      data: {
        manualId: insertVersion.manualId,
        versionNumber: insertVersion.versionNumber,
        titulo: insertVersion.titulo,
        contenidoHtml: insertVersion.contenidoHtml,
        etiquetas: insertVersion.etiquetas ? JSON.stringify(insertVersion.etiquetas) : null,
        categoria: insertVersion.categoria,
        createdBy: insertVersion.createdBy,
      },
    });
    return mapPrismaManualVersion(version);
  }

  async getManualVersions(manualId: string): Promise<ManualVersion[]> {
    const versions = await prisma.manualVersion.findMany({
      where: { manualId },
      orderBy: { versionNumber: 'desc' },
    });
    return versions.map(mapPrismaManualVersion);
  }

  async getNextVersionNumber(manualId: string): Promise<number> {
    const lastVersion = await prisma.manualVersion.findFirst({
      where: { manualId },
      orderBy: { versionNumber: 'desc' },
    });
    return lastVersion ? lastVersion.versionNumber + 1 : 1;
  }

  async restoreManualVersion(manualId: string, versionId: string): Promise<Manual | undefined> {
    const version = await prisma.manualVersion.findUnique({ where: { id: versionId } });
    if (!version) return undefined;

    const manual = await prisma.manual.update({
      where: { id: manualId },
      data: {
        titulo: version.titulo,
        contenidoHtml: version.contenidoHtml,
        etiquetas: version.etiquetas,
        categoria: version.categoria,
      },
    });
    return mapPrismaManual(manual);
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

  // ==================== ROLES & PERMISSIONS ====================
  async getAllRoles() {
    return await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRoleById(id: string) {
    return await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async createRole(data: { name: string; description?: string }) {
    return await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
      },
    });
  }

  async updateRole(id: string, data: { name?: string; description?: string }) {
    return await prisma.role.update({
      where: { id },
      data,
    });
  }

  async deleteRole(id: string) {
    // Verificar que no sea un rol del sistema
    const role = await prisma.role.findUnique({ where: { id } });
    if (role?.isSystem) {
      throw new Error('No se pueden eliminar roles del sistema');
    }
    
    return await prisma.role.delete({ where: { id } });
  }

  async getAllPermissions() {
    return await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Eliminar permisos antiguos
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Crear nuevos permisos
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return await this.getRoleById(roleId);
  }

  async getUserPermissions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user?.role) {
      return [];
    }

    return user.role.permissions.map(rp => rp.permission);
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.resource === resource && p.action === action);
  }

  // ==================== SYSTEM SETTINGS ====================
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return undefined;
    
    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt,
    };
  }

  async updateSystemSettings(data: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    // Obtener o crear settings
    let settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
      // Crear registro inicial
      settings = await prisma.systemSettings.create({
        data: {
          registrationEnabled: data.registrationEnabled ?? true,
        },
      });
    } else {
      // Actualizar existente
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data,
      });
    }

    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt,
    };
  }

  // ==================== SMTP ACCOUNTS ====================
  async getSMTPAccount(id: string) {
    const account = await prisma.sMTPAccount.findUnique({ where: { id } });
    if (!account) return null;
    
    // Desencriptar password
    return {
      ...account,
      password: decryptPassword(account.password),
    };
  }

  async getAllSMTPAccounts() {
    const accounts = await prisma.sMTPAccount.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });
    
    // Desencriptar passwords
    return accounts.map(account => ({
      ...account,
      password: decryptPassword(account.password),
    }));
  }

  async getDefaultSMTPAccount() {
    const account = await prisma.sMTPAccount.findFirst({
      where: { isPredeterminada: true, activa: true },
    });
    if (!account) return null;
    
    // Desencriptar password
    return {
      ...account,
      password: decryptPassword(account.password),
    };
  }

  async createSMTPAccount(account: any) {
    // Encriptar password antes de guardar
    const encryptedAccount = {
      ...account,
      password: encryptPassword(account.password),
    };

    // Usar transacción para evitar race condition
    const createdAccount = await prisma.$transaction(async (tx) => {
      // Si se marca como predeterminada, desmarcar las demás
      if (encryptedAccount.isPredeterminada) {
        await tx.sMTPAccount.updateMany({
          where: { isPredeterminada: true },
          data: { isPredeterminada: false },
        });
      }

      return await tx.sMTPAccount.create({ data: encryptedAccount });
    });

    // Desencriptar password para retornar
    return {
      ...createdAccount,
      password: decryptPassword(createdAccount.password),
    };
  }

  async updateSMTPAccount(id: string, account: any) {
    // Encriptar password si se incluye
    const updateData = { ...account };
    if (updateData.password) {
      updateData.password = encryptPassword(updateData.password);
    }

    // Usar transacción para evitar race condition
    const updatedAccount = await prisma.$transaction(async (tx) => {
      // Si se marca como predeterminada, desmarcar las demás
      if (updateData.isPredeterminada) {
        await tx.sMTPAccount.updateMany({
          where: { isPredeterminada: true, id: { not: id } },
          data: { isPredeterminada: false },
        });
      }

      return await tx.sMTPAccount.update({
        where: { id },
        data: updateData,
      });
    });

    // Desencriptar password para retornar
    return {
      ...updatedAccount,
      password: decryptPassword(updatedAccount.password),
    };
  }

  async deleteSMTPAccount(id: string) {
    await prisma.sMTPAccount.delete({ where: { id } });
    return true;
  }

  // ==================== NOTIFICATION TEMPLATES ====================
  async getNotificationTemplate(id: string) {
    return await prisma.notificationTemplate.findUnique({ where: { id } });
  }

  async getAllNotificationTemplates() {
    return await prisma.notificationTemplate.findMany({
      orderBy: { fechaCreacion: 'desc' },
      include: { creador: { select: { username: true } } },
    });
  }

  async createNotificationTemplate(template: any) {
    return await prisma.notificationTemplate.create({ data: template });
  }

  async updateNotificationTemplate(id: string, template: any) {
    return await prisma.notificationTemplate.update({
      where: { id },
      data: template,
    });
  }

  async deleteNotificationTemplate(id: string) {
    await prisma.notificationTemplate.delete({ where: { id } });
    return true;
  }

  // ==================== NOTIFICATION LOGS ====================
  async getNotificationLog(id: string) {
    return await prisma.notificationLog.findUnique({
      where: { id },
      include: {
        plantilla: true,
        smtpAccount: true,
        enviador: { select: { username: true } },
      },
    });
  }

  async getAllNotificationLogs() {
    return await prisma.notificationLog.findMany({
      orderBy: { fechaEnvio: 'desc' },
      include: {
        plantilla: { select: { nombre: true } },
        smtpAccount: { select: { nombre: true } },
        enviador: { select: { username: true } },
      },
    });
  }

  async createNotificationLog(log: any) {
    return await prisma.notificationLog.create({ data: log });
  }

  // ==================== SCHEDULED NOTIFICATIONS ====================
  async getScheduledNotification(id: string) {
    return await prisma.scheduledNotification.findUnique({
      where: { id },
      include: {
        plantilla: true,
        smtpAccount: true,
        creador: { select: { username: true } },
      },
    });
  }

  async getAllScheduledNotifications() {
    return await prisma.scheduledNotification.findMany({
      orderBy: { fechaProgramada: 'asc' },
      include: {
        plantilla: { select: { nombre: true } },
        smtpAccount: { select: { nombre: true } },
        creador: { select: { username: true } },
      },
    });
  }

  async getPendingScheduledNotifications() {
    return await prisma.scheduledNotification.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaProgramada: { lte: new Date() },
      },
      include: {
        plantilla: true,
        smtpAccount: true,
      },
    });
  }

  async createScheduledNotification(notification: any) {
    return await prisma.scheduledNotification.create({ data: notification });
  }

  async updateScheduledNotification(id: string, notification: any) {
    return await prisma.scheduledNotification.update({
      where: { id },
      data: notification,
    });
  }

  async deleteScheduledNotification(id: string) {
    await prisma.scheduledNotification.delete({ where: { id } });
    return true;
  }
}

export const prismaStorage = new PrismaStorage();
