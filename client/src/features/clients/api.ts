import { apiRequest } from "@/lib/queryClient";
import type {
  ClientDetail,
  ClientPayload,
  ClientTaxAssignment,
  TaxAssignmentPayload,
  TaxModelsConfig,
} from "./types";

export function fetchClientDetail(id: string) {
  return apiRequest("GET", `/api/clients/${id}`) as Promise<ClientDetail>;
}

export function fetchTaxModelsConfig() {
  return apiRequest("GET", "/api/tax-models-config") as Promise<TaxModelsConfig[]>;
}

export function createClient(payload: ClientPayload) {
  return apiRequest("POST", "/api/clients", payload) as Promise<ClientDetail>;
}

export function updateClient(id: string, payload: Partial<ClientPayload>) {
  return apiRequest("PATCH", `/api/clients/${id}`, payload) as Promise<ClientDetail>;
}

export function createTaxAssignment(clientId: string, payload: TaxAssignmentPayload) {
  return apiRequest(
    "POST",
    `/api/clients/${clientId}/tax-assignments`,
    payload
  ) as Promise<ClientTaxAssignment>;
}

export function updateTaxAssignment(
  assignmentId: string,
  payload: Partial<TaxAssignmentPayload> & { activeFlag?: boolean }
) {
  return apiRequest(
    "PATCH",
    `/api/tax-assignments/${assignmentId}`,
    payload
  ) as Promise<ClientTaxAssignment>;
}

export function deleteTaxAssignment(assignmentId: string, hard?: boolean) {
  const query = hard ? '?hard=1' : '';
  return apiRequest(
    "DELETE",
    `/api/tax-assignments/${assignmentId}${query}`
  ) as Promise<{ assignment: ClientTaxAssignment; softDeleted: boolean; message: string }>;
}

export function bulkDeleteTaxAssignments(
  clientId: string,
  opts?: { codes?: string[]; assignmentIds?: string[]; hard?: boolean }
) {
  // Usamos POST por compatibilidad con proxies/firewalls que bloquean DELETE con body
  const body: any = {
    codes: opts?.codes,
    assignmentIds: opts?.assignmentIds,
    hard: opts?.hard ?? true, // por defecto, borrado duro
  };
  return apiRequest(
    "POST",
    `/api/clients/${clientId}/tax-assignments/delete`,
    body
  ) as Promise<{ deleted: number; deactivated: number; assignments?: ClientTaxAssignment[] }>;
}
