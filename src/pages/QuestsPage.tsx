import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScrollText, MoreHorizontal, Eye, Trash2 } from "lucide-react";
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
import { useCampaignStore, useQuestStore, useUIStore } from "@/stores";
import {
  QUEST_STATUS,
  PLOT_TYPES,
  getQuestStatusLabel,
  getPlotTypeLabel,
} from "@/lib/constants";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "abandoned":
      return "secondary";
    default:
      return "outline";
  }
}

export function QuestsPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useQuestStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // AI Generation
  const generator = useGenerator({
    campaignId: activeCampaignId ?? "",
    entityType: "quest",
    onCreated: (id) => {
      fetchAll(activeCampaignId!);
      navigate(`/quests/${id}`);
    },
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newQuest, setNewQuest] = useState({
    name: "",
    plot_type: "side",
    status: "planned",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  const handleCreate = async () => {
    if (!newQuest.name.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      const quest = await create({
        campaign_id: activeCampaignId,
        name: newQuest.name,
        plot_type: newQuest.plot_type,
        status: newQuest.status,
      });
      setCreateDialogOpen(false);
      setNewQuest({ name: "", plot_type: "side", status: "planned" });
      navigate(`/quests/${quest.id}`);
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
        icon={ScrollText}
        title="No Campaign Selected"
        description="Select a campaign to view quests"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Quests"
        description="Plots and storylines in your campaign"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Quest"
        actions={
          <GenerateButton
            entityType="quest"
            onGenerate={generator.generate}
            isLoading={generator.isLoading}
            expandable
          >
            Generate
          </GenerateButton>
        }
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No quests yet"
          description="Create your first quest to track plots and storylines"
          actionLabel="Create Quest"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((quest) => (
            <Link key={quest.id} to={`/quests/${quest.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{quest.name}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant="outline">
                        {getPlotTypeLabel(quest.plot_type)}
                      </Badge>
                      <Badge variant={getStatusVariant(quest.status)}>
                        {getQuestStatusLabel(quest.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {quest.description && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {quest.description}
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
            {entities.map((quest) => (
              <TableRow key={quest.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/quests/${quest.id}`}
                    className="hover:underline"
                  >
                    {quest.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getPlotTypeLabel(quest.plot_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(quest.status)}>
                    {getQuestStatusLabel(quest.status)}
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
                        onClick={() => navigate(`/quests/${quest.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(quest.id)}
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
            <DialogTitle>Create Quest</DialogTitle>
            <DialogDescription>
              Add a new plot or storyline to your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Quest name"
                value={newQuest.name}
                onChange={(e) =>
                  setNewQuest({ ...newQuest, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plot_type">Type</Label>
                <Select
                  value={newQuest.plot_type}
                  onValueChange={(value) =>
                    setNewQuest({ ...newQuest, plot_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLOT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newQuest.status}
                  onValueChange={(value) =>
                    setNewQuest({ ...newQuest, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUEST_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {isCreating ? "Creating..." : "Create Quest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Quest"
        description="Are you sure you want to delete this quest? This action cannot be undone."
        onConfirm={handleDelete}
      />

      {/* Generation Preview */}
      <GenerationPreview
        open={generator.isPreviewOpen}
        onOpenChange={generator.closePreview}
        entityType="quest"
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
