/**
 * Proposal Edit Dialog
 *
 * Modal dialog for editing proposal data before accepting.
 * Supports both create and update proposals.
 */

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
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
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";
import {
  isCreateProposal,
  isUpdateProposal,
} from "@/ai/tools/entity-proposals/types";
import { ENTITY_FIELDS } from "@/ai/agents/types";
import type { EntityType } from "@/types";

interface ProposalEditDialogProps {
  /** The proposal being edited */
  proposal: EntityProposal | null;

  /** Whether the dialog is open */
  open: boolean;

  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;

  /** Callback when user saves changes and accepts */
  onSave: (editedData: Record<string, unknown>) => void;
}

/**
 * Field editor component
 */
function FieldEditor({
  label,
  value,
  onChange,
  multiline = false,
  highlighted = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  highlighted?: boolean;
}) {
  // Format label for display
  const displayLabel = label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={label}>{displayLabel}</Label>
        {highlighted && (
          <Badge variant="secondary" className="text-xs">
            Changed
          </Badge>
        )}
      </div>
      {multiline ? (
        <Textarea
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`min-h-[80px] ${highlighted ? "border-primary/50" : ""}`}
        />
      ) : (
        <Input
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={highlighted ? "border-primary/50" : ""}
        />
      )}
    </div>
  );
}

/**
 * Determine which fields are multiline
 */
function isMultilineField(key: string): boolean {
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
    "gm_notes",
    "hook",
    "complications",
    "resolution",
    "reward",
    "planned_content",
    "highlights",
    "reveal_conditions",
    "preferences",
    "boundaries",
  ];
  return multilineKeys.includes(key);
}

/**
 * Get all editable fields for an entity type
 */
function getEditableFields(entityType: EntityType): string[] {
  return ENTITY_FIELDS[entityType] ?? ["name"];
}

/**
 * Format entity type for display
 */
function formatEntityType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProposalEditDialog({
  proposal,
  open,
  onOpenChange,
  onSave,
}: ProposalEditDialogProps) {
  const [editedData, setEditedData] = useState<Record<string, string>>({});

  // Initialize edited data when proposal changes
  useEffect(() => {
    if (!proposal) {
      setEditedData({});
      return;
    }

    if (isCreateProposal(proposal)) {
      // For create proposals, include all data
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(proposal.data)) {
        data[key] = typeof value === "string" ? value : String(value ?? "");
      }
      setEditedData(data);
    } else if (isUpdateProposal(proposal)) {
      // For update proposals, merge current data with changes
      const data: Record<string, string> = {};

      // First add current data
      if (proposal.currentData) {
        for (const [key, value] of Object.entries(proposal.currentData)) {
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            data[key] = String(value ?? "");
          }
        }
      }

      // Then overlay the changes
      for (const [key, value] of Object.entries(proposal.changes)) {
        data[key] = typeof value === "string" ? value : String(value ?? "");
      }

      setEditedData(data);
    }
  }, [proposal]);

  // Handle field update
  const updateField = (key: string, value: string) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  };

  // Handle save
  const handleSave = () => {
    // Convert empty strings to undefined for optional fields
    const cleanedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editedData)) {
      cleanedData[key] = value.trim() || undefined;
    }
    onSave(cleanedData);
  };

  // Get entity type for field suggestions
  const entityType = proposal
    ? isCreateProposal(proposal) || isUpdateProposal(proposal)
      ? proposal.entityType
      : null
    : null;

  // For update proposals, track which fields are being changed
  const changedFields = new Set<string>();
  if (proposal && isUpdateProposal(proposal)) {
    for (const key of Object.keys(proposal.changes)) {
      changedFields.add(key);
    }
  }

  // Get fields to show (for create: entity fields, for update: changed + current fields)
  const fieldsToShow = entityType
    ? getEditableFields(entityType).filter((f) => f in editedData || f === "name")
    : Object.keys(editedData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit{" "}
            {proposal && (isCreateProposal(proposal) || isUpdateProposal(proposal))
              ? formatEntityType(proposal.entityType)
              : "Proposal"}
          </DialogTitle>
          <DialogDescription>
            {proposal && isCreateProposal(proposal)
              ? "Edit the fields before creating this entity."
              : proposal && isUpdateProposal(proposal)
                ? "Review and modify the changes before applying."
                : "Edit the proposal data."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Always show name first if present */}
            {editedData.name !== undefined && (
              <FieldEditor
                label="name"
                value={editedData.name}
                onChange={(v) => updateField("name", v)}
                highlighted={changedFields.has("name")}
              />
            )}

            {/* Show other fields */}
            {fieldsToShow
              .filter((key) => key !== "name" && editedData[key] !== undefined)
              .map((key) => (
                <FieldEditor
                  key={key}
                  label={key}
                  value={editedData[key] ?? ""}
                  onChange={(v) => updateField(key, v)}
                  multiline={isMultilineField(key)}
                  highlighted={changedFields.has(key)}
                />
              ))}

            {/* Show any additional fields from the proposal not in the entity schema */}
            {Object.keys(editedData)
              .filter(
                (key) =>
                  key !== "name" &&
                  !fieldsToShow.includes(key)
              )
              .map((key) => (
                <FieldEditor
                  key={key}
                  label={key}
                  value={editedData[key] ?? ""}
                  onChange={(v) => updateField(key, v)}
                  multiline={isMultilineField(key)}
                  highlighted={changedFields.has(key)}
                />
              ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save & Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
