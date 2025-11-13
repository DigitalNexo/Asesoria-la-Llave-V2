import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export class TaxCalendarService {
  /**
   * Obtener todos los periodos del calendario fiscal
   */
  async getAllPeriods(filters?: {
    year?: number;
    modelCode?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.year) where.year = filters.year;
    if (filters?.modelCode) where.modelCode = filters.modelCode;
    if (filters?.status) where.status = filters.status;

    return await prisma.tax_calendar.findMany({
      where,
      orderBy: [{ year: 'desc' }, { modelCode: 'asc' }, { period: 'asc' }],
    });
  }

  /**
   * Obtener periodos ABIERTOS (fecha actual entre startDate y endDate)
   * Estos son los periodos en los que se deben generar obligaciones automáticamente
   */
  async getOpenPeriods(modelCode?: string) {
    const today = new Date();
    const where: any = {
      startDate: { lte: today },
      endDate: { gte: today },
      active: true,
    };

    if (modelCode) {
      where.modelCode = modelCode;
    }

    return await prisma.tax_calendar.findMany({
      where,
      orderBy: [{ startDate: 'asc' }],
    });
  }

  /**
   * Obtener un periodo por ID
   */
  async getPeriodById(id: string) {
    return await prisma.tax_calendar.findUnique({
      where: { id },
    });
  }

  /**
   * Crear un nuevo periodo en el calendario fiscal
   */
  async createPeriod(data: {
    modelCode: string;
    period: string;
    year: number;
    startDate: Date;
    endDate: Date;
    status?: 'PENDIENTE' | 'ABIERTO' | 'CERRADO';
    days_to_start?: number;
    days_to_end?: number;
  }) {
    return await prisma.tax_calendar.create({
      data: {
        id: randomUUID(),
        ...data,
        status: data.status || 'PENDIENTE',
        active: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Actualizar un periodo existente
   */
  async updatePeriod(
    id: string,
    data: {
      status?: 'PENDIENTE' | 'ABIERTO' | 'CERRADO';
      startDate?: Date;
      endDate?: Date;
      active?: boolean;
      locked?: boolean;
      days_to_start?: number;
      days_to_end?: number;
    }
  ) {
    return await prisma.tax_calendar.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Cambiar el estado de un periodo (PENDIENTE -> ABIERTO -> CERRADO)
   * Cuando se abre un periodo, se deben generar automáticamente las obligaciones
   */
  async updatePeriodStatus(
    id: string,
    status: 'PENDIENTE' | 'ABIERTO' | 'CERRADO'
  ) {
    return await prisma.tax_calendar.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Eliminar un periodo (soft delete - marca como inactivo)
   */
  async deletePeriod(id: string) {
    return await prisma.tax_calendar.update({
      where: { id },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Obtener periodos por año
   */
  async getPeriodsByYear(year: number) {
    return await prisma.tax_calendar.findMany({
      where: { year },
      orderBy: [{ modelCode: 'asc' }, { period: 'asc' }],
    });
  }

  /**
   * Obtener periodos por modelo
   */
  async getPeriodsByModel(modelCode: string) {
    return await prisma.tax_calendar.findMany({
      where: { modelCode },
      orderBy: [{ year: 'desc' }, { period: 'asc' }],
    });
  }

  /**
   * Verificar si existe un periodo
   */
  async periodExists(modelCode: string, period: string, year: number) {
    const existing = await prisma.tax_calendar.findFirst({
      where: {
        modelCode,
        period,
        year,
      },
    });

    return !!existing;
  }
}

export default new TaxCalendarService();
