/**
 * Expander Agent Types
 *
 * Types for the content expansion agent.
 */

import type { EntityType } from "@/types";
import type { ExpansionType } from "./prompts";

/**
 * Request to expand content
 */
export interface ExpansionRequest {
  /** Campaign ID for context */
  campaignId: string;

  /** Type of entity containing the content */
  entityType: EntityType;

  /** ID of the entity being edited */
  entityId: string;

  /** Name of the entity (for prompt context) */
  entityName: string;

  /** Which field contains the content */
  fieldName: string;

  /** The full content of the field */
  fullContent: string;

  /** The selected text to expand */
  selectedText: string;

  /** Character offset where selection starts in fullContent */
  selectionStart: number;

  /** Character offset where selection ends in fullContent */
  selectionEnd: number;

  /** Type of expansion to perform */
  expansionType: ExpansionType;
}

/**
 * Result from expansion
 */
export interface ExpansionResult {
  /** Whether expansion succeeded */
  success: boolean;

  /** The expanded text (replaces selectedText) */
  expandedText?: string;

  /** AI's reasoning for the expansion */
  reasoning?: string;

  /** Error message if failed */
  error?: string;

  /** Token usage for cost tracking */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Callbacks for expansion streaming
 */
export interface ExpanderCallbacks {
  /** Called with partial expanded text as it streams */
  onPartialText?: (text: string) => void;

  /** Called when expansion starts */
  onStart?: () => void;

  /** Called when expansion completes */
  onComplete?: (result: ExpansionResult) => void;
}

/**
 * Partial expansion for streaming display
 */
export interface PartialExpansion {
  expandedText?: string;
  reasoning?: string;
}
