/**
 * Chat Cost Footer Component
 *
 * Displays token usage and estimated cost for the current chat session.
 */

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateCostWithCache, formatCost, formatTokens } from "@/ai/pricing";
import { selectModel } from "@/ai";
import { useChatStore } from "@/stores";
import { useAIStore } from "@/stores/aiStore";
import { cn } from "@/lib/utils";

export interface ChatCostFooterProps {
  className?: string;
}

export function ChatCostFooter({ className }: ChatCostFooterProps) {
  // Use individual selectors to prevent unnecessary re-renders
  const sessionInputTokens = useChatStore((state) => state.sessionInputTokens);
  const sessionOutputTokens = useChatStore((state) => state.sessionOutputTokens);
  const sessionCacheReadTokens = useChatStore(
    (state) => state.sessionCacheReadTokens
  );
  const sessionCacheCreationTokens = useChatStore(
    (state) => state.sessionCacheCreationTokens
  );
  const liveInputTokens = useChatStore((state) => state.liveInputTokens);
  const liveOutputTokens = useChatStore((state) => state.liveOutputTokens);
  const isRunning = useChatStore((state) => state.isRunning);
  const modelPreference = useAIStore((state) => state.modelPreference);

  const hasUsage =
    sessionInputTokens > 0 ||
    sessionOutputTokens > 0 ||
    sessionCacheReadTokens > 0;

  const hasLiveUsage = liveInputTokens > 0 || liveOutputTokens > 0;

  // Memoize expensive calculations
  const { totalInputTokens, cacheEfficiency, cost } = useMemo(() => {
    const total =
      sessionInputTokens + sessionCacheReadTokens + sessionCacheCreationTokens;
    const efficiency =
      sessionCacheReadTokens > 0
        ? Math.round((sessionCacheReadTokens / total) * 100)
        : 0;
    const calculatedCost = calculateCostWithCache(
      selectModel(modelPreference),
      sessionInputTokens,
      sessionOutputTokens,
      sessionCacheReadTokens,
      sessionCacheCreationTokens
    );
    return {
      totalInputTokens: total,
      cacheEfficiency: efficiency,
      cost: calculatedCost,
    };
  }, [
    sessionInputTokens,
    sessionOutputTokens,
    sessionCacheReadTokens,
    sessionCacheCreationTokens,
    modelPreference,
  ]);

  if (!hasUsage && !hasLiveUsage) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-t px-3 py-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      {/* Live token display during operation */}
      {isRunning && hasLiveUsage && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary">
            {formatTokens(liveInputTokens)} in / {formatTokens(liveOutputTokens)} out
          </span>
        </div>
      )}

      {/* Session totals */}
      {hasUsage && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">
              {formatTokens(totalInputTokens)} in
              {cacheEfficiency > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  {" "}
                  ({cacheEfficiency}% cached)
                </span>
              )}
              {" / "}
              {formatTokens(sessionOutputTokens)} out | ~{formatCost(cost)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Input: {formatTokens(sessionInputTokens)} tokens</div>
              <div>Cached: {formatTokens(sessionCacheReadTokens)} tokens</div>
              <div>
                Cache writes: {formatTokens(sessionCacheCreationTokens)} tokens
              </div>
              <div>Output: {formatTokens(sessionOutputTokens)} tokens</div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
