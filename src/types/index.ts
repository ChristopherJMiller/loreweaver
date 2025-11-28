// Re-export generated types with singular names
export type { Campaigns as Campaign } from "./bindings/Campaigns";
export type { Characters as Character } from "./bindings/Characters";
export type { Locations as Location } from "./bindings/Locations";
export type { Organizations as Organization } from "./bindings/Organizations";
export type { Quests as Quest } from "./bindings/Quests";
export type { Heroes as Hero } from "./bindings/Heroes";
export type { Players as Player } from "./bindings/Players";
export type { Sessions as Session } from "./bindings/Sessions";
export type { TimelineEvents as TimelineEvent } from "./bindings/TimelineEvents";
export type { Secrets as Secret } from "./bindings/Secrets";
export type { Relationships as Relationship } from "./bindings/Relationships";
export type { Tags as Tag } from "./bindings/Tags";
export type { EntityTags as EntityTag } from "./bindings/EntityTags";

// Re-export command input types (generated from Rust via ts-rs)
export type { ListByCampaignInput } from "./bindings/ListByCampaignInput";
export type { GetChildrenInput } from "./bindings/GetChildrenInput";
export type { EntityScopedInput } from "./bindings/EntityScopedInput";
export type { SearchInput } from "./bindings/SearchInput";

// Entity type union for polymorphic operations
export type EntityType =
  | "campaign"
  | "character"
  | "location"
  | "organization"
  | "quest"
  | "hero"
  | "player"
  | "session"
  | "timeline_event"
  | "secret";

// Entity with common fields
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Search result from FTS5
export interface SearchResult {
  entity_type: EntityType;
  entity_id: string;
  name: string;
  snippet: string | null;
  rank: number;
}
