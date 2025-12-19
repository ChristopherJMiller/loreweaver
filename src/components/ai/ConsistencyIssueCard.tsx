/**
 * Consistency Issue Card Component
 *
 * Displays a single consistency issue with severity indicator,
 * description, and optional actions.
 */

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ConsistencyIssue, IssueSeverity } from "@/ai/agents/consistency-checker/types";

interface ConsistencyIssueCardProps {
  /** The issue to display */
  issue: ConsistencyIssue;

  /** Callback when user wants to navigate to conflicting entity */
  onNavigateToEntity?: (entityType: string, entityId: string) => void;
}

/**
 * Get icon component for severity level
 */
function getSeverityIcon(severity: IssueSeverity) {
  switch (severity) {
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "suggestion":
      return <Lightbulb className="h-4 w-4 text-blue-500" />;
  }
}

/**
 * Get badge variant for severity level
 */
function getSeverityVariant(
  severity: IssueSeverity
): "destructive" | "secondary" | "outline" {
  switch (severity) {
    case "error":
      return "destructive";
    case "warning":
      return "secondary";
    case "suggestion":
      return "outline";
  }
}

/**
 * Get card border class for severity level
 */
function getSeverityBorderClass(severity: IssueSeverity): string {
  switch (severity) {
    case "error":
      return "border-destructive/30 bg-destructive/5";
    case "warning":
      return "border-amber-500/30 bg-amber-500/5";
    case "suggestion":
      return "border-blue-500/30 bg-blue-500/5";
  }
}

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format entity type for display
 */
function formatEntityType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ConsistencyIssueCard({
  issue,
  onNavigateToEntity,
}: ConsistencyIssueCardProps) {
  const [showSuggestion, setShowSuggestion] = useState(false);

  return (
    <Card className={`w-full ${getSeverityBorderClass(issue.severity)}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center gap-2 flex-wrap">
          {getSeverityIcon(issue.severity)}
          <Badge variant={getSeverityVariant(issue.severity)}>
            {issue.severity === "error"
              ? "Error"
              : issue.severity === "warning"
                ? "Warning"
                : "Suggestion"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatFieldName(issue.field)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 px-3 space-y-2">
        {/* Issue description */}
        <p className="text-sm">{issue.issue}</p>

        {/* Conflicting entity link */}
        {issue.conflictingEntity && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <span>Conflicts with:</span>
            {onNavigateToEntity ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs gap-1"
                onClick={() =>
                  onNavigateToEntity(
                    issue.conflictingEntity!.type,
                    issue.conflictingEntity!.id
                  )
                }
              >
                <span className="font-medium">
                  {issue.conflictingEntity.name}
                </span>
                <span className="text-muted-foreground">
                  ({formatEntityType(issue.conflictingEntity.type)})
                </span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            ) : (
              <span>
                <span className="font-medium">
                  {issue.conflictingEntity.name}
                </span>{" "}
                <span className="text-muted-foreground">
                  ({formatEntityType(issue.conflictingEntity.type)})
                </span>
              </span>
            )}
          </div>
        )}

        {/* Suggestion (collapsible) */}
        {issue.suggestion && (
          <Collapsible open={showSuggestion} onOpenChange={setShowSuggestion}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs gap-1"
                onMouseDown={(e) => e.preventDefault()}
              >
                <Lightbulb className="h-3 w-3" />
                {showSuggestion ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide suggestion
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show suggestion
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                {issue.suggestion}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
