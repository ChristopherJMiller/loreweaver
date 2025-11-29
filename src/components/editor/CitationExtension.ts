/**
 * CitationExtension for Tiptap
 *
 * Custom node for inline entity citations with [[ trigger.
 * Similar to mentions but with different trigger and styling.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { PluginKey } from "@tiptap/pm/state";
import type { EntityType } from "@/types";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction, EditorState } from "@tiptap/pm/state";

// Use MentionList for the dropdown - same search functionality
import { MentionList, type MentionListRef, type MentionItem } from "./MentionList";

export interface CitationExtensionOptions {
  campaignId: string;
  HTMLAttributes: Record<string, unknown>;
  suggestion: Partial<SuggestionOptions>;
}

export interface CitationNodeAttributes {
  entityType: EntityType;
  entityId: string;
  label: string;
}

// Plugin key for the suggestion plugin
const CitationPluginKey = new PluginKey("citation");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citation: {
      setCitation: (attributes: CitationNodeAttributes) => ReturnType;
    };
  }
}

/**
 * Create the Citation node extension
 */
export const Citation = Node.create<CitationExtensionOptions>({
  name: "citation",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      campaignId: "",
      HTMLAttributes: {},
      suggestion: {
        char: "[[",
        allowSpaces: false,
        startOfLine: false,
        pluginKey: CitationPluginKey,
      },
    };
  },

  addAttributes() {
    return {
      entityType: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.entityType) return {};
          return { "data-entity-type": attributes.entityType };
        },
      },
      entityId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-entity-id"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.entityId) return {};
          return { "data-entity-id": attributes.entityId };
        },
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.textContent?.replace(/^\[\[|\]\]$/g, ""),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation="true"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }: { node: ProseMirrorNode; HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-citation": "true",
          class: "citation-pill",
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      node.attrs.label as string,
    ];
  },

  renderText({ node }: { node: ProseMirrorNode }) {
    return `[[${node.attrs.entityType}:${node.attrs.entityId}:${node.attrs.label}]]`;
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }: { tr: Transaction; state: EditorState }) => {
          let isCitation = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node: ProseMirrorNode, pos: number) => {
            if (node.type.name === this.name) {
              isCitation = true;
              tr.insertText("", pos, pos + node.nodeSize);
              return false;
            }
          });

          return isCitation;
        }),
    };
  },

  addProseMirrorPlugins() {
    const { campaignId } = this.options;

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          // Return query for dropdown to handle async search
          return [query];
        },
        render: () => {
          let component: ReactRenderer<MentionListRef> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps<string>) => {
              component = new ReactRenderer(MentionList, {
                props: {
                  query: props.query,
                  campaignId,
                  command: (item: MentionItem) => {
                    props.command({
                      entityType: item.entityType,
                      entityId: item.entityId,
                      label: item.label,
                    } as CitationNodeAttributes);
                  },
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                zIndex: 50,
              });
            },

            onUpdate: (props: SuggestionProps<string>) => {
              if (!component) return;

              component.updateProps({
                query: props.query,
                campaignId,
                command: (item: MentionItem) => {
                  props.command({
                    entityType: item.entityType,
                    entityId: item.entityId,
                    label: item.label,
                  } as CitationNodeAttributes);
                },
              });

              if (!props.clientRect || !popup) {
                return;
              }

              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

/**
 * Create a configured Citation extension for entity references
 */
export function createCitationExtension({ campaignId }: { campaignId: string }) {
  return Citation.configure({
    campaignId,
    HTMLAttributes: {
      class: "citation-pill",
    },
  });
}
