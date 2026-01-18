"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { HealthSummary } from "@/lib/health/types";
import { formatRelativeTime } from "@/lib/health/computeHealth";

interface HealthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  health: HealthSummary | null;
  onRecompute: () => void;
}

/**
 * Render a progress bar with filled and empty blocks.
 */
function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const filled = Math.round((value / max) * 10);
  const empty = 10 - filled;
  return (
    <span className="font-mono">
      {"█".repeat(filled)}
      {"░".repeat(empty)}
    </span>
  );
}

export function HealthDialog({
  open,
  onOpenChange,
  health,
  onRecompute,
}: HealthDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!health) {
    return null;
  }

  const { detail } = health;
  const { scores, checks, mcp, contractDetails } = detail;

  // Calculate contract percentage for progress bar
  const contractPercentage = contractDetails
    ? Math.round((contractDetails.connected / contractDetails.total) * 100)
    : 0;

  // Calculate constraint percentage (normalized to 100, but show as count)
  const constraintPercentage = Math.min(
    Math.round((scores.constraintCoverage / 20) * 100),
    100
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Design Model Health</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 font-mono text-sm">
          {/* Tokens */}
          <div className="flex items-center justify-between gap-4">
            <span className="w-24">Tokens</span>
            <div className="flex items-center gap-2 flex-1">
              <ProgressBar value={scores.tokenHealth} />
              <span className="w-12 text-right">{scores.tokenHealth}%</span>
            </div>
          </div>

          {/* Contracts */}
          <div className="flex items-center justify-between gap-4">
            <span className="w-24">Contracts</span>
            <div className="flex items-center gap-2 flex-1">
              <ProgressBar value={contractPercentage} />
              <span className="w-20 text-right">
                {contractDetails
                  ? `${contractDetails.connected}/${contractDetails.total}`
                  : "0/0"}
              </span>
            </div>
          </div>

          {/* Constraints */}
          <div className="flex items-center justify-between gap-4">
            <span className="w-24">Constraints</span>
            <div className="flex items-center gap-2 flex-1">
              <ProgressBar value={constraintPercentage} />
              <span className="w-20 text-right">
                {scores.constraintCoverage} rules
              </span>
            </div>
          </div>

          {/* Freshness */}
          <div className="flex items-center justify-between gap-4">
            <span className="w-24">Freshness</span>
            <div className="flex items-center gap-2 flex-1">
              <span>●</span>
              <span className="flex-1">Updated {formatRelativeTime(scores.freshness)}</span>
            </div>
          </div>

          {/* Executability */}
          <div className="flex items-center justify-between gap-4">
            <span className="w-24">Executability</span>
            <div className="flex items-center gap-2 flex-1">
              <span>{checks.executability.pass ? "✅" : "❌"}</span>
            </div>
          </div>

          {/* MCP Status */}
          <div className="flex items-center justify-between gap-4">
            <span className="w-24">MCP Status</span>
            <div className="flex items-center gap-2 flex-1">
              <span>{mcp.connected ? "🟢" : "🟡"}</span>
              <span>{mcp.connected ? "Live" : "Not connected"}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2 border-t pt-4">
          <Button
            onClick={onRecompute}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recompute health
          </Button>

          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            size="sm"
            className="w-full justify-between"
          >
            <span>View details JSON</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {showDetails && (
            <div className="mt-2 p-3 rounded-md bg-muted border">
              <ScrollArea className="h-64">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
