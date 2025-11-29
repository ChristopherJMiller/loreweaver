/**
 * Generation Preview Modal
 *
 * Shows AI-generated entity content for review and editing before creation.
 * Allows the user to modify fields and accept/reject the generation.
 */

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { GenerationResult, SuggestedRelationship } from "@/ai/agents/types";
import type { EntityType } from "@/types";

interface GenerationPreviewProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;

  /** The entity type being generated */
  entityType: EntityType;

  /** Whether generation is in progress */
  isLoading: boolean;

  /** Generation result (null if loading or not started) */
  result: GenerationResult | null;

  /** Callback when user accepts the generation */
  onAccept: (data: {
    name: string;
    fields: Record<string, string>;
    relationships: SuggestedRelationship[];
  }) => void;

  /** Callback to regenerate with different settings */
  onRegenerate?: () => void;

  /** Whether entity creation is in progress */
  isCreating?: boolean;

  /** Error message from creation attempt */
  createError?: string | null;
}

/**
 * Field editor component
 */
function FieldEditor({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  // Format label for display
  const displayLabel = label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-1.5">
      <Label htmlFor={label}>{displayLabel}</Label>
      {multiline ? (
        <Textarea
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px]"
        />
      ) : (
        <Input
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * Relationship preview component
 */
function RelationshipPreview({
  relationship,
}: {
  relationship: SuggestedRelationship;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="outline" className="text-xs">
        {relationship.relationshipType}
      </Badge>
      <span className="text-muted-foreground">→</span>
      <span>
        {relationship.targetName}
        <span className="text-muted-foreground ml-1">
          ({relationship.targetType})
        </span>
      </span>
      {relationship.isNewEntity && (
        <Badge variant="secondary" className="text-xs">
          New
        </Badge>
      )}
    </div>
  );
}

export function GenerationPreview({
  open,
  onOpenChange,
  entityType,
  isLoading,
  result,
  onAccept,
  onRegenerate,
  isCreating = false,
  createError = null,
}: GenerationPreviewProps) {
  // Editable state for the generated entity
  const [editedName, setEditedName] = useState("");
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [showReasoning, setShowReasoning] = useState(false);

  // Initialize edited state when result changes
  const initializeFromResult = (r: GenerationResult) => {
    if (r.entity) {
      setEditedName(r.entity.name);
      setEditedFields({ ...r.entity.fields });
    }
  };

  // Reset state when result changes
  if (result?.success && result.entity) {
    if (editedName === "" && Object.keys(editedFields).length === 0) {
      initializeFromResult(result);
    }
  }

  // Handle accept
  const handleAccept = () => {
    onAccept({
      name: editedName,
      fields: editedFields,
      relationships: result?.suggestedRelationships ?? [],
    });
    // Reset state
    setEditedName("");
    setEditedFields({});
  };

  // Handle close
  const handleClose = () => {
    setEditedName("");
    setEditedFields({});
    setShowReasoning(false);
    onOpenChange(false);
  };

  // Update a field
  const updateField = (key: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  };

  // Determine which fields are multiline (description, notes, etc.)
  const isMultilineField = (key: string): boolean => {
    const multilineKeys = [
      "description",
      "personality",
      "motivations",
      "secrets",
      "voice_notes",
      "backstory",
      "notes",
      "content",
      "goals",
      "resources",
      "objectives",
      "rewards",
      "summary",
      "known_for",
      "current_state",
    ];
    return multilineKeys.includes(key);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generated {entityType}
          </DialogTitle>
          <DialogDescription>
            Review and edit the generated content before adding to your campaign.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Generating {entityType.toLowerCase()}...
              </p>
            </div>
          ) : result?.error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-sm text-destructive">{result.error}</p>
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onRegenerate}
                >
                  Try Again
                </Button>
              )}
            </div>
          ) : result?.success && result.entity ? (
            <div className="space-y-6">
              {/* Name field */}
              <FieldEditor
                label="name"
                value={editedName}
                onChange={setEditedName}
              />

              {/* Other fields */}
              {Object.entries(editedFields).map(([key, value]) => (
                <FieldEditor
                  key={key}
                  label={key}
                  value={value}
                  onChange={(v) => updateField(key, v)}
                  multiline={isMultilineField(key)}
                />
              ))}

              {/* Suggested relationships */}
              {result.suggestedRelationships &&
                result.suggestedRelationships.length > 0 && (
                  <div className="space-y-2">
                    <Label>Suggested Relationships</Label>
                    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                      {result.suggestedRelationships.map((rel, i) => (
                        <RelationshipPreview key={i} relationship={rel} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Relationships will be created after you accept.
                    </p>
                  </div>
                )}

              {/* AI Reasoning (collapsible) */}
              {result.reasoning && (
                <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Reasoning
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 rounded-md border p-3 bg-muted/30 text-sm text-muted-foreground">
                      {result.reasoning}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Token usage */}
              {result.usage && (
                <p className="text-xs text-muted-foreground">
                  Tokens used: {result.usage.inputTokens + result.usage.outputTokens}
                </p>
              )}

              {/* Creation error */}
              {createError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {createError}
                </div>
              )}
            </div>
          ) : null}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {onRegenerate && !isLoading && result?.success && (
            <Button variant="outline" onClick={onRegenerate}>
              Regenerate
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isLoading || isCreating || !result?.success}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Accept & Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
