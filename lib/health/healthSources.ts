/**
 * Adapters to extract health data from app state.
 */

import type { BaseModel } from "@/lib/modelRuntime";
import type { ResolvedView } from "@/resolver/resolveComponent";

export interface HealthSourceData {
  baseModel: BaseModel | null;
  resolvedView: ResolvedView | null;
  activeConstraints: Array<{ templateId: string; value?: boolean | number }>;
  derivedTokens: BaseModel["tokens"] | null;
  derivedConstraints: BaseModel["constraints"] | null;
  lastSynced?: number;
}

/**
 * Extract token health data from resolved view trace.
 */
export function extractTokenHealth(
  resolvedView: ResolvedView | null
): {
  totalReferences: number;
  rawValues: number;
  tokenReferences: number;
} {
  if (!resolvedView || resolvedView.nodes.length === 0) {
    return { totalReferences: 0, rawValues: 0, tokenReferences: 0 };
  }

  let totalReferences = 0;
  let rawValues = 0;
  let tokenReferences = 0;

  for (const node of resolvedView.nodes) {
    if (node.trace) {
      for (const entry of node.trace) {
        totalReferences++;
        // Check if source indicates a token reference
        // Source format: "token: color.primary" or "constraint(...) → token: ..."
        if (entry.source.includes("token:")) {
          tokenReferences++;
        } else if (
          entry.source.includes("default:") ||
          entry.source.includes("rule:") ||
          entry.source === "raw" ||
          entry.source === "computed"
        ) {
          rawValues++;
        } else {
          // If source mentions constraint but no token, count as raw
          if (entry.source.includes("constraint")) {
            rawValues++;
          } else {
            // Default: assume token reference if unclear
            tokenReferences++;
          }
        }
      }
    }
  }

  return { totalReferences, rawValues, tokenReferences };
}

/**
 * Extract contract coverage data.
 */
export function extractContractCoverage(
  baseModel: BaseModel | null
): {
  connected: number;
  total: number;
} {
  if (!baseModel || !baseModel.contract) {
    return { connected: 0, total: 0 };
  }

  // For MVP: contract has one component (Button)
  // In future, could count multiple components
  const total = 1;
  const connected = baseModel.contract.component ? 1 : 0;

  return { connected, total };
}

/**
 * Extract constraint coverage count.
 */
export function extractConstraintCoverage(
  activeConstraints: Array<{ templateId: string; value?: boolean | number }>
): number {
  return activeConstraints.length;
}

/**
 * Check executability - verify all required model parts are loaded.
 */
export function checkExecutability(
  baseModel: BaseModel | null,
  derivedTokens: BaseModel["tokens"] | null,
  derivedConstraints: BaseModel["constraints"] | null
): { pass: boolean; reason?: string } {
  if (!baseModel) {
    return { pass: false, reason: "Base model not loaded" };
  }
  if (!derivedTokens) {
    return { pass: false, reason: "Tokens not available" };
  }
  if (!derivedConstraints) {
    return { pass: false, reason: "Constraints not available" };
  }
  if (!baseModel.contract) {
    return { pass: false, reason: "Contract not available" };
  }

  return { pass: true };
}
