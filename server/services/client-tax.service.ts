import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ClientTaxService {
  /**
   * Obtener todos los modelos fiscales de un cliente
   */
  async getClientTaxModels(clientId: string) {
    return await prisma.client_tax_models.findMany({
      where: { client_id: clientId },
      orderBy: { model_number: 'asc' },
    });
  }

  /**
   * Obtener modelos activos de un cliente
   */
  async getActiveClientTaxModels(clientId: string) {
    return await prisma.client_tax_models.findMany({
      where: {
        client_id: clientId,
        is_active: true,
        OR: [
          { end_date: null }, // Sin fecha de fin (indefinido)
          { end_date: { gte: new Date() } }, // Fecha de fin mayor o igual a hoy
        ],
      },
      orderBy: { model_number: 'asc' },
    });
  }

  /**
   * Obtener un modelo fiscal específico de un cliente
   */
  async getClientTaxModel(id: string) {
    return await prisma.client_tax_models.findUnique({
      where: { id },
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
  }

  /**
   * Dar de alta un modelo fiscal para un cliente
   * IMPORTANTE: Al dar de alta un modelo, genera automáticamente obligaciones
   * para todos los periodos ABIERTOS de ese modelo
   */
  async createClientTaxModel(data: {
    client_id: string;
    model_number: string;
    period_type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
    start_date: Date;
    end_date?: Date;
    notes?: string;
  }) {
    // Verificar si ya existe este modelo para el cliente
    const existing = await prisma.client_tax_models.findFirst({
      where: {
        client_id: data.client_id,
        model_number: data.model_number,
      },
    });

    if (existing) {
      throw new Error(
        `El modelo ${data.model_number} ya está dado de alta para este cliente`
      );
    }

    // Crear el modelo
    const newModel = await prisma.client_tax_models.create({
      data: {
        ...data,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 🔥 GENERAR AUTOMÁTICAMENTE OBLIGACIONES PARA PERIODOS ABIERTOS
    // Buscar periodos ABIERTOS de este modelo
    const openPeriods = await prisma.tax_calendar.findMany({
      where: {
        modelCode: data.model_number,
        status: 'ABIERTO',
        active: true,
      },
    });

    // Para cada periodo abierto, crear la obligación si no existe
    for (const period of openPeriods) {
      const existingObligation = await prisma.client_tax_obligations.findFirst({
        where: {
          client_id: data.client_id,
          tax_calendar_id: period.id,
        },
      });

      if (!existingObligation) {
        await prisma.client_tax_obligations.create({
          data: {
            client_id: data.client_id,
            tax_calendar_id: period.id,
            model_number: period.modelCode,
            period: period.period,
            year: period.year,
            due_date: period.endDate,
            status: 'PENDING',
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }

    return newModel;
  }

  /**
   * Actualizar un modelo fiscal de un cliente
   */
  async updateClientTaxModel(
    id: string,
    data: {
      period_type?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
      start_date?: Date;
      end_date?: Date;
      is_active?: boolean;
      notes?: string;
    }
  ) {
    return await prisma.client_tax_models.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Activar/Desactivar un modelo fiscal
   * IMPORTANTE: Al activar un modelo, genera automáticamente obligaciones
   * para todos los periodos ABIERTOS de ese modelo
   */
  async toggleClientTaxModel(id: string, is_active: boolean) {
    // Obtener el modelo antes de actualizarlo
    const model = await prisma.client_tax_models.findUnique({
      where: { id },
    });

    if (!model) {
      throw new Error('Modelo fiscal no encontrado');
    }

    // Actualizar el estado
    const updatedModel = await prisma.client_tax_models.update({
      where: { id },
      data: {
        is_active,
        updated_at: new Date(),
      },
    });

    // 🔥 Si se está ACTIVANDO el modelo, generar obligaciones para periodos abiertos
    if (is_active && !model.is_active) {
      const openPeriods = await prisma.tax_calendar.findMany({
        where: {
          modelCode: model.model_number,
          status: 'ABIERTO',
          active: true,
        },
      });

      for (const period of openPeriods) {
        const existingObligation = await prisma.client_tax_obligations.findFirst({
          where: {
            client_id: model.client_id,
            tax_calendar_id: period.id,
          },
        });

        if (!existingObligation) {
          await prisma.client_tax_obligations.create({
            data: {
              client_id: model.client_id,
              tax_calendar_id: period.id,
              model_number: period.modelCode,
              period: period.period,
              year: period.year,
              due_date: period.endDate,
              status: 'PENDING',
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      }
    }

    return updatedModel;
  }

  /**
   * Eliminar un modelo fiscal de un cliente
   */
  async deleteClientTaxModel(id: string) {
    return await prisma.client_tax_models.delete({
      where: { id },
    });
  }

  /**
   * Obtener todos los clientes que tienen un modelo específico activo
   * Esta función es crucial para la generación automática de obligaciones
   */
  async getClientsWithActiveModel(modelNumber: string) {
    const now = new Date();

    return await prisma.client_tax_models.findMany({
      where: {
        model_number: modelNumber,
        is_active: true,
        start_date: { lte: now }, // Ya ha empezado
        OR: [
          { end_date: null }, // Sin fecha de fin
          { end_date: { gte: now } }, // Aún no ha terminado
        ],
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            email: true,
            responsableAsignado: true,
            tipo: true,
          },
        },
      },
    });
  }

  /**
   * Verificar si un cliente tiene un modelo activo
   */
  async clientHasActiveModel(clientId: string, modelNumber: string) {
    const now = new Date();

    const model = await prisma.client_tax_models.findFirst({
      where: {
        client_id: clientId,
        model_number: modelNumber,
        is_active: true,
        start_date: { lte: now },
        OR: [{ end_date: null }, { end_date: { gte: now } }],
      },
    });

    return !!model;
  }

  /**
   * Obtener estadísticas de modelos por cliente
   */
  async getClientTaxStats(clientId: string) {
    const total = await prisma.client_tax_models.count({
      where: { client_id: clientId },
    });

    const active = await prisma.client_tax_models.count({
      where: {
        client_id: clientId,
        is_active: true,
      },
    });

    const models = await prisma.client_tax_models.findMany({
      where: { client_id: clientId },
      select: { model_number: true, period_type: true, is_active: true },
    });

    return {
      total,
      active,
      inactive: total - active,
      models,
    };
  }
}

export default new ClientTaxService();
