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
import { useOrganizationStore } from "@/stores";
import { ORG_TYPES, getOrgTypeLabel } from "@/lib/constants";

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useOrganizationStore();

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
              {isEditing ? (
                <Textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Describe this organization..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {org.description || "No description yet."}
                </p>
              )}
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
              {isEditing ? (
                <Textarea
                  value={editForm.reputation}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reputation: e.target.value })
                  }
                  placeholder="Public perception, rumors, reputation..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {org.reputation || "No reputation notes yet."}
                </p>
              )}
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
              {isEditing ? (
                <Textarea
                  value={editForm.goals}
                  onChange={(e) =>
                    setEditForm({ ...editForm, goals: e.target.value })
                  }
                  placeholder="Short-term and long-term objectives..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {org.goals || "No goals recorded."}
                </p>
              )}
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
              {isEditing ? (
                <Textarea
                  value={editForm.resources}
                  onChange={(e) =>
                    setEditForm({ ...editForm, resources: e.target.value })
                  }
                  placeholder="Members, wealth, territory, influence..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {org.resources || "No resources recorded."}
                </p>
              )}
            </CardContent>
          </Card>
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
              {isEditing ? (
                <Textarea
                  value={editForm.secrets}
                  onChange={(e) =>
                    setEditForm({ ...editForm, secrets: e.target.value })
                  }
                  placeholder="True motives, hidden agendas, secret members..."
                  rows={8}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {org.secrets || "No secrets recorded."}
                </p>
              )}
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
