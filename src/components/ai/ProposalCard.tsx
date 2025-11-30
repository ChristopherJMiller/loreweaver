/**
 * Proposal Card Component
 *
 * Displays an entity proposal inline in the chat.
 * Allows users to accept, edit, or reject proposals.
 */

import { useState, useMemo } from "react";
import {
  Check,
  X,
  Pencil,
  Loader2,
  Lightbulb,
  ArrowRight,
  ArrowLeftRight,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  EntityProposal,
  CreateProposal,
  UpdateProposal,
  RelationshipProposal,
} from "@/ai/tools/entity-proposals/types";
import {
  isCreateProposal,
  isUpdateProposal,
  isRelationshipProposal,
} from "@/ai/tools/entity-proposals/types";
import type { SuggestedRelationship } from "@/ai/agents/types";
import { RICH_TEXT_FIELDS } from "@/types";

interface ProposalCardProps {
  /** The proposal to display */
  proposal: EntityProposal;

  /** Callback when user accepts the proposal */
  onAccept: (proposal: EntityProposal) => void;

  /** Callback when user rejects the proposal */
  onReject: (proposalId: string) => void;

  /** Callback when user wants to edit the proposal */
  onEdit: (proposal: EntityProposal) => void;

  /** Whether the proposal is being processed */
  isProcessing?: boolean;
}

/**
 * Format entity type for display
 */
export function formatEntityType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Check if a field should be rendered as rich text (markdown)
 */
function isRichTextField(fieldName: string): boolean {
  return RICH_TEXT_FIELDS.has(fieldName);
}

/**
 * Field Value Component
 *
 * Renders a single field value with optional markdown and expansion for long text.
 */
function FieldValue({
  label,
  value,
  fieldName,
}: {
  label: string;
  value: string;
  fieldName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = value.length > 150;
  const isRichText = isRichTextField(fieldName);

  const displayValue = isExpanded ? value : isLong ? value.slice(0, 150) + "..." : value;

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {isRichText ? (
        <ScrollArea className={isLong && !isExpanded ? "max-h-20" : isExpanded ? "max-h-48" : ""}>
          <div
            className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2"
            dangerouslySetInnerHTML={{ __html: marked.parse(displayValue) as string }}
          />
        </ScrollArea>
      ) : (
        <p className="text-sm">{displayValue}</p>
      )}
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseDown={(e) => e.preventDefault()}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Suggested Relationships List Component
 *
 * Displays the relationships that will be created with a new entity.
 */
function SuggestedRelationshipsList({
  relationships,
  entityName,
}: {
  relationships: SuggestedRelationship[];
  entityName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (relationships.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs gap-1" onMouseDown={(e) => e.preventDefault()}>
          <Link2 className="h-3 w-3" />
          {isExpanded ? "Hide" : "Show"} {relationships.length} relationship
          {relationships.length !== 1 && "s"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
          {relationships.map((rel, idx) => (
            <div key={idx} className="text-sm">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium">{entityName}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="secondary" className="text-xs">
                  {rel.relationshipType}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium">{rel.targetName}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatEntityType(rel.targetType)})
                </span>
                {rel.isNewEntity && (
                  <Badge variant="outline" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
              {rel.description && (
                <p className="text-xs text-muted-foreground mt-1 ml-4">
                  {rel.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Get badge variant based on proposal status
 */
function getStatusVariant(
  status: EntityProposal["status"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted":
      return "default";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Get operation badge variant
 */
function getOperationVariant(
  operation: EntityProposal["operation"]
): "default" | "secondary" | "outline" {
  switch (operation) {
    case "create":
      return "default";
    case "update":
      return "secondary";
    case "relationship":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Render create proposal content
 */
function CreateProposalContent({ proposal }: { proposal: CreateProposal }) {
  const [showDetails, setShowDetails] = useState(false);

  // Memoize field computations - separate primary fields from additional
  const { primaryFields, additionalFields } = useMemo(() => {
    const nonNameFields = Object.entries(proposal.data).filter(
      ([key]) => key !== "name"
    );

    // Primary fields: description first if present
    const primary: Array<{ key: string; label: string; value: string }> = [];
    const additional: Array<{ key: string; label: string; value: string }> = [];

    for (const [key, rawValue] of nonNameFields) {
      const value = typeof rawValue === "string" ? rawValue : String(rawValue);
      const item = { key, label: formatEntityType(key), value };

      if (key === "description" || key === "personality" || key === "hook") {
        primary.push(item);
      } else {
        additional.push(item);
      }
    }

    return { primaryFields: primary, additionalFields: additional };
  }, [proposal.data]);

  const hasFields = primaryFields.length > 0 || additionalFields.length > 0;

  return (
    <div className="space-y-3">
      {/* Entity name */}
      <div>
        <span className="text-sm text-muted-foreground">Name:</span>
        <span className="ml-2 font-medium">{proposal.data.name}</span>
      </div>

      {/* Primary fields (always visible) */}
      {primaryFields.length > 0 && (
        <div className="space-y-3">
          {primaryFields.map(({ key, label, value }) => (
            <FieldValue key={key} label={label} value={value} fieldName={key} />
          ))}
        </div>
      )}

      {/* Additional fields (collapsible) */}
      {additionalFields.length > 0 && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs gap-1" onMouseDown={(e) => e.preventDefault()}>
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide {additionalFields.length} more field{additionalFields.length !== 1 && "s"}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show {additionalFields.length} more field{additionalFields.length !== 1 && "s"}
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3">
              {additionalFields.map(({ key, label, value }) => (
                <FieldValue key={key} label={label} value={value} fieldName={key} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Empty state for entities with only a name */}
      {!hasFields && (
        <p className="text-xs text-muted-foreground italic">No additional details</p>
      )}

      {/* Suggested relationships */}
      {proposal.suggestedRelationships &&
        proposal.suggestedRelationships.length > 0 && (
          <SuggestedRelationshipsList
            relationships={proposal.suggestedRelationships}
            entityName={proposal.data.name}
          />
        )}
    </div>
  );
}

/**
 * Update Diff Item Component
 *
 * Renders a single diff item with expand/collapse for long values.
 */
function UpdateDiffItem({
  label,
  fieldName,
  oldValue,
  newValue,
}: {
  label: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRichText = isRichTextField(fieldName);
  const isLong = oldValue.length > 100 || newValue.length > 100;

  const truncate = (val: string) =>
    isExpanded ? val : val.length > 100 ? val.slice(0, 100) + "..." : val;

  const renderValue = (value: string, className: string) => {
    const displayValue = truncate(value);
    if (isRichText && isExpanded) {
      return (
        <div
          className={`prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5 ${className}`}
          dangerouslySetInnerHTML={{ __html: marked.parse(displayValue) as string }}
        />
      );
    }
    return <span className={className}>{displayValue}</span>;
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="space-y-1 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-red-500/70 shrink-0 text-xs mt-0.5">−</span>
          {renderValue(oldValue || "(empty)", "text-red-500/80 line-through")}
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-500/70 shrink-0 text-xs mt-0.5">+</span>
          {renderValue(newValue, "text-green-500/80")}
        </div>
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseDown={(e) => e.preventDefault()}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show full diff
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Render update proposal content with diff
 */
function UpdateProposalContent({ proposal }: { proposal: UpdateProposal }) {
  // Memoize change items
  const changeItems = useMemo(() => {
    return Object.entries(proposal.changes).map(([key, newValue]) => {
      const oldValue = proposal.currentData?.[key];
      return {
        key,
        label: formatEntityType(key),
        oldValue: oldValue !== undefined ? String(oldValue) : "",
        newValue: String(newValue),
      };
    });
  }, [proposal.changes, proposal.currentData]);

  return (
    <div className="space-y-3">
      {changeItems.map(({ key, label, oldValue, newValue }) => (
        <UpdateDiffItem
          key={key}
          label={label}
          fieldName={key}
          oldValue={oldValue}
          newValue={newValue}
        />
      ))}
    </div>
  );
}

/**
 * Render relationship proposal content
 */
function RelationshipProposalContent({
  proposal,
}: {
  proposal: RelationshipProposal;
}) {
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span className="font-medium">{proposal.sourceName}</span>
      <span className="text-xs text-muted-foreground">({proposal.sourceType})</span>
      {proposal.isBidirectional ? (
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      )}
      <Badge variant="secondary" className="text-xs">
        {proposal.relationshipType}
      </Badge>
      {proposal.isBidirectional ? (
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="font-medium">{proposal.targetName}</span>
      <span className="text-xs text-muted-foreground">({proposal.targetType})</span>
    </div>
  );
}

export function ProposalCard({
  proposal,
  onAccept,
  onReject,
  onEdit,
  isProcessing = false,
}: ProposalCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isPending = proposal.status === "pending";

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getOperationVariant(proposal.operation)}>
            {proposal.operation === "create"
              ? "Create"
              : proposal.operation === "update"
                ? "Update"
                : "Link"}
          </Badge>
          <Badge variant="outline">{formatEntityType(
            isRelationshipProposal(proposal)
              ? "relationship"
              : proposal.entityType
          )}</Badge>
          {proposal.status !== "pending" && (
            <Badge variant={getStatusVariant(proposal.status)}>
              {proposal.status === "accepted" ? "Accepted" : "Rejected"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2 px-3">
        {isCreateProposal(proposal) && (
          <CreateProposalContent proposal={proposal} />
        )}
        {isUpdateProposal(proposal) && (
          <UpdateProposalContent proposal={proposal} />
        )}
        {isRelationshipProposal(proposal) && (
          <RelationshipProposalContent proposal={proposal} />
        )}

        {/* AI Reasoning */}
        {proposal.reasoning && (
          <Collapsible
            open={showReasoning}
            onOpenChange={setShowReasoning}
            className="mt-3"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-0 gap-1 text-xs" onMouseDown={(e) => e.preventDefault()}>
                <Lightbulb className="h-3 w-3" />
                {showReasoning ? "Hide reasoning" : "Show reasoning"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                {proposal.reasoning}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      {isPending && (
        <CardFooter className="px-3 pb-3 pt-1 gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onAccept(proposal)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Accept
          </Button>
          {/* Only show Edit for create/update proposals */}
          {!isRelationshipProposal(proposal) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(proposal)}
              disabled={isProcessing}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReject(proposal.id)}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
