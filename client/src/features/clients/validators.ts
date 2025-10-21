import {
  TAX_RULES,
  isTaxModelAllowedForClientType,
  getAllowedPeriodsForModel,
  isEffectiveActive,
  type ClientType,
  type TaxPeriodicity,
} from "@shared/tax-rules";
import type { ClientTaxAssignment, TaxModelsConfig } from "./types";

export const TAX_RULES_MAP = TAX_RULES;

export function getCompatibleTaxModels(
  clientType: ClientType,
  configs: TaxModelsConfig[]
): TaxModelsConfig[] {
  if (configs.length === 0) {
    return Object.entries(TAX_RULES)
      .filter(([, rule]) => rule.allowedTypes.includes(clientType))
      .map(([code, rule]) => ({
        code,
        name: `Modelo ${code}`,
        allowedTypes: rule.allowedTypes,
        allowedPeriods: rule.allowedPeriods,
        labels: rule.labels ?? null,
        isActive: true,
        createdAt: "",
        updatedAt: "",
      }));
  }

  return configs.filter((config) =>
    config.allowedTypes.some((type) => type === clientType)
  );
}

export function getTaxModelName(
  code: string,
  configs: TaxModelsConfig[]
): string {
  const match = configs.find((config) => config.code === code);
  if (match) {
    return match.name;
  }
  return `Modelo ${code}`;
}

export function getAllowedPeriods(
  taxModelCode: string,
  configs: TaxModelsConfig[]
): TaxPeriodicity[] {
  const config = configs.find((item) => item.code === taxModelCode);
  if (config) {
    return config.allowedPeriods;
  }
  return getAllowedPeriodsForModel(taxModelCode);
}

export function isModelCompatibleWithClient(
  taxModelCode: string,
  clientType: ClientType
): boolean {
  return isTaxModelAllowedForClientType(taxModelCode, clientType);
}

export function getEffectiveActiveState(assignment: ClientTaxAssignment): boolean {
  return isEffectiveActive({
    endDate: assignment.endDate,
    activeFlag: assignment.activeFlag,
  });
}
