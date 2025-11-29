/**
 * EntityResultCard Component
 *
 * Compact card for displaying a single entity result.
 * Used in search results and tool output display.
 */

import { CitationPill, EntityPreviewPopover } from "@/components/citation";
import { useEntityNavigation } from "@/hooks/useEntityNavigation";
import type { SearchResult } from "@/types";
import { cn } from "@/lib/utils";

export interface EntityResultCardProps {
  result: SearchResult;
  showSnippet?: boolean;
  className?: string;
}

export function EntityResultCard({
  result,
  showSnippet = true,
  className,
}: EntityResultCardProps) {
  const { createNavigateHandler } = useEntityNavigation();
  const navigateHandler = createNavigateHandler(
    result.entity_type,
    result.entity_id
  );

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-md hover:bg-accent/5 transition-colors",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <EntityPreviewPopover
          entityType={result.entity_type}
          entityId={result.entity_id}
          onNavigate={navigateHandler}
        >
          <CitationPill
            entityType={result.entity_type}
            entityId={result.entity_id}
            displayName={result.name}
            onClick={navigateHandler}
            size="md"
          />
        </EntityPreviewPopover>
        {showSnippet && result.snippet && (
          <p
            className="text-xs text-muted-foreground mt-1 line-clamp-2 [&>mark]:bg-yellow-500/30 [&>mark]:text-foreground"
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        )}
      </div>
    </div>
  );
}
