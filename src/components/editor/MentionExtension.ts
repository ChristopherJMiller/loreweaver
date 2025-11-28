import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { MentionList, MentionListRef, MentionItem } from "./MentionList";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

export interface MentionExtensionOptions {
  campaignId: string;
}

/**
 * Create a configured Mention extension for entity references
 */
export function createMentionExtension({ campaignId }: MentionExtensionOptions) {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention",
    },
    renderHTML({ options, node }) {
      return [
        "span",
        {
          class: options.HTMLAttributes.class,
          "data-entity-type": node.attrs.entityType,
          "data-entity-id": node.attrs.entityId,
        },
        `@${node.attrs.label}`,
      ];
    },
    suggestion: {
      char: "@",
      allowSpaces: false,
      startOfLine: false,

      items: ({ query }: { query: string }) => {
        // Return query for MentionList to handle async search
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
                    id: item.entityId,
                    label: item.label,
                    entityType: item.entityType,
                    entityId: item.entityId,
                  });
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
                  id: item.entityId,
                  label: item.label,
                  entityType: item.entityType,
                  entityId: item.entityId,
                });
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
    },
  });
}

// Custom styles for mentions - add to global CSS
export const mentionStyles = `
.mention {
  background-color: hsl(var(--primary) / 0.1);
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  color: hsl(var(--primary));
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
}

.mention:hover {
  background-color: hsl(var(--primary) / 0.2);
}
`;
