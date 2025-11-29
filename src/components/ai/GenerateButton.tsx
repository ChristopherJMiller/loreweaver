/**
 * Generate Button
 *
 * Button to trigger AI entity generation. Opens a dialog for
 * context input and then shows the generation preview.
 */

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
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
}

export function GenerateButton({
  entityType,
  onGenerate,
  isLoading = false,
  children,
  locations = [],
  ...buttonProps
}: GenerateButtonProps) {
  const isAIAvailable = useAIAvailable();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [context, setContext] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  const isLocation = entityType === "location";

  const handleGenerate = () => {
    onGenerate(context, parentId ?? undefined);
    setDialogOpen(false);
    setContext("");
    setParentId(null);
  };

  // Check if generate is allowed (for locations, require parent selection or explicit "none")
  const canGenerate = !isLocation || parentId !== null || locations.length === 0;

  // Format entity type for display
  const entityLabel = entityType.toLowerCase();

  return (
    <>
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
                <Label htmlFor="parent">Parent Location *</Label>
                {locations.length === 0 ? (
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
