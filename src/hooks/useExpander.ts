/**
 * useExpander Hook
 *
 * Manages the content expansion flow:
 * 1. User selects text in editor
 * 2. User chooses expansion type
 * 3. AI expands the content (with streaming preview)
 * 4. User accepts or rejects
 */

import { useState, useCallback } from "react";
import {
  expandContent,
  type ExpansionRequest,
  type ExpansionResult,
  type ExpansionType,
} from "@/ai/agents/expander";
import { initializeClient, isClientInitialized } from "@/ai/client";
import { useAIStore } from "@/stores/aiStore";
import type { EntityType } from "@/types";

/**
 * Expansion state machine states
 */
export type ExpansionState =
  | "idle"
  | "selecting"
  | "expanding"
  | "previewing"
  | "error";

interface UseExpanderOptions {
  /** Campaign ID for context */
  campaignId: string;

  /** Entity type being edited */
  entityType: EntityType;

  /** Entity ID being edited */
  entityId: string;

  /** Entity name for context */
  entityName: string;

  /** Field being edited */
  fieldName: string;

  /** Callback when expansion is accepted */
  onAccept?: (expandedText: string, originalText: string) => void;
}

interface UseExpanderReturn {
  /** Current state of the expansion flow */
  state: ExpansionState;

  /** Whether expansion is in progress */
  isExpanding: boolean;

  /** The original selected text */
  originalText: string | null;

  /** The expanded text (streams in during expansion) */
  expandedText: string | null;

  /** AI reasoning for the expansion */
  reasoning: string | null;

  /** Error message if expansion failed */
  error: string | null;

  /** Token usage from the expansion */
  usage: { inputTokens: number; outputTokens: number } | null;

  /** Start expansion on selected text */
  expand: (
    selectedText: string,
    fullContent: string,
    selectionStart: number,
    selectionEnd: number,
    expansionType: ExpansionType
  ) => Promise<void>;

  /** Accept the expansion */
  accept: () => void;

  /** Reject the expansion and restore original */
  reject: () => void;

  /** Reset to idle state */
  reset: () => void;
}

export function useExpander({
  campaignId,
  entityType,
  entityId,
  entityName,
  fieldName,
  onAccept,
}: UseExpanderOptions): UseExpanderReturn {
  const apiKey = useAIStore((state) => state.apiKey);

  const [state, setState] = useState<ExpansionState>("idle");
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
  } | null>(null);

  const expand = useCallback(
    async (
      selectedText: string,
      fullContent: string,
      selectionStart: number,
      selectionEnd: number,
      expansionType: ExpansionType
    ) => {
      // Initialize client if needed
      if (!isClientInitialized() && apiKey) {
        initializeClient(apiKey);
      }

      // Reset state
      setOriginalText(selectedText);
      setExpandedText(null);
      setReasoning(null);
      setError(null);
      setUsage(null);
      setState("expanding");

      const request: ExpansionRequest = {
        campaignId,
        entityType,
        entityId,
        entityName,
        fieldName,
        fullContent,
        selectedText,
        selectionStart,
        selectionEnd,
        expansionType,
      };

      try {
        const result = await expandContent(request, {
          onPartialText: (text) => {
            setExpandedText(text);
          },
          onComplete: (result: ExpansionResult) => {
            if (result.success && result.expandedText) {
              setExpandedText(result.expandedText);
              setReasoning(result.reasoning || null);
              setUsage(result.usage || null);
              setState("previewing");
            } else {
              setError(result.error || "Expansion failed");
              setState("error");
            }
          },
        });

        // Handle case where callbacks weren't called
        if (!result.success) {
          setError(result.error || "Expansion failed");
          setState("error");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    },
    [campaignId, entityType, entityId, entityName, fieldName, apiKey]
  );

  const accept = useCallback(() => {
    if (expandedText && originalText) {
      onAccept?.(expandedText, originalText);
    }
    // Reset state
    setState("idle");
    setOriginalText(null);
    setExpandedText(null);
    setReasoning(null);
    setError(null);
    setUsage(null);
  }, [expandedText, originalText, onAccept]);

  const reject = useCallback(() => {
    // Reset to idle without applying changes
    setState("idle");
    setOriginalText(null);
    setExpandedText(null);
    setReasoning(null);
    setError(null);
    setUsage(null);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setOriginalText(null);
    setExpandedText(null);
    setReasoning(null);
    setError(null);
    setUsage(null);
  }, []);

  return {
    state,
    isExpanding: state === "expanding",
    originalText,
    expandedText,
    reasoning,
    error,
    usage,
    expand,
    accept,
    reject,
    reset,
  };
}
