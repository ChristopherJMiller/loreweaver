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
import { useCampaignStore, usePlayerStore, useUIStore } from "@/stores";

export function PlayersPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = usePlayerStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    preferences: "",
    boundaries: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  const handleCreate = async () => {
    if (!newPlayer.name.trim() || !activeCampaignId) return;

    setIsCreating(true);
    try {
      const player = await create({
        campaign_id: activeCampaignId,
        name: newPlayer.name,
        preferences: newPlayer.preferences || undefined,
        boundaries: newPlayer.boundaries || undefined,
      });
      setCreateDialogOpen(false);
      setNewPlayer({ name: "", preferences: "", boundaries: "" });
      navigate(`/players/${player.id}`);
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
        description="Select a campaign to view players"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Players"
        description="Real-world players in your campaign"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Player"
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players yet"
          description="Add your first player to track preferences and boundaries"
          actionLabel="Add Player"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((player) => (
            <Link key={player.id} to={`/players/${player.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{player.name}</CardTitle>
                  {player.preferences && (
                    <CardDescription className="line-clamp-1">
                      Enjoys: {player.preferences}
                    </CardDescription>
                  )}
                </CardHeader>
                {player.boundaries && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      Boundaries: {player.boundaries}
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
              <TableHead>Preferences</TableHead>
              <TableHead>Boundaries</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/players/${player.id}`}
                    className="hover:underline"
                  >
                    {player.name}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {player.preferences || "—"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {player.boundaries || "—"}
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
                        onClick={() => navigate(`/players/${player.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(player.id)}
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
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Add a real-world player to your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Player's name"
                value={newPlayer.name}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferences">Preferences</Label>
              <Textarea
                id="preferences"
                placeholder="What they enjoy in games (combat, roleplay, puzzles...)"
                value={newPlayer.preferences}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, preferences: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boundaries">Boundaries</Label>
              <Textarea
                id="boundaries"
                placeholder="Content to avoid or handle carefully..."
                value={newPlayer.boundaries}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, boundaries: e.target.value })
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
              {isCreating ? "Adding..." : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Player"
        description="Are you sure you want to remove this player? Their heroes will remain but will no longer be linked to a player."
        onConfirm={handleDelete}
      />
    </div>
  );
}
