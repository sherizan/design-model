/**
 * Model runtime helpers for loading and merging base models with overrides.
 */

import tokensData from "@/tokens/tokens.json";
import contractData from "@/contracts/button.json";
import constraintsData from "@/constraints/button.rules.json";

export interface BaseModel {
  tokens: typeof tokensData;
  contract: typeof contractData;
  constraints: typeof constraintsData;
}

/**
 * Loads base model from JSON files.
 */
export function loadBaseModel(): BaseModel {
  return {
    tokens: tokensData,
    contract: contractData,
    constraints: constraintsData,
  };
}

/**
 * Deep merge helper: merges overrides into base object.
 * Arrays are replaced (not merged).
 */
export function mergeDeep<T extends Record<string, any>>(
  base: T,
  overrides: Partial<T>
): T {
  const result = { ...base };

  for (const key in overrides) {
    if (overrides[key] === undefined) {
      continue;
    }

    const baseValue = base[key];
    const overrideValue = overrides[key];

    if (
      typeof baseValue === "object" &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(overrideValue)
    ) {
      // Recursively merge nested objects
      result[key] = mergeDeep(baseValue, overrideValue);
    } else {
      // Replace with override value (including arrays and primitives)
      result[key] = overrideValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Basic validation for token overrides.
 */
export function validateTokenOverrides(overrides: any): boolean {
  if (typeof overrides !== "object" || overrides === null) {
    return false;
  }

  // Allow nested structure matching tokens.json
  // Basic type checks for known fields
  if (overrides.color) {
    if (typeof overrides.color !== "object") return false;
    if (overrides.color.primary && typeof overrides.color.primary !== "string") return false;
    if (overrides.color.onPrimary && typeof overrides.color.onPrimary !== "string") return false;
  }

  if (overrides.radius && typeof overrides.radius !== "object") return false;
  if (overrides.spacing && typeof overrides.spacing !== "object") return false;
  if (overrides.typography && typeof overrides.typography !== "object") return false;

  return true;
}

/**
 * Basic validation for constraint overrides.
 */
export function validateConstraintOverrides(overrides: any): boolean {
  if (typeof overrides !== "object" || overrides === null) {
    return false;
  }

  // Basic type checks for known fields
  if (overrides.onlyOnePrimaryPerView !== undefined && typeof overrides.onlyOnePrimaryPerView !== "boolean") {
    return false;
  }
  if (overrides.ghostHasNoBackground !== undefined && typeof overrides.ghostHasNoBackground !== "boolean") {
    return false;
  }
  if (overrides.disabledOpacity !== undefined && (typeof overrides.disabledOpacity !== "number" || overrides.disabledOpacity < 0 || overrides.disabledOpacity > 1)) {
    return false;
  }
  if (overrides.secondaryUsesSurface !== undefined && typeof overrides.secondaryUsesSurface !== "boolean") {
    return false;
  }

  return true;
}
