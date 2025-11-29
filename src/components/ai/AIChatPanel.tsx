/**
 * AI Chat Panel
 *
 * A collapsible panel for interacting with the AI assistant.
 * Supports chat messages, tool usage display, agent execution, and proposals.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { marked } from "marked";
import {
  Bot,
  Send,
  PanelRightClose,
  Trash2,
  Loader2,
  Wrench,
  AlertCircle,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUIStore, useChatStore, useCampaignStore } from "@/stores";
import { useAIAvailable } from "@/stores/aiStore";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useProposalHandler } from "@/hooks/useProposalHandler";
import { ProposalCard } from "./ProposalCard";
import { ProposalEditDialog } from "./ProposalEditDialog";
import type { ChatMessage } from "@/stores";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";
import { isRelationshipProposal } from "@/ai/tools/entity-proposals/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onAcceptProposal?: (proposal: EntityProposal) => void;
  onRejectProposal?: (proposalId: string) => void;
  onEditProposal?: (proposal: EntityProposal) => void;
  isProcessingProposal?: boolean;
}

function MessageBubble({
  message,
  isStreaming,
  onAcceptProposal,
  onRejectProposal,
  onEditProposal,
  isProcessingProposal,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isError = message.role === "error";
  const isProposal = message.role === "proposal";

  // Render proposal card for proposal messages
  if (isProposal && message.proposal) {
    return (
      <div className="w-full">
        <ProposalCard
          proposal={message.proposal}
          onAccept={onAcceptProposal ?? (() => {})}
          onReject={onRejectProposal ?? (() => {})}
          onEdit={onEditProposal ?? (() => {})}
          isProcessing={isProcessingProposal}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : isError
              ? "bg-destructive text-destructive-foreground"
              : isTool
                ? "bg-muted text-muted-foreground"
                : "bg-accent text-accent-foreground"
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium">You</span>
        ) : isError ? (
          <AlertCircle className="h-3 w-3" />
        ) : isTool ? (
          <Wrench className="h-3 w-3" />
        ) : (
          <Bot className="h-3 w-3" />
        )}
      </div>

      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : isError
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : isTool
                ? "bg-muted/50 border border-border"
                : "bg-muted"
        )}
      >
        {isTool && message.toolName && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {message.toolName}
          </span>
        )}
        {isUser || isTool || isError ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2"
            dangerouslySetInnerHTML={{
              __html: marked.parse(message.content) as string,
            }}
          />
        )}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const { aiChatOpen, toggleAIChat } = useUIStore();
  const { messages, isRunning, clearMessages, streamingMessageId, updateProposalStatus, cancelOperation } =
    useChatStore();
  const { activeCampaignId } = useCampaignStore();
  const isAvailable = useAIAvailable();
  const { sendMessage } = useAgentChat();

  const [input, setInput] = useState("");
  const [editingProposal, setEditingProposal] = useState<EntityProposal | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (aiChatOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [aiChatOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isRunning || !activeCampaignId) return;

    setInput("");
    await sendMessage(trimmed, activeCampaignId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!aiChatOpen) {
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearMessages}
                disabled={messages.length === 0 || isRunning}
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
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col gap-3 p-3">
          {!isAvailable ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p>API key not configured</p>
              <p className="text-xs mt-1">
                Go to Settings to add your Anthropic API key
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <Bot className="mb-2 h-8 w-8" />
              <p>Ask me about your campaign</p>
              <p className="text-xs mt-1">
                I can search entities, check relationships, and help with worldbuilding
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={msg.id === streamingMessageId}
                onAcceptProposal={handleAcceptProposal}
                onRejectProposal={handleRejectProposal}
                onEditProposal={handleEditProposal}
                isProcessingProposal={isProcessingProposal}
              />
            ))
          )}

          {isRunning && !streamingMessageId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAvailable
                ? "Ask about your campaign..."
                : "Configure API key first"
            }
            disabled={!isAvailable || isRunning || !activeCampaignId}
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            rows={2}
          />
          {isRunning ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="shrink-0"
              onClick={cancelOperation}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || !isAvailable || !activeCampaignId}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!activeCampaignId && (
          <p className="mt-2 text-xs text-muted-foreground">
            Select a campaign to start chatting
          </p>
        )}
      </form>

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
