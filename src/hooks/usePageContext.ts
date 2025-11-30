/**
 * Hook to capture page context for AI awareness
 *
 * Extracts the current entity being viewed from React Router,
 * fetches entity details, and provides context for the AI chat.
 */

import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { EntityType } from "@/types";
import type {
  PageContext,
  LocationHierarchyItem,
  RelatedEntityRef,
} from "@/ai/context/types";
import {
  useCharacterStore,
  useLocationStore,
  useOrganizationStore,
  useQuestStore,
  useHeroStore,
  usePlayerStore,
  useSessionStore,
  useTimelineEventStore,
} from "@/stores/entityStores";
import { useRelationshipStore } from "@/stores/relationshipStore";

/**
 * Route patterns for entity type detection
 */
const ROUTE_PATTERNS: Record<string, EntityType> = {
  "/characters/": "character",
  "/locations/": "location",
  "/organizations/": "organization",
  "/quests/": "quest",
  "/heroes/": "hero",
  "/players/": "player",
  "/sessions/": "session",
  "/timeline/": "timeline_event",
};

/**
 * Parse entity type from URL path
 */
function parseEntityTypeFromPath(path: string): EntityType | null {
  for (const [prefix, entityType] of Object.entries(ROUTE_PATTERNS)) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      return entityType;
    }
  }
  return null;
}

/**
 * Build location hierarchy path from current location to root
 */
function buildLocationHierarchy(
  locationId: string,
  allLocations: Array<{
    id: string;
    name: string;
    parent_id: string | null;
    location_type: string;
  }>
): LocationHierarchyItem[] {
  const path: LocationHierarchyItem[] = [];
  let current = allLocations.find((l) => l.id === locationId);

  while (current) {
    path.unshift({
      id: current.id,
      name: current.name,
      locationType: current.location_type,
    });
    current = current.parent_id
      ? allLocations.find((l) => l.id === current!.parent_id)
      : undefined;
  }

  return path;
}

/**
 * Hook to capture page context for AI awareness
 *
 * Returns PageContext with:
 * - Entity type/ID/name from route params
 * - Location hierarchy for location pages
 * - Related entity references from relationships
 */
export function usePageContext(): PageContext {
  const location = useLocation();
  const params = useParams<{ id?: string }>();

  // Parse route to determine entity type
  const entityType = useMemo(
    () => parseEntityTypeFromPath(location.pathname),
    [location.pathname]
  );
  const entityId = params.id || null;

  // Get entity stores - we'll selectively use the right one based on entityType
  const characters = useCharacterStore((s) => s.entities);
  const locations = useLocationStore((s) => s.entities);
  const organizations = useOrganizationStore((s) => s.entities);
  const quests = useQuestStore((s) => s.entities);
  const heroes = useHeroStore((s) => s.entities);
  const players = usePlayerStore((s) => s.entities);
  const sessions = useSessionStore((s) => s.entities);
  const timelineEvents = useTimelineEventStore((s) => s.entities);

  // Get relationships for the current entity
  const relationships = useRelationshipStore((s) => s.relationships);

  // Get entity name based on type
  const entityName = useMemo(() => {
    if (!entityType || !entityId) return null;

    switch (entityType) {
      case "character":
        return characters.find((e) => e.id === entityId)?.name ?? null;
      case "location":
        return locations.find((e) => e.id === entityId)?.name ?? null;
      case "organization":
        return organizations.find((e) => e.id === entityId)?.name ?? null;
      case "quest":
        return quests.find((e) => e.id === entityId)?.name ?? null;
      case "hero":
        return heroes.find((e) => e.id === entityId)?.name ?? null;
      case "player":
        return players.find((e) => e.id === entityId)?.name ?? null;
      case "session":
        return sessions.find((e) => e.id === entityId)?.title ?? null;
      case "timeline_event":
        return timelineEvents.find((e) => e.id === entityId)?.title ?? null;
      default:
        return null;
    }
  }, [
    entityType,
    entityId,
    characters,
    locations,
    organizations,
    quests,
    heroes,
    players,
    sessions,
    timelineEvents,
  ]);

  // Build location hierarchy if viewing a location
  const locationHierarchy = useMemo(() => {
    if (entityType !== "location" || !entityId) return undefined;
    return buildLocationHierarchy(entityId, locations);
  }, [entityType, entityId, locations]);

  // Build related entity references from relationships
  const relatedEntityIds = useMemo((): RelatedEntityRef[] | undefined => {
    if (!entityType || !entityId || relationships.length === 0) {
      return undefined;
    }

    const related: RelatedEntityRef[] = [];

    for (const rel of relationships) {
      // Check if this entity is the source
      if (rel.source_type === entityType && rel.source_id === entityId) {
        related.push({
          entityType: rel.target_type as EntityType,
          entityId: rel.target_id,
          name: getEntityName(rel.target_type as EntityType, rel.target_id),
          relationship: rel.relationship_type,
        });
      }
      // Check if this entity is the target
      else if (rel.target_type === entityType && rel.target_id === entityId) {
        related.push({
          entityType: rel.source_type as EntityType,
          entityId: rel.source_id,
          name: getEntityName(rel.source_type as EntityType, rel.source_id),
          relationship: rel.relationship_type,
        });
      }
    }

    return related.length > 0 ? related : undefined;

    function getEntityName(type: EntityType, id: string): string {
      switch (type) {
        case "character":
          return characters.find((e) => e.id === id)?.name ?? "Unknown";
        case "location":
          return locations.find((e) => e.id === id)?.name ?? "Unknown";
        case "organization":
          return organizations.find((e) => e.id === id)?.name ?? "Unknown";
        case "quest":
          return quests.find((e) => e.id === id)?.name ?? "Unknown";
        case "hero":
          return heroes.find((e) => e.id === id)?.name ?? "Unknown";
        case "player":
          return players.find((e) => e.id === id)?.name ?? "Unknown";
        case "session":
          return sessions.find((e) => e.id === id)?.title ?? "Unknown";
        case "timeline_event":
          return timelineEvents.find((e) => e.id === id)?.title ?? "Unknown";
        default:
          return "Unknown";
      }
    }
  }, [
    entityType,
    entityId,
    relationships,
    characters,
    locations,
    organizations,
    quests,
    heroes,
    players,
    sessions,
    timelineEvents,
  ]);

  return {
    entityType,
    entityId,
    entityName,
    path: location.pathname,
    locationHierarchy,
    relatedEntityIds,
  };
}
