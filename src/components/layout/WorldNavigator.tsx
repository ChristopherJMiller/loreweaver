import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Globe,
  PanelRightClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { useLocationStore, useCampaignStore, useUIStore } from "@/stores";
import type { Location } from "@/types";

interface LocationNode {
  location: Location;
  children: LocationNode[];
}

// Build a tree structure from flat location list
function buildLocationTree(locations: Location[]): LocationNode[] {
  const locationMap = new Map<string, LocationNode>();
  const rootNodes: LocationNode[] = [];

  // First pass: create all nodes
  locations.forEach((loc) => {
    locationMap.set(loc.id, { location: loc, children: [] });
  });

  // Second pass: build tree structure
  locations.forEach((loc) => {
    const node = locationMap.get(loc.id)!;
    if (loc.parent_id && locationMap.has(loc.parent_id)) {
      const parent = locationMap.get(loc.parent_id)!;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Sort children by name at each level
  const sortNodes = (nodes: LocationNode[]) => {
    nodes.sort((a, b) => a.location.name.localeCompare(b.location.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(rootNodes);

  return rootNodes;
}

interface TreeNodeProps {
  node: LocationNode;
  level: number;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  selectedId?: string;
}

function TreeNode({
  node,
  level,
  expandedIds,
  toggleExpanded,
  selectedId,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.location.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.location.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
          "hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(node.location.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />

        <Link
          to={`/locations/${node.location.id}`}
          className="flex-1 truncate hover:underline"
          title={node.location.name}
        >
          {node.location.name}
        </Link>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.location.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorldNavigator() {
  const { id: currentLocationId } = useParams<{ id: string }>();
  const { activeCampaignId } = useCampaignStore();
  const { entities, fetchAll, isLoading } = useLocationStore();
  const { worldNavigatorOpen, worldNavigatorWidth, toggleWorldNavigator, setWorldNavigatorWidth } = useUIStore();

  const handleResize = useCallback(
    (delta: number) => {
      // For left-side handle, delta is inverted in ResizeHandle
      setWorldNavigatorWidth(worldNavigatorWidth + delta);
    },
    [worldNavigatorWidth, setWorldNavigatorWidth]
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  // Auto-expand to show current location
  useEffect(() => {
    if (currentLocationId && entities.length > 0) {
      // Find path from root to current location
      const findPath = (id: string): string[] => {
        const loc = entities.find((l) => l.id === id);
        if (!loc) return [];
        if (!loc.parent_id) return [id];
        return [...findPath(loc.parent_id), id];
      };

      const path = findPath(currentLocationId);
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        path.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  }, [currentLocationId, entities]);

  const tree = useMemo(() => buildLocationTree(entities), [entities]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(entities.map((l) => l.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (!worldNavigatorOpen) {
    return null;
  }

  return (
    <aside
      className="relative flex flex-col border-l bg-card transition-[width] duration-100"
      style={{ width: worldNavigatorWidth }}
    >
      {/* Resize handle on left edge */}
      <ResizeHandle side="left" onResize={handleResize} />

      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <h3 className="text-sm font-semibold">World Navigator</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleWorldNavigator}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-b px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={expandAll}
        >
          Expand All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={collapseAll}
        >
          Collapse All
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <MapPin className="mb-2 h-8 w-8" />
              <p>No locations yet</p>
              <p className="text-xs">
                Create locations to build your world map
              </p>
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.location.id}
                node={node}
                level={0}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
                selectedId={currentLocationId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-2 text-center text-xs text-muted-foreground">
        {entities.length} location{entities.length !== 1 ? "s" : ""}
      </div>
    </aside>
  );
}
