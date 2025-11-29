/**
 * CitationPill Component
 *
 * Inline pill that displays an entity reference with type icon.
 * Used in AI chat responses and Tiptap editor.
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { EntityType } from "@/types";
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

export interface CitationPillProps {
  entityType: EntityType;
  entityId: string;
  displayName: string;
  onClick?: () => void;
  showTypeIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const ENTITY_ICONS: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  character: User,
  location: MapPin,
  organization: Building2,
  quest: Scroll,
  session: Calendar,
  hero: Shield,
  player: UserCircle,
  timeline_event: Clock,
  secret: Lock,
  campaign: Building2,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  character: "Character",
  location: "Location",
  organization: "Organization",
  quest: "Quest",
  session: "Session",
  hero: "Hero",
  player: "Player",
  timeline_event: "Event",
  secret: "Secret",
  campaign: "Campaign",
};

export const CitationPill = forwardRef<HTMLSpanElement, CitationPillProps>(
  (
    {
      entityType,
      entityId,
      displayName,
      onClick,
      showTypeIcon = true,
      size = "sm",
      className,
    },
    ref
  ) => {
    const Icon = ENTITY_ICONS[entityType];
    const label = ENTITY_LABELS[entityType];

    return (
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        data-citation
        data-entity-type={entityType}
        data-entity-id={entityId}
        title={`${label}: ${displayName}`}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={cn(
          "citation-pill",
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
          "bg-accent/15 text-accent-foreground font-medium",
          "cursor-pointer select-none transition-colors",
          "hover:bg-accent/25 focus:outline-none focus:ring-2 focus:ring-accent/50",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          className
        )}
      >
        {showTypeIcon && Icon && (
          <Icon
            className={cn(
              "flex-shrink-0",
              size === "sm" && "h-3 w-3",
              size === "md" && "h-4 w-4"
            )}
          />
        )}
        <span className="truncate max-w-[200px]">{displayName}</span>
      </span>
    );
  }
);

CitationPill.displayName = "CitationPill";

// Re-export entity utilities for use in other components
export { ENTITY_ICONS, ENTITY_LABELS };
