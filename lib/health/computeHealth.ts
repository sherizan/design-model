/**
 * Pure functions for computing health scores.
 */

import type {
  HealthSummary,
  HealthDetail,
  HealthStatus,
  HealthScore,
  HealthChecks,
  MCPStatus,
} from "./types";
import type { HealthSourceData } from "./healthSources";
import {
  extractTokenHealth,
  extractContractCoverage,
  extractConstraintCoverage,
  checkExecutability,
} from "./healthSources";

/**
 * Compute token health percentage.
 * Formula: (tokenReferences / totalReferences) * 100
 */
function computeTokenHealth(
  tokenReferences: number,
  totalReferences: number
): number {
  if (totalReferences === 0) return 0;
  return Math.round((tokenReferences / totalReferences) * 100);
}

/**
 * Normalize contract coverage to 0-100 scale.
 */
function normalizeContractCoverage(connected: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((connected / total) * 100);
}

/**
 * Normalize constraint coverage to 0-100 scale.
 * For MVP: assume max of 20 constraints = 100%
 */
function normalizeConstraintCoverage(activeCount: number): number {
  const maxConstraints = 20; // MVP assumption
  return Math.min(Math.round((activeCount / maxConstraints) * 100), 100);
}

/**
 * Compute overall health score from weighted components.
 */
function computeOverallScore(
  tokenHealth: number,
  contractCoverage: number,
  constraintCoverage: number,
  executabilityPass: boolean
): number {
  // Weights
  const tokenWeight = 0.3;
  const contractWeight = 0.3;
  const constraintWeight = 0.2;
  const executabilityWeight = 0.2;

  // If executability fails, cap score at 40
  if (!executabilityPass) {
    const partialScore =
      tokenHealth * tokenWeight +
      contractCoverage * contractWeight +
      constraintCoverage * constraintWeight;
    return Math.min(Math.round(partialScore), 40);
  }

  const score =
    tokenHealth * tokenWeight +
    contractCoverage * contractWeight +
    constraintCoverage * constraintWeight +
    100 * executabilityWeight; // executability contributes 20 points if pass

  return Math.round(Math.min(score, 100));
}

/**
 * Determine health status from overall score.
 */
function determineStatus(score: number): HealthStatus {
  if (score >= 85) return "healthy";
  if (score >= 60) return "needsAttention";
  return "atRisk";
}

/**
 * Get MCP status from environment or config.
 */
function getMCPStatus(): MCPStatus {
  const mcpEnabled =
    process.env.NEXT_PUBLIC_MCP_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_MCP_ENABLED === "1";
  const modelVersion = "design-model-v0.1"; // From package.json

  return {
    connected: mcpEnabled,
    modelVersion,
  };
}

/**
 * Compute complete health summary from source data.
 */
export function computeHealth(
  data: HealthSourceData
): HealthSummary {
  const {
    baseModel,
    resolvedView,
    activeConstraints,
    derivedTokens,
    derivedConstraints,
    lastSynced,
  } = data;

  // Extract token health
  const tokenDetails = extractTokenHealth(resolvedView);
  const tokenHealth = computeTokenHealth(
    tokenDetails.tokenReferences,
    tokenDetails.totalReferences
  );

  // Extract contract coverage
  const contractDetails = extractContractCoverage(baseModel);
  const contractCoverageNormalized = normalizeContractCoverage(
    contractDetails.connected,
    contractDetails.total
  );

  // Extract constraint coverage
  const constraintCount = extractConstraintCoverage(activeConstraints);
  const constraintCoverageNormalized = normalizeConstraintCoverage(
    constraintCount
  );

  // Check executability
  const executabilityCheck = checkExecutability(
    baseModel,
    derivedTokens,
    derivedConstraints
  );

  // Compute overall score
  const overallScore = computeOverallScore(
    tokenHealth,
    contractCoverageNormalized,
    constraintCoverageNormalized,
    executabilityCheck.pass
  );

  // Determine status
  const status = determineStatus(overallScore);

  // Build health detail
  const scores: HealthScore = {
    tokenHealth,
    contractCoverage: contractDetails.connected,
    constraintCoverage: constraintCount,
    freshness: lastSynced || Date.now(),
  };

  const checks: HealthChecks = {
    executability: executabilityCheck,
    determinism: {
      pass: true,
      label: "Assumed deterministic (v0)",
    },
    crossPlatformParity: {
      pass: false,
      label: "Not tracked (v0)",
    },
  };

  const mcp = getMCPStatus();

  const detail: HealthDetail = {
    scores,
    checks,
    mcp,
    tokenDetails,
    contractDetails,
  };

  return {
    overallScore,
    status,
    detail,
  };
}

/**
 * Format relative time string (e.g., "2 minutes ago").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  }
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}
