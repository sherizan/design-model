/**
 * Shared types for MCP tools.
 */

import type { ParsedIntent } from "../resolver/parseIntent";
import type { Violation, AppliedConstraint, JsonPatchOperation } from "../resolver/types";

export interface DesignModelMetadata {
  tokens: any;
  contracts: any;
  constraints: {
    enabledConstraints: Record<string, boolean>;
  };
}

export interface ValidateParams {
  viewSpec: ParsedIntent;
  enabledConstraints: Record<string, boolean>;
}

export interface ValidateResult {
  valid: boolean;
  violations: Violation[];
  appliedConstraints?: AppliedConstraint[];
}

export interface SuggestFixesParams {
  viewSpec: ParsedIntent;
  enabledConstraints: Record<string, boolean>;
  violations: Violation[];
}

export interface SuggestFixesResult {
  fixes: JsonPatchOperation[];
}

export interface ApplyFixesParams {
  viewSpec: ParsedIntent;
  fixes: JsonPatchOperation[];
}

export interface ApplyFixesResult {
  viewSpec: ParsedIntent;
}
