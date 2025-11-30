/**
 * EntityPreviewCard Component
 *
 * Compact preview card for entities, used in hover popovers and result lists.
 * Displays type-specific fields for each entity type.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { prosemirrorToMarkdown } from "@/ai/utils/content-bridge";
import type {
  EntityType,
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
import { ENTITY_ICONS, ENTITY_LABELS } from "./CitationPill";

/**
 * Union type for all entity data types
 */
export type EntityData =
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

export interface EntityPreviewCardProps {
  entityType: EntityType;
  entity: EntityData;
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/**
 * Helper to safely extract name from any entity
 */
function getEntityName(entity: EntityData): string {
  if ("name" in entity && entity.name) return entity.name;
  if ("title" in entity && entity.title) return entity.title;
  return "Unknown";
}

/**
 * Type-specific field extractors
 */
function getCharacterFields(entity: Character) {
  const fields: { label: string; value: string }[] = [];
  if (entity.lineage) fields.push({ label: "Lineage", value: entity.lineage });
  if (entity.occupation)
    fields.push({ label: "Occupation", value: entity.occupation });
  fields.push({ label: "Status", value: entity.is_alive ? "Alive" : "Dead" });
  return fields;
}

function getLocationFields(entity: Location) {
  const fields: { label: string; value: string }[] = [];
  if (entity.location_type)
    fields.push({ label: "Type", value: entity.location_type });
  return fields;
}

function getOrganizationFields(entity: Organization) {
  const fields: { label: string; value: string }[] = [];
  if (entity.org_type) fields.push({ label: "Type", value: entity.org_type });
  fields.push({ label: "Status", value: entity.is_active ? "Active" : "Inactive" });
  return fields;
}

function getQuestFields(entity: Quest) {
  const fields: { label: string; value: string }[] = [];
  if (entity.status) fields.push({ label: "Status", value: entity.status });
  if (entity.plot_type)
    fields.push({ label: "Plot Type", value: entity.plot_type });
  return fields;
}

function getHeroFields(entity: Hero) {
  const fields: { label: string; value: string }[] = [];
  if (entity.classes) fields.push({ label: "Classes", value: entity.classes });
  if (entity.lineage) fields.push({ label: "Lineage", value: entity.lineage });
  fields.push({ label: "Status", value: entity.is_active ? "Active" : "Inactive" });
  return fields;
}

function getPlayerFields(_entity: Player) {
  // Players have minimal preview fields
  return [];
}

function getSessionFields(entity: Session) {
  const fields: { label: string; value: string }[] = [];
  fields.push({
    label: "Session",
    value: `#${entity.session_number}`,
  });
  if (entity.date) fields.push({ label: "Date", value: entity.date });
  return fields;
}

function getTimelineEventFields(entity: TimelineEvent) {
  const fields: { label: string; value: string }[] = [];
  if (entity.date_display)
    fields.push({ label: "Date", value: entity.date_display });
  if (entity.significance)
    fields.push({ label: "Significance", value: entity.significance });
  return fields;
}

function getSecretFields(entity: Secret) {
  const fields: { label: string; value: string }[] = [];
  fields.push({
    label: "Status",
    value: entity.revealed ? "Revealed" : "Hidden",
  });
  return fields;
}

function getCampaignFields(entity: Campaign) {
  const fields: { label: string; value: string }[] = [];
  if (entity.system) fields.push({ label: "System", value: entity.system });
  return fields;
}

/**
 * Get type-specific fields for an entity
 */
function getEntityFields(
  entityType: EntityType,
  entity: EntityData
): { label: string; value: string }[] {
  switch (entityType) {
    case "character":
      return getCharacterFields(entity as Character);
    case "location":
      return getLocationFields(entity as Location);
    case "organization":
      return getOrganizationFields(entity as Organization);
    case "quest":
      return getQuestFields(entity as Quest);
    case "hero":
      return getHeroFields(entity as Hero);
    case "player":
      return getPlayerFields(entity as Player);
    case "session":
      return getSessionFields(entity as Session);
    case "timeline_event":
      return getTimelineEventFields(entity as TimelineEvent);
    case "secret":
      return getSecretFields(entity as Secret);
    case "campaign":
      return getCampaignFields(entity as Campaign);
    default:
      return [];
  }
}

/**
 * Try to parse a string as TipTap JSON and convert to plain text
 */
function parseTiptapContent(content: string): string | null {
  try {
    // Check if it looks like JSON (TipTap format)
    if (content.startsWith("{") && content.includes('"type"')) {
      const json = JSON.parse(content);
      if (json.type === "doc") {
        return prosemirrorToMarkdown(json);
      }
    }
    // Not TipTap JSON, return as-is
    return content;
  } catch {
    // Not valid JSON, return as-is
    return content;
  }
}

/**
 * Get description field from entity (if available)
 * Parses TipTap JSON content to markdown for display
 */
function getDescription(entity: EntityData): string | null {
  if ("description" in entity && entity.description) {
    return parseTiptapContent(entity.description);
  }
  if ("content" in entity && entity.content) {
    return parseTiptapContent(entity.content);
  }
  if ("summary" in entity && entity.summary) {
    return parseTiptapContent(entity.summary);
  }
  return null;
}

/**
 * Truncate text to a maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function EntityPreviewCard({
  entityType,
  entity,
  compact = true,
  onNavigate,
  className,
}: EntityPreviewCardProps) {
  const Icon = ENTITY_ICONS[entityType];
  const typeLabel = ENTITY_LABELS[entityType];
  const name = getEntityName(entity);

  // Memoize expensive field extraction and description parsing
  const fields = useMemo(
    () => getEntityFields(entityType, entity),
    [entityType, entity]
  );
  const description = useMemo(() => getDescription(entity), [entity]);

  return (
    <div
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (onNavigate && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onNavigate();
        }
      }}
      className={cn(
        "rounded-lg border bg-popover p-3 text-popover-foreground shadow-md",
        compact && "max-w-[280px]",
        onNavigate && "cursor-pointer hover:bg-accent/5 transition-colors",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
          <span className="font-semibold text-sm truncate">{name}</span>
        </div>
        <Badge variant="secondary" className="flex-shrink-0 text-[10px] px-1.5 py-0">
          {typeLabel}
        </Badge>
      </div>

      {/* Fields */}
      {fields.length > 0 && (
        <div className="space-y-1 mb-2">
          {fields.slice(0, compact ? 3 : fields.length).map((field, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <span className="text-muted-foreground flex-shrink-0">
                {field.label}:
              </span>
              <span className="truncate">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Description preview */}
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {truncate(description, compact ? 100 : 200)}
        </p>
      )}

      {/* Navigate hint */}
      {onNavigate && (
        <p className="text-[10px] text-muted-foreground/70 mt-2 italic">
          Click to view details
        </p>
      )}
    </div>
  );
}
