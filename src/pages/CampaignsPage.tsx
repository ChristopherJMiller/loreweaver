import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Check, BookOpen } from "lucide-react";
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
  DialogTrigger,
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
    deleteCampaign,
    setActiveCampaign,
  } = useCampaignStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    system: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!newCampaign.name.trim()) return;

    setIsCreating(true);
    try {
      const campaign = await createCampaign(
        newCampaign.name,
        newCampaign.description || undefined,
        newCampaign.system || undefined
      );
      setActiveCampaign(campaign.id);
      setCreateDialogOpen(false);
      setNewCampaign({ name: "", description: "", system: "" });
      navigate("/");
    } finally {
      setIsCreating(false);
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

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>
                Start a new worldbuilding campaign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Fantasy World"
                  value={newCampaign.name}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="system">System (optional)</Label>
                <Input
                  id="system"
                  placeholder="D&D 5e, Pathfinder 2e, etc."
                  value={newCampaign.system}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, system: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="A brief description of your campaign..."
                  value={newCampaign.description}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      description: e.target.value,
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
                {isCreating ? "Creating..." : "Create Campaign"}
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
            <Button onClick={() => setCreateDialogOpen(true)}>
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
