/**
 * ToolResultCard Component
 *
 * Smart display for tool results. Routes to appropriate visualization
 * based on tool type and data structure.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SearchResultsCard } from "./SearchResultsCard";
import { EntityPreviewCard, type EntityData } from "@/components/citation";
import type { SearchResult, EntityType } from "@/types";
import {
  Wrench,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import { useEntityNavigation } from "@/hooks/useEntityNavigation";

export interface ToolResultCardProps {
  toolName: string;
  content: string;
  data?: unknown;
  className?: string;
}

/**
 * Default text display with smart expand/collapse
 */
function DefaultToolResult({
  toolName,
  content,
  className,
}: {
  toolName: string;
  content: string;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = content.length > 300;

  // Parse as markdown
  const html = marked.parse(content, { async: false }) as string;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-2 px-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {toolName}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <Collapsible open={isExpanded || !isLongContent} onOpenChange={setIsExpanded}>
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              !isExpanded && isLongContent && "line-clamp-4"
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
      </CardContent>
    </Card>
  );
}

/**
 * Single entity result display
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
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-2 px-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            get_entity
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <EntityPreviewCard
          entityType={entityType}
          entity={entity}
          compact={false}
          onNavigate={navigateHandler}
        />
      </CardContent>
    </Card>
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
