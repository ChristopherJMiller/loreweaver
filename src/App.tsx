import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { useAIStore } from "@/stores";

// Lazy load all pages for code splitting
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const CampaignsPage = lazy(() => import("@/pages/CampaignsPage").then(m => ({ default: m.CampaignsPage })));
const CharactersPage = lazy(() => import("@/pages/CharactersPage").then(m => ({ default: m.CharactersPage })));
const CharacterDetailPage = lazy(() => import("@/pages/CharacterDetailPage").then(m => ({ default: m.CharacterDetailPage })));
const LocationsPage = lazy(() => import("@/pages/LocationsPage").then(m => ({ default: m.LocationsPage })));
const LocationDetailPage = lazy(() => import("@/pages/LocationDetailPage").then(m => ({ default: m.LocationDetailPage })));
const OrganizationsPage = lazy(() => import("@/pages/OrganizationsPage").then(m => ({ default: m.OrganizationsPage })));
const OrganizationDetailPage = lazy(() => import("@/pages/OrganizationDetailPage").then(m => ({ default: m.OrganizationDetailPage })));
const HeroesPage = lazy(() => import("@/pages/HeroesPage").then(m => ({ default: m.HeroesPage })));
const HeroDetailPage = lazy(() => import("@/pages/HeroDetailPage").then(m => ({ default: m.HeroDetailPage })));
const PlayersPage = lazy(() => import("@/pages/PlayersPage").then(m => ({ default: m.PlayersPage })));
const PlayerDetailPage = lazy(() => import("@/pages/PlayerDetailPage").then(m => ({ default: m.PlayerDetailPage })));
const SessionsPage = lazy(() => import("@/pages/SessionsPage").then(m => ({ default: m.SessionsPage })));
const SessionDetailPage = lazy(() => import("@/pages/SessionDetailPage").then(m => ({ default: m.SessionDetailPage })));
const QuestsPage = lazy(() => import("@/pages/QuestsPage").then(m => ({ default: m.QuestsPage })));
const QuestDetailPage = lazy(() => import("@/pages/QuestDetailPage").then(m => ({ default: m.QuestDetailPage })));
const TimelinePage = lazy(() => import("@/pages/TimelinePage").then(m => ({ default: m.TimelinePage })));
const TimelineEventDetailPage = lazy(() => import("@/pages/TimelineEventDetailPage").then(m => ({ default: m.TimelineEventDetailPage })));
const SearchPage = lazy(() => import("@/pages/SearchPage").then(m => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage").then(m => ({ default: m.PlaceholderPage })));
const AIFullPageChat = lazy(() => import("@/components/ai/AIFullPageChat").then(m => ({ default: m.AIFullPageChat })));

/** Loading fallback for lazy-loaded pages */
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function App() {
  const initialize = useAIStore((state) => state.initialize);

  // Initialize AI store on app startup to load stored API key
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Campaign selection - standalone page */}
          <Route path="/campaigns" element={<CampaignsPage />} />

          {/* All routes within AppShell require active campaign */}
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />

            {/* AI Chat - full-page experience */}
            <Route path="/chat" element={<AIFullPageChat />} />

            {/* Entity routes */}
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/characters/:id" element={<CharacterDetailPage />} />

            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/:id" element={<LocationDetailPage />} />

            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/:id" element={<OrganizationDetailPage />} />

            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/quests/:id" element={<QuestDetailPage />} />

            <Route path="/heroes" element={<HeroesPage />} />
            <Route path="/heroes/:id" element={<HeroDetailPage />} />

            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:id" element={<PlayerDetailPage />} />

            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />

            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/timeline/:id" element={<TimelineEventDetailPage />} />

            <Route
              path="/secrets"
              element={
                <PlaceholderPage
                  title="Secrets"
                  description="GM-only information"
                />
              }
            />

            <Route path="/search" element={<SearchPage />} />

            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
