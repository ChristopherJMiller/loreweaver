/**
 * EntityPreviewPopover Component
 *
 * Wrapper that shows an EntityPreviewCard on hover.
 * Fetches entity data lazily and caches results.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EntityPreviewCard, type EntityData } from "./EntityPreviewCard";
import type { EntityType } from "@/types";
import {
  characters,
  locations,
  organizations,
  quests,
  heroes,
  players,
  sessions,
  timelineEvents,
  secrets,
  campaigns,
} from "@/lib/tauri";
import { Loader2 } from "lucide-react";

export interface EntityPreviewPopoverProps {
  entityType: EntityType;
  entityId: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}

/**
 * Simple in-memory cache for entity data
 */
const entityCache = new Map<string, EntityData>();

function getCacheKey(entityType: EntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/**
 * Fetch entity data based on type
 */
async function fetchEntity(
  entityType: EntityType,
  entityId: string
): Promise<EntityData> {
  const cacheKey = getCacheKey(entityType, entityId);
  const cached = entityCache.get(cacheKey);
  if (cached) return cached;

  let entity: EntityData;

  switch (entityType) {
    case "character":
      entity = await characters.get(entityId);
      break;
    case "location":
      entity = await locations.get(entityId);
      break;
    case "organization":
      entity = await organizations.get(entityId);
      break;
    case "quest":
      entity = await quests.get(entityId);
      break;
    case "hero":
      entity = await heroes.get(entityId);
      break;
    case "player":
      entity = await players.get(entityId);
      break;
    case "session":
      entity = await sessions.get(entityId);
      break;
    case "timeline_event":
      entity = await timelineEvents.get(entityId);
      break;
    case "secret":
      entity = await secrets.get(entityId);
      break;
    case "campaign":
      entity = await campaigns.get(entityId);
      break;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }

  entityCache.set(cacheKey, entity);
  return entity;
}

/**
 * Clear a specific entity from cache (useful after updates)
 */
export function clearEntityCache(
  entityType: EntityType,
  entityId: string
): void {
  entityCache.delete(getCacheKey(entityType, entityId));
}

/**
 * Clear all cached entities
 */
export function clearAllEntityCache(): void {
  entityCache.clear();
}

export function EntityPreviewPopover({
  entityType,
  entityId,
  children,
  onNavigate,
}: EntityPreviewPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delay before showing popover (debounce)
  const OPEN_DELAY = 150;
  // Delay before closing popover (allows moving to popover)
  const CLOSE_DELAY = 100;

  const handleMouseEnter = useCallback(() => {
    // Cancel any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    // Debounce open
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, OPEN_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Cancel any pending open
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay close to allow moving to popover
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, CLOSE_DELAY);
  }, []);

  // Fetch entity data when popover opens
  useEffect(() => {
    if (!isOpen) return;

    // Check cache first
    const cached = entityCache.get(getCacheKey(entityType, entityId));
    if (cached) {
      setEntity(cached);
      return;
    }

    // Fetch if not cached
    setIsLoading(true);
    setError(null);

    fetchEntity(entityType, entityId)
      .then((data) => {
        setEntity(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch entity:", err);
        setError("Failed to load");
        setIsLoading(false);
      });
  }, [isOpen, entityType, entityId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="inline"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-auto p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="p-4 text-sm text-destructive">{error}</div>
        )}
        {entity && !isLoading && (
          <EntityPreviewCard
            entityType={entityType}
            entity={entity}
            compact
            onNavigate={onNavigate}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
