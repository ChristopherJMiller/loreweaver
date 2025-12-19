/**
 * Hook for Consistency Checking
 *
 * Provides state management and API calls for consistency checking.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  checkEntityConsistency,
  type ConsistencyCheckRequest,
  type ConsistencyCheckResult,
  type PartialConsistencyResult,
} from "@/ai/agents/consistency-checker";
import { initializeClient, isClientInitialized, APIUserAbortError } from "@/ai/client";
import { useAIStore } from "@/stores/aiStore";
import type { EntityType } from "@/types";

interface UseConsistencyCheckOptions {
  /** Campaign ID */
  campaignId: string;
  /** Entity type */
  entityType: EntityType;
  /** Entity ID (undefined for new entities) */
  entityId?: string;
  /** Entity name */
  entityName: string;
  /** Whether this is a new entity */
  isNew?: boolean;
}

interface UseConsistencyCheckReturn {
  /** Whether checking is in progress */
  isChecking: boolean;
  /** The result of the last check */
  result: ConsistencyCheckResult | null;
  /** Partial result while streaming */
  partialResult: PartialConsistencyResult | null;
  /** Current tool being used (for progress display) */
  currentTool: string | null;
  /** Run a consistency check */
  checkConsistency: (content: Record<string, string>) => Promise<void>;
  /** Clear the result */
  clearResult: () => void;
}

/**
 * Hook for running consistency checks on entity content
 */
export function useConsistencyCheck({
  campaignId,
  entityType,
  entityId,
  entityName,
  isNew = false,
}: UseConsistencyCheckOptions): UseConsistencyCheckReturn {
  const apiKey = useAIStore((state) => state.apiKey);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ConsistencyCheckResult | null>(null);
  const [partialResult, setPartialResult] = useState<PartialConsistencyResult | null>(null);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const checkConsistency = useCallback(
    async (content: Record<string, string>) => {
      if (!campaignId || !entityName) return;

      // Initialize client if needed
      if (!isClientInitialized() && apiKey) {
        initializeClient(apiKey);
      }

      if (!apiKey) {
        setResult({
          success: false,
          issues: [],
          overallScore: 0,
          reasoning: "",
          error: "API key not configured. Please set your Anthropic API key.",
        });
        return;
      }

      // Abort any existing check
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsChecking(true);
      setResult(null);
      setPartialResult(null);
      setCurrentTool(null);

      try {
        const request: ConsistencyCheckRequest = {
          campaignId,
          entityType,
          entityId,
          entityName,
          content,
          isNew,
        };

        const checkResult = await checkEntityConsistency(
          request,
          {
            onStart: () => {
              setCurrentTool(null);
            },
            onToolUse: (toolName) => {
              setCurrentTool(toolName);
            },
            onPartialResult: (partial) => {
              setPartialResult(partial);
            },
            onComplete: () => {
              setCurrentTool(null);
              setPartialResult(null);
            },
          },
          signal
        );

        setResult(checkResult);
      } catch (error) {
        // Silently ignore abort errors - user cancelled
        if (error instanceof APIUserAbortError || (error instanceof Error && error.name === "AbortError")) {
          return;
        }
        setResult({
          success: false,
          issues: [],
          overallScore: 0,
          reasoning: "",
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsChecking(false);
        setCurrentTool(null);
      }
    },
    [campaignId, entityType, entityId, entityName, isNew, apiKey]
  );

  const clearResult = useCallback(() => {
    // Abort any in-progress check
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setResult(null);
    setPartialResult(null);
    setCurrentTool(null);
    setIsChecking(false);
  }, []);

  return {
    isChecking,
    result,
    partialResult,
    currentTool,
    checkConsistency,
    clearResult,
  };
}
