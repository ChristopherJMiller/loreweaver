/**
 * ExpansionPopover
 *
 * Floating popover that appears when text is selected in the editor.
 * Allows users to choose an expansion type and preview/accept the result.
 */

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        {/* Type Selection */}
        {(state === "idle" || state === "selecting") && (
          <div className="p-2">
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
                    "transition-colors"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            {hoveredType && (
              <div className="mt-2 px-2 py-1.5 text-xs text-muted-foreground border-t">
                {EXPANSION_TYPE_DESCRIPTIONS[hoveredType]}
              </div>
            )}
          </div>
        )}

        {/* Expanding State */}
        {state === "expanding" && (
          <div className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Expanding...</span>
            </div>
            {previewText && (
              <div className="text-sm bg-muted/50 rounded-md p-2 max-h-40 overflow-y-auto">
                <span className="text-primary">{previewText}</span>
                <span className="animate-pulse">|</span>
              </div>
            )}
          </div>
        )}

        {/* Preview State */}
        {state === "previewing" && previewText && (
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Preview
            </div>
            <div className="text-sm bg-muted/50 rounded-md p-2 max-h-48 overflow-y-auto mb-3">
              {previewText}
            </div>
            <div className="flex gap-2">
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
            </div>
          </div>
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
      onClick={onClick}
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
