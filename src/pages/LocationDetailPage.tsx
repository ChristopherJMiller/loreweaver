import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, DeleteDialog } from "@/components/common";
import {
  DocumentHeader,
  DocumentCanvas,
  MetadataSection,
  RelationshipsPanel,
  DocumentSection,
} from "@/components/document";
import { DetailLevelBar, LocationBreadcrumb } from "@/components/location";
import { useLocationStore, useCampaignStore, useRelationshipStore } from "@/stores";
import { LOCATION_TYPES, getLocationTypeLabel } from "@/lib/constants";

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useLocationStore();
  const { activeCampaignId } = useCampaignStore();
  const { relationships, fetchForEntity } = useRelationshipStore();

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
    if (id) {
      fetchForEntity("location", id);
    }
  }, [id, fetchForEntity]);

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

  const handleCancel = () => {
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
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/locations");
  };

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !location) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "description",
      title: "Description",
      content: editForm.description,
      placeholder: "Describe this location...",
    },
    {
      id: "gm_notes",
      title: "GM Notes",
      content: editForm.gm_notes,
      placeholder: "Hidden information, plot hooks, secrets about this location...",
    },
  ];

  const titleContent = isEditing ? (
    <Input
      value={editForm.name}
      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
      className="text-2xl font-bold h-auto py-1"
    />
  ) : (
    location.name
  );

  const subtitle = (
    <>
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
    </>
  );

  const badges = (
    <div className="w-32">
      <DetailLevelBar
        location={location}
        relationships={relationships}
        childCount={childLocations.length}
      />
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Breadcrumb stays outside the document flow */}
      <div className="mb-4">
        <LocationBreadcrumb location={location} allLocations={entities} />
      </div>

      <DocumentHeader
        title={titleContent}
        subtitle={subtitle}
        badges={badges}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteDialogOpen(true)}
        backLink="/locations"
      />

      <DocumentCanvas
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || undefined}
      >
        <MetadataSection defaultOpen={isEditing}>
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
              <div className="sm:col-span-2">
                <span className="text-sm text-muted-foreground">Detail Level</span>
                <DetailLevelBar
                  location={location}
                  relationships={relationships}
                  childCount={childLocations.length}
                  showLabel
                  className="mt-1 w-48"
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
                <span className="text-sm text-muted-foreground">Parent</span>
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
              <div className="sm:col-span-2">
                <span className="text-sm text-muted-foreground">Detail Level</span>
                <DetailLevelBar
                  location={location}
                  relationships={relationships}
                  childCount={childLocations.length}
                  showLabel
                  className="mt-1 w-48"
                />
              </div>
            </div>
          )}
        </MetadataSection>

        {/* Child Locations Section */}
        {childLocations.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Places ({childLocations.length})</CardTitle>
              <CardDescription>
                Locations contained within {location.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {id && location && (
          <RelationshipsPanel
            entityType="location"
            entityId={id}
            entityName={location.name}
          />
        )}
      </DocumentCanvas>

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
