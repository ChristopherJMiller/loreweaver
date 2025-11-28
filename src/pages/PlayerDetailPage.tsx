import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LoadingState, DeleteDialog } from "@/components/common";
import { usePlayerStore, useHeroStore, useCampaignStore } from "@/stores";

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchOne, update, remove } = usePlayerStore();
  const { entities: heroes, fetchAll: fetchHeroes } = useHeroStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    preferences: "",
    boundaries: "",
    notes: "",
  });

  const player = entities.find((p) => p.id === id);
  const playerHeroes = heroes.filter((h) => h.player_id === id);

  useEffect(() => {
    if (id && !player) {
      fetchOne(id);
    }
  }, [id, player, fetchOne]);

  useEffect(() => {
    if (activeCampaignId) {
      fetchHeroes(activeCampaignId);
    }
  }, [activeCampaignId, fetchHeroes]);

  useEffect(() => {
    if (player) {
      setEditForm({
        name: player.name,
        preferences: player.preferences || "",
        boundaries: player.boundaries || "",
        notes: player.notes || "",
      });
    }
  }, [player]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        name: editForm.name,
        preferences: editForm.preferences || undefined,
        boundaries: editForm.boundaries || undefined,
        notes: editForm.notes || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/players");
  };

  if (isLoading || !player) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/players">
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
              <h1 className="text-2xl font-bold">{player.name}</h1>
            )}
            <p className="text-muted-foreground">
              {playerHeroes.length} hero{playerHeroes.length !== 1 ? "es" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              What this player enjoys in games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editForm.preferences}
                onChange={(e) =>
                  setEditForm({ ...editForm, preferences: e.target.value })
                }
                placeholder="Combat, roleplay, puzzles, exploration..."
                rows={4}
              />
            ) : (
              <p className="whitespace-pre-wrap">
                {player.preferences || "No preferences recorded."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Boundaries</CardTitle>
            <CardDescription>
              Content to avoid or handle with care
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editForm.boundaries}
                onChange={(e) =>
                  setEditForm({ ...editForm, boundaries: e.target.value })
                }
                placeholder="Topics or content to avoid..."
                rows={4}
              />
            ) : (
              <p className="whitespace-pre-wrap">
                {player.boundaries || "No boundaries recorded."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GM Notes</CardTitle>
          <CardDescription>
            Private notes about this player
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editForm.notes}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
              placeholder="Scheduling preferences, play style observations..."
              rows={4}
            />
          ) : (
            <p className="whitespace-pre-wrap">
              {player.notes || "No notes yet."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Heroes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Heroes</CardTitle>
          <CardDescription>
            Characters played by {player.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {playerHeroes.length === 0 ? (
            <p className="text-muted-foreground">
              No heroes linked to this player yet.
            </p>
          ) : (
            <div className="space-y-2">
              {playerHeroes.map((hero) => (
                <Link
                  key={hero.id}
                  to={`/heroes/${hero.id}`}
                  className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{hero.name}</p>
                    {(hero.lineage || hero.classes) && (
                      <p className="text-sm text-muted-foreground">
                        {[hero.lineage, hero.classes].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Player"
        description={`Are you sure you want to remove "${player.name}"? Their heroes will remain but will no longer be linked to a player.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
