/**
 * Diff Utilities
 *
 * Utilities for applying unified diffs to text and JSON patches to structured data.
 * Used by the propose_patch tool to enable surgical modifications to entity content.
 */

import * as Diff from "diff";
import {
  applyPatch as applyJsonPatchOperations,
  validate,
  type Operation,
} from "fast-json-patch";

/**
 * Error thrown when a patch cannot be applied
 */
export class PatchApplicationError extends Error {
  constructor(
    message: string,
    public field: string,
    public patchType: "unified_diff" | "json_patch",
    public cause?: Error
  ) {
    super(message);
    this.name = "PatchApplicationError";
  }
}

// ============ Unified Diff Utilities ============

/**
 * Apply a unified diff to the original text.
 *
 * @param original - The original text content
 * @param patch - The unified diff patch string
 * @returns The patched text
 * @throws PatchApplicationError if the patch cannot be applied
 */
export function applyUnifiedDiff(original: string, patch: string): string {
  const result = Diff.applyPatch(original, patch);

  if (result === false) {
    throw new PatchApplicationError(
      "Failed to apply unified diff: patch does not match original content",
      "",
      "unified_diff"
    );
  }

  return result;
}

/**
 * Parse and validate a unified diff string.
 *
 * @param patch - The unified diff patch string
 * @returns Parsed diff structure
 * @throws Error if the patch is not valid unified diff format
 */
export function parseUnifiedDiff(patch: string): ReturnType<typeof Diff.parsePatch> {
  const parsed = Diff.parsePatch(patch);

  if (parsed.length === 0) {
    throw new Error("Invalid unified diff: no hunks found");
  }

  return parsed;
}

/**
 * Create a unified diff between two strings.
 * Useful for previewing changes.
 *
 * @param original - The original text
 * @param modified - The modified text
 * @param fileName - Optional filename for the diff header
 * @returns Unified diff string
 */
export function createUnifiedDiff(
  original: string,
  modified: string,
  fileName: string = "content"
): string {
  return Diff.createPatch(fileName, original, modified);
}

// ============ JSON Patch Utilities (RFC 6902) ============

/**
 * Apply RFC 6902 JSON Patch operations to a document.
 *
 * @param document - The document to patch
 * @param operations - Array of patch operations
 * @returns The patched document
 * @throws PatchApplicationError if any operation fails
 */
export function applyJsonPatch(
  document: unknown,
  operations: Operation[]
): unknown {
  // Validate operations against the document
  const validationError = validate(operations, document);
  if (validationError) {
    throw new PatchApplicationError(
      `Invalid JSON patch: ${validationError.message}`,
      "",
      "json_patch",
      validationError
    );
  }

  const result = applyJsonPatchOperations(document, operations);
  return result.newDocument;
}

/**
 * Parse a JSON patch string into operations array.
 *
 * @param patch - JSON string containing patch operations
 * @returns Array of patch operations
 * @throws Error if the string is not valid JSON or not an array
 */
export function parseJsonPatch(patch: string): Operation[] {
  let operations: unknown;

  try {
    operations = JSON.parse(patch);
  } catch (e) {
    throw new Error(
      `Invalid JSON patch: failed to parse as JSON - ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!Array.isArray(operations)) {
    throw new Error("JSON Patch must be an array of operations");
  }

  // Basic validation of operation structure
  for (const op of operations) {
    if (typeof op !== "object" || op === null) {
      throw new Error("Each JSON Patch operation must be an object");
    }
    if (!("op" in op) || typeof op.op !== "string") {
      throw new Error('Each JSON Patch operation must have an "op" field');
    }
    if (!("path" in op) || typeof op.path !== "string") {
      throw new Error('Each JSON Patch operation must have a "path" field');
    }
  }

  return operations as Operation[];
}

// ============ Combined Patch Application ============

export interface FieldPatch {
  field: string;
  patchType: "unified_diff" | "json_patch";
  patch: string;
}

export interface PatchResult {
  success: boolean;
  result?: Record<string, unknown>;
  errors: PatchApplicationError[];
}

/**
 * Try to apply patches to entity data, collecting any errors.
 *
 * @param currentData - The current entity data (with rich text already converted to markdown)
 * @param patches - Array of field patches to apply
 * @returns Result with patched data or errors
 */
export function tryApplyPatches(
  currentData: Record<string, unknown>,
  patches: FieldPatch[]
): PatchResult {
  const errors: PatchApplicationError[] = [];
  const result = { ...currentData };

  for (const patch of patches) {
    try {
      if (patch.patchType === "unified_diff") {
        // Text/markdown field - apply unified diff
        const original = String(result[patch.field] ?? "");
        result[patch.field] = applyUnifiedDiff(original, patch.patch);
      } else {
        // JSON field - parse current value and apply JSON patch
        let document: unknown;
        const currentValue = result[patch.field];

        if (typeof currentValue === "string") {
          try {
            document = JSON.parse(currentValue);
          } catch {
            document = {};
          }
        } else {
          document = currentValue ?? {};
        }

        const operations = parseJsonPatch(patch.patch);
        const patched = applyJsonPatch(document, operations);
        result[patch.field] = JSON.stringify(patched);
      }
    } catch (e) {
      const error =
        e instanceof PatchApplicationError
          ? e
          : new PatchApplicationError(
              e instanceof Error ? e.message : String(e),
              patch.field,
              patch.patchType,
              e instanceof Error ? e : undefined
            );
      error.field = patch.field;
      errors.push(error);
    }
  }

  return {
    success: errors.length === 0,
    result: errors.length === 0 ? result : undefined,
    errors,
  };
}

/**
 * Validate that patches can be applied without actually applying them.
 * Returns any validation errors.
 *
 * @param currentData - The current entity data
 * @param patches - Array of field patches to validate
 * @returns Array of validation errors (empty if all patches are valid)
 */
export function validatePatches(
  currentData: Record<string, unknown>,
  patches: FieldPatch[]
): PatchApplicationError[] {
  const result = tryApplyPatches(currentData, patches);
  return result.errors;
}
