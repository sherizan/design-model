/**
 * Shared types for resolver and MCP tools.
 */

export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: any;
  from?: string;
}

export interface AppliedConstraint {
  id: string;
  scope: "component" | "view" | "pattern";
  status: "triggered" | "skipped";
  message: string;
  targets?: string[];
  resolution?: string;
  patch?: JsonPatchOperation[];
}

export interface Decision {
  type: "autoFix" | "normalize" | "defaultApplied";
  reason: string;
  action: string;
  details?: Record<string, any>;
}

export interface Violation {
  code: string;
  message: string;
  constraintId?: string;
  nodeIds?: string[];
}
