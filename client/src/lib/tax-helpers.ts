/**
 * Configuración de modelos fiscales con sus reglas de disponibilidad
 */

export const TAX_MODELS_AVAILABILITY: Record<string, string[]> = {
  '100': ['AUTONOMO', 'PARTICULAR'],
  '111': ['AUTONOMO', 'EMPRESA'],
  '130': ['AUTONOMO'],
  '131': ['AUTONOMO'],
  '180': ['AUTONOMO', 'EMPRESA'],
  '190': ['AUTONOMO', 'EMPRESA'],
  '200': ['EMPRESA'],
  '303': ['AUTONOMO', 'EMPRESA'],
  '347': ['AUTONOMO', 'EMPRESA'],
  '349': ['AUTONOMO', 'EMPRESA'],
  '390': ['AUTONOMO', 'EMPRESA'],
  '720': ['AUTONOMO', 'EMPRESA'],
};

/**
 * Obtiene la lista de modelos fiscales disponibles para un tipo de cliente
 */
export function getAvailableTaxModelsForClientType(clientType: string): string[] {
  return Object.keys(TAX_MODELS_AVAILABILITY).filter((model) =>
    TAX_MODELS_AVAILABILITY[model].includes(clientType)
  );
}

/**
 * Verifica si un modelo fiscal está disponible para un tipo de cliente
 */
export function isTaxModelAvailableForClient(
  taxModel: string,
  clientType: string
): boolean {
  return TAX_MODELS_AVAILABILITY[taxModel]?.includes(clientType) || false;
}

/**
 * Mapea un estado de impuesto a su color correspondiente
 * 
 * @param estado - El estado del impuesto (PENDIENTE, CALCULADO, REALIZADO)
 * @returns Clases de Tailwind para el color de fondo
 */
export function getTaxStatusColor(estado: string): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'bg-white dark:bg-gray-800'; // Blanco (sin color especial)
    case 'CALCULADO':
      return 'bg-yellow-100 dark:bg-yellow-900/30'; // Amarillo
    case 'REALIZADO':
      return 'bg-green-100 dark:bg-green-900/30'; // Verde
    default:
      return 'bg-white dark:bg-gray-800';
  }
}

/**
 * Mapea un estado de impuesto a un color de borde para resaltar
 */
export function getTaxStatusBorderColor(estado: string): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'border-gray-300 dark:border-gray-600';
    case 'CALCULADO':
      return 'border-yellow-400 dark:border-yellow-600';
    case 'REALIZADO':
      return 'border-green-400 dark:border-green-600';
    default:
      return 'border-gray-300 dark:border-gray-600';
  }
}

/**
 * Obtiene el badge de color para el estado
 */
export function getTaxStatusBadge(estado: string): {
  label: string;
  className: string;
} {
  switch (estado) {
    case 'PENDIENTE':
      return {
        label: 'Pendiente',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      };
    case 'CALCULADO':
      return {
        label: 'Calculado',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'REALIZADO':
      return {
        label: 'Realizado',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      };
    default:
      return {
        label: estado,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      };
  }
}

/**
 * Lista de todos los modelos fiscales con su descripción
 */
export const ALL_TAX_MODELS = [
  { codigo: '100', nombre: 'IRPF - Declaración de la Renta', periodicidad: 'anual' },
  { codigo: '111', nombre: 'Retenciones - Trimestral', periodicidad: 'trimestral' },
  { codigo: '130', nombre: 'IRPF - Pago fraccionado (actividades económicas)', periodicidad: 'trimestral' },
  { codigo: '131', nombre: 'IRPF - Pago fraccionado (estimación directa)', periodicidad: 'trimestral' },
  { codigo: '180', nombre: 'Retenciones - Alquileres', periodicidad: 'trimestral' },
  { codigo: '190', nombre: 'Retenciones - Resumen anual', periodicidad: 'anual' },
  { codigo: '200', nombre: 'Impuesto sobre Sociedades', periodicidad: 'anual' },
  { codigo: '303', nombre: 'IVA - Autoliquidación', periodicidad: 'trimestral' },
  { codigo: '347', nombre: 'Operaciones con terceras personas', periodicidad: 'anual' },
  { codigo: '349', nombre: 'Operaciones intracomunitarias', periodicidad: 'mensual' },
  { codigo: '390', nombre: 'IVA - Resumen anual', periodicidad: 'anual' },
  { codigo: '720', nombre: 'Bienes en el extranjero', periodicidad: 'anual' },
];
