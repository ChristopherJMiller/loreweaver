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
  org_type: string | null;
  description: string | null;
  goals: string | null;
  resources: string | null;
  headquarters_id: string | null;
  leader_id: string | null;
  is_public: boolean;
  influence_level: number;
}

// Quest entity
interface QuestEntity extends BaseEntity {
  name: string;
  quest_type: string | null;
  status: string | null;
  description: string | null;
  objectives: string | null;
  rewards: string | null;
  giver_id: string | null;
  target_id: string | null;
  deadline: string | null;
  priority: number;
}

// Hero entity
interface HeroEntity extends BaseEntity {
  player_id: string;
  name: string;
  character_class: string | null;
  level: number;
  backstory: string | null;
  character_sheet_json: string | null;
  notes: string | null;
  is_active: boolean;
}

// Player entity
interface PlayerEntity extends BaseEntity {
  name: string;
  email: string | null;
  preferences: string | null;
  boundaries: string | null;
  notes: string | null;
}

// Session entity
interface SessionEntity extends BaseEntity {
  session_number: number;
  title: string | null;
  scheduled_date: string | null;
  actual_date: string | null;
  status: string | null;
  summary: string | null;
  notes: string | null;
  duration_minutes: number | null;
}

// Timeline event entity
interface TimelineEventEntity extends BaseEntity {
  name: string;
  event_date: string | null;
  date_precision: string | null;
  description: string | null;
  significance: number;
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
