import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { useCampaignStore } from "@/stores";

export function AppShell() {
  const navigate = useNavigate();
  const { activeCampaignId, campaigns, isLoading } = useCampaignStore();

  // Redirect to campaigns page if no active campaign
  useEffect(() => {
    if (!isLoading && campaigns.length > 0 && !activeCampaignId) {
      navigate("/campaigns");
    }
  }, [activeCampaignId, campaigns.length, isLoading, navigate]);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-background p-6">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
