/**
 * SectionEditor
 *
 * Rich text section editor with AI expansion capabilities.
 * Shows a floating button when text is selected, allowing users
 * to expand the content with AI assistance.
 */

import { useEditor, EditorContent, JSONContent, AnyExtension } from "@tiptap/react";
import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { createMentionExtension } from "@/components/editor/MentionExtension";
import { ExpansionPopover, ExpandButton } from "@/components/ai/ExpansionPopover";
import { useExpander, type ExpansionState } from "@/hooks/useExpander";
import type { ExpansionType } from "@/ai/agents/expander";
import type { EntityType } from "@/types";

export interface SectionEditorProps {
  id: string;
  title: string;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly: boolean;
  campaignId: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  onFocus: (editor: Editor) => void;
  onEditorReady?: (id: string, editor: Editor) => void;
  className?: string;
  hideTitle?: boolean;
}

function isJsonContent(content: string): boolean {
  if (!content || content.trim() === "") return false;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && parsed.type === "doc";
  } catch {
    return false;
  }
}

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

function parseContent(content: string): JSONContent {
  if (!content || content.trim() === "") {
    return { type: "doc", content: [] };
  }

  if (isJsonContent(content)) {
    return JSON.parse(content);
  }

  return textToJson(content);
}

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

export function SectionEditor({
  id,
  title,
  content,
  onChange,
  placeholder = "Start writing...",
  readOnly,
  campaignId,
  entityType,
  entityId,
  entityName,
  onFocus,
  onEditorReady,
  className,
  hideTitle = false,
}: SectionEditorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string;
    from: number;
    to: number;
  } | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const initialContent = useMemo(() => parseContent(content), []);

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

    if (campaignId) {
      baseExtensions.push(createMentionExtension({ campaignId }));
    }

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
    onFocus: ({ editor: ed }) => {
      onFocus(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      console.log("[SectionEditor] Selection update:", { from, to, isEditable: ed.isEditable, readOnly });
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to);
        console.log("[SectionEditor] Has selection:", text);
        if (text.trim()) {
          setSelectionInfo({ text, from, to });
        }
      } else {
        console.log("[SectionEditor] Selection cleared");
        setSelectionInfo(null);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] py-2",
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
      editorRef.current = editor;
    }
  }, [editor]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(id, editor);
    }
  }, [editor, id, onEditorReady]);

  // Handle expansion acceptance
  const handleAcceptExpansion = useCallback(
    (expandedText: string, _originalText: string) => {
      const ed = editorRef.current;
      if (ed && selectionInfo) {
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
    fieldName: id,
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

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (editor && !readOnly) {
      // Only focus to end if clicking directly on the container (empty area),
      // not when clicking inside the editor content or when there's a selection
      const target = e.target as HTMLElement;
      const isEditorContent = target.closest('.ProseMirror');
      const hasSelection = !editor.state.selection.empty;

      if (!isEditorContent && !hasSelection) {
        editor.commands.focus("end");
      }
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

  // Check if editor is empty
  const isEmpty = !content || content.trim() === "" || content === '{"type":"doc","content":[]}';

  return (
    <div className={cn("document-section mb-8", className)}>
      {!hideTitle && (
        <h2 className="text-lg font-semibold mb-3 text-foreground">{title}</h2>
      )}
      <div
        onClick={handleContainerClick}
        className={cn("cursor-text relative", readOnly && "cursor-default")}
      >
        {readOnly && isEmpty ? (
          <p className="text-muted-foreground italic py-2">{placeholder}</p>
        ) : (
          <>
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
                  onOpenChange={setPopoverOpen}
                  isExpanding={expander.isExpanding}
                  state={getPopoverState()}
                  previewText={expander.expandedText}
                  originalText={expander.originalText}
                  error={expander.error}
                  onExpand={handleExpand}
                  onAccept={expander.accept}
                  onReject={() => {
                    expander.reject();
                    setPopoverOpen(false);
                  }}
                >
                  <ExpandButton onClick={() => {
                    console.log("[SectionEditor] ExpandButton onClick - setting popoverOpen to true");
                    setPopoverOpen(true);
                  }} />
                </ExpansionPopover>
              </BubbleMenu>
            )}
          </>
        )}
      </div>
    </div>
  );
}
