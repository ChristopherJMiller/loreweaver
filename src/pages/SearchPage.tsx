import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, MapPin, Building2, ScrollText, Sword, Clock, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common";
import { useCampaignStore } from "@/stores";

interface SearchResult {
  entity_type: string;
  entity_id: string;
  name: string;
  snippet: string | null;
  rank: number;
}

const ENTITY_TYPES = [
  { value: "character", label: "Characters", icon: Users },
  { value: "location", label: "Locations", icon: MapPin },
  { value: "organization", label: "Organizations", icon: Building2 },
  { value: "quest", label: "Quests", icon: ScrollText },
  { value: "hero", label: "Heroes", icon: Sword },
  { value: "timeline_event", label: "Timeline", icon: Clock },
] as const;

function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case "character":
      return `/characters/${entityId}`;
    case "location":
      return `/locations/${entityId}`;
    case "organization":
      return `/organizations/${entityId}`;
    case "quest":
      return `/quests/${entityId}`;
    case "hero":
      return `/heroes/${entityId}`;
    case "timeline_event":
      return `/timeline/${entityId}`;
    default:
      return "/";
  }
}

function getEntityIcon(entityType: string) {
  const type = ENTITY_TYPES.find(t => t.value === entityType);
  return type?.icon || Search;
}

function getEntityLabel(entityType: string): string {
  const type = ENTITY_TYPES.find(t => t.value === entityType);
  return type?.label || entityType;
}

export function SearchPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async () => {
    if (!query.trim() || !activeCampaignId) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const searchResults = await invoke<SearchResult[]>("search_entities", {
        campaignId: activeCampaignId,
        query: query.trim(),
        entityTypes: selectedTypes.length > 0 ? selectedTypes : null,
        limit: 50,
      });
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, activeCampaignId, selectedTypes]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedTypes, performSearch]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
  };

  // Group results by entity type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>(
    (acc, result) => {
      if (!acc[result.entity_type]) {
        acc[result.entity_type] = [];
      }
      acc[result.entity_type].push(result);
      return acc;
    },
    {}
  );

  if (!activeCampaignId) {
    return (
      <EmptyState
        icon={Search}
        title="No Campaign Selected"
        description="Select a campaign to search"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Search across all entities in your campaign
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search characters, locations, quests..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Filter by type</CardTitle>
            {selectedTypes.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {ENTITY_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => toggleType(type.value)}
                />
                <Label
                  htmlFor={type.value}
                  className="flex items-center gap-1 text-sm cursor-pointer"
                >
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isSearching ? (
        <div className="text-center text-muted-foreground py-8">
          Searching...
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="text-center py-8">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No results found</h3>
          <p className="text-muted-foreground">
            Try a different search term or adjust your filters
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([entityType, typeResults]) => {
            const Icon = getEntityIcon(entityType);
            return (
              <div key={entityType}>
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Icon className="h-4 w-4" />
                  {getEntityLabel(entityType)} ({typeResults.length})
                </h3>
                <div className="space-y-2">
                  {typeResults.map((result) => (
                    <Card
                      key={result.entity_id}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => navigate(getEntityRoute(result.entity_type, result.entity_id))}
                    >
                      <CardContent className="py-3">
                        <p className="font-medium">{result.name}</p>
                        {result.snippet && (
                          <p
                            className="text-sm text-muted-foreground mt-1 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800"
                            dangerouslySetInnerHTML={{ __html: result.snippet }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Enter a search term to find entities
        </div>
      )}
    </div>
  );
}
