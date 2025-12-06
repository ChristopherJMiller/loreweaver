/**
 * DocumentCanvas
 *
 * Document canvas with AI expansion capabilities.
 * Provides rich text editing with inline AI expansion for entity content.
 */

import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { SectionEditor } from "./SectionEditor";
import { DocumentToolbar } from "./DocumentToolbar";
import { cn } from "@/lib/utils";
import type { EntityType } from "@/types";

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  placeholder?: string;
}

export interface DocumentCanvasProps {
  sections: DocumentSection[];
  isEditing: boolean;
  onChange: (fieldId: string, content: string) => void;
  campaignId: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  className?: string;
  children?: React.ReactNode;
}

export function DocumentCanvas({
  sections,
  isEditing,
  onChange,
  campaignId,
  entityType,
  entityId,
  entityName,
  className,
  children,
}: DocumentCanvasProps) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  const handleFocus = useCallback((editor: Editor) => {
    setActiveEditor(editor);
  }, []);

  const handleChange = useCallback(
    (fieldId: string) => (content: string) => {
      onChange(fieldId, content);
    },
    [onChange]
  );

  return (
    <div className={cn("document-canvas max-w-4xl mx-auto", className)}>
      <DocumentToolbar editor={activeEditor} visible={isEditing} />

      <div className="space-y-2">
        {sections.map((section, index) => (
          <SectionEditor
            key={section.id}
            id={section.id}
            title={section.title}
            content={section.content}
            onChange={handleChange(section.id)}
            placeholder={section.placeholder}
            readOnly={!isEditing}
            campaignId={campaignId}
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            onFocus={handleFocus}
            hideTitle={index === 0}
          />
        ))}
      </div>

      {children}
    </div>
  );
}
