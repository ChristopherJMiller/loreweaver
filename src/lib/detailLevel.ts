import type { Location, Relationship } from "@/types";

interface DetailLevelInput {
  location: Location;
  relationships?: Relationship[];
  childCount?: number;
  sessionMentions?: number;
}

interface DetailLevelBreakdown {
  descriptionShort: number; // +10 for >100 chars
  descriptionLong: number; // +20 for >500 chars
  gmNotes: number; // +10 if present
  relationships: number; // +5 per relationship (max 20)
  children: number; // +5 per child (max 15)
  sessionMentions: number; // +5 per mention (max 15)
  total: number;
}

/**
 * Calculate detail level for a location based on content completeness.
 *
 * Scoring:
 * - Description > 100 chars: +10
 * - Description > 500 chars: +20 (additional)
 * - Has GM notes: +10
 * - Per relationship: +5 (max 20)
 * - Per child location: +5 (max 15)
 * - Per session mention: +5 (max 15)
 *
 * Max score: 100
 */
export function calculateDetailLevel(input: DetailLevelInput): number {
  const breakdown = getDetailLevelBreakdown(input);
  return breakdown.total;
}

/**
 * Get detailed breakdown of detail level scoring
 */
export function getDetailLevelBreakdown(
  input: DetailLevelInput
): DetailLevelBreakdown {
  const { location, relationships = [], childCount = 0, sessionMentions = 0 } =
    input;

  // Description scoring
  const descriptionLength = getContentLength(location.description);
  const descriptionShort = descriptionLength > 100 ? 10 : 0;
  const descriptionLong = descriptionLength > 500 ? 20 : 0;

  // GM notes scoring
  const gmNotesLength = getContentLength(location.gm_notes);
  const gmNotes = gmNotesLength > 0 ? 10 : 0;

  // Relationships scoring (count only location-related ones)
  const relationshipCount = relationships.filter(
    (r) => r.source_id === location.id || r.target_id === location.id
  ).length;
  const relationshipsScore = Math.min(relationshipCount * 5, 20);

  // Children scoring
  const childrenScore = Math.min(childCount * 5, 15);

  // Session mentions scoring
  const sessionMentionsScore = Math.min(sessionMentions * 5, 15);

  const total = Math.min(
    descriptionShort +
      descriptionLong +
      gmNotes +
      relationshipsScore +
      childrenScore +
      sessionMentionsScore,
    100
  );

  return {
    descriptionShort,
    descriptionLong,
    gmNotes,
    relationships: relationshipsScore,
    children: childrenScore,
    sessionMentions: sessionMentionsScore,
    total,
  };
}

/**
 * Get content length, handling both plain text and JSON (ProseMirror) formats
 */
function getContentLength(content: string | null | undefined): number {
  if (!content) return 0;

  // Try to parse as JSON (ProseMirror format)
  try {
    const doc = JSON.parse(content);
    if (doc.type === "doc" && Array.isArray(doc.content)) {
      return extractTextFromProseMirror(doc);
    }
  } catch {
    // Not JSON, treat as plain text
  }

  return content.length;
}

/**
 * Extract text length from ProseMirror document
 */
function extractTextFromProseMirror(node: {
  type: string;
  content?: unknown[];
  text?: string;
}): number {
  let length = 0;

  if (node.text) {
    length += node.text.length;
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      length += extractTextFromProseMirror(
        child as { type: string; content?: unknown[]; text?: string }
      );
    }
  }

  return length;
}

/**
 * Get color class for detail level
 */
export function getDetailLevelColor(level: number): string {
  if (level < 25) return "text-red-500";
  if (level < 50) return "text-yellow-500";
  return "text-green-500";
}

/**
 * Get background color class for detail level bar
 */
export function getDetailLevelBgColor(level: number): string {
  if (level < 25) return "bg-red-500";
  if (level < 50) return "bg-yellow-500";
  return "bg-green-500";
}

/**
 * Get label for detail level
 */
export function getDetailLevelLabel(level: number): string {
  if (level < 25) return "Sparse";
  if (level < 50) return "Developing";
  if (level < 75) return "Detailed";
  return "Comprehensive";
}
