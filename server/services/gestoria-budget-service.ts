import { PrismaClient, gestoria_budgets } from '@prisma/client';
import { gestoriaBudgetCalculationService, BudgetCalculationInput } from './gestoria-budget-calculation-service';

const prisma = new PrismaClient();

export interface CreateBudgetInput {
  // Tipo de gestoría
  tipoGestoria: 'OFICIAL' | 'ONLINE';
  
  // Datos del cliente potencial
  nombreCliente: string;
  nifCif: string;
  email: string;
  telefono?: string;
  direccion?: string;
  personaContacto?: string;
  facturacion: number;
  facturasMes: number;
  nominasMes?: number;
  sistemaTributacion: string;
  periodoDeclaraciones: string;
  
  // Modelos fiscales
  modelo303?: boolean;
  modelo111?: boolean;
  modelo115?: boolean;
  modelo130?: boolean;
  modelo100?: boolean;
  modelo349?: boolean;
  modelo347?: boolean;
  
  // Servicios adicionales fijos
  solicitudCertificados?: boolean;
  censosAEAT?: boolean;
  recepcionNotificaciones?: boolean;
  estadisticasINE?: boolean;
  solicitudAyudas?: boolean;
  
  // Laborales
  conLaboralSocial?: boolean;
  
  // Descuentos
  aplicaDescuento?: boolean;
  tipoDescuento?: 'PORCENTAJE' | 'FIJO';
  valorDescuento?: number;
  
  // Usuario
  creadoPor: string;
  configId: string;
  
  // Servicios adicionales dinámicos
  serviciosAdicionales?: Array<{
    nombre: string;
    precio: number;
    tipoServicio: 'MENSUAL' | 'PUNTUAL';
    incluido: boolean;
  }>;
}

export interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  // Status updates
  estado?: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'FACTURADO';
  motivoRechazo?: string;
}

export interface BudgetFilters {
  tipoGestoria?: 'OFICIAL' | 'ONLINE';
  estado?: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'FACTURADO';
  nombreCliente?: string;
  nifCif?: string;
  email?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

/**
 * Servicio principal para gestión de presupuestos
 */
export class GestoriaBudgetService {
  
  /**
   * Crear nuevo presupuesto
   */
  async createBudget(input: CreateBudgetInput): Promise<gestoria_budgets> {
    // Validaciones
    this.validateBudgetInput(input);
    
    // Generar número de presupuesto
    const numero = await gestoriaBudgetCalculationService.generateBudgetNumber();
    
    // Calcular totales
    const calculationInput: BudgetCalculationInput = {
      facturasMes: input.facturasMes,
      nominasMes: input.nominasMes,
      facturacion: input.facturacion,
      sistemaTributacion: input.sistemaTributacion,
      periodoDeclaraciones: input.periodoDeclaraciones,
      modelo303: input.modelo303,
      modelo111: input.modelo111,
      modelo115: input.modelo115,
      modelo130: input.modelo130,
      modelo100: input.modelo100,
      modelo349: input.modelo349,
      modelo347: input.modelo347,
      solicitudCertificados: input.solicitudCertificados,
      censosAEAT: input.censosAEAT,
      recepcionNotificaciones: input.recepcionNotificaciones,
      estadisticasINE: input.estadisticasINE,
      solicitudAyudas: input.solicitudAyudas,
      conLaboralSocial: input.conLaboralSocial,
      aplicaDescuento: input.aplicaDescuento,
      tipoDescuento: input.tipoDescuento,
      valorDescuento: input.valorDescuento,
      serviciosAdicionales: input.serviciosAdicionales
    };
    
    const calculation = await gestoriaBudgetCalculationService.calculate(
      calculationInput,
      input.tipoGestoria
    );
    
    // Crear presupuesto
    const budget = await prisma.gestoria_budgets.create({
      data: {
        numero,
        tipoGestoria: input.tipoGestoria,
        estado: 'BORRADOR', // Cambiado de PENDIENTE
        
        // Cliente
        nombreCliente: input.nombreCliente,
        nifCif: input.nifCif || null,
        email: input.email,
        telefono: input.telefono || null,
        direccion: input.direccion || null,
        personaContacto: input.personaContacto || null,
        
        // Negocio
        facturacion: input.facturacion,
        facturasMes: input.facturasMes,
        nominasMes: input.nominasMes || null,
        sistemaTributacion: input.sistemaTributacion,
        periodoDeclaraciones: input.periodoDeclaraciones,
        
        // Modelos
        modelo303: input.modelo303 || false,
        modelo111: input.modelo111 || false,
        modelo115: input.modelo115 || false,
        modelo130: input.modelo130 || false,
        modelo100: input.modelo100 || false,
        modelo349: input.modelo349 || false,
        modelo347: input.modelo347 || false,
        
        // Servicios adicionales fijos
        solicitudCertificados: input.solicitudCertificados || false,
        censosAEAT: input.censosAEAT || false,
        recepcionNotificaciones: input.recepcionNotificaciones || false,
        estadisticasINE: input.estadisticasINE || false,
        solicitudAyudas: input.solicitudAyudas || false,
        
        // Laborales
        conLaboralSocial: input.conLaboralSocial || false,
        
        // Descuentos
        aplicaDescuento: input.aplicaDescuento || false,
        tipoDescuento: input.tipoDescuento || null,
        valorDescuento: input.valorDescuento || null,
        
        // Totales
        totalContabilidad: calculation.totalContabilidad,
        totalLaboral: calculation.totalLaboral,
        descuentoCalculado: calculation.descuentoCalculado,
        totalFinal: calculation.totalFinal,
        
        // Metadata
        creadoPor: input.creadoPor,
        configId: input.configId,
        fechaCreacion: new Date()
      }
    });
    
    // Crear servicios adicionales si existen
    if (input.serviciosAdicionales && input.serviciosAdicionales.length > 0) {
      await prisma.gestoria_budget_additional_services.createMany({
        data: input.serviciosAdicionales.map(servicio => ({
          budgetId: budget.id,
          nombre: servicio.nombre,
          precio: servicio.precio,
          tipoServicio: servicio.tipoServicio,
          incluido: servicio.incluido
        }))
      });
    }
    
    // Registrar evento de creación
    await this.logStatisticsEvent('CREATED', budget.id, budget.tipoGestoria);
    
    return budget;
  }
  
  /**
   * Obtener presupuesto por ID
   */
  async getBudgetById(id: string) {
    const budget = await prisma.gestoria_budgets.findUnique({
      where: { id },
      include: {
        serviciosAdicionales: true,
        configuracion: true
      }
    });
    
    if (!budget) {
      throw new Error(`Presupuesto con ID ${id} no encontrado`);
    }
    
    return budget;
  }
  
  /**
   * Listar presupuestos con filtros
   */
  async listBudgets(filters: BudgetFilters = {}) {
    const where: any = {};
    
    if (filters.tipoGestoria) {
      where.tipoGestoria = filters.tipoGestoria;
    }
    
    if (filters.estado) {
      where.estado = filters.estado;
    }
    
    if (filters.nombreCliente) {
      where.nombreCliente = {
        contains: filters.nombreCliente
      };
    }
    
    if (filters.nifCif) {
      where.nifCif = {
        contains: filters.nifCif
      };
    }
    
    if (filters.email) {
      where.email = {
        contains: filters.email
      };
    }
    
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaCreacion = {};
      if (filters.fechaDesde) {
        where.fechaCreacion.gte = filters.fechaDesde;
      }
      if (filters.fechaHasta) {
        where.fechaCreacion.lte = filters.fechaHasta;
      }
    }
    
    const budgets = await prisma.gestoria_budgets.findMany({
      where,
      include: {
        serviciosAdicionales: true
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
    
    return budgets;
  }
  
  /**
   * Actualizar presupuesto
   */
  async updateBudget(id: string, input: UpdateBudgetInput): Promise<gestoria_budgets> {
    // Validar que el presupuesto existe
    const existing = await this.getBudgetById(id);
    
    // No permitir editar presupuestos aceptados o convertidos a cliente
    if (existing.estado === 'ACEPTADO' && existing.clienteId) {
      throw new Error('No se puede editar un presupuesto que ya fue aceptado y convertido a cliente');
    }
    
    // Si hay cambios en los datos que afectan el cálculo, recalcular
    const needsRecalculation = this.checkIfNeedsRecalculation(input);
    
    let updatedTotals: any = {};
    
    if (needsRecalculation) {
      const calculationInput: BudgetCalculationInput = {
        facturasMes: input.facturasMes ?? existing.facturasMes,
        nominasMes: input.nominasMes ?? existing.nominasMes ?? undefined,
        facturacion: input.facturacion ?? Number(existing.facturacion),
        sistemaTributacion: input.sistemaTributacion ?? existing.sistemaTributacion,
        periodoDeclaraciones: input.periodoDeclaraciones ?? existing.periodoDeclaraciones,
        modelo303: input.modelo303 ?? existing.modelo303,
        modelo111: input.modelo111 ?? existing.modelo111,
        modelo115: input.modelo115 ?? existing.modelo115,
        modelo130: input.modelo130 ?? existing.modelo130,
        modelo100: input.modelo100 ?? existing.modelo100,
        modelo349: input.modelo349 ?? existing.modelo349,
        modelo347: input.modelo347 ?? existing.modelo347,
        solicitudCertificados: input.solicitudCertificados ?? existing.solicitudCertificados,
        censosAEAT: input.censosAEAT ?? existing.censosAEAT,
        recepcionNotificaciones: input.recepcionNotificaciones ?? existing.recepcionNotificaciones,
        estadisticasINE: input.estadisticasINE ?? existing.estadisticasINE,
        solicitudAyudas: input.solicitudAyudas ?? existing.solicitudAyudas,
        conLaboralSocial: input.conLaboralSocial ?? existing.conLaboralSocial,
        aplicaDescuento: input.aplicaDescuento ?? existing.aplicaDescuento,
        tipoDescuento: (input.tipoDescuento as any) ?? (existing.tipoDescuento as any) ?? undefined,
        valorDescuento: input.valorDescuento ?? (existing.valorDescuento ? Number(existing.valorDescuento) : undefined)
      };
      
      const calculation = await gestoriaBudgetCalculationService.calculate(
        calculationInput,
        existing.tipoGestoria
      );
      
      updatedTotals = {
        totalContabilidad: calculation.totalContabilidad,
        totalLaboral: calculation.totalLaboral,
        subtotal: calculation.subtotal,
        descuentoCalculado: calculation.descuentoCalculado,
        totalFinal: calculation.totalFinal
      };
    }
    
    // Actualizar presupuesto
    const updated = await prisma.gestoria_budgets.update({
      where: { id },
      data: {
        ...this.buildUpdateData(input),
        ...updatedTotals,
        fechaModificacion: new Date()
      },
      include: {
        serviciosAdicionales: true
      }
    });
    
    // Si se actualizaron servicios adicionales, reemplazarlos
    if (input.serviciosAdicionales) {
      await prisma.gestoria_budget_additional_services.deleteMany({
        where: { budgetId: id }
      });
      
      if (input.serviciosAdicionales.length > 0) {
        await prisma.gestoria_budget_additional_services.createMany({
          data: input.serviciosAdicionales.map(servicio => ({
            budgetId: id,
            nombre: servicio.nombre,
            precio: servicio.precio,
            tipoServicio: servicio.tipoServicio
          }))
        });
      }
    }
    
    return updated;
  }
  
  /**
   * Marcar presupuesto como aceptado
   */
  async acceptBudget(id: string): Promise<gestoria_budgets> {
    const budget = await this.getBudgetById(id);
    
    if (budget.estado !== 'BORRADOR') {
      throw new Error(`El presupuesto debe estar en estado PENDIENTE para ser aceptado`);
    }
    
    const updated = await prisma.gestoria_budgets.update({
      where: { id },
      data: {
        estado: 'ACEPTADO',
        fechaAceptacion: new Date()
      }
    });
    
    await this.logStatisticsEvent('ACCEPTED', id, budget.tipoGestoria);
    
    return updated;
  }
  
  /**
   * Marcar presupuesto como rechazado
   */
  async rejectBudget(id: string, motivoRechazo?: string): Promise<gestoria_budgets> {
    const budget = await this.getBudgetById(id);
    
    if (budget.estado !== 'BORRADOR') {
      throw new Error(`El presupuesto debe estar en estado PENDIENTE para ser rechazado`);
    }
    
    const updated = await prisma.gestoria_budgets.update({
      where: { id },
      data: {
        estado: 'RECHAZADO',
        fechaRechazo: new Date(),
        motivoRechazo: motivoRechazo || null
      }
    });
    
    await this.logStatisticsEvent('REJECTED', id, budget.tipoGestoria);
    
    return updated;
  }
  
  /**
   * Eliminar presupuesto
   */
  async deleteBudget(id: string): Promise<void> {
    const budget = await this.getBudgetById(id);
    
    // No permitir eliminar presupuestos aceptados que ya tienen cliente
    if (budget.estado === 'ACEPTADO' && budget.clienteId) {
      throw new Error('No se puede eliminar un presupuesto que ya fue convertido a cliente');
    }
    
    // Eliminar servicios adicionales
    await prisma.gestoria_budget_additional_services.deleteMany({
      where: { budgetId: id }
    });
    
    // Eliminar eventos de estadísticas
    await prisma.gestoria_budget_statistics_events.deleteMany({
      where: { budgetId: id }
    });
    
    // Eliminar presupuesto
    await prisma.gestoria_budgets.delete({
      where: { id }
    });
  }
  
  /**
   * Obtener estadísticas de presupuestos
   */
  async getStatistics(tipo?: 'OFICIAL' | 'ONLINE', fechaDesde?: Date, fechaHasta?: Date) {
    const where: any = {};
    
    if (tipo) {
      where.tipoGestoria = tipo;
    }
    
    if (fechaDesde || fechaHasta) {
      where.fechaCreacion = {};
      if (fechaDesde) where.fechaCreacion.gte = fechaDesde;
      if (fechaHasta) where.fechaCreacion.lte = fechaHasta;
    }
    
    // Total de presupuestos
    const total = await prisma.gestoria_budgets.count({ where });
    
    // Por estado
    const porEstado = await prisma.gestoria_budgets.groupBy({
      by: ['estado'],
      where,
      _count: true
    });
    
    // Suma total de presupuestos
    const aggregates = await prisma.gestoria_budgets.aggregate({
      where,
      _sum: {
        totalFinal: true
      },
      _avg: {
        totalFinal: true
      }
    });
    
    // Tasa de conversión
    const pendientes = porEstado.find(e => e.estado === 'BORRADOR')?._count || 0;
    const aceptados = porEstado.find(e => e.estado === 'ACEPTADO')?._count || 0;
    const rechazados = porEstado.find(e => e.estado === 'RECHAZADO')?._count || 0;
    
    const tasaConversion = total > 0 ? (aceptados / total) * 100 : 0;
    
    return {
      total,
      pendientes,
      aceptados,
      rechazados,
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      valorTotal: aggregates._sum.totalFinal || 0,
      valorPromedio: aggregates._avg.totalFinal || 0,
      porEstado: porEstado.map(e => ({
        estado: e.estado,
        cantidad: e._count
      }))
    };
  }
  
  // ===== MÉTODOS PRIVADOS =====
  
  private validateBudgetInput(input: CreateBudgetInput): void {
    if (!input.nombreCliente || input.nombreCliente.trim().length === 0) {
      throw new Error('El nombre completo es obligatorio');
    }
    
    if (input.facturacion < 0) {
      throw new Error('La facturación no puede ser negativa');
    }
    
    if (input.facturasMes < 0) {
      throw new Error('El número de facturas no puede ser negativo');
    }
    
    if (input.nominasMes && input.nominasMes < 0) {
      throw new Error('El número de nóminas no puede ser negativo');
    }
    
    if (input.email && !this.isValidEmail(input.email)) {
      throw new Error('El formato del email no es válido');
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private calculateValidityDate(): Date {
    // Presupuesto válido por 30 días
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }
  
  private checkIfNeedsRecalculation(input: UpdateBudgetInput): boolean {
    const calculationFields = [
      'facturasMes', 'nominasMes', 'facturacion', 'sistemaTributacion', 'periodoDeclaraciones',
      'modelo303', 'modelo111', 'modelo115', 'modelo130', 'modelo100', 'modelo349', 'modelo347',
      'solicitudCertificados', 'censosAEAT', 'recepcionNotificaciones', 'estadisticasINE', 'solicitudAyudas',
      'conLaboralSocial', 'aplicaDescuento', 'tipoDescuento', 'valorDescuento', 'serviciosAdicionales'
    ];
    
    return calculationFields.some(field => field in input);
  }
  
  private buildUpdateData(input: UpdateBudgetInput): any {
    const data: any = {};
    
    // Campos simples
    const simpleFields = [
      'nombreCompleto', 'cifNif', 'email', 'telefono', 'direccion', 'codigoPostal', 'ciudad', 'provincia',
      'actividadEmpresarial', 'facturacion', 'facturasMes', 'nominasMes', 'sistemaTributacion', 'periodoDeclaraciones',
      'modelo303', 'modelo111', 'modelo115', 'modelo130', 'modelo100', 'modelo349', 'modelo347',
      'solicitudCertificados', 'censosAEAT', 'recepcionNotificaciones', 'estadisticasINE', 'solicitudAyudas',
      'conLaboralSocial', 'aplicaDescuento', 'tipoDescuento', 'valorDescuento', 'motivoDescuento',
      'observaciones', 'estado', 'motivoRechazo'
    ];
    
    for (const field of simpleFields) {
      if (field in input) {
        data[field] = (input as any)[field];
      }
    }
    
    return data;
  }
  
  private async logStatisticsEvent(evento: 'CREATED' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED', budgetId: string, tipoGestoria: 'OFICIAL' | 'ONLINE', userId?: string): Promise<void> {
    await prisma.gestoria_budget_statistics_events.create({
      data: {
        budgetId: budgetId,
        tipoGestoria: tipoGestoria,
        evento: evento,
        fecha: new Date()
      }
    });
  }
}

export const gestoriaBudgetService = new GestoriaBudgetService();
