import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ExpandableButton,
  ExpandableButtonGroup,
} from "@/components/ui/expandable-button-group";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useUIStore } from "@/stores";

interface PageHeaderProps {
  title: string;
  description?: string;
  count?: number;
  onCreateClick?: () => void;
  createLabel?: string;
  showViewToggle?: boolean;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  count,
  onCreateClick,
  createLabel = "Create",
  showViewToggle = true,
  actions,
}: PageHeaderProps) {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              ({count})
            </span>
          )}
        </h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showViewToggle && (
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ExpandableButtonGroup>
          {actions}
          {onCreateClick && (
            <ExpandableButton
              icon={<Plus className="h-4 w-4" />}
              label={createLabel}
              onClick={onCreateClick}
            />
          )}
        </ExpandableButtonGroup>
      </div>
    </div>
  );
}
