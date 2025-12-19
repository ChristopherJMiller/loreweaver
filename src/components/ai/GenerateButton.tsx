/**
 * Generate Button
 *
 * Button to trigger AI entity generation. Opens a dialog for
 * context input and then shows the generation preview.
 */

import { useState } from "react";
import { Sparkles, Loader2, MapPin } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ExpandableButton } from "@/components/ui/expandable-button-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAIAvailable } from "@/stores/aiStore";
import type { EntityType, Location } from "@/types";
import { LOCATION_TYPES, getLocationTypeLabel } from "@/lib/constants";

interface GenerateButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Type of entity to generate */
  entityType: EntityType;

  /** Callback when generation is requested */
  onGenerate: (context: string, parentId?: string) => void;

  /** Whether generation is in progress */
  isLoading?: boolean;

  /** Available locations for parent selection (only for location entityType) */
  locations?: Location[];

  /** Pre-set parent location ID (for "generate child" flow) */
  defaultParentId?: string;

  /** Name of the pre-set parent location (required when parentLocked is true) */
  defaultParentName?: string;

  /** If true, parent selection is shown but disabled/read-only */
  parentLocked?: boolean;

  /** When true, renders as expandable icon button */
  expandable?: boolean;
}

export function GenerateButton({
  entityType,
  onGenerate,
  isLoading = false,
  children,
  locations = [],
  defaultParentId,
  defaultParentName,
  parentLocked = false,
  expandable = false,
  ...buttonProps
}: GenerateButtonProps) {
  const isAIAvailable = useAIAvailable();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [context, setContext] = useState("");
  const [parentId, setParentId] = useState<string | null>(defaultParentId ?? null);

  const isLocation = entityType === "location";

  const handleGenerate = () => {
    onGenerate(context, parentId ?? undefined);
    setDialogOpen(false);
    setContext("");
    setParentId(defaultParentId ?? null);
  };

  // Check if generate is allowed (for locations, require parent selection or explicit "none")
  // When defaultParentId is set, we already have a valid parent
  const canGenerate = !isLocation || parentId !== null || locations.length === 0 || defaultParentId !== undefined;

  // Format entity type for display
  const entityLabel = entityType.toLowerCase();

  // Determine the label text
  const labelText = typeof children === "string" ? children : `Generate ${entityType}`;

  return (
    <>
      {expandable ? (
        <ExpandableButton
          icon={
            isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )
          }
          label={labelText}
          variant="outline"
          onClick={() => setDialogOpen(true)}
          disabled={!isAIAvailable || isLoading}
          forceExpanded={dialogOpen}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => setDialogOpen(true)}
          disabled={!isAIAvailable || isLoading}
          {...buttonProps}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {children ?? `Generate ${entityType}`}
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate {entityType}
            </DialogTitle>
            <DialogDescription>
              Describe what kind of {entityLabel} you want to create.
              The AI will use your campaign context to generate something fitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="context">
                Description (optional)
              </Label>
              <Textarea
                id="context"
                placeholder={`e.g., "A mysterious merchant who knows too much about the party's quest" or "A tavern in the shadier part of town"`}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for a completely AI-generated {entityLabel}.
              </p>
            </div>

            {/* Parent Location selector for locations */}
            {isLocation && (
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Location {!parentLocked && "*"}</Label>
                {parentLocked && defaultParentId ? (
                  // Locked parent display (for "generate child" flow)
                  <div className="flex items-center gap-2 py-2 px-3 rounded-md border bg-muted/50">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{defaultParentName ?? "Unknown"}</span>
                  </div>
                ) : locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    This will be a top-level location (no existing locations to parent under).
                  </p>
                ) : (
                  <>
                    <SearchableSelect
                      value={parentId}
                      onValueChange={(value) => setParentId(value)}
                      placeholder="Select parent location..."
                      searchPlaceholder="Search locations..."
                      emptyText="No locations found"
                      items={locations}
                      getItemId={(loc) => loc.id}
                      getItemLabel={(loc) => loc.name}
                      getItemGroup={(loc) => getLocationTypeLabel(loc.location_type)}
                      groupOrder={LOCATION_TYPES.map((t) => t.label)}
                      allowNone
                      noneLabel="None (top-level location)"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Select where this location should exist within your world.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={!canGenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
