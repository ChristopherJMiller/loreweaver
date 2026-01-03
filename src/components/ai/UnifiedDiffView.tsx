/**
 * Unified Diff View Component
 *
 * Renders a unified diff with syntax highlighting for added/removed lines.
 */

import { useMemo, useState } from "react";
import { parsePatch } from "diff";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedDiffViewProps {
  /** The unified diff patch string */
  patch: string;
  /** Maximum height before scrolling (default: 200px) */
  maxHeight?: number;
}

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

type ParsedDiffResult = ReturnType<typeof parsePatch>;

/**
 * Parse the unified diff and extract hunks
 */
function parseUnifiedDiff(patch: string): ParsedDiffResult {
  try {
    return parsePatch(patch);
  } catch {
    // If parsing fails, return empty array
    return [];
  }
}

export function UnifiedDiffView({
  patch,
  maxHeight = 200,
}: UnifiedDiffViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const parsed = useMemo(() => parseUnifiedDiff(patch), [patch]);

  // If parsing failed, show raw patch
  if (parsed.length === 0 || !parsed[0]?.hunks) {
    return (
      <div className="font-mono text-xs bg-muted/50 p-2 rounded overflow-x-auto">
        <pre className="whitespace-pre-wrap break-words">{patch}</pre>
      </div>
    );
  }

  const hunks = parsed[0].hunks as DiffHunk[];
  const totalLines = hunks.reduce((acc, h) => acc + h.lines.length + 1, 0);
  const needsExpansion = totalLines > 10;

  return (
    <div className="space-y-2">
      <ScrollArea
        className={cn(
          "rounded border bg-muted/30",
          isExpanded ? "" : `max-h-[${maxHeight}px]`
        )}
        style={{ maxHeight: isExpanded ? "none" : maxHeight }}
      >
        <div className="font-mono text-xs p-2">
          {hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx} className="mb-3 last:mb-0">
              {/* Hunk header */}
              <div className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-t text-[11px]">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},
                {hunk.newLines} @@
              </div>
              {/* Hunk lines */}
              <div className="border-l-2 border-muted">
                {hunk.lines.map((line, lineIdx) => {
                  const isRemoval = line.startsWith("-");
                  const isAddition = line.startsWith("+");

                  return (
                    <div
                      key={lineIdx}
                      className={cn(
                        "px-2 py-0.5 whitespace-pre-wrap break-all",
                        isRemoval &&
                          "bg-red-500/10 text-red-600 dark:text-red-400",
                        isAddition &&
                          "bg-green-500/10 text-green-600 dark:text-green-400",
                        !isRemoval && !isAddition && "text-muted-foreground"
                      )}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
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
              Collapse diff
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Expand full diff
            </>
          )}
        </Button>
      )}
    </div>
  );
}
