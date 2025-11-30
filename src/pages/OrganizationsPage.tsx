import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { GenerateButton, GenerationPreview } from "@/components/ai";
import { useGenerator } from "@/hooks";
import { useCampaignStore, useOrganizationStore, useUIStore } from "@/stores";
import { ORG_TYPES, getOrgTypeLabel } from "@/lib/constants";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useOrganizationStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // AI Generation
  const generator = useGenerator({
    campaignId: activeCampaignId ?? "",
    entityType: "organization",
    onCreated: (id) => {
      fetchAll(activeCampaignId!);
      navigate(`/organizations/${id}`);
    },
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOrg, setNewOrg] = useState({
    name: "",
    org_type: "guild",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  const handleCreate = async () => {
    if (!newOrg.name.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      const org = await create({
        campaign_id: activeCampaignId,
        name: newOrg.name,
        org_type: newOrg.org_type,
        is_active: true,
      });
      setCreateDialogOpen(false);
      setNewOrg({ name: "", org_type: "guild" });
      navigate(`/organizations/${org.id}`);
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
        icon={Building2}
        title="No Campaign Selected"
        description="Select a campaign to view organizations"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Factions, guilds, and groups in your world"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Organization"
        actions={
          <GenerateButton
            entityType="organization"
            onGenerate={generator.generate}
            isLoading={generator.isLoading}
          >
            Generate
          </GenerateButton>
        }
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create your first organization to add factions to your world"
          actionLabel="Create Organization"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((org) => (
            <Link key={org.id} to={`/organizations/${org.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant="outline">
                        {getOrgTypeLabel(org.org_type)}
                      </Badge>
                      {!org.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {org.description && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {org.description}
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
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/organizations/${org.id}`}
                    className="hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getOrgTypeLabel(org.org_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={org.is_active ? "default" : "secondary"}>
                    {org.is_active ? "Active" : "Inactive"}
                  </Badge>
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
                        onClick={() => navigate(`/organizations/${org.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(org.id)}
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
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Add a new faction or group to your world
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Organization name"
                value={newOrg.name}
                onChange={(e) =>
                  setNewOrg({ ...newOrg, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_type">Type</Label>
              <Select
                value={newOrg.org_type}
                onValueChange={(value) =>
                  setNewOrg({ ...newOrg, org_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {isCreating ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Organization"
        description="Are you sure you want to delete this organization? This action cannot be undone."
        onConfirm={handleDelete}
      />

      {/* Generation Preview */}
      <GenerationPreview
        open={generator.isPreviewOpen}
        onOpenChange={generator.closePreview}
        entityType="organization"
        isLoading={generator.isLoading}
        isResearching={generator.isResearching}
        researchProgress={generator.researchProgress}
        researchSteps={generator.researchSteps}
        result={generator.result}
        partialEntity={generator.partialEntity}
        onAccept={generator.accept}
        onRegenerate={generator.regenerate}
        isCreating={generator.isCreating}
        createError={generator.createError}
      />
    </div>
  );
}
