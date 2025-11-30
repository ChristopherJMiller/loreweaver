/**
 * SearchResultsCard Component
 *
 * Displays search results with smart expand/collapse.
 * - Results <= 3: All expanded
 * - Results 4-10: 3 expanded, rest collapsed
 * - Results > 10: 3 expanded, count shown, expandable
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EntityResultCard } from "./EntityResultCard";
import type { SearchResult } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchResultsCardProps {
  query: string;
  results: SearchResult[];
  className?: string;
}

const INITIAL_VISIBLE = 3;

export function SearchResultsCard({
  query,
  results,
  className,
}: SearchResultsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalResults = results.length;
  const hasMore = totalResults > INITIAL_VISIBLE;
  const hiddenCount = totalResults - INITIAL_VISIBLE;

  const visibleResults = isExpanded
    ? results
    : results.slice(0, INITIAL_VISIBLE);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">
            Found for "{query}"
          </CardTitle>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {totalResults} result{totalResults !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {totalResults === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
            No results found
          </p>
        ) : (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="space-y-1">
              {visibleResults.map((result) => (
                <EntityResultCard
                  key={`${result.entity_type}-${result.entity_id}`}
                  result={result}
                />
              ))}
            </div>

            {hasMore && (
              <>
                <CollapsibleContent>
                  <div className="space-y-1 mt-1">
                    {results.slice(INITIAL_VISIBLE).map((result) => (
                      <EntityResultCard
                        key={`${result.entity_type}-${result.entity_id}`}
                        result={result}
                      />
                    ))}
                  </div>
                </CollapsibleContent>

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
                        Show {hiddenCount} more
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </>
            )}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
