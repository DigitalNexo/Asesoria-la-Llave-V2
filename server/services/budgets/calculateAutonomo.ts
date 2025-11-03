/**
 * Servicio de cálculo para presupuestos de AUTÓNOMO
 * Sistema dinámico BASU - Port desde C# PresupuestoCalculoAutonomoService.cs
 * 
 * Algoritmo de 11 pasos:
 * 1. Calcular base contabilidad según tramo de facturas
 * 2. Añadir modelos IVA (303, 349, 347)
 * 3. Añadir modelos IRPF (111, 115, 130, 100)
 * 4. Añadir servicios adicionales seleccionados
 * 5. Aplicar multiplicador por facturación anual
 * 6. Calcular laboral/seguridad social
 * 7. Aplicar ajustes porcentuales (mensual, EDN, módulos)
 * 8. Añadir servicios adicionales mensuales
 * 9. Sumar totales (conta + laboral + servicios mensuales)
 * 10. Aplicar descuento (porcentaje o fijo)
 * 11. Asegurar total >= 0
 */

import prisma from '../../prisma-client';
import { AutonomoInput, CalculationResult, BudgetItemInput } from './types';


// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface ConfiguracionAutonomo {
  id: string;
  porcentajePeriodoMensual: number;
  porcentajeEDN: number;
  porcentajeModulos: number;
  minimoMensual: number;
  tramosFacturas: TramoFacturas[];
  tramosNominas: TramoNominas[];
  tramosFacturacionAnual: TramoFacturacionAnual[];
  preciosModelosFiscales: ModeloFiscal[];
  preciosServiciosAdicionales: ServicioAdicional[];
}

interface TramoFacturas {
  orden: number;
  minFacturas: number;
  maxFacturas: number | null;
  precio: number;
  etiqueta: string | null;
}

interface TramoNominas {
  orden: number;
  minNominas: number;
  maxNominas: number | null;
  precio: number;
  etiqueta: string | null;
}

interface TramoFacturacionAnual {
  orden: number;
  minFacturacion: number;
  maxFacturacion: number | null;
  multiplicador: number;
  etiqueta: string | null;
}

interface ModeloFiscal {
  codigoModelo: string;
  nombreModelo: string;
  precio: number;
  activo: boolean;
}

interface ServicioAdicional {
  codigo: string;
  nombre: string;
  precio: number;
  tipoServicio: string;
  activo: boolean;
}

// ============================================================================
// CACHÉ DE CONFIGURACIÓN
// ============================================================================

let configCache: ConfiguracionAutonomo | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function getConfiguracion(): Promise<ConfiguracionAutonomo> {
  const now = Date.now();
  
  // Usar caché si existe y no ha expirado
  if (configCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return configCache;
  }

  // Cargar configuración activa de BD con todas las relaciones
  const config = await prisma.gestoria_budget_autonomo_config.findFirst({
    where: { activo: true },
    include: {
      tramosFacturas: {
        orderBy: { orden: 'asc' }
      },
      tramosNominas: {
        orderBy: { orden: 'asc' }
      },
      tramosFacturacionAnual: {
        orderBy: { orden: 'asc' }
      },
      preciosModelosFiscales: {
        where: { activo: true },
        orderBy: { orden: 'asc' }
      },
      preciosServiciosAdicionales: {
        where: { activo: true },
        orderBy: { orden: 'asc' }
      }
    }
  });

  if (!config) {
    throw new Error('No se encontró configuración activa para presupuestos de Autónomos');
  }

  // Convertir Decimal a number para facilitar cálculos
  configCache = {
    id: config.id,
    porcentajePeriodoMensual: Number(config.porcentajePeriodoMensual),
    porcentajeEDN: Number(config.porcentajeEDN),
    porcentajeModulos: Number(config.porcentajeModulos),
    minimoMensual: Number(config.minimoMensual),
    tramosFacturas: config.tramosFacturas.map(t => ({
      orden: t.orden,
      minFacturas: t.minFacturas,
      maxFacturas: t.maxFacturas,
      precio: Number(t.precio),
      etiqueta: t.etiqueta
    })),
    tramosNominas: config.tramosNominas.map(t => ({
      orden: t.orden,
      minNominas: t.minNominas,
      maxNominas: t.maxNominas,
      precio: Number(t.precio),
      etiqueta: t.etiqueta
    })),
    tramosFacturacionAnual: config.tramosFacturacionAnual.map(t => ({
      orden: t.orden,
      minFacturacion: Number(t.minFacturacion),
      maxFacturacion: t.maxFacturacion ? Number(t.maxFacturacion) : null,
      multiplicador: Number(t.multiplicador),
      etiqueta: t.etiqueta
    })),
    preciosModelosFiscales: config.preciosModelosFiscales.map(m => ({
      codigoModelo: m.codigoModelo,
      nombreModelo: m.nombreModelo,
      precio: Number(m.precio),
      activo: m.activo
    })),
    preciosServiciosAdicionales: config.preciosServiciosAdicionales.map(s => ({
      codigo: s.codigo,
      nombre: s.nombre,
      precio: Number(s.precio),
      tipoServicio: s.tipoServicio,
      activo: s.activo
    }))
  };

  cacheTimestamp = now;
  return configCache;
}

// ============================================================================
// FUNCIONES HELPER PARA BUSCAR EN TRAMOS DINÁMICOS
// ============================================================================

/**
 * Encuentra el precio base de contabilidad según el número de facturas mensuales
 * Busca en los tramos dinámicos de la configuración
 */
function getPrecioBaseFacturas(facturasMes: number, tramos: TramoFacturas[]): number {
  for (const tramo of tramos) {
    const dentroDelMin = facturasMes >= tramo.minFacturas;
    const dentroDelMax = tramo.maxFacturas === null || facturasMes <= tramo.maxFacturas;
    
    if (dentroDelMin && dentroDelMax) {
      return tramo.precio;
    }
  }
  
  // Si no encuentra tramo (no debería pasar), devolver el último
  return tramos[tramos.length - 1]?.precio || 45;
}

/**
 * Encuentra el precio por nómina según la cantidad mensual
 * Busca en los tramos dinámicos de la configuración
 */
function getPrecioNomina(nominasMes: number, tramos: TramoNominas[]): number {
  for (const tramo of tramos) {
    const dentroDelMin = nominasMes >= tramo.minNominas;
    const dentroDelMax = tramo.maxNominas === null || nominasMes <= tramo.maxNominas;
    
    if (dentroDelMin && dentroDelMax) {
      return tramo.precio;
    }
  }
  
  // Si no encuentra tramo, devolver el último
  return tramos[tramos.length - 1]?.precio || 10;
}

/**
 * Encuentra el multiplicador según la facturación anual
 * Busca en los tramos dinámicos de la configuración
 */
function getMultiplicadorFacturacion(facturacion: number, tramos: TramoFacturacionAnual[]): number {
  for (const tramo of tramos) {
    const dentroDelMin = facturacion >= tramo.minFacturacion;
    const dentroDelMax = tramo.maxFacturacion === null || facturacion <= tramo.maxFacturacion;
    
    if (dentroDelMin && dentroDelMax) {
      return tramo.multiplicador;
    }
  }
  
  // Si no encuentra tramo, devolver el último multiplicador
  return tramos[tramos.length - 1]?.multiplicador || 1.0;
}

/**
 * Busca el precio de un modelo fiscal por su código
 */
function getPrecioModelo(codigo: string, modelos: ModeloFiscal[]): number {
  const modelo = modelos.find(m => m.codigoModelo === codigo);
  return modelo?.precio || 0;
}

/**
 * Busca el precio de un servicio adicional por su código
 */
function getPrecioServicio(codigo: string, servicios: ServicioAdicional[]): number {
  const servicio = servicios.find(s => s.codigo === codigo);
  return servicio?.precio || 0;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE CÁLCULO - ALGORITMO DE 11 PASOS
// ============================================================================

export async function calculateAutonomo(input: AutonomoInput): Promise<CalculationResult> {
  const items: BudgetItemInput[] = [];
  let position = 1;

  // Cargar configuración dinámica de BD
  const config = await getConfiguracion();

  // ========================================================================
  // PASO 1: BASE CONTABILIDAD según tramo de facturas
  // ========================================================================
  const precioBase = getPrecioBaseFacturas(input.facturasMes, config.tramosFacturas);
  const tramoFacturas = config.tramosFacturas.find(t => {
    const dentro = input.facturasMes >= t.minFacturas && 
                   (t.maxFacturas === null || input.facturasMes <= t.maxFacturas);
    return dentro;
  });
  
  items.push({
    concept: `Contabilidad - ${tramoFacturas?.etiqueta || `${input.facturasMes} facturas`}`,
    category: 'BASE_CONTABILIDAD',
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21,
  });

  let totalContabilidad = precioBase;

  // ========================================================================
  // PASO 2: MODELOS IVA (303, 349, 347)
  // ========================================================================
  const modelosIVA = [
    { codigo: '303', nombre: 'Modelo 303 - IVA Trimestral', field: 'modelo303' },
    { codigo: '349', nombre: 'Modelo 349 - Operaciones Intracomunitarias', field: 'modelo349' },
    { codigo: '347', nombre: 'Modelo 347 - Operaciones Terceras Personas', field: 'modelo347' }
  ];

  modelosIVA.forEach(({ codigo, nombre, field }) => {
    if ((input as any)[field]) {
      const precio = getPrecioModelo(codigo, config.preciosModelosFiscales);
      if (precio > 0) {
        items.push({
          concept: nombre,
          category: `MODELO_${codigo}`,
          position: position++,
          quantity: 1,
          unitPrice: precio,
          vatPct: 21,
          subtotal: precio,
          total: precio * 1.21,
        });
        totalContabilidad += precio;
      }
    }
  });

  // ========================================================================
  // PASO 3: MODELOS IRPF (111, 115, 130, 100)
  // ========================================================================
  const modelosIRPF = [
    { codigo: '111', nombre: 'Modelo 111 - IRPF Trabajadores', field: 'modelo111' },
    { codigo: '115', nombre: 'Modelo 115 - IRPF Alquileres', field: 'modelo115' },
    { codigo: '130', nombre: 'Modelo 130 - IRPF Actividades Económicas', field: 'modelo130' },
    { codigo: '100', nombre: 'Modelo 100 - Declaración Renta Anual', field: 'modelo100' }
  ];

  modelosIRPF.forEach(({ codigo, nombre, field }) => {
    if ((input as any)[field]) {
      const precio = getPrecioModelo(codigo, config.preciosModelosFiscales);
      if (precio > 0) {
        items.push({
          concept: nombre,
          category: `MODELO_${codigo}`,
          position: position++,
          quantity: 1,
          unitPrice: precio,
          vatPct: 21,
          subtotal: precio,
          total: precio * 1.21,
        });
        totalContabilidad += precio;
      }
    }
  });

  // ========================================================================
  // PASO 4: SERVICIOS ADICIONALES FIJOS (si están activados en input)
  // ========================================================================
  const serviciosMap = [
    { codigo: 'solicitud_certificados', nombre: 'Solicitud de Certificados', field: 'solicitudCertificados' },
    { codigo: 'censos_aeat', nombre: 'Gestión de Censos AEAT', field: 'censosAEAT' },
    { codigo: 'gestion_notificaciones', nombre: 'Gestión de Notificaciones', field: 'recepcionNotificaciones' },
    { codigo: 'estadisticas_ine', nombre: 'Estadísticas INE', field: 'estadisticasINE' },
    { codigo: 'solicitud_ayudas', nombre: 'Solicitud de Ayudas', field: 'solicitudAyudas' }
  ];

  serviciosMap.forEach(({ codigo, nombre, field }) => {
    if ((input as any)[field]) {
      const precio = getPrecioServicio(codigo, config.preciosServiciosAdicionales);
      if (precio > 0) {
        items.push({
          concept: nombre,
          category: `SERVICIO_${codigo.toUpperCase()}`,
          position: position++,
          quantity: 1,
          unitPrice: precio,
          vatPct: 21,
          subtotal: precio,
          total: precio * 1.21,
        });
        totalContabilidad += precio;
      }
    }
  });

  // ========================================================================
  // PASO 5: MULTIPLICADOR POR FACTURACIÓN ANUAL
  // ========================================================================
  const multiplicador = getMultiplicadorFacturacion(input.facturacion, config.tramosFacturacionAnual);
  if (multiplicador > 1.0) {
    const incremento = totalContabilidad * (multiplicador - 1);
    const tramoFact = config.tramosFacturacionAnual.find(t => {
      const dentro = input.facturacion >= t.minFacturacion &&
                     (t.maxFacturacion === null || input.facturacion <= t.maxFacturacion);
      return dentro;
    });
    
    items.push({
      concept: `Recargo por facturación anual - ${tramoFact?.etiqueta || `${input.facturacion.toLocaleString()}€`} (${multiplicador.toFixed(2)}x)`,
      category: 'RECARGO_FACTURACION',
      position: position++,
      quantity: 1,
      unitPrice: incremento,
      vatPct: 21,
      subtotal: incremento,
      total: incremento * 1.21,
    });
    totalContabilidad += incremento;
  }

  // ========================================================================
  // PASO 6: LABORAL / SEGURIDAD SOCIAL (Nóminas)
  // ========================================================================
  let totalLaboral = 0;
  if (input.nominasMes > 0 && (input as any).conLaboralSocial) {
    const precioNomina = getPrecioNomina(input.nominasMes, config.tramosNominas);
    const totalNominas = input.nominasMes * precioNomina;
    
    const tramoNom = config.tramosNominas.find(t => {
      const dentro = input.nominasMes >= t.minNominas &&
                     (t.maxNominas === null || input.nominasMes <= t.maxNominas);
      return dentro;
    });
    
    items.push({
      concept: `Laboral/SS - ${tramoNom?.etiqueta || `${input.nominasMes} nóminas`} (${input.nominasMes} x ${precioNomina.toFixed(2)}€)`,
      category: 'NOMINAS',
      position: position++,
      quantity: input.nominasMes,
      unitPrice: precioNomina,
      vatPct: 21,
      subtotal: totalNominas,
      total: totalNominas * 1.21,
    });
    totalLaboral = totalNominas;
  }

  // ========================================================================
  // PASO 7: AJUSTES PORCENTUALES
  // ========================================================================
  
  // 7a. Recargo por periodo mensual (+20% según BASU)
  if (input.periodo === 'MENSUAL') {
    const ajusteMensual = totalContabilidad * (config.porcentajePeriodoMensual / 100);
    items.push({
      concept: `Recargo por liquidaciones mensuales (+${config.porcentajePeriodoMensual.toFixed(0)}%)`,
      category: 'RECARGO_MENSUAL',
      position: position++,
      quantity: 1,
      unitPrice: ajusteMensual,
      vatPct: 21,
      subtotal: ajusteMensual,
      total: ajusteMensual * 1.21,
    });
    totalContabilidad += ajusteMensual;
  }

  // 7b. Ajuste por sistema de tributación
  if (input.sistemaTributacion === 'ESN') {
    // EDN = Estimación Directa Normal (+10% según BASU)
    const ajusteEDN = totalContabilidad * (config.porcentajeEDN / 100);
    items.push({
      concept: `Recargo por Estimación Directa Normal (+${config.porcentajeEDN.toFixed(0)}%)`,
      category: 'RECARGO_EDN',
      position: position++,
      quantity: 1,
      unitPrice: ajusteEDN,
      vatPct: 21,
      subtotal: ajusteEDN,
      total: ajusteEDN * 1.21,
    });
    totalContabilidad += ajusteEDN;
  } else if (input.sistemaTributacion === 'MODULOS') {
    // Módulos (-10% según BASU)
    const ajusteModulos = totalContabilidad * (Math.abs(config.porcentajeModulos) / 100);
    items.push({
      concept: `Descuento por Régimen de Módulos (${config.porcentajeModulos.toFixed(0)}%)`,
      category: 'DESCUENTO_MODULOS',
      position: position++,
      quantity: 1,
      unitPrice: -ajusteModulos,
      vatPct: 21,
      subtotal: -ajusteModulos,
      total: -ajusteModulos * 1.21,
    });
    totalContabilidad -= ajusteModulos;
  }

  // ========================================================================
  // PASO 8: SERVICIOS ADICIONALES MENSUALES (si aplica)
  // ========================================================================
  let totalServiciosMensuales = 0;
  const serviciosMensuales = config.preciosServiciosAdicionales.filter(
    s => s.tipoServicio === 'MENSUAL' && s.activo
  );
  
  // Aquí se podrían añadir servicios mensuales si el input los especifica
  // Por ahora dejamos la estructura preparada para futuras extensiones

  // ========================================================================
  // PASO 9: SUMAR TOTALES (Contabilidad + Laboral + Servicios Mensuales)
  // ========================================================================
  let totalBase = totalContabilidad + totalLaboral + totalServiciosMensuales;

  // ========================================================================
  // PASO 10: APLICAR DESCUENTO (si existe)
  // ========================================================================
  if ((input as any).aplicaDescuento && (input as any).valorDescuento) {
    const tipoDescuento = (input as any).tipoDescuento || 'PORCENTAJE';
    let descuento = 0;

    if (tipoDescuento === 'PORCENTAJE') {
      descuento = totalBase * ((input as any).valorDescuento / 100);
      items.push({
        concept: `Descuento aplicado (-${(input as any).valorDescuento}%)`,
        category: 'DESCUENTO',
        position: position++,
        quantity: 1,
        unitPrice: -descuento,
        vatPct: 21,
        subtotal: -descuento,
        total: -descuento * 1.21,
      });
    } else {
      // FIJO
      descuento = (input as any).valorDescuento;
      items.push({
        concept: `Descuento aplicado (-${descuento.toFixed(2)}€)`,
        category: 'DESCUENTO',
        position: position++,
        quantity: 1,
        unitPrice: -descuento,
        vatPct: 21,
        subtotal: -descuento,
        total: -descuento * 1.21,
      });
    }
    
    totalBase -= descuento;
  }

  // ========================================================================
  // PASO 11: ASEGURAR TOTAL >= 0 y aplicar mínimo mensual si corresponde
  // ========================================================================
  if (totalBase < 0) {
    totalBase = 0;
  }

  // Aplicar mínimo mensual si el total es muy bajo
  if (input.periodo === 'MENSUAL' && totalBase < config.minimoMensual) {
    const ajusteMinimo = config.minimoMensual - totalBase;
    items.push({
      concept: `Ajuste mínimo mensual (${config.minimoMensual.toFixed(2)}€)`,
      category: 'MINIMO_MENSUAL',
      position: position++,
      quantity: 1,
      unitPrice: ajusteMinimo,
      vatPct: 21,
      subtotal: ajusteMinimo,
      total: ajusteMinimo * 1.21,
    });
    totalBase = config.minimoMensual;
  }

  // ========================================================================
  // CALCULAR TOTALES FINALES
  // ========================================================================
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + (item.subtotal * (item.vatPct / 100)), 0);
  const total = subtotal + vatTotal;

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Limpia el caché de configuración
 * Útil después de editar parámetros en la página de administración
 */
export function clearConfigCache() {
  configCache = null;
  cacheTimestamp = 0;
}

/**
 * Exporta la configuración actual (para debugging/testing)
 */
export async function getConfiguracionActual(): Promise<ConfiguracionAutonomo> {
  return await getConfiguracion();
}
