import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, Skull } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingState, DeleteDialog } from "@/components/common";
import {
  DocumentHeader,
  DocumentCanvasWithExpansion,
  MetadataSection,
  RelationshipsPanel,
} from "@/components/document";
import type { DocumentSection } from "@/components/document";
import { useCharacterStore, useCampaignStore } from "@/stores";

export function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useCharacterStore();
  const { activeCampaignId } = useCampaignStore();

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

  const handleCancel = () => {
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
    setIsEditing(false);
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

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !character) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "description",
      title: "Description",
      content: editForm.description,
      placeholder: "Physical appearance, mannerisms, notable features...",
    },
    {
      id: "personality",
      title: "Personality",
      content: editForm.personality,
      placeholder: "Personality traits, quirks, behaviors...",
    },
    {
      id: "motivations",
      title: "Motivations",
      content: editForm.motivations,
      placeholder: "Goals, desires, fears...",
    },
    {
      id: "voice_notes",
      title: "Voice Notes",
      content: editForm.voice_notes,
      placeholder: "Accent, catch phrases, mannerisms...",
    },
    {
      id: "secrets",
      title: "Secrets",
      content: editForm.secrets,
      placeholder: "Hidden information, plot hooks, true identity...",
    },
  ];

  const subtitle = (
    <>
      {character.lineage && <span>{character.lineage}</span>}
      {character.lineage && character.occupation && <span>•</span>}
      {character.occupation && <span>{character.occupation}</span>}
    </>
  );

  const badges = (
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
  );

  const titleContent = isEditing ? (
    <Input
      value={editForm.name}
      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
      className="text-2xl font-bold h-auto py-1"
    />
  ) : (
    character.name
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
        backLink="/characters"
      />

      <DocumentCanvasWithExpansion
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || ""}
        entityType="character"
        entityId={id || ""}
        entityName={character.name}
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
                <span className="text-sm text-muted-foreground">Lineage</span>
                <p>{character.lineage || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Occupation</span>
                <p>{character.occupation || "—"}</p>
              </div>
            </div>
          )}
        </MetadataSection>

        {id && character && (
          <RelationshipsPanel
            entityType="character"
            entityId={id}
            entityName={character.name}
          />
        )}
      </DocumentCanvasWithExpansion>

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
