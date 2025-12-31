/**
 * Token Usage Display Section
 *
 * Shows current session token usage and estimated costs.
 */

import { Coins, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Database } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useChatStore } from "@/stores/chatStore";
import { useAIStore } from "@/stores/aiStore";
import { formatTokens, formatCost, calculateCostWithCache } from "@/ai/pricing";
import { cn } from "@/lib/utils";

export function TokenUsageDisplay() {
  const {
    sessionInputTokens,
    sessionOutputTokens,
    sessionCacheReadTokens,
    sessionCacheCreationTokens,
  } = useChatStore();
  const { apiKey, modelPreference } = useAIStore();

  const isDisabled = !apiKey;

  // Estimate cost based on model preference
  // Use balanced model pricing as a middle ground for estimation
  const modelId =
    modelPreference === "speed"
      ? "claude-haiku-4-5-20251001"
      : "claude-sonnet-4-5-20250929";

  const estimatedCost = calculateCostWithCache(
    modelId,
    sessionInputTokens,
    sessionOutputTokens,
    sessionCacheReadTokens,
    sessionCacheCreationTokens
  );

  const totalTokens =
    sessionInputTokens +
    sessionOutputTokens +
    sessionCacheReadTokens +
    sessionCacheCreationTokens;

  const hasUsage = totalTokens > 0;

  return (
    <Card className={cn(isDisabled && "opacity-60")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Token Usage
        </CardTitle>
        <CardDescription>
          Current session usage and estimated costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isDisabled ? (
          <p className="text-sm text-muted-foreground">
            Configure your API key to track usage.
          </p>
        ) : !hasUsage ? (
          <p className="text-sm text-muted-foreground">
            No token usage in current session. Start using AI features to see
            usage statistics here.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Cost Summary */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Estimated Session Cost
                </p>
                <p className="text-2xl font-bold">{formatCost(estimatedCost)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Token Breakdown */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900">
                  <ArrowUpFromLine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Input Tokens</p>
                  <p className="font-medium">
                    {formatTokens(sessionInputTokens)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-md bg-green-100 p-2 dark:bg-green-900">
                  <ArrowDownToLine className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Output Tokens</p>
                  <p className="font-medium">
                    {formatTokens(sessionOutputTokens)}
                  </p>
                </div>
              </div>

              {(sessionCacheReadTokens > 0 || sessionCacheCreationTokens > 0) && (
                <>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-md bg-purple-100 p-2 dark:bg-purple-900">
                      <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Cache Read
                      </p>
                      <p className="font-medium">
                        {formatTokens(sessionCacheReadTokens)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-md bg-orange-100 p-2 dark:bg-orange-900">
                      <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Cache Write
                      </p>
                      <p className="font-medium">
                        {formatTokens(sessionCacheCreationTokens)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pricing Note */}
            <p className="text-xs text-muted-foreground">
              Cost estimated using{" "}
              {modelPreference === "speed" ? "Haiku" : "Sonnet"} pricing.
              {sessionCacheReadTokens > 0 && (
                <> Cache hits reduce costs by up to 90%.</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
