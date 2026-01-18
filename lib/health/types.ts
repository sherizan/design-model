/**
 * Type definitions for Model Health dashboard.
 */

export type HealthStatus = "healthy" | "needsAttention" | "atRisk";

export interface HealthScore {
  tokenHealth: number; // 0-100 percentage
  contractCoverage: number; // count of connected/total
  constraintCoverage: number; // count of active constraints
  freshness: number; // timestamp of last sync
}

export interface HealthChecks {
  executability: {
    pass: boolean;
    reason?: string;
  };
  determinism: {
    pass: boolean;
    label: string;
  };
  crossPlatformParity: {
    pass: boolean;
    label: string;
  };
}

export interface MCPStatus {
  connected: boolean;
  modelVersion: string;
}

export interface HealthDetail {
  scores: HealthScore;
  checks: HealthChecks;
  mcp: MCPStatus;
  tokenDetails?: {
    totalReferences: number;
    rawValues: number;
    tokenReferences: number;
  };
  contractDetails?: {
    connected: number;
    total: number;
  };
}

export interface HealthSummary {
  overallScore: number; // 0-100
  status: HealthStatus;
  detail: HealthDetail;
}
