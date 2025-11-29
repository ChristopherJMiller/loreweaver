/**
 * Content Bridge Utilities
 *
 * Converts between Tiptap/ProseMirror JSON and Markdown format
 * for AI agent consumption.
 */

import { lexer, type Token, type Tokens } from "marked";
import type { JSONContent } from "@tiptap/react";
import type { EntityMarkdownFormat, ContentPatch } from "../types";

// ============ Mark Types ============

interface ProseMirrorMark {
  type: "bold" | "italic" | "strike" | "code" | "link";
  attrs?: Record<string, unknown>;
}

// ============ Markdown Detection ============

/**
 * Check if text appears to contain markdown formatting
 * Used to determine whether to parse as markdown or treat as plain text
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text) return false;

  // Check for common markdown patterns
  const patterns = [
    /^#{1,6}\s/m,           // Headings
    /\*\*[^*]+\*\*/,        // Bold
    /\*[^*]+\*/,            // Italic (but not **)
    /^-\s/m,                // Bullet lists
    /^\d+\.\s/m,            // Numbered lists
    /^>\s/m,                // Blockquotes
    /`[^`]+`/,              // Inline code
    /```/,                  // Code blocks
    /\[.+\]\(.+\)/,         // Links
  ];

  return patterns.some(pattern => pattern.test(text));
}

// ============ Token to Node Conversion ============

/**
 * Convert inline tokens to text nodes with marks
 */
function parseInlineTokens(tokens: Token[]): JSONContent[] {
  const result: JSONContent[] = [];

  for (const token of tokens) {
    const nodes = inlineTokenToNodes(token);
    result.push(...nodes);
  }

  return result;
}

/**
 * Convert a single inline token to text node(s) with marks
 */
function inlineTokenToNodes(token: Token, marks: ProseMirrorMark[] = []): JSONContent[] {
  switch (token.type) {
    case "text":
    case "escape": {
      const textToken = token as Tokens.Text | Tokens.Escape;
      if (!textToken.text) return [];

      const node: JSONContent = { type: "text", text: textToken.text };
      if (marks.length > 0) {
        node.marks = marks.map(m => ({ ...m }));
      }
      return [node];
    }

    case "strong": {
      const strongToken = token as Tokens.Strong;
      const newMarks = [...marks, { type: "bold" as const }];
      if (strongToken.tokens) {
        return strongToken.tokens.flatMap(t => inlineTokenToNodes(t, newMarks));
      }
      // Fallback to text if no tokens
      const node: JSONContent = { type: "text", text: strongToken.text };
      node.marks = newMarks.map(m => ({ ...m }));
      return [node];
    }

    case "em": {
      const emToken = token as Tokens.Em;
      const newMarks = [...marks, { type: "italic" as const }];
      if (emToken.tokens) {
        return emToken.tokens.flatMap(t => inlineTokenToNodes(t, newMarks));
      }
      const node: JSONContent = { type: "text", text: emToken.text };
      node.marks = newMarks.map(m => ({ ...m }));
      return [node];
    }

    case "del": {
      const delToken = token as Tokens.Del;
      const newMarks = [...marks, { type: "strike" as const }];
      if (delToken.tokens) {
        return delToken.tokens.flatMap(t => inlineTokenToNodes(t, newMarks));
      }
      const node: JSONContent = { type: "text", text: delToken.text };
      node.marks = newMarks.map(m => ({ ...m }));
      return [node];
    }

    case "codespan": {
      const codeToken = token as Tokens.Codespan;
      const node: JSONContent = {
        type: "text",
        text: codeToken.text,
        marks: [...marks, { type: "code" }].map(m => ({ ...m }))
      };
      return [node];
    }

    case "link": {
      const linkToken = token as Tokens.Link;
      const linkMark: ProseMirrorMark = {
        type: "link",
        attrs: { href: linkToken.href, target: "_blank" }
      };
      const newMarks = [...marks, linkMark];

      if (linkToken.tokens) {
        return linkToken.tokens.flatMap(t => inlineTokenToNodes(t, newMarks));
      }
      const node: JSONContent = { type: "text", text: linkToken.text };
      node.marks = newMarks.map(m => ({ ...m }));
      return [node];
    }

    case "br": {
      return [{ type: "hardBreak" }];
    }

    case "image": {
      // Images not supported in editor - render as link text
      const imgToken = token as Tokens.Image;
      const node: JSONContent = {
        type: "text",
        text: imgToken.text || imgToken.href,
        marks: [...marks, { type: "link", attrs: { href: imgToken.href } }].map(m => ({ ...m }))
      };
      return [node];
    }

    default:
      // Unknown inline token - try to extract text
      if ("text" in token && typeof token.text === "string") {
        const node: JSONContent = { type: "text", text: token.text };
        if (marks.length > 0) {
          node.marks = marks.map(m => ({ ...m }));
        }
        return [node];
      }
      return [];
  }
}

/**
 * Convert a block-level token to a ProseMirror node
 */
function tokenToNode(token: Token): JSONContent | null {
  switch (token.type) {
    case "heading": {
      const headingToken = token as Tokens.Heading;
      // Cap heading level at 3 (editor only supports 1-3)
      const level = Math.min(headingToken.depth, 3);

      const content = headingToken.tokens
        ? parseInlineTokens(headingToken.tokens)
        : [{ type: "text", text: headingToken.text }];

      return {
        type: "heading",
        attrs: { level },
        content: content.length > 0 ? content : undefined,
      };
    }

    case "paragraph": {
      const paraToken = token as Tokens.Paragraph;
      const content = paraToken.tokens
        ? parseInlineTokens(paraToken.tokens)
        : [{ type: "text", text: paraToken.text }];

      return {
        type: "paragraph",
        content: content.length > 0 ? content : undefined,
      };
    }

    case "list": {
      const listToken = token as Tokens.List;
      const listType = listToken.ordered ? "orderedList" : "bulletList";

      const items = listToken.items.map((item): JSONContent => {
        // Each list item contains a paragraph with the content
        const itemContent = item.tokens
          ? tokensToNodes(item.tokens)
          : [{ type: "paragraph", content: [{ type: "text", text: item.text }] }];

        // Ensure content is wrapped in paragraph if it's just text nodes
        const wrappedContent = itemContent.map(node => {
          if (node.type === "text") {
            return { type: "paragraph", content: [node] };
          }
          return node;
        });

        return {
          type: "listItem",
          content: wrappedContent.length > 0 ? wrappedContent : [{ type: "paragraph" }],
        };
      });

      return {
        type: listType,
        content: items,
      };
    }

    case "blockquote": {
      const quoteToken = token as Tokens.Blockquote;
      const content = quoteToken.tokens
        ? tokensToNodes(quoteToken.tokens)
        : [{ type: "paragraph", content: [{ type: "text", text: quoteToken.text }] }];

      return {
        type: "blockquote",
        content: content.length > 0 ? content : [{ type: "paragraph" }],
      };
    }

    case "code": {
      const codeToken = token as Tokens.Code;
      return {
        type: "codeBlock",
        attrs: codeToken.lang ? { language: codeToken.lang } : undefined,
        content: [{ type: "text", text: codeToken.text }],
      };
    }

    case "hr": {
      return { type: "horizontalRule" };
    }

    case "space": {
      // Skip empty space tokens
      return null;
    }

    case "html": {
      // Convert HTML to plain text paragraph
      const htmlToken = token as Tokens.HTML;
      if (htmlToken.text.trim()) {
        return {
          type: "paragraph",
          content: [{ type: "text", text: htmlToken.text }],
        };
      }
      return null;
    }

    case "table": {
      // Tables not supported - convert to text representation
      const tableToken = token as Tokens.Table;
      const rows: string[] = [];

      // Header row
      const headerTexts = tableToken.header.map(cell => cell.text);
      rows.push(headerTexts.join(" | "));

      // Data rows
      for (const row of tableToken.rows) {
        const cellTexts = row.map(cell => cell.text);
        rows.push(cellTexts.join(" | "));
      }

      return {
        type: "paragraph",
        content: [{ type: "text", text: rows.join("\n") }],
      };
    }

    default:
      // Unknown block token - try to extract text as paragraph
      if ("text" in token && typeof token.text === "string" && token.text.trim()) {
        return {
          type: "paragraph",
          content: [{ type: "text", text: token.text }],
        };
      }
      return null;
  }
}

/**
 * Convert an array of tokens to ProseMirror nodes
 */
function tokensToNodes(tokens: Token[]): JSONContent[] {
  const nodes: JSONContent[] = [];

  for (const token of tokens) {
    const node = tokenToNode(token);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

// ============ Main Conversion Functions ============

/**
 * Convert Markdown string to ProseMirror JSON
 */
export function markdownToProsemirror(markdown: string): JSONContent {
  if (!markdown || markdown.trim() === "") {
    return { type: "doc", content: [] };
  }

  // Use marked's lexer to get tokens
  const tokens = lexer(markdown);

  // Convert tokens to ProseMirror nodes
  const content = tokensToNodes(tokens);

  // Ensure we have at least one paragraph
  if (content.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  return { type: "doc", content };
}

/**
 * Convert plain text to ProseMirror JSON (for non-markdown text)
 * Splits by double newlines into paragraphs
 */
export function textToProsemirror(text: string): JSONContent {
  if (!text || text.trim() === "") {
    return { type: "doc", content: [] };
  }

  // Split text by double newlines and create paragraphs
  const paragraphs = text.split(/\n\n+/).map((para): JSONContent => ({
    type: "paragraph",
    content: para.trim()
      ? [{ type: "text", text: para.trim() }]
      : undefined,
  }));

  return {
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [],
  };
}

// ============ TODO: Future Implementation ============

/**
 * Convert an entity to AI-readable Markdown format with frontmatter
 */
export function entityToMarkdown(
  _entity: Record<string, unknown>,
  _entityType: string
): string {
  // TODO: Implement for future AI editing features
  throw new Error("Not implemented - requires gray-matter for frontmatter");
}

/**
 * Parse AI Markdown output back to entity update
 */
export function markdownToEntityUpdate(
  _markdown: string
): EntityMarkdownFormat {
  // TODO: Implement for future AI editing features
  throw new Error("Not implemented - requires gray-matter");
}

/**
 * Apply content patches to an entity
 */
export function applyPatches(
  _entity: Record<string, unknown>,
  _patches: ContentPatch[]
): Record<string, unknown> {
  // TODO: Implement for future AI editing features
  throw new Error("Not implemented");
}

/**
 * Convert ProseMirror JSON to Markdown string
 */
export function prosemirrorToMarkdown(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  const doc = json as JSONContent;
  if (doc.type !== "doc" || !doc.content) {
    return "";
  }

  return doc.content.map(nodeToMarkdown).join("\n\n");
}

/**
 * Convert a single ProseMirror node to markdown
 */
function nodeToMarkdown(node: JSONContent): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const prefix = "#".repeat(Math.min(level, 6));
      const text = inlineContentToMarkdown(node.content);
      return `${prefix} ${text}`;
    }

    case "paragraph": {
      return inlineContentToMarkdown(node.content);
    }

    case "bulletList": {
      if (!node.content) return "";
      return node.content
        .map((item) => {
          const itemText = item.content
            ?.map(nodeToMarkdown)
            .join("\n")
            .split("\n")
            .map((line, i) => (i === 0 ? `- ${line}` : `  ${line}`))
            .join("\n");
          return itemText || "- ";
        })
        .join("\n");
    }

    case "orderedList": {
      if (!node.content) return "";
      return node.content
        .map((item, index) => {
          const itemText = item.content
            ?.map(nodeToMarkdown)
            .join("\n")
            .split("\n")
            .map((line, i) => (i === 0 ? `${index + 1}. ${line}` : `   ${line}`))
            .join("\n");
          return itemText || `${index + 1}. `;
        })
        .join("\n");
    }

    case "listItem": {
      // Handled by parent list
      return node.content?.map(nodeToMarkdown).join("\n") || "";
    }

    case "blockquote": {
      const content = node.content?.map(nodeToMarkdown).join("\n\n") || "";
      return content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const code = node.content?.[0]?.text || "";
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "horizontalRule": {
      return "---";
    }

    case "hardBreak": {
      return "\n";
    }

    default:
      // Try to extract text content
      return inlineContentToMarkdown(node.content);
  }
}

/**
 * Convert inline content (text with marks) to markdown
 */
function inlineContentToMarkdown(content: JSONContent[] | undefined): string {
  if (!content) return "";

  return content
    .map((node) => {
      if (node.type === "text") {
        let text = node.text || "";

        // Apply marks
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                text = `**${text}**`;
                break;
              case "italic":
                text = `*${text}*`;
                break;
              case "strike":
                text = `~~${text}~~`;
                break;
              case "code":
                text = `\`${text}\``;
                break;
              case "link": {
                const href = (mark.attrs?.href as string) || "";
                text = `[${text}](${href})`;
                break;
              }
            }
          }
        }

        return text;
      }

      if (node.type === "hardBreak") {
        return "\n";
      }

      return "";
    })
    .join("");
}
