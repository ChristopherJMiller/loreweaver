/**
 * Content Bridge Utilities
 *
 * Converts between Tiptap/ProseMirror JSON and Markdown format
 * for AI agent consumption.
 *
 * Format: YAML frontmatter + Markdown sections
 * ---
 * name: Entity Name
 * type: character
 * id: uuid
 * ---
 *
 * ## Description
 * Content here...
 */

// TODO: Implement for M6 agents
//
// Libraries to add:
// - prosemirror-markdown (ProseMirror <-> Markdown)
// - gray-matter (YAML frontmatter parsing)

import type { EntityMarkdownFormat, ContentPatch } from "../types";

/**
 * Convert an entity to AI-readable Markdown format with frontmatter
 */
export function entityToMarkdown(
  _entity: Record<string, unknown>,
  _entityType: string
): string {
  // TODO: Implement
  throw new Error("Not implemented - requires prosemirror-markdown");
}

/**
 * Parse AI Markdown output back to entity update
 */
export function markdownToEntityUpdate(
  _markdown: string
): EntityMarkdownFormat {
  // TODO: Implement
  throw new Error("Not implemented - requires gray-matter");
}

/**
 * Apply content patches to an entity
 */
export function applyPatches(
  _entity: Record<string, unknown>,
  _patches: ContentPatch[]
): Record<string, unknown> {
  // TODO: Implement
  throw new Error("Not implemented");
}

/**
 * Convert ProseMirror JSON to Markdown string
 */
export function prosemirrorToMarkdown(_json: unknown): string {
  // TODO: Implement
  throw new Error("Not implemented - requires prosemirror-markdown");
}

/**
 * Convert Markdown string to ProseMirror JSON
 */
export function markdownToProsemirror(_markdown: string): unknown {
  // TODO: Implement
  throw new Error("Not implemented - requires prosemirror-markdown");
}
