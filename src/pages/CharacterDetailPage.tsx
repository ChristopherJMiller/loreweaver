import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  Heart,
  Skull,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoadingState, DeleteDialog } from "@/components/common";
import { useCharacterStore } from "@/stores";

export function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useCharacterStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    lineage: "",
    occupation: "",
    description: "",
    personality: "",
    motivations: "",
    secrets: "",
    voice_notes: "",
    is_alive: true,
  });

  const character = entities.find((c) => c.id === id);

  useEffect(() => {
    if (id && !character) {
      fetchOne(id);
    }
  }, [id, character, fetchOne]);

  useEffect(() => {
    if (character) {
      setEditForm({
        name: character.name,
        lineage: character.lineage || "",
        occupation: character.occupation || "",
        description: character.description || "",
        personality: character.personality || "",
        motivations: character.motivations || "",
        secrets: character.secrets || "",
        voice_notes: character.voice_notes || "",
        is_alive: character.is_alive,
      });
    }
  }, [character]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        name: editForm.name,
        lineage: editForm.lineage || undefined,
        occupation: editForm.occupation || undefined,
        description: editForm.description || undefined,
        personality: editForm.personality || undefined,
        motivations: editForm.motivations || undefined,
        secrets: editForm.secrets || undefined,
        voice_notes: editForm.voice_notes || undefined,
        is_alive: editForm.is_alive,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/characters");
  };

  const toggleAlive = async () => {
    if (!id || !character) return;
    await update(id, { is_alive: !character.is_alive });
  };

  if (isLoading || !character) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/characters">
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
              <h1 className="text-2xl font-bold">{character.name}</h1>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              {character.lineage && <span>{character.lineage}</span>}
              {character.lineage && character.occupation && <span>•</span>}
              {character.occupation && <span>{character.occupation}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={character.is_alive ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={toggleAlive}
          >
            {character.is_alive ? (
              <>
                <Heart className="mr-1 h-3 w-3" /> Alive
              </>
            ) : (
              <>
                <Skull className="mr-1 h-3 w-3" /> Deceased
              </>
            )}
          </Badge>

          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
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
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="secrets">GM Notes</TabsTrigger>
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
                    <Label>Occupation</Label>
                    <Input
                      value={editForm.occupation}
                      onChange={(e) =>
                        setEditForm({ ...editForm, occupation: e.target.value })
                      }
                      placeholder="Blacksmith, Mage..."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Lineage
                    </span>
                    <p>{character.lineage || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Occupation
                    </span>
                    <p>{character.occupation || "—"}</p>
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
                  placeholder="Physical appearance, mannerisms, notable features..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {character.description || "No description yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personality</CardTitle>
              <CardDescription>
                How this character acts and speaks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.personality}
                  onChange={(e) =>
                    setEditForm({ ...editForm, personality: e.target.value })
                  }
                  placeholder="Personality traits, quirks, behaviors..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {character.personality || "No personality notes yet."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Motivations</CardTitle>
              <CardDescription>What drives this character</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.motivations}
                  onChange={(e) =>
                    setEditForm({ ...editForm, motivations: e.target.value })
                  }
                  placeholder="Goals, desires, fears..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {character.motivations || "No motivations noted yet."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice Notes</CardTitle>
              <CardDescription>
                How to roleplay this character
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.voice_notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, voice_notes: e.target.value })
                  }
                  placeholder="Accent, catch phrases, mannerisms..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {character.voice_notes || "No voice notes yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secrets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Secrets</CardTitle>
              <CardDescription>GM-only information</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.secrets}
                  onChange={(e) =>
                    setEditForm({ ...editForm, secrets: e.target.value })
                  }
                  placeholder="Hidden information, plot hooks, true identity..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {character.secrets || "No secrets recorded."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Character"
        description={`Are you sure you want to delete "${character.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
