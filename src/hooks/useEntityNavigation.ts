/**
 * useEntityNavigation Hook
 *
 * Provides navigation functions for entity routes.
 * Maps entity types to their detail page routes.
 */

import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import type { EntityType } from "@/types";

/**
 * Entity type to route prefix mapping
 */
const ENTITY_ROUTES: Record<EntityType, string> = {
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

/**
 * Get the detail page route for an entity
 */
export function getEntityRoute(entityType: EntityType, entityId: string): string {
  const basePath = ENTITY_ROUTES[entityType];
  return `${basePath}/${entityId}`;
}

/**
 * Get the list page route for an entity type
 */
export function getEntityListRoute(entityType: EntityType): string {
  return ENTITY_ROUTES[entityType];
}

/**
 * Hook for navigating to entity pages
 */
export function useEntityNavigation() {
  const navigate = useNavigate();

  /**
   * Navigate to an entity's detail page
   */
  const navigateToEntity = useCallback(
    (entityType: EntityType, entityId: string) => {
      const route = getEntityRoute(entityType, entityId);
      navigate(route);
    },
    [navigate]
  );

  /**
   * Navigate to an entity type's list page
   */
  const navigateToEntityList = useCallback(
    (entityType: EntityType) => {
      const route = getEntityListRoute(entityType);
      navigate(route);
    },
    [navigate]
  );

  /**
   * Create a navigation callback for a specific entity
   * Useful for passing to onClick handlers
   */
  const createNavigateHandler = useCallback(
    (entityType: EntityType, entityId: string) => {
      return () => navigateToEntity(entityType, entityId);
    },
    [navigateToEntity]
  );

  return {
    navigateToEntity,
    navigateToEntityList,
    createNavigateHandler,
    getEntityRoute,
    getEntityListRoute,
  };
}
