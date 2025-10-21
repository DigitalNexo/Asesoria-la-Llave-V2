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

export function deleteTaxAssignment(assignmentId: string) {
  return apiRequest(
    "DELETE",
    `/api/tax-assignments/${assignmentId}`
  ) as Promise<{ assignment: ClientTaxAssignment; softDeleted: boolean; message: string }>;
}
