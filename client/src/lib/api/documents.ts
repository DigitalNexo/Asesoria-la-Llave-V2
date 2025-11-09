import { apiRequest } from '../queryClient';

export interface Receipt {
  id: string;
  numero: string;
  year: number;
  sequential: number;
  client_id?: string;
  recipient_name: string;
  recipient_nif: string;
  recipient_email: string;
  recipient_address?: string;
  concepto: string;
  base_imponible: number;
  iva_porcentaje: number;
  iva_importe: number;
  total: number;
  status: 'BORRADOR' | 'ENVIADO' | 'ARCHIVADO';
  sent_at?: string;
  pdf_path?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  clients?: any;
  creator?: any;
}

export interface Document {
  id: string;
  type: 'DATA_PROTECTION' | 'BANKING_DOMICILIATION';
  name: string;
  description?: string;
  template_id?: string;
  client_id: string;
  status: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'ARCHIVADO';
  signature_status: 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO';
  signature_date?: string;
  signed_file_path?: string;
  file_path?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  clients?: any;
  template?: any;
  creator?: any;
}

export interface DocumentTemplate {
  id: string;
  type: string;
  name: string;
  description?: string;
  content: string;
  available_variables?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========== RECIBOS ==========

export async function createReceipt(data: {
  concepto: string;
  base_imponible: number;
  iva_porcentaje?: number;
  clientId?: string;
  recipient_name: string;
  recipient_nif: string;
  recipient_email: string;
  recipient_address?: string;
  notes?: string;
}) {
  return await apiRequest('POST', '/api/documents/receipts', data);
}

export async function listReceipts(filters?: {
  status?: string;
  clientId?: string;
  year?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.clientId) params.append('clientId', filters.clientId);
  if (filters?.year) params.append('year', filters.year.toString());

  return await apiRequest('GET', `/api/documents/receipts?${params.toString()}`);
}

export async function getReceiptById(id: string) {
  return await apiRequest('GET', `/api/documents/receipts/${id}`);
}

export async function generateReceiptPdf(id: string) {
  return await apiRequest('POST', `/api/documents/receipts/${id}/generate-pdf`);
}

export async function sendReceipt(id: string, data: { to: string; subject?: string; message?: string }) {
  return await apiRequest('POST', `/api/documents/receipts/${id}/send`, data);
}

// ========== DOCUMENTOS ==========

export async function createDocument(data: {
  type: 'DATA_PROTECTION' | 'BANKING_DOMICILIATION';
  clientId: string;
  templateId?: string;
  notes?: string;
}) {
  return await apiRequest('POST', '/api/documents/documents', data);
}

export async function listDocuments(filters?: { type?: string; status?: string; clientId?: string }) {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.clientId) params.append('clientId', filters.clientId);

  return await apiRequest('GET', `/api/documents/documents?${params.toString()}`);
}

export async function getDocumentById(id: string) {
  return await apiRequest('GET', `/api/documents/documents/${id}`);
}

export async function generateDocumentPdf(id: string) {
  return await apiRequest('POST', `/api/documents/documents/${id}/generate-pdf`);
}

export async function sendDocument(id: string, to: string, subject: string, message: string) {
  return await apiRequest('POST', `/api/documents/documents/${id}/send`, { to, subject, message });
}

export async function acceptDocument(id: string, signedFile: File) {
  const formData = new FormData();
  formData.append('signedFile', signedFile);

  const response = await fetch(`/api/documents/documents/${id}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
}

// ========== PLANTILLAS ==========

export async function createTemplate(data: {
  type: string;
  name: string;
  content: string;
  description?: string;
}) {
  return await apiRequest('POST', '/api/documents/templates', data);
}

export async function listTemplates(filters?: { type?: string; isActive?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

  return await apiRequest('GET', `/api/documents/templates?${params.toString()}`);
}

export async function getTemplateById(id: string) {
  return await apiRequest('GET', `/api/documents/templates/${id}`);
}

export async function updateTemplate(id: string, data: any) {
  return await apiRequest('PUT', `/api/documents/templates/${id}`, data);
}

export async function deleteTemplate(id: string) {
  return await apiRequest('DELETE', `/api/documents/templates/${id}`);
}
