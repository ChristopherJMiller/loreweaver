/**
 * Citation Parser Utilities
 *
 * Parses and formats entity citations in the format:
 * [[entity_type:uuid:Display Name]]
 *
 * Examples:
 * - [[character:550e8400-e29b-41d4-a716-446655440000:Captain Aldric]]
 * - [[location:7c9e6679-7425-40de-944b-e07fc1f90ae7:The Obsidian Tower]]
 */

import type { EntityType } from "@/types";

/**
 * Regex pattern for matching citations.
 * Captures: [1] entity_type, [2] uuid, [3] display_name
 */
export const CITATION_REGEX = /\[\[(\w+):([a-f0-9-]{36}):([^\]]+)\]\]/g;

/**
 * Parsed citation data
 */
export interface ParsedCitation {
  /** The full matched string */
  raw: string;
  /** Entity type (character, location, etc.) */
  entityType: EntityType;
  /** Entity UUID */
  entityId: string;
  /** Display name for the citation */
  displayName: string;
  /** Start index in the original string */
  startIndex: number;
  /** End index in the original string */
  endIndex: number;
}

/**
 * Content segment after parsing
 */
export interface ContentSegment {
  type: "text" | "citation";
  content: string;
  citation?: ParsedCitation;
}

/**
 * Parse all citations from a content string
 */
export function parseCitations(content: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  CITATION_REGEX.lastIndex = 0;

  while ((match = CITATION_REGEX.exec(content)) !== null) {
    citations.push({
      raw: match[0],
      entityType: match[1] as EntityType,
      entityId: match[2],
      displayName: match[3],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return citations;
}

/**
 * Split content into segments of text and citations
 */
export function parseContentSegments(content: string): ContentSegment[] {
  const citations = parseCitations(content);
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const citation of citations) {
    // Add text before this citation
    if (citation.startIndex > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, citation.startIndex),
      });
    }

    // Add the citation
    segments.push({
      type: "citation",
      content: citation.raw,
      citation,
    });

    lastIndex = citation.endIndex;
  }

  // Add remaining text after last citation
  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Format a citation string from entity data
 */
export function formatCitation(
  entityType: EntityType,
  entityId: string,
  displayName: string
): string {
  return `[[${entityType}:${entityId}:${displayName}]]`;
}

/**
 * Check if a string contains any citations
 */
export function hasCitations(content: string): boolean {
  CITATION_REGEX.lastIndex = 0;
  return CITATION_REGEX.test(content);
}

/**
 * Strip all citations from content, leaving only display names
 */
export function stripCitations(content: string): string {
  return content.replace(CITATION_REGEX, "$3");
}

/**
 * Count the number of citations in content
 */
export function countCitations(content: string): number {
  return parseCitations(content).length;
}
