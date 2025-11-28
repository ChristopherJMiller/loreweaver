import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { search } from "@/lib/tauri";
import type { SearchResult, EntityType } from "@/types";
import { cn } from "@/lib/utils";
import {
  User,
  MapPin,
  Building2,
  Scroll,
  Calendar,
  Shield,
  UserCircle,
  Clock,
  Lock,
} from "lucide-react";

export interface MentionListProps {
  query: string;
  campaignId: string;
  command: (item: MentionItem) => void;
}

export interface MentionItem {
  entityType: EntityType;
  entityId: string;
  label: string;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const ENTITY_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  character: User,
  location: MapPin,
  organization: Building2,
  quest: Scroll,
  session: Calendar,
  hero: Shield,
  player: UserCircle,
  timeline_event: Clock,
  secret: Lock,
  campaign: Building2, // Campaigns typically not mentioned, but included for completeness
};

const ENTITY_LABELS: Record<EntityType, string> = {
  character: "Characters",
  location: "Locations",
  organization: "Organizations",
  quest: "Quests",
  session: "Sessions",
  hero: "Heroes",
  player: "Players",
  timeline_event: "Timeline Events",
  secret: "Secrets",
  campaign: "Campaigns",
};

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ query, campaignId, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    // Group results by entity type
    const groupedResults = results.reduce(
      (acc, result) => {
        if (!acc[result.entity_type]) {
          acc[result.entity_type] = [];
        }
        acc[result.entity_type].push(result);
        return acc;
      },
      {} as Record<EntityType, SearchResult[]>
    );

    // Create flat list for keyboard navigation
    const flatResults = Object.entries(groupedResults).flatMap(
      ([, items]) => items
    );

    const selectItem = useCallback(
      (index: number) => {
        const item = flatResults[index];
        if (item) {
          command({
            entityType: item.entity_type,
            entityId: item.entity_id,
            label: item.name,
          });
        }
      },
      [flatResults, command]
    );

    useEffect(() => {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        setResults([]);
        return;
      }

      const fetchResults = async () => {
        setIsLoading(true);
        try {
          const searchResults = await search.entities({
            campaign_id: campaignId,
            query: debouncedQuery,
            entity_types: null, // Search all types
            limit: 10,
          });
          setResults(searchResults);
          setSelectedIndex(0);
        } catch (error) {
          console.error("Search error:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchResults();
    }, [debouncedQuery, campaignId]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) =>
            prev <= 0 ? flatResults.length - 1 : prev - 1
          );
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) =>
            prev >= flatResults.length - 1 ? 0 : prev + 1
          );
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    if (!query) {
      return null;
    }

    if (isLoading) {
      return (
        <div className="z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="text-sm text-muted-foreground">Searching...</div>
        </div>
      );
    }

    if (flatResults.length === 0) {
      return (
        <div className="z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="text-sm text-muted-foreground">No results found</div>
        </div>
      );
    }

    let globalIndex = 0;

    return (
      <div className="z-50 min-w-[250px] max-h-[300px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
        {Object.entries(groupedResults).map(([entityType, items]) => {
          const Icon = ENTITY_ICONS[entityType as EntityType];
          const label = ENTITY_LABELS[entityType as EntityType];

          return (
            <div key={entityType}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                {label}
              </div>
              {items.map((item) => {
                const currentIndex = globalIndex++;
                const isSelected = currentIndex === selectedIndex;

                return (
                  <button
                    key={item.entity_id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => selectItem(currentIndex)}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
