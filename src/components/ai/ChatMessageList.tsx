/**
 * Shared Chat Message List Component
 *
 * Reusable component for rendering chat messages.
 * Includes MessageBubble, empty states, and loading indicator.
 */

import { useRef, useEffect, memo } from "react";
import { Bot, Loader2, AlertCircle } from "lucide-react";
import { MessageContent } from "./MessageContent";
import { ToolResultCard } from "./ToolResultCard";
import { ProposalCard } from "./ProposalCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/stores";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onAcceptProposal?: (proposal: EntityProposal) => void;
  onRejectProposal?: (proposalId: string) => void;
  onEditProposal?: (proposal: EntityProposal) => void;
  isProcessingProposal?: boolean;
}

const MessageBubble = memo(function MessageBubble({
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
  const isAssistant = message.role === "assistant";

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

  // Render tool result with smart card display
  if (isTool && message.toolName) {
    return (
      <div className="w-full">
        <ToolResultCard
          toolName={message.toolName}
          content={message.content}
          data={message.toolData}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : isError
              ? "bg-destructive text-destructive-foreground"
              : "bg-accent text-accent-foreground"
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium">You</span>
        ) : isError ? (
          <AlertCircle className="h-3 w-3" />
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
              : "bg-muted"
        )}
      >
        {isUser || isError ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : isAssistant ? (
          <MessageContent
            content={message.content}
            className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse" />
        )}
      </div>
    </div>
  );
})

export interface ChatMessageListProps {
  messages: ChatMessage[];
  isRunning: boolean;
  isAvailable: boolean;
  streamingMessageId: string | null;
  onAcceptProposal: (proposal: EntityProposal) => void;
  onRejectProposal: (proposalId: string) => void;
  onEditProposal: (proposal: EntityProposal) => void;
  isProcessingProposal: boolean;
  className?: string;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
}

export function ChatMessageList({
  messages,
  isRunning,
  isAvailable,
  streamingMessageId,
  onAcceptProposal,
  onRejectProposal,
  onEditProposal,
  isProcessingProposal,
  className,
  emptyStateMessage = "Ask me about your campaign",
  emptyStateDescription = "I can search entities, check relationships, and help with worldbuilding",
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
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
            <p>{emptyStateMessage}</p>
            <p className="text-xs mt-1">{emptyStateDescription}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={msg.id === streamingMessageId}
              onAcceptProposal={onAcceptProposal}
              onRejectProposal={onRejectProposal}
              onEditProposal={onEditProposal}
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
  );
}
