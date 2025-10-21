import { PrismaClient, Prisma } from '@prisma/client';
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
  SystemSettings, InsertSystemSettings
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

function mapJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`);
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
    taxModel: assignment.taxModel ? mapPrismaTaxModelsConfig(assignment.taxModel) : null,
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

function formatPeriodLabel(period: any): string | null {
  if (!period) return null;
  if (period.quarter != null) {
    return `${period.quarter}T/${period.year}`;
  }
  if (period.label) {
    return `${period.label} ${period.year}`;
  }
  return `${period.year}`;
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
  status: string;
  notes: string | null;
  presentedAt: Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

function mapPrismaClient(client: any): any {
  return {
    id: client.id,
    razonSocial: client.razonSocial,
    nifCif: client.nifCif,
    tipo: (client.tipo || '').toUpperCase(),
    email: client.email,
    telefono: client.telefono,
    direccion: client.direccion,
    fechaAlta: client.fechaAlta,
    fechaBaja: client.fechaBaja,
    responsableAsignado: client.responsableAsignado,
    taxModels: client.taxModels || null,
    isActive: client.isActive ?? true,
    notes: client.notes ?? null,
    taxAssignments: client.taxAssignments ? client.taxAssignments.map(mapPrismaClientTaxAssignment) : [],
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
        },
        taxAssignments: {
          include: {
            taxModel: true
          }
        },
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
        },
        taxAssignments: {
          include: {
            taxModel: true
          }
        },
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
    const data: any = {
      razonSocial: insertClient.razonSocial,
      nifCif: insertClient.nifCif,
      tipo: (insertClient.tipo || '').toUpperCase() as any,
      email: insertClient.email ?? null,
      telefono: insertClient.telefono ?? null,
      direccion: insertClient.direccion ?? null,
      responsableAsignado: insertClient.responsableAsignado || null,
      taxModels: insertClient.taxModels || null,
      isActive: insertClient.isActive ?? true,
      notes: insertClient.notes ?? null,
    };

    if (insertClient.fechaAlta) {
      data.fechaAlta = new Date(insertClient.fechaAlta);
    }

    if (insertClient.fechaBaja !== undefined) {
      data.fechaBaja = insertClient.fechaBaja ? new Date(insertClient.fechaBaja) : null;
    }

    const client = await prisma.client.create({
      data,
      include: {
        taxAssignments: {
          include: { taxModel: true },
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
      
      const client = await prisma.client.update({
        where: { id },
        data,
        include: {
          taxAssignments: {
            include: { taxModel: true },
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
      await prisma.client.delete({ where: { id } });
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
          await prisma.taxModelsConfig.upsert({
            where: { code },
            create: {
              code,
              name: getTaxModelName(code),
              allowedTypes: rule.allowedTypes as unknown as Prisma.JsonArray,
              allowedPeriods: rule.allowedPeriods as unknown as Prisma.JsonArray,
              labels: rule.labels ? (rule.labels as unknown as Prisma.JsonArray) : undefined,
              isActive: true,
            },
            update: {
              name: getTaxModelName(code),
              allowedTypes: rule.allowedTypes as unknown as Prisma.JsonArray,
              allowedPeriods: rule.allowedPeriods as unknown as Prisma.JsonArray,
              labels: rule.labels ? (rule.labels as unknown as Prisma.JsonArray) : undefined,
              isActive: true,
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
    const configs = await prisma.taxModelsConfig.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return configs.map(mapPrismaTaxModelsConfig);
  }

  async getTaxModelConfig(code: string) {
    const config = await prisma.taxModelsConfig.findUnique({
      where: { code },
    });
    return config ? mapPrismaTaxModelsConfig(config) : null;
  }

  async findClientTaxAssignmentByCode(clientId: string, taxModelCode: string) {
    const assignment = await prisma.clientTaxAssignment.findFirst({
      where: {
        clientId,
        taxModelCode,
      },
      include: {
        taxModel: true,
      },
    });
    return assignment ? mapPrismaClientTaxAssignment(assignment) : null;
  }

  async getClientTaxAssignments(clientId: string) {
    const assignments = await prisma.clientTaxAssignment.findMany({
      where: { clientId },
      orderBy: [{ startDate: 'desc' }, { taxModelCode: 'asc' }],
      include: { taxModel: true },
    });
    return assignments.map(mapPrismaClientTaxAssignment);
  }

  async getClientTaxAssignment(id: string) {
    const assignment = await prisma.clientTaxAssignment.findUnique({
      where: { id },
      include: { taxModel: true },
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
    const assignment = await prisma.clientTaxAssignment.create({
      data: {
        clientId,
        taxModelCode: data.taxModelCode,
        periodicidad: data.periodicity,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        activeFlag: data.activeFlag ?? true,
        notes: data.notes ?? null,
      },
      include: {
        taxModel: true,
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
    const assignment = await prisma.clientTaxAssignment.update({
      where: { id },
      data: this.buildTaxAssignmentUpdateData(data),
      include: {
        taxModel: true,
      },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async deleteClientTaxAssignment(id: string) {
    const assignment = await prisma.clientTaxAssignment.delete({
      where: { id },
      include: { taxModel: true },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async softDeactivateClientTaxAssignment(id: string, endDate: Date) {
    const assignment = await prisma.clientTaxAssignment.update({
      where: { id },
      data: {
        endDate,
        activeFlag: false,
      },
      include: {
        taxModel: true,
      },
    });
    return mapPrismaClientTaxAssignment(assignment);
  }

  async hasAssignmentHistoricFilings(clientId: string, taxModelCode: string) {
    const count = await prisma.clientTaxFiling.count({
      where: {
        clientId,
        taxModelCode,
      },
    });
    return count > 0;
  }

  async getTaxAssignmentHistory(assignmentId: string) {
    const assignment = await prisma.clientTaxAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      return [];
    }

    const filings = await prisma.clientTaxFiling.findMany({
      where: {
        clientId: assignment.clientId,
        taxModelCode: assignment.taxModelCode,
      },
      include: {
        period: true,
      },
      orderBy: [
        { period: { year: 'desc' } },
        { period: { quarter: 'desc' } },
        { presentedAt: 'desc' },
      ],
    });

    return filings.map((filing) => ({
      id: filing.id,
      status: normalizeStatus(filing.status, true),
      rawStatus: filing.status,
      presentedAt: filing.presentedAt,
      notes: filing.notes,
      period: filing.period
        ? {
            id: filing.period.id,
            year: filing.period.year,
            quarter: filing.period.quarter,
            label: filing.period.label,
            startsAt: filing.period.startsAt,
            endsAt: filing.period.endsAt,
          }
        : null,
    }));
  }

  private async getTaxModelConfigMap(client: Prisma.PrismaClient | Prisma.TransactionClient) {
    const configs = await client.taxModelsConfig.findMany({ where: { isActive: true } });
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
      kind: Prisma.TaxPeriodType;
      startsAt: Date;
      endsAt: Date;
    }> = [];

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
        kind: Prisma.TaxPeriodType.QUARTERLY,
        startsAt,
        endsAt,
      });
    }

    // Annual period
    descriptors.push({
      label: "ANUAL",
      kind: Prisma.TaxPeriodType.ANNUAL,
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
        kind: Prisma.TaxPeriodType.SPECIAL,
        startsAt,
        endsAt,
      });
    });

    return descriptors;
  }

  private async generateFilingsForPeriods(
    client: Prisma.PrismaClient | Prisma.TransactionClient,
    periods: Array<{ id: string; kind: Prisma.TaxPeriodType; label: string; year: number }>
  ) {
    if (periods.length === 0) return;

    const assignments = await client.clientTaxAssignment.findMany({
      where: {
        activeFlag: true,
        endDate: null,
        client: { isActive: true },
      },
      include: {
        client: {
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

        await client.clientTaxFiling.upsert({
          where: {
            clientId_taxModelCode_periodId: {
              clientId: assignment.clientId,
              taxModelCode: assignment.taxModelCode,
              periodId: period.id,
            },
          },
          create: {
            clientId: assignment.clientId,
            taxModelCode: assignment.taxModelCode,
            periodId: period.id,
            status: Prisma.FilingStatus.NOT_STARTED,
          },
          update: {},
        });
      }
    }
  }

  private periodMatchesAssignment(
    period: { kind: Prisma.TaxPeriodType; label: string; year: number },
    assignment: any,
    configMap: Map<string, ReturnType<typeof mapPrismaTaxModelsConfig>>
  ) {
    if (!assignment.activeFlag || assignment.endDate) return false;
    const code = assignment.taxModelCode;
    const periodicity = (assignment.periodicidad || '').toUpperCase();
    const config = configMap.get(code);

    switch (period.kind) {
      case Prisma.TaxPeriodType.QUARTERLY:
        return periodicity === 'TRIMESTRAL';
      case Prisma.TaxPeriodType.ANNUAL:
        return periodicity === 'ANUAL';
      case Prisma.TaxPeriodType.SPECIAL:
        if (code !== '202') return false;
        if (!config?.labels || config.labels.length === 0) return true;
        return config.labels.some((label) => label.toLowerCase() === period.label.toLowerCase());
      default:
        return false;
    }
  }

  async getFiscalPeriodsSummary(year?: number): Promise<FiscalPeriodSummary[]> {
    const where: Prisma.fiscalPeriodWhereInput = {};
    if (year) where.year = year;

    const periods = await prisma.fiscalPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { startsAt: 'desc' }],
      include: {
        filings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return periods.map((period) => {
      const totals = period.filings.reduce(
        (acc, filing) => {
          const status = filing.status as Prisma.FilingStatus;
          acc.total += 1;
          if (status === Prisma.FilingStatus.NOT_STARTED) acc.notStarted += 1;
          if (status === Prisma.FilingStatus.IN_PROGRESS) acc.inProgress += 1;
          if (status === Prisma.FilingStatus.PRESENTED) acc.presented += 1;
          return acc;
        },
        { total: 0, notStarted: 0, inProgress: 0, presented: 0 }
      );

      return {
        id: period.id,
        year: period.year,
        quarter: period.quarter ?? null,
        label: period.label,
        kind: period.kind,
        status: period.status,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        lockedAt: period.lockedAt,
        totals,
      };
    });
  }

  async createFiscalYear(year: number): Promise<FiscalPeriodSummary[]> {
    const descriptors = this.periodDescriptorsForYear(year);
    const created: Prisma.fiscalPeriod[] = [];

    await prisma.$transaction(async (tx) => {
      for (const descriptor of descriptors) {
        const period = await tx.fiscalPeriod.upsert({
          where: {
            year_label: {
              year,
              label: descriptor.label,
            },
          },
          update: {
            startsAt: descriptor.startsAt,
            endsAt: descriptor.endsAt,
            kind: descriptor.kind,
            quarter: descriptor.quarter ?? null,
          },
          create: {
            year,
            quarter: descriptor.quarter ?? null,
            label: descriptor.label,
            kind: descriptor.kind,
            startsAt: descriptor.startsAt,
            endsAt: descriptor.endsAt,
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
        }))
      );
    });

    return this.getFiscalPeriodsSummary(year);
  }

  async createFiscalPeriod(data: {
    year: number;
    kind: Prisma.TaxPeriodType;
    label: string;
    quarter?: number | null;
    startsAt: Date;
    endsAt: Date;
  }): Promise<FiscalPeriodSummary> {
    const period = await prisma.fiscalPeriod.upsert({
      where: {
        year_label: {
          year: data.year,
          label: data.label,
        },
      },
      update: {
        quarter: data.quarter ?? null,
        kind: data.kind,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
      create: {
        year: data.year,
        quarter: data.quarter ?? null,
        label: data.label,
        kind: data.kind,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
    });

    await this.generateFilingsForPeriods(prisma, [
      { id: period.id, kind: period.kind, label: period.label, year: period.year },
    ]);

    const summaries = await this.getFiscalPeriodsSummary(data.year);
    return summaries.find((item) => item.id === period.id) ?? summaries[0];
  }

  async getTaxFilings(filters: TaxFilingsFilters): Promise<TaxFilingRecord[]> {
    const where: Prisma.clientTaxFilingWhereInput = {};
    if (filters.periodId) where.periodId = filters.periodId;
    if (filters.status) where.status = filters.status as Prisma.FilingStatus;
    if (filters.model) where.taxModelCode = filters.model;
    if (filters.search) {
      where.client = {
        razonSocial: { contains: filters.search, mode: 'insensitive' },
      };
    }

    const filings = await prisma.clientTaxFiling.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            responsable: {
              select: {
                username: true,
              },
            },
          },
        },
        period: true,
        assignee: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ period: { startsAt: 'desc' } }, { client: { razonSocial: 'asc' } }],
    });

    return filings.map((filing) => ({
      id: filing.id,
      clientId: filing.clientId,
      clientName: filing.client?.razonSocial ?? "",
      nifCif: filing.client?.nifCif ?? "",
      gestorId: filing.client?.responsableAsignado ?? null,
      gestorName: filing.client?.responsable?.username ?? null,
      taxModelCode: filing.taxModelCode,
      periodId: filing.periodId,
      periodLabel: formatPeriodLabel(filing.period),
      status: filing.status,
      notes: filing.notes ?? null,
      presentedAt: filing.presentedAt ?? null,
      assigneeId: filing.assignee?.id ?? null,
      assigneeName: filing.assignee?.username ?? null,
    }));
  }

  async updateTaxFiling(
    id: string,
    data: {
      status?: Prisma.FilingStatus;
      notes?: string | null;
      presentedAt?: Date | null;
      assigneeId?: string | null;
    },
    options: { allowClosed?: boolean } = {}
  ) {
    const filing = await prisma.clientTaxFiling.findUnique({
      where: { id },
      include: {
        period: true,
      },
    });

    if (!filing) {
      throw new Error("Declaración no encontrada");
    }

    if (filing.period?.status === Prisma.PeriodStatus.CLOSED && !options.allowClosed) {
      throw new Error("El periodo está cerrado. Solo un administrador puede modificarlo.");
    }

    const updated = await prisma.clientTaxFiling.update({
      where: { id },
      data: {
        status: data.status ?? filing.status,
        notes: data.notes !== undefined ? data.notes : filing.notes,
        presentedAt: data.presentedAt !== undefined ? data.presentedAt : filing.presentedAt,
        assigneeId: data.assigneeId !== undefined ? data.assigneeId : filing.assigneeId,
      },
      include: {
        client: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            responsable: { select: { username: true } },
          },
        },
        period: true,
        assignee: { select: { id: true, username: true } },
      },
    });

    return {
      id: updated.id,
      clientId: updated.clientId,
      clientName: updated.client?.razonSocial ?? "",
      nifCif: updated.client?.nifCif ?? "",
      gestorId: updated.client?.responsableAsignado ?? null,
      gestorName: updated.client?.responsable?.username ?? null,
      taxModelCode: updated.taxModelCode,
      periodId: updated.periodId,
      periodLabel: formatPeriodLabel(updated.period),
      status: updated.status,
      notes: updated.notes ?? null,
      presentedAt: updated.presentedAt ?? null,
      assigneeId: updated.assignee?.id ?? null,
      assigneeName: updated.assignee?.username ?? null,
    } as TaxFilingRecord;
  }

  async toggleFiscalPeriodStatus(
    id: string,
    status: Prisma.PeriodStatus,
    userId?: string
  ) {
    const updates: Prisma.fiscalPeriodUpdateInput = {
      status,
    };

    if (status === Prisma.PeriodStatus.CLOSED) {
      updates.lockedAt = new Date();
      updates.closedBy = userId ?? null;
    } else {
      updates.lockedAt = null;
      updates.closedBy = null;
    }

    return prisma.fiscalPeriod.update({
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
    const clientWhere: Prisma.ClientWhereInput = {};

    if (type) {
      clientWhere.tipo = type.toString().toUpperCase() as any;
    }

    if (gestorId) {
      clientWhere.responsableAsignado = gestorId;
    }

    const clients = await prisma.client.findMany({
      where: clientWhere,
      orderBy: { razonSocial: 'asc' },
      include: {
        responsable: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        taxAssignments: {
          include: { taxModel: true },
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

    const periodWhere: Prisma.fiscalPeriodWhereInput = {};
    if (selectedYear) {
      periodWhere.year = selectedYear;
    }
    if (parsedQuarter !== null) {
      periodWhere.quarter = parsedQuarter;
    }

    const fiscalPeriods = await prisma.fiscalPeriod.findMany({
      where: periodWhere,
      select: {
        id: true,
        year: true,
        quarter: true,
        endsAt: true,
        label: true,
      },
    });

    const periodIds = fiscalPeriods.map((period) => period.id);

    const filingWhere: Prisma.clientTaxFilingWhereInput = {};
    if (periodIds.length > 0) {
      filingWhere.periodId = { in: periodIds };
    } else if (selectedYear) {
      filingWhere.period = { year: selectedYear };
    }

    const filings = await prisma.clientTaxFiling.findMany({
      where: filingWhere,
      include: {
        period: true,
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

      const existingDate = existing.filing.period?.endsAt
        ? new Date(existing.filing.period.endsAt).getTime()
        : 0;
      const candidateDate = filing.period?.endsAt ? new Date(filing.period.endsAt).getTime() : 0;

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

      for (const assignment of client.taxAssignments) {
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
          statusUpdatedAt: filing?.presentedAt ?? filing?.period?.endsAt ?? null,
          filingId: filing?.id ?? null,
          periodId: filing?.periodId ?? null,
          periodLabel: formatPeriodLabel(filing?.period),
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
        gestorName: client.responsable?.username ?? null,
        gestorEmail: client.responsable?.email ?? null,
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
    const obligaciones = await prisma.obligacionFiscal.findMany({
      where: {
        activo: true,
        OR: [
          { fechaFin: null },
          { fechaFin: { gte: startOfYear } },
        ],
        fechaInicio: { lte: endOfYear },
      },
      include: { impuesto: true, cliente: true },
    });

    let created = 0;
    let skipped = 0;

    for (const ob of obligaciones) {
      const modelCode = ob.impuesto?.modelo || null;
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

      const periods = await prisma.taxCalendar.findMany({ where, select: { id: true } });

      for (const p of periods) {
        const exists = await prisma.declaracion.findFirst({
          where: { obligacionId: ob.id, taxCalendarId: p.id },
          select: { id: true },
        });
        if (exists) {
          skipped++;
          continue;
        }
        await prisma.declaracion.create({
          data: {
            obligacionId: ob.id,
            taxCalendarId: p.id,
            estado: 'PENDIENTE',
          },
        });
        created++;
      }
    }

    return { year, obligaciones: obligaciones.length, created, skipped };
  }

  // ==================== IMPUESTO METHODS ====================
  async getAllImpuestos() {
    return await prisma.impuesto.findMany({
      orderBy: { modelo: 'asc' }
    });
  }

  async getImpuesto(id: string) {
    return await prisma.impuesto.findUnique({
      where: { id }
    });
  }

  async getImpuestoByModelo(modelo: string) {
    return await prisma.impuesto.findUnique({
      where: { modelo }
    });
  }

  async createImpuesto(data: { modelo: string; nombre: string; descripcion?: string | null }) {
    return await prisma.impuesto.create({
      data
    });
  }

  async updateImpuesto(id: string, data: { modelo?: string; nombre?: string; descripcion?: string | null }) {
    return await prisma.impuesto.update({
      where: { id },
      data
    });
  }

  async deleteImpuesto(id: string) {
    await prisma.impuesto.delete({
      where: { id }
    });
    return true;
  }

  // ==================== OBLIGACION FISCAL METHODS ====================
  async getAllObligacionesFiscales() {
    return await prisma.obligacionFiscal.findMany({
      include: {
        cliente: true,
        impuesto: true
      },
      orderBy: { fechaAsignacion: 'desc' }
    });
  }

  async getObligacionFiscal(id: string) {
    return await prisma.obligacionFiscal.findUnique({
      where: { id },
      include: {
        cliente: true,
        impuesto: true
      }
    });
  }

  async getObligacionesByCliente(clienteId: string) {
    return await prisma.obligacionFiscal.findMany({
      where: { clienteId },
      include: {
        cliente: true,
        impuesto: true
      },
      orderBy: { fechaAsignacion: 'desc' }
    });
  }

  async createObligacionFiscal(data: any) {
    return await prisma.obligacionFiscal.create({
      data,
      include: {
        cliente: true,
        impuesto: true
      }
    });
  }

  async updateObligacionFiscal(id: string, data: any) {
    return await prisma.obligacionFiscal.update({
      where: { id },
      data,
      include: {
        cliente: true,
        impuesto: true
      }
    });
  }

  async deleteObligacionFiscal(id: string) {
    await prisma.obligacionFiscal.delete({
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

    return await prisma.taxCalendar.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { modelCode: "asc" },
        { period: "asc" },
      ],
    });
  }

  async getTaxCalendar(id: string) {
    return await prisma.taxCalendar.findUnique({
      where: { id },
    });
  }

  async createTaxCalendar(data: any) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const derived = calculateDerivedFields(startDate, endDate);

    return await prisma.taxCalendar.create({
      data: {
        ...data,
        startDate,
        endDate,
        ...derived,
      },
    });
  }

  async updateTaxCalendar(id: string, data: any) {
    const existing = await prisma.taxCalendar.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Tax calendar entry not found");
    }

    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    const derived = calculateDerivedFields(startDate, endDate);

    return await prisma.taxCalendar.update({
      where: { id },
      data: {
        ...data,
        startDate,
        endDate,
        ...derived,
      },
    });
  }

  async deleteTaxCalendar(id: string) {
    await prisma.taxCalendar.delete({
      where: { id },
    });
    return true;
  }

  async cloneTaxCalendarYear(year: number) {
    const items = await prisma.taxCalendar.findMany({
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
        period: item.period,
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
        prisma.taxCalendar.create({ data })
      )
    );

    return created;
  }

  // ==================== DECLARACION METHODS ====================
  async getAllDeclaraciones() {
    return await prisma.declaracion.findMany({
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      },
      orderBy: { fechaPresentacion: 'desc' }
    });
  }

  async getDeclaracion(id: string) {
    return await prisma.declaracion.findUnique({
      where: { id },
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      }
    });
  }

  async getDeclaracionesByObligacion(obligacionId: string) {
    return await prisma.declaracion.findMany({
      where: { obligacionId },
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      },
      orderBy: { fechaPresentacion: 'desc' }
    });
  }

  async getDeclaracionesByCliente(clienteId: string) {
    return await prisma.declaracion.findMany({
      where: {
        obligacion: {
          clienteId
        }
      },
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      },
      orderBy: { fechaPresentacion: 'desc' }
    });
  }

  async createDeclaracion(data: any) {
    return await prisma.declaracion.create({
      data,
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      }
    });
  }

  async updateDeclaracion(id: string, data: any) {
    return await prisma.declaracion.update({
      where: { id },
      data,
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      }
    });
  }

  async deleteDeclaracion(id: string) {
    await prisma.declaracion.delete({
      where: { id }
    });
    return true;
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

  async createTask(insertTask: any): Promise<Task> {
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

  async updateTask(id: string, updateData: any): Promise<Task | undefined> {
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

  async createManual(insertManual: any): Promise<Manual> {
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

  async updateManual(id: string, updateData: any): Promise<Manual | undefined> {
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
  async createActivityLog(insertLog: any): Promise<ActivityLog> {
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
  async createAuditEntry(insertAudit: any): Promise<AuditTrail> {
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

  async updateSystemSettings(data: any): Promise<SystemSettings> {
    // Obtener o crear settings
    let settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
      // Crear registro inicial
      settings = await prisma.systemSettings.create({
        data: ({
          registrationEnabled: data?.registrationEnabled ?? true,
        } as any),
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
