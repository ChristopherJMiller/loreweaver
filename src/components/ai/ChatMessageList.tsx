/**
 * Shared Chat Message List Component
 *
 * Reusable component for rendering chat messages.
 * Includes MessageBubble, empty states, and loading indicator.
 */

import { useRef, useEffect, memo, forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { Bot, Loader2, AlertCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageContent } from "./MessageContent";
import { ToolResultCard } from "./ToolResultCard";
import { ProposalCard } from "./ProposalCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/stores";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";

/**
 * Fallback labels for ephemeral indicators when AI doesn't provide flavor
 */
const EPHEMERAL_FALLBACK_LABELS: Record<string, string> = {
  search_entities: "Searching...",
  get_entity: "Looking up details...",
  get_relationships: "Finding connections...",
  get_location_hierarchy: "Mapping locations...",
  get_timeline: "Checking timeline...",
  get_campaign_context: "Getting overview...",
};

/**
 * Ephemeral indicator shown while read tools are executing
 */
function EphemeralIndicator({
  toolName,
  flavor,
  isFading,
}: {
  toolName: string;
  flavor?: string;
  isFading: boolean;
}) {
  const label = flavor || EPHEMERAL_FALLBACK_LABELS[toolName] || "Working...";

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground py-1.5 px-3",
        "transition-opacity duration-300 ease-out",
        isFading ? "opacity-0" : "opacity-100"
      )}
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="italic">{label}</span>
    </div>
  );
}

/**
 * Thinking indicator with bouncing dots (for internal tools)
 */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2 px-3">
      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
    </div>
  );
}

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
  // Handle ephemeral/fading indicators (read tools loading state)
  if (message.displayMode === "ephemeral" || message.displayMode === "fading") {
    return (
      <EphemeralIndicator
        toolName={message.toolName || ""}
        flavor={message.flavor}
        isFading={message.displayMode === "fading"}
      />
    );
  }

  // Hide internal tool messages entirely (work items)
  if (message.toolCategory === "internal") {
    return null;
  }

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
  /** Whether internal tool thinking indicator should show */
  thinkingActive?: boolean;
}

/**
 * Ref handle for ChatMessageList
 */
export interface ChatMessageListHandle {
  /** Scroll to a specific message by ID */
  scrollToMessage: (messageId: string) => void;
}

export const ChatMessageList = forwardRef<ChatMessageListHandle, ChatMessageListProps>(
  function ChatMessageList(
    {
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
      thinkingActive = false,
    },
    ref
  ) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);

    // Scroll state for sticky behavior
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewContent, setHasNewContent] = useState(false);
    const prevMessagesLengthRef = useRef(messages.length);
    const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "at bottom"

    // Get the Radix ScrollArea viewport element on mount
    useEffect(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewportRef.current = viewport as HTMLDivElement;
          // Initial scroll to bottom
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, []);

    // Check if scrolled to bottom
    const checkIfAtBottom = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) return true;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    }, []);

    // Track scroll position
    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const handleScroll = () => {
        setIsAtBottom(checkIfAtBottom());
      };

      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }, [checkIfAtBottom]);

    // Track when new content arrives while scrolled up
    useEffect(() => {
      if (messages.length > prevMessagesLengthRef.current && !isAtBottom) {
        setHasNewContent(true);
      }
      prevMessagesLengthRef.current = messages.length;
    }, [messages.length, isAtBottom]);

    // Reset hasNewContent when user scrolls to bottom
    useEffect(() => {
      if (isAtBottom) {
        setHasNewContent(false);
      }
    }, [isAtBottom]);

    // Only auto-scroll if already at bottom
    useEffect(() => {
      if (isAtBottom && viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    }, [messages, isAtBottom]);

    // Scroll to bottom handler
    const scrollToBottom = useCallback(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({
          top: viewportRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, []);

    // Expose scroll methods via ref
    useImperativeHandle(ref, () => ({
      scrollToMessage: (messageId: string) => {
        const container = containerRef.current;
        if (!container) return;

        const element = container.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "instant", block: "center" });
          // Add highlight animation
          element.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-lg");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-lg");
          }, 2000);
        }
      },
    }));

    return (
      <div className={cn("relative h-full", className)}>
        <ScrollArea className="h-full" ref={scrollRef}>
          <div ref={containerRef} className="flex flex-col gap-3 p-3">
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
                <div key={msg.id} data-message-id={msg.id} className="transition-all duration-300">
                  <MessageBubble
                    message={msg}
                    isStreaming={msg.id === streamingMessageId}
                    onAcceptProposal={onAcceptProposal}
                    onRejectProposal={onRejectProposal}
                    onEditProposal={onEditProposal}
                    isProcessingProposal={isProcessingProposal}
                  />
                </div>
              ))
            )}

            {/* Show thinking dots for internal tools or general thinking state */}
            {(thinkingActive || (isRunning && !streamingMessageId)) && (
              <ThinkingDots />
            )}
          </div>
        </ScrollArea>

        {/* Jump to latest button */}
        {!isAtBottom && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg gap-1"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-3 w-3" />
              {hasNewContent ? 'New messages' : 'Jump to latest'}
            </Button>
          </div>
        )}
      </div>
    );
  }
);
