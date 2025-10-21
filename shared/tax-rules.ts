export const CLIENT_TYPES = ["AUTONOMO", "EMPRESA", "PARTICULAR"] as const;
export const TAX_PERIODICITIES = ["MENSUAL", "TRIMESTRAL", "ANUAL", "ESPECIAL_FRACCIONADO"] as const;

export type ClientType = typeof CLIENT_TYPES[number];
export type TaxPeriodicity = typeof TAX_PERIODICITIES[number];

export interface TaxRule {
  allowedTypes: ClientType[];
  allowedPeriods: TaxPeriodicity[];
  labels?: string[];
}

export const TAX_RULES: Record<string, TaxRule> = {
  "100": { allowedTypes: ["AUTONOMO", "PARTICULAR"], allowedPeriods: ["ANUAL"] },
  "200": { allowedTypes: ["EMPRESA"], allowedPeriods: ["ANUAL"] },
  "202": {
    allowedTypes: ["EMPRESA"],
    allowedPeriods: ["ESPECIAL_FRACCIONADO"],
    labels: ["Abril", "Octubre", "Diciembre"],
  },
  "130": { allowedTypes: ["AUTONOMO"], allowedPeriods: ["TRIMESTRAL"] },
  "131": { allowedTypes: ["AUTONOMO"], allowedPeriods: ["TRIMESTRAL"] },
  "303": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
  "390": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "347": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "349": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
  "720": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "190": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "180": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "111": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
} as const;

export const TAX_MODEL_METADATA: Record<
  string,
  { name: string; description?: string }
> = {
  "100": { name: "IRPF - Declaración de la Renta" },
  "111": { name: "Retenciones - Modelo 111" },
  "130": { name: "IRPF - Pago fraccionado (actividades económicas)" },
  "131": { name: "IRPF - Pago fraccionado (estimación directa)" },
  "180": { name: "Retenciones - Alquileres" },
  "190": { name: "Retenciones - Resumen anual" },
  "200": { name: "Impuesto sobre Sociedades" },
  "202": { name: "Pagos fraccionados IS" },
  "303": { name: "IVA - Autoliquidación" },
  "347": { name: "Operaciones con terceras personas" },
  "349": { name: "Operaciones intracomunitarias" },
  "390": { name: "IVA - Resumen anual" },
  "720": { name: "Bienes en el extranjero" },
};

export function isTaxModelAllowedForClientType(
  taxModelCode: string,
  clientType: ClientType
): boolean {
  const rule = TAX_RULES[taxModelCode];
  if (!rule) {
    return false;
  }
  return rule.allowedTypes.includes(clientType);
}

export function getAllowedPeriodsForModel(taxModelCode: string): TaxPeriodicity[] {
  return TAX_RULES[taxModelCode]?.allowedPeriods ?? [];
}

export function validateTaxAssignmentInput(options: {
  clientType: ClientType;
  taxModelCode: string;
  periodicity: TaxPeriodicity;
}) {
  const { clientType, taxModelCode, periodicity } = options;
  const rule = TAX_RULES[taxModelCode];

  if (!rule) {
    throw new Error(`Modelo fiscal desconocido: ${taxModelCode}`);
  }

  if (!rule.allowedTypes.includes(clientType)) {
    throw new Error(
      `El modelo ${taxModelCode} no es compatible con clientes de tipo ${clientType}`
    );
  }

  if (!rule.allowedPeriods.includes(periodicity)) {
    throw new Error(
      `La periodicidad ${periodicity} no está permitida para el modelo ${taxModelCode}`
    );
  }
}

export function isEffectiveActive(
  assignment: { endDate: Date | string | null | undefined; activeFlag: boolean | null | undefined }
): boolean {
  if (assignment.endDate) {
    return false;
  }
  return Boolean(assignment.activeFlag);
}
