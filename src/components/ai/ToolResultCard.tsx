/**
 * ToolResultCard Component
 *
 * Smart display for tool results. Routes to appropriate visualization
 * based on tool type and data structure.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SearchResultsCard } from "./SearchResultsCard";
import { EntityPreviewCard, type EntityData } from "@/components/citation";
import type { SearchResult, EntityType, Campaign } from "@/types";
import { ChevronDown, ChevronUp, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import { useEntityNavigation } from "@/hooks/useEntityNavigation";

interface CampaignStats {
  characters: number;
  locations: number;
  organizations: number;
  quests: number;
  heroes: number;
  sessions: number;
  timelineEvents: number;
}

interface CampaignContextData {
  campaign: Campaign;
  stats: CampaignStats;
}

export interface ToolResultCardProps {
  toolName: string;
  content: string;
  data?: unknown;
  className?: string;
}

/**
 * Streamlined text display - no technical header, just content
 */
function DefaultToolResult({
  content,
  className,
}: {
  toolName: string;
  content: string;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = content.length > 400;

  // Memoize markdown parsing
  const html = useMemo(
    () => marked.parse(content, { async: false }) as string,
    [content]
  );

  return (
    <div className={cn("text-sm bg-muted/20 rounded-lg p-3", className)}>
      <Collapsible open={isExpanded || !isLongContent} onOpenChange={setIsExpanded}>
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            !isExpanded && isLongContent && "line-clamp-6"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {isLongContent && (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs h-7"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show more
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </Collapsible>
    </div>
  );
}

/**
 * Compact campaign context display - shows campaign name and total entity count
 */
function CampaignContextResult({
  data,
  className,
}: {
  data: CampaignContextData;
  className?: string;
}) {
  const { campaign, stats } = data;
  const totalEntities =
    stats.characters +
    stats.locations +
    stats.organizations +
    stats.quests +
    stats.heroes +
    stats.sessions +
    stats.timelineEvents;

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm bg-muted/30 rounded-lg px-3 py-2",
        className
      )}
    >
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">
        Fetched campaign overview for{" "}
        <span className="font-medium text-foreground">{campaign.name}</span>
        {" "}({totalEntities} {totalEntities === 1 ? "entity" : "entities"})
      </span>
    </div>
  );
}

/**
 * Check if data is campaign context data
 */
function isCampaignContextData(data: unknown): data is CampaignContextData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    "campaign" in d &&
    "stats" in d &&
    typeof d.stats === "object" &&
    d.stats !== null &&
    "characters" in (d.stats as Record<string, unknown>)
  );
}

/**
 * Single entity result display - streamlined without technical header
 */
function EntityToolResult({
  entityType,
  entity,
  className,
}: {
  entityType: EntityType;
  entity: EntityData;
  className?: string;
}) {
  const { createNavigateHandler } = useEntityNavigation();
  const navigateHandler = createNavigateHandler(entityType, entity.id);

  return (
    <EntityPreviewCard
      entityType={entityType}
      entity={entity}
      compact={false}
      onNavigate={navigateHandler}
      className={cn("border rounded-lg", className)}
    />
  );
}

/**
 * Determine entity type from entity data
 */
function inferEntityType(entity: EntityData): EntityType | null {
  if ("lineage" in entity && "occupation" in entity) return "character";
  if ("location_type" in entity && "parent_id" in entity) return "location";
  if ("org_type" in entity) return "organization";
  if ("plot_type" in entity && "status" in entity) return "quest";
  if ("classes" in entity && "backstory" in entity) return "hero";
  if ("preferences" in entity && "boundaries" in entity) return "player";
  if ("session_number" in entity) return "session";
  if ("date_display" in entity && "significance" in entity) return "timeline_event";
  if ("revealed" in entity && "content" in entity) return "secret";
  if ("system" in entity && "settings_json" in entity) return "campaign";
  return null;
}

/**
 * Check if data is a SearchResult array
 */
function isSearchResults(data: unknown): data is SearchResult[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const first = data[0];
  return (
    typeof first === "object" &&
    first !== null &&
    "entity_type" in first &&
    "entity_id" in first &&
    "name" in first
  );
}

/**
 * Check if data is entity data
 */
function isEntityData(data: unknown): data is EntityData {
  if (typeof data !== "object" || data === null) return false;
  return "id" in data && ("name" in data || "title" in data);
}

/**
 * Extract search query from content
 */
function extractSearchQuery(content: string): string {
  const match = content.match(/Search Results for "([^"]+)"/);
  return match ? match[1] : "entities";
}

export function ToolResultCard({
  toolName,
  content,
  data,
  className,
}: ToolResultCardProps) {
  // Route to appropriate component based on tool and data type

  // Campaign context - compact summary
  if (toolName === "get_campaign_context" && isCampaignContextData(data)) {
    return <CampaignContextResult data={data} className={className} />;
  }

  // Search results
  if (toolName === "search_entities" && isSearchResults(data)) {
    const query = extractSearchQuery(content);
    return (
      <SearchResultsCard
        query={query}
        results={data}
        className={className}
      />
    );
  }

  // Single entity
  if (toolName === "get_entity" && isEntityData(data)) {
    const entityType = inferEntityType(data);
    if (entityType) {
      return (
        <EntityToolResult
          entityType={entityType}
          entity={data}
          className={className}
        />
      );
    }
  }

  // Default: text with expand/collapse
  return (
    <DefaultToolResult
      toolName={toolName}
      content={content}
      className={className}
    />
  );
}
