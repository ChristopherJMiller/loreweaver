/**
 * AI Full Page Chat
 *
 * A full-page ChatGPT-like experience for focused AI conversations.
 * Renders inside AppShell with sidebar visible.
 */

import { useState, useCallback, useEffect } from "react";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ChatCostFooter } from "./ChatCostFooter";
import { ProposalEditDialog } from "./ProposalEditDialog";
import { useChatStore, useCampaignStore } from "@/stores";
import { useAIAvailable } from "@/stores/aiStore";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useProposalHandler } from "@/hooks/useProposalHandler";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";
import { isRelationshipProposal } from "@/ai/tools/entity-proposals/types";

export function AIFullPageChat() {
  // Use individual selectors to prevent unnecessary re-renders
  const messages = useChatStore((state) => state.messages);
  const isRunning = useChatStore((state) => state.isRunning);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const streamingMessageId = useChatStore((state) => state.streamingMessageId);
  const updateProposalStatus = useChatStore(
    (state) => state.updateProposalStatus
  );
  const cancelOperation = useChatStore((state) => state.cancelOperation);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const isLoading = useChatStore((state) => state.isLoading);
  const sessionInputTokens = useChatStore((state) => state.sessionInputTokens);

  const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
  const isAvailable = useAIAvailable();
  const { sendMessage } = useAgentChat();

  const [input, setInput] = useState("");
  const [editingProposal, setEditingProposal] = useState<EntityProposal | null>(
    null
  );

  // Load conversation when component mounts or campaign changes
  useEffect(() => {
    if (activeCampaignId) {
      loadConversation(activeCampaignId, "fullpage");
    }
  }, [activeCampaignId, loadConversation]);

  // Proposal handler
  const { acceptProposal, rejectProposal, isProcessing: isProcessingProposal } =
    useProposalHandler({
      campaignId: activeCampaignId ?? "",
      onAccepted: (proposalId) => {
        updateProposalStatus(proposalId, "accepted");
        setEditingProposal(null);
      },
      onRejected: (proposalId) => {
        updateProposalStatus(proposalId, "rejected");
      },
    });

  // Handle accepting a proposal (direct or from edit dialog)
  const handleAcceptProposal = useCallback(
    (proposal: EntityProposal, editedData?: Record<string, unknown>) => {
      acceptProposal(proposal, editedData);
    },
    [acceptProposal]
  );

  // Handle rejecting a proposal
  const handleRejectProposal = useCallback(
    (proposalId: string) => {
      rejectProposal(proposalId);
      updateProposalStatus(proposalId, "rejected");
    },
    [rejectProposal, updateProposalStatus]
  );

  // Handle opening edit dialog
  const handleEditProposal = useCallback((proposal: EntityProposal) => {
    // Can't edit relationship proposals
    if (isRelationshipProposal(proposal)) return;
    setEditingProposal(proposal);
  }, []);

  // Handle saving edited proposal
  const handleSaveEditedProposal = useCallback(
    (editedData: Record<string, unknown>) => {
      if (editingProposal) {
        handleAcceptProposal(editingProposal, editedData);
      }
    },
    [editingProposal, handleAcceptProposal]
  );

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isRunning || !activeCampaignId) return;

    setInput("");
    await sendMessage(trimmed, activeCampaignId);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Loreweaver</h1>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={clearMessages}
              disabled={(messages.length === 0 && sessionInputTokens === 0) || isRunning}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Chat
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear conversation history</TooltipContent>
        </Tooltip>
      </div>

      {/* Messages Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ChatMessageList
                messages={messages}
                isRunning={isRunning}
                isAvailable={isAvailable}
                streamingMessageId={streamingMessageId}
                onAcceptProposal={handleAcceptProposal}
                onRejectProposal={handleRejectProposal}
                onEditProposal={handleEditProposal}
                isProcessingProposal={isProcessingProposal}
                emptyStateMessage="Welcome to Loreweaver"
                emptyStateDescription="Ask me anything about your campaign. I can search entities, explore relationships, create new content, and help with worldbuilding."
                className="min-h-full"
              />
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onCancel={cancelOperation}
              isRunning={isRunning}
              isAvailable={isAvailable}
              activeCampaignId={activeCampaignId}
              isLoading={isLoading}
              autoFocus
              className="w-full"
            />
          </div>
          <ChatCostFooter className="mx-auto max-w-3xl border-t-0 text-center" />
        </div>
      </div>

      {/* Proposal Edit Dialog */}
      <ProposalEditDialog
        proposal={editingProposal}
        open={editingProposal !== null}
        onOpenChange={(open) => {
          if (!open) setEditingProposal(null);
        }}
        onSave={handleSaveEditedProposal}
      />
    </div>
  );
}
