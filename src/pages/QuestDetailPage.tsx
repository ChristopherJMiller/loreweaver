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
import { useQuestStore } from "@/stores";
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

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/quests");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !quest) return;
    await update(id, { status: newStatus });
  };

  if (isLoading || !quest) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/quests">
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
              <h1 className="text-2xl font-bold">{quest.name}</h1>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getPlotTypeLabel(quest.plot_type)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
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
          )}

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
          <TabsTrigger value="details">Quest Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Quest Type & Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Type</span>
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
                  <span className="text-sm text-muted-foreground">Status</span>
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
              </CardContent>
            </Card>
          )}

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
                  placeholder="Describe this quest..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {quest.description || "No description yet."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hook</CardTitle>
              <CardDescription>
                How players discover or get involved in this quest
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.hook}
                  onChange={(e) =>
                    setEditForm({ ...editForm, hook: e.target.value })
                  }
                  placeholder="The party discovers a mysterious letter..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {quest.hook || "No hook defined yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objectives</CardTitle>
              <CardDescription>
                What needs to be accomplished
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.objectives}
                  onChange={(e) =>
                    setEditForm({ ...editForm, objectives: e.target.value })
                  }
                  placeholder="1. Find the lost artifact\n2. Return it to the temple..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {quest.objectives || "No objectives defined."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complications</CardTitle>
              <CardDescription>
                Obstacles and challenges along the way
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.complications}
                  onChange={(e) =>
                    setEditForm({ ...editForm, complications: e.target.value })
                  }
                  placeholder="The artifact is guarded by ancient traps..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {quest.complications || "No complications recorded."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolution</CardTitle>
              <CardDescription>
                How the quest can be completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.resolution}
                  onChange={(e) =>
                    setEditForm({ ...editForm, resolution: e.target.value })
                  }
                  placeholder="Success: The artifact is returned and the curse lifted..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {quest.resolution || "No resolution defined."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rewards</CardTitle>
              <CardDescription>
                What the party gains upon completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.reward}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reward: e.target.value })
                  }
                  placeholder="500 gold pieces, a magical sword..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {quest.reward || "No rewards defined."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
