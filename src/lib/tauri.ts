import { invoke } from "@tauri-apps/api/core";
import type {
  Campaign,
  Character,
  Location,
  Organization,
  Quest,
  Hero,
  Player,
  Session,
  TimelineEvent,
  Secret,
  Relationship,
  Tag,
  EntityTag,
  EntityType,
  SearchResult,
  ListByCampaignInput,
  GetChildrenInput,
  EntityScopedInput,
  SearchInput,
} from "@/types";

// Campaign commands
export const campaigns = {
  create: (data: { name: string; description?: string; system?: string }) =>
    invoke<Campaign>("create_campaign", data),

  get: (id: string) => invoke<Campaign>("get_campaign", { id }),

  list: () => invoke<Campaign[]>("list_campaigns"),

  update: (data: {
    id: string;
    name?: string;
    description?: string;
    system?: string;
    settings_json?: string;
  }) => invoke<Campaign>("update_campaign", data),

  delete: (id: string) => invoke<boolean>("delete_campaign", { id }),
};

// Character commands
export const characters = {
  create: (data: {
    campaign_id: string;
    name: string;
    lineage?: string;
    occupation?: string;
    is_alive?: boolean;
    description?: string;
    personality?: string;
    motivations?: string;
    secrets?: string;
    voice_notes?: string;
    stat_block_json?: string;
  }) => invoke<Character>("create_character", data),

  get: (id: string) => invoke<Character>("get_character", { id }),

  list: (input: ListByCampaignInput) =>
    invoke<Character[]>("list_characters", input),

  update: (data: {
    id: string;
    name?: string;
    lineage?: string;
    occupation?: string;
    is_alive?: boolean;
    description?: string;
    personality?: string;
    motivations?: string;
    secrets?: string;
    voice_notes?: string;
    stat_block_json?: string;
  }) => invoke<Character>("update_character", data),

  delete: (id: string) => invoke<boolean>("delete_character", { id }),
};

// Location commands
export const locations = {
  create: (data: {
    campaign_id: string;
    name: string;
    parent_id?: string;
    location_type?: string;
    description?: string;
  }) => invoke<Location>("create_location", data),

  get: (id: string) => invoke<Location>("get_location", { id }),

  list: (input: ListByCampaignInput) =>
    invoke<Location[]>("list_locations", input),

  getChildren: (input: GetChildrenInput) =>
    invoke<Location[]>("get_location_children", input),

  update: (data: {
    id: string;
    name?: string;
    parent_id?: string;
    location_type?: string;
    description?: string;
    gm_notes?: string;
  }) => invoke<Location>("update_location", data),

  delete: (id: string) => invoke<boolean>("delete_location", { id }),
};

// Organization commands
export const organizations = {
  create: (data: {
    campaign_id: string;
    name: string;
    org_type?: string;
    description?: string;
    goals?: string;
    resources?: string;
    headquarters_id?: string;
    leader_id?: string;
    is_public?: boolean;
    influence_level?: number;
  }) => invoke<Organization>("create_organization", data),

  get: (id: string) => invoke<Organization>("get_organization", { id }),

  list: (input: ListByCampaignInput) =>
    invoke<Organization[]>("list_organizations", input),

  update: (data: {
    id: string;
    name?: string;
    org_type?: string;
    description?: string;
    goals?: string;
    resources?: string;
    headquarters_id?: string;
    leader_id?: string;
    is_public?: boolean;
    influence_level?: number;
  }) => invoke<Organization>("update_organization", data),

  delete: (id: string) => invoke<boolean>("delete_organization", { id }),
};

// Quest commands
export const quests = {
  create: (data: {
    campaign_id: string;
    name: string;
    plot_type?: string;
    status?: string;
    description?: string;
    hook?: string;
    objectives?: string;
  }) => invoke<Quest>("create_quest", data),

  get: (id: string) => invoke<Quest>("get_quest", { id }),

  list: (input: ListByCampaignInput) => invoke<Quest[]>("list_quests", input),

  update: (data: {
    id: string;
    name?: string;
    plot_type?: string;
    status?: string;
    description?: string;
    hook?: string;
    objectives?: string;
    complications?: string;
    resolution?: string;
    reward?: string;
  }) => invoke<Quest>("update_quest", data),

  delete: (id: string) => invoke<boolean>("delete_quest", { id }),
};

// Hero commands
export const heroes = {
  create: (data: {
    campaign_id: string;
    player_id: string;
    name: string;
    character_class?: string;
    level?: number;
    backstory?: string;
    character_sheet_json?: string;
    notes?: string;
    is_active?: boolean;
  }) => invoke<Hero>("create_hero", data),

  get: (id: string) => invoke<Hero>("get_hero", { id }),

  list: (input: ListByCampaignInput) => invoke<Hero[]>("list_heroes", input),

  update: (data: {
    id: string;
    name?: string;
    character_class?: string;
    level?: number;
    backstory?: string;
    character_sheet_json?: string;
    notes?: string;
    is_active?: boolean;
  }) => invoke<Hero>("update_hero", data),

  delete: (id: string) => invoke<boolean>("delete_hero", { id }),
};

// Player commands
export const players = {
  create: (data: {
    campaign_id: string;
    name: string;
    email?: string;
    preferences?: string;
    boundaries?: string;
    notes?: string;
  }) => invoke<Player>("create_player", data),

  get: (id: string) => invoke<Player>("get_player", { id }),

  list: (input: ListByCampaignInput) => invoke<Player[]>("list_players", input),

  update: (data: {
    id: string;
    name?: string;
    email?: string;
    preferences?: string;
    boundaries?: string;
    notes?: string;
  }) => invoke<Player>("update_player", data),

  delete: (id: string) => invoke<boolean>("delete_player", { id }),
};

// Session commands
export const sessions = {
  create: (data: {
    campaign_id: string;
    session_number: number;
    title?: string;
    scheduled_date?: string;
    actual_date?: string;
    status?: string;
    summary?: string;
    notes?: string;
    duration_minutes?: number;
  }) => invoke<Session>("create_session", data),

  get: (id: string) => invoke<Session>("get_session", { id }),

  list: (input: ListByCampaignInput) =>
    invoke<Session[]>("list_sessions", input),

  update: (data: {
    id: string;
    session_number?: number;
    title?: string;
    scheduled_date?: string;
    actual_date?: string;
    status?: string;
    summary?: string;
    notes?: string;
    duration_minutes?: number;
  }) => invoke<Session>("update_session", data),

  delete: (id: string) => invoke<boolean>("delete_session", { id }),
};

// Timeline event commands
export const timelineEvents = {
  create: (data: {
    campaign_id: string;
    name: string;
    event_date?: string;
    date_precision?: string;
    description?: string;
    significance?: number;
    is_public?: boolean;
  }) => invoke<TimelineEvent>("create_timeline_event", data),

  get: (id: string) => invoke<TimelineEvent>("get_timeline_event", { id }),

  list: (input: ListByCampaignInput) =>
    invoke<TimelineEvent[]>("list_timeline_events", input),

  update: (data: {
    id: string;
    name?: string;
    event_date?: string;
    date_precision?: string;
    description?: string;
    significance?: number;
    is_public?: boolean;
  }) => invoke<TimelineEvent>("update_timeline_event", data),

  delete: (id: string) => invoke<boolean>("delete_timeline_event", { id }),
};

// Secret commands
export const secrets = {
  create: (data: {
    campaign_id: string;
    name: string;
    content: string;
    secret_type?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    is_revealed?: boolean;
    revealed_date?: string;
    reveal_conditions?: string;
    importance?: number;
  }) => invoke<Secret>("create_secret", data),

  get: (id: string) => invoke<Secret>("get_secret", { id }),

  list: (input: ListByCampaignInput) => invoke<Secret[]>("list_secrets", input),

  update: (data: {
    id: string;
    name?: string;
    content?: string;
    secret_type?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    is_revealed?: boolean;
    revealed_date?: string;
    reveal_conditions?: string;
    importance?: number;
  }) => invoke<Secret>("update_secret", data),

  delete: (id: string) => invoke<boolean>("delete_secret", { id }),
};

// Relationship commands
export const relationships = {
  create: (data: {
    campaign_id: string;
    source_type: EntityType;
    source_id: string;
    target_type: EntityType;
    target_id: string;
    relationship_type: string;
    description?: string;
    strength?: number;
    is_bidirectional?: boolean;
  }) => invoke<Relationship>("create_relationship", data),

  get: (id: string) => invoke<Relationship>("get_relationship", { id }),

  list: (input: ListByCampaignInput) =>
    invoke<Relationship[]>("list_relationships", input),

  getForEntity: (input: EntityScopedInput) =>
    invoke<Relationship[]>("get_entity_relationships", input),

  update: (data: {
    id: string;
    relationship_type?: string;
    description?: string;
    strength?: number;
    is_bidirectional?: boolean;
  }) => invoke<Relationship>("update_relationship", data),

  delete: (id: string) => invoke<boolean>("delete_relationship", { id }),
};

// Tag commands
export const tags = {
  create: (data: { campaign_id: string; name: string; color?: string }) =>
    invoke<Tag>("create_tag", data),

  get: (id: string) => invoke<Tag>("get_tag", { id }),

  list: (input: ListByCampaignInput) => invoke<Tag[]>("list_tags", input),

  delete: (id: string) => invoke<boolean>("delete_tag", { id }),

  addToEntity: (data: {
    tag_id: string;
    entity_type: EntityType;
    entity_id: string;
  }) => invoke<EntityTag>("add_entity_tag", data),

  removeFromEntity: (data: {
    tag_id: string;
    entity_type: EntityType;
    entity_id: string;
  }) => invoke<boolean>("remove_entity_tag", data),

  getForEntity: (input: EntityScopedInput) =>
    invoke<Tag[]>("get_entity_tags", input),
};

// Search commands
export const search = {
  entities: (input: SearchInput) =>
    invoke<SearchResult[]>("search_entities", input),
};

// AI Conversation types (response types from Rust commands)
export interface AiConversationResponse {
  id: string;
  campaign_id: string;
  context_type: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_creation_tokens: number;
  agent_messages_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMessageResponse {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_name: string | null;
  tool_input_json: string | null;
  tool_data_json: string | null;
  proposal_json: string | null;
  message_order: number;
  created_at: string;
}

export interface ConversationWithMessages {
  conversation: AiConversationResponse;
  messages: AiMessageResponse[];
}

// AI Conversation commands
export const aiConversations = {
  getOrCreate: (data: { campaign_id: string; context_type: string }) =>
    invoke<AiConversationResponse>("get_or_create_ai_conversation", data),

  load: (data: { campaign_id: string; context_type: string }) =>
    invoke<ConversationWithMessages | null>("load_ai_conversation", data),

  addMessage: (data: {
    conversation_id: string;
    role: string;
    content: string;
    tool_name?: string;
    tool_input_json?: string;
    tool_data_json?: string;
    proposal_json?: string;
  }) => invoke<AiMessageResponse>("add_ai_message", data),

  updateTokenCounts: (data: {
    conversation_id: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
  }) => invoke<AiConversationResponse>("update_ai_token_counts", data),

  clear: (data: { conversation_id: string }) =>
    invoke<boolean>("clear_ai_conversation", data),

  updateProposal: (data: { message_id: string; proposal_json: string }) =>
    invoke<AiMessageResponse>("update_ai_message_proposal", data),

  updateAgentMessages: (data: { conversation_id: string; agent_messages_json: string }) =>
    invoke<void>("update_ai_agent_messages", data),
};
