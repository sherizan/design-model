/**
 * MCP tool implementations for Design Model.
 */

import { loadBaseModel } from "../lib/modelRuntime";
import { validate as validateViewSpec } from "../resolver/validate";
import { suggestFixes, applyFixesToIntent } from "../resolver/suggestFixes";
import type {
  DesignModelMetadata,
  ValidateParams,
  ValidateResult,
  SuggestFixesParams,
  SuggestFixesResult,
  ApplyFixesParams,
  ApplyFixesResult,
} from "./types";

/**
 * Get the design model metadata (tokens, contracts, enabled constraints).
 */
export function getDesignModel(): DesignModelMetadata {
  const baseModel = loadBaseModel();
  
  // Build enabledConstraints from constraints object
  const enabledConstraints: Record<string, boolean> = {};
  if (baseModel.constraints.onlyOnePrimaryPerView !== undefined) {
    enabledConstraints.onlyOnePrimaryPerView = baseModel.constraints.onlyOnePrimaryPerView === true;
  }
  if ((baseModel.constraints as any).maxPrimaryButtonsPerView !== undefined) {
    enabledConstraints.maxPrimaryButtonsPerView = typeof (baseModel.constraints as any).maxPrimaryButtonsPerView === "number";
  }
  if (baseModel.constraints.ghostHasNoBackground !== undefined) {
    enabledConstraints.ghostHasNoBackground = baseModel.constraints.ghostHasNoBackground === true;
  }
  if (baseModel.constraints.secondaryUsesSurface !== undefined) {
    enabledConstraints.secondaryUsesSurface = baseModel.constraints.secondaryUsesSurface === true;
  }
  if (baseModel.constraints.disabledOpacity !== undefined) {
    enabledConstraints.disabledOpacity = typeof baseModel.constraints.disabledOpacity === "number";
  }

  return {
    tokens: baseModel.tokens,
    contracts: baseModel.contract,
    constraints: {
      enabledConstraints,
    },
  };
}

/**
 * Validate a view spec against enabled constraints.
 * This is a read-only validation that doesn't mutate the input.
 */
export function validate(params: ValidateParams): ValidateResult {
  const { viewSpec, enabledConstraints } = params;
  return validateViewSpec(viewSpec, enabledConstraints);
}

/**
 * Suggest fixes for constraint violations.
 */
export function suggestFixesTool(params: SuggestFixesParams): SuggestFixesResult {
  const { viewSpec, enabledConstraints, violations } = params;
  const fixes = suggestFixes({
    intent: viewSpec,
    violations,
    enabledConstraints,
  });

  // Flatten all patches from all fixes
  const allPatches: JsonPatchOperation[] = [];
  for (const fix of fixes) {
    allPatches.push(...fix.patches);
  }

  return {
    fixes: allPatches,
  };
}

/**
 * Apply fixes to a view spec.
 */
export function applyFixes(params: ApplyFixesParams): ApplyFixesResult {
  const { viewSpec, fixes } = params;
  const updatedViewSpec = applyFixesToIntent(viewSpec, fixes);
  return {
    viewSpec: updatedViewSpec,
  };
}
