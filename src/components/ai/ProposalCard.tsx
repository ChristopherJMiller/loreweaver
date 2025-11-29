/**
 * Proposal Card Component
 *
 * Displays an entity proposal inline in the chat.
 * Allows users to accept, edit, or reject proposals.
 */

import { useState } from "react";
import {
  Check,
  X,
  Pencil,
  Loader2,
  Lightbulb,
  ArrowRight,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
function formatEntityType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

  // Get preview fields (first 3 non-name fields)
  const previewFields = Object.entries(proposal.data)
    .filter(([key]) => key !== "name")
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Entity name */}
      <div>
        <span className="text-sm text-muted-foreground">Name:</span>
        <span className="ml-2 font-medium">{proposal.data.name}</span>
      </div>

      {/* Preview fields */}
      {previewFields.length > 0 && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
              {showDetails ? "Hide details" : "Show details"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-2 text-sm">
              {Object.entries(proposal.data)
                .filter(([key]) => key !== "name")
                .map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground">
                      {formatEntityType(key)}:
                    </span>
                    <span className="line-clamp-2">
                      {typeof value === "string"
                        ? value.length > 100
                          ? value.slice(0, 100) + "..."
                          : value
                        : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Suggested relationships */}
      {proposal.suggestedRelationships &&
        proposal.suggestedRelationships.length > 0 && (
          <div className="text-xs text-muted-foreground">
            + {proposal.suggestedRelationships.length} relationship(s) will be
            created
          </div>
        )}
    </div>
  );
}

/**
 * Render update proposal content with diff
 */
function UpdateProposalContent({ proposal }: { proposal: UpdateProposal }) {
  return (
    <div className="space-y-2 text-sm">
      {Object.entries(proposal.changes).map(([key, newValue]) => {
        const oldValue = proposal.currentData?.[key];
        const oldDisplay =
          oldValue !== undefined
            ? String(oldValue).slice(0, 40) +
              (String(oldValue).length > 40 ? "..." : "")
            : "(empty)";
        const newDisplay =
          String(newValue).slice(0, 40) +
          (String(newValue).length > 40 ? "..." : "");

        return (
          <div key={key} className="space-y-0.5">
            <span className="text-muted-foreground">{formatEntityType(key)}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-red-500/80 line-through">{oldDisplay}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-green-500/80">{newDisplay}</span>
            </div>
          </div>
        );
      })}
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
              <Button variant="ghost" size="sm" className="h-auto p-0 gap-1 text-xs">
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
