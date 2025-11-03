/**
 * Sistema de reemplazo de variables para plantillas de presupuestos
 * Reemplaza {{variable}} en HTML con datos reales
 */

import type { budgets_type as BudgetType } from '@prisma/client';

interface BudgetData {
  // Datos comunes a todos los presupuestos
  codigo: string;
  fecha: string;
  nombre_contacto: string;
  email: string;
  telefono: string;
  subtotal: string;
  iva: string;
  total: string;
  empresa: string;
  descripcion?: string;
  
  // Datos específicos PYME
  nombre_sociedad?: string;
  actividad?: string;
  periodo_declaraciones?: string;
  num_asientos?: string;
  nominas_mes?: string;
  
  // Datos específicos AUTONOMO
  sistema_tributacion?: string;
  facturacion_anual?: string;
  num_facturas?: string;
  
  // Datos específicos RENTA
  tipo_declaracion?: string;
  ingresos?: string;
  retenciones?: string;
  
  // Datos específicos HERENCIAS
  titulo_sucesorio?: string;
  num_herederos?: string;
  fincas_madrid?: string;
  caudal?: string;
  tipo_proceso?: string;
}

/**
 * Reemplaza todas las variables {{variable}} en el HTML con sus valores
 */
export function replaceTemplateVariables(
  htmlContent: string,
  data: BudgetData
): string {
  let result = htmlContent;
  
  // Recorrer todas las propiedades del objeto data
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Crear regex para {{key}} (case insensitive)
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, String(value));
    }
  });
  
  // Limpiar variables no reemplazadas (opcional - dejar vacías o mostrar placeholder)
  // result = result.replace(/{{[^}]+}}/g, ''); // Esto las eliminaría
  result = result.replace(/{{([^}]+)}}/g, '<span style="color: red; font-style: italic;">[$1 no disponible]</span>');
  
  return result;
}

/**
 * Extrae todas las variables {{variable}} encontradas en un HTML
 */
export function extractTemplateVariables(htmlContent: string): string[] {
  const regex = /{{([^}]+)}}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(htmlContent)) !== null) {
    const varName = match[1].trim();
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

/**
 * Obtiene las variables disponibles según el tipo de presupuesto
 */
export function getAvailableVariablesByType(type: BudgetType): Record<string, string> {
  const commonVars = {
    codigo: 'Código del presupuesto',
    fecha: 'Fecha de emisión',
    nombre_contacto: 'Nombre del contacto',
    email: 'Email del contacto',
    telefono: 'Teléfono del contacto',
    subtotal: 'Subtotal sin IVA',
    iva: 'Importe del IVA',
    total: 'Total con IVA',
    empresa: 'Nombre de la empresa',
    descripcion: 'Descripción del presupuesto'
  };
  
  switch (type) {
    case 'PYME':
      return {
        ...commonVars,
        nombre_sociedad: 'Nombre de la sociedad',
        actividad: 'Actividad de la empresa',
        periodo_declaraciones: 'Periodo de declaraciones',
        num_asientos: 'Número de asientos contables',
        nominas_mes: 'Número de nóminas al mes'
      };
      
    case 'AUTONOMO':
      return {
        ...commonVars,
        sistema_tributacion: 'Sistema de tributación',
        facturacion_anual: 'Facturación anual',
        num_facturas: 'Número de facturas'
      };
      
    case 'RENTA':
      return {
        ...commonVars,
        tipo_declaracion: 'Tipo de declaración',
        ingresos: 'Ingresos declarados',
        retenciones: 'Retenciones aplicadas'
      };
      
    case 'HERENCIAS':
      return {
        ...commonVars,
        titulo_sucesorio: 'Título sucesorio',
        num_herederos: 'Número de herederos',
        fincas_madrid: 'Fincas en Madrid',
        caudal: 'Caudal hereditario',
        tipo_proceso: 'Tipo de proceso'
      };
      
    default:
      return commonVars;
  }
}

/**
 * Formatea un valor numérico como moneda
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

/**
 * Formatea una fecha al formato español
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Prepara los datos del presupuesto para reemplazo de variables
 */
export function prepareBudgetData(budget: any): BudgetData {
  const data: BudgetData = {
    codigo: budget.code || '',
    fecha: formatDate(new Date(budget.createdAt)),
    nombre_contacto: budget.contactName || '',
    email: budget.contactEmail || '',
    telefono: budget.contactPhone || '',
    subtotal: formatCurrency(budget.subtotal || 0),
    iva: formatCurrency(budget.iva || 0),
    total: formatCurrency(budget.total || 0),
    empresa: budget.companyBrand === 'LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online',
    descripcion: budget.description || ''
  };
  
  // Agregar datos específicos según el tipo
  if (budget.type === 'PYME' && budget.details) {
    data.nombre_sociedad = budget.details.companyName || '';
    data.actividad = budget.details.activity || '';
    data.periodo_declaraciones = budget.details.declarationPeriod || '';
    data.num_asientos = String(budget.details.numEntries || 0);
    data.nominas_mes = String(budget.details.payrollsPerMonth || 0);
  }
  
  if (budget.type === 'AUTONOMO' && budget.details) {
    data.sistema_tributacion = budget.details.taxationSystem || '';
    data.facturacion_anual = formatCurrency(budget.details.annualRevenue || 0);
    data.num_facturas = String(budget.details.numInvoices || 0);
  }
  
  if (budget.type === 'RENTA' && budget.details) {
    data.tipo_declaracion = budget.details.declarationType || '';
    data.ingresos = formatCurrency(budget.details.income || 0);
    data.retenciones = formatCurrency(budget.details.withholdings || 0);
  }
  
  if (budget.type === 'HERENCIAS' && budget.details) {
    data.titulo_sucesorio = budget.details.successionTitle || '';
    data.num_herederos = String(budget.details.numHeirs || 0);
    data.fincas_madrid = budget.details.propertiesMadrid || '';
    data.caudal = formatCurrency(budget.details.estate || 0);
    data.tipo_proceso = budget.details.processType || '';
  }
  
  return data;
}
