/**
 * Pending Approvals Button Component
 *
 * Shows a button with count of pending proposals.
 * Opens a popover listing all pending proposals with quick navigation.
 */

import { useMemo, useCallback, useState } from "react";
import { ClipboardList, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatStore } from "@/stores";
import type { ChatMessage } from "@/stores";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";
import { formatEntityType } from "./ProposalCard";

interface PendingApprovalsButtonProps {
  /** Callback when user clicks to jump to a proposal */
  onJumpToProposal: (messageId: string) => void;
  /** Compact mode for sidebar (icon only with badge) */
  compact?: boolean;
}

/**
 * Generate summary text for a proposal
 */
function getProposalSummary(proposal: EntityProposal): { title: string; subtitle?: string } {
  if (proposal.operation === "create") {
    return {
      title: proposal.data.name,
      subtitle: formatEntityType(proposal.entityType),
    };
  } else if (proposal.operation === "update") {
    const fields = Object.keys(proposal.changes).slice(0, 2).join(", ");
    const more = Object.keys(proposal.changes).length > 2 ? "..." : "";
    return {
      title: `${fields}${more}`,
      subtitle: formatEntityType(proposal.entityType),
    };
  } else if (proposal.operation === "patch") {
    const fields = proposal.patches.map((p) => p.field).slice(0, 2).join(", ");
    const more = proposal.patches.length > 2 ? "..." : "";
    return {
      title: `Patch: ${fields}${more}`,
      subtitle: formatEntityType(proposal.entityType),
    };
  } else {
    return {
      title: `${proposal.sourceName} → ${proposal.targetName}`,
      subtitle: proposal.relationshipType,
    };
  }
}

/**
 * Individual item in the pending proposals dropdown
 */
function PendingProposalItem({
  message,
  onClick,
}: {
  message: ChatMessage & { proposal: EntityProposal };
  onClick: () => void;
}) {
  const { proposal } = message;
  const { title, subtitle } = useMemo(() => getProposalSummary(proposal), [proposal]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className="text-[10px] shrink-0 capitalize px-1.5 py-0">
          {proposal.operation === "relationship" ? "link" : proposal.operation}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );
}

export function PendingApprovalsButton({
  onJumpToProposal,
  compact = false,
}: PendingApprovalsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const messages = useChatStore((state) => state.messages);

  // Get all pending proposal messages
  const pendingProposals = useMemo(() => {
    return messages.filter(
      (msg): msg is ChatMessage & { proposal: EntityProposal } =>
        msg.role === "proposal" && msg.proposal?.status === "pending"
    );
  }, [messages]);

  const count = pendingProposals.length;

  const handleJump = useCallback(
    (messageId: string) => {
      onJumpToProposal(messageId);
      setIsOpen(false);
    },
    [onJumpToProposal]
  );

  // Don't render if no pending proposals
  if (count === 0) return null;

  // Compact mode for sidebar
  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 relative">
                <ClipboardList className="h-3.5 w-3.5" />
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
                >
                  {count}
                </Badge>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {count} pending approval{count !== 1 && "s"}
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Pending Approvals</h4>
            <p className="text-xs text-muted-foreground">
              Click to jump to proposal
            </p>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2 space-y-0.5">
            {pendingProposals.map((msg) => (
              <PendingProposalItem
                key={msg.id}
                message={msg}
                onClick={() => handleJump(msg.id)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full mode for main chat
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          <span>
            {count} pending
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Pending Approvals</h4>
          <p className="text-xs text-muted-foreground">
            Click to jump to proposal
          </p>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2 space-y-0.5">
          {pendingProposals.map((msg) => (
            <PendingProposalItem
              key={msg.id}
              message={msg}
              onClick={() => handleJump(msg.id)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
