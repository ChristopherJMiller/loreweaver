import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState, DeleteDialog } from "@/components/common";
import {
  DocumentHeader,
  DocumentCanvas,
  MetadataSection,
  DocumentSection,
} from "@/components/document";
import { useSessionStore, useCampaignStore } from "@/stores";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entities, isLoading, fetchOne, update, remove } = useSessionStore();
  const { activeCampaignId } = useCampaignStore();

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

  const handleCancel = () => {
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
    setIsEditing(false);
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

  const handleSectionChange = useCallback(
    (fieldId: string, content: string) => {
      setEditForm((prev) => ({ ...prev, [fieldId]: content }));
    },
    []
  );

  if (isLoading || !session) {
    return <LoadingState type="detail" />;
  }

  const sections: DocumentSection[] = [
    {
      id: "planned_content",
      title: "Planned Content",
      content: editForm.planned_content,
      placeholder: "Encounters, story beats, locations to visit...",
    },
    {
      id: "notes",
      title: "Session Notes",
      content: editForm.notes,
      placeholder: "What happened, player actions, important decisions...",
    },
    {
      id: "summary",
      title: "Summary",
      content: editForm.summary,
      placeholder: "A concise summary of the session...",
    },
    {
      id: "highlights",
      title: "Highlights",
      content: editForm.highlights,
      placeholder: "Epic moments, funny quotes, dramatic reveals...",
    },
  ];

  const titleContent = isEditing ? (
    <div className="flex items-center gap-2">
      <span>Session</span>
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
        className="w-20 text-2xl font-bold h-auto py-1"
      />
    </div>
  ) : (
    <>
      Session {session.session_number}
      {session.title && `: ${session.title}`}
    </>
  );

  const subtitle = (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      <span>{formatDate(session.date)}</span>
    </div>
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
        onDelete={() => setDeleteDialogOpen(true)}
        backLink="/sessions"
      />

      <DocumentCanvas
        sections={sections}
        isEditing={isEditing}
        onChange={handleSectionChange}
        campaignId={activeCampaignId || ""}
        entityType="session"
        entityId={id || ""}
        entityName={session.title || ""}
      >
        <MetadataSection defaultOpen={isEditing}>
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
        </MetadataSection>
      </DocumentCanvas>

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
