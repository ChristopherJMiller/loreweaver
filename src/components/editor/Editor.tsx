import { useEditor, EditorContent, JSONContent, AnyExtension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./EditorToolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createMentionExtension } from "./MentionExtension";
import { createCitationExtension } from "./CitationExtension";

export interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  campaignId?: string;
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

  // Split text by newlines and create paragraphs
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

  // Migrate plain text to JSON format
  return textToJson(content);
}

export function Editor({
  content,
  onChange,
  placeholder = "Start writing...",
  readOnly = false,
  campaignId,
  className,
}: EditorProps) {
  const initialContent = useMemo(() => parseContent(content), []);

  // Build extensions list - include mention extension if campaignId is provided
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

    // Add mention and citation extensions if campaignId is provided
    if (campaignId) {
      baseExtensions.push(createMentionExtension({ campaignId }));
      baseExtensions.push(createCitationExtension({ campaignId }));
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
    },
  });

  // Update editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Update content when prop changes (e.g., switching between entities)
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
          className={cn("cursor-text", readOnly && "cursor-default")}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Utility function to extract plain text from JSON content
 * Useful for previews, search indexing, etc.
 */
export function extractTextFromJson(jsonString: string): string {
  try {
    const doc = JSON.parse(jsonString);
    return extractTextFromNode(doc);
  } catch {
    return jsonString; // Return as-is if not valid JSON
  }
}

function extractTextFromNode(node: JSONContent): string {
  if (!node) return "";

  if (node.type === "text") {
    return node.text || "";
  }

  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).join(node.type === "paragraph" ? "\n" : "");
  }

  return "";
}
