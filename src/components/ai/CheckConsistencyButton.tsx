/**
 * Check Consistency Button Component
 *
 * Button that triggers consistency checking and shows results in a dialog.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableButton } from "@/components/ui/expandable-button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConsistencyCheckPanel } from "./ConsistencyCheckPanel";
import { useConsistencyCheck } from "@/hooks/useConsistencyCheck";
import type { EntityType } from "@/types";

interface CheckConsistencyButtonProps {
  /** Campaign ID */
  campaignId: string;
  /** Entity type */
  entityType: EntityType;
  /** Entity ID (undefined for new entities) */
  entityId?: string;
  /** Entity name */
  entityName: string;
  /** Content to check (field name -> value) */
  content: Record<string, string>;
  /** Whether this is a new entity */
  isNew?: boolean;
  /** When true, renders as expandable icon button */
  expandable?: boolean;
}

/**
 * Format entity type for route
 */
function getEntityRoute(entityType: string): string {
  // Handle special cases
  if (entityType === "organization") return "organizations";
  if (entityType === "timeline_event") return "timeline";
  // Default: add 's' for plural
  return `${entityType}s`;
}

export function CheckConsistencyButton({
  campaignId,
  entityType,
  entityId,
  entityName,
  content,
  isNew = false,
  expandable = false,
}: CheckConsistencyButtonProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { isChecking, result, partialResult, currentTool, checkConsistency, clearResult } =
    useConsistencyCheck({
      campaignId,
      entityType,
      entityId,
      entityName,
      isNew,
    });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Start checking when opened
      checkConsistency(content);
    } else {
      // Clear result when closed
      clearResult();
    }
  };

  const handleNavigateToEntity = (targetType: string, targetId: string) => {
    const route = getEntityRoute(targetType);
    navigate(`/${route}/${targetId}`);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {expandable ? (
          <ExpandableButton
            icon={<Search className="h-4 w-4" />}
            label="Check Consistency"
            variant="outline"
            forceExpanded={isOpen}
          />
        ) : (
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Check Consistency
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>Consistency Check</DialogTitle>
          <DialogDescription>
            Checking {entityName} against existing lore
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ConsistencyCheckPanel
            result={result ?? undefined}
            partialResult={partialResult ?? undefined}
            isChecking={isChecking}
            currentTool={currentTool ?? undefined}
            onNavigateToEntity={handleNavigateToEntity}
            onDismiss={handleDismiss}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
