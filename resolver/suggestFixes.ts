/**
 * Suggest fixes for constraint violations.
 * This module provides constraint-driven fix suggestions.
 */

import type { ParsedIntent } from "./parseIntent";
import type { AppliedConstraint, Decision, JsonPatchOperation, Violation } from "./types";
import type { ResolvedView } from "./resolveComponent";

export interface SuggestFixesOptions {
  intent: ParsedIntent;
  violations: Violation[];
  enabledConstraints: Record<string, boolean>;
}

export interface SuggestedFix {
  constraintId: string;
  patches: JsonPatchOperation[];
  decisions: Array<{ nodeId: string; decision: Decision }>;
  appliedConstraint: AppliedConstraint;
}

/**
 * Suggests fixes for constraint violations.
 * Returns an array of suggested fixes, each containing patches and decisions.
 */
export function suggestFixes(options: SuggestFixesOptions): SuggestedFix[] {
  const { intent, violations, enabledConstraints } = options;
  const fixes: SuggestedFix[] = [];

  // Handle onlyOnePrimaryPerView constraint
  if (enabledConstraints.onlyOnePrimaryPerView && violations.some(v => v.constraintId === "onlyOnePrimaryPerView")) {
    const primaryButtons = intent.components
      .map((c, idx) => ({ component: c, index: idx }))
      .filter(({ component }) => component.props.variant === "primary");

    if (primaryButtons.length > 1) {
      // Choose the SECOND primary button (index 1) to downgrade
      const targetButton = primaryButtons[1];
      const nodeId = `button-${targetButton.index}`;

      // Generate JSON patch operation
      const patches: JsonPatchOperation[] = [
        {
          op: "replace",
          path: `/components/${targetButton.index}/props/variant`,
          value: "secondary",
        },
      ];

      // Create decision entry
      const decision: Decision = {
        type: "autoFix",
        reason: "onlyOnePrimaryPerView constraint violation",
        action: "downgrade to secondary",
        details: {
          originalVariant: "primary",
          newVariant: "secondary",
          constraintId: "onlyOnePrimaryPerView",
        },
      };

      // Create applied constraint entry
      const appliedConstraint: AppliedConstraint = {
        id: "onlyOnePrimaryPerView",
        scope: "view",
        status: "triggered",
        message: "Only one primary button per view",
        targets: [nodeId],
        resolution: `Downgraded ${nodeId} to secondary to preserve a single primary action`,
        patch: patches,
      };

      fixes.push({
        constraintId: "onlyOnePrimaryPerView",
        patches,
        decisions: [{ nodeId, decision }],
        appliedConstraint,
      });
    }
  }

  // Handle maxPrimaryButtonsPerView constraint (similar logic)
  if (enabledConstraints.maxPrimaryButtonsPerView && violations.some(v => v.constraintId === "maxPrimaryButtonsPerView")) {
    const primaryButtons = intent.components
      .map((c, idx) => ({ component: c, index: idx }))
      .filter(({ component }) => component.props.variant === "primary");

    // Get max allowed from violations message or default to 1
    const violation = violations.find(v => v.constraintId === "maxPrimaryButtonsPerView");
    // For now, assume we need to downgrade excess buttons starting from index 1
    if (primaryButtons.length > 1) {
      const targetButton = primaryButtons[1];
      const nodeId = `button-${targetButton.index}`;

      const patches: JsonPatchOperation[] = [
        {
          op: "replace",
          path: `/components/${targetButton.index}/props/variant`,
          value: "secondary",
        },
      ];

      const decision: Decision = {
        type: "autoFix",
        reason: "maxPrimaryButtonsPerView constraint violation",
        action: "downgrade to secondary",
        details: {
          originalVariant: "primary",
          newVariant: "secondary",
          constraintId: "maxPrimaryButtonsPerView",
        },
      };

      const appliedConstraint: AppliedConstraint = {
        id: "maxPrimaryButtonsPerView",
        scope: "view",
        status: "triggered",
        message: "Maximum primary buttons per view exceeded",
        targets: [nodeId],
        resolution: `Downgraded ${nodeId} to secondary to meet maximum primary button limit`,
        patch: patches,
      };

      fixes.push({
        constraintId: "maxPrimaryButtonsPerView",
        patches,
        decisions: [{ nodeId, decision }],
        appliedConstraint,
      });
    }
  }

  return fixes;
}

/**
 * Apply suggested fixes to a ParsedIntent, returning a new intent with patches applied.
 */
export function applyFixesToIntent(intent: ParsedIntent, patches: JsonPatchOperation[]): ParsedIntent {
  // Deep clone the intent
  const updatedIntent: ParsedIntent = JSON.parse(JSON.stringify(intent));

  for (const patch of patches) {
    if (patch.op === "replace" && patch.path.startsWith("/components/")) {
      // Parse path like "/components/1/props/variant"
      const pathParts = patch.path.split("/").filter(Boolean);
      if (pathParts.length >= 4 && pathParts[0] === "components") {
        const componentIndex = parseInt(pathParts[1], 10);
        if (!isNaN(componentIndex) && componentIndex >= 0 && componentIndex < updatedIntent.components.length) {
          const component = updatedIntent.components[componentIndex];
          if (pathParts[2] === "props" && pathParts[3]) {
            const propName = pathParts[3];
            (component.props as any)[propName] = patch.value;
          }
        }
      }
    }
  }

  return updatedIntent;
}
