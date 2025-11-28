import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Save, X, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingState, DeleteDialog } from "@/components/common";
import { useTimelineEventStore } from "@/stores";
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

export function TimelineEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useTimelineEventStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    date_display: "",
    sort_order: 0,
    description: "",
    significance: "local",
    is_public: true,
  });

  const event = entities.find((e) => e.id === id);

  useEffect(() => {
    if (id && !event) {
      fetchOne(id);
    }
  }, [id, event, fetchOne]);

  useEffect(() => {
    if (event) {
      setEditForm({
        title: event.title,
        date_display: event.date_display,
        sort_order: event.sort_order,
        description: event.description || "",
        significance: event.significance,
        is_public: event.is_public,
      });
    }
  }, [event]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        title: editForm.title,
        date_display: editForm.date_display,
        sort_order: editForm.sort_order,
        description: editForm.description || undefined,
        significance: editForm.significance,
        is_public: editForm.is_public,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/timeline");
  };

  const togglePublic = async () => {
    if (!id || !event) return;
    await update(id, { is_public: !event.is_public });
  };

  if (isLoading || !event) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/timeline">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            {isEditing ? (
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="text-2xl font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold">{event.title}</h1>
            )}
            <p className="text-muted-foreground">{event.date_display}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={event.is_public ? "outline" : "secondary"}
            className="cursor-pointer gap-1"
            onClick={togglePublic}
          >
            {event.is_public ? (
              <>
                <Eye className="h-3 w-3" /> Public
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" /> Secret
              </>
            )}
          </Badge>

          <Badge variant={getSignificanceVariant(event.significance)}>
            {getSignificanceLabel(event.significance)}
          </Badge>

          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date Display</Label>
                    <Input
                      value={editForm.date_display}
                      onChange={(e) =>
                        setEditForm({ ...editForm, date_display: e.target.value })
                      }
                      placeholder="Year 1, Spring / Day 15 / etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={editForm.sort_order}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          sort_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers appear first in the timeline
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Significance</Label>
                    <Select
                      value={editForm.significance}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, significance: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label>Visibility</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={editForm.is_public}
                        onCheckedChange={(checked: boolean) =>
                          setEditForm({ ...editForm, is_public: checked })
                        }
                      />
                      <span className="text-sm">
                        {editForm.is_public ? "Public" : "Secret (GM only)"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-sm text-muted-foreground">Date</span>
                  <p>{event.date_display}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Sort Order</span>
                  <p>{event.sort_order}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  <p>{event.is_public ? "Public" : "Secret (GM only)"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>
              What happened during this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Describe what happened..."
                rows={8}
              />
            ) : (
              <p className="whitespace-pre-wrap">
                {event.description || "No description yet."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Event"
        description={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
