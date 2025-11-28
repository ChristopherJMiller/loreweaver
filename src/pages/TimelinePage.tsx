import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, MoreHorizontal, Eye, Trash2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  DeleteDialog,
} from "@/components/common";
import { useCampaignStore, useTimelineEventStore, useUIStore } from "@/stores";
import { SIGNIFICANCE_LEVELS, getSignificanceLabel } from "@/lib/constants";

function getSignificanceVariant(significance: string): "default" | "secondary" | "destructive" | "outline" {
  switch (significance) {
    case "world":
      return "destructive";
    case "regional":
      return "default";
    case "local":
      return "secondary";
    default:
      return "outline";
  }
}

export function TimelinePage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useTimelineEventStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date_display: "",
    significance: "local",
    is_public: true,
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  // Sort events by sort_order
  const sortedEvents = [...entities].sort((a, b) => a.sort_order - b.sort_order);

  const handleCreate = async () => {
    if (!newEvent.title.trim() || !newEvent.date_display.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      // Calculate sort_order - append to end
      const maxSortOrder = entities.length > 0
        ? Math.max(...entities.map(e => e.sort_order))
        : 0;

      const event = await create({
        campaign_id: activeCampaignId,
        title: newEvent.title,
        date_display: newEvent.date_display,
        sort_order: maxSortOrder + 1,
        significance: newEvent.significance,
        is_public: newEvent.is_public,
        description: newEvent.description || undefined,
      });
      setCreateDialogOpen(false);
      setNewEvent({
        title: "",
        date_display: "",
        significance: "local",
        is_public: true,
        description: "",
      });
      navigate(`/timeline/${event.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await remove(selectedId);
    setSelectedId(null);
  };

  const openDeleteDialog = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  if (!activeCampaignId) {
    return (
      <EmptyState
        icon={Clock}
        title="No Campaign Selected"
        description="Select a campaign to view timeline events"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Timeline"
        description="Chronological events in your campaign"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Event"
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timeline events yet"
          description="Create your first event to build your campaign's history"
          actionLabel="Create Event"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {/* Timeline View */}
          <div className="relative border-l-2 border-muted-foreground/20 pl-6 ml-4">
            {sortedEvents.map((event) => (
              <div key={event.id} className="relative pb-8 last:pb-0">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-background ${
                    event.significance === "critical"
                      ? "bg-destructive"
                      : event.significance === "major"
                        ? "bg-primary"
                        : event.significance === "moderate"
                          ? "bg-secondary"
                          : "bg-muted"
                  }`}
                />

                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/timeline/${event.id}`}>
                          <CardTitle className="text-lg hover:underline">
                            {event.title}
                          </CardTitle>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {event.date_display}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!event.is_public && (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            Secret
                          </Badge>
                        )}
                        <Badge variant={getSignificanceVariant(event.significance)}>
                          {getSignificanceLabel(event.significance)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/timeline/${event.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openDeleteDialog(event.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Timeline Event</DialogTitle>
            <DialogDescription>
              Add a new event to your campaign's history
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_display">Date *</Label>
              <Input
                id="date_display"
                placeholder="Year 1, Spring / Day 15 / etc."
                value={newEvent.date_display}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date_display: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Use any date format that fits your campaign
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="significance">Significance</Label>
                <Select
                  value={newEvent.significance}
                  onValueChange={(value) =>
                    setNewEvent({ ...newEvent, significance: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select significance" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNIFICANCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_public">Visibility</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="is_public"
                    checked={newEvent.is_public}
                    onCheckedChange={(checked: boolean) =>
                      setNewEvent({ ...newEvent, is_public: checked })
                    }
                  />
                  <span className="text-sm">
                    {newEvent.is_public ? "Public" : "Secret (GM only)"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What happened during this event..."
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Event"
        description="Are you sure you want to delete this timeline event? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
