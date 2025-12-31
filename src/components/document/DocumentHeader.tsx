import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Save, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ExpandableButton,
  ExpandableButtonGroup,
} from "@/components/ui/expandable-button-group";
import { cn } from "@/lib/utils";

export interface DocumentHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onClose: () => void;
  onDelete: () => void;
  backLink: string;
  className?: string;
  /** Additional action buttons to show in toolbar (before Edit/Delete, hidden in edit mode) */
  actions?: React.ReactNode;
}

export function DocumentHeader({
  title,
  subtitle,
  badges,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onClose,
  onDelete,
  backLink,
  className,
  actions,
}: DocumentHeaderProps) {
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, onSave]);

  return (
    <div
      className={cn(
        "sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "border-b border-border pt-6 pb-4 mb-6",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={backLink}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="text-2xl font-bold">{title}</div>
            {subtitle && (
              <div className="flex items-center gap-2 text-muted-foreground">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badges}

          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={onSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button onClick={onClose}>
                <Check className="mr-2 h-4 w-4" />
                Done
              </Button>
            </>
          ) : (
            <ExpandableButtonGroup>
              {actions}
              <ExpandableButton
                icon={<Edit2 className="h-4 w-4" />}
                label="Edit"
                variant="outline"
                onClick={onEdit}
              />
              <ExpandableButton
                icon={<Trash2 className="h-4 w-4" />}
                label="Delete"
                variant="ghost"
                className="text-destructive"
                onClick={onDelete}
              />
            </ExpandableButtonGroup>
          )}
        </div>
      </div>
    </div>
  );
}
