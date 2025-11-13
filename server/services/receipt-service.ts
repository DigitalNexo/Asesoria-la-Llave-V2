/**
 * Servicio de Recibos
 * Gestión CRUD de recibos basado en el sistema BASU
 * ACTUALIZADO: Campos corregidos para coincidir con schema.prisma
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateReceiptDTO {
  numero: string;
  year: number;
  sequential: number;
  client_id?: string;
  recipient_name: string;
  recipient_nif: string;
  recipient_email: string;
  recipient_address?: string;
  concepto: string;
  base_imponible: number;
  iva_porcentaje?: number;
  notes?: string;
  status?: string; // BORRADOR, ENVIADO, ARCHIVADO
  created_by: string;
}

export interface UpdateReceiptDTO {
  numero?: string;
  client_id?: string | null;
  recipient_name?: string;
  recipient_nif?: string;
  recipient_email?: string;
  recipient_address?: string;
  concepto?: string;
  base_imponible?: number;
  iva_porcentaje?: number | null;
  notes?: string;
  status?: string;
  sent_at?: Date | string | null;
  sent_by?: string | null;
}

export interface ReceiptFilters {
  client_id?: string;
  status?: string;
  yearFrom?: number;
  yearTo?: number;
  search?: string;
}

export class ReceiptService {
  /**
   * Calcular totales del recibo
   */
  private calculateTotals(base_imponible: number, iva_porcentaje?: number) {
    const baseImponible = base_imponible;
    let ivaImporte = 0;
    let total = baseImponible;

    if (iva_porcentaje && iva_porcentaje > 0) {
      ivaImporte = (baseImponible * iva_porcentaje) / 100;
      total = baseImponible + ivaImporte;
    }

    return {
      base_imponible: baseImponible,
      iva_importe: ivaImporte,
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
        numero: {
          startsWith: prefix,
        },
      },
      orderBy: {
        numero: 'desc',
      },
    });

    if (!lastReceipt) {
      return `${prefix}0001`;
    }

    // Extraer el número y sumar 1
    const lastNumber = parseInt(lastReceipt.numero.split('-').pop() || '0');
    const newNumber = (lastNumber + 1).toString().padStart(4, '0');

    return `${prefix}${newNumber}`;
  }

  /**
   * Crear un nuevo recibo
   */
  async create(data: CreateReceiptDTO) {
    const { base_imponible, iva_importe, total } = this.calculateTotals(
      data.base_imponible, 
      data.iva_porcentaje
    );

    // Generar ID único
    const id = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const receipt = await prisma.receipts.create({
      data: {
        id,
        numero: data.numero,
        year: data.year,
        sequential: data.sequential,
        ...(data.client_id && {
          clients: {
            connect: { id: data.client_id }
          }
        }),
        recipient_name: data.recipient_name,
        recipient_nif: data.recipient_nif,
        recipient_email: data.recipient_email,
        recipient_address: data.recipient_address,
        concepto: data.concepto,
        base_imponible: new Prisma.Decimal(base_imponible),
        iva_porcentaje: data.iva_porcentaje ? new Prisma.Decimal(data.iva_porcentaje) : new Prisma.Decimal(21),
        iva_importe: new Prisma.Decimal(iva_importe),
        total: new Prisma.Decimal(total),
        notes: data.notes,
        status: data.status || 'BORRADOR',
        creator: {
          connect: { id: data.created_by }
        },
      },
      include: {
        clients: true,
      },
    });

    return receipt;
  }

  /**
   * Obtener todos los recibos con filtros
   */
  async findAll(filters?: ReceiptFilters) {
    const where: Prisma.receiptsWhereInput = {};

    if (filters?.client_id) {
      where.client_id = filters.client_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.yearFrom || filters?.yearTo) {
      where.year = {};
      if (filters.yearFrom) {
        where.year.gte = filters.yearFrom;
      }
      if (filters.yearTo) {
        where.year.lte = filters.yearTo;
      }
    }

    if (filters?.search) {
      where.OR = [
        { numero: { contains: filters.search } },
        { recipient_name: { contains: filters.search } },
        { recipient_nif: { contains: filters.search } },
        { concepto: { contains: filters.search } },
        {
          clients: {
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
        clients: true,
      },
      orderBy: {
        created_at: 'desc',
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
        clients: true,
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

    // Si se actualiza el base_imponible o IVA, recalcular totales
    let iva_importe: Prisma.Decimal | undefined;
    let total: Prisma.Decimal | undefined;

    if (data.base_imponible !== undefined || data.iva_porcentaje !== undefined) {
      const currentReceipt = await prisma.receipts.findUnique({
        where: { id },
        select: { base_imponible: true, iva_porcentaje: true },
      });

      const newBaseImponible = data.base_imponible !== undefined 
        ? data.base_imponible 
        : Number(currentReceipt!.base_imponible);
      const newIva = data.iva_porcentaje !== undefined 
        ? data.iva_porcentaje 
        : Number(currentReceipt!.iva_porcentaje);

      const calculated = this.calculateTotals(newBaseImponible, newIva);
      iva_importe = new Prisma.Decimal(calculated.iva_importe);
      total = new Prisma.Decimal(calculated.total);
    }

    const updateData: Prisma.receiptsUpdateInput = {};

    if (data.numero !== undefined) updateData.numero = data.numero;
    if (data.client_id !== undefined) {
      if (data.client_id === null) {
        updateData.clients = { disconnect: true };
      } else {
        updateData.clients = { connect: { id: data.client_id } };
      }
    }
    if (data.recipient_name !== undefined) updateData.recipient_name = data.recipient_name;
    if (data.recipient_nif !== undefined) updateData.recipient_nif = data.recipient_nif;
    if (data.recipient_email !== undefined) updateData.recipient_email = data.recipient_email;
    if (data.recipient_address !== undefined) updateData.recipient_address = data.recipient_address;
    if (data.concepto !== undefined) updateData.concepto = data.concepto;
    if (data.base_imponible !== undefined) updateData.base_imponible = new Prisma.Decimal(data.base_imponible);
    if (data.iva_porcentaje !== undefined) updateData.iva_porcentaje = data.iva_porcentaje !== null ? new Prisma.Decimal(data.iva_porcentaje) : new Prisma.Decimal(21);
    if (iva_importe !== undefined) updateData.iva_importe = iva_importe;
    if (total !== undefined) updateData.total = total;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sent_at !== undefined) updateData.sent_at = data.sent_at !== null ? new Date(data.sent_at) : null;
    if (data.sent_by !== undefined) {
      if (data.sent_by === null) {
        updateData.sender = { disconnect: true };
      } else {
        updateData.sender = { connect: { id: data.sent_by } };
      }
    }

    const receipt = await prisma.receipts.update({
      where: { id },
      data: updateData,
      include: {
        clients: true,
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
   * Marcar como enviado
   */
  async markAsSent(id: string, sent_by: string) {
    return this.update(id, {
      status: 'ENVIADO',
      sent_at: new Date(),
      sent_by,
    });
  }

  /**
   * Obtener estadísticas de recibos
   */
  async getStats() {
    const [totalRecibos, recibosBorrador, recibosEnviados, recibosArchivados, totalImporte, totalEnviado, totalBorrador] =
      await Promise.all([
        prisma.receipts.count(),
        prisma.receipts.count({ where: { status: 'BORRADOR' } }),
        prisma.receipts.count({ where: { status: 'ENVIADO' } }),
        prisma.receipts.count({ where: { status: 'ARCHIVADO' } }),
        prisma.receipts.aggregate({
          _sum: { total: true },
        }),
        prisma.receipts.aggregate({
          where: { status: 'ENVIADO' },
          _sum: { total: true },
        }),
        prisma.receipts.aggregate({
          where: { status: 'BORRADOR' },
          _sum: { total: true },
        }),
      ]);

    return {
      totalRecibos,
      recibosBorrador,
      recibosEnviados,
      recibosArchivados,
      totalImporte: Number(totalImporte._sum.total || 0),
      totalEnviado: Number(totalEnviado._sum.total || 0),
      totalBorrador: Number(totalBorrador._sum.total || 0),
    };
  }
}

export const receiptService = new ReceiptService();
