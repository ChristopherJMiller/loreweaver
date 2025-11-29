/**
 * Campaign Summary Service
 *
 * Builds and caches campaign context for agent system prompt injection.
 * Provides a summary of the campaign world without requiring tool calls.
 */

import {
  campaigns,
  locations,
  organizations,
  quests,
  sessions,
  heroes,
  players,
} from "@/lib/tauri";
import type {
  CampaignSummary,
  EntityBrief,
  HeroBrief,
  SessionBrief,
  QuestBrief,
} from "./types";

/** Cache entry with timestamp */
interface CacheEntry {
  summary: CampaignSummary;
  expiresAt: number;
}

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

/** Maximum items per category */
const MAX_LOCATIONS = 10;
const MAX_ORGANIZATIONS = 10;
const MAX_QUESTS = 10;
const MAX_SESSIONS = 3;

/** In-memory cache */
const cache = new Map<string, CacheEntry>();

/**
 * Truncate description to brief
 */
function toBrief(text: string | null | undefined, maxLength = 100): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Get campaign summary, using cache if available
 */
export async function getCampaignSummary(
  campaignId: string
): Promise<CampaignSummary> {
  // Check cache
  const cached = cache.get(campaignId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.summary;
  }

  // Build fresh summary
  const summary = await buildCampaignSummary(campaignId);

  // Cache it
  cache.set(campaignId, {
    summary,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return summary;
}

/**
 * Invalidate cache for a campaign
 * Call this when entities are created/updated/deleted
 */
export function invalidateCampaignSummary(campaignId: string): void {
  cache.delete(campaignId);
}

/**
 * Clear all cached summaries
 */
export function clearAllCampaignSummaries(): void {
  cache.clear();
}

/**
 * Build campaign summary from database
 */
async function buildCampaignSummary(campaignId: string): Promise<CampaignSummary> {
  // Fetch all data in parallel
  const [
    campaign,
    allLocations,
    allOrgs,
    allQuests,
    allSessions,
    allHeroes,
    allPlayers,
  ] = await Promise.all([
    campaigns.get(campaignId),
    locations.list({ campaign_id: campaignId }),
    organizations.list({ campaign_id: campaignId }),
    quests.list({ campaign_id: campaignId }),
    sessions.list({ campaign_id: campaignId }),
    heroes.list({ campaign_id: campaignId }),
    players.list({ campaign_id: campaignId }),
  ]);

  // Top-level locations (no parent)
  const topLocations: EntityBrief[] = allLocations
    .filter((loc) => !loc.parent_id)
    .slice(0, MAX_LOCATIONS)
    .map((loc) => ({
      id: loc.id,
      name: loc.name,
      type: loc.location_type ?? undefined,
      brief: toBrief(loc.description),
    }));

  // Organizations
  const orgs: EntityBrief[] = allOrgs.slice(0, MAX_ORGANIZATIONS).map((org) => ({
    id: org.id,
    name: org.name,
    type: org.org_type ?? undefined,
    brief: toBrief(org.description),
  }));

  // Quests - prioritize active ones
  const sortedQuests = [...allQuests].sort((a, b) => {
    // Active quests first
    const aActive = a.status === "active" || a.status === "in_progress";
    const bActive = b.status === "active" || b.status === "in_progress";
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  const questBriefs: QuestBrief[] = sortedQuests.slice(0, MAX_QUESTS).map((quest) => ({
    id: quest.id,
    name: quest.name,
    status: quest.status ?? undefined,
    questType: quest.plot_type ?? undefined,
    brief: toBrief(quest.description),
  }));

  // Recent sessions - sorted by session number descending
  const sortedSessions = [...allSessions].sort(
    (a, b) => b.session_number - a.session_number
  );

  const sessionBriefs: SessionBrief[] = sortedSessions
    .slice(0, MAX_SESSIONS)
    .map((session) => ({
      id: session.id,
      sessionNumber: session.session_number,
      title: session.title ?? undefined,
      summary: session.summary ?? undefined,
    }));

  // Create player lookup map
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  // Heroes with player names
  const heroBriefs: HeroBrief[] = allHeroes
    .filter((hero) => hero.is_active !== false)
    .map((hero) => {
      const player = hero.player_id ? playerMap.get(hero.player_id) : null;
      return {
        id: hero.id,
        name: hero.name,
        playerName: player?.name ?? "Unknown Player",
        characterClass: hero.classes ?? undefined,
        level: undefined, // Heroes don't have level in current schema
      };
    });

  return {
    id: campaign.id,
    name: campaign.name,
    system: campaign.system ?? undefined,
    description: campaign.description ?? undefined,
    topLocations,
    organizations: orgs,
    quests: questBriefs,
    recentSessions: sessionBriefs,
    heroes: heroBriefs,
    generatedAt: new Date(),
  };
}
