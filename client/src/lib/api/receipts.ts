/**
 * API de Recibos - Sistema basado en BASU
 * Gestión de recibos para clientes registrados y esporádicos
 */

export interface Receipt {
  id: string;
  numeroRecibo: string;
  fecha: string;
  
  // Cliente registrado (opcional)
  clienteId?: string;
  cliente?: {
    id: string;
    razonSocial: string;
    nifCif: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  };
  
  // Cliente esporádico (no registrado)
  clienteNombre?: string;
  clienteNif?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  
  // Descripción y montos
  descripcionServicios: string;
  importe: number;
  porcentajeIva?: number;
  baseImponible?: number;
  total: number;
  
  // Notas y estado
  notasAdicionales?: string;
  pagado: boolean;
  fechaPago?: string;
  formaPago?: string;
  
  // PDF generado
  pdfPath?: string;
  
  // Auditoría
  fechaCreacion: string;
  fechaModificacion: string;
  creadoPor?: string;
  datosEmpresaId?: string;
}

export interface CreateReceiptData {
  numeroRecibo: string;
  fecha: string;
  
  // Cliente (uno de los dos)
  clienteId?: string;
  clienteNombre?: string;
  clienteNif?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  
  descripcionServicios: string;
  importe: number;
  porcentajeIva?: number;
  notasAdicionales?: string;
  pagado?: boolean;
  fechaPago?: string;
  formaPago?: string;
}

export interface UpdateReceiptData {
  numeroRecibo?: string;
  fecha?: string;
  
  clienteId?: string;
  clienteNombre?: string;
  clienteNif?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  
  descripcionServicios?: string;
  importe?: number;
  porcentajeIva?: number;
  notasAdicionales?: string;
  pagado?: boolean;
  fechaPago?: string;
  formaPago?: string;
}

export interface ReceiptFilters {
  clienteId?: string;
  pagado?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

const API_URL = '/api/receipts';

/**
 * Obtener todos los recibos con filtros opcionales
 */
export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
  const params = new URLSearchParams();
  
  if (filters?.clienteId) params.append('clienteId', filters.clienteId);
  if (filters?.pagado !== undefined) params.append('pagado', String(filters.pagado));
  if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
  if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
  if (filters?.search) params.append('search', filters.search);
  
  const url = params.toString() ? `${API_URL}?${params}` : API_URL;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Error al obtener recibos');
  }
  
  return response.json();
}

/**
 * Obtener un recibo por ID
 */
export async function getReceipt(id: string): Promise<Receipt> {
  const response = await fetch(`${API_URL}/${id}`);
  
  if (!response.ok) {
    throw new Error('Error al obtener el recibo');
  }
  
  return response.json();
}

/**
 * Crear un nuevo recibo
 */
export async function createReceipt(data: CreateReceiptData): Promise<Receipt> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear el recibo');
  }
  
  return response.json();
}

/**
 * Actualizar un recibo existente
 */
export async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar el recibo');
  }
  
  return response.json();
}

/**
 * Eliminar un recibo
 */
export async function deleteReceipt(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Error al eliminar el recibo');
  }
}

/**
 * Marcar un recibo como pagado
 */
export async function markReceiptAsPaid(
  id: string,
  formaPago: string,
  fechaPago?: string
): Promise<Receipt> {
  const response = await fetch(`${API_URL}/${id}/marcar-pagado`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      formaPago,
      fechaPago: fechaPago || new Date().toISOString(),
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al marcar como pagado');
  }
  
  return response.json();
}

/**
 * Descargar PDF del recibo
 */
export async function downloadReceiptPDF(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${id}/pdf`);
  
  if (!response.ok) {
    throw new Error('Error al descargar el PDF');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Generar número de recibo automático
 */
export async function generateReceiptNumber(): Promise<{ numero: string }> {
  const response = await fetch(`${API_URL}/generar-numero`);
  
  if (!response.ok) {
    throw new Error('Error al generar número de recibo');
  }
  
  return response.json();
}
