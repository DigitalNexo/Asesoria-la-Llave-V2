/**
 * Tipos compartidos para servicios de cálculo de presupuestos
 */

export interface BudgetItemInput {
  concept: string;
  category: string;
  position: number;
  quantity: number;
  unitPrice: number;
  vatPct: number;
  subtotal: number;
  total: number;
}

export interface CalculationResult {
  items: BudgetItemInput[];
  subtotal: number;
  vatTotal: number;
  total: number;
}

// ==== PYME ====
export interface PymeInput {
  asientosMes: number; // 0-8 (niveles)
  nominasMes: number;
  facturacion: number;
  irpfAlquileres: boolean;
  ivaIntracomunitario: boolean;
  notificaciones: boolean;
  estadisticasINE: boolean;
  periodo: 'MENSUAL' | 'TRIMESTRAL';
  emprendedor: boolean;
}

// ==== AUTÓNOMO ====
export interface AutonomoInput {
  facturasMes: number; // rango: 25, 50, 100, 150, 200
  nominasMes: number;
  facturacion: number;
  irpfAlquileres: boolean;
  ivaIntracomunitario: boolean;
  notificaciones: boolean;
  estadisticasINE: boolean;
  periodo: 'MENSUAL' | 'TRIMESTRAL';
  sistemaTributacion: 'NORMAL' | 'ESN' | 'MODULOS';
  emprendedor: boolean;
}

// ==== RENTA ====
export interface RentaInput {
  unidadFamiliar: 'MATRIMONIO' | 'MATRIMONIO_HIJOS' | 'OTROS';
  autonomo: boolean;
  inmueblesAlquilados: number;
  ventaInmuebles: number;
  ventaFinancieros: number;
  otrasGanancias: number;
}

// ==== HERENCIAS ====
export interface HerenciasInput {
  caudalHereditario: number; // mínimo 20000
  herederos: number;
  fincasComunidad: number;
  fincasOtras: number;
  productosFinancieros: number;
  vehiculos: number;
  sinTestamento: boolean;
  sinAcuerdo: boolean;
  escriturar: boolean;
  aplicarDescuento15: boolean; // decisión de negocio
}
