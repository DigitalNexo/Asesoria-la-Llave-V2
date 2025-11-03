import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface GestoriaBudgetConfig {
  id: string;
  tipo: 'OFICIAL' | 'ONLINE';
  nombre: string;
  activo: boolean;
  
  // Precios base
  precioBasePorFactura: number;
  precioBasePorNomina: number;
  
  // Porcentajes sistema tributario
  porcentajeRegimenGeneral: number;
  porcentajeModulos: number;
  porcentajeEDN: number;
  
  // Recargos período
  recargoPeriodoMensual: number;
  minimoMensual: number;
  
  // Precios modelos
  precioModelo303: number;
  precioModelo111: number;
  precioModelo115: number;
  precioModelo130: number;
  precioModelo100: number;
  precioModelo349: number;
  precioModelo347: number;
  
  // Servicios adicionales fijos
  precioCertificados: number;
  precioCensos: number;
  precioNotificaciones: number;
  precioEstadisticas: number;
  precioAyudas: number;
  
  // Datos de empresa
  nombreEmpresa: string;
  nifEmpresa: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  emailEmpresa: string;
  logoPath: string | null;
  colorPrimario: string;
  colorSecundario: string;
  
  fechaCreacion: Date;
  fechaModificacion: Date;
  creadoPor: string;
}

export interface CreateConfigInput {
  tipo: 'OFICIAL' | 'ONLINE';
  nombre: string;
  
  // Precios base
  precioBasePorFactura: number;
  precioBasePorNomina: number;
  
  // Porcentajes sistema tributario
  porcentajeRegimenGeneral: number;
  porcentajeModulos: number;
  porcentajeEDN: number;
  
  // Recargos período
  recargoPeriodoMensual: number;
  minimoMensual: number;
  
  // Precios modelos
  precioModelo303: number;
  precioModelo111: number;
  precioModelo115: number;
  precioModelo130: number;
  precioModelo100: number;
  precioModelo349: number;
  precioModelo347: number;
  
  // Servicios adicionales fijos
  precioCertificados: number;
  precioCensos: number;
  precioNotificaciones: number;
  precioEstadisticas: number;
  precioAyudas: number;
  
  // Datos de empresa
  nombreEmpresa: string;
  nifEmpresa: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  emailEmpresa: string;
  logoPath?: string | null;
  colorPrimario?: string;
  colorSecundario?: string;
  
  creadoPor: string;
}

export interface UpdateConfigInput extends Partial<CreateConfigInput> {
  activo?: boolean;
}

/**
 * Servicio para gestionar configuraciones de precios para presupuestos de gestorías
 */
export class GestoriaBudgetConfigService {
  
  /**
   * Obtener todas las configuraciones
   */
  async getAllConfigs(filters?: {
    tipo?: 'OFICIAL' | 'ONLINE';
    activo?: boolean;
  }): Promise<GestoriaBudgetConfig[]> {
    const where: Prisma.gestoria_budget_configurationsWhereInput = {};
    
    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }
    
    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }
    
    const configs = await prisma.gestoria_budget_configurations.findMany({
      where,
      orderBy: [
        { activo: 'desc' },
        { fechaCreacion: 'desc' }
      ]
    });
    
    return configs.map(this.mapPrismaToConfig);
  }
  
  /**
   * Obtener configuración activa por tipo
   */
  async getActiveConfig(tipo: 'OFICIAL' | 'ONLINE'): Promise<GestoriaBudgetConfig | null> {
    const config = await prisma.gestoria_budget_configurations.findFirst({
      where: {
        tipo,
        activo: true
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
    
    return config ? this.mapPrismaToConfig(config) : null;
  }
  
  /**
   * Obtener configuración por ID
   */
  async getConfigById(id: string): Promise<GestoriaBudgetConfig | null> {
    const config = await prisma.gestoria_budget_configurations.findUnique({
      where: { id }
    });
    
    return config ? this.mapPrismaToConfig(config) : null;
  }
  
  /**
   * Crear nueva configuración
   */
  async createConfig(input: CreateConfigInput): Promise<GestoriaBudgetConfig> {
    // Validar datos
    this.validateConfigInput(input);
    
    // Si se marca como activa, desactivar las anteriores del mismo tipo
    if (input.tipo) {
      await this.deactivatePreviousConfigs(input.tipo);
    }
    
    const config = await prisma.gestoria_budget_configurations.create({
      data: {
        tipo: input.tipo,
        nombre: input.nombre,
        activo: true,
        precioBasePorFactura: new Prisma.Decimal(input.precioBasePorFactura),
        precioBasePorNomina: new Prisma.Decimal(input.precioBasePorNomina),
        porcentajeRegimenGeneral: new Prisma.Decimal(input.porcentajeRegimenGeneral),
        porcentajeModulos: new Prisma.Decimal(input.porcentajeModulos),
        porcentajeEDN: new Prisma.Decimal(input.porcentajeEDN),
        recargoPeriodoMensual: new Prisma.Decimal(input.recargoPeriodoMensual),
        minimoMensual: new Prisma.Decimal(input.minimoMensual),
        precioModelo303: new Prisma.Decimal(input.precioModelo303),
        precioModelo111: new Prisma.Decimal(input.precioModelo111),
        precioModelo115: new Prisma.Decimal(input.precioModelo115),
        precioModelo130: new Prisma.Decimal(input.precioModelo130),
        precioModelo100: new Prisma.Decimal(input.precioModelo100),
        precioModelo349: new Prisma.Decimal(input.precioModelo349),
        precioModelo347: new Prisma.Decimal(input.precioModelo347),
        precioCertificados: new Prisma.Decimal(input.precioCertificados),
        precioCensos: new Prisma.Decimal(input.precioCensos),
        precioNotificaciones: new Prisma.Decimal(input.precioNotificaciones),
        precioEstadisticas: new Prisma.Decimal(input.precioEstadisticas),
        precioAyudas: new Prisma.Decimal(input.precioAyudas),
        nombreEmpresa: input.nombreEmpresa,
        nifEmpresa: input.nifEmpresa,
        direccionEmpresa: input.direccionEmpresa,
        telefonoEmpresa: input.telefonoEmpresa,
        emailEmpresa: input.emailEmpresa,
        logoPath: input.logoPath || null,
        colorPrimario: input.colorPrimario || '#1e40af',
        colorSecundario: input.colorSecundario || '#3b82f6',
        creadoPor: input.creadoPor
      }
    });
    
    return this.mapPrismaToConfig(config);
  }
  
  /**
   * Actualizar configuración existente
   */
  async updateConfig(id: string, input: UpdateConfigInput): Promise<GestoriaBudgetConfig> {
    // Verificar que existe
    const existing = await prisma.gestoria_budget_configurations.findUnique({
      where: { id }
    });
    
    if (!existing) {
      throw new Error('Configuración no encontrada');
    }
    
    // Validar datos parciales
    this.validateConfigInput(input, true);
    
    // Si se activa, desactivar las anteriores del mismo tipo
    if (input.activo === true && existing.tipo) {
      await this.deactivatePreviousConfigs(existing.tipo, id);
    }
    
    const data: any = {};
    
    // Mapear solo los campos que se envían
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.precioBasePorFactura !== undefined) data.precioBasePorFactura = new Prisma.Decimal(input.precioBasePorFactura);
    if (input.precioBasePorNomina !== undefined) data.precioBasePorNomina = new Prisma.Decimal(input.precioBasePorNomina);
    if (input.porcentajeRegimenGeneral !== undefined) data.porcentajeRegimenGeneral = new Prisma.Decimal(input.porcentajeRegimenGeneral);
    if (input.porcentajeModulos !== undefined) data.porcentajeModulos = new Prisma.Decimal(input.porcentajeModulos);
    if (input.porcentajeEDN !== undefined) data.porcentajeEDN = new Prisma.Decimal(input.porcentajeEDN);
    if (input.recargoPeriodoMensual !== undefined) data.recargoPeriodoMensual = new Prisma.Decimal(input.recargoPeriodoMensual);
    if (input.minimoMensual !== undefined) data.minimoMensual = new Prisma.Decimal(input.minimoMensual);
    if (input.precioModelo303 !== undefined) data.precioModelo303 = new Prisma.Decimal(input.precioModelo303);
    if (input.precioModelo111 !== undefined) data.precioModelo111 = new Prisma.Decimal(input.precioModelo111);
    if (input.precioModelo115 !== undefined) data.precioModelo115 = new Prisma.Decimal(input.precioModelo115);
    if (input.precioModelo130 !== undefined) data.precioModelo130 = new Prisma.Decimal(input.precioModelo130);
    if (input.precioModelo100 !== undefined) data.precioModelo100 = new Prisma.Decimal(input.precioModelo100);
    if (input.precioModelo349 !== undefined) data.precioModelo349 = new Prisma.Decimal(input.precioModelo349);
    if (input.precioModelo347 !== undefined) data.precioModelo347 = new Prisma.Decimal(input.precioModelo347);
    if (input.precioCertificados !== undefined) data.precioCertificados = new Prisma.Decimal(input.precioCertificados);
    if (input.precioCensos !== undefined) data.precioCensos = new Prisma.Decimal(input.precioCensos);
    if (input.precioNotificaciones !== undefined) data.precioNotificaciones = new Prisma.Decimal(input.precioNotificaciones);
    if (input.precioEstadisticas !== undefined) data.precioEstadisticas = new Prisma.Decimal(input.precioEstadisticas);
    if (input.precioAyudas !== undefined) data.precioAyudas = new Prisma.Decimal(input.precioAyudas);
    if (input.nombreEmpresa !== undefined) data.nombreEmpresa = input.nombreEmpresa;
    if (input.nifEmpresa !== undefined) data.nifEmpresa = input.nifEmpresa;
    if (input.direccionEmpresa !== undefined) data.direccionEmpresa = input.direccionEmpresa;
    if (input.telefonoEmpresa !== undefined) data.telefonoEmpresa = input.telefonoEmpresa;
    if (input.emailEmpresa !== undefined) data.emailEmpresa = input.emailEmpresa;
    if (input.logoPath !== undefined) data.logoPath = input.logoPath;
    if (input.colorPrimario !== undefined) data.colorPrimario = input.colorPrimario;
    if (input.colorSecundario !== undefined) data.colorSecundario = input.colorSecundario;
    
    const config = await prisma.gestoria_budget_configurations.update({
      where: { id },
      data
    });
    
    return this.mapPrismaToConfig(config);
  }
  
  /**
   * Eliminar configuración
   */
  async deleteConfig(id: string): Promise<void> {
    // Verificar que no tenga presupuestos asociados
    const budgetsCount = await prisma.gestoria_budgets.count({
      where: { configId: id }
    });
    
    if (budgetsCount > 0) {
      throw new Error(`No se puede eliminar la configuración porque tiene ${budgetsCount} presupuesto(s) asociado(s)`);
    }
    
    await prisma.gestoria_budget_configurations.delete({
      where: { id }
    });
  }
  
  /**
   * Desactivar configuraciones anteriores del mismo tipo
   */
  private async deactivatePreviousConfigs(tipo: 'OFICIAL' | 'ONLINE', exceptId?: string): Promise<void> {
    const where: Prisma.gestoria_budget_configurationsWhereInput = {
      tipo,
      activo: true
    };
    
    if (exceptId) {
      where.NOT = { id: exceptId };
    }
    
    await prisma.gestoria_budget_configurations.updateMany({
      where,
      data: { activo: false }
    });
  }
  
  /**
   * Validar input de configuración
   */
  private validateConfigInput(input: Partial<CreateConfigInput>, isPartial = false): void {
    const errors: string[] = [];
    
    // Validaciones obligatorias solo si no es parcial
    if (!isPartial) {
      if (!input.tipo) errors.push('Tipo de gestoría requerido');
      if (!input.nombre) errors.push('Nombre de configuración requerido');
      if (!input.nombreEmpresa) errors.push('Nombre de empresa requerido');
      if (!input.nifEmpresa) errors.push('NIF de empresa requerido');
      if (!input.direccionEmpresa) errors.push('Dirección de empresa requerida');
      if (!input.telefonoEmpresa) errors.push('Teléfono de empresa requerido');
      if (!input.emailEmpresa) errors.push('Email de empresa requerido');
      if (!input.creadoPor) errors.push('Usuario creador requerido');
    }
    
    // Validaciones de rangos (siempre que exista el valor)
    if (input.precioBasePorFactura !== undefined && input.precioBasePorFactura < 0) {
      errors.push('Precio base por factura debe ser mayor o igual a 0');
    }
    
    if (input.precioBasePorNomina !== undefined && input.precioBasePorNomina < 0) {
      errors.push('Precio base por nómina debe ser mayor o igual a 0');
    }
    
    if (input.porcentajeRegimenGeneral !== undefined && (input.porcentajeRegimenGeneral < 0 || input.porcentajeRegimenGeneral > 100)) {
      errors.push('Porcentaje de régimen general debe estar entre 0 y 100');
    }
    
    if (input.porcentajeModulos !== undefined && (input.porcentajeModulos < 0 || input.porcentajeModulos > 100)) {
      errors.push('Porcentaje de módulos debe estar entre 0 y 100');
    }
    
    if (input.porcentajeEDN !== undefined && (input.porcentajeEDN < 0 || input.porcentajeEDN > 100)) {
      errors.push('Porcentaje de EDN debe estar entre 0 y 100');
    }
    
    if (input.recargoPeriodoMensual !== undefined && (input.recargoPeriodoMensual < 0 || input.recargoPeriodoMensual > 100)) {
      errors.push('Recargo período mensual debe estar entre 0 y 100');
    }
    
    // Validación de email
    if (input.emailEmpresa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailEmpresa)) {
      errors.push('Email de empresa no válido');
    }
    
    // Validación de colores (formato hex)
    if (input.colorPrimario && !/^#[0-9A-Fa-f]{6}$/.test(input.colorPrimario)) {
      errors.push('Color primario debe ser un valor hexadecimal válido (ej: #1e40af)');
    }
    
    if (input.colorSecundario && !/^#[0-9A-Fa-f]{6}$/.test(input.colorSecundario)) {
      errors.push('Color secundario debe ser un valor hexadecimal válido (ej: #3b82f6)');
    }
    
    if (errors.length > 0) {
      throw new Error(`Errores de validación:\n- ${errors.join('\n- ')}`);
    }
  }
  
  /**
   * Mapear de Prisma a interface pública
   */
  private mapPrismaToConfig(prismaConfig: any): GestoriaBudgetConfig {
    return {
      id: prismaConfig.id,
      tipo: prismaConfig.tipo,
      nombre: prismaConfig.nombre,
      activo: prismaConfig.activo,
      precioBasePorFactura: Number(prismaConfig.precioBasePorFactura),
      precioBasePorNomina: Number(prismaConfig.precioBasePorNomina),
      porcentajeRegimenGeneral: Number(prismaConfig.porcentajeRegimenGeneral),
      porcentajeModulos: Number(prismaConfig.porcentajeModulos),
      porcentajeEDN: Number(prismaConfig.porcentajeEDN),
      recargoPeriodoMensual: Number(prismaConfig.recargoPeriodoMensual),
      minimoMensual: Number(prismaConfig.minimoMensual),
      precioModelo303: Number(prismaConfig.precioModelo303),
      precioModelo111: Number(prismaConfig.precioModelo111),
      precioModelo115: Number(prismaConfig.precioModelo115),
      precioModelo130: Number(prismaConfig.precioModelo130),
      precioModelo100: Number(prismaConfig.precioModelo100),
      precioModelo349: Number(prismaConfig.precioModelo349),
      precioModelo347: Number(prismaConfig.precioModelo347),
      precioCertificados: Number(prismaConfig.precioCertificados),
      precioCensos: Number(prismaConfig.precioCensos),
      precioNotificaciones: Number(prismaConfig.precioNotificaciones),
      precioEstadisticas: Number(prismaConfig.precioEstadisticas),
      precioAyudas: Number(prismaConfig.precioAyudas),
      nombreEmpresa: prismaConfig.nombreEmpresa,
      nifEmpresa: prismaConfig.nifEmpresa,
      direccionEmpresa: prismaConfig.direccionEmpresa,
      telefonoEmpresa: prismaConfig.telefonoEmpresa,
      emailEmpresa: prismaConfig.emailEmpresa,
      logoPath: prismaConfig.logoPath,
      colorPrimario: prismaConfig.colorPrimario,
      colorSecundario: prismaConfig.colorSecundario,
      fechaCreacion: prismaConfig.fechaCreacion,
      fechaModificacion: prismaConfig.fechaModificacion,
      creadoPor: prismaConfig.creadoPor
    };
  }
}

export const gestoriaBudgetConfigService = new GestoriaBudgetConfigService();
