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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIAvailable } from "@/stores/aiStore";
import type { EntityType } from "@/types";
import type { GenerationQuality } from "@/ai/agents/types";

interface GenerateButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Type of entity to generate */
  entityType: EntityType;

  /** Callback when generation is requested */
  onGenerate: (context: string, quality: GenerationQuality) => void;

  /** Whether generation is in progress */
  isLoading?: boolean;
}

export function GenerateButton({
  entityType,
  onGenerate,
  isLoading = false,
  children,
  ...buttonProps
}: GenerateButtonProps) {
  const isAIAvailable = useAIAvailable();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [context, setContext] = useState("");
  const [quality, setQuality] = useState<GenerationQuality>("balanced");

  const handleGenerate = () => {
    onGenerate(context, quality);
    setDialogOpen(false);
    setContext("");
  };

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

            <div className="space-y-2">
              <Label htmlFor="quality">Generation Quality</Label>
              <Select
                value={quality}
                onValueChange={(v) => setQuality(v as GenerationQuality)}
              >
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">
                    Quick - Fast, basic details
                  </SelectItem>
                  <SelectItem value="balanced">
                    Balanced - Good detail, reasonable speed
                  </SelectItem>
                  <SelectItem value="detailed">
                    Detailed - Rich content, more hooks
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
