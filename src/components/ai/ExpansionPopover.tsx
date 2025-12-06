/**
 * ExpansionPopover
 *
 * Floating popover that appears when text is selected in the editor.
 * Allows users to choose an expansion type and preview/accept the result.
 * Renders markdown preview with proper formatting.
 */

import { useState, useMemo } from "react";
import { marked } from "marked";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Sparkles,
  BookOpen,
  Eye,
  FileText,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXPANSION_TYPE_LABELS,
  EXPANSION_TYPE_DESCRIPTIONS,
  type ExpansionType,
} from "@/ai/agents/expander";

/**
 * Configure marked for safe rendering
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Renders markdown content with proper styling
 */
function MarkdownPreview({ content, streaming = false }: { content: string; streaming?: boolean }) {
  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  return (
    <div className="relative">
      <div
        className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {streaming && (
        <span className="absolute bottom-0 inline-block w-0.5 h-4 bg-primary animate-pulse" />
      )}
    </div>
  );
}

interface ExpansionPopoverProps {
  /** Whether the popover is open */
  open: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;

  /** Whether expansion is in progress */
  isExpanding: boolean;

  /** Current state: selecting type, expanding, or previewing */
  state: "idle" | "selecting" | "expanding" | "previewing" | "error";

  /** Preview text (expanded content) */
  previewText: string | null;

  /** Original selected text */
  originalText: string | null;

  /** Error message if expansion failed */
  error: string | null;

  /** Callback when user selects an expansion type */
  onExpand: (type: ExpansionType) => void;

  /** Callback when user accepts the expansion */
  onAccept: () => void;

  /** Callback when user rejects the expansion */
  onReject: () => void;

  /** The trigger element (floating button) */
  children: React.ReactNode;
}

const EXPANSION_TYPES: {
  type: ExpansionType;
  icon: React.ReactNode;
  label: string;
  description: string;
}[] = [
  {
    type: "detail",
    icon: <FileText className="h-4 w-4" />,
    label: EXPANSION_TYPE_LABELS.detail,
    description: EXPANSION_TYPE_DESCRIPTIONS.detail,
  },
  {
    type: "backstory",
    icon: <BookOpen className="h-4 w-4" />,
    label: EXPANSION_TYPE_LABELS.backstory,
    description: EXPANSION_TYPE_DESCRIPTIONS.backstory,
  },
  {
    type: "sensory",
    icon: <Eye className="h-4 w-4" />,
    label: EXPANSION_TYPE_LABELS.sensory,
    description: EXPANSION_TYPE_DESCRIPTIONS.sensory,
  },
  {
    type: "gm_notes",
    icon: <Sparkles className="h-4 w-4" />,
    label: EXPANSION_TYPE_LABELS.gm_notes,
    description: EXPANSION_TYPE_DESCRIPTIONS.gm_notes,
  },
];

export function ExpansionPopover({
  open,
  onOpenChange,
  isExpanding: _isExpanding,
  state,
  previewText,
  originalText: _originalText,
  error,
  onExpand,
  onAccept,
  onReject,
  children,
}: ExpansionPopoverProps) {
  const [hoveredType, setHoveredType] = useState<ExpansionType | null>(null);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span>{children}</span>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0 shadow-lg",
          // Wider for markdown rendering during expanding/previewing
          state === "expanding" || state === "previewing" ? "w-[480px]" : "w-96"
        )}
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e?.preventDefault?.()}
        onCloseAutoFocus={(e) => e?.preventDefault?.()}
      >
        {/* Type Selection */}
        {(state === "idle" || state === "selecting") && (
          <div className="p-2 flex gap-2">
            <div className="flex-shrink-0">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Expand with AI
              </div>
              <div className="space-y-1">
                {EXPANSION_TYPES.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => onExpand(item.type)}
                    onMouseEnter={() => setHoveredType(item.type)}
                    onMouseLeave={() => setHoveredType(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      "transition-colors",
                      hoveredType === item.type && "bg-accent text-accent-foreground"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 border-l pl-2 min-w-[140px]">
              <div className="text-xs text-muted-foreground h-full flex items-center">
                {hoveredType ? (
                  EXPANSION_TYPE_DESCRIPTIONS[hoveredType]
                ) : (
                  <span className="italic">Hover for details</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expanding State */}
        {state === "expanding" && (
          <Card className="border-0 shadow-none">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Expanding...</span>
              </div>
            </CardHeader>
            {previewText && (
              <CardContent className="px-4 pb-4 pt-0">
                <div className="max-h-64 overflow-y-auto rounded-md bg-muted/30 p-3">
                  <MarkdownPreview content={previewText} streaming />
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Preview State */}
        {state === "previewing" && previewText && (
          <Card className="border-0 shadow-none">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Preview</span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="max-h-72 overflow-y-auto rounded-md bg-muted/30 p-3">
                <MarkdownPreview content={previewText} />
              </div>
            </CardContent>
            <CardFooter className="px-4 pb-4 pt-0 gap-2">
              <Button
                size="sm"
                onClick={onAccept}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="p-4">
            <div className="text-sm text-destructive mb-3">
              {error || "Expansion failed"}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Floating expand button that triggers the popover
 */
interface ExpandButtonProps {
  onClick: () => void;
  className?: string;
}

export function ExpandButton({ onClick, className }: ExpandButtonProps) {
  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={(e) => {
        console.log("[ExpandButton] clicked");
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => {
        // Prevent the editor from losing focus when clicking the button
        console.log("[ExpandButton] mousedown - preventing default");
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "h-7 w-7 rounded-full shadow-md",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
      title="Expand with AI (Cmd+Shift+E)"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}
