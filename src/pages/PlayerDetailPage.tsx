import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, DeleteDialog } from "@/components/common";
import {
  DocumentHeader,
  DocumentCanvas,
  DocumentSection,
} from "@/components/document";
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (player) {
      setEditForm({
        name: player.name,
        preferences: player.preferences || "",
        boundaries: player.boundaries || "",
        notes: player.notes || "",
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/players");
  };

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !player) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "preferences",
      title: "Preferences",
      content: editForm.preferences,
      placeholder: "Combat, roleplay, puzzles, exploration...",
    },
    {
      id: "boundaries",
      title: "Boundaries",
      content: editForm.boundaries,
      placeholder: "Topics or content to avoid...",
    },
    {
      id: "notes",
      title: "GM Notes",
      content: editForm.notes,
      placeholder: "Scheduling preferences, play style observations...",
    },
  ];

  const titleContent = isEditing ? (
    <Input
      value={editForm.name}
      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
      className="text-2xl font-bold h-auto py-1"
    />
  ) : (
    player.name
  );

  const subtitle = (
    <span>
      {playerHeroes.length} hero{playerHeroes.length !== 1 ? "es" : ""}
    </span>
  );

  return (
    <div className="space-y-0">
      <DocumentHeader
        title={titleContent}
        subtitle={subtitle}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onClose={() => setIsEditing(false)}
        onDelete={() => setDeleteDialogOpen(true)}
        backLink="/players"
      />

      <DocumentCanvas
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || ""}
        entityType="player"
        entityId={id || ""}
        entityName={player.name}
      >
        {/* Heroes Section */}
        <Card className="mt-8">
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
      </DocumentCanvas>

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
