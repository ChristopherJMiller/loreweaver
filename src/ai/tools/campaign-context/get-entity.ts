/**
 * get_entity Tool
 *
 * Retrieves a single entity by type and ID.
 * Formats the entity as markdown for the agent.
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
  Secret,
  Campaign,
} from "@/types";

type EntityData =
  | Character
  | Location
  | Organization
  | Quest
  | Hero
  | Player
  | Session
  | TimelineEvent
  | Secret
  | Campaign;

/**
 * Convert a field value to markdown if it's ProseMirror JSON
 */
function fieldToMarkdown(value: string | null | undefined): string {
  if (!value) return "";

  // Check if it looks like ProseMirror JSON
  if (value.startsWith('{"type":"doc"')) {
    try {
      const json = JSON.parse(value);
      return prosemirrorToMarkdown(json);
    } catch {
      // Not valid JSON, return as-is
      return value;
    }
  }

  return value;
}

const ENTITY_COMMANDS: Record<string, string> = {
  campaign: "get_campaign",
  character: "get_character",
  location: "get_location",
  organization: "get_organization",
  quest: "get_quest",
  hero: "get_hero",
  player: "get_player",
  session: "get_session",
  timeline_event: "get_timeline_event",
  secret: "get_secret",
};

/**
 * Format entity data as markdown with frontmatter-style metadata
 */
function formatEntity(type: string, entity: EntityData): string {
  const lines: string[] = [];

  // Frontmatter header
  lines.push("---");
  lines.push(`type: ${type}`);
  lines.push(`id: ${entity.id}`);

  // Add name/title if present
  if ("name" in entity && entity.name) {
    lines.push(`name: ${entity.name}`);
  } else if ("title" in entity && entity.title) {
    lines.push(`title: ${entity.title}`);
  }

  // Add type-specific metadata
  if (type === "character") {
    const c = entity as Character;
    if (c.lineage) lines.push(`lineage: ${c.lineage}`);
    if (c.occupation) lines.push(`occupation: ${c.occupation}`);
    lines.push(`is_alive: ${c.is_alive}`);
  } else if (type === "location") {
    const l = entity as Location;
    if (l.location_type) lines.push(`location_type: ${l.location_type}`);
    if (l.parent_id) lines.push(`parent_id: ${l.parent_id}`);
    lines.push(`detail_level: ${l.detail_level}`);
  } else if (type === "organization") {
    const o = entity as Organization;
    if (o.org_type) lines.push(`org_type: ${o.org_type}`);
    lines.push(`is_active: ${o.is_active}`);
  } else if (type === "quest") {
    const q = entity as Quest;
    if (q.plot_type) lines.push(`plot_type: ${q.plot_type}`);
    if (q.status) lines.push(`status: ${q.status}`);
  } else if (type === "session") {
    const s = entity as Session;
    lines.push(`session_number: ${s.session_number}`);
    if (s.date) lines.push(`date: ${s.date}`);
  } else if (type === "timeline_event") {
    const t = entity as TimelineEvent;
    if (t.date_display) lines.push(`date: ${t.date_display}`);
    if (t.significance) lines.push(`significance: ${t.significance}`);
    lines.push(`is_public: ${t.is_public}`);
  } else if (type === "secret") {
    const s = entity as Secret;
    lines.push(`revealed: ${s.revealed}`);
    if (s.known_by) lines.push(`known_by: ${s.known_by}`);
  } else if (type === "hero") {
    const h = entity as Hero;
    if (h.classes) lines.push(`classes: ${h.classes}`);
    lines.push(`is_active: ${h.is_active}`);
  }

  lines.push("---");
  lines.push("");

  // Main content sections
  if ("description" in entity && entity.description) {
    lines.push("## Description");
    lines.push(fieldToMarkdown(entity.description));
    lines.push("");
  }

  // Type-specific content
  if (type === "character") {
    const c = entity as Character;
    if (c.personality) {
      lines.push("## Personality");
      lines.push(fieldToMarkdown(c.personality));
      lines.push("");
    }
    if (c.motivations) {
      lines.push("## Motivations");
      lines.push(fieldToMarkdown(c.motivations));
      lines.push("");
    }
    if (c.secrets) {
      lines.push("## Secrets");
      lines.push(fieldToMarkdown(c.secrets));
      lines.push("");
    }
    if (c.voice_notes) {
      lines.push("## Voice Notes");
      lines.push(fieldToMarkdown(c.voice_notes));
      lines.push("");
    }
  } else if (type === "location") {
    const l = entity as Location;
    if (l.gm_notes) {
      lines.push("## GM Notes");
      lines.push(fieldToMarkdown(l.gm_notes));
      lines.push("");
    }
  } else if (type === "organization") {
    const o = entity as Organization;
    if (o.goals) {
      lines.push("## Goals");
      lines.push(fieldToMarkdown(o.goals));
      lines.push("");
    }
    if (o.resources) {
      lines.push("## Resources");
      lines.push(fieldToMarkdown(o.resources));
      lines.push("");
    }
    if (o.secrets) {
      lines.push("## Secrets");
      lines.push(fieldToMarkdown(o.secrets));
      lines.push("");
    }
  } else if (type === "quest") {
    const q = entity as Quest;
    if (q.hook) {
      lines.push("## Hook");
      lines.push(fieldToMarkdown(q.hook));
      lines.push("");
    }
    if (q.objectives) {
      lines.push("## Objectives");
      lines.push(fieldToMarkdown(q.objectives));
      lines.push("");
    }
    if (q.complications) {
      lines.push("## Complications");
      lines.push(fieldToMarkdown(q.complications));
      lines.push("");
    }
    if (q.resolution) {
      lines.push("## Resolution");
      lines.push(fieldToMarkdown(q.resolution));
      lines.push("");
    }
    if (q.reward) {
      lines.push("## Reward");
      lines.push(fieldToMarkdown(q.reward));
      lines.push("");
    }
  } else if (type === "session") {
    const s = entity as Session;
    if (s.planned_content) {
      lines.push("## Planned Content");
      lines.push(fieldToMarkdown(s.planned_content));
      lines.push("");
    }
    if (s.summary) {
      lines.push("## Summary");
      lines.push(fieldToMarkdown(s.summary));
      lines.push("");
    }
    if (s.highlights) {
      lines.push("## Highlights");
      lines.push(fieldToMarkdown(s.highlights));
      lines.push("");
    }
    if (s.notes) {
      lines.push("## Notes");
      lines.push(fieldToMarkdown(s.notes));
      lines.push("");
    }
  } else if (type === "secret") {
    const s = entity as Secret;
    lines.push("## Content");
    lines.push(fieldToMarkdown(s.content));
    lines.push("");
  } else if (type === "hero") {
    const h = entity as Hero;
    if (h.backstory) {
      lines.push("## Backstory");
      lines.push(fieldToMarkdown(h.backstory));
      lines.push("");
    }
    if (h.goals) {
      lines.push("## Goals");
      lines.push(fieldToMarkdown(h.goals));
      lines.push("");
    }
    if (h.bonds) {
      lines.push("## Bonds");
      lines.push(fieldToMarkdown(h.bonds));
      lines.push("");
    }
  }

  return lines.join("\n");
}

export const getEntityTool: ToolDefinition = {
  name: "get_entity",
  description:
    "Get detailed information about a specific entity. Returns all fields formatted as markdown.",
  input_schema: {
    type: "object",
    properties: {
      entity_type: {
        type: "string",
        enum: [
          "campaign",
          "character",
          "location",
          "organization",
          "quest",
          "hero",
          "player",
          "session",
          "timeline_event",
          "secret",
        ],
        description: "The type of entity to retrieve",
      },
      entity_id: {
        type: "string",
        description: "The entity ID",
      },
    },
    required: ["entity_type", "entity_id"],
  },
  handler: async (input: unknown, _context: ToolContext): Promise<ToolResult> => {
    const { entity_type, entity_id } = input as {
      entity_type: string;
      entity_id: string;
    };

    const command = ENTITY_COMMANDS[entity_type];
    if (!command) {
      return {
        success: false,
        content: `Unknown entity type: ${entity_type}`,
      };
    }

    try {
      const entity = await invoke<EntityData>(command, { id: entity_id });

      return {
        success: true,
        content: formatEntity(entity_type, entity),
        data: entity,
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to get ${entity_type}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
