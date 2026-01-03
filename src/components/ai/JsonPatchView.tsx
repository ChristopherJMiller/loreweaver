/**
 * JSON Patch View Component
 *
 * Renders RFC 6902 JSON Patch operations in a readable format.
 */

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonPatchViewProps {
  /** The JSON patch string (array of operations) */
  patch: string;
  /** Current value for context (optional) */
  currentValue?: unknown;
  /** Maximum height before scrolling (default: 200px) */
  maxHeight?: number;
}

interface PatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

/**
 * Parse JSON patch string into operations
 */
function parsePatch(patch: string): PatchOperation[] | null {
  try {
    const parsed = JSON.parse(patch);
    if (!Array.isArray(parsed)) return null;
    return parsed as PatchOperation[];
  } catch {
    return null;
  }
}

/**
 * Format a JSON value for display
 */
function formatValue(value: unknown): string {
  if (value === undefined) return "(undefined)";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") {
    const json = JSON.stringify(value, null, 2);
    return json.length > 100 ? JSON.stringify(value) : json;
  }
  return String(value);
}

/**
 * Get operation badge variant
 */
function getOperationVariant(
  op: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (op) {
    case "add":
      return "default";
    case "remove":
      return "destructive";
    case "replace":
      return "secondary";
    default:
      return "outline";
  }
}

export function JsonPatchView({
  patch,
  maxHeight = 200,
}: JsonPatchViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const operations = useMemo(() => parsePatch(patch), [patch]);

  // If parsing failed, show raw patch
  if (!operations) {
    return (
      <div className="font-mono text-xs bg-muted/50 p-2 rounded overflow-x-auto">
        <pre className="whitespace-pre-wrap break-words">{patch}</pre>
      </div>
    );
  }

  const needsExpansion = operations.length > 5;

  return (
    <div className="space-y-2">
      <ScrollArea
        className={cn(
          "rounded border bg-muted/30",
          isExpanded ? "" : `max-h-[${maxHeight}px]`
        )}
        style={{ maxHeight: isExpanded ? "none" : maxHeight }}
      >
        <div className="p-2 space-y-2">
          {operations.map((op, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1 p-2 rounded bg-background/50 text-sm"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={getOperationVariant(op.op)}
                  className="text-xs uppercase"
                >
                  {op.op}
                </Badge>
                <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                  {op.path}
                </code>
                {op.from && (
                  <>
                    <span className="text-xs text-muted-foreground">from</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                      {op.from}
                    </code>
                  </>
                )}
              </div>
              {op.value !== undefined && (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">Value: </span>
                  <code className="text-xs font-mono break-all">
                    {formatValue(op.value)}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {needsExpansion && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseDown={(e) => e.preventDefault()}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show fewer operations
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show all {operations.length} operations
            </>
          )}
        </Button>
      )}
    </div>
  );
}
