import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { UserCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState, DeleteDialog } from "@/components/common";
import {
  DocumentHeader,
  DocumentCanvas,
  MetadataSection,
  DocumentSection,
} from "@/components/document";
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

  const handleCancel = () => {
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
    setIsEditing(false);
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

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !hero) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "description",
      title: "Description",
      content: editForm.description,
      placeholder: "Physical appearance, personality...",
    },
    {
      id: "backstory",
      title: "Backstory",
      content: editForm.backstory,
      placeholder: "Where they came from, what shaped them...",
    },
    {
      id: "goals",
      title: "Goals",
      content: editForm.goals,
      placeholder: "Short-term and long-term goals...",
    },
    {
      id: "bonds",
      title: "Bonds",
      content: editForm.bonds,
      placeholder: "Family, friends, enemies, organizations...",
    },
  ];

  const badges = (
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
  );

  const titleContent = isEditing ? (
    <Input
      value={editForm.name}
      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
      className="text-2xl font-bold h-auto py-1"
    />
  ) : (
    hero.name
  );

  const subtitle = (
    <>
      {hero.lineage && <span>{hero.lineage}</span>}
      {hero.lineage && hero.classes && <span>•</span>}
      {hero.classes && <span>{hero.classes}</span>}
      {player && (
        <>
          <span>•</span>
          <Link to={`/players/${player.id}`} className="hover:underline">
            {player.name}
          </Link>
        </>
      )}
    </>
  );

  return (
    <div className="space-y-0">
      <DocumentHeader
        title={titleContent}
        subtitle={subtitle}
        badges={badges}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteDialogOpen(true)}
        backLink="/heroes"
      />

      <DocumentCanvas
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || undefined}
      >
        <MetadataSection defaultOpen={isEditing}>
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
                <span className="text-sm text-muted-foreground">Lineage</span>
                <p>{hero.lineage || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Class(es)</span>
                <p>{hero.classes || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Player</span>
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
        </MetadataSection>
      </DocumentCanvas>

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
