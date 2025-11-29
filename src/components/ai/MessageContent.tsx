/**
 * MessageContent Component
 *
 * Parses AI message content and renders citations as inline pills.
 * Handles markdown rendering with citation placeholders.
 */

import { useMemo } from "react";
import { marked } from "marked";
import { parseContentSegments } from "@/lib/citation-parser";
import { CitationPill, EntityPreviewPopover } from "@/components/citation";
import { useEntityNavigation } from "@/hooks/useEntityNavigation";
import type { EntityType } from "@/types";

export interface MessageContentProps {
  content: string;
  className?: string;
}

/**
 * Configure marked for safe rendering
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render a text segment as HTML
 * Note: We use dangerouslySetInnerHTML because marked.parse is trusted
 */
function TextSegment({ content }: { content: string }) {
  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  return (
    <span
      className="prose prose-sm dark:prose-invert max-w-none inline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Render a citation segment as a pill with hover preview
 */
function CitationSegment({
  entityType,
  entityId,
  displayName,
  onNavigate,
}: {
  entityType: EntityType;
  entityId: string;
  displayName: string;
  onNavigate: () => void;
}) {
  return (
    <EntityPreviewPopover
      entityType={entityType}
      entityId={entityId}
      onNavigate={onNavigate}
    >
      <CitationPill
        entityType={entityType}
        entityId={entityId}
        displayName={displayName}
        onClick={onNavigate}
      />
    </EntityPreviewPopover>
  );
}

/**
 * MessageContent renders AI messages with inline citation pills
 *
 * Citation format: [[entity_type:uuid:Display Name]]
 * Example: [[character:550e8400-e29b-41d4-a716-446655440000:Captain Aldric]]
 */
export function MessageContent({ content, className }: MessageContentProps) {
  const { createNavigateHandler } = useEntityNavigation();

  const segments = useMemo(() => parseContentSegments(content), [content]);

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <TextSegment key={index} content={segment.content} />;
        }

        if (segment.type === "citation" && segment.citation) {
          const { entityType, entityId, displayName } = segment.citation;
          return (
            <CitationSegment
              key={index}
              entityType={entityType}
              entityId={entityId}
              displayName={displayName}
              onNavigate={createNavigateHandler(entityType, entityId)}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
