import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Save, X, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Editor } from "@/components/editor";
import { RelationshipList } from "@/components/relationship";
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

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/organizations");
  };

  const toggleActive = async () => {
    if (!id || !org) return;
    await update(id, { is_active: !org.is_active });
  };

  if (isLoading || !org) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/organizations">
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
              <h1 className="text-2xl font-bold">{org.name}</h1>
            )}
            <p className="text-muted-foreground">
              {getOrgTypeLabel(org.org_type)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="secrets">GM Secrets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Type</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
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
              ) : (
                <Badge variant="outline">
                  {getOrgTypeLabel(org.org_type)}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Editor
                content={editForm.description}
                onChange={(content) =>
                  setEditForm({ ...editForm, description: content })
                }
                placeholder="Describe this organization..."
                readOnly={!isEditing}
                campaignId={activeCampaignId || undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reputation</CardTitle>
              <CardDescription>
                How this organization is perceived by the public
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Editor
                content={editForm.reputation}
                onChange={(content) =>
                  setEditForm({ ...editForm, reputation: content })
                }
                placeholder="Public perception, rumors, reputation..."
                readOnly={!isEditing}
                campaignId={activeCampaignId || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <CardDescription>
                What this organization is trying to achieve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Editor
                content={editForm.goals}
                onChange={(content) =>
                  setEditForm({ ...editForm, goals: content })
                }
                placeholder="Short-term and long-term objectives..."
                readOnly={!isEditing}
                campaignId={activeCampaignId || undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>
                Assets, members, and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Editor
                content={editForm.resources}
                onChange={(content) =>
                  setEditForm({ ...editForm, resources: content })
                }
                placeholder="Members, wealth, territory, influence..."
                readOnly={!isEditing}
                campaignId={activeCampaignId || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          {id && org && (
            <RelationshipList
              entityType="organization"
              entityId={id}
              entityName={org.name}
            />
          )}
        </TabsContent>

        <TabsContent value="secrets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GM Secrets</CardTitle>
              <CardDescription>
                Hidden information about this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Editor
                content={editForm.secrets}
                onChange={(content) =>
                  setEditForm({ ...editForm, secrets: content })
                }
                placeholder="True motives, hidden agendas, secret members..."
                readOnly={!isEditing}
                campaignId={activeCampaignId || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
