import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingState, DeleteDialog } from "@/components/common";
import {
  DocumentHeader,
  DocumentCanvas,
  MetadataSection,
  RelationshipsPanel,
  DocumentSection,
} from "@/components/document";
import { useOrganizationStore, useCampaignStore } from "@/stores";
import { ORG_TYPES, getOrgTypeLabel } from "@/lib/constants";

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useOrganizationStore();
  const { activeCampaignId } = useCampaignStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    org_type: "guild",
    description: "",
    goals: "",
    resources: "",
    reputation: "",
    secrets: "",
    is_active: true,
  });

  const org = entities.find((o) => o.id === id);

  useEffect(() => {
    if (id && !org) {
      fetchOne(id);
    }
  }, [id, org, fetchOne]);

  useEffect(() => {
    if (org) {
      setEditForm({
        name: org.name,
        org_type: org.org_type || "guild",
        description: org.description || "",
        goals: org.goals || "",
        resources: org.resources || "",
        reputation: org.reputation || "",
        secrets: org.secrets || "",
        is_active: org.is_active,
      });
    }
  }, [org]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        name: editForm.name,
        org_type: editForm.org_type,
        description: editForm.description || undefined,
        goals: editForm.goals || undefined,
        resources: editForm.resources || undefined,
        reputation: editForm.reputation || undefined,
        secrets: editForm.secrets || undefined,
        is_active: editForm.is_active,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (org) {
      setEditForm({
        name: org.name,
        org_type: org.org_type || "guild",
        description: org.description || "",
        goals: org.goals || "",
        resources: org.resources || "",
        reputation: org.reputation || "",
        secrets: org.secrets || "",
        is_active: org.is_active,
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/organizations");
  };

  const toggleActive = async () => {
    if (!id || !org) return;
    await update(id, { is_active: !org.is_active });
  };

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !org) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "description",
      title: "Description",
      content: editForm.description,
      placeholder: "Describe this organization...",
    },
    {
      id: "goals",
      title: "Goals",
      content: editForm.goals,
      placeholder: "Short-term and long-term objectives...",
    },
    {
      id: "resources",
      title: "Resources",
      content: editForm.resources,
      placeholder: "Members, wealth, territory, influence...",
    },
    {
      id: "reputation",
      title: "Reputation",
      content: editForm.reputation,
      placeholder: "Public perception, rumors, reputation...",
    },
    {
      id: "secrets",
      title: "Secrets",
      content: editForm.secrets,
      placeholder: "True motives, hidden agendas, secret members...",
    },
  ];

  const badges = (
    <Badge
      variant={org.is_active ? "default" : "secondary"}
      className="cursor-pointer"
      onClick={toggleActive}
    >
      {org.is_active ? (
        <>
          <CheckCircle className="mr-1 h-3 w-3" /> Active
        </>
      ) : (
        <>
          <XCircle className="mr-1 h-3 w-3" /> Inactive
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
    org.name
  );

  const subtitle = <span>{getOrgTypeLabel(org.org_type)}</span>;

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
        backLink="/organizations"
      />

      <DocumentCanvas
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || ""}
        entityType="organization"
        entityId={id || ""}
        entityName={org.name}
      >
        <MetadataSection defaultOpen={isEditing}>
          {isEditing ? (
            <div className="space-y-2">
              <Label>Organization Type</Label>
              <Select
                value={editForm.org_type}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, org_type: value })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <span className="text-sm text-muted-foreground">Organization Type</span>
              <p>
                <Badge variant="outline">{getOrgTypeLabel(org.org_type)}</Badge>
              </p>
            </div>
          )}
        </MetadataSection>

        {id && org && (
          <RelationshipsPanel
            entityType="organization"
            entityId={id}
            entityName={org.name}
          />
        )}
      </DocumentCanvas>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Organization"
        description={`Are you sure you want to delete "${org.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
