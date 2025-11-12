import { 
  PrismaClient, 
  Prisma
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type { IStorage } from './storage';
import type {
  User, InsertUser,
  Client, InsertClient,
  Task, InsertTask,
  Manual, InsertManual,
  ManualAttachment, InsertManualAttachment,
  ManualVersion, InsertManualVersion,
  ActivityLog, InsertActivityLog,
  AuditTrail, InsertAuditTrail,
  SystemSettings, InsertSystemSettings,
  ClientTax,
  TaxPeriod,
  TaxModel
} from '../shared/schema';
import { encryptPassword, decryptPassword } from './crypto-utils';
import {
  TAX_RULES,
  TAX_MODEL_METADATA,
  TAX_CONTROL_MODEL_ORDER,
  TAX_STATUS_DISPLAY,
  NORMALIZED_TAX_STATUSES,
  type ClientType,
  type TaxPeriodicity,
} from '@shared/tax-rules';
import { calculateDerivedFields } from './services/tax-calendar-service';

// Tipos para compatibilidad con código existente
type FilingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PRESENTED';
type PeriodStatus = 'OPEN' | 'CLOSED';
type TaxPeriodType = 'QUARTERLY' | 'MONTHLY' | 'ANNUAL' | 'SPECIAL';

// Constantes para los valores de enum
const FilingStatus = {
  NOT_STARTED: 'NOT_STARTED' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  PRESENTED: 'PRESENTED' as const,
};

const TaxPeriodType = {
  QUARTERLY: 'QUARTERLY' as const,
  MONTHLY: 'MONTHLY' as const,
  ANNUAL: 'ANNUAL' as const,
  SPECIAL: 'SPECIAL' as const,
};

const PeriodStatus = {
  OPEN: 'OPEN' as const,
  CLOSED: 'CLOSED' as const,
};

// Validar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Please set it in your environment variables.');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Mappers: Convertir tipos de Prisma a tipos de Drizzle/shared
function mapPrismaUser(users: any): User {
  return {
    id: users.id,
    username: users.username,
    email: users.email,
    password: users.password,
    role: users.role || null,
    roleId: users.roleId || null,
    isActive: users.isActive ?? true,
    createdAt: users.createdAt,
  };
}

function mapJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => `${item}`);
      }
    } catch (e) {
      // Si no es JSON válido, devolver array vacío
    }
  }
  return [];
}

function mapPrismaTaxModelsConfig(config: any) {
  return {
    code: config.code,
    name: config.name,
    allowedTypes: mapJsonArray(config.allowedTypes),
    allowedPeriods: mapJsonArray(config.allowedPeriods),
    labels: config.labels ? mapJsonArray(config.labels) : null,
    isActive: config.isActive ?? true,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

function mapPrismaClientTaxAssignment(assignment: any) {
  const taxModelConfig =
    assignment.taxModel ||
    assignment.tax_models_config ||
    null;

  return {
    id: assignment.id,
    clientId: assignment.clientId,
    taxModelCode: assignment.taxModelCode,
    periodicity: assignment.periodicidad,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    activeFlag: assignment.activeFlag,
    notes: assignment.notes,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    effectiveActive: !assignment.endDate && Boolean(assignment.activeFlag),
    // Backwards-compatible: older code expects `tax_models`, newer frontend expects `taxModel` (camelCase)
    tax_models: taxModelConfig ? mapPrismaTaxModelsConfig(taxModelConfig) : null,
    taxModel: taxModelConfig ? mapPrismaTaxModelsConfig(taxModelConfig) : null,
  };
}

function getTaxModelName(code: string): string {
  return TAX_MODEL_METADATA[code]?.name ?? `Modelo ${code}`;
}

const TAX_CONTROL_MODELS = [...TAX_CONTROL_MODEL_ORDER] as readonly string[];

const STATUS_PRIORITY: Record<string, number> = {
  PRESENTADO: 6,
  PRESENTED: 6,
  CALCULADO: 5,
  CALCULATED: 5,
  IN_PROGRESS: 4,
  COMPLETED: 4,
  PENDIENTE: 2,
  PENDING: 2,
  NOT_STARTED: 1,
};

export interface TaxControlCellSummary {
  assignmentId?: string;
  active: boolean;
  periodicity?: TaxPeriodicity | null;
  startDate?: Date | null;
  endDate?: Date | null;
  activeFlag?: boolean | null;
  status?: string | null;
  statusUpdatedAt?: Date | null;
  filingId?: string | null;
  periodId?: string | null;
  periodLabel?: string | null;
}

export interface TaxControlRowSummary {
  clientId: string;
  clientName: string;
  nifCif: string;
  clientType: string;
  gestorId: string | null;
  gestorName: string | null;
  gestorEmail: string | null;
  cells: Record<string, TaxControlCellSummary>;
}

export interface TaxControlMatrixResult {
  rows: TaxControlRowSummary[];
  models: readonly string[];
  metadata: {
    year: number | null;
    quarter: number | null;
    totalClients: number;
    filters: {
      type?: string | null;
      gestorId?: string | null;
      search?: string | null;
    };
  };
}

export interface TaxControlMatrixParams {
  year?: number | string | null;
  quarter?: number | string | null;
  search?: string | null;
  type?: string | null;
  gestorId?: string | null;
  model?: string | null;
  periodicity?: string | null;
}

function normalizeStatus(rawStatus: string | null | undefined, isActive: boolean): string | null {
  if (!rawStatus) {
    return isActive ? "PENDIENTE" : null;
  }
  const upper = rawStatus.toUpperCase();
  if (upper === "NOT_STARTED") return "PENDIENTE";
  if (upper === "IN_PROGRESS") return "CALCULADO";
  if (upper === "PRESENTED") return "PRESENTADO";
  if (upper === "CALCULATED") return "CALCULADO";
  if (upper === "PENDING" || upper === "NOT_STARTED") return "PENDIENTE";
  if (NORMALIZED_TAX_STATUSES.includes(upper as any)) return upper;
  return upper;
}

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatPeriodLabel(tax_periods: any): string | null {
  if (!tax_periods) return null;
  const year = tax_periods.year ?? "";
  const rawLabel = (tax_periods.label ?? "").toString();

  // Monthly-like periods:
  // - explicit MONTHLY kind
  // - labels of the form M01..M12
  // - SPECIAL labeled as "MES-..." (these represent monthly periods but label may contain presentation month)
  if (
    tax_periods.kind === TaxPeriodType.MONTHLY ||
    /^M\d{2}$/i.test(rawLabel) ||
    (tax_periods.kind === TaxPeriodType.SPECIAL && rawLabel.toUpperCase().startsWith('MES-'))
  ) {
    let monthIndex: number | null = null;

    // Prefer explicit Mxx codes in the label (M10 -> month 10)
    if (/^M\d{2}$/i.test(rawLabel)) {
      monthIndex = parseInt(rawLabel.slice(1), 10) - 1;
    }

    // If we have a SPECIAL "MES-" label or no explicit Mxx, derive month from starts_at
    if (monthIndex === null && tax_periods.starts_at) {
      try {
        monthIndex = new Date(tax_periods.starts_at).getMonth();
      } catch (e) {
        monthIndex = null;
      }
    }

    let display: string;
    if (monthIndex !== null && MONTH_LABELS[monthIndex]) {
      display = MONTH_LABELS[monthIndex];
    } else {
      // Fallback: strip the MES- prefix for readability
      display = rawLabel.replace(/^MES[-_]?/i, '').trim();
    }

    return `${display} ${year}`.trim();
  }

  if (tax_periods.quarter != null) {
    return `${tax_periods.quarter}T/${year}`;
  }
  if (tax_periods.label) {
    return `${tax_periods.label} ${year}`.trim();
  }
  return `${year}`;
}

export interface FiscalPeriodSummary {
  id: string;
  year: number;
  quarter: number | null;
  label: string;
  kind: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  lockedAt: Date | null;
  totals: {
    total: number;
    notStarted: number;
    inProgress: number;
    presented: number;
  };
}

export interface TaxFilingsFilters {
  periodId?: string;
  status?: string;
  model?: string;
  search?: string;
  clientId?: string;
  gestorId?: string;
  year?: number | string;
  includeClosedPeriods?: boolean; // Por defecto false, solo muestra periodos OPEN
}

export interface TaxFilingRecord {
  id: string;
  clientId: string;
  clientName: string;
  nifCif: string;
  gestorId: string | null;
  gestorName: string | null;
  taxModelCode: string;
  periodId: string;
  periodLabel: string | null;
  periodKind: string | null;
  periodStatus: string | null;
  calendarStatus: string | null; // Estado del tax_calendar para este modelo y periodo
  status: string;
  notes: string | null;
  presentedAt: Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

function mapPrismaClient(client: any): any {
  const taxAssignmentsSource =
    client.client_tax_assignments || client.taxAssignments || [];
  const employeesSource =
    client.client_employees || client.employees || [];

  return {
    id: client.id,
    razonSocial: client.razonSocial,
    nifCif: client.nifCif,
    tipo: (client.tipo || '').toUpperCase(),
    email: client.email ?? null,
    telefono: client.telefono ?? null,
    direccion: client.direccion ?? null,
    fechaAlta: client.fechaAlta,
    fechaBaja: client.fechaBaja ?? null,
    responsableAsignado: client.responsableAsignado ?? null,
    taxModels: client.taxModels ?? client.tax_models ?? null,
    isActive: client.isActive ?? true,
    notes: client.notes ?? null,
    taxAssignments: Array.isArray(taxAssignmentsSource)
      ? taxAssignmentsSource.map(mapPrismaClientTaxAssignment)
      : [],
    employees: Array.isArray(employeesSource)
      ? employeesSource.map(mapPrismaClientEmployee)
      : [],
  };
}

function mapPrismaClientTax(record: any): ClientTax {
  return {
    id: record.id,
    clientId: record.client_id,
    taxPeriodId: record.tax_period_id,
    estado: record.estado,
    notas: record.notas,
    displayText: record.display_text,
    colorTag: record.color_tag,
    fechaCreacion: record.fecha_creacion,
    fechaActualizacion: record.fecha_actualizacion,
  };
}

function mapPrismaClientEmployee(employee: any) {
  const user = employee.users || employee.user || null;
  return {
    userId: employee.userId ?? employee.user_id ?? null,
    isPrimary: employee.is_primary ?? employee.isPrimary ?? false,
    assignedAt: employee.assigned_at ?? null,
    user: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
        }
      : null,
  };
}

function mapPrismaTask(task: any): Task {
  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion,
    clienteId: task.cliente_id,
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
    contenidoHtml: manual.contenido_html,
    autorId: manual.autor_id,
    etiquetas: manual.etiquetas ? JSON.parse(manual.etiquetas) : [],
    categoria: manual.categoria,
    publicado: manual.status === 'PUBLISHED',
    fechaCreacion: manual.fecha_creacion,
    fechaActualizacion: manual.fecha_actualizacion,
  };
}

function mapPrismaManualAttachment(attachment: any): ManualAttachment {
  return {
    id: attachment.id,
    manualId: attachment.manualId,
    fileName: attachment.fileName,
    originalName: attachment.original_name,
    filePath: attachment.filePath,
    fileType: attachment.file_type,
    fileSize: attachment.fileSize,
    uploadedBy: attachment.uploaded_by,
    uploadedAt: attachment.uploaded_at,
  };
}

function mapPrismaManualVersion(version: any): ManualVersion {
  return {
    id: version.id,
    manualId: version.manualId,
    versionNumber: version.versionNumber,
    titulo: version.titulo,
    contenidoHtml: version.contenido_html,
    etiquetas: version.etiquetas ? JSON.parse(version.etiquetas) : [],
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
    const users = await prisma.users.findMany({
      include: { 
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            is_system: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
    return users.map(mapPrismaUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await prisma.users.findUnique({ where: { id } });
    return user ? mapPrismaUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await prisma.users.findUnique({ where: { username } });
    return user ? mapPrismaUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.users.findUnique({ where: { email } });
    return user ? mapPrismaUser(user) : undefined;
  }

  async getUserWithPermissions(id: string): Promise<any> {
    const user = await prisma.users.findUnique({ 
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        is_owner: true,
        createdAt: true,
        roleId: true,
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            is_system: true,
            createdAt: true,
            updatedAt: true,
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
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
      const user = await prisma.users.update({
        where: { id },
        data: updateData as any,
        include: { 
          roles: {
            select: {
              id: true,
              name: true,
              description: true,
              is_system: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });
      return mapPrismaUser(user);
    } catch {
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Defensive check: do not allow deleting the Owner user from storage layer
      const existing = await prisma.users.findUnique({ where: { id }, select: { is_owner: true, username: true } });
      if (!existing) return false;
      if (existing.is_owner) {
        const err: any = new Error(`No se puede eliminar al usuario Owner (${existing.username}).`);
        err.code = 'CANNOT_DELETE_OWNER';
        throw err;
      }

      await prisma.users.delete({ where: { id } });
      return true;
    } catch (error) {
      // If we threw the CANNOT_DELETE_OWNER, rethrow to let upper layers handle it
      if ((error as any)?.code === 'CANNOT_DELETE_OWNER') throw error;
      return false;
    }
  }

  // ==================== CLIENT METHODS ====================
  async getAllClients(): Promise<Client[]> {
    const clients = await prisma.clients.findMany({
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_assignments: {
          include: {
            tax_models_config: true,
          }
        },
      }
    });
    return clients.map(mapPrismaClient);
  }

  async getAllClientsSummary(): Promise<Array<{
    id: string;
    razonSocial: string;
    nifCif: string;
    tipo: string;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
    fechaAlta: Date;
    fechaBaja: Date | null;
    responsableAsignado: string | null;
    isActive: boolean;
  }>> {
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        razonSocial: true,
        nifCif: true,
        tipo: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaAlta: true,
        fechaBaja: true,
        responsableAsignado: true,
        isActive: true,
      },
      orderBy: { razonSocial: 'asc' },
    });
    return clients.map((c) => ({
      id: c.id,
      razonSocial: c.razonSocial,
      nifCif: c.nifCif,
      tipo: (c.tipo || '').toUpperCase(),
      email: c.email ?? null,
      telefono: c.telefono ?? null,
      direccion: c.direccion ?? null,
      fechaAlta: c.fechaAlta,
      fechaBaja: c.fechaBaja ?? null,
      responsableAsignado: c.responsableAsignado ?? null,
      isActive: c.isActive ?? true,
    }));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const client = await prisma.clients.findUnique({ 
      where: { id },
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_assignments: {
          include: {
            tax_models_config: true,
          }
        },
      }
    });
    return client ? mapPrismaClient(client) : undefined;
  }

  async getClientByNif(nifCif: string): Promise<Client | undefined> {
    const client = await prisma.clients.findUnique({
      where: { nifCif },
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        client_tax_assignments: {
          include: {
            tax_models_config: true,
          },
        },
      },
    });
    return client ? mapPrismaClient(client) : undefined;
  }

  async createClient(insertClient: any): Promise<any> {
    const data: any = {
      id: randomUUID(),
      razonSocial: insertClient.razonSocial,
      nifCif: insertClient.nifCif,
      tipo: (insertClient.tipo || '').toUpperCase() as any,
      email: insertClient.email ?? null,
      telefono: insertClient.telefono ?? null,
      direccion: insertClient.direccion ?? null,
      responsableAsignado: insertClient.responsableAsignado || null,
      tax_models: insertClient.taxModels || null,
      isActive: insertClient.isActive ?? true,
      notes: insertClient.notes ?? null,
    };

    if (insertClient.fechaAlta) {
      data.fechaAlta = new Date(insertClient.fechaAlta);
    }

    if (insertClient.fechaBaja !== undefined) {
      data.fechaBaja = insertClient.fechaBaja ? new Date(insertClient.fechaBaja) : null;
    }

    const client = await prisma.clients.create({
      data,
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        client_tax_assignments: {
          include: {
            tax_models_config: true,
          },
        },
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
      if (data.fechaAlta) data.fechaAlta = new Date(data.fechaAlta);
      if (data.fechaBaja !== undefined) {
        data.fechaBaja = data.fechaBaja ? new Date(data.fechaBaja) : null;
      }
      if (data.notes === "") data.notes = null;
      
      const client = await prisma.clients.update({
        where: { id },
        data,
        include: {
          client_employees: {
            include: {
              users: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          client_tax_assignments: {
            include: {
              tax_models_config: true,
            },
          },
        },
      });
      return mapPrismaClient(client);
    } catch {
      return undefined;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      await prisma.clients.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async ensureTaxModelsConfigSeeded(): Promise<void> {
    const codes = Object.keys(TAX_RULES);
    try {
      await Promise.all(
        codes.map(async (code) => {
          const rule = TAX_RULES[code];
          await prisma.tax_models_config.upsert({
            where: { code },
            create: {
              code,
              name: getTaxModelName(code),
              allowedTypes: JSON.stringify(rule.allowedTypes),
              allowedPeriods: JSON.stringify(rule.allowedPeriods),
              labels: rule.labels ? JSON.stringify(rule.labels) : undefined,
              isActive: true,
              updatedAt: new Date(),
            },
            update: {
              name: getTaxModelName(code),
              allowedTypes: JSON.stringify(rule.allowedTypes),
              allowedPeriods: JSON.stringify(rule.allowedPeriods),
              labels: rule.labels ? JSON.stringify(rule.labels) : undefined,
              isActive: true,
              updatedAt: new Date(),
            },
          });
        }),
      );
    } catch (error: any) {
      if (error?.code === "P2021") {
        throw new Error(
          "La tabla tax_models_config no existe. Ejecuta `npx prisma db push` o `npm run prisma:push` para aplicar el esquema antes de iniciar el servidor."
        );
      }
      throw error;
    }
  }

  async getActiveTaxModelsConfig() {
    const configs = await prisma.tax_models_config.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return configs.map(mapPrismaTaxModelsConfig);
  }

  async getTaxModelConfig(code: string) {
    const config = await prisma.tax_models_config.findUnique({
      where: { code },
    });
    return config ? mapPrismaTaxModelsConfig(config) : null;
  }

  // ==================== TAX MODELS MANAGEMENT ====================
  async getAllTaxModels() {
    const models = await prisma.tax_models_config.findMany({
      orderBy: { code: 'asc' },
    });
    return models.map(mapPrismaTaxModelsConfig);
  }

  async getTaxModelByCode(code: string) {
    const model = await prisma.tax_models_config.findUnique({
      where: { code },
    });
    return model ? mapPrismaTaxModelsConfig(model) : null;
  }

  async createTaxModel(data: {
    code: string;
    name: string;
    allowedTypes: string[];
    allowedPeriods: string[];
  }) {
    const model = await prisma.tax_models_config.create({
      data: {
        code: data.code,
        name: data.name,
        allowedTypes: JSON.stringify(data.allowedTypes),
        allowedPeriods: JSON.stringify(data.allowedPeriods),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return mapPrismaTaxModelsConfig(model);
  }

  async updateTaxModel(
    code: string,
    data: {
      name?: string;
      allowedTypes?: string[];
      allowedPeriods?: string[];
      isActive?: boolean;
    }
  ) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.allowedTypes !== undefined) updateData.allowedTypes = JSON.stringify(data.allowedTypes);
    if (data.allowedPeriods !== undefined) updateData.allowedPeriods = JSON.stringify(data.allowedPeriods);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const model = await prisma.tax_models_config.update({
      where: { code },
      data: updateData,
    });
    return mapPrismaTaxModelsConfig(model);
  }

  async deleteTaxModel(code: string) {
    await prisma.tax_models_config.delete({
      where: { code },
    });
  }

  async getAssignmentsByTaxModel(taxModelCode: string) {
    const assignments = await prisma.client_tax_assignments.findMany({
      where: {
        taxModelCode,
        activeFlag: true,
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
          },
        },
      },
    });
    return assignments;
  }

  async findClientTaxAssignmentByCode(clientId: string, taxModelCode: string) {
    const assignment = await prisma.client_tax_assignments.findFirst({
      where: {
        clientId,
        taxModelCode,
      },
      include: {
        tax_models_config: true,
      },
    });
    return assignment ? mapPrismaClientTaxAssignment(assignment) : null;
  }

  async getClientTaxAssignments(clientId: string) {
    const assignments = await prisma.client_tax_assignments.findMany({
      where: { clientId },
      orderBy: [{ startDate: 'desc' }, { taxModelCode: 'asc' }],
      include: {
        tax_models_config: true,
      },
    });
    return assignments.map(mapPrismaClientTaxAssignment);
  }

  async getClientTaxAssignment(id: string) {
    const assignment = await prisma.client_tax_assignments.findUnique({
      where: { id },
      include: {
        tax_models_config: true,
      },
    });
    return assignment ? mapPrismaClientTaxAssignment(assignment) : null;
  }

  private buildTaxAssignmentUpdateData(data: Partial<{
    taxModelCode: string;
    periodicity: TaxPeriodicity;
    startDate: Date;
    endDate: Date | null;
    activeFlag: boolean;
    notes: string | null;
  }>) {
    const payload: any = {};
    if (data.taxModelCode !== undefined) payload.taxModelCode = data.taxModelCode;
    if (data.periodicity !== undefined) payload.periodicidad = data.periodicity;
    if (data.startDate !== undefined) payload.startDate = data.startDate;
    if (data.endDate !== undefined) payload.endDate = data.endDate;
    if (data.activeFlag !== undefined) payload.activeFlag = data.activeFlag;
    if (data.notes !== undefined) payload.notes = data.notes;
    return payload;
  }

  async createClientTaxAssignment(clientId: string, data: {
    taxModelCode: string;
    periodicity: TaxPeriodicity;
    startDate: Date;
    endDate?: Date | null;
    activeFlag?: boolean;
    notes?: string | null;
  }) {
    const assignment = await prisma.client_tax_assignments.create({
      data: {
        id: randomUUID(),
        clientId,
        taxModelCode: data.taxModelCode,
        periodicidad: data.periodicity,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        activeFlag: data.activeFlag ?? true,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      },
      include: {
        tax_models_config: true,
      },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async updateClientTaxAssignment(id: string, data: {
    taxModelCode?: string;
    periodicity?: TaxPeriodicity;
    startDate?: Date;
    endDate?: Date | null;
    activeFlag?: boolean;
    notes?: string | null;
  }) {
    const assignment = await prisma.client_tax_assignments.update({
      where: { id },
      data: this.buildTaxAssignmentUpdateData(data),
      include: {
        tax_models_config: true,
      },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async deleteClientTaxAssignment(id: string) {
    const assignment = await prisma.client_tax_assignments.delete({
      where: { id },
      include: {
        tax_models_config: true,
      },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async softDeactivateClientTaxAssignment(id: string, endDate: Date) {
    const assignment = await prisma.client_tax_assignments.update({
      where: { id },
      data: {
        endDate,
        activeFlag: false,
      },
      include: {
        tax_models_config: true,
      },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async hasAssignmentHistoricFilings(clientId: string, taxModelCode: string) {
    const count = await prisma.client_tax_filings.count({
      where: {
        clientId,
        taxModelCode,
      },
    });
    return count > 0;
  }

  async bulkRemoveClientTaxAssignments(clientId: string, options?: { codes?: string[]; hard?: boolean }) {
  const codesFilter = (options?.codes || []).map((c: any) => String(c).toUpperCase());
    const whereAssignments: any = {
      clientId,
      ...(codesFilter.length > 0 ? { taxModelCode: { in: codesFilter } } : {}),
    } as any;

    const assignments = await prisma.client_tax_assignments.findMany({
      where: whereAssignments,
      select: { id: true, taxModelCode: true },
    });

    if (assignments.length === 0) return { deleted: 0, deactivated: 0 };

  const codes = Array.from(new Set(assignments.map((a: any) => String(a.taxModelCode))));
    const filings = (await prisma.client_tax_filings.findMany({
      where: { clientId, taxModelCode: { in: codes } },
      select: { taxModelCode: true },
    })) as any[];
    const codesWithHistory = new Set<string>(filings.map((f: any) => String(f.taxModelCode)));
    const toDeactivate = options?.hard ? [] : codes.filter((c) => codesWithHistory.has(c));
    const toDelete = options?.hard ? codes : codes.filter((c) => !codesWithHistory.has(c));

    let deactivated = 0;
    let deleted = 0;

    await prisma.$transaction(async (tx) => {
      if (toDeactivate.length > 0) {
        const res = await tx.client_tax_assignments.updateMany({
          where: { clientId, taxModelCode: { in: toDeactivate } },
          data: { endDate: new Date(), activeFlag: false },
        });
        deactivated += res.count;
      }
      if (toDelete.length > 0) {
        if (options?.hard) {
          await tx.client_tax_filings.deleteMany({ where: { clientId, taxModelCode: { in: toDelete } } });
        }
        const res = await tx.client_tax_assignments.deleteMany({
          where: { clientId, taxModelCode: { in: toDelete } },
        });
        deleted += res.count;
      }
    });

    return { deleted, deactivated };
  }

  async bulkRemoveAssignmentsByIds(clientId: string, assignmentIds: string[], options?: { hard?: boolean }) {
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return { deleted: 0, deactivated: 0 };
    }

    const assignments = await prisma.client_tax_assignments.findMany({
      where: { id: { in: assignmentIds }, clientId },
      select: { id: true, taxModelCode: true },
    });

    if (assignments.length === 0) return { deleted: 0, deactivated: 0 };

    let deleted = 0;
    let deactivated = 0;

    await prisma.$transaction(async (tx) => {
      if (options?.hard) {
        // Borrar todas las declaraciones de los códigos implicados primero
  const codeSet = new Set(assignments.map((a: any) => String(a.taxModelCode)));
        await tx.client_tax_filings.deleteMany({ where: { clientId, taxModelCode: { in: Array.from(codeSet) } } });
      }
      for (const a of assignments) {
        const hasHistory = options?.hard ? 0 : await tx.client_tax_filings.count({
          where: { clientId, taxModelCode: a.taxModelCode },
        });
        if (hasHistory > 0) {
          const res = await tx.client_tax_assignments.update({
            where: { id: a.id },
            data: { endDate: new Date(), activeFlag: false },
          });
          if (res) deactivated += 1;
        } else {
          const res = await tx.client_tax_assignments.delete({ where: { id: a.id } });
          if (res) deleted += 1;
        }
      }
    });

    return { deleted, deactivated };
  }

  async getTaxAssignmentHistory(assignmentId: string) {
    const assignment = await prisma.client_tax_assignments.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      return [];
    }

    const filings = await prisma.client_tax_filings.findMany({
      where: {
        clientId: assignment.clientId,
        taxModelCode: assignment.taxModelCode,
      },
      include: {
        fiscal_periods: true,
      },
      orderBy: [
        { presentedAt: 'desc' },
      ],
    });

    return filings.map((filing) => ({
      id: filing.id,
      status: normalizeStatus(filing.status, true),
      rawStatus: filing.status,
      presentedAt: filing.presentedAt,
      notes: filing.notes,
      tax_periods: filing.fiscal_periods
        ? {
            id: filing.fiscal_periods.id,
            year: filing.fiscal_periods.year,
            quarter: filing.fiscal_periods.quarter,
            label: filing.fiscal_periods.label,
            startsAt: filing.fiscal_periods.starts_at,
            endsAt: filing.fiscal_periods.ends_at,
          }
        : null,
    }));
  }

  async getAllClientTax(): Promise<ClientTax[]> {
    const records = await prisma.client_tax.findMany();
    return records.map(mapPrismaClientTax);
  }

  async getTaxPeriod(id: string): Promise<TaxPeriod | undefined> {
    const period = await prisma.tax_periods.findUnique({ where: { id } });
    if (!period) return undefined;
    return {
      id: period.id,
      modeloId: period.modelo_id,
      anio: period.anio,
      trimestre: period.trimestre,
      mes: period.mes,
      inicioPresentacion: period.inicio_presentacion,
      finPresentacion: period.fin_presentacion,
    };
  }

  async getTaxModel(id: string): Promise<TaxModel | undefined> {
    const model = await prisma.tax_models.findUnique({ where: { id } });
    if (!model) return undefined;
    return {
      id: model.id,
      nombre: model.nombre,
      descripcion: model.descripcion,
    };
  }

  private async getTaxModelConfigMap(client: PrismaClient | Prisma.TransactionClient) {
    const configs = await client.tax_models_config.findMany({ where: { isActive: true } });
    const map = new Map<string, ReturnType<typeof mapPrismaTaxModelsConfig>>();
    configs.forEach((config) => {
      map.set(config.code, mapPrismaTaxModelsConfig(config));
    });
    return map;
  }

  private periodDescriptorsForYear(year: number) {
    const descriptors: Array<{
      label: string;
      quarter?: number;
      kind: TaxPeriodType;
      startsAt: Date;
      endsAt: Date;
    }> = [];

    for (let month = 0; month < 12; month++) {
      descriptors.push({
        label: `M${String(month + 1).padStart(2, '0')}`,
        kind: TaxPeriodType.MONTHLY,
        startsAt: new Date(Date.UTC(year, month, 1)),
        endsAt: new Date(Date.UTC(year, month + 1, 0)),
      });
    }

    const quarterLastDay = (quarter: number) => {
      const endMonth = quarter * 3; // 3,6,9,12
      return new Date(Date.UTC(year, endMonth, 0));
    };

    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const startsAt = new Date(Date.UTC(year, startMonth, 1));
      const endsAt = quarterLastDay(q);
      descriptors.push({
        label: `${q}T`,
        quarter: q,
        kind: TaxPeriodType.QUARTERLY,
        startsAt,
        endsAt,
      });
    }

    // Annual period
    descriptors.push({
      label: "ANUAL",
      kind: TaxPeriodType.ANNUAL,
      startsAt: new Date(Date.UTC(year, 0, 1)),
      endsAt: new Date(Date.UTC(year, 11, 31)),
    });

    const specialMonths = [
      { label: "Abril", month: 3 },
      { label: "Octubre", month: 9 },
      { label: "Diciembre", month: 11 },
    ];

    specialMonths.forEach(({ label, month }) => {
      const startsAt = new Date(Date.UTC(year, month, 1));
      const endsAt = new Date(Date.UTC(year, month + 1, 0));
      descriptors.push({
        label,
        kind: TaxPeriodType.SPECIAL,
        startsAt,
        endsAt,
      });
    });

    return descriptors;
  }

  private async generateFilingsForPeriods(
    client: PrismaClient | Prisma.TransactionClient,
    periods: Array<{
      id: string;
      kind: TaxPeriodType;
      label: string;
      year: number;
      startsAt?: Date;
      endsAt?: Date;
    }>
  ) {
    if (periods.length === 0) return;

    const assignments = await client.client_tax_assignments.findMany({
      where: {
        activeFlag: true,
        clients: { isActive: true },
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            isActive: true,
          },
        },
      },
    });

    if (assignments.length === 0) return;

    const configMap = await this.getTaxModelConfigMap(client);

    for (const period of periods) {
      for (const assignment of assignments) {
        if (!this.periodMatchesAssignment(period, assignment, configMap)) continue;

        await client.client_tax_filings.upsert({
          where: {
            clientId_taxModelCode_periodId: {
              clientId: assignment.clientId,
              taxModelCode: assignment.taxModelCode,
              periodId: period.id,
            },
          },
          create: {
            id: randomUUID(),
            clientId: assignment.clientId,
            taxModelCode: assignment.taxModelCode,
            periodId: period.id,
            status: FilingStatus.NOT_STARTED,
          },
          update: {},
        });
      }
    }
  }

  private periodMatchesAssignment(
    period: {
      kind: TaxPeriodType;
      label: string;
      year: number;
      startsAt?: Date;
      endsAt?: Date;
    },
    assignment: any,
    configMap: Map<string, ReturnType<typeof mapPrismaTaxModelsConfig>>
  ) {
    if (!assignment.activeFlag) return false;
    const code = String(assignment.taxModelCode ?? "").toUpperCase();
    const periodicity = String(assignment.periodicidad ?? "").toUpperCase();
    const config = configMap.get(code);
    const allowedPeriods =
      config?.allowedPeriods?.map((p: string) => p.toUpperCase()) ?? [];

    const matchesPeriodicity = (...targets: string[]) =>
      targets.some(
        (target) =>
          periodicity === target ||
          allowedPeriods.includes(target)
      );

    const assignmentStart = assignment.startDate
      ? new Date(assignment.startDate)
      : null;
    const assignmentEnd = assignment.endDate ? new Date(assignment.endDate) : null;
    const periodStart = period.startsAt ? new Date(period.startsAt) : null;
    const periodEnd = period.endsAt ? new Date(period.endsAt) : null;

    if (assignmentStart && periodEnd && assignmentStart > periodEnd) {
      return false;
    }
    if (assignmentEnd && periodStart && assignmentEnd < periodStart) {
      return false;
    }

    switch (period.kind) {
      case TaxPeriodType.MONTHLY:
        return matchesPeriodicity('MENSUAL');
      case TaxPeriodType.QUARTERLY:
        return matchesPeriodicity('TRIMESTRAL');
      case TaxPeriodType.ANNUAL:
        return matchesPeriodicity('ANUAL');
      case TaxPeriodType.SPECIAL:
        if (code !== '202') return false;
        if (!matchesPeriodicity('ESPECIAL_FRACCIONADO')) return false;
        if (!config?.labels || config.labels.length === 0) return true;
        return config.labels.some(
          (label) => label.toLowerCase() === period.label.toLowerCase()
        );
      default:
        return false;
    }
  }

  async getFiscalPeriodsSummary(year?: number): Promise<FiscalPeriodSummary[]> {
  const where: any = {};
    if (year) where.year = year;

    const periods = await prisma.fiscal_periods.findMany({
      where,
      orderBy: [{ year: 'desc' }, { starts_at: 'desc' }],
      // Note: fiscal_periods doesn't have a direct 'filings' relation
      // client_tax_filings has periodId pointing to fiscal_periods
    });

    return periods.map((period) => {
      // TODO: Fix filings aggregation - fiscal_periods doesn't have filings relation
      // We need to query client_tax_filings separately if we need totals
      const totals = { total: 0, notStarted: 0, inProgress: 0, presented: 0 };

      return {
        id: period.id,
        year: period.year,
        quarter: period.quarter ?? null,
        label: period.label,
        kind: period.kind,
        status: period.status,
        startsAt: period.starts_at,
        endsAt: period.ends_at,
        lockedAt: period.locked_at,
        totals,
      };
    });
  }

  async createFiscalYear(year: number): Promise<FiscalPeriodSummary[]> {
    const descriptors = this.periodDescriptorsForYear(year);
  const created: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const descriptor of descriptors) {
        const period = await tx.fiscal_periods.upsert({
          where: {
            year_label: {
              year,
              label: descriptor.label,
            },
          },
          update: {
            starts_at: descriptor.startsAt,
            ends_at: descriptor.endsAt,
            kind: descriptor.kind,
            quarter: descriptor.quarter ?? null,
          },
          create: {
            id: randomUUID(),
            year,
            quarter: descriptor.quarter ?? null,
            label: descriptor.label,
            kind: descriptor.kind,
            starts_at: descriptor.startsAt,
            ends_at: descriptor.endsAt,
          },
        });
        created.push(period);
      }

      await this.generateFilingsForPeriods(
        tx,
        created.map((period) => ({
          id: period.id,
          kind: period.kind,
          label: period.label,
          year: period.year,
          startsAt: period.starts_at,
          endsAt: period.ends_at,
        }))
      );
    });

    return this.getFiscalPeriodsSummary(year);
  }

  async createFiscalPeriod(data: {
    year: number;
    kind: TaxPeriodType;
    label: string;
    quarter?: number | null;
    startsAt: Date;
    endsAt: Date;
  }): Promise<FiscalPeriodSummary> {
    const period = await prisma.fiscal_periods.upsert({
      where: {
        year_label: {
          year: data.year,
          label: data.label,
        },
      },
      update: {
        quarter: data.quarter ?? null,
        kind: data.kind,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
      },
      create: {
            id: randomUUID(),
        year: data.year,
        quarter: data.quarter ?? null,
        label: data.label,
        kind: data.kind,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
      },
    });

    await this.generateFilingsForPeriods(prisma, [
      {
        id: period.id,
        kind: period.kind,
        label: period.label,
        year: period.year,
        startsAt: period.starts_at,
        endsAt: period.ends_at,
      },
    ]);

    const summaries = await this.getFiscalPeriodsSummary(data.year);
    return summaries.find((item) => item.id === period.id) ?? summaries[0];
  }

  /**
   * Asegura que existan clientTaxFiling para todas las asignaciones activas
   * del año indicado, recorriendo los fiscal_periods de ese año.
   */
  async ensureClientTaxFilingsForYear(year: number) {
    const periods = await prisma.fiscal_periods.findMany({
      where: { year },
      select: {
        id: true,
        kind: true,
        label: true,
        year: true,
        starts_at: true,
        ends_at: true,
      },
    });
    if (periods.length === 0) return { year, generated: 0 };
    await this.generateFilingsForPeriods(
      prisma,
      periods.map((p) => ({
        id: p.id,
        kind: p.kind,
        label: p.label,
        year: p.year,
        startsAt: p.starts_at,
        endsAt: p.ends_at,
      }))
    );
    return { year, generated: periods.length };
  }

  /**
   * Migra obligaciones activas (obligaciones_fiscales) a asignaciones (client_tax_assignments)
   * en caso de que no exista aún la tupla (cliente + modelo).
   */
  private async migrateObligationsToAssignments() {
    const obligaciones = await prisma.obligaciones_fiscales.findMany({
      where: { activo: true },
      include: { clients: true },
    });

    for (const ob of obligaciones) {
      const code = null // TODO: Fix impuestos relation?.toUpperCase();
      if (!code) continue;

      const existing = await prisma.client_tax_assignments.findFirst({
        where: { clientId: ob.cliente_id, taxModelCode: code },
      });
      if (existing) continue;

      // Crear asignación básica
      try {
        await prisma.client_tax_assignments.create({
          data: {
            id: randomUUID(),
            clientId: ob.cliente_id,
            taxModelCode: code,
            periodicidad: (ob.periodicidad as any) ?? (code === '303' ? 'TRIMESTRAL' : 'ANUAL'),
            startDate: ob.fecha_inicio ?? ob.fecha_asignacion ?? new Date(),
            endDate: ob.fecha_fin ?? null,
            activeFlag: ob.activo ?? true,
            notes: ob.observaciones ?? null,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        // Si falla por unique u otros, seguir con el resto
      }
    }
  }

  private async ensureAssignmentsFromClientTaxModels() {
    const clients = await prisma.clients.findMany({
      where: { isActive: true },
      select: { id: true, tipo: true, fechaAlta: true, tax_models: true },
    });

    for (const c of clients) {
      let codes: string[] = [];
      const raw = c.tax_models as any;
      if (Array.isArray(raw)) codes = raw.map((x) => `${x}`.toUpperCase());
      else if (typeof raw === 'string') {
        try { const arr = JSON.parse(raw); if (Array.isArray(arr)) codes = arr.map((x: any) => `${x}`.toUpperCase()); } catch {}
      }
      for (const code of codes) {
        const exists = await prisma.client_tax_assignments.findFirst({ where: { clientId: c.id, taxModelCode: code } });
        if (exists) continue;
        try {
          await prisma.client_tax_assignments.create({
            data: {
              id: randomUUID(),
              clientId: c.id,
              taxModelCode: code,
              periodicidad: (code === '303' ? 'TRIMESTRAL' : 'ANUAL') as any,
              startDate: c.fechaAlta ?? new Date(),
              endDate: null,
              activeFlag: true,
              notes: null,
              updatedAt: new Date(),
            },
          });
        } catch {}
      }
    }
  }

  private async ensureDefault303Assignments() {
    const clients = await prisma.clients.findMany({ where: { isActive: true }, select: { id: true, fechaAlta: true } });
    for (const c of clients) {
      const count = await prisma.client_tax_assignments.count({ where: { clientId: c.id } });
      if (count > 0) continue;
      const exists303 = await prisma.client_tax_assignments.findFirst({ where: { clientId: c.id, taxModelCode: '303' } });
      if (exists303) continue;
      try {
        await prisma.client_tax_assignments.create({
          data: {
            id: randomUUID(),
            clientId: c.id,
            taxModelCode: '303',
            periodicidad: 'TRIMESTRAL' as any,
            startDate: c.fechaAlta ?? new Date(),
            endDate: null,
            activeFlag: true,
            notes: 'Asignación por defecto generada automáticamente',
            updatedAt: new Date(),
          },
        });
      } catch {}
    }
  }

  async getTaxFilings(filters: TaxFilingsFilters): Promise<TaxFilingRecord[]> {
  const where: any = {};
    if (filters.periodId) where.periodId = filters.periodId;
    if (filters.status) {
      const s = String(filters.status).toUpperCase();
      const map: Record<string, FilingStatus> = {
        'PENDIENTE': FilingStatus.NOT_STARTED,
        'NOT_STARTED': FilingStatus.NOT_STARTED,
        'CALCULADO': FilingStatus.IN_PROGRESS,
        'IN_PROGRESS': FilingStatus.IN_PROGRESS,
        'PRESENTADO': FilingStatus.PRESENTED,
        'PRESENTED': FilingStatus.PRESENTED,
      };
      if (map[s]) where.status = map[s];
    }
    if (filters.model) where.taxModelCode = filters.model;
    if (filters.clientId) where.clientId = filters.clientId;
    // Filtros anidados sobre cliente
  const clientWhere: any = {};
    if (filters.clientId) clientWhere.id = filters.clientId;
    if (filters.gestorId) clientWhere.responsableAsignado = filters.gestorId;
    if (filters.search) clientWhere.razonSocial = { contains: filters.search, mode: 'insensitive' } as any;
    if (Object.keys(clientWhere).length > 0) where.clients = clientWhere;

    // Filtrar por año vía relación con fiscal_periods
    if (filters.year) {
      const y = typeof filters.year === 'string' ? Number(filters.year) : filters.year;
      if (Number.isFinite(y as number)) {
        (where as any).fiscal_periods = { ...(where as any).fiscal_periods, year: y };
      }
    }

    // Por defecto, solo mostrar tarjetas con períodos abiertos en tax_calendar
    // Ya no filtramos por fiscal_periods.status aquí, lo haremos después basándonos en tax_calendar
    // (Se mantiene el filtro solo si includeClosedPeriods = false, que es el comportamiento por defecto)

    const filings = await prisma.client_tax_filings.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            users: {
              select: {
                username: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            username: true,
          },
        },
        fiscal_periods: true,
      },
      orderBy: [{ clients: { razonSocial: 'asc' } }],
    });
    // Filtrar por asignaciones efectivas en las fechas del periodo (start <= period.end && (end IS NULL || end >= period.start)) y activas
    const clientIds = Array.from(new Set(filings.map((f) => f.clientId)));
    const codes = Array.from(new Set(filings.map((f) => f.taxModelCode)));
    type A = { clientId: string; taxModelCode: string; startDate: Date; endDate: Date | null; activeFlag: boolean };
    let byKey = new Map<string, A[]>();
    if (clientIds.length && codes.length) {
      const assignments = await prisma.client_tax_assignments.findMany({
        where: {
          clientId: { in: clientIds },
          taxModelCode: { in: codes },
        },
        select: { clientId: true, taxModelCode: true, startDate: true, endDate: true, activeFlag: true },
      });
      for (const a of assignments as A[]) {
        const key = `${a.clientId}:${a.taxModelCode}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(a);
      }
    }

    // FILTRO ADICIONAL: Verificar que existe entrada en tax_calendar ABIERTA para este modelo
    // Obtener todas las entradas del calendario fiscal (no solo abiertas)
    const currentYear = filters.year ? (typeof filters.year === 'string' ? parseInt(filters.year) : filters.year) : new Date().getFullYear();
    const allCalendarEntries = await prisma.tax_calendar.findMany({
      where: {
        year: currentYear,
      },
      select: {
        modelCode: true,
        period: true,
        status: true,
      },
    });

    // Crear dos Maps: uno para períodos abiertos y otro para todos los estados
    const openModelPeriods = new Map<string, Set<string>>();
    const calendarStatusMap = new Map<string, string>(); // key: "modelCode:period" -> status
    for (const entry of allCalendarEntries) {
      const key = `${entry.modelCode}:${entry.period}`;
      calendarStatusMap.set(key, entry.status);
      
      if (entry.status === 'ABIERTO') {
        if (!openModelPeriods.has(entry.modelCode)) {
          openModelPeriods.set(entry.modelCode, new Set());
        }
        openModelPeriods.get(entry.modelCode)!.add(entry.period);
      }
    }

    // Obtener periodicidad de las asignaciones
    const assignmentsWithPeriodicity = await prisma.client_tax_assignments.findMany({
      where: {
        clientId: { in: clientIds },
        taxModelCode: { in: codes },
        activeFlag: true,
      },
      select: { clientId: true, taxModelCode: true, periodicidad: true },
    });

    const clientModelPeriodicity = new Map<string, string>();
    for (const a of assignmentsWithPeriodicity) {
      const key = `${a.clientId}:${a.taxModelCode}`;
      clientModelPeriodicity.set(key, a.periodicidad);
    }

    const visible = filings.filter((f) => {
      if (!f.fiscal_periods) return false;
      
      // Verificar asignación activa del cliente
      const key = `${f.clientId}:${f.taxModelCode}`;
      const arr = byKey.get(key);
      if (!arr || arr.length === 0) return false;
      const ps = f.fiscal_periods.starts_at as Date;
      const pe = f.fiscal_periods.ends_at as Date;
      const hasActiveAssignment = arr.some((a) => {
        if (!a.activeFlag) return false;
        const startOk = a.startDate <= pe;
        const endOk = !a.endDate || a.endDate >= ps;
        return startOk && endOk;
      });
      
      if (!hasActiveAssignment) return false;

      // NUEVO: Verificar que el modelo tiene período abierto en tax_calendar
      // que coincida con la periodicidad de la asignación del cliente
      const periodicity = clientModelPeriodicity.get(key);
      if (!periodicity) return false;

      const openPeriods = openModelPeriods.get(f.taxModelCode);
      if (!openPeriods || openPeriods.size === 0) return false;

      // Determinar el tipo de período de la tarjeta actual (fiscal_periods.kind)
      const filingPeriodKind = f.fiscal_periods.kind;
      
      // Determinar qué tipo de período debe estar abierto según la periodicidad asignada
      let requiresPeriodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'SPECIAL' | null = null;
      if (periodicity === 'MENSUAL' || periodicity === 'MONTHLY') {
        requiresPeriodType = 'MONTHLY';
      } else if (periodicity === 'TRIMESTRAL' || periodicity === 'QUARTERLY') {
        requiresPeriodType = 'QUARTERLY';
      } else if (periodicity === 'ANUAL' || periodicity === 'ANNUAL') {
        requiresPeriodType = 'ANNUAL';
      }

      if (!requiresPeriodType) return false;

      // La tarjeta solo se muestra si:
      // 1. El tipo de período de la tarjeta (filingPeriodKind) coincide con la periodicidad asignada
      // 2. Y además hay períodos abiertos de ese tipo en el calendario
      
      // Verificar si el período de la tarjeta coincide con la periodicidad
      let periodMatches = false;
      
      if (requiresPeriodType === 'MONTHLY') {
        // Para periodicidad mensual: aceptar MONTHLY o SPECIAL que empiece con "MES-"
        periodMatches = 
          filingPeriodKind === 'MONTHLY' || 
          (filingPeriodKind === 'SPECIAL' && f.fiscal_periods.label.startsWith('MES-'));
      } else if (requiresPeriodType === 'QUARTERLY') {
        periodMatches = filingPeriodKind === 'QUARTERLY';
      } else if (requiresPeriodType === 'ANNUAL') {
        periodMatches = filingPeriodKind === 'ANNUAL';
      }

      if (!periodMatches) return false;

      // Verificar si hay algún período abierto del tipo correcto en el calendario
      // y que además coincida exactamente con el período de la tarjeta
      // (p. ej. M10 para octubre). Para MONTHLY derivamos el código Mxx desde starts_at
      if (requiresPeriodType === 'MONTHLY') {
        let filingMonthCode: string | null = null;
        // Si el label tiene formato MNN, usarlo
        const rl = (f.fiscal_periods?.label ?? '').toString();
        const mMatch = rl.match(/^M(\d{2})$/i);
        if (mMatch) {
          filingMonthCode = `M${mMatch[1]}`;
        } else if (f.fiscal_periods?.starts_at) {
          try {
            const dt = new Date(f.fiscal_periods.starts_at as any);
            const month = dt.getMonth() + 1;
            filingMonthCode = `M${String(month).padStart(2, '0')}`;
          } catch (e) {
            filingMonthCode = null;
          }
        }
        if (filingMonthCode && openPeriods.has(filingMonthCode)) return true;
        return false;
      }

      if (requiresPeriodType === 'QUARTERLY') {
        const q = f.fiscal_periods?.quarter;
        if (q && openPeriods.has(`${q}T`)) return true;
        return false;
      }

      if (requiresPeriodType === 'ANNUAL') {
        if (openPeriods.has('ANUAL')) return true;
        return false;
      }

      return false;
    });

    const allFilings = visible.map((filing) => {
      // Determinar el código de período para buscar en tax_calendar
      let periodCode: string | null = null;
      const filingPeriodKind = filing.fiscal_periods?.kind;
      
      if (filingPeriodKind === 'MONTHLY' || (filingPeriodKind === 'SPECIAL' && filing.fiscal_periods?.label?.startsWith('MES-'))) {
        // Para mensual, derivar Mxx del starts_at
        const rl = (filing.fiscal_periods?.label ?? '').toString();
        const mMatch = rl.match(/^M(\d{2})$/i);
        if (mMatch) {
          periodCode = `M${mMatch[1]}`;
        } else if (filing.fiscal_periods?.starts_at) {
          try {
            const dt = new Date(filing.fiscal_periods.starts_at as any);
            const month = dt.getMonth() + 1;
            periodCode = `M${String(month).padStart(2, '0')}`;
          } catch (e) {
            periodCode = null;
          }
        }
      } else if (filingPeriodKind === 'QUARTERLY') {
        const q = filing.fiscal_periods?.quarter;
        if (q) periodCode = `${q}T`;
      } else if (filingPeriodKind === 'ANNUAL') {
        periodCode = 'ANUAL';
      }

      // Buscar el estado en el calendario
      const calendarKey = periodCode ? `${filing.taxModelCode}:${periodCode}` : null;
      const calendarStatus = calendarKey ? (calendarStatusMap.get(calendarKey) ?? null) : null;

      return {
        id: filing.id,
        clientId: filing.clientId,
        clientName: filing.clients?.razonSocial ?? "",
        nifCif: filing.clients?.nifCif ?? "",
        gestorId: filing.clients?.responsableAsignado ?? null,
        gestorName: filing.clients?.users?.username ?? null,
        taxModelCode: filing.taxModelCode,
        periodId: filing.periodId,
        periodLabel: formatPeriodLabel(filing.fiscal_periods),
        periodKind: filing.fiscal_periods?.kind ?? null,
        periodStatus: filing.fiscal_periods?.status ?? null,
        calendarStatus: calendarStatus,
        status: normalizeStatus(filing.status as any, true) as string,
        notes: filing.notes ?? null,
        presentedAt: filing.presentedAt ?? null,
        assigneeId: filing.users?.id ?? null,
        assigneeName: filing.users?.username ?? null,
      };
    });

    // Si no se incluyen períodos cerrados, filtrar solo los que tienen calendarStatus === 'ABIERTO'
    if (!filters.includeClosedPeriods) {
      return allFilings.filter(filing => filing.calendarStatus === 'ABIERTO');
    }

    return allFilings;
  }

  async updateTaxFiling(
    id: string,
    data: {
      status?: FilingStatus | string;
      notes?: string | null;
      presentedAt?: Date | null;
      assigneeId?: string | null;
    },
    options: { allowClosed?: boolean } = {}
  ) {
    const filing = await prisma.client_tax_filings.findUnique({
      where: { id },
      include: {
        fiscal_periods: true,
      },
    });

    if (!filing) {
      throw new Error("Declaración no encontrada");
    }

    if (filing.fiscal_periods?.status === PeriodStatus.CLOSED && !options.allowClosed) {
      throw new Error("El periodo está cerrado. Solo un administrador puede modificarlo.");
    }

    // Mapear estado de UI -> enum Prisma si viene en castellano
    let nextStatus: FilingStatus | undefined = undefined;
    if (data.status !== undefined) {
      const raw = String(data.status).toUpperCase();
      const map: Record<string, FilingStatus> = {
        'PENDIENTE': FilingStatus.NOT_STARTED,
        'NOT_STARTED': FilingStatus.NOT_STARTED,
        'CALCULADO': FilingStatus.IN_PROGRESS,
        'IN_PROGRESS': FilingStatus.IN_PROGRESS,
        'PRESENTADO': FilingStatus.PRESENTED,
        'PRESENTED': FilingStatus.PRESENTED,
      };
      nextStatus = map[raw] ?? (data.status as FilingStatus);
    }

    const updated = await prisma.client_tax_filings.update({
      where: { id },
      data: {
        status: nextStatus ?? filing.status,
        notes: data.notes !== undefined ? data.notes : filing.notes,
        presentedAt: data.presentedAt !== undefined ? data.presentedAt : filing.presentedAt,
        assigneeId: data.assigneeId !== undefined ? data.assigneeId : filing.assigneeId,
      },
      include: {
        fiscal_periods: true,
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            users: { select: { username: true } },
          },
        },
        users: { select: { id: true, username: true } },
      },
    });

    return {
      id: updated.id,
      clientId: updated.clientId,
      clientName: updated.clients?.razonSocial ?? "",
      nifCif: updated.clients?.nifCif ?? "",
      gestorId: updated.clients?.responsableAsignado ?? null,
      gestorName: updated.clients?.users?.username ?? null,
      taxModelCode: updated.taxModelCode,
      periodId: updated.periodId,
      periodLabel: formatPeriodLabel(updated.fiscal_periods),
      periodKind: updated.fiscal_periods?.kind ?? null,
      periodStatus: updated.fiscal_periods?.status ?? null,
      status: normalizeStatus(updated.status as any, true) as string,
      notes: updated.notes ?? null,
      presentedAt: updated.presentedAt ?? null,
      assigneeId: updated.users?.id ?? null,
      assigneeName: updated.users?.username ?? null,
    } as TaxFilingRecord;
  }

  async toggleFiscalPeriodStatus(
    id: string,
    status: PeriodStatus,
    userId?: string
  ) {
    const updates: any = {
      status,
    };

    if (status === PeriodStatus.CLOSED) {
      updates.locked_at = new Date();
      updates.closed_by = userId ?? null;
    } else {
      updates.locked_at = null;
      updates.closed_by = null;
    }

    return prisma.fiscal_periods.update({
      where: { id },
      data: updates,
    });
  }

  async getFiscalPeriod(id: string): Promise<FiscalPeriodSummary | null> {
    const periods = await this.getFiscalPeriodsSummary();
    return periods.find((period) => period.id === id) ?? null;
  }

  async getTaxControlMatrix(params: TaxControlMatrixParams = {}): Promise<TaxControlMatrixResult> {
    const { type, gestorId, model, periodicity } = params;
  const clientWhere: any = {};

    if (type) {
      clientWhere.tipo = type.toString().toUpperCase() as any;
    }

    if (gestorId) {
      clientWhere.responsableAsignado = gestorId;
    }

    const clients = await prisma.clients.findMany({
      where: clientWhere,
      orderBy: { razonSocial: 'asc' },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        client_tax_assignments: {
          include: {},
        },
      },
    });

    const currentYear = new Date().getFullYear();
    const requestedYear =
      params.year === undefined || params.year === null || params.year === ''
        ? null
        : Number(params.year);
    const selectedYear = Number.isFinite(requestedYear) ? Number(requestedYear) : currentYear;

    const parsedQuarter = (() => {
      if (params.quarter === undefined || params.quarter === null || params.quarter === '') {
        return null;
      }
      const raw = typeof params.quarter === 'number' ? params.quarter : Number(String(params.quarter).replace(/[^0-9]/g, ''));
      return Number.isFinite(raw) ? Number(raw) : null;
    })();

  const periodWhere: any = {};
    if (selectedYear) {
      periodWhere.year = selectedYear;
    }
    if (parsedQuarter !== null) {
      periodWhere.quarter = parsedQuarter;
    }

    const fiscal_periodss = await prisma.fiscal_periods.findMany({
      where: periodWhere,
      select: {
        id: true,
        year: true,
        quarter: true,
        ends_at: true,
        label: true,
      },
    });

    const periodIds = fiscal_periodss.map((period) => period.id);

  const filingWhere: any = {};
    if (periodIds.length > 0) {
      filingWhere.periodId = { in: periodIds };
    } else if (selectedYear) {
      filingWhere.fiscal_periods = { year: selectedYear };
    }

    const filings = await prisma.client_tax_filings.findMany({
      where: filingWhere,
      include: {
        fiscal_periods: true,
      },
    });

    const filingsMap = new Map<
      string,
      {
        filing: typeof filings[number];
        rank: number;
      }
    >();

    for (const filing of filings) {
      const key = `${filing.clientId}_${filing.taxModelCode}`;
      const statusKey = (filing.status || '').toUpperCase();
      const rank = STATUS_PRIORITY[statusKey] ?? 0;
      const existing = filingsMap.get(key);
      if (!existing) {
        filingsMap.set(key, { filing, rank });
        continue;
      }

      const existingDate = existing.filing.fiscal_periods?.ends_at
        ? new Date(existing.filing.fiscal_periods.ends_at).getTime()
        : 0;
      const candidateDate = filing.fiscal_periods?.ends_at ? new Date(filing.fiscal_periods.ends_at).getTime() : 0;

      if (rank > existing.rank || (rank === existing.rank && candidateDate > existingDate)) {
        filingsMap.set(key, { filing, rank });
      }
    }

    const searchValue = typeof params.search === 'string' ? params.search.trim() : '';
    const searchLower = searchValue.toLowerCase();
    const searchUpper = searchValue.toUpperCase();
    const hasSearch = searchValue.length > 0;

    const rows: TaxControlRowSummary[] = [];

    const startOfYear = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59));

    for (const client of clients) {
      const cells: Record<string, TaxControlCellSummary> = {};
      for (const code of TAX_CONTROL_MODELS) {
        cells[code] = { active: false };
      }

      for (const assignment of client.client_tax_assignments) {
        const code = assignment.taxModelCode;
        if (!TAX_CONTROL_MODELS.includes(code)) continue;
        if (model && code !== String(model).toUpperCase()) continue;
        if (periodicity && String(assignment.periodicidad).toUpperCase() !== String(periodicity).toUpperCase()) continue;

        const startDate = assignment.startDate ? new Date(assignment.startDate) : null;
        const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
        const effectiveActive = Boolean(assignment.activeFlag) &&
          (!startDate || startDate <= endOfYear) &&
          (!endDate || endDate >= startOfYear);
        const filingEntry = filingsMap.get(`${client.id}_${code}`);
        const filing = filingEntry?.filing;
        const normalizedStatus = normalizeStatus(filing?.status, effectiveActive);

        cells[code] = {
          assignmentId: assignment.id,
          active: effectiveActive,
          periodicity: assignment.periodicidad,
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          activeFlag: assignment.activeFlag,
          status: normalizedStatus,
          statusUpdatedAt: filing?.presentedAt ?? filing?.fiscal_periods?.ends_at ?? null,
          filingId: filing?.id ?? null,
          periodId: filing?.periodId ?? null,
          periodLabel: formatPeriodLabel(filing?.fiscal_periods),
        };
      }

      let matchesSearch = true;
      if (hasSearch) {
        const matchesClient =
          client.razonSocial?.toLowerCase().includes(searchLower) ||
          client.nifCif?.toLowerCase().includes(searchLower);
        const matchesModel = TAX_CONTROL_MODELS.some(
          (code) =>
            code.includes(searchUpper) &&
            (cells[code].assignmentId || cells[code].active || cells[code].status)
        );
        matchesSearch = matchesClient || matchesModel;
      }

      if (!matchesSearch) {
        continue;
      }

      // Mostrar solo clientes con al menos un modelo activo
      const hasAnyActive = Object.values(cells).some((c) => c.active === true);
      if (!hasAnyActive) {
        continue;
      }

      rows.push({
        clientId: client.id,
        clientName: client.razonSocial,
        nifCif: client.nifCif,
        clientType: client.tipo,
        gestorId: client.responsableAsignado ?? null,
        gestorName: client.users?.username ?? null,
        gestorEmail: client.users?.email ?? null,
        cells,
      });
    }

    return {
      rows,
      models: TAX_CONTROL_MODELS,
      metadata: {
        year: selectedYear ?? null,
        quarter: parsedQuarter,
        totalClients: rows.length,
        filters: {
          type: type ?? null,
          gestorId: gestorId ?? null,
          search: hasSearch ? searchValue : null,
        },
      },
    };
  }

  /**
   * Genera declaraciones faltantes para un año dado a partir de obligaciones activas
   */
  async ensureDeclarationsForYear(year: number) {
    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    // Obligaciones activas en el año (fechaInicio <= fin de año) y (fechaFin NULL o >= inicio de año) y activo=true
    const obligaciones = await prisma.obligaciones_fiscales.findMany({
      where: {
        activo: true,
        OR: [
          { fecha_fin: null },
          { fecha_fin: { gte: startOfYear } },
        ],
        fecha_inicio: { lte: endOfYear },
      },
      include: { clients: true },
    });

    let created = 0;
    let skipped = 0;

    for (const ob of obligaciones) {
      const modelCode = null // TODO: Fix impuestos relation || null;
      if (!modelCode) {
        skipped++;
        continue;
      }

      // Selección de periodos según periodicidad
      const where: any = { modelCode, year };
      // Para mensual: todos M01..M12; trimestral: 1T..4T; anual: ANUAL
      if (ob.periodicidad === 'MENSUAL') {
        where.period = { in: ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12'] };
      } else if (ob.periodicidad === 'TRIMESTRAL') {
        where.period = { in: ['1T','2T','3T','4T'] };
      } else {
        where.period = 'ANUAL';
      }

      const periods = await prisma.tax_calendar.findMany({ where, select: { id: true } });

      for (const p of periods) {
        const exists = await prisma.declaraciones.findFirst({
          where: { obligacion_id: ob.id, calendario_id: p.id },
          select: { id: true },
        });
        if (exists) {
          skipped++;
          continue;
        }
        // TODO: Fix this legacy method - needs proper Prisma syntax with relations
        // await prisma.declaraciones.create({
        //   data: {
        //     obligacion_id: ob.id,
        //     calendario_id: p.id,
        //     estado: 'PENDIENTE',
        //   },
        // });
        created++;
      }
    }

    return { year, obligaciones: obligaciones.length, created, skipped };
  }

  // ==================== IMPUESTO METHODS ====================
  async getAllImpuestos() {
    return await prisma.impuestos.findMany({
      orderBy: { modelo: 'asc' }
    });
  }

  async getImpuesto(id: string) {
    return await prisma.impuestos.findUnique({
      where: { id }
    });
  }

  async getImpuestoByModelo(modelo: string) {
    return await prisma.impuestos.findUnique({
      where: { modelo }
    });
  }

  async createImpuesto(data: { modelo: string; nombre: string; descripcion?: string | null }) {
    return await prisma.impuestos.create({
      data: {
        id: randomUUID(),
        modelo: data.modelo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        updatedAt: new Date(),
      }
    });
  }

  async updateImpuesto(id: string, data: { modelo?: string; nombre?: string; descripcion?: string | null }) {
    return await prisma.impuestos.update({
      where: { id },
      data
    });
  }

  async deleteImpuesto(id: string) {
    await prisma.impuestos.delete({
      where: { id }
    });
    return true;
  }

  // ==================== OBLIGACION FISCAL METHODS ====================
  async getAllObligacionesFiscales() {
    return await prisma.obligaciones_fiscales.findMany({
      include: {
        clients: true,
        impuestos: true
      },
      orderBy: { fecha_asignacion: 'desc' }
    });
  }

  async getObligacionFiscal(id: string) {
    return await prisma.obligaciones_fiscales.findUnique({
      where: { id },
      include: {
        clients: true,
        impuestos: true
      }
    });
  }

  async getObligacionesByCliente(cliente_id: string) {
    return await prisma.obligaciones_fiscales.findMany({
      where: { cliente_id },
      include: {
        clients: true,
        impuestos: true
      },
      orderBy: { fecha_asignacion: 'desc' }
    });
  }

  async createObligacionFiscal(data: any) {
    return await prisma.obligaciones_fiscales.create({
      data,
      include: {
        clients: true,
        impuestos: true
      }
    });
  }

  async updateObligacionFiscal(id: string, data: any) {
    return await prisma.obligaciones_fiscales.update({
      where: { id },
      data,
      include: {
        clients: true,
        impuestos: true
      }
    });
  }

  async deleteObligacionFiscal(id: string) {
    await prisma.obligaciones_fiscales.delete({
      where: { id }
    });
    return true;
  }

  // ==================== TAX CALENDAR METHODS ====================
  async listTaxCalendar(params?: { year?: number; modelCode?: string; active?: boolean }) {
    const where: any = {};

    if (typeof params?.year === "number") {
      where.year = params.year;
    }

    if (params?.modelCode) {
      where.modelCode = params.modelCode;
    }

    if (typeof params?.active === "boolean") {
      where.active = params.active;
    }

    return await prisma.tax_calendar.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { modelCode: "asc" },
        
      ],
    });
  }

  async getTaxCalendar(id: string) {
    return await prisma.tax_calendar.findUnique({
      where: { id },
    });
  }

  async createTaxCalendar(data: any) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const derived = calculateDerivedFields(startDate, endDate);

    return await prisma.tax_calendar.create({
      data: {
        id: data.id || randomUUID(),
        modelCode: data.modelCode,
        period: data.period,
        year: data.year,
        startDate,
        endDate,
        status: derived.status || data.status,
        days_to_start: derived.daysToStart ?? data.daysToStart ?? null,
        days_to_end: derived.daysToEnd ?? data.daysToEnd ?? null,
        active: data.active ?? true,
        locked: data.locked ?? false,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      },
    });
  }

  async updateTaxCalendar(id: string, data: any) {
    const existing = await prisma.tax_calendar.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Tax calendar entry not found");
    }

    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    const derived = calculateDerivedFields(startDate, endDate);

    // Build an explicit update payload that uses the Prisma field names
    // (snake_case) to avoid passing camelCase keys (like daysToStart)
    // which Prisma will reject as unknown arguments.
    const updatePayload: any = {};
    if (data.modelCode !== undefined) updatePayload.modelCode = data.modelCode;
    if (data.period !== undefined) updatePayload.period = data.period;
    if (data.year !== undefined) updatePayload.year = data.year;
    updatePayload.startDate = startDate;
    updatePayload.endDate = endDate;
    // Status: take derived status if available, otherwise incoming value or existing
    updatePayload.status = derived.status ?? data.status ?? existing.status;
    // Map derived/day fields to Prisma column names
    updatePayload.days_to_start = derived.daysToStart ?? (data.daysToStart ?? data.days_to_start ?? null);
    updatePayload.days_to_end = derived.daysToEnd ?? (data.daysToEnd ?? data.days_to_end ?? null);
    if (data.active !== undefined) updatePayload.active = data.active;
    if (data.locked !== undefined) updatePayload.locked = data.locked;
    updatePayload.updatedAt = new Date();

    return await prisma.tax_calendar.update({
      where: { id },
      data: updatePayload,
    });
  }

  async deleteTaxCalendar(id: string) {
    await prisma.tax_calendar.delete({
      where: { id },
    });
    return true;
  }

  async cloneTaxCalendarYear(year: number) {
    const items = await prisma.tax_calendar.findMany({
      where: { year },
    });

    if (!items.length) return [];

    const targetYear = year + 1;
    const now = new Date();

    const clonesData = items.map(item => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      start.setFullYear(start.getFullYear() + 1);
      end.setFullYear(end.getFullYear() + 1);

      const derived = calculateDerivedFields(start, end);

      return {
        modelCode: item.modelCode,
        tax_periods: item.period,
        year: targetYear,
        startDate: start,
        endDate: end,
        status: derived.status,
        daysToStart: derived.daysToStart,
        daysToEnd: derived.daysToEnd,
        active: item.active,
        createdAt: now,
        updatedAt: now,
      };
    });

    const created = await prisma.$transaction(
      clonesData.map(data =>
        prisma.tax_calendar.create({ 
          data: {
            id: randomUUID(),
            period: data.tax_periods,
            modelCode: data.modelCode,
            year: data.year,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,
            days_to_start: data.daysToStart,
            days_to_end: data.daysToEnd,
            active: data.active,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          }
        })
      )
    );

    return created;
  }

  async seedTaxCalendarYear(
    year: number,
    opts?: { modelCode?: string; periodicity?: 'monthly' | 'quarterly' | 'annual' | 'special' | 'all' }
  ) {
    const targetCode = opts?.modelCode ? opts.modelCode.toUpperCase() : null;
    const rawConfigs = await prisma.tax_models_config.findMany({
      where: {
        isActive: true,
        ...(targetCode ? { code: targetCode } : {}),
      },
      select: {
        code: true,
        allowedPeriods: true,
      },
    });

    const configByCode = new Map<
      string,
      {
        allowedPeriods: string[];
      }
    >();
    rawConfigs.forEach((config) => {
      configByCode.set(config.code.toUpperCase(), {
        allowedPeriods: mapJsonArray(config.allowedPeriods),
      });
    });

    const modelConfigs: Array<{ code: string; allowed: Set<string> }> = [];
    const codes = targetCode ? [targetCode] : Array.from(configByCode.keys());
    if (targetCode && !configByCode.has(targetCode)) {
      codes.push(targetCode);
    }

    for (const code of codes) {
      const allowed = new Set<string>();
      const stored = configByCode.get(code);
      stored?.allowedPeriods.forEach((period) => allowed.add(period.toUpperCase()));
      const rule = TAX_RULES[code];
      if (rule) {
        rule.allowedPeriods.forEach((period) => allowed.add(period.toUpperCase()));
      }
      if (allowed.size === 0) {
        allowed.add('TRIMESTRAL');
        allowed.add('ANUAL');
      }
      modelConfigs.push({ code, allowed });
    }

    const makeDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
    const pushRecord = (modelCode: string, periodLabel: string, start: Date, end: Date) => {
      const derived = calculateDerivedFields(start, end);
      const now = new Date();
      records.push({
        id: randomUUID(),
        modelCode: modelCode,
        period: periodLabel,
        year,
        startDate: start,
        endDate: end,
        status: derived.status,
        days_to_start: derived.daysToStart,
        days_to_end: derived.daysToEnd,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    };
    const records: any[] = [];
    const includeMonthly = !opts?.periodicity || opts.periodicity === 'all' || opts.periodicity === 'monthly';
    const includeQuarterly = !opts?.periodicity || opts.periodicity === 'all' || opts.periodicity === 'quarterly';
    const includeAnnual = !opts?.periodicity || opts.periodicity === 'all' || opts.periodicity === 'annual';
    const includeSpecial =
      !opts?.periodicity || opts.periodicity === 'all' || opts.periodicity === 'special';

    for (const { code, allowed } of modelConfigs) {
      const supportsMonthly = allowed.has('MENSUAL');
      const supportsQuarterly = allowed.has('TRIMESTRAL');
      const supportsAnnual = allowed.has('ANUAL');
      const supportsSpecial =
        allowed.has('ESPECIAL_FRACCIONADO') || code === '202';

      if (includeMonthly && supportsMonthly) {
        for (let m = 1; m <= 12; m++) {
          const period = `M${String(m).padStart(2, '0')}`;
          const nextMonth = m === 12 ? 0 : m; // Date.UTC month is 0-based; next of 12 is 0 of Y+1
          const nextYear = m === 12 ? year + 1 : year;
          const start = makeDate(nextYear, nextMonth, 1);
          const end = makeDate(nextYear, nextMonth, 20);
          pushRecord(code, period, start, end);
        }
      }

      if (includeQuarterly && supportsQuarterly) {
        const quarters = [
          { label: '1T', start: makeDate(year, 3, 1), end: makeDate(year, 3, 20) },
          { label: '2T', start: makeDate(year, 6, 1), end: makeDate(year, 6, 20) },
          { label: '3T', start: makeDate(year, 9, 1), end: makeDate(year, 9, 20) },
          { label: '4T', start: makeDate(year + 1, 0, 1), end: makeDate(year + 1, 0, 30) },
        ];
        for (const q of quarters) {
          pushRecord(code, q.label, q.start, q.end);
        }
      }

      if (includeAnnual && supportsAnnual) {
        const start = makeDate(year + 1, 0, 1);
        const end = makeDate(year + 1, 0, 30);
        pushRecord(code, 'ANUAL', start, end);
      }

      if (includeSpecial && supportsSpecial && code === '202') {
        const months = [4, 10, 12];
        for (const m of months) {
          const nextMonth = m === 12 ? 0 : m; // April->May(4), Oct->Nov(10), Dec->Jan(0) next year
          const nextYear = m === 12 ? year + 1 : year;
          const start = makeDate(nextYear, nextMonth, 1);
          const end = makeDate(nextYear, nextMonth, 20);
          pushRecord(code, `M${String(m).padStart(2, '0')}`, start, end);
        }
      }
    }

    if (records.length === 0) return { created: 0 };
    await prisma.tax_calendar.createMany({ data: records, skipDuplicates: true });
    return { created: records.length };
  }

  // ==================== DECLARACION METHODS ====================
  async getAllDeclaraciones() {
    return await prisma.declaraciones.findMany({
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: 'desc' }
    });
  }

  async getDeclaracion(id: string) {
    return await prisma.declaraciones.findUnique({
      where: { id },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }

  async getDeclaracionesByObligacion(obligacion_id: string) {
    return await prisma.declaraciones.findMany({
      where: { obligacion_id },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: 'desc' }
    });
  }

  async getDeclaracionesByCliente(cliente_id: string) {
    return await prisma.declaraciones.findMany({
      where: {
        obligaciones_fiscales: {
          cliente_id
        }
      },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: 'desc' }
    });
  }

  async createDeclaracion(data: any) {
    return await prisma.declaraciones.create({
      data,
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }

  async updateDeclaracion(id: string, data: any) {
    return await prisma.declaraciones.update({
      where: { id },
      data,
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }

  async deleteDeclaracion(id: string) {
    await prisma.declaraciones.delete({
      where: { id }
    });
    return true;
  }

  // ==================== TASK METHODS ====================
  async getAllTasks(): Promise<Task[]> {
    const tasks = await prisma.tasks.findMany();
    return tasks.map(mapPrismaTask);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const task = await prisma.tasks.findUnique({ where: { id } });
    return task ? mapPrismaTask(task) : undefined;
  }

  async createTask(insertTask: any): Promise<Task> {
    const task = await prisma.tasks.create({
      data: {
        id: randomUUID(),
        titulo: insertTask.titulo,
        descripcion: insertTask.descripcion,
        clients: insertTask.clienteId ? { connect: { id: insertTask.clienteId } } : undefined,
        users: insertTask.asignadoA ? { connect: { id: insertTask.asignadoA } } : undefined,
        prioridad: insertTask.prioridad as any,
        estado: insertTask.estado as any,
        visibilidad: insertTask.visibilidad as any,
        fecha_vencimiento: insertTask.fechaVencimiento,
        fecha_actualizacion: new Date(),
      },
    });
    return mapPrismaTask(task);
  }

  async updateTask(id: string, updateData: any): Promise<Task | undefined> {
    try {
      const task = await prisma.tasks.update({
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
      await prisma.tasks.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== MANUAL METHODS ====================
  async getAllManuals(): Promise<Manual[]> {
    const manuals = await prisma.manuals.findMany();
    return manuals.map(mapPrismaManual);
  }

  async getManual(id: string): Promise<Manual | undefined> {
    const manual = await prisma.manuals.findUnique({ where: { id } });
    return manual ? mapPrismaManual(manual) : undefined;
  }

  async createManual(insertManual: any): Promise<Manual> {
    const autorId = insertManual.autorId ?? insertManual.autor_id ?? insertManual.authorId;
    if (!autorId) {
      throw new Error('Autor del manual no especificado');
    }

    const etiquetasValue = Array.isArray(insertManual.etiquetas) && insertManual.etiquetas.length > 0
      ? JSON.stringify(insertManual.etiquetas)
      : null;

    const manual = await prisma.manuals.create({
      data: {
        id: randomUUID(),
        titulo: insertManual.titulo ?? 'Sin título',
        contenido_html: insertManual.contenidoHtml ?? '',
        autor_id: autorId,
        etiquetas: etiquetasValue,
        categoria: insertManual.categoria ?? null,
        status: insertManual.publicado ? 'PUBLISHED' : 'DRAFT',
        fecha_publicacion: insertManual.publicado ? new Date() : null,
        fecha_actualizacion: new Date(),
      },
    });
    return mapPrismaManual(manual);
  }

  async updateManual(id: string, updateData: any): Promise<Manual | undefined> {
    try {
      const data: any = {};
      
      if (updateData.titulo !== undefined) data.titulo = updateData.titulo;
      if (updateData.contenidoHtml !== undefined) data.contenido_html = updateData.contenidoHtml ?? '';
      if (updateData.categoria !== undefined) data.categoria = updateData.categoria ?? null;
      
      if (updateData.etiquetas !== undefined) {
        data.etiquetas = Array.isArray(updateData.etiquetas) && updateData.etiquetas.length > 0
          ? JSON.stringify(updateData.etiquetas)
          : null;
      }
      
      if (updateData.publicado !== undefined) {
        data.status = updateData.publicado ? 'PUBLISHED' : 'DRAFT';
        data.fecha_publicacion = updateData.publicado ? new Date() : null;
      }

      if (updateData.autorId !== undefined || updateData.autor_id !== undefined) {
        data.autor_id = updateData.autorId ?? updateData.autor_id;
      }

      data.fecha_actualizacion = new Date();
      
      const manual = await prisma.manuals.update({
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
      const result = await prisma.manuals.deleteMany({ where: { id } });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  // ==================== MANUAL ATTACHMENT METHODS ====================
  async getManualAttachment(id: string): Promise<ManualAttachment | undefined> {
    const attachment = await prisma.manual_attachments.findUnique({ where: { id } });
    return attachment ? mapPrismaManualAttachment(attachment) : undefined;
  }

  async createManualAttachment(insertAttachment: InsertManualAttachment): Promise<ManualAttachment> {
    const attachment = await prisma.manual_attachments.create({
      data: {
        id: randomUUID(),
        manuals: { connect: { id: insertAttachment.manualId } },
        fileName: insertAttachment.fileName,
        original_name: insertAttachment.originalName,
        filePath: insertAttachment.filePath,
        file_type: insertAttachment.fileType,
        fileSize: insertAttachment.fileSize,
        uploaded_by: insertAttachment.uploadedBy,
      },
    });
    return mapPrismaManualAttachment(attachment);
  }

  async deleteManualAttachment(id: string): Promise<boolean> {
    try {
      await prisma.manual_attachments.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async getManualAttachments(manualId: string): Promise<ManualAttachment[]> {
    const attachments = await prisma.manual_attachments.findMany({
      where: { manualId },
      orderBy: { uploaded_at: 'desc' },
    });
    return attachments.map(mapPrismaManualAttachment);
  }

  // ==================== MANUAL VERSION METHODS ====================
  async getManualVersion(id: string): Promise<ManualVersion | undefined> {
    const version = await prisma.manual_versions.findUnique({ where: { id } });
    return version ? mapPrismaManualVersion(version) : undefined;
  }

  async createManualVersion(insertVersion: InsertManualVersion): Promise<ManualVersion> {
    const version = await prisma.manual_versions.create({
      data: {
        id: randomUUID(),
        manuals: { connect: { id: insertVersion.manualId } },
        versionNumber: insertVersion.versionNumber,
        titulo: insertVersion.titulo,
        contenido_html: insertVersion.contenidoHtml,
        etiquetas: insertVersion.etiquetas ? JSON.stringify(insertVersion.etiquetas) : null,
        categoria: insertVersion.categoria,
        createdBy: insertVersion.createdBy,
      },
    });
    return mapPrismaManualVersion(version);
  }

  async getManualVersions(manualId: string): Promise<ManualVersion[]> {
    const versions = await prisma.manual_versions.findMany({
      where: { manualId },
      orderBy: { versionNumber: 'desc' },
    });
    return versions.map(mapPrismaManualVersion);
  }

  async getNextVersionNumber(manualId: string): Promise<number> {
    const lastVersion = await prisma.manual_versions.findFirst({
      where: { manualId },
      orderBy: { versionNumber: 'desc' },
    });
    return lastVersion ? lastVersion.versionNumber + 1 : 1;
  }

  async restoreManualVersion(manualId: string, versionId: string): Promise<Manual | undefined> {
    const version = await prisma.manual_versions.findUnique({ where: { id: versionId } });
    if (!version) return undefined;

    const manual = await prisma.manuals.update({
      where: { id: manualId },
      data: {
        titulo: version.titulo,
        contenido_html: version.contenido_html,
        etiquetas: version.etiquetas,
        categoria: version.categoria,
      },
    });
    return mapPrismaManual(manual);
  }

  // ==================== ACTIVITY LOG METHODS ====================
  async createActivityLog(insertLog: any): Promise<ActivityLog> {
    // TODO: Legacy method - needs proper Prisma relation syntax
    const log = await prisma.activity_logs.create({
      data: {
        id: randomUUID(),
        users: { connect: { id: insertLog.usuarioId } },
        accion: insertLog.accion,
        modulo: insertLog.modulo,
        detalles: insertLog.detalles,
        fecha: new Date(),
      },
    });
    return mapPrismaActivityLog(log);
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    const logs = await prisma.activity_logs.findMany({
      orderBy: { fecha: 'desc' },
    });
    return logs.map(mapPrismaActivityLog);
  }

  // ==================== AUDIT TRAIL METHODS ====================
  async createAuditEntry(insertAudit: any): Promise<AuditTrail> {
    // TODO: Legacy method - needs proper Prisma relation syntax
    const audit = await prisma.audit_trail.create({
      data: {
        id: randomUUID(),
        users: { connect: { id: insertAudit.usuarioId } },
        accion: insertAudit.accion as any,
        tabla: insertAudit.tabla,
        registroId: insertAudit.registroId,
        valorAnterior: insertAudit.valorAnterior,
        valorNuevo: insertAudit.valorNuevo,
        cambios: insertAudit.cambios,
        fecha: new Date(),
      },
    });
    return mapPrismaAuditTrail(audit);
  }

  async getAllAuditEntries(): Promise<AuditTrail[]> {
    const audits = await prisma.audit_trail.findMany({
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  async getAuditEntriesByTable(tabla: string): Promise<AuditTrail[]> {
    const audits = await prisma.audit_trail.findMany({
      where: { tabla },
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  async getAuditEntriesByRecord(tabla: string, registroId: string): Promise<AuditTrail[]> {
    const audits = await prisma.audit_trail.findMany({
      where: { tabla, registroId },
      orderBy: { fecha: 'desc' },
    });
    return audits.map(mapPrismaAuditTrail);
  }

  async getAuditEntriesByUser(usuarioId: string): Promise<AuditTrail[]> {
    const audits = await prisma.audit_trail.findMany({
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
    return await prisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true,
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
    return await prisma.roles.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permissions: true,
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
    return await prisma.roles.create({
      data: {
        id: randomUUID(),
        name: data.name,
        description: data.description,
        is_system: false,
        updatedAt: new Date(),
      },
    });
  }

  async updateRole(id: string, data: { name?: string; description?: string }) {
    return await prisma.roles.update({
      where: { id },
      data,
    });
  }

  async deleteRole(id: string) {
    // Verificar que no sea un rol del sistema
    const role = await prisma.roles.findUnique({ where: { id } });
    if (role?.is_system) {
      throw new Error('No se pueden eliminar roles del sistema');
    }
    
    return await prisma.roles.delete({ where: { id } });
  }

  async getAllPermissions() {
    return await prisma.permissions.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Eliminar permisos antiguos
    await prisma.role_permissions.deleteMany({
      where: { roleId },
    });

    // Crear nuevos permisos
    if (permissionIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: permissionIds.map(permissionId => ({
          id: randomUUID(),
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return await this.getRoleById(roleId);
  }

  async getUserPermissions(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user?.roles) {
      return [];
    }

    return user.roles.role_permissions.map(rp => rp.permissions);
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.resource === resource && p.action === action);
  }

  // ==================== SYSTEM SETTINGS ====================
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const settings = await prisma.system_settings.findFirst();
    if (!settings) return undefined;
    
    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt,
    };
  }

  async updateSystemSettings(data: any): Promise<SystemSettings> {
    // Obtener o crear settings
    let settings = await prisma.system_settings.findFirst();
    
    if (!settings) {
      // Crear registro inicial
      settings = await prisma.system_settings.create({
        data: ({
          registrationEnabled: data?.registration_enabled ?? true,
        } as any),
      });
    } else {
      // Actualizar existente
      settings = await prisma.system_settings.update({
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
  private mapSMTPAccount(account: any) {
    if (!account) return null;
    return {
      id: account.id,
      nombre: account.nombre,
      host: account.host,
      port: account.port,
      user: account.user,
      password: decryptPassword(account.password),
      isPredeterminada: account.is_predeterminada,
      activa: account.activa,
      creadaPor: account.creada_por,
      fechaCreacion: account.fecha_creacion,
    };
  }

  async getSMTPAccount(id: string) {
    const account = await prisma.smtp_accounts.findUnique({ where: { id } });
    return this.mapSMTPAccount(account);
  }

  async getAllSMTPAccounts() {
    const accounts = await prisma.smtp_accounts.findMany({
      orderBy: { fecha_creacion: 'desc' },
    });
    return accounts.map((account) => this.mapSMTPAccount(account));
  }

  async getDefaultSMTPAccount() {
    const account = await prisma.smtp_accounts.findFirst({
      where: { is_predeterminada: true, activa: true },
    });
    return this.mapSMTPAccount(account);
  }

  async createSMTPAccount(account: any) {
    const portValue = typeof account.port === 'string' ? parseInt(account.port, 10) : account.port;
    const encryptedAccount = {
      id: randomUUID(),
      nombre: account.nombre,
      host: account.host,
      port: portValue,
      user: account.user,
      password: encryptPassword(account.password),
      is_predeterminada: account.isPredeterminada ?? false,
      activa: account.activa ?? true,
      creada_por: account.creadaPor ?? null,
    };

    const createdAccount = await prisma.$transaction(async (tx) => {
      if (encryptedAccount.is_predeterminada) {
        await tx.smtp_accounts.updateMany({
          where: { is_predeterminada: true },
          data: { is_predeterminada: false },
        });
      }

      return await tx.smtp_accounts.create({ data: encryptedAccount });
    });

    return this.mapSMTPAccount(createdAccount);
  }

  async updateSMTPAccount(id: string, account: any) {
    const updateData: Record<string, any> = {};
    if (account.nombre !== undefined) updateData.nombre = account.nombre;
    if (account.host !== undefined) updateData.host = account.host;
    if (account.port !== undefined) {
      updateData.port = typeof account.port === 'string' ? parseInt(account.port, 10) : account.port;
    }
    if (account.user !== undefined) updateData.user = account.user;
    if (account.password) {
      updateData.password = encryptPassword(account.password);
    }
    if (account.isPredeterminada !== undefined) {
      updateData.is_predeterminada = account.isPredeterminada;
    }
    if (account.activa !== undefined) {
      updateData.activa = account.activa;
    }
    if (account.creadaPor !== undefined) {
      updateData.creada_por = account.creadaPor;
    }

    const updatedAccount = await prisma.$transaction(async (tx) => {
      if (updateData.is_predeterminada) {
        await tx.smtp_accounts.updateMany({
          where: { is_predeterminada: true, id: { not: id } },
          data: { is_predeterminada: false },
        });
      }

      return await tx.smtp_accounts.update({
        where: { id },
        data: updateData,
      });
    });

    return this.mapSMTPAccount(updatedAccount);
  }

  async deleteSMTPAccount(id: string) {
    await prisma.smtp_accounts.delete({ where: { id } });
    return true;
  }

  // ==================== NOTIFICATION TEMPLATES ====================
  async getNotificationTemplate(id: string) {
    return await prisma.notification_templates.findUnique({ where: { id } });
  }

  async getAllNotificationTemplates() {
    return await prisma.notification_templates.findMany({
      orderBy: { fecha_creacion: 'desc' },
      include: { users: { select: { username: true } } },
    });
  }

  async createNotificationTemplate(template: any) {
    return await prisma.notification_templates.create({ data: template });
  }

  async updateNotificationTemplate(id: string, template: any) {
    return await prisma.notification_templates.update({
      where: { id },
      data: template,
    });
  }

  async deleteNotificationTemplate(id: string) {
    await prisma.notification_templates.delete({ where: { id } });
    return true;
  }

  // ==================== NOTIFICATION LOGS ====================
  async getNotificationLog(id: string) {
    return await prisma.notification_logs.findUnique({
      where: { id },
      include: {
        notification_templates: true,
        smtp_accounts: true,
        users: { select: { username: true } },
      },
    });
  }

  async getAllNotificationLogs() {
    return await prisma.notification_logs.findMany({
      orderBy: { fecha_envio: 'desc' },
      include: {
        notification_templates: { select: { nombre: true } },
        smtp_accounts: { select: { nombre: true } },
        users: { select: { username: true } },
      },
    });
  }

  async createNotificationLog(log: any) {
    return await prisma.notification_logs.create({ data: log });
  }

  // ==================== SCHEDULED NOTIFICATIONS ====================
  async getScheduledNotification(id: string) {
    return await prisma.scheduled_notifications.findUnique({
      where: { id },
      include: {
        notification_templates: true,
        smtp_accounts: true,
        users: { select: { username: true } },
      },
    });
  }

  async getAllScheduledNotifications() {
    return await prisma.scheduled_notifications.findMany({
      orderBy: { fecha_programada: 'asc' },
      include: {
        notification_templates: { select: { nombre: true } },
        smtp_accounts: { select: { nombre: true } },
        users: { select: { username: true } },
      },
    });
  }

  async getPendingScheduledNotifications() {
    return await prisma.scheduled_notifications.findMany({
      where: {
        estado: 'PENDIENTE',
        fecha_programada: { lte: new Date() },
      },
      include: {
        notification_templates: true,
        smtp_accounts: true,
      },
    });
  }

  async createScheduledNotification(notification: any) {
    return await prisma.scheduled_notifications.create({ data: notification });
  }

  async updateScheduledNotification(id: string, notification: any) {
    return await prisma.scheduled_notifications.update({
      where: { id },
      data: notification,
    });
  }

  async deleteScheduledNotification(id: string) {
    await prisma.scheduled_notifications.delete({ where: { id } });
    return true;
  }
}

export const prismaStorage = new PrismaStorage();
export { prisma };
