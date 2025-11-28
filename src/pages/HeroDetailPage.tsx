import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  UserCheck,
  UserX,
} from "lucide-react";
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
import { useHeroStore, usePlayerStore, useCampaignStore } from "@/stores";

export function HeroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchOne, update, remove } = useHeroStore();
  const { entities: players, fetchAll: fetchPlayers } = usePlayerStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    player_id: "",
    lineage: "",
    classes: "",
    description: "",
    backstory: "",
    goals: "",
    bonds: "",
    is_active: true,
  });

  const hero = entities.find((h) => h.id === id);
  const player = hero?.player_id
    ? players.find((p) => p.id === hero.player_id)
    : null;

  useEffect(() => {
    if (id && !hero) {
      fetchOne(id);
    }
  }, [id, hero, fetchOne]);

  useEffect(() => {
    if (activeCampaignId) {
      fetchPlayers(activeCampaignId);
    }
  }, [activeCampaignId, fetchPlayers]);

  useEffect(() => {
    if (hero) {
      setEditForm({
        name: hero.name,
        player_id: hero.player_id || "",
        lineage: hero.lineage || "",
        classes: hero.classes || "",
        description: hero.description || "",
        backstory: hero.backstory || "",
        goals: hero.goals || "",
        bonds: hero.bonds || "",
        is_active: hero.is_active,
      });
    }
  }, [hero]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        name: editForm.name,
        player_id: editForm.player_id || undefined,
        lineage: editForm.lineage || undefined,
        classes: editForm.classes || undefined,
        description: editForm.description || undefined,
        backstory: editForm.backstory || undefined,
        goals: editForm.goals || undefined,
        bonds: editForm.bonds || undefined,
        is_active: editForm.is_active,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/heroes");
  };

  const toggleActive = async () => {
    if (!id || !hero) return;
    await update(id, { is_active: !hero.is_active });
  };

  if (isLoading || !hero) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/heroes">
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
              <h1 className="text-2xl font-bold">{hero.name}</h1>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              {hero.lineage && <span>{hero.lineage}</span>}
              {hero.lineage && hero.classes && <span>•</span>}
              {hero.classes && <span>{hero.classes}</span>}
              {player && (
                <>
                  <span>•</span>
                  <Link
                    to={`/players/${player.id}`}
                    className="hover:underline"
                  >
                    {player.name}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={hero.is_active ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={toggleActive}
          >
            {hero.is_active ? (
              <>
                <UserCheck className="mr-1 h-3 w-3" /> Active
              </>
            ) : (
              <>
                <UserX className="mr-1 h-3 w-3" /> Inactive
              </>
            )}
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
          <TabsTrigger value="backstory">Backstory</TabsTrigger>
          <TabsTrigger value="goals">Goals & Bonds</TabsTrigger>
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
                    <Label>Lineage</Label>
                    <Input
                      value={editForm.lineage}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lineage: e.target.value })
                      }
                      placeholder="Human, Elf, Dwarf..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Class(es)</Label>
                    <Input
                      value={editForm.classes}
                      onChange={(e) =>
                        setEditForm({ ...editForm, classes: e.target.value })
                      }
                      placeholder="Fighter, Wizard..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Player</Label>
                    <Select
                      value={editForm.player_id || "none"}
                      onValueChange={(value) =>
                        setEditForm({
                          ...editForm,
                          player_id: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No player assigned</SelectItem>
                        {players.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Lineage
                    </span>
                    <p>{hero.lineage || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Class(es)
                    </span>
                    <p>{hero.classes || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Player
                    </span>
                    <p>
                      {player ? (
                        <Link
                          to={`/players/${player.id}`}
                          className="hover:underline"
                        >
                          {player.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </p>
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
                  placeholder="Physical appearance, personality..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {hero.description || "No description yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backstory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backstory</CardTitle>
              <CardDescription>
                The hero's history and origin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.backstory}
                  onChange={(e) =>
                    setEditForm({ ...editForm, backstory: e.target.value })
                  }
                  placeholder="Where they came from, what shaped them..."
                  rows={8}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {hero.backstory || "No backstory yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <CardDescription>What drives this hero</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.goals}
                  onChange={(e) =>
                    setEditForm({ ...editForm, goals: e.target.value })
                  }
                  placeholder="Short-term and long-term goals..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {hero.goals || "No goals recorded."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bonds</CardTitle>
              <CardDescription>
                Connections to other characters and the world
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.bonds}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bonds: e.target.value })
                  }
                  placeholder="Family, friends, enemies, organizations..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {hero.bonds || "No bonds recorded."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Hero"
        description={`Are you sure you want to delete "${hero.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
