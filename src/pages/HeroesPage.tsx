import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sword, MoreHorizontal, Eye, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { useCampaignStore, useHeroStore, usePlayerStore, useUIStore } from "@/stores";

export function HeroesPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useHeroStore();
  const { entities: players, fetchAll: fetchPlayers } = usePlayerStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newHero, setNewHero] = useState({
    name: "",
    player_id: "",
    lineage: "",
    classes: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
      fetchPlayers(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll, fetchPlayers]);

  const handleCreate = async () => {
    if (!newHero.name.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      const hero = await create({
        campaign_id: activeCampaignId,
        name: newHero.name,
        player_id: newHero.player_id || undefined,
        lineage: newHero.lineage || undefined,
        classes: newHero.classes || undefined,
        description: newHero.description || undefined,
        is_active: true,
      });
      setCreateDialogOpen(false);
      setNewHero({ name: "", player_id: "", lineage: "", classes: "", description: "" });
      navigate(`/heroes/${hero.id}`);
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

  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return "—";
    const player = players.find((p) => p.id === playerId);
    return player?.name || "Unknown";
  };

  if (!activeCampaignId) {
    return (
      <EmptyState
        icon={Sword}
        title="No Campaign Selected"
        description="Select a campaign to view heroes"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Heroes"
        description="Player characters in your campaign"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Hero"
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={Sword}
          title="No heroes yet"
          description="Create your first hero to represent player characters"
          actionLabel="Create Hero"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((hero) => (
            <Link key={hero.id} to={`/heroes/${hero.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{hero.name}</CardTitle>
                    <Badge variant={hero.is_active ? "default" : "secondary"}>
                      {hero.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {(hero.lineage || hero.classes) && (
                    <CardDescription>
                      {[hero.lineage, hero.classes].filter(Boolean).join(" • ")}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Player: {getPlayerName(hero.player_id)}
                  </p>
                </CardContent>
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
              <TableHead>Class</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((hero) => (
              <TableRow key={hero.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/heroes/${hero.id}`}
                    className="hover:underline"
                  >
                    {hero.name}
                  </Link>
                </TableCell>
                <TableCell>{hero.lineage || "—"}</TableCell>
                <TableCell>{hero.classes || "—"}</TableCell>
                <TableCell>{getPlayerName(hero.player_id)}</TableCell>
                <TableCell>
                  <Badge variant={hero.is_active ? "default" : "secondary"}>
                    {hero.is_active ? "Active" : "Inactive"}
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
                        onClick={() => navigate(`/heroes/${hero.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(hero.id)}
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
            <DialogTitle>Create Hero</DialogTitle>
            <DialogDescription>
              Add a new player character to your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Hero name"
                value={newHero.name}
                onChange={(e) =>
                  setNewHero({ ...newHero, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player">Player</Label>
              <Select
                value={newHero.player_id}
                onValueChange={(value) =>
                  setNewHero({
                    ...newHero,
                    player_id: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No player assigned</SelectItem>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lineage">Lineage</Label>
                <Input
                  id="lineage"
                  placeholder="Human, Elf, Dwarf..."
                  value={newHero.lineage}
                  onChange={(e) =>
                    setNewHero({ ...newHero, lineage: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classes">Class(es)</Label>
                <Input
                  id="classes"
                  placeholder="Fighter, Wizard..."
                  value={newHero.classes}
                  onChange={(e) =>
                    setNewHero({ ...newHero, classes: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description..."
                value={newHero.description}
                onChange={(e) =>
                  setNewHero({ ...newHero, description: e.target.value })
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
              {isCreating ? "Creating..." : "Create Hero"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Hero"
        description="Are you sure you want to delete this hero? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
