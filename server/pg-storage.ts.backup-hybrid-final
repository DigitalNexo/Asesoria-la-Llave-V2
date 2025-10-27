// @ts-nocheck
/**
 * ⚠️ DEPRECATED - DO NOT USE ⚠️
 * 
 * Este archivo es un LEGACY ARTIFACT del sistema anterior con PostgreSQL/Drizzle.
 * El sistema ahora usa MariaDB con Prisma ORM (ver: server/prisma-storage.ts)
 * 
 * Migrado el 14 de octubre de 2025 a MariaDB externa (VPS 185.239.239.43:3306)
 * 
 * Para implementaciones nuevas, usar:
 * - Database: MariaDB (conexión en DATABASE_URL)
 * - ORM: Prisma (schema en prisma/schema.prisma)
 * - Storage: PrismaStorage (server/prisma-storage.ts)
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../shared/schema';
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
} from '../shared/schema';

// Validar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Please set it in your environment variables.');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

export class PostgresStorage implements IStorage {
  // User methods
  async getAllUsers(): Promise<User[]> {
    return db.select().from(schema.users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(schema.users).where(eq(schema.users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUserWithPermissions(id: string): Promise<any> {
    const user = await this.getUser(id);
    if (!user || !user.roleId) {
      return user;
    }

    // Obtener rol con permisos
    const [roleData] = await db
      .select({
        id: schema.roles.id,
        name: schema.roles.name,
        description: schema.roles.description,
        isSystem: schema.roles.isSystem,
      })
      .from(schema.roles)
      .where(eq(schema.roles.id, user.roleId))
      .limit(1);

    if (!roleData) {
      return user;
    }

    // Obtener permisos del rol
    const permissionsData = await db
      .select({
        permissionId: schema.permissions.id,
        resource: schema.permissions.resource,
        action: schema.permissions.action,
        description: schema.permissions.description,
      })
      .from(schema.rolePermissions)
      .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .where(eq(schema.rolePermissions.roleId, user.roleId));

    // Formatear permisos en la estructura esperada
    const role = {
      ...roleData,
      permissions: permissionsData.map(p => ({
        permission: {
          id: p.permissionId,
          resource: p.resource,
          action: p.action,
          description: p.description,
        }
      }))
    };

    return {
      ...user,
      role,
    };
  }

  // Client methods
  async getAllClients(): Promise<Client[]> {
    return db.select().from(schema.clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, id));
    return client;
  }

  async getClientByNif(nifCif: string): Promise<Client | undefined> {
    const [client] = await db.select().from(schema.clients).where(eq(schema.clients.nifCif, nifCif));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(schema.clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(schema.clients)
      .set(updateData)
      .where(eq(schema.clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(schema.clients).where(eq(schema.clients.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Tax Model methods
  async getTaxModel(id: string): Promise<TaxModel | undefined> {
    const [model] = await db.select().from(schema.taxModels).where(eq(schema.taxModels.id, id));
    return model;
  }

  async createTaxModel(insertModel: InsertTaxModel): Promise<TaxModel> {
    const [model] = await db.insert(schema.taxModels).values(insertModel).returning();
    return model;
  }

  async getAllTaxModels(): Promise<TaxModel[]> {
    return db.select().from(schema.taxModels);
  }

  // Tax Period methods
  async getTaxPeriod(id: string): Promise<TaxPeriod | undefined> {
    const [period] = await db.select().from(schema.taxPeriods).where(eq(schema.taxPeriods.id, id));
    return period;
  }

  async createTaxPeriod(insertPeriod: InsertTaxPeriod): Promise<TaxPeriod> {
    const [period] = await db.insert(schema.taxPeriods).values(insertPeriod).returning();
    return period;
  }

  async getAllTaxPeriods(): Promise<TaxPeriod[]> {
    return db.select().from(schema.taxPeriods);
  }

  // Client Tax methods
  async getClientTax(id: string): Promise<ClientTax | undefined> {
    const [clientTax] = await db.select().from(schema.clientTax).where(eq(schema.clientTax.id, id));
    return clientTax;
  }

  async createClientTax(insertClientTax: InsertClientTax): Promise<ClientTax> {
    const [clientTax] = await db.insert(schema.clientTax).values(insertClientTax).returning();
    return clientTax;
  }

  async updateClientTax(id: string, updateData: Partial<InsertClientTax>): Promise<ClientTax | undefined> {
    const now = new Date();
    const [clientTax] = await db.update(schema.clientTax)
      .set({ ...updateData, fechaActualizacion: now })
      .where(eq(schema.clientTax.id, id))
      .returning();
    return clientTax;
  }

  async deleteClientTax(id: string): Promise<boolean> {
    const result = await db.delete(schema.clientTax).where(eq(schema.clientTax.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllClientTax(): Promise<ClientTax[]> {
    return db.select().from(schema.clientTax);
  }

  // Tax File methods
  async getTaxFile(id: string): Promise<TaxFile | undefined> {
    const [file] = await db.select().from(schema.taxFiles).where(eq(schema.taxFiles.id, id));
    return file;
  }

  async createTaxFile(insertFile: InsertTaxFile): Promise<TaxFile> {
    const [file] = await db.insert(schema.taxFiles).values(insertFile).returning();
    return file;
  }

  async deleteTaxFile(id: string): Promise<boolean> {
    const result = await db.delete(schema.taxFiles).where(eq(schema.taxFiles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getTaxFilesByClientTax(clientTaxId: string): Promise<TaxFile[]> {
    return db.select().from(schema.taxFiles).where(eq(schema.taxFiles.clientTaxId, clientTaxId));
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return db.select().from(schema.tasks);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    return task;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(schema.tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const now = new Date();
    const [task] = await db.update(schema.tasks)
      .set({ ...updateData, fechaActualizacion: now })
      .where(eq(schema.tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Manual methods
  async getAllManuals(): Promise<Manual[]> {
    return db.select().from(schema.manuals);
  }

  async getManual(id: string): Promise<Manual | undefined> {
    const [manual] = await db.select().from(schema.manuals).where(eq(schema.manuals.id, id));
    return manual;
  }

  async createManual(insertManual: InsertManual): Promise<Manual> {
    const [manual] = await db.insert(schema.manuals).values(insertManual).returning();
    return manual;
  }

  async updateManual(id: string, updateData: Partial<InsertManual>): Promise<Manual | undefined> {
    const now = new Date();
    const [manual] = await db.update(schema.manuals)
      .set({ ...updateData, fechaActualizacion: now })
      .where(eq(schema.manuals.id, id))
      .returning();
    return manual;
  }

  async deleteManual(id: string): Promise<boolean> {
    const result = await db.delete(schema.manuals).where(eq(schema.manuals.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Activity Log methods
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(schema.activityLogs).values(insertLog).returning();
    return log;
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(schema.activityLogs).orderBy(desc(schema.activityLogs.fecha));
  }

  // Audit Trail methods
  async createAuditEntry(insertAudit: schema.InsertAuditTrail): Promise<schema.AuditTrail> {
    const [audit] = await db.insert(schema.auditTrail).values(insertAudit).returning();
    return audit;
  }

  async getAllAuditEntries(): Promise<schema.AuditTrail[]> {
    return db.select().from(schema.auditTrail).orderBy(desc(schema.auditTrail.fecha));
  }

  async getAuditEntriesByTable(tabla: string): Promise<schema.AuditTrail[]> {
    return db.select().from(schema.auditTrail)
      .where(eq(schema.auditTrail.tabla, tabla))
      .orderBy(desc(schema.auditTrail.fecha));
  }

  async getAuditEntriesByRecord(tabla: string, registroId: string): Promise<schema.AuditTrail[]> {
    return db.select().from(schema.auditTrail)
      .where(and(
        eq(schema.auditTrail.tabla, tabla),
        eq(schema.auditTrail.registroId, registroId)
      ))
      .orderBy(desc(schema.auditTrail.fecha));
  }

  async getAuditEntriesByUser(usuarioId: string): Promise<schema.AuditTrail[]> {
    return db.select().from(schema.auditTrail)
      .where(eq(schema.auditTrail.usuarioId, usuarioId))
      .orderBy(desc(schema.auditTrail.fecha));
  }

  // Global Search using PostgreSQL full-text search
  async globalSearch(query: string): Promise<{
    clientes: any[];
    tareas: any[];
    impuestos: any[];
    manuales: any[];
    total: number;
  }> {
    const searchTerm = `%${query.toLowerCase()}%`;

    console.log('Starting globalSearch for:', query);

    // Simplificar búsqueda - por ahora solo retornar resultados de clientes y tareas manualmente
    const allClients = await this.getAllClients();
    const clientes = allClients.filter(c => 
      c.razonSocial.toLowerCase().includes(query.toLowerCase()) ||
      c.nifCif.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    const allTasks = await this.getAllTasks();
    const tareas = allTasks.filter(t => 
      t.titulo.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    const allManuals = await this.getAllManuals();
    const manuales = allManuals.filter(m => 
      m.titulo.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    const impuestos: any[] = [];

    const total = clientes.length + tareas.length + impuestos.length + manuales.length;

    return { clientes, tareas, impuestos, manuales, total };
  }
}

export const pgStorage = new PostgresStorage();
