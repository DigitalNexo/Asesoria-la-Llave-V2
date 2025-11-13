import { PrismaClient } from '@prisma/client';
import TaxCalendarService from './tax-calendar.service';
import ClientTaxService from './client-tax.service';

const prisma = new PrismaClient();

export class TaxObligationsService {
  /**
   * FUNCIÓN PRINCIPAL: Generar obligaciones automáticamente
   * 
   * Esta función:
   * 1. Obtiene todos los periodos ABIERTOS del calendario AEAT
   * 2. Para cada periodo, busca los clientes que tengan ese modelo activo
   * 3. Crea obligaciones automáticamente si no existen
   */
  async generateAutomaticObligations() {
    try {
      // 1. Obtener periodos ABIERTOS
      const openPeriods = await TaxCalendarService.getOpenPeriods();

      if (openPeriods.length === 0) {
        return {
          success: true,
          message: 'No hay periodos abiertos en el calendario AEAT',
          generated: 0,
        };
      }

      let totalGenerated = 0;
      const details: any[] = [];

      // 2. Para cada periodo abierto, generar obligaciones
      for (const period of openPeriods) {
        const result = await this.generateObligationsForPeriod(period.id);
        totalGenerated += result.generated;
        details.push({
          period: `${period.modelCode} - ${period.period} ${period.year}`,
          generated: result.generated,
          skipped: result.skipped,
        });
      }

      return {
        success: true,
        message: `Generadas ${totalGenerated} obligaciones automáticamente`,
        generated: totalGenerated,
        details,
      };
    } catch (error: any) {
      console.error('Error generando obligaciones automáticas:', error);
      throw new Error(`Error generando obligaciones: ${error.message}`);
    }
  }

  /**
   * Generar obligaciones para un periodo específico
   */
  async generateObligationsForPeriod(taxCalendarId: string) {
    // Obtener el periodo
    const period = await TaxCalendarService.getPeriodById(taxCalendarId);

    if (!period) {
      throw new Error('Periodo no encontrado');
    }

    // Validar que el periodo esté abierto por fechas
    const today = new Date();
    if (period.startDate > today || period.endDate < today) {
      return {
        generated: 0,
        skipped: 0,
        message: 'El periodo no está abierto (fuera del rango de fechas)',
      };
    }

    // Obtener la configuración del modelo de impuesto
    const taxModel = await prisma.tax_models_config.findFirst({
      where: { code: period.modelCode },
    });

    if (!taxModel) {
      throw new Error(`Modelo ${period.modelCode} no encontrado en tax_models_config`);
    }

    // Obtener clientes que tienen este modelo activo
    const clientsWithModel = await ClientTaxService.getClientsWithActiveModel(
      period.modelCode
    );

    let generated = 0;
    let skipped = 0;

    for (const clientTaxModel of clientsWithModel) {
      const client = clientTaxModel.clients;

      // Validación 1: Verificar que el tipo de cliente está permitido para este modelo
      let allowedCategories: string[] = [];
      try {
        allowedCategories = JSON.parse(taxModel.allowedTypes);
      } catch (e) {
        console.error('Error parsing allowedTypes:', e);
      }
      
      if (client.tipo && allowedCategories.length > 0 && !allowedCategories.includes(client.tipo)) {
        skipped++;
        continue;
      }

      // Validación 2: Verificar que el period_type del cliente coincide con el periodType del calendario
      if (clientTaxModel.period_type && period.periodType && 
          clientTaxModel.period_type !== period.periodType) {
        skipped++;
        continue;
      }

      // Verificar si ya existe una obligación para este cliente y periodo
      const existingObligation =
        await prisma.client_tax_obligations.findFirst({
          where: {
            client_id: client.id,
            tax_calendar_id: period.id,
          },
        });

      if (existingObligation) {
        skipped++;
        continue;
      }

      // Crear la obligación automáticamente
      await prisma.client_tax_obligations.create({
        data: {
          client_id: client.id,
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

      generated++;
    }

    return {
      generated,
      skipped,
      message: `Generadas ${generated} obligaciones, ${skipped} ya existían o no cumplieron validaciones`,
    };
  }

  /**
   * Generar obligaciones para un cliente específico
   * Busca todos los modelos activos del cliente y genera obligaciones
   * para los periodos ABIERTOS de esos modelos
   */
  async generateObligationsForClient(clientId: string) {
    try {
      // Obtener modelos activos del cliente
      const clientModels = await ClientTaxService.getActiveClientTaxModels(clientId);

      if (clientModels.length === 0) {
        return {
          success: true,
          message: 'El cliente no tiene modelos fiscales activos',
          generated: 0,
        };
      }

      let totalGenerated = 0;
      const details: any[] = [];

      // Para cada modelo del cliente, buscar periodos abiertos
      for (const model of clientModels) {
        const today = new Date();
        const openPeriods = await prisma.tax_calendar.findMany({
          where: {
            modelCode: model.model_number,
            startDate: { lte: today },
            endDate: { gte: today },
            active: true,
          },
        });

        let generatedForModel = 0;

        for (const period of openPeriods) {
          // Verificar si ya existe la obligación
          const existingObligation = await prisma.client_tax_obligations.findFirst({
            where: {
              client_id: clientId,
              tax_calendar_id: period.id,
            },
          });

          if (!existingObligation) {
            await prisma.client_tax_obligations.create({
              data: {
                client_id: clientId,
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

            generatedForModel++;
            totalGenerated++;
          }
        }

        if (generatedForModel > 0) {
          details.push({
            model: model.model_number,
            generated: generatedForModel,
          });
        }
      }

      return {
        success: true,
        message: `Generadas ${totalGenerated} obligaciones para el cliente`,
        generated: totalGenerated,
        details,
      };
    } catch (error: any) {
      console.error('Error generando obligaciones del cliente:', error);
      throw new Error(`Error generando obligaciones del cliente: ${error.message}`);
    }
  }

  /**
   * Obtener todas las obligaciones con filtros
   */
  async getObligations(filters?: {
    clientId?: string;
    status?: string;
    modelNumber?: string;
    year?: number;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  }) {
    const where: any = {};

    if (filters?.clientId) where.client_id = filters.clientId;
    if (filters?.status) where.status = filters.status;
    if (filters?.modelNumber) where.model_number = filters.modelNumber;
    if (filters?.year) where.year = filters.year;

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.due_date = {};
      if (filters.dueDateFrom) where.due_date.gte = filters.dueDateFrom;
      if (filters.dueDateTo) where.due_date.lte = filters.dueDateTo;
    }

    return await prisma.client_tax_obligations.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
          },
        },
        tax_calendar: {
          select: {
            id: true,
            modelCode: true,
            period: true,
            year: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        completed_by_user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: [{ due_date: 'asc' }, { model_number: 'asc' }],
    });
  }

  /**
   * Obtener obligaciones de periodos ABIERTOS
   * Esta es la función clave para mostrar las tarjetas automáticamente
   */
  async getObligationsFromOpenPeriods(clientId?: string) {
    const today = new Date();
    const where: any = {
      tax_calendar: {
        startDate: { lte: today },
        endDate: { gte: today },
        active: true,
      },
    };

    if (clientId) {
      where.client_id = clientId;
    }

    const obligations = await prisma.client_tax_obligations.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            tipo: true,
          },
        },
        tax_calendar: {
          select: {
            id: true,
            modelCode: true,
            period: true,
            year: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: [{ due_date: 'asc' }],
    });

    // Agregar cálculo de días restantes para cada obligación
    return obligations.map((obligation) => {
      const daysUntilStart = Math.ceil(
        (obligation.tax_calendar.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysUntilEnd = Math.ceil(
        (obligation.tax_calendar.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let statusMessage = '';
      if (daysUntilStart > 0) {
        statusMessage = `Empieza en ${daysUntilStart} día${daysUntilStart !== 1 ? 's' : ''}`;
      } else if (daysUntilEnd > 0) {
        statusMessage = `Finaliza en ${daysUntilEnd} día${daysUntilEnd !== 1 ? 's' : ''}`;
      } else {
        statusMessage = 'Finaliza hoy';
      }

      return {
        ...obligation,
        daysUntilStart,
        daysUntilEnd,
        statusMessage,
      };
    });
  }

  /**
   * Obtener una obligación por ID
   */
  async getObligationById(id: string) {
    return await prisma.client_tax_obligations.findUnique({
      where: { id },
      include: {
        clients: true,
        tax_calendar: true,
        completed_by_user: true,
      },
    });
  }

  /**
   * Actualizar una obligación
   */
  async updateObligation(
    id: string,
    data: {
      status?: string;
      amount?: number;
      notes?: string;
    }
  ) {
    return await prisma.client_tax_obligations.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Marcar una obligación como completada
   */
  async completeObligation(id: string, userId: string, amount?: number) {
    return await prisma.client_tax_obligations.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        completed_by: userId,
        amount: amount || undefined,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Marcar obligaciones como vencidas (OVERDUE)
   * Esta función debe ejecutarse diariamente por un cron job
   */
  async markOverdueObligations() {
    const now = new Date();

    const result = await prisma.client_tax_obligations.updateMany({
      where: {
        status: 'PENDING',
        due_date: { lt: now },
      },
      data: {
        status: 'OVERDUE',
        updated_at: now,
      },
    });

    return {
      success: true,
      updated: result.count,
      message: `${result.count} obligaciones marcadas como vencidas`,
    };
  }

  /**
   * Obtener estadísticas de obligaciones
   */
  async getObligationStats(clientId?: string) {
    const where: any = clientId ? { client_id: clientId } : {};

    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      prisma.client_tax_obligations.count({ where }),
      prisma.client_tax_obligations.count({
        where: { ...where, status: 'PENDING' },
      }),
      prisma.client_tax_obligations.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),
      prisma.client_tax_obligations.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      prisma.client_tax_obligations.count({
        where: { ...where, status: 'OVERDUE' },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }

  /**
   * Eliminar una obligación
   */
  async deleteObligation(id: string) {
    return await prisma.client_tax_obligations.delete({
      where: { id },
    });
  }
}

export default new TaxObligationsService();
