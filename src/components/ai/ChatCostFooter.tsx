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
  const modelPreference = useAIStore((state) => state.modelPreference);

  const hasUsage =
    sessionInputTokens > 0 ||
    sessionOutputTokens > 0 ||
    sessionCacheReadTokens > 0;

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

  if (!hasUsage) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-t px-3 py-1.5 text-xs text-muted-foreground",
        className
      )}
    >
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
    </div>
  );
}
