/**
 * EditorWithExpansion
 *
 * Enhanced editor component that adds AI expansion capabilities.
 * Shows a floating button when text is selected, allowing users
 * to expand the content with AI assistance.
 */

import { useEditor, EditorContent, JSONContent, AnyExtension, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./EditorToolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createMentionExtension } from "./MentionExtension";
import { createCitationExtension } from "./CitationExtension";
import { ExpansionPopover, ExpandButton } from "@/components/ai/ExpansionPopover";
import { useExpander, type ExpansionState } from "@/hooks/useExpander";
import type { ExpansionType } from "@/ai/agents/expander";
import type { EntityType } from "@/types";

export interface EditorWithExpansionProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  campaignId: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  fieldName: string;
  className?: string;
}

/**
 * Check if content is valid JSON (ProseMirror format)
 */
function isJsonContent(content: string): boolean {
  if (!content || content.trim() === "") return false;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && parsed.type === "doc";
  } catch {
    return false;
  }
}

/**
 * Convert plain text to ProseMirror JSON document
 */
function textToJson(text: string): JSONContent {
  if (!text || text.trim() === "") {
    return { type: "doc", content: [] };
  }

  const paragraphs = text.split(/\n\n+/).map((para) => ({
    type: "paragraph" as const,
    content: para.trim()
      ? [{ type: "text" as const, text: para.trim() }]
      : undefined,
  }));

  return {
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [],
  };
}

/**
 * Parse content - handles both JSON and plain text migration
 */
function parseContent(content: string): JSONContent {
  if (!content || content.trim() === "") {
    return { type: "doc", content: [] };
  }

  if (isJsonContent(content)) {
    return JSON.parse(content);
  }

  return textToJson(content);
}

/**
 * Extract plain text from editor for expansion
 */
function extractPlainText(json: JSONContent): string {
  if (!json) return "";
  if (json.type === "text") return json.text || "";
  if (json.content && Array.isArray(json.content)) {
    return json.content
      .map(extractPlainText)
      .join(json.type === "paragraph" ? "\n\n" : "");
  }
  return "";
}

export function EditorWithExpansion({
  content,
  onChange,
  placeholder = "Start writing...",
  readOnly = false,
  campaignId,
  entityType,
  entityId,
  entityName,
  fieldName,
  className,
}: EditorWithExpansionProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string;
    from: number;
    to: number;
  } | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const initialContent = useMemo(() => parseContent(content), []);

  // Build extensions list
  const extensions = useMemo((): AnyExtension[] => {
    const baseExtensions: AnyExtension[] = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline cursor-pointer",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
      }),
    ];

    // Add mention and citation extensions
    baseExtensions.push(createMentionExtension({ campaignId }));
    baseExtensions.push(createCitationExtension({ campaignId }));

    return baseExtensions;
  }, [placeholder, campaignId]);

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      onChange(JSON.stringify(json));
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to);
        if (text.trim()) {
          setSelectionInfo({ text, from, to });
        }
      } else {
        // No selection, close popover if open and not expanding
        setSelectionInfo(null);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-em:text-foreground",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          "prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
          "prose-pre:bg-muted prose-pre:text-foreground",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "prose-li:text-foreground"
        ),
      },
      handleKeyDown: (_view, event) => {
        // Cmd+Shift+E to expand
        if (
          (event.metaKey || event.ctrlKey) &&
          event.shiftKey &&
          event.key === "e"
        ) {
          event.preventDefault();
          if (selectionInfo && !readOnly) {
            setPopoverOpen(true);
          }
          return true;
        }
        return false;
      },
    },
  });

  // Store editor ref for use in callbacks
  useEffect(() => {
    if (editor) {
      (editorRef as React.MutableRefObject<typeof editor>).current = editor;
    }
  }, [editor]);

  // Handle expansion acceptance - replace selected text with expanded content
  const handleAcceptExpansion = useCallback(
    (expandedText: string, _originalText: string) => {
      const ed = editorRef.current;
      if (ed && selectionInfo) {
        // Replace the selection with expanded text
        ed
          .chain()
          .focus()
          .deleteRange({ from: selectionInfo.from, to: selectionInfo.to })
          .insertContentAt(selectionInfo.from, expandedText)
          .run();

        setPopoverOpen(false);
        setSelectionInfo(null);
      }
    },
    [selectionInfo]
  );

  const expander = useExpander({
    campaignId,
    entityType,
    entityId,
    entityName,
    fieldName,
    onAccept: handleAcceptExpansion,
  });

  // Update editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== JSON.stringify(editor.getJSON())) {
      const newContent = parseContent(content);
      editor.commands.setContent(newContent);
    }
  }, [content, editor]);

  const handleContainerClick = useCallback(() => {
    if (editor && !readOnly) {
      editor.commands.focus("end");
    }
  }, [editor, readOnly]);

  // Handle expansion type selection
  const handleExpand = useCallback(
    (type: ExpansionType) => {
      if (!selectionInfo || !editor) return;

      const fullContent = extractPlainText(editor.getJSON());

      expander.expand(
        selectionInfo.text,
        fullContent,
        selectionInfo.from,
        selectionInfo.to,
        type
      );
    },
    [selectionInfo, editor, expander]
  );

  // Map expander state to popover state
  const getPopoverState = (): ExpansionState => {
    if (expander.state === "idle" && popoverOpen) return "selecting";
    return expander.state;
  };

  // Determine if bubble menu should show
  const shouldShowBubbleMenu = useCallback(
    ({ editor: ed, from, to }: { editor: Editor; from: number; to: number }) => {
      // Only show if there's a selection and editor is editable
      if (!ed.isEditable) return false;
      return from !== to;
    },
    []
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          "rounded-md border border-input bg-transparent shadow-sm",
          readOnly && "bg-muted/50",
          className
        )}
      >
        {!readOnly && <EditorToolbar editor={editor} />}
        <div
          onClick={handleContainerClick}
          className={cn("cursor-text relative", readOnly && "cursor-default")}
        >
          <EditorContent editor={editor} />

          {/* Floating expansion bubble menu */}
          {editor && !readOnly && (
            <BubbleMenu
              editor={editor}
              shouldShow={shouldShowBubbleMenu}
              updateDelay={0}
              options={{
                placement: "top-start",
                offset: 8,
              }}
            >
              <ExpansionPopover
                open={popoverOpen}
                onOpenChange={(open) => {
                  if (!open && expander.isExpanding) {
                    // Cancel if closing while expanding
                    expander.cancel();
                  }
                  setPopoverOpen(open);
                }}
                isExpanding={expander.isExpanding}
                state={getPopoverState()}
                previewText={expander.expandedText}
                originalText={expander.originalText}
                error={expander.error}
                onExpand={handleExpand}
                onAccept={expander.accept}
                onReject={() => {
                  expander.cancel();
                  setPopoverOpen(false);
                }}
              >
                <ExpandButton onClick={() => setPopoverOpen(true)} />
              </ExpansionPopover>
            </BubbleMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
