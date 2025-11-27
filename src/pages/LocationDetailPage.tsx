import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Save, X, MapPin } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoadingState, DeleteDialog } from "@/components/common";
import { useLocationStore } from "@/stores";
import { LOCATION_TYPES, getLocationTypeLabel } from "@/lib/constants";

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useLocationStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    location_type: "settlement",
    parent_id: "",
    description: "",
    gm_notes: "",
    detail_level: 0,
  });

  const location = entities.find((l) => l.id === id);
  const parentLocation = location?.parent_id
    ? entities.find((l) => l.id === location.parent_id)
    : null;
  const childLocations = entities.filter((l) => l.parent_id === id);

  useEffect(() => {
    if (id && !location) {
      fetchOne(id);
    }
  }, [id, location, fetchOne]);

  useEffect(() => {
    if (location) {
      setEditForm({
        name: location.name,
        location_type: location.location_type || "settlement",
        parent_id: location.parent_id || "",
        description: location.description || "",
        gm_notes: location.gm_notes || "",
        detail_level: location.detail_level,
      });
    }
  }, [location]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        name: editForm.name,
        location_type: editForm.location_type,
        parent_id: editForm.parent_id || undefined,
        description: editForm.description || undefined,
        gm_notes: editForm.gm_notes || undefined,
        detail_level: editForm.detail_level,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/locations");
  };

  if (isLoading || !location) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/locations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            {isEditing ? (
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="text-2xl font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold">{location.name}</h1>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              {parentLocation && (
                <>
                  <span>in</span>
                  <Link
                    to={`/locations/${parentLocation.id}`}
                    className="hover:underline"
                  >
                    {parentLocation.name}
                  </Link>
                  <span>•</span>
                </>
              )}
              <span>{getLocationTypeLabel(location.location_type)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {location.detail_level}% detailed
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
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="places">
            Places ({childLocations.length})
          </TabsTrigger>
          <TabsTrigger value="gm-notes">GM Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <Select
                      value={editForm.location_type}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, location_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Location</Label>
                    <Select
                      value={editForm.parent_id || "none"}
                      onValueChange={(value) =>
                        setEditForm({
                          ...editForm,
                          parent_id: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (top-level)</SelectItem>
                        {entities
                          .filter((l) => l.id !== id)
                          .map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Detail Level ({editForm.detail_level}%)</Label>
                    <Input
                      type="range"
                      min={0}
                      max={100}
                      value={editForm.detail_level}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          detail_level: parseInt(e.target.value),
                        })
                      }
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <p>{getLocationTypeLabel(location.location_type)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Parent
                    </span>
                    <p>
                      {parentLocation ? (
                        <Link
                          to={`/locations/${parentLocation.id}`}
                          className="hover:underline"
                        >
                          {parentLocation.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Detail Level
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${location.detail_level}%` }}
                        />
                      </div>
                      <span>{location.detail_level}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Describe this location..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {location.description || "No description yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="places" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Child Locations</CardTitle>
              <CardDescription>
                Places contained within {location.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {childLocations.length === 0 ? (
                <p className="text-muted-foreground">
                  No child locations yet. Create locations with this as their
                  parent to see them here.
                </p>
              ) : (
                <div className="space-y-2">
                  {childLocations.map((child) => (
                    <Link
                      key={child.id}
                      to={`/locations/${child.id}`}
                      className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getLocationTypeLabel(child.location_type)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{child.detail_level}%</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gm-notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GM Notes</CardTitle>
              <CardDescription>Private notes only visible to you</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.gm_notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, gm_notes: e.target.value })
                  }
                  placeholder="Hidden information, plot hooks, secrets about this location..."
                  rows={8}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {location.gm_notes || "No GM notes yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Location"
        description={`Are you sure you want to delete "${location.name}"? This action cannot be undone. Child locations will become orphaned.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
