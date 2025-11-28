import { createEntityStore, type BaseEntity } from "./createEntityStore";

// Character entity
interface CharacterEntity extends BaseEntity {
  name: string;
  lineage: string | null;
  occupation: string | null;
  is_alive: boolean;
  description: string | null;
  personality: string | null;
  motivations: string | null;
  secrets: string | null;
  voice_notes: string | null;
  stat_block_json: string | null;
}

// Location entity
interface LocationEntity extends BaseEntity {
  name: string;
  parent_id: string | null;
  location_type: string;
  description: string | null;
  detail_level: number;
  gm_notes: string | null;
}

// Organization entity
interface OrganizationEntity extends BaseEntity {
  name: string;
  org_type: string;
  description: string | null;
  goals: string | null;
  resources: string | null;
  reputation: string | null;
  secrets: string | null;
  is_active: boolean;
}

// Quest entity
interface QuestEntity extends BaseEntity {
  name: string;
  status: string;
  plot_type: string;
  description: string | null;
  hook: string | null;
  objectives: string | null;
  complications: string | null;
  resolution: string | null;
  reward: string | null;
}

// Hero entity
interface HeroEntity extends BaseEntity {
  player_id: string | null;
  name: string;
  lineage: string | null;
  classes: string | null;
  description: string | null;
  backstory: string | null;
  goals: string | null;
  bonds: string | null;
  is_active: boolean;
}

// Player entity
interface PlayerEntity extends BaseEntity {
  name: string;
  preferences: string | null;
  boundaries: string | null;
  notes: string | null;
}

// Session entity
interface SessionEntity extends BaseEntity {
  session_number: number;
  date: string | null;
  title: string | null;
  planned_content: string | null;
  notes: string | null;
  summary: string | null;
  highlights: string | null;
}

// Timeline event entity
interface TimelineEventEntity extends BaseEntity {
  date_display: string;
  sort_order: number;
  title: string;
  description: string | null;
  significance: string;
  is_public: boolean;
}

// Secret entity
interface SecretEntity extends BaseEntity {
  name: string;
  content: string;
  secret_type: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_revealed: boolean;
  revealed_date: string | null;
  reveal_conditions: string | null;
  importance: number;
}

// Create store instances
export const useCharacterStore =
  createEntityStore<CharacterEntity>("character");
export const useLocationStore = createEntityStore<LocationEntity>("location");
export const useOrganizationStore =
  createEntityStore<OrganizationEntity>("organization");
export const useQuestStore = createEntityStore<QuestEntity>("quest");
export const useHeroStore = createEntityStore<HeroEntity>("hero", "heroes");
export const usePlayerStore = createEntityStore<PlayerEntity>("player");
export const useSessionStore = createEntityStore<SessionEntity>("session");
export const useTimelineEventStore = createEntityStore<TimelineEventEntity>(
  "timeline_event",
  "timeline_events"
);
export const useSecretStore = createEntityStore<SecretEntity>("secret");
