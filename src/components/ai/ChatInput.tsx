/**
 * Shared Chat Input Component
 *
 * Reusable input component for both AIChatPanel and AIFullPageChat.
 * Includes textarea, send/stop button, and campaign selection warning.
 */

import { useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isRunning: boolean;
  isAvailable: boolean;
  activeCampaignId: string | null;
  /** Whether conversation is being loaded from database */
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  isRunning,
  isAvailable,
  activeCampaignId,
  isLoading = false,
  placeholder,
  autoFocus = false,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isRunning || isLoading || !activeCampaignId) return;
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const defaultPlaceholder = isAvailable
    ? "Ask about your campaign..."
    : "Configure API key first";

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          disabled={!isAvailable || isRunning || isLoading || !activeCampaignId}
          className="min-h-[60px] max-h-[120px] resize-none text-sm"
          rows={2}
        />
        {isRunning ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="shrink-0"
            onClick={onCancel}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!value.trim() || !isAvailable || isLoading || !activeCampaignId}
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
  );
}
