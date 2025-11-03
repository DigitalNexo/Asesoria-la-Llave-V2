/**
 * Servicio de cálculo para presupuestos de RENTA
 * AHORA CON PARÁMETROS CONFIGURABLES desde base de datos
 */

import prisma from '../../prisma-client';
import { RentaInput, CalculationResult, BudgetItemInput } from './types';


// Caché de parámetros para evitar consultas repetidas
let parametersCache: Map<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function getParameters() {
  const now = Date.now();
  
  // Usar caché si existe y no ha expirado
  if (parametersCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return parametersCache;
  }

  // Cargar parámetros de BD
  const params = await prisma.budget_parameters.findMany({
    where: {
      budgetType: 'RENTA',
      isActive: true,
    },
  });

  // Crear mapa por paramKey
  const paramsMap = new Map<string, any>();
  
  params.forEach((param) => {
    paramsMap.set(param.paramKey, param);
  });

  parametersCache = paramsMap;
  cacheTimestamp = now;

  return paramsMap;
}

// Fallback por si falla BD
const PRECIOS_BASE: Record<string, number> = {
  MATRIMONIO: 50,
  MATRIMONIO_HIJOS: 50,
  OTROS: 40,
};

export async function calculateRenta(input: RentaInput): Promise<CalculationResult> {
  const items: BudgetItemInput[] = [];
  let position = 1;

  // Cargar parámetros de BD
  const params = await getParameters();

  // 1. BASE UNIDAD FAMILIAR
  let precioBase = 40; // Default
  let conceptoBase = 'Declaración Individual/Otros';
  
  if (input.unidadFamiliar === 'MATRIMONIO') {
    const param = params.get('UNIDAD_FAMILIAR_MATRIMONIO');
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.MATRIMONIO;
    conceptoBase = 'Declaración Matrimonio';
  } else if (input.unidadFamiliar === 'MATRIMONIO_HIJOS') {
    const param = params.get('UNIDAD_FAMILIAR_MATRIMONIO_HIJOS');
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.MATRIMONIO_HIJOS;
    conceptoBase = 'Declaración Matrimonio con hijos';
  } else {
    const param = params.get('UNIDAD_FAMILIAR_OTROS');
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.OTROS;
  }

  items.push({
    concept: conceptoBase,
    category: 'BASE_RENTA',
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21,
  });

  // 2. EXTRA AUTÓNOMO
  if (input.autonomo) {
    const param = params.get('EXTRA_AUTONOMO');
    const precio = param ? Number(param.paramValue) : 20;
    
    items.push({
      concept: 'Actividad Económica (Autónomo)',
      category: 'EXTRA_AUTONOMO',
      position: position++,
      quantity: 1,
      unitPrice: precio,
      vatPct: 21,
      subtotal: precio,
      total: precio * 1.21,
    });
  }

  // 3. INMUEBLES ALQUILADOS
  if (input.inmueblesAlquilados > 0) {
    const total = input.inmueblesAlquilados * 15;
    items.push({
      concept: `Inmuebles alquilados (${input.inmueblesAlquilados} x 15€)`,
      category: 'EXTRA_INMUEBLES_ALQ',
      position: position++,
      quantity: input.inmueblesAlquilados,
      unitPrice: 15,
      vatPct: 21,
      subtotal: total,
      total: total * 1.21,
    });
  }

  // 4. VENTA DE INMUEBLES
  if (input.ventaInmuebles > 0) {
    const total = input.ventaInmuebles * 20;
    items.push({
      concept: `Venta de inmuebles (${input.ventaInmuebles} x 20€)`,
      category: 'EXTRA_VENTA_INMUEBLES',
      position: position++,
      quantity: input.ventaInmuebles,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total,
      total: total * 1.21,
    });
  }

  // 5. VENTA DE PRODUCTOS FINANCIEROS/ACCIONES
  if (input.ventaFinancieros > 0) {
    const total = input.ventaFinancieros * 20;
    items.push({
      concept: `Venta de productos financieros/acciones (${input.ventaFinancieros} x 20€)`,
      category: 'EXTRA_VENTA_FINANCIEROS',
      position: position++,
      quantity: input.ventaFinancieros,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total,
      total: total * 1.21,
    });
  }

  // 6. OTRAS GANANCIAS PATRIMONIALES
  if (input.otrasGanancias > 0) {
    const total = input.otrasGanancias * 20;
    items.push({
      concept: `Otras ganancias patrimoniales (${input.otrasGanancias} x 20€)`,
      category: 'EXTRA_OTRAS_GANANCIAS',
      position: position++,
      quantity: input.otrasGanancias,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total,
      total: total * 1.21,
    });
  }

  // 7. CALCULAR TOTALES
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

// Función para limpiar caché (útil después de editar parámetros)
export function clearParametersCache() {
  parametersCache = null;
  cacheTimestamp = 0;
}
