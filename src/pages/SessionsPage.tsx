import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  DeleteDialog,
} from "@/components/common";
import { useCampaignStore, useSessionStore, useUIStore } from "@/stores";

export function SessionsPage() {
  const navigate = useNavigate();
  const { activeCampaignId } = useCampaignStore();
  const { entities, isLoading, fetchAll, create, remove } = useSessionStore();
  const { viewMode } = useUIStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    session_number: 1,
    title: "",
    date: "",
    planned_content: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeCampaignId) {
      fetchAll(activeCampaignId);
    }
  }, [activeCampaignId, fetchAll]);

  // Auto-calculate next session number
  useEffect(() => {
    if (entities.length > 0) {
      const maxNumber = Math.max(...entities.map((s) => s.session_number));
      setNewSession((prev) => ({ ...prev, session_number: maxNumber + 1 }));
    }
  }, [entities]);

  const handleCreate = async () => {
    if (!activeCampaignId) return;

    setIsCreating(true);
    try {
      const session = await create({
        campaign_id: activeCampaignId,
        session_number: newSession.session_number,
        title: newSession.title || undefined,
        date: newSession.date || undefined,
        planned_content: newSession.planned_content || undefined,
      });
      setCreateDialogOpen(false);
      setNewSession({
        session_number: newSession.session_number + 1,
        title: "",
        date: "",
        planned_content: "",
      });
      navigate(`/sessions/${session.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await remove(selectedId);
    setSelectedId(null);
  };

  const openDeleteDialog = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const formatDate = (date: string | null): string => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  // Sort sessions by session number (descending - newest first)
  const sortedSessions = [...entities].sort(
    (a, b) => b.session_number - a.session_number
  );

  if (!activeCampaignId) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Campaign Selected"
        description="Select a campaign to view sessions"
        actionLabel="Go to Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Game sessions and session notes"
        count={entities.length}
        onCreateClick={() => setCreateDialogOpen(true)}
        createLabel="New Session"
      />

      {isLoading ? (
        <LoadingState type={viewMode} count={5} />
      ) : entities.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No sessions yet"
          description="Create your first session to start tracking your campaign"
          actionLabel="Create Session"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSessions.map((session) => (
            <Link key={session.id} to={`/sessions/${session.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      Session {session.session_number}
                    </CardTitle>
                    {session.date && (
                      <span className="text-sm text-muted-foreground">
                        {formatDate(session.date)}
                      </span>
                    )}
                  </div>
                  {session.title && (
                    <CardDescription>{session.title}</CardDescription>
                  )}
                </CardHeader>
                {session.summary && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {session.summary}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="hover:underline"
                  >
                    Session {session.session_number}
                  </Link>
                </TableCell>
                <TableCell>{session.title || "—"}</TableCell>
                <TableCell>{formatDate(session.date)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/sessions/${session.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(session.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>
              Add a new game session to your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_number">Session Number</Label>
                <Input
                  id="session_number"
                  type="number"
                  min={1}
                  value={newSession.session_number}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      session_number: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newSession.date}
                  onChange={(e) =>
                    setNewSession({ ...newSession, date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Optional session title..."
                value={newSession.title}
                onChange={(e) =>
                  setNewSession({ ...newSession, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned_content">Planned Content</Label>
              <Textarea
                id="planned_content"
                placeholder="What you plan to cover this session..."
                value={newSession.planned_content}
                onChange={(e) =>
                  setNewSession({
                    ...newSession,
                    planned_content: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Session"
        description="Are you sure you want to delete this session? All notes and summaries will be lost."
        onConfirm={handleDelete}
      />
    </div>
  );
}
