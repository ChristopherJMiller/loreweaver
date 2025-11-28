import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout";
import {
  DashboardPage,
  CampaignsPage,
  CharactersPage,
  CharacterDetailPage,
  LocationsPage,
  LocationDetailPage,
  OrganizationsPage,
  OrganizationDetailPage,
  HeroesPage,
  HeroDetailPage,
  PlayersPage,
  PlayerDetailPage,
  SessionsPage,
  SessionDetailPage,
  PlaceholderPage,
} from "@/pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Campaign selection - standalone page */}
        <Route path="/campaigns" element={<CampaignsPage />} />

        {/* All routes within AppShell require active campaign */}
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Entity routes */}
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/characters/:id" element={<CharacterDetailPage />} />

          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:id" element={<LocationDetailPage />} />

          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/organizations/:id" element={<OrganizationDetailPage />} />

          <Route
            path="/quests"
            element={
              <PlaceholderPage
                title="Quests"
                description="Story threads and objectives"
              />
            }
          />
          <Route
            path="/quests/:id"
            element={
              <PlaceholderPage
                title="Quest Details"
                description="View quest"
              />
            }
          />

          <Route path="/heroes" element={<HeroesPage />} />
          <Route path="/heroes/:id" element={<HeroDetailPage />} />

          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:id" element={<PlayerDetailPage />} />

          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />

          <Route
            path="/timeline"
            element={
              <PlaceholderPage
                title="Timeline"
                description="Historical events"
              />
            }
          />

          <Route
            path="/secrets"
            element={
              <PlaceholderPage
                title="Secrets"
                description="GM-only information"
              />
            }
          />

          <Route
            path="/search"
            element={
              <PlaceholderPage
                title="Search"
                description="Search across your campaign"
              />
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
