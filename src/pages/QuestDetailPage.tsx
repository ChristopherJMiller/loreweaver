import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  RelationshipsPanel,
  DocumentSection,
} from "@/components/document";
import { useQuestStore, useCampaignStore } from "@/stores";
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

export function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useQuestStore();
  const { activeCampaignId } = useCampaignStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    plot_type: "side",
    status: "planned",
    description: "",
    hook: "",
    objectives: "",
    complications: "",
    resolution: "",
    reward: "",
  });

  const quest = entities.find((q) => q.id === id);

  useEffect(() => {
    if (id && !quest) {
      fetchOne(id);
    }
  }, [id, quest, fetchOne]);

  useEffect(() => {
    if (quest) {
      setEditForm({
        name: quest.name,
        plot_type: quest.plot_type,
        status: quest.status,
        description: quest.description || "",
        hook: quest.hook || "",
        objectives: quest.objectives || "",
        complications: quest.complications || "",
        resolution: quest.resolution || "",
        reward: quest.reward || "",
      });
    }
  }, [quest]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        name: editForm.name,
        plot_type: editForm.plot_type,
        status: editForm.status,
        description: editForm.description || undefined,
        hook: editForm.hook || undefined,
        objectives: editForm.objectives || undefined,
        complications: editForm.complications || undefined,
        resolution: editForm.resolution || undefined,
        reward: editForm.reward || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (quest) {
      setEditForm({
        name: quest.name,
        plot_type: quest.plot_type,
        status: quest.status,
        description: quest.description || "",
        hook: quest.hook || "",
        objectives: quest.objectives || "",
        complications: quest.complications || "",
        resolution: quest.resolution || "",
        reward: quest.reward || "",
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/quests");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !quest) return;
    await update(id, { status: newStatus });
  };

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !quest) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "description",
      title: "Description",
      content: editForm.description,
      placeholder: "Describe this quest...",
    },
    {
      id: "hook",
      title: "Hook",
      content: editForm.hook,
      placeholder: "The party discovers a mysterious letter...",
    },
    {
      id: "objectives",
      title: "Objectives",
      content: editForm.objectives,
      placeholder: "1. Find the lost artifact\n2. Return it to the temple...",
    },
    {
      id: "complications",
      title: "Complications",
      content: editForm.complications,
      placeholder: "The artifact is guarded by ancient traps...",
    },
    {
      id: "resolution",
      title: "Resolution",
      content: editForm.resolution,
      placeholder: "Success: The artifact is returned and the curse lifted...",
    },
    {
      id: "reward",
      title: "Rewards",
      content: editForm.reward,
      placeholder: "500 gold pieces, a magical sword...",
    },
  ];

  const badges = !isEditing ? (
    <Select value={quest.status} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[140px]">
        <Badge variant={getStatusVariant(quest.status)}>
          {getQuestStatusLabel(quest.status)}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {QUEST_STATUS.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  const titleContent = isEditing ? (
    <Input
      value={editForm.name}
      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
      className="text-2xl font-bold h-auto py-1"
    />
  ) : (
    quest.name
  );

  const subtitle = (
    <Badge variant="outline">{getPlotTypeLabel(quest.plot_type)}</Badge>
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
        backLink="/quests"
      />

      <DocumentCanvas
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || ""}
        entityType="quest"
        entityId={id || ""}
        entityName={quest.name}
      >
        <MetadataSection defaultOpen={isEditing}>
          {isEditing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quest Type</Label>
                <Select
                  value={editForm.plot_type}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, plot_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Quest Type</span>
                <p>
                  <Badge variant="outline">{getPlotTypeLabel(quest.plot_type)}</Badge>
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p>
                  <Badge variant={getStatusVariant(quest.status)}>
                    {getQuestStatusLabel(quest.status)}
                  </Badge>
                </p>
              </div>
            </div>
          )}
        </MetadataSection>

        {id && quest && (
          <RelationshipsPanel
            entityType="quest"
            entityId={id}
            entityName={quest.name}
          />
        )}
      </DocumentCanvas>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Quest"
        description={`Are you sure you want to delete "${quest.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
