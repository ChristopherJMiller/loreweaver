import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Search, ChevronDown, Plus, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCampaignStore, useUIStore } from "@/stores";

export function Header() {
  const navigate = useNavigate();
  const { campaigns, activeCampaignId, setActiveCampaign, fetchCampaigns } =
    useCampaignStore();
  const { openCommandPalette, worldNavigatorOpen, toggleWorldNavigator, aiChatOpen, toggleAIChat } = useUIStore();

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCommandPalette]);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Loreweaver</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {activeCampaign?.name ?? "Select Campaign"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {campaigns.map((campaign) => (
              <DropdownMenuItem
                key={campaign.id}
                onClick={() => setActiveCampaign(campaign.id)}
                className={
                  campaign.id === activeCampaignId ? "bg-accent" : undefined
                }
              >
                {campaign.name}
              </DropdownMenuItem>
            ))}
            {campaigns.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => navigate("/campaigns")}>
              <Plus className="mr-2 h-4 w-4" />
              Manage Campaigns
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="hidden gap-2 md:flex"
          onClick={openCommandPalette}
        >
          <Search className="h-4 w-4" />
          <span className="text-muted-foreground">Search...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={openCommandPalette}
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant={worldNavigatorOpen ? "default" : "outline"}
          size="icon"
          onClick={toggleWorldNavigator}
          title={worldNavigatorOpen ? "Hide World Navigator" : "Show World Navigator"}
        >
          <Globe className="h-4 w-4" />
        </Button>
        <Button
          variant={aiChatOpen ? "default" : "outline"}
          size="icon"
          onClick={toggleAIChat}
          title={aiChatOpen ? "Hide AI Assistant" : "Show AI Assistant"}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
