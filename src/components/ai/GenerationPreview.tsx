/**
 * Generation Preview Modal
 *
 * Shows AI-generated entity content for review and editing before creation.
 * Allows the user to modify fields and accept/reject the generation.
 * Supports two-phase generation with research + structured output.
 */

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, Lightbulb, Search, Check } from "lucide-react";
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
import type { AgenticGenerationResult, SuggestedRelationship, ResearchStep } from "@/ai/agents/types";
import type { PartialEntity } from "@/ai/agents";
import type { EntityType } from "@/types";

interface GenerationPreviewProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;

  /** The entity type being generated */
  entityType: EntityType;

  /** Whether generation is in progress (includes research + generation) */
  isLoading: boolean;

  /** Whether research phase is in progress */
  isResearching?: boolean;

  /** Progress message from research phase */
  researchProgress?: string;

  /** Research steps for structured progress display */
  researchSteps?: ResearchStep[];

  /** Generation result (null if loading or not started) */
  result: AgenticGenerationResult | null;

  /** Partial entity data during streaming (for progressive display) */
  partialEntity?: PartialEntity | null;

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

/**
 * Read-only field display for streaming preview
 */
function StreamingField({
  label,
  value,
  isStreaming,
}: {
  label: string;
  value: string | undefined;
  isStreaming: boolean;
}) {
  const displayLabel = label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{displayLabel}</Label>
      <div className="min-h-[36px] rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
        {value || (
          <span className="text-muted-foreground italic">Generating...</span>
        )}
        {isStreaming && value && (
          <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function GenerationPreview({
  open,
  onOpenChange,
  entityType,
  isLoading,
  isResearching = false,
  researchProgress = "",
  researchSteps = [],
  result,
  partialEntity,
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
  const initializeFromResult = (r: AgenticGenerationResult) => {
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
          {isResearching ? (
            // Research phase indicator with structured steps
            <div className="flex flex-col items-center justify-center py-8">
              <Search className="h-8 w-8 text-primary mb-4 animate-pulse" />
              <p className="text-sm text-muted-foreground mb-4">
                Researching your world...
              </p>

              {/* Research steps list */}
              {researchSteps.length > 0 ? (
                <div className="w-full max-w-sm space-y-1">
                  {researchSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      {step.status === "complete" ? (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                      )}
                      <span
                        className={
                          step.status === "complete"
                            ? "text-muted-foreground"
                            : ""
                        }
                      >
                        {step.action}
                      </span>
                    </div>
                  ))}
                </div>
              ) : researchProgress ? (
                // Fallback to legacy progress text if no steps yet
                <p className="text-xs text-muted-foreground/70 max-w-xs text-center font-mono truncate">
                  {researchProgress.slice(-50)}
                </p>
              ) : null}
            </div>
          ) : isLoading && partialEntity ? (
            // Streaming preview with partial data
            <div className="space-y-6">
              <StreamingField
                label="name"
                value={partialEntity.name}
                isStreaming={true}
              />
              {/* Show fields as they stream in */}
              {partialEntity.fields &&
                Object.entries(partialEntity.fields).map(([key, value]) => (
                  <StreamingField
                    key={key}
                    label={key}
                    value={value}
                    isStreaming={true}
                  />
                ))}
              {/* Show partial reasoning if available */}
              {partialEntity.reasoning && (
                <div className="text-xs text-muted-foreground mt-4 p-2 rounded bg-muted/50">
                  <span className="font-medium">AI thinking:</span>{" "}
                  {partialEntity.reasoning}
                </div>
              )}
            </div>
          ) : isLoading ? (
            // Generation phase - after research, before streaming starts
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-8 w-8 text-primary mb-4 animate-pulse" />
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
              {result.totalUsage && (
                <p className="text-xs text-muted-foreground">
                  Tokens used: {result.totalUsage.inputTokens + result.totalUsage.outputTokens}
                  {result.totalUsage.researchTokens > 0 && (
                    <span className="text-muted-foreground/70">
                      {" "}(research: {result.totalUsage.researchTokens})
                    </span>
                  )}
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
