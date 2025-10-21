import type { ClientType, TaxPeriodicity } from "@shared/tax-rules";

export interface TaxModelsConfig {
  code: string;
  name: string;
  allowedTypes: ClientType[];
  allowedPeriods: TaxPeriodicity[];
  labels: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientEmployeeSummary {
  userId: string;
  isPrimary: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface ClientTaxAssignment {
  id: string;
  clientId: string;
  taxModelCode: string;
  periodicity: TaxPeriodicity;
  startDate: string;
  endDate: string | null;
  activeFlag: boolean;
  notes: string | null;
  effectiveActive: boolean;
  taxModel: TaxModelsConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail {
  id: string;
  razonSocial: string;
  nifCif: string;
  tipo: ClientType;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaAlta: string;
  fechaBaja: string | null;
  responsableAsignado: string | null;
  isActive: boolean;
  notes: string | null;
  taxAssignments: ClientTaxAssignment[];
  employees?: ClientEmployeeSummary[];
}

export interface ClientListItem extends ClientDetail {
  taxModels?: string[] | null;
}

export interface ClientPayload {
  razonSocial: string;
  nifCif: string;
  tipo: ClientType;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  responsableAsignado?: string | null;
  isActive?: boolean;
  fechaAlta?: string | null;
  fechaBaja?: string | null;
  notes?: string | null;
}

export interface TaxAssignmentPayload {
  taxModelCode: string;
  periodicity: TaxPeriodicity;
  startDate: string;
  endDate?: string | null;
  activeFlag?: boolean;
  notes?: string | null;
}
