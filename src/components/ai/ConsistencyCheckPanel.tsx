/**
 * Consistency Check Panel Component
 *
 * Displays consistency check results with issues list and overall score.
 * Used in a sheet/dialog to show consistency checking results.
 */

import { useState, useMemo } from "react";
import { marked } from "marked";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConsistencyIssueCard } from "./ConsistencyIssueCard";
import type {
  ConsistencyCheckResult,
  ConsistencyIssue,
  PartialConsistencyResult,
} from "@/ai/agents/consistency-checker/types";

// Configure marked for inline rendering (no extra paragraph wrapping for simple text)
marked.use({
  breaks: true,
});

interface ConsistencyCheckPanelProps {
  /** The consistency check result to display */
  result?: ConsistencyCheckResult;

  /** Partial result while streaming */
  partialResult?: PartialConsistencyResult;

  /** Whether the check is currently running */
  isChecking?: boolean;

  /** Current tool being used (for progress display) */
  currentTool?: string;

  /** Callback when user dismisses the panel */
  onDismiss?: () => void;

  /** Callback when user wants to navigate to an entity */
  onNavigateToEntity?: (entityType: string, entityId: string) => void;
}

/**
 * Get score color class based on score value
 */
function getScoreColorClass(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  return "text-destructive";
}

/**
 * Get score background class based on score value
 */
function getScoreBgClass(score: number): string {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/30";
  return "bg-destructive/10 border-destructive/30";
}

/**
 * Count issues by severity
 */
function countBySeverity(issues: ConsistencyIssue[]): {
  errors: number;
  warnings: number;
  suggestions: number;
} {
  return issues.reduce(
    (acc, issue) => {
      if (issue.severity === "error") acc.errors++;
      else if (issue.severity === "warning") acc.warnings++;
      else acc.suggestions++;
      return acc;
    },
    { errors: 0, warnings: 0, suggestions: 0 }
  );
}

/**
 * Renders reasoning text with markdown formatting
 */
function MarkdownReasoning({ content }: { content: string }) {
  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  return (
    <div
      className="max-h-40 overflow-y-auto prose prose-xs dark:prose-invert max-w-none p-3 text-muted-foreground bg-muted/50 rounded [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Loading state while checking - shows partial results as they stream
 */
function CheckingState({
  currentTool,
  partialResult,
}: {
  currentTool?: string;
  partialResult?: PartialConsistencyResult;
}) {
  const hasPartialData = partialResult?.issues?.length || partialResult?.overallScore !== undefined;

  // Centered state when no partial data yet
  if (!hasPartialData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <Search className="h-8 w-8 text-primary animate-pulse" />
          <Loader2 className="h-4 w-4 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Checking consistency...</p>
          {currentTool && (
            <p className="text-xs text-muted-foreground">
              {currentTool === "search_entities"
                ? "Searching related entities..."
                : currentTool === "get_entity"
                  ? "Examining entity details..."
                  : currentTool === "get_relationships"
                    ? "Analyzing relationships..."
                    : currentTool === "get_location_hierarchy"
                      ? "Checking location hierarchy..."
                      : currentTool === "get_timeline"
                        ? "Verifying timeline..."
                        : "Gathering context..."}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Streaming state with partial data
  return (
    <div className="flex flex-col h-full">
      {/* Header with loading indicator */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="relative">
          <Search className="h-6 w-6 text-primary animate-pulse" />
          <Loader2 className="h-3 w-3 text-primary animate-spin absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Checking consistency...</p>
          {currentTool && (
            <p className="text-xs text-muted-foreground">
              {currentTool === "search_entities"
                ? "Searching related entities..."
                : currentTool === "get_entity"
                  ? "Examining entity details..."
                  : currentTool === "get_relationships"
                    ? "Analyzing relationships..."
                    : currentTool === "get_location_hierarchy"
                      ? "Checking location hierarchy..."
                      : currentTool === "get_timeline"
                        ? "Verifying timeline..."
                        : "Gathering context..."}
            </p>
          )}
        </div>
        {partialResult?.overallScore !== undefined && (
          <div className={`text-lg font-bold ${getScoreColorClass(partialResult.overallScore)}`}>
            {Math.round(partialResult.overallScore)}/100
          </div>
        )}
      </div>

      {/* Streaming partial results */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {partialResult?.issues?.map((issue, index) => (
            <div
              key={index}
              className="p-3 rounded border border-dashed border-muted-foreground/30 bg-muted/20 animate-pulse"
            >
              <div className="flex items-center gap-2 mb-1">
                {issue.severity === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                {issue.severity === "warning" && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                {issue.severity === "suggestion" && (
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                )}
                {issue.severity && (
                  <Badge variant="outline" className="text-xs">
                    {issue.severity}
                  </Badge>
                )}
                {issue.field && (
                  <Badge variant="secondary" className="text-xs">
                    {issue.field}
                  </Badge>
                )}
              </div>
              {issue.issue && (
                <p className="text-sm text-muted-foreground">{issue.issue}</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Empty state when no issues found
 */
function NoIssuesState({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">No issues found</p>
        <p className="text-xs text-muted-foreground">
          Content is consistent with existing lore
        </p>
      </div>
      <div
        className={`text-2xl font-bold ${getScoreColorClass(score)} border rounded-lg px-4 py-2 ${getScoreBgClass(score)}`}
      >
        {score}/100
      </div>
    </div>
  );
}

/**
 * Error state when check fails
 */
function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Check failed</p>
        <p className="text-xs text-muted-foreground max-w-[300px]">{error}</p>
      </div>
    </div>
  );
}

export function ConsistencyCheckPanel({
  result,
  partialResult,
  isChecking = false,
  currentTool,
  onDismiss,
  onNavigateToEntity,
}: ConsistencyCheckPanelProps) {
  const [showReasoning, setShowReasoning] = useState(false);

  // Loading state with streaming partial results
  if (isChecking) {
    return (
      <CheckingState currentTool={currentTool} partialResult={partialResult} />
    );
  }

  // No result yet
  if (!result) {
    return null;
  }

  // Error state
  if (!result.success && result.error) {
    return (
      <div className="flex flex-col h-full">
        <ErrorState error={result.error} />
        {onDismiss && (
          <div className="border-t p-3">
            <Button variant="outline" onClick={onDismiss} className="w-full">
              Dismiss
            </Button>
          </div>
        )}
      </div>
    );
  }

  // No issues found
  if (result.issues.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <NoIssuesState score={result.overallScore} />

        {/* AI Reasoning */}
        {result.reasoning && (
          <div className="px-3 pb-3">
            <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs gap-1 w-full justify-center"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Lightbulb className="h-3 w-3" />
                  {showReasoning ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide analysis
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show analysis
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <MarkdownReasoning content={result.reasoning} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {onDismiss && (
          <div className="border-t p-3 mt-auto">
            <Button variant="outline" onClick={onDismiss} className="w-full">
              Dismiss
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Issues found
  const counts = countBySeverity(result.issues);

  return (
    <div className="flex flex-col h-full">
      {/* Header with score and counts */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Consistency Score</span>
            <span
              className={`text-lg font-bold ${getScoreColorClass(result.overallScore)}`}
            >
              {result.overallScore}/100
            </span>
          </div>
        </div>

        {/* Issue counts */}
        <div className="flex items-center gap-3">
          {counts.errors > 0 && (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-destructive" />
              <Badge variant="destructive" className="text-xs">
                {counts.errors} error{counts.errors !== 1 && "s"}
              </Badge>
            </div>
          )}
          {counts.warnings > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <Badge variant="secondary" className="text-xs">
                {counts.warnings} warning{counts.warnings !== 1 && "s"}
              </Badge>
            </div>
          )}
          {counts.suggestions > 0 && (
            <div className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-blue-500" />
              <Badge variant="outline" className="text-xs">
                {counts.suggestions} suggestion{counts.suggestions !== 1 && "s"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Issues list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {result.issues.map((issue, index) => (
            <ConsistencyIssueCard
              key={index}
              issue={issue}
              onNavigateToEntity={onNavigateToEntity}
            />
          ))}
        </div>
      </ScrollArea>

      {/* AI Reasoning */}
      {result.reasoning && (
        <div className="px-3 pb-2">
          <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs gap-1"
                onMouseDown={(e) => e.preventDefault()}
              >
                <Lightbulb className="h-3 w-3" />
                {showReasoning ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide analysis
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show analysis
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <MarkdownReasoning content={result.reasoning} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Footer with dismiss button */}
      {onDismiss && (
        <div className="border-t p-3">
          <Button variant="outline" onClick={onDismiss} className="w-full">
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
