import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, MoreHorizontal, Eye, Trash2 } from "lucide-react";
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
import { useCampaignStore, useCharacterStore, useUIStore } from "@/stores";

export function CharactersPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useCharacterStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    lineage: "",
    occupation: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  // AI Generation
  const generator = useGenerator({
    campaignId: activeCampaignId ?? "",
    entityType: "character",
    onCreated: (id) => {
      fetchAll(activeCampaignId!);
      navigate(`/characters/${id}`);
    },
  });

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  const handleCreate = async () => {
    if (!newCharacter.name.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      const character = await create({
        campaign_id: activeCampaignId,
        name: newCharacter.name,
        lineage: newCharacter.lineage || undefined,
        occupation: newCharacter.occupation || undefined,
        is_alive: true,
      });
      setCreateDialogOpen(false);
      setNewCharacter({ name: "", lineage: "", occupation: "" });
      navigate(`/characters/${character.id}`);
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
        icon={Users}
        title="No Campaign Selected"
        description="Select a campaign to view characters"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Characters"
        description="NPCs and other characters in your world"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Character"
        actions={
          <GenerateButton
            entityType="character"
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
          icon={Users}
          title="No characters yet"
          description="Create your first character to bring your world to life"
          actionLabel="Create Character"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((character) => (
            <Link key={character.id} to={`/characters/${character.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{character.name}</CardTitle>
                    <Badge variant={character.is_alive ? "default" : "secondary"}>
                      {character.is_alive ? "Alive" : "Deceased"}
                    </Badge>
                  </div>
                  {(character.lineage || character.occupation) && (
                    <CardDescription>
                      {[character.lineage, character.occupation]
                        .filter(Boolean)
                        .join(" • ")}
                    </CardDescription>
                  )}
                </CardHeader>
                {character.description && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {character.description}
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
              <TableHead>Lineage</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((character) => (
              <TableRow key={character.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/characters/${character.id}`}
                    className="hover:underline"
                  >
                    {character.name}
                  </Link>
                </TableCell>
                <TableCell>{character.lineage || "—"}</TableCell>
                <TableCell>{character.occupation || "—"}</TableCell>
                <TableCell>
                  <Badge variant={character.is_alive ? "default" : "secondary"}>
                    {character.is_alive ? "Alive" : "Deceased"}
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
                        onClick={() => navigate(`/characters/${character.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(character.id)}
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
            <DialogTitle>Create Character</DialogTitle>
            <DialogDescription>
              Add a new NPC or character to your world
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Character name"
                value={newCharacter.name}
                onChange={(e) =>
                  setNewCharacter({ ...newCharacter, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lineage">Lineage</Label>
                <Input
                  id="lineage"
                  placeholder="Human, Elf, Dwarf..."
                  value={newCharacter.lineage}
                  onChange={(e) =>
                    setNewCharacter({ ...newCharacter, lineage: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="Blacksmith, Mage..."
                  value={newCharacter.occupation}
                  onChange={(e) =>
                    setNewCharacter({
                      ...newCharacter,
                      occupation: e.target.value,
                    })
                  }
                />
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
              {isCreating ? "Creating..." : "Create Character"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Character"
        description="Are you sure you want to delete this character? This action cannot be undone."
        onConfirm={handleDelete}
      />

      {/* Generation Preview */}
      <GenerationPreview
        open={generator.isPreviewOpen}
        onOpenChange={generator.closePreview}
        entityType="character"
        isLoading={generator.isLoading}
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
