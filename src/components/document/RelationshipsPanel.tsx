import { useState } from "react";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RelationshipList } from "@/components/relationship";
import { Badge } from "@/components/ui/badge";

export type EntityType =
  | "character"
  | "location"
  | "quest"
  | "organization"
  | "hero"
  | "session"
  | "timeline_event";

export interface RelationshipsPanelProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  defaultOpen?: boolean;
  className?: string;
}

export function RelationshipsPanel({
  entityType,
  entityId,
  entityName,
  defaultOpen = true,
  className,
}: RelationshipsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("relationships-panel border-t border-border mt-8 pt-6", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relationships-panel-header w-full flex items-center justify-between py-2 hover:text-foreground transition-colors text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Link2 className="h-4 w-4" />
          <span className="font-medium">Relationships</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          Click to {isOpen ? "collapse" : "expand"}
        </Badge>
      </button>

      {isOpen && (
        <div className="mt-4">
          <RelationshipList
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
          />
        </div>
      )}
    </div>
  );
}
