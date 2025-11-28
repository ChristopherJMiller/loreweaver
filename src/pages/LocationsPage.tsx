import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { useCampaignStore, useLocationStore, useUIStore } from "@/stores";
import { LOCATION_TYPES, getLocationTypeLabel, getValidParentTypes } from "@/lib/constants";

export function LocationsPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useLocationStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState({
    name: "",
    location_type: "settlement",
    parent_id: null as string | null,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  const handleCreate = async () => {
    if (!newLocation.name.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      const location = await create({
        campaign_id: activeCampaignId,
        name: newLocation.name,
        location_type: newLocation.location_type,
        parent_id: newLocation.parent_id || undefined,
        detail_level: 0,
      });
      setCreateDialogOpen(false);
      setNewLocation({
        name: "",
        location_type: "settlement",
        parent_id: null,
      });
      navigate(`/locations/${location.id}`);
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

  const getParentName = (parentId: string | null): string => {
    if (!parentId) return "—";
    const parent = entities.find((l) => l.id === parentId);
    return parent?.name || "—";
  };

  if (!activeCampaignId) {
    return (
      <EmptyState
        icon={MapPin}
        title="No Campaign Selected"
        description="Select a campaign to view locations"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Places and regions in your world"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Location"
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations yet"
          description="Create your first location to start mapping your world"
          actionLabel="Create Location"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((location) => (
            <Link key={location.id} to={`/locations/${location.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <Badge variant="outline">
                      {getLocationTypeLabel(location.location_type)}
                    </Badge>
                  </div>
                  {location.parent_id && (
                    <CardDescription>
                      in {getParentName(location.parent_id)}
                    </CardDescription>
                  )}
                </CardHeader>
                {location.description && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {location.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Detail Level</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/locations/${location.id}`}
                    className="hover:underline"
                  >
                    {location.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getLocationTypeLabel(location.location_type)}
                  </Badge>
                </TableCell>
                <TableCell>{getParentName(location.parent_id)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${location.detail_level}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {location.detail_level}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/locations/${location.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(location.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
            <DialogDescription>
              Add a new place to your world
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Location name"
                value={newLocation.name}
                onChange={(e) =>
                  setNewLocation({ ...newLocation, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_type">Type</Label>
                <Select
                  value={newLocation.location_type}
                  onValueChange={(value) => {
                    // Check if current parent is still valid for new type
                    const validTypes = getValidParentTypes(value);
                    const currentParent = entities.find(l => l.id === newLocation.parent_id);
                    const parentStillValid = !currentParent || validTypes.includes(currentParent.location_type);

                    setNewLocation({
                      ...newLocation,
                      location_type: value,
                      parent_id: parentStillValid ? newLocation.parent_id : null,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
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
                <Label htmlFor="parent">Parent Location</Label>
                {(() => {
                  const validParentTypes = getValidParentTypes(newLocation.location_type);
                  const validParentLocations = entities.filter(
                    (loc) => validParentTypes.includes(loc.location_type)
                  );
                  const isWorldType = newLocation.location_type === "world";

                  if (isWorldType) {
                    return (
                      <p className="text-sm text-muted-foreground py-2">
                        Worlds are top-level locations.
                      </p>
                    );
                  }

                  return (
                    <>
                      <SearchableSelect
                        value={newLocation.parent_id}
                        onValueChange={(value) =>
                          setNewLocation({ ...newLocation, parent_id: value })
                        }
                        placeholder="Select parent..."
                        searchPlaceholder="Search locations..."
                        emptyText={validParentLocations.length === 0
                          ? "No valid parent locations exist yet"
                          : "No locations found"}
                        items={validParentLocations}
                        getItemId={(loc) => loc.id}
                        getItemLabel={(loc) => loc.name}
                        getItemGroup={(loc) => getLocationTypeLabel(loc.location_type)}
                        groupOrder={LOCATION_TYPES.map((t) => t.label)}
                        allowNone
                        noneLabel="None (top-level)"
                        className="w-full"
                      />
                      {validParentLocations.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Create a larger location type first.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
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
              {isCreating ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
