import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Save, X, Calendar } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoadingState, DeleteDialog } from "@/components/common";
import { useSessionStore } from "@/stores";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useSessionStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    session_number: 1,
    date: "",
    title: "",
    planned_content: "",
    notes: "",
    summary: "",
    highlights: "",
  });

  const session = entities.find((s) => s.id === id);

  useEffect(() => {
    if (id && !session) {
      fetchOne(id);
    }
  }, [id, session, fetchOne]);

  useEffect(() => {
    if (session) {
      setEditForm({
        session_number: session.session_number,
        date: session.date || "",
        title: session.title || "",
        planned_content: session.planned_content || "",
        notes: session.notes || "",
        summary: session.summary || "",
        highlights: session.highlights || "",
      });
    }
  }, [session]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await update(id, {
        session_number: editForm.session_number,
        date: editForm.date || undefined,
        title: editForm.title || undefined,
        planned_content: editForm.planned_content || undefined,
        notes: editForm.notes || undefined,
        summary: editForm.summary || undefined,
        highlights: editForm.highlights || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove(id);
    navigate("/sessions");
  };

  const formatDate = (date: string | null): string => {
    if (!date) return "No date set";
    try {
      return new Date(date).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  if (isLoading || !session) {
    return <LoadingState type="detail" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">Session</span>
                <Input
                  type="number"
                  min={1}
                  value={editForm.session_number}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      session_number: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-20 text-2xl font-bold"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-bold">
                Session {session.session_number}
                {session.title && `: ${session.title}`}
              </h1>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(session.date)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      <Tabs defaultValue="prep">
        <TabsList>
          <TabsTrigger value="prep">Preparation</TabsTrigger>
          <TabsTrigger value="notes">Session Notes</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="prep" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      placeholder="Optional session title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) =>
                        setEditForm({ ...editForm, date: e.target.value })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Title</span>
                    <p>{session.title || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Date</span>
                    <p>{formatDate(session.date)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planned Content</CardTitle>
              <CardDescription>
                What you plan to cover this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.planned_content}
                  onChange={(e) =>
                    setEditForm({ ...editForm, planned_content: e.target.value })
                  }
                  placeholder="Encounters, story beats, locations to visit..."
                  rows={8}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {session.planned_content || "No planned content yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Notes</CardTitle>
              <CardDescription>
                Notes taken during the session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  placeholder="What happened, player actions, important decisions..."
                  rows={12}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {session.notes || "No notes yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Post-session summary of what happened
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.summary}
                  onChange={(e) =>
                    setEditForm({ ...editForm, summary: e.target.value })
                  }
                  placeholder="A concise summary of the session..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {session.summary || "No summary yet."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>
                Memorable moments and key events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.highlights}
                  onChange={(e) =>
                    setEditForm({ ...editForm, highlights: e.target.value })
                  }
                  placeholder="Epic moments, funny quotes, dramatic reveals..."
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {session.highlights || "No highlights recorded."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Session"
        description={`Are you sure you want to delete Session ${session.session_number}? All notes and summaries will be lost.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
