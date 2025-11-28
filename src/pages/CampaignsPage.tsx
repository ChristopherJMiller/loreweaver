import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Check, BookOpen, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useCampaignStore } from "@/stores";

export function CampaignsPage() {
  const navigate = useNavigate();
  const {
    campaigns,
    activeCampaignId,
    isLoading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    setActiveCampaign,
  } = useCampaignStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", system: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (campaign: typeof campaigns[0]) => {
    setEditingId(campaign.id);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      system: campaign.system || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await updateCampaign(editingId, {
          name: formData.name,
          description: formData.description || undefined,
          system: formData.system || undefined,
        });
        setDialogOpen(false);
      } else {
        const campaign = await createCampaign(
          formData.name,
          formData.description || undefined,
          formData.system || undefined
        );
        setActiveCampaign(campaign.id);
        setDialogOpen(false);
        navigate("/");
      }
      setFormData({ name: "", description: "", system: "" });
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      await deleteCampaign(id);
    }
  };

  const handleSelect = (id: string) => {
    setActiveCampaign(id);
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your worldbuilding campaigns
          </p>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Campaign" : "Create Campaign"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update your campaign details"
                  : "Start a new worldbuilding campaign"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Fantasy World"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="system">System (optional)</Label>
                <Input
                  id="system"
                  placeholder="D&D 5e, Pathfinder 2e, etc."
                  value={formData.system}
                  onChange={(e) =>
                    setFormData({ ...formData, system: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="A brief description of your campaign..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No campaigns yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first campaign to get started
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className={
                campaign.id === activeCampaignId ? "ring-2 ring-primary" : ""
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{campaign.name}</CardTitle>
                    {campaign.system && (
                      <CardDescription>{campaign.system}</CardDescription>
                    )}
                  </div>
                  {campaign.id === activeCampaignId && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardHeader>
              {campaign.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {campaign.description}
                  </p>
                </CardContent>
              )}
              <CardFooter className="gap-2">
                <Button
                  variant={
                    campaign.id === activeCampaignId ? "default" : "outline"
                  }
                  className="flex-1"
                  onClick={() => handleSelect(campaign.id)}
                >
                  {campaign.id === activeCampaignId ? "Active" : "Select"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(campaign)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(campaign.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
