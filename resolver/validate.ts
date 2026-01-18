/**
 * Validation functions for view specs.
 * These are read-only validation functions that don't mutate the input.
 */

import type { ParsedIntent } from "./parseIntent";
import type { Violation, AppliedConstraint } from "./types";
import { resolveComponent } from "./resolveComponent";
import type { ResolveOptions } from "./resolveComponent";

export interface ValidateResult {
  valid: boolean;
  violations: Violation[];
  appliedConstraints?: AppliedConstraint[];
}

/**
 * Validates a view spec against enabled constraints.
 * This is a read-only validation that doesn't mutate the input.
 */
export function validate(
  intent: ParsedIntent,
  enabledConstraints: Record<string, boolean>,
  options?: ResolveOptions
): ValidateResult {
  // Build constraints object from enabledConstraints
  const constraints = options?.constraints || require("../constraints/button.rules.json");
  const effectiveConstraints = { ...constraints };
  
  // Apply enabled constraints
  if (enabledConstraints.onlyOnePrimaryPerView !== undefined) {
    effectiveConstraints.onlyOnePrimaryPerView = enabledConstraints.onlyOnePrimaryPerView;
  }
  if (enabledConstraints.maxPrimaryButtonsPerView !== undefined) {
    (effectiveConstraints as any).maxPrimaryButtonsPerView = enabledConstraints.maxPrimaryButtonsPerView ? 1 : undefined;
  }
  if (enabledConstraints.ghostHasNoBackground !== undefined) {
    effectiveConstraints.ghostHasNoBackground = enabledConstraints.ghostHasNoBackground;
  }
  if (enabledConstraints.secondaryUsesSurface !== undefined) {
    effectiveConstraints.secondaryUsesSurface = enabledConstraints.secondaryUsesSurface;
  }
  if (enabledConstraints.disabledOpacity !== undefined) {
    effectiveConstraints.disabledOpacity = enabledConstraints.disabledOpacity ? 0.4 : undefined;
  }

  // Resolve to get violations
  const resolved = resolveComponent(intent, {
    ...options,
    constraints: effectiveConstraints,
  });

  return {
    valid: resolved.violations.length === 0,
    violations: resolved.violations,
    appliedConstraints: resolved.appliedConstraints,
  };
}
