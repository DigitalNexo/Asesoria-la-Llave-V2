import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ===== TIPOS =====

export interface GestoriaBudget {
  id: string;
  numero: string;
  tipoGestoria: 'OFICIAL' | 'ONLINE';
  estado: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'FACTURADO';
  
  // Cliente potencial
  nombreCliente: string;
  nifCif: string;
  email: string;
  telefono?: string;
  direccion?: string;
  personaContacto?: string;
  
  // Datos empresariales
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
  
  // Servicios adicionales
  solicitudCertificados?: boolean;
  censosAEAT?: boolean;
  recepcionNotificaciones?: boolean;
  estadisticasINE?: boolean;
  solicitudAyudas?: boolean;
  conLaboralSocial?: boolean;
  
  // Descuentos
  aplicaDescuento?: boolean;
  tipoDescuento?: 'PORCENTAJE' | 'FIJO';
  valorDescuento?: number;
  
  // Totales
  totalContabilidad: number;
  totalLaboral: number;
  subtotal: number;
  descuentoCalculado: number;
  totalFinal: number;
  
  // Metadata
  fechaCreacion: string;
  fechaModificacion: string;
  creadoPor: string;
  clienteId?: string;
  configId: string;
  motivoRechazo?: string;
  pdfPath?: string;
  
  serviciosAdicionales: Array<{
    id: string;
    nombre: string;
    precio: number;
    tipoServicio: 'MENSUAL' | 'PUNTUAL';
    incluido: boolean;
  }>;
}

export interface CreateBudgetInput {
  tipoGestoria: 'OFICIAL' | 'ONLINE';
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
  modelo303?: boolean;
  modelo111?: boolean;
  modelo115?: boolean;
  modelo130?: boolean;
  modelo100?: boolean;
  modelo349?: boolean;
  modelo347?: boolean;
  solicitudCertificados?: boolean;
  censosAEAT?: boolean;
  recepcionNotificaciones?: boolean;
  estadisticasINE?: boolean;
  solicitudAyudas?: boolean;
  conLaboralSocial?: boolean;
  aplicaDescuento?: boolean;
  tipoDescuento?: 'PORCENTAJE' | 'FIJO';
  valorDescuento?: number;
  creadoPor: string;
  configId: string;
  serviciosAdicionales?: Array<{
    nombre: string;
    precio: number;
    tipoServicio: 'MENSUAL' | 'PUNTUAL';
    incluido: boolean;
  }>;
}

export interface BudgetFilters {
  tipoGestoria?: 'OFICIAL' | 'ONLINE';
  estado?: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'FACTURADO';
  nombreCliente?: string;
  nifCif?: string;
  email?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface BudgetCalculationInput {
  facturasMes: number;
  nominasMes?: number;
  facturacion: number;
  sistemaTributacion: string;
  periodoDeclaraciones: string;
  modelo303?: boolean;
  modelo111?: boolean;
  modelo115?: boolean;
  modelo130?: boolean;
  modelo100?: boolean;
  modelo349?: boolean;
  modelo347?: boolean;
  solicitudCertificados?: boolean;
  censosAEAT?: boolean;
  recepcionNotificaciones?: boolean;
  estadisticasINE?: boolean;
  solicitudAyudas?: boolean;
  conLaboralSocial?: boolean;
  aplicaDescuento?: boolean;
  tipoDescuento?: 'PORCENTAJE' | 'FIJO';
  valorDescuento?: number;
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
  desglose: {
    serviciosContabilidad: Array<{ nombre: string; precio: number }>;
    serviciosLaborales: Array<{ nombre: string; precio: number }>;
    serviciosAdicionales: Array<{ nombre: string; precio: number }>;
  };
}

export interface BudgetStatistics {
  totalPresupuestos: number;
  presupuestosBorrador: number;
  presupuestosEnviados: number;
  presupuestosAceptados: number;
  presupuestosRechazados: number;
  tasaConversion: number;
  valorTotal: number;
  valorMedio: number;
}

export interface BudgetConfiguration {
  id: string;
  tipoGestoria: 'OFICIAL' | 'ONLINE';
  activo: boolean;
  version: string;
  fechaVigencia: string;
  
  // Precios base
  precioBaseFactura: number;
  precioBaseNomina: number;
  
  // Precios modelos
  precioModelo303: number;
  precioModelo111: number;
  precioModelo115: number;
  precioModelo130: number;
  precioModelo100: number;
  precioModelo349: number;
  precioModelo347: number;
  
  // Servicios adicionales
  precioSolicitudCertificados: number;
  precioCensosAEAT: number;
  precioRecepcionNotificaciones: number;
  precioEstadisticasINE: number;
  precioSolicitudAyudas: number;
  
  // Laborales
  precioLaboralBase: number;
  precioLaboralNomina: number;
  
  // Factores
  factorTributacionEstimacion: number;
  factorTributacionDirecta: number;
  factorPeriodoMensual: number;
  factorPeriodoTrimestral: number;
  factorPeriodoAnual: number;
  
  // Rangos facturación
  rangoFacturacion1Hasta: number;
  rangoFacturacion1Factor: number;
  rangoFacturacion2Hasta: number;
  rangoFacturacion2Factor: number;
  rangoFacturacion3Factor: number;
}

// ===== API CALLS =====

const API_BASE = '/api/gestoria-budgets';

async function fetchBudgets(filters?: BudgetFilters): Promise<GestoriaBudget[]> {
  const params = new URLSearchParams();
  if (filters?.tipoGestoria) params.append('tipo', filters.tipoGestoria);
  if (filters?.estado) params.append('estado', filters.estado);
  if (filters?.nombreCliente) params.append('nombreCompleto', filters.nombreCliente);
  if (filters?.nifCif) params.append('cifNif', filters.nifCif);
  if (filters?.email) params.append('email', filters.email);
  if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
  if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
  
  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) throw new Error('Error al cargar presupuestos');
  const data = await response.json();
  return data.data;
}

async function fetchBudgetById(id: string): Promise<GestoriaBudget> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('Error al cargar presupuesto');
  const data = await response.json();
  return data.data;
}

async function createBudget(input: CreateBudgetInput): Promise<GestoriaBudget> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear presupuesto');
  }
  const data = await response.json();
  return data.data;
}

async function updateBudget(id: string, input: Partial<CreateBudgetInput>): Promise<GestoriaBudget> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Error al actualizar presupuesto');
  const data = await response.json();
  return data.data;
}

async function deleteBudget(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Error al eliminar presupuesto');
}

async function calculateBudget(
  calculation: BudgetCalculationInput,
  tipo: 'OFICIAL' | 'ONLINE'
): Promise<BudgetCalculationResult> {
  const response = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calculation, tipo })
  });
  if (!response.ok) throw new Error('Error al calcular presupuesto');
  const data = await response.json();
  return data.data;
}

async function sendBudget(id: string, options?: { customMessage?: string; cc?: string[] }): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {})
  });
  if (!response.ok) throw new Error('Error al enviar presupuesto');
}

async function acceptBudget(id: string): Promise<GestoriaBudget> {
  const response = await fetch(`${API_BASE}/${id}/accept`, { method: 'POST' });
  if (!response.ok) throw new Error('Error al aceptar presupuesto');
  const data = await response.json();
  return data.data;
}

async function rejectBudget(id: string, motivoRechazo: string): Promise<GestoriaBudget> {
  const response = await fetch(`${API_BASE}/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivoRechazo })
  });
  if (!response.ok) throw new Error('Error al rechazar presupuesto');
  const data = await response.json();
  return data.data;
}

async function convertBudget(id: string, options?: any): Promise<{ clientId: string }> {
  const response = await fetch(`${API_BASE}/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {})
  });
  if (!response.ok) throw new Error('Error al convertir presupuesto');
  const data = await response.json();
  return data.data;
}

async function canConvertBudget(id: string): Promise<{ canConvert: boolean; reason?: string }> {
  const response = await fetch(`${API_BASE}/${id}/can-convert`);
  if (!response.ok) throw new Error('Error al verificar conversión');
  const data = await response.json();
  return data.data;
}

async function fetchBudgetStatistics(
  tipo?: 'OFICIAL' | 'ONLINE',
  fechaDesde?: string,
  fechaHasta?: string
): Promise<BudgetStatistics> {
  const params = new URLSearchParams();
  if (tipo) params.append('tipo', tipo);
  if (fechaDesde) params.append('fechaDesde', fechaDesde);
  if (fechaHasta) params.append('fechaHasta', fechaHasta);
  
  const response = await fetch(`${API_BASE}/stats/summary?${params}`);
  if (!response.ok) throw new Error('Error al cargar estadísticas');
  const data = await response.json();
  return data.data;
}

async function fetchActiveConfig(tipo: 'OFICIAL' | 'ONLINE'): Promise<BudgetConfiguration> {
  const response = await fetch(`${API_BASE}/config/active/${tipo}`);
  if (!response.ok) throw new Error(`No hay configuración activa para ${tipo}`);
  const data = await response.json();
  return data.data;
}

async function fetchAllConfigs(filters?: { tipo?: 'OFICIAL' | 'ONLINE'; activo?: boolean }): Promise<BudgetConfiguration[]> {
  const params = new URLSearchParams();
  if (filters?.tipo) params.append('tipo', filters.tipo);
  if (filters?.activo !== undefined) params.append('activo', String(filters.activo));
  
  const response = await fetch(`${API_BASE}/config/list?${params}`);
  if (!response.ok) throw new Error('Error al cargar configuraciones');
  const data = await response.json();
  return data.data;
}

async function createConfig(input: Partial<BudgetConfiguration>): Promise<BudgetConfiguration> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Error al crear configuración');
  const data = await response.json();
  return data.data;
}

async function updateConfig(id: string, input: Partial<BudgetConfiguration>): Promise<BudgetConfiguration> {
  const response = await fetch(`${API_BASE}/config/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Error al actualizar configuración');
  const data = await response.json();
  return data.data;
}

async function deleteConfig(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/config/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Error al eliminar configuración');
}

// ===== REACT QUERY HOOKS =====

export function useGestoriaBudgets(filters?: BudgetFilters) {
  return useQuery({
    queryKey: ['gestoria-budgets', filters],
    queryFn: () => fetchBudgets(filters)
  });
}

export function useGestoriaBudget(id: string) {
  return useQuery({
    queryKey: ['gestoria-budget', id],
    queryFn: () => fetchBudgetById(id),
    enabled: !!id
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
    }
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateBudgetInput> }) => 
      updateBudget(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['gestoria-budget', variables.id] });
    }
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
    }
  });
}

export function useCalculateBudget() {
  return useMutation({
    mutationFn: ({ calculation, tipo }: { calculation: BudgetCalculationInput; tipo: 'OFICIAL' | 'ONLINE' }) =>
      calculateBudget(calculation, tipo)
  });
}

export function useSendBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: any }) => sendBudget(id, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['gestoria-budget', variables.id] });
    }
  });
}

export function useAcceptBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptBudget,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['gestoria-budget', id] });
    }
  });
}

export function useRejectBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivoRechazo }: { id: string; motivoRechazo: string }) =>
      rejectBudget(id, motivoRechazo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['gestoria-budget', variables.id] });
    }
  });
}

export function useConvertBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: any }) => convertBudget(id, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gestoria-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['gestoria-budget', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });
}

export function useCanConvertBudget(id: string) {
  return useQuery({
    queryKey: ['can-convert-budget', id],
    queryFn: () => canConvertBudget(id),
    enabled: !!id
  });
}

export function useBudgetStatistics(tipo?: 'OFICIAL' | 'ONLINE', fechaDesde?: string, fechaHasta?: string) {
  return useQuery({
    queryKey: ['budget-statistics', tipo, fechaDesde, fechaHasta],
    queryFn: () => fetchBudgetStatistics(tipo, fechaDesde, fechaHasta)
  });
}

export function useBudgetConfigs(filters?: { tipo?: 'OFICIAL' | 'ONLINE'; activo?: boolean }) {
  return useQuery({
    queryKey: ['budget-configs', filters],
    queryFn: () => fetchAllConfigs(filters)
  });
}

export function useActiveConfig(tipo: 'OFICIAL' | 'ONLINE') {
  return useQuery({
    queryKey: ['active-config', tipo],
    queryFn: () => fetchActiveConfig(tipo),
    enabled: !!tipo
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-configs'] });
      queryClient.invalidateQueries({ queryKey: ['active-config'] });
    }
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BudgetConfiguration> }) =>
      updateConfig(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-configs'] });
      queryClient.invalidateQueries({ queryKey: ['active-config'] });
    }
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-configs'] });
    }
  });
}

// Función helper para descargar PDF
export function downloadBudgetPDF(id: string, numero: string) {
  window.open(`${API_BASE}/${id}/pdf`, '_blank');
}
