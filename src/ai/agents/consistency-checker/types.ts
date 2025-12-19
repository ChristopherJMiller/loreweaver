/**
 * Consistency Checker Agent Types
 *
 * Types for the entity consistency checking agent.
 * Validates content against existing lore for contradictions.
 */

import type { EntityType } from "@/types";

/**
 * Severity levels for consistency issues
 */
export type IssueSeverity = "error" | "warning" | "suggestion";

/**
 * A conflicting entity referenced in an issue
 */
export interface ConflictingEntity {
  /** Entity type */
  type: string;
  /** Entity ID */
  id: string;
  /** Entity name */
  name: string;
}

/**
 * A single consistency issue found during checking
 */
export interface ConsistencyIssue {
  /** How severe is this issue */
  severity: IssueSeverity;
  /** Which field has the issue */
  field: string;
  /** Clear description of the problem */
  issue: string;
  /** Entity that conflicts with this content */
  conflictingEntity?: ConflictingEntity;
  /** How to resolve the issue */
  suggestion?: string;
}

/**
 * Request to check entity consistency
 */
export interface ConsistencyCheckRequest {
  /** Campaign ID for context */
  campaignId: string;

  /** Type of entity being checked */
  entityType: EntityType;

  /** ID of the entity (undefined for new entities) */
  entityId?: string;

  /** Name of the entity */
  entityName: string;

  /** Content to check (field name -> value) */
  content: Record<string, string>;

  /** Whether this is a new entity or an update */
  isNew: boolean;
}

/**
 * Result from consistency check
 */
export interface ConsistencyCheckResult {
  /** Whether the check completed successfully */
  success: boolean;

  /** Issues found during checking */
  issues: ConsistencyIssue[];

  /** Overall consistency score (0-100, 100 = fully consistent) */
  overallScore: number;

  /** AI's explanation of the consistency analysis */
  reasoning: string;

  /** Error message if check failed */
  error?: string;

  /** Token usage for cost tracking */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Callbacks for consistency check progress
 */
export interface ConsistencyCheckerCallbacks {
  /** Called when check starts */
  onStart?: () => void;

  /** Called when the agent uses a tool to gather context */
  onToolUse?: (toolName: string, flavor?: string) => void;

  /** Called with partial results as JSON streams in */
  onPartialResult?: (partial: PartialConsistencyResult) => void;

  /** Called when check completes */
  onComplete?: (result: ConsistencyCheckResult) => void;
}

/**
 * Partial consistency result for streaming display
 */
export interface PartialConsistencyResult {
  issues?: Array<{
    severity?: IssueSeverity;
    field?: string;
    issue?: string;
    suggestion?: string;
    conflictingEntity?: {
      type?: string;
      id?: string;
      name?: string;
    };
  }>;
  overallScore?: number;
  reasoning?: string;
}
