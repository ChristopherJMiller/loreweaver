/**
 * AI Chat Panel
 *
 * A collapsible panel for interacting with the AI assistant.
 * Supports chat messages, tool usage display, agent execution, and proposals.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatMessageListHandle } from "./ChatMessageList";
import { useLocation } from "react-router-dom";
import { PanelRightClose, Trash2, Sparkles, Loader2 } from "lucide-react";
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
import { PendingApprovalsButton } from "./PendingApprovalsButton";
import { useUIStore, useChatStore, useCampaignStore } from "@/stores";
import { useAIAvailable } from "@/stores/aiStore";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useProposalHandler } from "@/hooks/useProposalHandler";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";
import { isRelationshipProposal } from "@/ai/tools/entity-proposals/types";

export function AIChatPanel() {
  const location = useLocation();
  const aiChatOpen = useUIStore((state) => state.aiChatOpen);
  const toggleAIChat = useUIStore((state) => state.toggleAIChat);

  // Hide panel when on the full chat page
  const isOnChatPage = location.pathname === "/chat";

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
  const thinkingActive = useChatStore((state) => state.thinkingActive);

  const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
  const isAvailable = useAIAvailable();
  const { sendMessage } = useAgentChat();

  const [input, setInput] = useState("");
  const [editingProposal, setEditingProposal] = useState<EntityProposal | null>(
    null
  );
  const [shouldFocus, setShouldFocus] = useState(false);
  const previousOpenRef = useRef(aiChatOpen);
  const messageListRef = useRef<ChatMessageListHandle>(null);

  // Handle jumping to a proposal from the pending approvals button
  const handleJumpToProposal = useCallback((messageId: string) => {
    messageListRef.current?.scrollToMessage(messageId);
  }, []);

  // Track when panel opens to trigger focus
  useEffect(() => {
    if (aiChatOpen && !previousOpenRef.current) {
      setShouldFocus(true);
    }
    previousOpenRef.current = aiChatOpen;
  }, [aiChatOpen]);

  // Reset focus trigger after it's been used
  useEffect(() => {
    if (shouldFocus) {
      const timer = setTimeout(() => setShouldFocus(false), 100);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  // Load conversation when panel opens or campaign changes
  useEffect(() => {
    if (aiChatOpen && activeCampaignId) {
      loadConversation(activeCampaignId, "sidebar");
    }
  }, [aiChatOpen, activeCampaignId, loadConversation]);

  // Proposal handler
  const { acceptProposal, rejectProposal, isProcessing: isProcessingProposal } =
    useProposalHandler({
      campaignId: activeCampaignId ?? "",
      onAccepted: async (proposalId) => {
        await updateProposalStatus(proposalId, "accepted");
        setEditingProposal(null);
      },
      onRejected: async (proposalId) => {
        await updateProposalStatus(proposalId, "rejected");
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
    async (proposalId: string) => {
      rejectProposal(proposalId);
      await updateProposalStatus(proposalId, "rejected");
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

  // Don't show the sidebar panel on the full chat page or when closed
  if (!aiChatOpen || isOnChatPage) {
    return null;
  }

  return (
    <aside className="flex w-80 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <PendingApprovalsButton onJumpToProposal={handleJumpToProposal} compact />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearMessages}
                disabled={(messages.length === 0 && sessionInputTokens === 0) || isRunning}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear chat</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleAIChat}
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ChatMessageList
          ref={messageListRef}
          messages={messages}
          isRunning={isRunning}
          isAvailable={isAvailable}
          streamingMessageId={streamingMessageId}
          onAcceptProposal={handleAcceptProposal}
          onRejectProposal={handleRejectProposal}
          onEditProposal={handleEditProposal}
          isProcessingProposal={isProcessingProposal}
          thinkingActive={thinkingActive}
        />
      )}

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onCancel={cancelOperation}
        isRunning={isRunning}
        isAvailable={isAvailable}
        activeCampaignId={activeCampaignId}
        isLoading={isLoading}
        autoFocus={shouldFocus}
        className="border-t p-3"
      />

      {/* Cost Footer */}
      <ChatCostFooter />

      {/* Proposal Edit Dialog */}
      <ProposalEditDialog
        proposal={editingProposal}
        open={editingProposal !== null}
        onOpenChange={(open) => {
          if (!open) setEditingProposal(null);
        }}
        onSave={handleSaveEditedProposal}
      />
    </aside>
  );
}
