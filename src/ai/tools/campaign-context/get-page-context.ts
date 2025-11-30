/**
 * get_page_context Tool
 *
 * Retrieves detailed context about the entity the user is currently viewing.
 * This provides richer information than the auto-injected system prompt context.
 */

import { invoke } from "@tauri-apps/api/core";
import { prosemirrorToMarkdown } from "@/ai/utils/content-bridge";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type {
  Character,
  Location,
  Organization,
  Quest,
  Hero,
  Player,
  Session,
  TimelineEvent,
  Relationship,
} from "@/types";

type EntityData =
  | Character
  | Location
  | Organization
  | Quest
  | Hero
  | Player
  | Session
  | TimelineEvent;

const ENTITY_COMMANDS: Record<string, string> = {
  character: "get_character",
  location: "get_location",
  organization: "get_organization",
  quest: "get_quest",
  hero: "get_hero",
  player: "get_player",
  session: "get_session",
  timeline_event: "get_timeline_event",
};

/**
 * Convert a field value to markdown if it's ProseMirror JSON
 */
function fieldToMarkdown(value: string | null | undefined): string {
  if (!value) return "";

  if (value.startsWith('{"type":"doc"')) {
    try {
      const json = JSON.parse(value);
      return prosemirrorToMarkdown(json);
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Build the parent chain for a location
 */
async function getLocationAncestors(location: Location): Promise<Location[]> {
  const ancestors: Location[] = [];
  let current = location;

  while (current.parent_id) {
    try {
      const parent = await invoke<Location>("get_location", {
        id: current.parent_id,
      });
      ancestors.unshift(parent);
      current = parent;
    } catch {
      break;
    }
  }

  return ancestors;
}

/**
 * Format entity summary for page context
 */
function formatEntitySummary(type: string, entity: EntityData): string {
  const lines: string[] = [];

  // Header with name
  if ("name" in entity && entity.name) {
    lines.push(`# ${entity.name}`);
  } else if ("title" in entity && entity.title) {
    lines.push(`# ${entity.title}`);
  }

  lines.push(`**Type:** ${type}`);
  lines.push(`**ID:** \`${entity.id}\``);

  // Type-specific metadata
  if (type === "character") {
    const c = entity as Character;
    if (c.lineage) lines.push(`**Lineage:** ${c.lineage}`);
    if (c.occupation) lines.push(`**Occupation:** ${c.occupation}`);
    lines.push(`**Status:** ${c.is_alive ? "Alive" : "Deceased"}`);
  } else if (type === "location") {
    const l = entity as Location;
    if (l.location_type) lines.push(`**Location Type:** ${l.location_type}`);
  } else if (type === "organization") {
    const o = entity as Organization;
    if (o.org_type) lines.push(`**Organization Type:** ${o.org_type}`);
    lines.push(`**Status:** ${o.is_active ? "Active" : "Inactive"}`);
  } else if (type === "quest") {
    const q = entity as Quest;
    if (q.status) lines.push(`**Status:** ${q.status}`);
    if (q.plot_type) lines.push(`**Plot Type:** ${q.plot_type}`);
  } else if (type === "hero") {
    const h = entity as Hero;
    if (h.classes) lines.push(`**Classes:** ${h.classes}`);
    lines.push(`**Status:** ${h.is_active ? "Active" : "Inactive"}`);
  } else if (type === "session") {
    const s = entity as Session;
    lines.push(`**Session Number:** ${s.session_number}`);
    if (s.date) lines.push(`**Date:** ${s.date}`);
  }

  lines.push("");

  // Description
  if ("description" in entity && entity.description) {
    lines.push("## Description");
    lines.push(fieldToMarkdown(entity.description));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format relationships for output
 */
function formatRelationships(
  relationships: Relationship[],
  entityId: string
): string {
  if (relationships.length === 0) {
    return "*No relationships found*";
  }

  return relationships
    .map((r) => {
      const direction = r.is_bidirectional
        ? "↔"
        : r.source_id === entityId
          ? "→"
          : "←";

      const otherType =
        r.source_id === entityId ? r.target_type : r.source_type;
      const otherId = r.source_id === entityId ? r.target_id : r.source_id;

      let line = `- **${r.relationship_type}** ${direction} ${otherType} (\`${otherId}\`)`;
      if (r.strength !== null) line += ` [strength: ${r.strength}]`;
      if (r.description) line += `\n  ${r.description}`;

      return line;
    })
    .join("\n");
}

export const getPageContextTool: ToolDefinition = {
  name: "get_page_context",
  description:
    "Get detailed context about the entity the user is currently viewing. " +
    "Returns full entity details, relationships, and hierarchy (for locations). " +
    "Use this when you need more than the basic info provided in the system context.",
  input_schema: {
    type: "object",
    properties: {
      include_relationships: {
        type: "boolean",
        description: "Include all relationships for this entity (default: true)",
        default: true,
      },
      include_hierarchy: {
        type: "boolean",
        description:
          "For locations, include full parent chain and children (default: true)",
        default: true,
      },
      flavor: {
        type: "string",
        description:
          "Brief status text shown to user (e.g., 'Gathering context...'). Keep under 50 chars.",
      },
    },
    required: [],
  },
  handler: async (input: unknown, context: ToolContext): Promise<ToolResult> => {
    const { include_relationships = true, include_hierarchy = true } =
      (input as {
        include_relationships?: boolean;
        include_hierarchy?: boolean;
      }) || {};

    const pageContext = context.pageContext;

    // No page context available
    if (!pageContext?.entityType || !pageContext.entityId) {
      return {
        success: true,
        content:
          "No specific entity page is being viewed. The user is on a list page or the main dashboard. " +
          "Ask what they'd like to explore, or use search_entities to find something specific.",
        data: { noContext: true },
      };
    }

    const { entityType, entityId } = pageContext;
    const command = ENTITY_COMMANDS[entityType];

    if (!command) {
      return {
        success: false,
        content: `Unknown entity type: ${entityType}`,
      };
    }

    try {
      const lines: string[] = [];

      // Fetch the entity
      const entity = await invoke<EntityData>(command, { id: entityId });
      lines.push(formatEntitySummary(entityType, entity));

      // Location hierarchy
      if (entityType === "location" && include_hierarchy) {
        const location = entity as Location;
        const ancestors = await getLocationAncestors(location);

        // Get children
        const children = await invoke<Location[]>("get_location_children", {
          campaign_id: context.campaignId,
          parent_id: entityId,
        });

        lines.push("## Location Hierarchy");
        lines.push("");

        if (ancestors.length > 0) {
          lines.push("**Ancestors (top to bottom):**");
          ancestors.forEach((a, i) => {
            const indent = "  ".repeat(i);
            const type = a.location_type ? ` (${a.location_type})` : "";
            lines.push(`${indent}└─ ${a.name}${type} [\`${a.id}\`]`);
          });
          const indent = "  ".repeat(ancestors.length);
          const type = location.location_type
            ? ` (${location.location_type})`
            : "";
          lines.push(`${indent}└─ **${location.name}**${type} ← current`);
        } else {
          lines.push("*Top-level location (no parents)*");
        }
        lines.push("");

        if (children.length > 0) {
          lines.push("**Child locations:**");
          children.forEach((c) => {
            const type = c.location_type ? ` (${c.location_type})` : "";
            lines.push(`- ${c.name}${type} [\`${c.id}\`]`);
          });
        } else {
          lines.push("*No child locations*");
        }
        lines.push("");
      }

      // Relationships
      if (include_relationships) {
        const relationships = await invoke<Relationship[]>(
          "get_entity_relationships",
          {
            entity_type: entityType,
            entity_id: entityId,
          }
        );

        lines.push("## Relationships");
        lines.push("");
        lines.push(formatRelationships(relationships, entityId));
      }

      return {
        success: true,
        content: lines.join("\n"),
        data: {
          entityType,
          entityId,
          entityName: pageContext.entityName,
        },
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to get page context: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
