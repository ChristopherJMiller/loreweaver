import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Users,
  Building2,
  Scroll,
  Clock,
  Sword,
  User,
  Calendar,
  Lock,
  Home,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUIStore, useCampaignStore, useSearchStore } from "@/stores";
import type { EntityType } from "@/types";

const entityIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    location: MapPin,
    character: Users,
    organization: Building2,
    quest: Scroll,
    timeline_event: Clock,
    hero: Sword,
    player: User,
    session: Calendar,
    secret: Lock,
  };

const navigationItems = [
  { label: "Dashboard", icon: Home, to: "/" },
  { label: "Locations", icon: MapPin, to: "/locations" },
  { label: "Characters", icon: Users, to: "/characters" },
  { label: "Organizations", icon: Building2, to: "/organizations" },
  { label: "Quests", icon: Scroll, to: "/quests" },
  { label: "Timeline", icon: Clock, to: "/timeline" },
  { label: "Heroes", icon: Sword, to: "/heroes" },
  { label: "Players", icon: User, to: "/players" },
  { label: "Sessions", icon: Calendar, to: "/sessions" },
  { label: "Secrets", icon: Lock, to: "/secrets" },
  { label: "Search", icon: Search, to: "/search" },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, closeCommandPalette } = useUIStore();
  const { activeCampaignId } = useCampaignStore();
  const { results, isSearching, setQuery, search, clearSearch } =
    useSearchStore();
  const [inputValue, setInputValue] = useState("");

  // Debounced search
  useEffect(() => {
    if (!activeCampaignId || !inputValue.trim()) {
      clearSearch();
      return;
    }

    const timer = setTimeout(() => {
      setQuery(inputValue);
      search(activeCampaignId);
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, activeCampaignId, setQuery, search, clearSearch]);

  // Clear on close
  useEffect(() => {
    if (!commandPaletteOpen) {
      setInputValue("");
      clearSearch();
    }
  }, [commandPaletteOpen, clearSearch]);

  const handleSelect = (to: string) => {
    navigate(to);
    closeCommandPalette();
  };

  const handleResultSelect = (entityType: EntityType, entityId: string) => {
    const routeMap: Record<EntityType, string> = {
      campaign: "/campaigns",
      character: "/characters",
      location: "/locations",
      organization: "/organizations",
      quest: "/quests",
      hero: "/heroes",
      player: "/players",
      session: "/sessions",
      timeline_event: "/timeline",
      secret: "/secrets",
    };

    const baseRoute = routeMap[entityType];
    navigate(`${baseRoute}/${entityId}`);
    closeCommandPalette();
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={closeCommandPalette}>
      <CommandInput
        placeholder="Search or navigate..."
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Search Results">
            {results.map((result) => {
              const Icon = entityIcons[result.entity_type] ?? Search;
              return (
                <CommandItem
                  key={`${result.entity_type}-${result.entity_id}`}
                  onSelect={() =>
                    handleResultSelect(
                      result.entity_type as EntityType,
                      result.entity_id
                    )
                  }
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{result.name}</span>
                    {result.snippet && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {result.snippet}
                      </span>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {!inputValue && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() => handleSelect(item.to)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
