import { useEditor, EditorContent, JSONContent, AnyExtension } from "@tiptap/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { createMentionExtension } from "@/components/editor/MentionExtension";

export interface SectionEditorProps {
  id: string;
  title: string;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly: boolean;
  campaignId?: string;
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

export function SectionEditor({
  id,
  title,
  content,
  onChange,
  placeholder = "Start writing...",
  readOnly,
  campaignId,
  onFocus,
  onEditorReady,
  className,
  hideTitle = false,
}: SectionEditorProps) {
  const initialContent = useMemo(() => parseContent(content), []);

  const extensions = useMemo((): AnyExtension[] => {
    const baseExtensions: AnyExtension[] = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
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
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(JSON.stringify(json));
    },
    onFocus: ({ editor }) => {
      onFocus(editor);
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
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(id, editor);
    }
  }, [editor, id, onEditorReady]);

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
  }, [content]);

  const handleContainerClick = useCallback(() => {
    if (editor && !readOnly) {
      editor.commands.focus("end");
    }
  }, [editor, readOnly]);

  // Check if editor is empty (for showing placeholder in read-only mode)
  const isEmpty = !content || content.trim() === "" || content === '{"type":"doc","content":[]}';

  return (
    <div className={cn("document-section mb-8", className)}>
      {!hideTitle && (
        <h2 className="text-lg font-semibold mb-3 text-foreground">{title}</h2>
      )}
      <div
        onClick={handleContainerClick}
        className={cn(
          "cursor-text",
          readOnly && "cursor-default"
        )}
      >
        {readOnly && isEmpty ? (
          <p className="text-muted-foreground italic py-2">{placeholder}</p>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}
