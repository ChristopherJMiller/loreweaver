import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout";
import {
  DashboardPage,
  CampaignsPage,
  CharactersPage,
  CharacterDetailPage,
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

          <Route
            path="/locations"
            element={
              <PlaceholderPage
                title="Locations"
                description="Places in your world"
              />
            }
          />
          <Route
            path="/locations/:id"
            element={
              <PlaceholderPage
                title="Location Details"
                description="View location"
              />
            }
          />

          <Route
            path="/organizations"
            element={
              <PlaceholderPage
                title="Organizations"
                description="Factions and groups"
              />
            }
          />
          <Route
            path="/organizations/:id"
            element={
              <PlaceholderPage
                title="Organization Details"
                description="View organization"
              />
            }
          />

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

          <Route
            path="/heroes"
            element={
              <PlaceholderPage
                title="Heroes"
                description="Player characters"
              />
            }
          />
          <Route
            path="/heroes/:id"
            element={
              <PlaceholderPage title="Hero Details" description="View hero" />
            }
          />

          <Route
            path="/players"
            element={
              <PlaceholderPage
                title="Players"
                description="Real-world players"
              />
            }
          />
          <Route
            path="/players/:id"
            element={
              <PlaceholderPage
                title="Player Details"
                description="View player"
              />
            }
          />

          <Route
            path="/sessions"
            element={
              <PlaceholderPage title="Sessions" description="Game sessions" />
            }
          />
          <Route
            path="/sessions/:id"
            element={
              <PlaceholderPage
                title="Session Details"
                description="View session"
              />
            }
          />

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
