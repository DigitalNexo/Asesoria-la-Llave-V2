/**
 * Servicio de Recibos
 * Gestión CRUD de recibos basado en el sistema BASU
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateReceiptDTO {
  numeroRecibo: string;
  fecha: Date | string;
  clienteId?: string;
  clienteNombre?: string;
  clienteNif?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcionServicios: string;
  importe: number;
  porcentajeIva?: number;
  notasAdicionales?: string;
  pagado?: boolean;
  fechaPago?: Date | string;
  formaPago?: string;
  creadoPor?: string;
}

export interface UpdateReceiptDTO {
  numeroRecibo?: string;
  fecha?: Date | string;
  clienteId?: string | null;
  clienteNombre?: string;
  clienteNif?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcionServicios?: string;
  importe?: number;
  porcentajeIva?: number | null;
  notasAdicionales?: string;
  pagado?: boolean;
  fechaPago?: Date | string | null;
  formaPago?: string;
}

export interface ReceiptFilters {
  clienteId?: string;
  pagado?: boolean;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
  search?: string;
}

export class ReceiptService {
  /**
   * Calcular totales del recibo
   */
  private calculateTotals(importe: number, porcentajeIva?: number) {
    let baseImponible: number | null = null;
    let total: number = importe;

    if (porcentajeIva && porcentajeIva > 0) {
      baseImponible = importe;
      const ivaAmount = (baseImponible * porcentajeIva) / 100;
      total = baseImponible + ivaAmount;
    }

    return {
      baseImponible,
      total,
    };
  }

  /**
   * Generar número de recibo automático
   */
  async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    // Buscar el último recibo del año
    const lastReceipt = await prisma.receipts.findFirst({
      where: {
        numeroRecibo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        numeroRecibo: 'desc',
      },
    });

    if (!lastReceipt) {
      return `${prefix}0001`;
    }

    // Extraer el número y sumar 1
    const lastNumber = parseInt(lastReceipt.numeroRecibo.split('-').pop() || '0');
    const newNumber = (lastNumber + 1).toString().padStart(4, '0');

    return `${prefix}${newNumber}`;
  }

  /**
   * Crear un nuevo recibo
   */
  async create(data: CreateReceiptDTO) {
    const { baseImponible, total } = this.calculateTotals(data.importe, data.porcentajeIva);

    const receipt = await prisma.receipts.create({
      data: {
        numeroRecibo: data.numeroRecibo,
        fecha: new Date(data.fecha),
        clienteId: data.clienteId,
        clienteNombre: data.clienteNombre,
        clienteNif: data.clienteNif,
        clienteDireccion: data.clienteDireccion,
        clienteEmail: data.clienteEmail,
        clienteTelefono: data.clienteTelefono,
        descripcionServicios: data.descripcionServicios,
        importe: new Prisma.Decimal(data.importe),
        porcentajeIva: data.porcentajeIva ? new Prisma.Decimal(data.porcentajeIva) : null,
        baseImponible: baseImponible !== null ? new Prisma.Decimal(baseImponible) : null,
        total: new Prisma.Decimal(total),
        notasAdicionales: data.notasAdicionales,
        pagado: data.pagado || false,
        fechaPago: data.fechaPago ? new Date(data.fechaPago) : null,
        formaPago: data.formaPago,
        creadoPor: data.creadoPor,
      },
      include: {
        cliente: true,
      },
    });

    return receipt;
  }

  /**
   * Obtener todos los recibos con filtros
   */
  async findAll(filters?: ReceiptFilters) {
    const where: Prisma.receiptsWhereInput = {};

    if (filters?.clienteId) {
      where.clienteId = filters.clienteId;
    }

    if (filters?.pagado !== undefined) {
      where.pagado = filters.pagado;
    }

    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.fecha = {};
      if (filters.fechaDesde) {
        where.fecha.gte = new Date(filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        where.fecha.lte = new Date(filters.fechaHasta);
      }
    }

    if (filters?.search) {
      where.OR = [
        { numeroRecibo: { contains: filters.search } },
        { clienteNombre: { contains: filters.search } },
        { clienteNif: { contains: filters.search } },
        { descripcionServicios: { contains: filters.search } },
        {
          cliente: {
            OR: [
              { razonSocial: { contains: filters.search } },
              { nifCif: { contains: filters.search } },
            ],
          },
        },
      ];
    }

    const receipts = await prisma.receipts.findMany({
      where,
      include: {
        cliente: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    return receipts;
  }

  /**
   * Obtener un recibo por ID
   */
  async findById(id: string) {
    const receipt = await prisma.receipts.findUnique({
      where: { id },
      include: {
        cliente: true,
      },
    });

    if (!receipt) {
      throw new Error('Recibo no encontrado');
    }

    return receipt;
  }

  /**
   * Actualizar un recibo
   */
  async update(id: string, data: UpdateReceiptDTO) {
    // Verificar que existe
    await this.findById(id);

    // Si se actualiza el importe o IVA, recalcular totales
    let baseImponible: Prisma.Decimal | null | undefined;
    let total: Prisma.Decimal | undefined;

    if (data.importe !== undefined || data.porcentajeIva !== undefined) {
      const currentReceipt = await prisma.receipts.findUnique({
        where: { id },
        select: { importe: true, porcentajeIva: true },
      });

      const newImporte = data.importe !== undefined ? data.importe : Number(currentReceipt!.importe);
      const newIva = data.porcentajeIva !== undefined ? data.porcentajeIva : (currentReceipt!.porcentajeIva ? Number(currentReceipt!.porcentajeIva) : undefined);

      const calculated = this.calculateTotals(newImporte, newIva);
      baseImponible = calculated.baseImponible !== null ? new Prisma.Decimal(calculated.baseImponible) : null;
      total = new Prisma.Decimal(calculated.total);
    }

    const updateData: Prisma.receiptsUpdateInput = {};

    if (data.numeroRecibo !== undefined) updateData.numeroRecibo = data.numeroRecibo;
    if (data.fecha !== undefined) updateData.fecha = new Date(data.fecha);
    if (data.clienteId !== undefined) updateData.clienteId = data.clienteId;
    if (data.clienteNombre !== undefined) updateData.clienteNombre = data.clienteNombre;
    if (data.clienteNif !== undefined) updateData.clienteNif = data.clienteNif;
    if (data.clienteDireccion !== undefined) updateData.clienteDireccion = data.clienteDireccion;
    if (data.clienteEmail !== undefined) updateData.clienteEmail = data.clienteEmail;
    if (data.clienteTelefono !== undefined) updateData.clienteTelefono = data.clienteTelefono;
    if (data.descripcionServicios !== undefined) updateData.descripcionServicios = data.descripcionServicios;
    if (data.importe !== undefined) updateData.importe = new Prisma.Decimal(data.importe);
    if (data.porcentajeIva !== undefined) updateData.porcentajeIva = data.porcentajeIva !== null ? new Prisma.Decimal(data.porcentajeIva) : null;
    if (baseImponible !== undefined) updateData.baseImponible = baseImponible;
    if (total !== undefined) updateData.total = total;
    if (data.notasAdicionales !== undefined) updateData.notasAdicionales = data.notasAdicionales;
    if (data.pagado !== undefined) updateData.pagado = data.pagado;
    if (data.fechaPago !== undefined) updateData.fechaPago = data.fechaPago !== null ? new Date(data.fechaPago) : null;
    if (data.formaPago !== undefined) updateData.formaPago = data.formaPago;

    const receipt = await prisma.receipts.update({
      where: { id },
      data: updateData,
      include: {
        cliente: true,
      },
    });

    return receipt;
  }

  /**
   * Eliminar un recibo
   */
  async delete(id: string) {
    await this.findById(id);
    await prisma.receipts.delete({
      where: { id },
    });
  }

  /**
   * Marcar como pagado
   */
  async markAsPaid(id: string, formaPago: string, fechaPago?: Date | string) {
    return this.update(id, {
      pagado: true,
      formaPago,
      fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
    });
  }

  /**
   * Obtener estadísticas de recibos
   */
  async getStats() {
    const [totalRecibos, recibos Pagados, recibosPendientes, totalImporte, totalCobrado, totalPendiente] =
      await Promise.all([
        prisma.receipts.count(),
        prisma.receipts.count({ where: { pagado: true } }),
        prisma.receipts.count({ where: { pagado: false } }),
        prisma.receipts.aggregate({
          _sum: { total: true },
        }),
        prisma.receipts.aggregate({
          where: { pagado: true },
          _sum: { total: true },
        }),
        prisma.receipts.aggregate({
          where: { pagado: false },
          _sum: { total: true },
        }),
      ]);

    return {
      totalRecibos,
      recibosPagados,
      recibosPendientes,
      totalImporte: Number(totalImporte._sum.total || 0),
      totalCobrado: Number(totalCobrado._sum.total || 0),
      totalPendiente: Number(totalPendiente._sum.total || 0),
    };
  }
}

export const receiptService = new ReceiptService();
