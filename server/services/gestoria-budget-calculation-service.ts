import { GestoriaBudgetConfig, gestoriaBudgetConfigService } from './gestoria-budget-config-service';

export interface BudgetCalculationInput {
  // Datos básicos
  facturasMes: number;
  nominasMes?: number;
  facturacion: number;
  sistemaTributacion: string; // "Régimen General" | "Módulos" | "EDN"
  periodoDeclaraciones: string; // "Mensual" | "Trimestral" | "Anual"
  
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
  
  // Servicios adicionales dinámicos
  serviciosAdicionales?: Array<{
    nombre: string;
    precio: number;
    tipoServicio: 'MENSUAL' | 'PUNTUAL';
    incluido: boolean;
  }>;
}

export interface BudgetCalculationResult {
  totalContabilidad: number;
  totalLaboral: number;
  subtotal: number;
  descuentoCalculado: number;
  totalFinal: number;
  
  // Desglose para mostrar en UI
  desglose: {
    baseFacturas: number;
    baseNominas: number;
    recargoSistemaTributacion: number;
    recargoPeriodo: number;
    serviciosModelos: number;
    serviciosAdicionales: number;
    serviciosAdicionalesMensuales: number;
    serviciosAdicionalesPuntuales: number;
  };
}

/**
 * Servicio para calcular presupuestos de gestorías
 * Replica exactamente la lógica de PresupuestoCalculoAutonomoService.cs
 */
export class GestoriaBudgetCalculationService {
  
  /**
   * Calcular presupuesto completo
   */
  async calculate(
    input: BudgetCalculationInput,
    tipoGestoria: 'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE'
  ): Promise<BudgetCalculationResult> {
    
    // Obtener configuración activa
    const config = await gestoriaBudgetConfigService.getActiveConfig(tipoGestoria);
    
    if (!config) {
      throw new Error(`No hay configuración activa para ${tipoGestoria}`);
    }
    
    // Calcular total contabilidad
    const totalContabilidad = this.calculateTotalContabilidad(input, config);
    
    // Calcular total laboral
    const totalLaboral = this.calculateTotalLaboral(input, config);
    
    // Subtotal
    const subtotal = totalContabilidad + totalLaboral;
    
    // Calcular descuento
    const descuentoCalculado = this.calculateDescuento(subtotal, input);
    
    // Total final
    const totalFinal = subtotal - descuentoCalculado;
    
    // Desglose detallado
    const desglose = this.calculateDesglose(input, config);
    
    return {
      totalContabilidad,
      totalLaboral,
      subtotal,
      descuentoCalculado,
      totalFinal,
      desglose
    };
  }
  
  /**
   * Calcular total de contabilidad
   * Replica la lógica de CalcularTotalContabilidad() en ASP.NET
   */
  private calculateTotalContabilidad(
    input: BudgetCalculationInput,
    config: GestoriaBudgetConfig
  ): number {
    let total = 0;
    
    // 1. Base por facturas
    const baseFacturas = input.facturasMes * config.precioBasePorFactura;
    total += baseFacturas;
    
    // 2. Recargo por sistema de tributación
    let recargoSistema = 0;
    const facturacion = input.facturacion;
    
    switch (input.sistemaTributacion) {
      case 'Régimen General':
        recargoSistema = (facturacion * config.porcentajeRegimenGeneral) / 100;
        break;
      case 'Módulos':
        recargoSistema = (facturacion * config.porcentajeModulos) / 100;
        break;
      case 'EDN':
      case 'Otro':
        recargoSistema = (facturacion * config.porcentajeEDN) / 100;
        break;
    }
    
    total += recargoSistema;
    
    // 3. Recargo por período mensual
    if (input.periodoDeclaraciones === 'Mensual') {
      const recargoMensual = (total * config.recargoPeriodoMensual) / 100;
      const minimoMensual = config.minimoMensual;
      
      // Aplicar el mayor entre el porcentaje y el mínimo
      total += Math.max(recargoMensual, minimoMensual);
    }
    
    // 4. Precios de modelos fiscales
    if (input.modelo303) total += config.precioModelo303;
    if (input.modelo111) total += config.precioModelo111;
    if (input.modelo115) total += config.precioModelo115;
    if (input.modelo130) total += config.precioModelo130;
    if (input.modelo100) total += config.precioModelo100;
    if (input.modelo349) total += config.precioModelo349;
    if (input.modelo347) total += config.precioModelo347;
    
    // 5. Servicios adicionales fijos
    if (input.solicitudCertificados) total += config.precioCertificados;
    if (input.censosAEAT) total += config.precioCensos;
    if (input.recepcionNotificaciones) total += config.precioNotificaciones;
    if (input.estadisticasINE) total += config.precioEstadisticas;
    if (input.solicitudAyudas) total += config.precioAyudas;
    
    // 6. Servicios adicionales dinámicos (solo MENSUALES)
    if (input.serviciosAdicionales) {
      const serviciosMensuales = input.serviciosAdicionales
        .filter(s => s.tipoServicio === 'MENSUAL' && s.incluido)
        .reduce((sum, s) => sum + s.precio, 0);
      
      total += serviciosMensuales;
    }
    
    return Math.round(total * 100) / 100; // Redondear a 2 decimales
  }
  
  /**
   * Calcular total laboral
   * Replica la lógica de CalcularTotalLaboral() en ASP.NET
   */
  private calculateTotalLaboral(
    input: BudgetCalculationInput,
    config: GestoriaBudgetConfig
  ): number {
    if (!input.conLaboralSocial || !input.nominasMes || input.nominasMes === 0) {
      return 0;
    }
    
    const totalLaboral = input.nominasMes * config.precioBasePorNomina;
    
    return Math.round(totalLaboral * 100) / 100;
  }
  
  /**
   * Calcular descuento
   * Replica la lógica de AplicarDescuento() en ASP.NET
   */
  private calculateDescuento(
    subtotal: number,
    input: BudgetCalculationInput
  ): number {
    if (!input.aplicaDescuento || !input.valorDescuento || input.valorDescuento <= 0) {
      return 0;
    }
    
    let descuento = 0;
    
    if (input.tipoDescuento === 'PORCENTAJE') {
      // Porcentaje sobre el subtotal
      descuento = (subtotal * input.valorDescuento) / 100;
    } else if (input.tipoDescuento === 'FIJO') {
      // Cantidad fija
      descuento = input.valorDescuento;
    }
    
    // No permitir descuentos mayores al subtotal
    descuento = Math.min(descuento, subtotal);
    
    return Math.round(descuento * 100) / 100;
  }
  
  /**
   * Calcular desglose detallado para mostrar en UI
   */
  private calculateDesglose(
    input: BudgetCalculationInput,
    config: GestoriaBudgetConfig
  ): BudgetCalculationResult['desglose'] {
    
    // Base facturas
    const baseFacturas = input.facturasMes * config.precioBasePorFactura;
    
    // Base nóminas
    const baseNominas = (input.conLaboralSocial && input.nominasMes) 
      ? input.nominasMes * config.precioBasePorNomina 
      : 0;
    
    // Recargo sistema tributación
    let recargoSistemaTributacion = 0;
    const facturacion = input.facturacion;
    
    switch (input.sistemaTributacion) {
      case 'Régimen General':
        recargoSistemaTributacion = (facturacion * config.porcentajeRegimenGeneral) / 100;
        break;
      case 'Módulos':
        recargoSistemaTributacion = (facturacion * config.porcentajeModulos) / 100;
        break;
      case 'EDN':
      case 'Otro':
        recargoSistemaTributacion = (facturacion * config.porcentajeEDN) / 100;
        break;
    }
    
    // Recargo período
    let recargoPeriodo = 0;
    if (input.periodoDeclaraciones === 'Mensual') {
      const baseParaRecargo = baseFacturas + recargoSistemaTributacion;
      const recargoCalculado = (baseParaRecargo * config.recargoPeriodoMensual) / 100;
      recargoPeriodo = Math.max(recargoCalculado, config.minimoMensual);
    }
    
    // Servicios modelos
    let serviciosModelos = 0;
    if (input.modelo303) serviciosModelos += config.precioModelo303;
    if (input.modelo111) serviciosModelos += config.precioModelo111;
    if (input.modelo115) serviciosModelos += config.precioModelo115;
    if (input.modelo130) serviciosModelos += config.precioModelo130;
    if (input.modelo100) serviciosModelos += config.precioModelo100;
    if (input.modelo349) serviciosModelos += config.precioModelo349;
    if (input.modelo347) serviciosModelos += config.precioModelo347;
    
    // Servicios adicionales fijos
    let serviciosAdicionales = 0;
    if (input.solicitudCertificados) serviciosAdicionales += config.precioCertificados;
    if (input.censosAEAT) serviciosAdicionales += config.precioCensos;
    if (input.recepcionNotificaciones) serviciosAdicionales += config.precioNotificaciones;
    if (input.estadisticasINE) serviciosAdicionales += config.precioEstadisticas;
    if (input.solicitudAyudas) serviciosAdicionales += config.precioAyudas;
    
    // Servicios adicionales dinámicos
    let serviciosAdicionalesMensuales = 0;
    let serviciosAdicionalesPuntuales = 0;
    
    if (input.serviciosAdicionales) {
      serviciosAdicionalesMensuales = input.serviciosAdicionales
        .filter(s => s.tipoServicio === 'MENSUAL' && s.incluido)
        .reduce((sum, s) => sum + s.precio, 0);
      
      serviciosAdicionalesPuntuales = input.serviciosAdicionales
        .filter(s => s.tipoServicio === 'PUNTUAL' && s.incluido)
        .reduce((sum, s) => sum + s.precio, 0);
    }
    
    return {
      baseFacturas: Math.round(baseFacturas * 100) / 100,
      baseNominas: Math.round(baseNominas * 100) / 100,
      recargoSistemaTributacion: Math.round(recargoSistemaTributacion * 100) / 100,
      recargoPeriodo: Math.round(recargoPeriodo * 100) / 100,
      serviciosModelos: Math.round(serviciosModelos * 100) / 100,
      serviciosAdicionales: Math.round(serviciosAdicionales * 100) / 100,
      serviciosAdicionalesMensuales: Math.round(serviciosAdicionalesMensuales * 100) / 100,
      serviciosAdicionalesPuntuales: Math.round(serviciosAdicionalesPuntuales * 100) / 100
    };
  }
  
  /**
   * Generar número de presupuesto automático
   * Formato: PRE-2025-001
   */
  async generateBudgetNumber(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    
    // Buscar el último número del año
    const lastBudget = await prisma.gestoria_budgets.findFirst({
      where: {
        numero: {
          startsWith: `PRE-${currentYear}-`
        }
      },
      orderBy: {
        numero: 'desc'
      }
    });
    
    let nextNumber = 1;
    
    if (lastBudget) {
      // Extraer el número del formato PRE-2025-001
      const match = lastBudget.numero.match(/PRE-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    // Formatear con ceros a la izquierda (3 dígitos)
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    return `PRE-${currentYear}-${paddedNumber}`;
  }
}

export const gestoriaBudgetCalculationService = new GestoriaBudgetCalculationService();

// Necesitamos importar prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
