import { useEffect, lazy, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { WorldNavigator } from "./WorldNavigator";
import { useCampaignStore, useAIStore } from "@/stores";

// Lazy load AI panel - only loaded when API key is configured
const AIChatPanel = lazy(() => import("@/components/ai/AIChatPanel").then(m => ({ default: m.AIChatPanel })));

export function AppShell() {
  const navigate = useNavigate();
  const { activeCampaignId, campaigns, isLoading } = useCampaignStore();
  const apiKey = useAIStore((state) => state.apiKey);

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
          <WorldNavigator />
          {/* Only load AI panel when API key is configured */}
          {apiKey && (
            <Suspense fallback={null}>
              <AIChatPanel />
            </Suspense>
          )}
        </div>
        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
