/**
 * API functions for tax models management
 */

export interface TaxModel {
  code: string;
  name: string;
  allowedTypes: string[];
  allowedPeriods: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxModelInput {
  code: string;
  name: string;
  allowedTypes: string[];
  allowedPeriods: string[];
}

export interface UpdateTaxModelInput {
  name?: string;
  allowedTypes?: string[];
  allowedPeriods?: string[];
  isActive?: boolean;
}

/**
 * Get all tax models
 */
export async function getTaxModels(): Promise<TaxModel[]> {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/tax-models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al obtener modelos" }));
    throw new Error(error.error || "No se pudieron obtener los modelos");
  }

  return response.json();
}

/**
 * Create a new tax model
 */
export async function createTaxModel(data: CreateTaxModelInput): Promise<TaxModel> {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/tax-models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al crear modelo" }));
    throw new Error(error.error || "No se pudo crear el modelo");
  }

  return response.json();
}

/**
 * Update an existing tax model
 */
export async function updateTaxModel(
  code: string,
  data: UpdateTaxModelInput
): Promise<TaxModel> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/api/tax-models/${code}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al actualizar modelo" }));
    throw new Error(error.error || "No se pudo actualizar el modelo");
  }

  return response.json();
}

/**
 * Delete a tax model
 */
export async function deleteTaxModel(code: string): Promise<void> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/api/tax-models/${code}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al eliminar modelo" }));
    throw new Error(error.error || "No se pudo eliminar el modelo");
  }
}
