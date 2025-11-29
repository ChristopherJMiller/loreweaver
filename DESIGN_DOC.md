# LoreWeaver: AI-Assisted TTRPG Worldbuilding & Campaign Management

## Project Design Document

**Version:** 1.0  
**Date:** November 2025  
**Status:** Initial Design

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Goals](#2-problem-statement--goals)
3. [System Architecture](#3-system-architecture)
4. [Data Model](#4-data-model)
5. [AI System Design](#5-ai-system-design)
6. [Core Features & User Flows](#6-core-features--user-flows)
7. [UI/UX Design](#7-uiux-design)
8. [Export System](#8-export-system)
9. [Technical Implementation Plan](#9-technical-implementation-plan)
10. [Future Considerations](#10-future-considerations)

---

## 1. Executive Summary

**LoreWeaver** is a desktop application designed to help Game Masters (GMs) create, manage, and expand their tabletop RPG worlds with AI assistance. The application solves the fundamental tension between top-down worldbuilding (starting with the macro and struggling to zoom in) and bottom-up worldbuilding (starting with details and struggling to maintain consistency).

### Core Value Proposition

LoreWeaver is an AI co-pilot for worldbuilding that:

- **Understands structure, not just text** — The AI knows that "Lord Vance" is a character who rules a location, belongs to a faction, and has relationships with other entities
- **Works at any zoom level** — Generate a continent overview or flesh out a single tavern room
- **Maintains consistency** — Cross-references new content against existing lore automatically
- **Reduces tedium** — Transforms session notes into structured entity updates with GM approval
- **Stays out of the way** — AI assists on demand; the GM remains the author

### Technology Stack

- **Frontend:** React + TypeScript + Tiptap (rich text editor)
- **Backend:** Rust (Tauri) + SeaORM + SQLite
- **AI:** Claude Agent SDK (TypeScript) with Haiku/Sonnet models
- **Type Safety:** ts-rs for Rust → TypeScript type generation

---

## 2. Problem Statement & Goals

### 2.1 The Worldbuilding Dilemma

Game Masters face a fundamental challenge when creating campaign worlds:

**Top-Down Approach:**

- Start with cosmology, continents, nations
- Create detailed maps and histories
- **Problem:** Paralysis when players ask about a specific shopkeeper; overwhelming scope leads to burnout

**Bottom-Up Approach:**

- Start with the immediate adventure location
- Add detail as players explore
- **Problem:** Inconsistencies accumulate; the innkeeper's backstory contradicts the kingdom's history written later

**The Ideal (Spiral) Approach:**

- Detail expands outward from player focus
- Just-in-time worldbuilding with consistency checks
- **Problem:** Requires constant mental overhead to track what exists at each "zoom level"

### 2.2 Goals

| Goal                             | Success Metric                                         |
| -------------------------------- | ------------------------------------------------------ |
| Reduce worldbuilding time by 50% | User-reported prep time surveys                        |
| Eliminate lore inconsistencies   | Zero AI-detectable contradictions in generated content |
| Support any TTRPG system         | System-agnostic data model; system-specific exports    |
| Keep GM in creative control      | All AI output requires approval; no auto-commits       |
| Enable session-to-lore pipeline  | Session notes → structured updates in <2 minutes       |
| Work offline (except AI)         | Full CRUD functionality without internet               |

### 2.3 Non-Goals (v1.0)

- Real-time collaboration / multiplayer
- Session recording / transcription
- Virtual tabletop functionality
- Dice rolling or character sheet management
- Local LLM support

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LoreWeaver Application                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        FRONTEND (TypeScript/React)                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │   Tiptap     │  │   Entity     │  │   World      │  │    AI      │  │ │
│  │  │   Editor     │  │   Browser    │  │   Navigator  │  │  Sidebar   │  │ │
│  │  │              │  │   & Search   │  │   (Zoom)     │  │            │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │ │
│  │                                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    State Management (Zustand)                     │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                    │                                    │ │
│  │                          ts-rs Generated Types                          │ │
│  └────────────────────────────────────┼────────────────────────────────────┘ │
│                                       │                                      │
│                              Tauri IPC Bridge                                │
│                         (invoke commands / events)                           │
│                                       │                                      │
│  ┌────────────────────────────────────┼────────────────────────────────────┐ │
│  │                         BACKEND (Rust/Tauri)                            │ │
│  │                                    │                                    │ │
│  │  ┌──────────────┐  ┌──────────────┴──────────────┐  ┌────────────────┐ │ │
│  │  │   Command    │  │         SeaORM              │  │    Export      │ │ │
│  │  │   Handlers   │──│  ┌────────┐  ┌───────────┐  │  │    Engine      │ │ │
│  │  │              │  │  │Entities│  │ Relations │  │  │  (MD, FVTT)    │ │ │
│  │  └──────────────┘  │  └────────┘  └───────────┘  │  └────────────────┘ │ │
│  │                    │              │              │                      │ │
│  │                    └──────────────┼──────────────┘                      │ │
│  │                                   │                                     │ │
│  │                    ┌──────────────┴──────────────┐                      │ │
│  │                    │    SQLite + FTS5            │                      │ │
│  │                    │    (campaign.db)            │                      │ │
│  │                    └─────────────────────────────┘                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTPS
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AI LAYER (TypeScript)                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      Claude Agent SDK                                    ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ ││
│  │  │  Generator  │  │  Expander   │  │ Consistency │  │    Session      │ ││
│  │  │    Agent    │  │    Agent    │  │   Checker   │  │   Processor     │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ ││
│  │                           │                                              ││
│  │                    ┌──────┴───────┐                                      ││
│  │                    │  MCP Server  │                                      ││
│  │                    │  (Campaign   │                                      ││
│  │                    │   Context)   │                                      ││
│  │                    └──────────────┘                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                       │                                      │
└───────────────────────────────────────┼──────────────────────────────────────┘
                                        │
                                        ▼
                              Anthropic API (Claude)
```

### 3.2 Technology Choices Rationale

| Component         | Choice             | Rationale                                                               |
| ----------------- | ------------------ | ----------------------------------------------------------------------- |
| Desktop Framework | Tauri 2.0          | Small binary (~600KB), Rust performance, cross-platform, local-first    |
| ORM               | SeaORM             | Async, SQLite↔PostgreSQL portability, entity generation from migrations |
| Database          | SQLite + FTS5      | Local-first, full-text search, single-file portability                  |
| Type Bridge       | ts-rs              | Compile-time type safety between Rust and TypeScript                    |
| Frontend          | React + TypeScript | Ecosystem, component libraries, developer familiarity                   |
| State             | Zustand            | Lightweight, TypeScript-friendly, no boilerplate                        |
| Rich Text         | Tiptap             | Headless, extensible, ProseMirror foundation, mention support           |
| AI SDK            | Claude Agent SDK   | MCP support, subagents, built-in tool system                            |

### 3.3 Data Flow

```
User Action (Frontend)
        │
        ▼
   Tauri invoke("command_name", payload)
        │
        ▼
   Rust Command Handler
        │
        ├──► SeaORM Query/Mutation ──► SQLite
        │
        └──► Return Result<T, Error>
                    │
                    ▼
            TypeScript receives T (via ts-rs types)
                    │
                    ▼
            Zustand state update
                    │
                    ▼
            React re-render
```

### 3.4 AI Integration Flow

```
User requests AI generation
        │
        ▼
   Frontend calls AI service
        │
        ▼
   Claude Agent SDK orchestrates
        │
        ├──► MCP Server queries campaign DB for context
        │           │
        │           ▼
        │    Returns relevant entities, relationships, history
        │
        ├──► Agent generates content with context
        │
        └──► Returns structured output
                    │
                    ▼
            Frontend shows preview
                    │
                    ▼
            User approves/edits
                    │
                    ▼
            Tauri invoke to persist
```

---

## 4. Data Model

### 4.1 Entity Relationship Diagram

```
                                    ┌─────────────┐
                                    │   Campaign  │
                                    │─────────────│
                                    │ id          │
                                    │ name        │
                                    │ description │
                                    │ system      │
                                    │ created_at  │
                                    │ updated_at  │
                                    └──────┬──────┘
                                           │
           ┌───────────────┬───────────────┼───────────────┬───────────────┐
           │               │               │               │               │
           ▼               ▼               ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Location   │ │  Character  │ │Organization │ │    Quest    │ │   Session   │
    │─────────────│ │─────────────│ │─────────────│ │─────────────│ │─────────────│
    │ id          │ │ id          │ │ id          │ │ id          │ │ id          │
    │ campaign_id │ │ campaign_id │ │ campaign_id │ │ campaign_id │ │ campaign_id │
    │ parent_id   │ │ name        │ │ name        │ │ name        │ │ number      │
    │ name        │ │ lineage     │ │ type        │ │ status      │ │ date        │
    │ type        │ │ is_alive    │ │ description │ │ plot_type   │ │ title       │
    │ description │ │ description │ │             │ │ description │ │ notes       │
    │ detail_level│ │             │ │             │ │ reward      │ │ summary     │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────────────┘
           │               │               │               │
           │               │               │               │
           └───────────────┴───────┬───────┴───────────────┘
                                   │
                                   ▼
                          ┌───────────────────┐
                          │   Relationship    │
                          │───────────────────│
                          │ id                │
                          │ source_type       │
                          │ source_id         │
                          │ target_type       │
                          │ target_id         │
                          │ relationship_type │
                          │ description       │
                          │ is_bidirectional  │
                          └───────────────────┘

Additional Tables:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    Hero     │  │   Player    │  │  Timeline   │  │   Secret    │
│─────────────│  │─────────────│  │   Event     │  │─────────────│
│ id          │  │ id          │  │─────────────│  │ id          │
│ campaign_id │  │ campaign_id │  │ id          │  │ campaign_id │
│ player_id   │  │ name        │  │ campaign_id │  │ title       │
│ character_id│  │ preferences │  │ date_text   │  │ content     │
│ classes     │  │ notes       │  │ sort_order  │  │ known_by    │
│ lineage     │  │             │  │ title       │  │ revealed    │
│ description │  │             │  │ description │  │             │
└─────────────┘  └─────────────┘  │ entities    │  └─────────────┘
                                  └─────────────┘

┌─────────────┐  ┌─────────────┐
│    Tag      │  │ Entity_Tag  │
│─────────────│  │─────────────│
│ id          │  │ tag_id      │
│ campaign_id │  │ entity_type │
│ name        │  │ entity_id   │
│ color       │  │             │
└─────────────┘  └─────────────┘
```

### 4.2 Core Entity Definitions

#### 4.2.1 Campaign

The root container for all world data.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "campaigns")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub system: Option<String>,  // "D&D 5e", "Pathfinder 2e", "System Agnostic"
    pub settings_json: Option<String>,  // Campaign-specific settings
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

#### 4.2.2 Location

Hierarchical locations with zoom levels.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "locations")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub parent_id: Option<Uuid>,  // Self-referential for hierarchy
    pub name: String,
    pub location_type: LocationType,
    pub description: Option<String>,
    pub detail_level: i32,  // 0-100, used for "zoom level" visualization
    pub gm_notes: Option<String>,  // Hidden from players
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[ts(export)]
pub enum LocationType {
    #[sea_orm(string_value = "world")]
    World,
    #[sea_orm(string_value = "continent")]
    Continent,
    #[sea_orm(string_value = "region")]
    Region,
    #[sea_orm(string_value = "territory")]
    Territory,
    #[sea_orm(string_value = "settlement")]
    Settlement,
    #[sea_orm(string_value = "district")]
    District,
    #[sea_orm(string_value = "building")]
    Building,
    #[sea_orm(string_value = "room")]
    Room,
    #[sea_orm(string_value = "landmark")]
    Landmark,
    #[sea_orm(string_value = "wilderness")]
    Wilderness,
}
```

#### 4.2.3 Character

NPCs and other non-player characters.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "characters")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub name: String,
    pub lineage: Option<String>,  // "Human", "Elf", "Dragonborn", etc.
    pub occupation: Option<String>,
    pub is_alive: bool,
    pub description: Option<String>,
    pub personality: Option<String>,
    pub motivations: Option<String>,
    pub secrets: Option<String>,  // GM-only info
    pub voice_notes: Option<String>,  // How to roleplay them
    pub stat_block_json: Option<String>,  // Optional mechanical stats
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

#### 4.2.4 Organization

Factions, guilds, governments, etc.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "organizations")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub name: String,
    pub org_type: OrganizationType,
    pub description: Option<String>,
    pub goals: Option<String>,
    pub resources: Option<String>,
    pub reputation: Option<String>,  // How they're perceived publicly
    pub secrets: Option<String>,  // GM-only
    pub is_active: bool,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[ts(export)]
pub enum OrganizationType {
    #[sea_orm(string_value = "government")]
    Government,
    #[sea_orm(string_value = "guild")]
    Guild,
    #[sea_orm(string_value = "religion")]
    Religion,
    #[sea_orm(string_value = "military")]
    Military,
    #[sea_orm(string_value = "criminal")]
    Criminal,
    #[sea_orm(string_value = "mercantile")]
    Mercantile,
    #[sea_orm(string_value = "academic")]
    Academic,
    #[sea_orm(string_value = "secret_society")]
    SecretSociety,
    #[sea_orm(string_value = "family")]
    Family,
    #[sea_orm(string_value = "other")]
    Other,
}
```

#### 4.2.5 Quest

Storylines and adventure hooks.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "quests")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub name: String,
    pub status: QuestStatus,
    pub plot_type: PlotType,
    pub description: Option<String>,
    pub hook: Option<String>,  // How players discover it
    pub objectives: Option<String>,  // What needs to be done
    pub complications: Option<String>,  // What makes it hard
    pub resolution: Option<String>,  // How it ended (if complete)
    pub reward: Option<String>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[ts(export)]
pub enum QuestStatus {
    #[sea_orm(string_value = "planned")]
    Planned,  // GM has prepared, not yet introduced
    #[sea_orm(string_value = "available")]
    Available,  // Players can discover
    #[sea_orm(string_value = "active")]
    Active,  // Players are pursuing
    #[sea_orm(string_value = "completed")]
    Completed,
    #[sea_orm(string_value = "failed")]
    Failed,
    #[sea_orm(string_value = "abandoned")]
    Abandoned,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[ts(export)]
pub enum PlotType {
    #[sea_orm(string_value = "main")]
    Main,  // A-plot, campaign arc
    #[sea_orm(string_value = "secondary")]
    Secondary,  // B-plot, character arcs
    #[sea_orm(string_value = "side")]
    Side,  // One-off adventures
    #[sea_orm(string_value = "background")]
    Background,  // World events players may not engage with
}
```

#### 4.2.6 Relationship

Polymorphic relationships between any entities.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "relationships")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub source_type: EntityType,
    pub source_id: Uuid,
    pub target_type: EntityType,
    pub target_id: Uuid,
    pub relationship_type: String,  // "rules", "member_of", "enemy_of", "located_in", etc.
    pub description: Option<String>,
    pub is_bidirectional: bool,
    pub strength: Option<i32>,  // -100 (hostile) to 100 (devoted)
    pub is_public: bool,  // Known publicly or secret
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[ts(export)]
pub enum EntityType {
    #[sea_orm(string_value = "location")]
    Location,
    #[sea_orm(string_value = "character")]
    Character,
    #[sea_orm(string_value = "organization")]
    Organization,
    #[sea_orm(string_value = "quest")]
    Quest,
    #[sea_orm(string_value = "hero")]
    Hero,
    #[sea_orm(string_value = "item")]
    Item,
    #[sea_orm(string_value = "event")]
    Event,
}
```

#### 4.2.7 Hero (Player Character)

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "heroes")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub player_id: Option<Uuid>,
    pub name: String,
    pub lineage: Option<String>,
    pub classes: Option<String>,  // "Fighter 5 / Wizard 2"
    pub description: Option<String>,
    pub backstory: Option<String>,
    pub goals: Option<String>,
    pub bonds: Option<String>,
    pub is_active: bool,  // Current party member
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

#### 4.2.8 Player (Real Person)

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "players")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub name: String,
    pub preferences: Option<String>,  // What they enjoy in games
    pub boundaries: Option<String>,  // Content to avoid
    pub notes: Option<String>,  // GM notes about the player
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

#### 4.2.9 Session

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "sessions")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub session_number: i32,
    pub date: Option<NaiveDate>,
    pub title: Option<String>,
    pub planned_content: Option<String>,  // Pre-session prep
    pub notes: Option<String>,  // During-session notes
    pub summary: Option<String>,  // Post-session summary
    pub highlights: Option<String>,  // Memorable moments
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

#### 4.2.10 Timeline Event

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "timeline_events")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub date_display: String,  // "3rd Age, Year 1042" or "500 years ago"
    pub sort_order: i64,  // For ordering events
    pub title: String,
    pub description: Option<String>,
    pub significance: EventSignificance,
    pub is_public: bool,  // Known history vs secret
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[ts(export)]
pub enum EventSignificance {
    #[sea_orm(string_value = "world")]
    World,  // Everyone knows
    #[sea_orm(string_value = "regional")]
    Regional,  // Known in an area
    #[sea_orm(string_value = "local")]
    Local,  // Known in a community
    #[sea_orm(string_value = "personal")]
    Personal,  // Affects specific characters
}
```

#### 4.2.11 Secret

GM-only information with tracking for reveals.

```rust
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, TS)]
#[sea_orm(table_name = "secrets")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub title: String,
    pub content: String,
    pub related_entity_type: Option<EntityType>,
    pub related_entity_id: Option<Uuid>,
    pub known_by: Option<String>,  // Which NPCs know this
    pub revealed: bool,
    pub revealed_in_session: Option<i32>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

### 4.3 Full-Text Search Setup

SQLite FTS5 virtual table for fast searching across all content:

```sql
CREATE VIRTUAL TABLE search_index USING fts5(
    entity_type,
    entity_id UNINDEXED,
    campaign_id UNINDEXED,
    name,
    content,
    tokenize='porter unicode61'
);

-- Triggers to keep index updated
CREATE TRIGGER characters_ai AFTER INSERT ON characters BEGIN
    INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
    VALUES ('character', NEW.id, NEW.campaign_id, NEW.name,
            COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.personality, ''));
END;

-- Similar triggers for UPDATE, DELETE, and other entity types
```

---

## 5. AI System Design

> **Implementation Note (Nov 2025):** The original design specified Claude Agent SDK, but it
> doesn't work in browser environments. The implementation uses a custom in-browser agent loop
> with direct tool calling via the Anthropic SDK. This achieves the same goals with full
> browser compatibility. See `src/ai/agent/loop.ts` for the implementation.

### 5.1 Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Orchestration Layer                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    Custom Agent Loop (src/ai/agent/)                    ││
│  │                                                                          ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ ││
│  │  │  GENERATOR  │  │  EXPANDER   │  │ CONSISTENCY │  │    SESSION      │ ││
│  │  │    AGENT    │  │    AGENT    │  │   CHECKER   │  │   PROCESSOR     │ ││
│  │  │             │  │             │  │             │  │                 │ ││
│  │  │ • New NPCs  │  │ • Bullet→   │  │ • Cross-ref │  │ • Notes→Updates │ ││
│  │  │ • Locations │  │   Prose     │  │   new vs    │  │ • Extract new   │ ││
│  │  │ • Factions  │  │ • Add detail│  │   existing  │  │   entities      │ ││
│  │  │ • Items     │  │ • Flesh out │  │ • Flag      │  │ • Status changes│ ││
│  │  │             │  │   backstory │  │   conflicts │  │                 │ ││
│  │  │ Model: Haiku│  │ Model: Haiku│  │Model: Sonnet│  │ Model: Sonnet   │ ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ ││
│  │         │                │                │                  │          ││
│  │         └────────────────┴────────┬───────┴──────────────────┘          ││
│  │                                   │                                      ││
│  │                          ┌────────┴────────┐                            ││
│  │                          │  TOOL REGISTRY  │                            ││
│  │                          │ (src/ai/tools/) │                            ││
│  │                          └────────┬────────┘                            ││
│  │                                   │                                      ││
│  │                          ┌────────┴────────┐                            ││
│  │                          │     TOOLS       │                            ││
│  │                          │ • search_entities│                           ││
│  │                          │ • get_entity     │                           ││
│  │                          │ • get_relationships                          ││
│  │                          │ • get_timeline   │                           ││
│  │                          │ • get_location_hierarchy                     ││
│  │                          │ • get_campaign_context                       ││
│  │                          └─────────────────┘                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Tool Registry

> **Implementation Note:** Tools are registered directly in `src/ai/tools/` rather than
> through an MCP server. This provides the same functionality with simpler architecture.
> Each tool calls the Rust backend via Tauri IPC.

The tool registry exposes campaign data to Claude agents:

```typescript
// src/ai/tools/campaign-context/search-entities.ts

import type { Tool } from "../types";

export const searchEntities = tool(
  "search_entities",
  "Search for entities (characters, locations, organizations, etc.) in the campaign",
  z.object({
    query: z.string().describe("Search query"),
    entity_types: z
      .array(
        z.enum([
          "character",
          "location",
          "organization",
          "quest",
          "item",
          "event",
        ])
      )
      .optional()
      .describe("Filter by entity types"),
    limit: z.number().default(10).describe("Maximum results to return"),
  }),
  async ({ query, entity_types, limit }) => {
    // Calls Rust backend via Tauri IPC
    return await invoke("search_entities", { query, entity_types, limit });
  }
);

export const getEntity = tool(
  "get_entity",
  "Get full details of a specific entity by ID",
  z.object({
    entity_type: z.enum([
      "character",
      "location",
      "organization",
      "quest",
      "item",
      "event",
    ]),
    entity_id: z.string().uuid(),
  }),
  async ({ entity_type, entity_id }) => {
    return await invoke("get_entity", { entity_type, entity_id });
  }
);

export const getRelationships = tool(
  "get_relationships",
  "Get all relationships for an entity",
  z.object({
    entity_type: z.enum([
      "character",
      "location",
      "organization",
      "quest",
      "item",
      "event",
    ]),
    entity_id: z.string().uuid(),
    relationship_types: z.array(z.string()).optional(),
  }),
  async ({ entity_type, entity_id, relationship_types }) => {
    return await invoke("get_relationships", {
      entity_type,
      entity_id,
      relationship_types,
    });
  }
);

export const getLocationHierarchy = tool(
  "get_location_hierarchy",
  "Get the full location hierarchy (ancestors and descendants)",
  z.object({
    location_id: z.string().uuid(),
    depth: z.number().default(3).describe("How many levels to traverse"),
  }),
  async ({ location_id, depth }) => {
    return await invoke("get_location_hierarchy", { location_id, depth });
  }
);

export const getTimeline = tool(
  "get_timeline",
  "Get timeline events, optionally filtered by entity involvement",
  z.object({
    entity_type: z.enum(["character", "location", "organization"]).optional(),
    entity_id: z.string().uuid().optional(),
    limit: z.number().default(20),
  }),
  async ({ entity_type, entity_id, limit }) => {
    return await invoke("get_timeline", { entity_type, entity_id, limit });
  }
);

export const getCampaignContext = tool(
  "get_campaign_context",
  "Get high-level campaign context (setting, themes, active quests, party members)",
  z.object({}),
  async () => {
    return await invoke("get_campaign_context", {});
  }
);
```

### 5.3 Agent Definitions

> **Implementation Note:** Agents are implemented as specialized configurations of the
> `runAgent()` function in `src/ai/agent/loop.ts`, using different system prompts from
> `src/ai/agent/prompts.ts` rather than separate classes.

#### 5.3.1 Generator Agent

Creates new entities from scratch based on context.

```typescript
// src/ai/agents/generator.ts (planned for M6)

import { runAgent } from "../agent/loop";
import { createToolRegistry } from "../tools";

export interface GeneratorRequest {
  entityType: "character" | "location" | "organization" | "quest" | "item";
  constraints: {
    name?: string;
    parentLocation?: string;
    relatedTo?: { type: string; id: string; relationship: string }[];
    tags?: string[];
    briefDescription?: string;
  };
  qualityLevel: "fast" | "balanced" | "quality";
}

export async function generateEntity(request: GeneratorRequest) {
  const model =
    request.qualityLevel === "quality"
      ? "claude-sonnet-4-5-20250929"
      : "claude-haiku-4-5-20251001";

  const systemPrompt = `You are a creative worldbuilding assistant for tabletop RPGs.
Your role is to generate new ${request.entityType} entries that fit seamlessly into the existing world.

CRITICAL RULES:
1. Generated content must be consistent with existing lore
2. Use the provided tools to understand the world context before generating
3. Output must be in the exact JSON schema requested
4. Be creative but grounded - extraordinary elements should be rare
5. Include hooks for future storytelling

You have access to the campaign database via tools. ALWAYS search for related entities before generating.`;

  const result = await query({
    prompt: buildGeneratorPrompt(request),
    options: {
      model,
      systemPrompt,
      mcpServers: [mcpServer],
      maxTurns: 5,
    },
  });

  return parseGeneratorOutput(result);
}

function buildGeneratorPrompt(request: GeneratorRequest): string {
  let prompt = `Generate a new ${request.entityType} with the following constraints:\n\n`;

  if (request.constraints.name) {
    prompt += `Name: ${request.constraints.name}\n`;
  }
  if (request.constraints.parentLocation) {
    prompt += `Location: Should be in or near "${request.constraints.parentLocation}"\n`;
  }
  if (request.constraints.relatedTo?.length) {
    prompt += `Relationships:\n`;
    for (const rel of request.constraints.relatedTo) {
      prompt += `  - ${rel.relationship} ${rel.type} (ID: ${rel.id})\n`;
    }
  }
  if (request.constraints.tags?.length) {
    prompt += `Tags/Themes: ${request.constraints.tags.join(", ")}\n`;
  }
  if (request.constraints.briefDescription) {
    prompt += `Brief description: ${request.constraints.briefDescription}\n`;
  }

  prompt += `
First, use your tools to:
1. Get the campaign context
2. Search for related entities mentioned in the constraints
3. Understand the location hierarchy if relevant

Then generate the ${request.entityType} as a JSON object matching the schema.`;

  return prompt;
}
```

#### 5.3.2 Expander Agent

Takes brief notes and expands them into full prose.

```typescript
// agents/expander.ts

export interface ExpanderRequest {
  entityType: string;
  entityId: string;
  fieldToExpand: string;
  currentContent: string;
  targetLength: "short" | "medium" | "long";
  qualityLevel: "fast" | "balanced" | "quality";
}

export async function expandContent(request: ExpanderRequest) {
  const model =
    request.qualityLevel === "quality"
      ? "claude-sonnet-4-5-20250929"
      : "claude-haiku-4-5-20251001";

  const wordTargets = {
    short: "50-100",
    medium: "150-250",
    long: "300-500",
  };

  const systemPrompt = `You are a skilled fantasy writer helping a Game Master flesh out their world.
Your task is to expand brief notes into evocative, useful prose.

STYLE GUIDELINES:
1. Write in present tense for descriptions, past tense for history
2. Be vivid but concise - every sentence should add value
3. Include sensory details (sights, sounds, smells)
4. Add small details that could become plot hooks
5. Maintain the tone established by the existing content

TARGET LENGTH: ${wordTargets[request.targetLength]} words

You have access to the campaign database. Use it to ensure consistency with existing lore.`;

  const result = await query({
    prompt: `Expand the following ${request.fieldToExpand} for a ${request.entityType}:

CURRENT CONTENT:
${request.currentContent}

First, use tools to get context about this entity and related elements.
Then provide the expanded version.`,
    options: {
      model,
      systemPrompt,
      mcpServers: [mcpServer],
      maxTurns: 3,
    },
  });

  return result;
}
```

#### 5.3.3 Consistency Checker Agent

Validates new or edited content against existing lore.

```typescript
// agents/consistency-checker.ts

export interface ConsistencyCheckRequest {
  entityType: string;
  content: Record<string, unknown>;
  isNew: boolean;
}

export interface ConsistencyIssue {
  severity: "error" | "warning" | "suggestion";
  field: string;
  issue: string;
  conflictingEntity?: { type: string; id: string; name: string };
  suggestion?: string;
}

export async function checkConsistency(
  request: ConsistencyCheckRequest
): Promise<ConsistencyIssue[]> {
  // Always use Sonnet for consistency checking - requires reasoning
  const model = "claude-sonnet-4-5-20250929";

  const systemPrompt = `You are a lore consistency checker for a tabletop RPG campaign.
Your job is to identify contradictions, impossibilities, and inconsistencies in new or edited content.

CHECK FOR:
1. Timeline contradictions (character born after they supposedly acted)
2. Location impossibilities (landlocked port city)
3. Relationship conflicts (X is Y's parent but Y is older)
4. Dead characters appearing alive (or vice versa)
5. Faction membership conflicts
6. Power level inconsistencies

OUTPUT FORMAT:
Return a JSON array of issues, each with:
- severity: "error" (must fix), "warning" (should review), "suggestion" (optional improvement)
- field: which field has the issue
- issue: clear description of the problem
- conflictingEntity: (optional) the entity that conflicts
- suggestion: (optional) how to resolve

If no issues found, return an empty array.`;

  const result = await query({
    prompt: `Check this ${request.isNew ? "new" : "edited"} ${
      request.entityType
    } for consistency issues:

${JSON.stringify(request.content, null, 2)}

Use your tools extensively to:
1. Search for entities with similar names (duplicates?)
2. Check relationships for conflicts
3. Verify timeline consistency
4. Validate location hierarchy

Be thorough but practical - only flag real issues.`,
    options: {
      model,
      systemPrompt,
      mcpServers: [mcpServer],
      maxTurns: 8,
    },
  });

  return parseConsistencyOutput(result);
}
```

#### 5.3.4 Session Processor Agent

Transforms session notes into structured entity updates.

```typescript
// agents/session-processor.ts

export interface SessionProcessorRequest {
  sessionNotes: string;
  sessionNumber: number;
}

export interface EntityUpdate {
  action: "create" | "update" | "delete";
  entityType: string;
  entityId?: string; // For updates/deletes
  entityName: string;
  changes: Record<string, unknown>;
  confidence: number; // 0-1, how confident the AI is
  reasoning: string;
}

export async function processSessionNotes(
  request: SessionProcessorRequest
): Promise<EntityUpdate[]> {
  // Always Sonnet for session processing - complex reasoning required
  const model = "claude-sonnet-4-5-20250929";

  const systemPrompt = `You are a session note processor for a tabletop RPG campaign.
Your job is to read session notes and extract structured updates to the campaign database.

EXTRACT:
1. NEW ENTITIES: Characters, locations, items mentioned for the first time
2. STATUS CHANGES: Deaths, alliances formed/broken, quests completed
3. RELATIONSHIP UPDATES: New connections between entities
4. LOCATION DISCOVERIES: New places revealed
5. TIMELINE EVENTS: Significant moments to record

OUTPUT FORMAT:
Return a JSON array of proposed updates, each with:
- action: "create", "update", or "delete"
- entityType: the type of entity
- entityId: (for updates) the existing entity ID
- entityName: human-readable name
- changes: object with the specific field changes
- confidence: 0-1 how confident you are this is correct
- reasoning: brief explanation

BE CONSERVATIVE:
- Only propose changes you're confident about
- When in doubt, mark lower confidence
- Prefer updates to existing entities over creating duplicates
- Use tools to find existing entities before proposing creates

The GM will review all changes before applying.`;

  const result = await query({
    prompt: `Process these session notes from Session ${request.sessionNumber}:

---
${request.sessionNotes}
---

Steps:
1. First, use get_campaign_context to understand the current state
2. For each potential entity mentioned, search to see if it already exists
3. Build a list of proposed updates
4. Double-check relationships make sense

Remember: The GM will review everything. It's better to miss something than to propose incorrect changes.`,
    options: {
      model,
      systemPrompt,
      mcpServers: [mcpServer],
      maxTurns: 10,
    },
  });

  return parseSessionProcessorOutput(result);
}
```

### 5.4 Model Selection Logic

> **Implementation:** See `src/ai/model-selector.ts` and `src/ai/models.ts` for the actual
> implementation. Model preference is stored in aiStore and persisted via Tauri plugin-store.

```typescript
// src/ai/model-selector.ts

export type QualityPreference = "speed" | "balanced" | "quality";

export interface TaskContext {
  taskType: "generate" | "expand" | "check" | "process";
  contentLength: "short" | "medium" | "long";
  requiresReasoning: boolean;
  userPreference: QualityPreference;
}

export function selectModel(context: TaskContext): string {
  // Tasks that ALWAYS need Sonnet regardless of preference
  if (context.taskType === "check" || context.taskType === "process") {
    return "claude-sonnet-4-5-20250929";
  }

  // For generation and expansion, respect user preference
  if (context.userPreference === "speed") {
    return "claude-haiku-4-5-20251001";
  }

  if (context.userPreference === "quality") {
    return "claude-sonnet-4-5-20250929";
  }

  // Balanced: Use content length as tiebreaker
  if (context.contentLength === "long" || context.requiresReasoning) {
    return "claude-sonnet-4-5-20250929";
  }

  return "claude-haiku-4-5-20251001";
}
```

---

## 6. Core Features & User Flows

### 6.1 Feature Overview

| Feature               | Description                                     | Priority |
| --------------------- | ----------------------------------------------- | -------- |
| Campaign Management   | Create, switch, export campaigns                | P0       |
| Entity CRUD           | Create, read, update, delete all entity types   | P0       |
| Rich Text Editing     | Tiptap-based editor with @mentions              | P0       |
| Entity Relationships  | Link entities together with typed relationships | P0       |
| Search                | Full-text search across all content             | P0       |
| World Navigator       | Hierarchical location browser with zoom         | P0       |
| AI Generation         | Create new entities from prompts                | P1       |
| AI Expansion          | Expand brief notes to full prose                | P1       |
| Session Mode          | Special mode for during-game notes              | P1       |
| Session Processing    | Convert notes to entity updates                 | P1       |
| Consistency Checking  | Validate content against lore                   | P1       |
| Markdown Export       | Export to Markdown files                        | P2       |
| Foundry VTT Export    | Export to Foundry format                        | P2       |
| Detail Level Tracking | Track completeness of each entity               | P2       |
| Random Tables         | Create and roll on custom tables                | P3       |

### 6.2 Key User Flows

#### 6.2.1 Creating a New Character (with AI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. USER: Clicks "+ New Character" or types /generate character              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. MODAL: "Generate Character"                                              │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ Name (optional): [________________]                                 │  │
│    │                                                                     │  │
│    │ Located in: [Dropdown: existing locations_____▼]                    │  │
│    │                                                                     │  │
│    │ Related to: [+ Add relationship]                                    │  │
│    │   └─ [Member of] [The Merchant's Guild    ▼]                       │  │
│    │                                                                     │  │
│    │ Brief description:                                                  │  │
│    │ ┌─────────────────────────────────────────────────────────────────┐│  │
│    │ │ A shady information broker with connections to the underworld   ││  │
│    │ └─────────────────────────────────────────────────────────────────┘│  │
│    │                                                                     │  │
│    │ Quality: ○ Speed  ● Balanced  ○ Quality                            │  │
│    │                                                                     │  │
│    │                              [Cancel]  [Generate]                   │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ [User clicks Generate]
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. LOADING STATE: "Generating... (Gathering context → Creating character)"  │
│    [AI uses MCP tools to search campaign, then generates]                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. PREVIEW: Generated character shown in editor (not yet saved)             │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ # Vex Thornwood                                          [Discard]  │  │
│    │                                                          [Save]     │  │
│    │ **Lineage:** Half-elf                                               │  │
│    │ **Occupation:** Information Broker                                  │  │
│    │                                                                     │  │
│    │ ## Description                                                      │  │
│    │ A lean figure perpetually shrouded in the shadows of the Dockside  │  │
│    │ taverns, Vex Thornwood trades in secrets the way others trade in   │  │
│    │ coin. Their mismatched eyes—one green, one milky white—miss        │  │
│    │ nothing...                                                          │  │
│    │                                                                     │  │
│    │ ## Personality                                                      │  │
│    │ Calculating but not cruel, Vex operates by a code: information     │  │
│    │ flows to the highest bidder, but never to those who would harm     │  │
│    │ children or destroy livelihoods wholesale...                        │  │
│    │                                                                     │  │
│    │ ─────────────────────────────────────────────────────────────────  │  │
│    │ RELATIONSHIPS (auto-created):                                       │  │
│    │  • Member of: The Merchant's Guild (cover identity)                │  │
│    │  • Located in: The Docks District                                   │  │
│    │  • Contact of: [Search to link...]                                 │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ [User edits if needed, clicks Save]
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. SAVED: Character now in database, relationships created, searchable     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.2 Session Mode Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. USER: Clicks "Start Session" button                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. SESSION MODE UI:                                                         │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ SESSION 14                                          [End Session]   │  │
│    │ Started: 7:32 PM                                                    │  │
│    ├─────────────────────────────────────────────────────────────────────┤  │
│    │                                                                     │  │
│    │ QUICK REFERENCE          │  SESSION NOTES                          │  │
│    │ ───────────────          │  ─────────────                          │  │
│    │ 📍 Current: Ironhold     │  • Party arrived at Ironhold            │  │
│    │                          │  • Met with Lord Vance - tense          │  │
│    │ 👥 Present NPCs:         │  • He wants them to clear the mines     │  │
│    │   • Lord Vance           │  • Reward: 500gp + mining rights        │  │
│    │   • Captain Mira         │  • Party suspicious of his motives      │  │
│    │   [+ Quick add]          │  • @Elena asked about the old war       │  │
│    │                          │  • Vance dodged the question            │  │
│    │ ⚔️ Active Quests:        │  • Heading to mines tomorrow            │  │
│    │   • Clear the Mines      │  • Bought supplies from @Thornwick      │  │
│    │   • Find the Heir        │  │                                      │  │
│    │                          │  │                                      │  │
│    │ 🎲 Quick Rolls:          │  [Note input box_______________]       │  │
│    │   [d20] [d6] [d100]      │                                         │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ [Session ends, user clicks End Session]
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. PROCESS SESSION MODAL:                                                    │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ Process Session Notes?                                              │  │
│    │                                                                     │  │
│    │ LoreWeaver can analyze your session notes and suggest updates to   │  │
│    │ your campaign database. You'll review all changes before applying. │  │
│    │                                                                     │  │
│    │                    [Skip]  [Process Notes]                         │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ [User clicks Process Notes]
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. PROCESSING: AI analyzes notes with campaign context                      │
│    "Analyzing session notes... Searching for existing entities...           │
│     Identifying changes... Building update proposals..."                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. REVIEW UPDATES:                                                          │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ Proposed Updates from Session 14                    [Apply Selected]│  │
│    ├─────────────────────────────────────────────────────────────────────┤  │
│    │                                                                     │  │
│    │ ☑ NEW QUEST: "Clear the Ironhold Mines"              Confidence: 95%│  │
│    │   Status: Active | Reward: 500gp + mining rights                   │  │
│    │   Quest Giver: Lord Vance | Related: Ironhold                       │  │
│    │   [Preview] [Edit]                                                  │  │
│    │                                                                     │  │
│    │ ☑ UPDATE: Lord Vance                                 Confidence: 88%│  │
│    │   Add note: "Evasive about the old war with Thornwick"             │  │
│    │   [Preview] [Edit]                                                  │  │
│    │                                                                     │  │
│    │ ☑ NEW RELATIONSHIP: Elena ←knows→ Thornwick          Confidence: 72%│  │
│    │   "Elena asked Thornwick about supplies"                           │  │
│    │   [Preview] [Edit]                                                  │  │
│    │                                                                     │  │
│    │ ☐ NEW CHARACTER: "Thornwick" (shopkeeper)            Confidence: 60%│  │
│    │   ⚠️ Low confidence - may already exist                            │  │
│    │   [Search existing] [Create anyway] [Skip]                         │  │
│    │                                                                     │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ [User reviews, edits, applies]
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. APPLIED: Selected updates saved to database                              │
│    "4 updates applied. Session 14 saved."                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 World Navigator (Zoom Levels)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORLD NAVIGATOR                                                     [−][×] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 🌍 Aethermoor (World) ──────────────────────────────── Detail: 45% ─┐  │
│  │                                                                       │  │
│  │  ┌─ 🗺️ The Northern Reach (Region) ──────────────────── Detail: 62% ┐│  │
│  │  │                                                                   ││  │
│  │  │  ┌─ 🏰 Ironhold Duchy (Territory) ─────────────────── Detail: 78%┐││  │
│  │  │  │                                                               │││  │
│  │  │  │  ▶ 🏘️ Ironhold City ────────────────────────────── Detail: 85%│││  │
│  │  │  │    ├─ 🏚️ The Docks District ────────────────────── Detail: 40%│││  │
│  │  │  │    │   └─ 🍺 The Rusty Anchor (tavern) ─────────── Detail: 90%│││  │
│  │  │  │    ├─ 🏛️ The Noble Quarter ─────────────────────── Detail: 25%│││  │
│  │  │  │    └─ ⛏️ The Mining District ───────────────────── Detail: 15%│││  │
│  │  │  │                                                               │││  │
│  │  │  │  ▷ 🏔️ The Ironhold Mines ───────────────────────── Detail: 10%│││  │
│  │  │  │  ▷ 🌲 Whispering Woods ──────────────────────────── Detail: 5%│││  │
│  │  │  │                                                               │││  │
│  │  │  └───────────────────────────────────────────────────────────────┘││  │
│  │  │                                                                   ││  │
│  │  │  ▷ 🏰 Thornwick Barony ─────────────────────────────── Detail: 20%││  │
│  │  │                                                                   ││  │
│  │  └───────────────────────────────────────────────────────────────────┘│  │
│  │                                                                       │  │
│  │  ▷ 🗺️ The Sunward Coast (Region) ─────────────────────── Detail: 12% │  │
│  │  ▷ 🗺️ The Mistfen Marshes (Region) ───────────────────── Detail: 8%  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 💡 "The Mining District only has 15% detail. The party is heading    │  │
│  │    there next session. Would you like to expand it?"                 │  │
│  │                                              [Expand with AI] [Later]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. UI/UX Design

### 7.1 Application Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LoreWeaver                                    Campaign: The Iron Crown  ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────┐ ┌─────────────────────────────────────────────────────────────────┤
│ │       │ │ ┌─────────────────────────────────────────────────────────────┐ │
│ │  N    │ │ │                                                             │ │
│ │  A    │ │ │                      MAIN CONTENT AREA                      │ │
│ │  V    │ │ │                                                             │ │
│ │       │ │ │   Entity Editor / Search Results / World Navigator          │ │
│ │  B    │ │ │                                                             │ │
│ │  A    │ │ │                                                             │ │
│ │  R    │ │ │                                                             │ │
│ │       │ │ │                                                             │ │
│ │ ───── │ │ │                                                             │ │
│ │ 📍    │ │ │                                                             │ │
│ │ 👤    │ │ │                                                             │ │
│ │ 🏛️    │ │ │                                                             │ │
│ │ 📜    │ │ │                                                             │ │
│ │ 📅    │ │ │                                                             │ │
│ │ 🔍    │ │ └─────────────────────────────────────────────────────────────┘ │
│ │       │ │ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ───── │ │ │ RELATIONSHIPS & CONTEXT PANEL                    [Collapse]│ │
│ │ ⚙️    │ │ │                                                             │ │
│ └───────┘ │ └─────────────────────────────────────────────────────────────┘ │
└───────────┴─────────────────────────────────────────────────────────────────┘

NAVIGATION BAR ICONS:
📍 Locations (World Navigator)
👤 Characters
🏛️ Organizations
📜 Quests
📅 Timeline
🔍 Search
⚙️ Settings
```

### 7.2 Component Library

Use **shadcn/ui** components for consistency:

- Command palette (⌘K) for quick navigation and actions
- Dialogs for modals (generation, confirmation)
- Dropdown menus for entity type selection
- Tabs for entity sections
- Badges for tags and status
- Toast notifications for actions
- Skeleton loaders for AI operations

### 7.3 Tiptap Editor Configuration

```typescript
// editor/extensions.ts

import { StarterKit } from "@tiptap/starter-kit";
import { Mention } from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Typography } from "@tiptap/extension-typography";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),

  // @mentions for entities
  Mention.configure({
    HTMLAttributes: { class: "entity-mention" },
    suggestion: {
      items: async ({ query }) => {
        // Search entities from Rust backend
        return await invoke("search_entities_for_mention", { query });
      },
      render: () => {
        // Custom mention dropdown component
        return mentionRenderer;
      },
    },
  }),

  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return "Enter a title...";
      }
      return "Start writing, or type @ to mention an entity...";
    },
  }),

  Typography,
];
```

### 7.4 AI Integration UI Patterns

#### Inline AI Assistance

```
┌─────────────────────────────────────────────────────────────────┐
│ ## Description                                                   │
│                                                                  │
│ A grizzled veteran of the Northern Wars, Captain Mira|          │
│                                          ▲                       │
│                                          │                       │
│                            ┌─────────────┴───────────────┐      │
│                            │ ✨ AI Suggestions           │      │
│                            ├─────────────────────────────┤      │
│                            │ • Expand this paragraph     │      │
│                            │ • Add personality details   │      │
│                            │ • Generate appearance       │      │
│                            │ • Suggest motivations       │      │
│                            └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

#### Generation Preview

```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 AI Generated Content                          [Accept] [Edit]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Captain Mira Stonehelm bears the weight of thirty years on    │
│  the frontier in the deep lines of her weathered face. A       │
│  jagged scar runs from her left temple to her jaw—a memento    │
│  from the Siege of Thornwick that she neither hides nor        │
│  discusses. Her steel-gray hair is kept short and practical,   │
│  and her eyes hold the quiet intensity of someone who has      │
│  seen too many good soldiers die.                               │
│                                                                  │
│  ───────────────────────────────────────────────────────────── │
│  📊 Generated with: Balanced (Haiku) | 127 tokens              │
│  🔗 Referenced: The Northern Wars, Siege of Thornwick          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Export System

### 8.1 Markdown Export

Export structure:

```
campaign-export/
├── README.md                 # Campaign overview
├── locations/
│   ├── _index.md            # Location hierarchy overview
│   ├── ironhold-city.md
│   ├── the-docks-district.md
│   └── ...
├── characters/
│   ├── _index.md            # Character list
│   ├── lord-vance.md
│   ├── captain-mira.md
│   └── ...
├── organizations/
│   └── ...
├── quests/
│   └── ...
├── timeline/
│   └── events.md
└── sessions/
    ├── session-001.md
    └── ...
```

Example character export:

```markdown
---
type: character
name: Lord Vance
status: alive
lineage: Human
location: Ironhold Castle
organizations:
  - Ironhold Nobility (leader)
tags:
  - noble
  - antagonist
  - political
---

# Lord Vance

**Lineage:** Human  
**Occupation:** Lord of Ironhold Duchy  
**Status:** Alive

## Description

A stern man in his fifties with silver-streaked black hair...

## Personality

Cold and calculating, Lord Vance views people as pieces on a board...

## Relationships

- **Rules:** Ironhold Duchy
- **Commands:** Captain Mira (complicated loyalty)
- **Rivals:** Baron Thornwick
- **Seeks:** The Lost Crown of Aethermoor

## GM Notes

> Secretly funding the bandits in the Whispering Woods to destabilize
> Thornwick's barony. The party doesn't know this yet.

## Appearances

- Session 12: First mentioned
- Session 14: First meeting with party
```

### 8.2 Foundry VTT Export

Export to Foundry's Actor/Item/JournalEntry format:

```typescript
// export/foundry.ts

interface FoundryActor {
  name: string;
  type: "npc" | "character";
  img: string;
  system: {
    biography: { value: string };
    // System-specific fields (D&D 5e, PF2e, etc.)
  };
  items: FoundryItem[];
  flags: {
    loreweaver: {
      sourceId: string;
      exportedAt: string;
    };
  };
}

interface FoundryJournalEntry {
  name: string;
  content: string;
  img: string;
  folder: string | null;
  flags: {
    loreweaver: {
      entityType: string;
      sourceId: string;
    };
  };
}

export async function exportToFoundry(
  campaignId: string,
  options: ExportOptions
) {
  const campaign = await invoke("get_campaign", { id: campaignId });

  // Export characters as Actors or Journal Entries based on option
  const characters = await invoke("get_all_characters", { campaignId });
  const actorExports = characters.map((char) =>
    characterToFoundryActor(char, options)
  );

  // Export locations, organizations as Journal Entries
  const locations = await invoke("get_all_locations", { campaignId });
  const locationJournals = locations.map((loc) => locationToJournalEntry(loc));

  // Bundle into Foundry-importable format
  return {
    actors: actorExports,
    journal: [...locationJournals, ...organizationJournals, ...questJournals],
    folders: generateFolderStructure(campaign),
  };
}
```

---

## 9. Technical Implementation Plan

### 9.1 Project Structure

```
loreweaver/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # Library exports
│   │   ├── commands/             # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── campaign.rs
│   │   │   ├── entity.rs
│   │   │   ├── search.rs
│   │   │   └── export.rs
│   │   ├── db/                   # Database layer
│   │   │   ├── mod.rs
│   │   │   └── migrations/
│   │   ├── entities/             # SeaORM entities
│   │   │   ├── mod.rs
│   │   │   ├── campaign.rs
│   │   │   ├── character.rs
│   │   │   ├── location.rs
│   │   │   └── ...
│   │   └── export/               # Export engines
│   │       ├── mod.rs
│   │       ├── markdown.rs
│   │       └── foundry.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # TypeScript frontend
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Root component
│   ├── components/
│   │   ├── editor/               # Tiptap editor components
│   │   ├── entities/             # Entity type components
│   │   ├── navigation/           # Nav bar, world navigator
│   │   ├── ai/                   # AI-related UI components
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/                    # Custom React hooks
│   ├── stores/                   # Zustand stores
│   ├── lib/
│   │   ├── tauri.ts              # Tauri invoke wrappers
│   │   └── utils.ts
│   └── types/                    # ts-rs generated types
│       └── bindings.ts
│
├── ai/                           # AI layer (TypeScript)
│   ├── agents/
│   │   ├── generator.ts
│   │   ├── expander.ts
│   │   ├── consistency-checker.ts
│   │   └── session-processor.ts
│   ├── mcp-server/
│   │   ├── server.ts
│   │   └── tools.ts
│   └── model-selector.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 9.2 Development Phases

#### Phase 1: Foundation (Weeks 1-3)

**Rust Backend:**

- [ ] Initialize Tauri project with Vite + React template
- [ ] Set up SeaORM with SQLite
- [ ] Create all entity models and migrations
- [ ] Implement ts-rs type generation
- [ ] Build basic CRUD commands for all entities
- [ ] Implement FTS5 search

**Frontend:**

- [ ] Set up React with TypeScript and Zustand
- [ ] Configure shadcn/ui components
- [ ] Build navigation bar and routing
- [ ] Create entity list views (table/grid)
- [ ] Build basic entity detail views

**Milestone:** Can create, view, edit, delete all entity types locally

#### Phase 2: Rich Editing & Relationships (Weeks 4-5)

**Editor:**

- [ ] Integrate Tiptap with StarterKit
- [ ] Implement @mention extension with entity search
- [ ] Add entity linking from mentions
- [ ] Build relationship management UI
- [ ] Implement relationship visualization (simple graph or list)

**World Navigator:**

- [ ] Build hierarchical location tree component
- [ ] Implement detail level calculation
- [ ] Add location creation at any level
- [ ] Build location breadcrumb navigation

**Milestone:** Rich editing with entity mentions, relationship tracking, hierarchical navigation

#### Phase 3: AI Integration (Weeks 6-8)

**MCP Server:**

- [ ] Set up Claude Agent SDK
- [ ] Implement MCP server with campaign tools
- [ ] Connect MCP tools to Tauri backend

**Agents:**

- [ ] Build Generator Agent with context gathering
- [ ] Build Expander Agent
- [ ] Implement quality/speed model selection
- [ ] Create AI preview/approval UI

**Milestone:** Can generate new entities and expand existing content with AI

#### Phase 4: Session Mode & Processing (Weeks 9-10)

**Session Mode:**

- [ ] Build session mode UI with quick reference panel
- [ ] Implement session note-taking
- [ ] Add entity quick-reference sidebar

**Session Processing:**

- [ ] Build Session Processor Agent
- [ ] Create entity update proposal UI
- [ ] Implement batch update application
- [ ] Add confidence indicators and edit capability

**Milestone:** Full session workflow from notes to entity updates

#### Phase 5: Polish & Export (Weeks 11-12)

**Consistency Checking:**

- [ ] Build Consistency Checker Agent
- [ ] Add pre-save consistency checks
- [ ] Create issue resolution UI

**Exports:**

- [ ] Implement Markdown export with templates
- [ ] Build Foundry VTT export
- [ ] Add export configuration UI

**Polish:**

- [ ] Add keyboard shortcuts throughout
- [ ] Implement command palette (⌘K)
- [ ] Performance optimization
- [ ] Error handling and user feedback
- [ ] Documentation and onboarding

**Milestone:** Production-ready v1.0

### 9.3 Dependencies

#### Rust (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["shell-open"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
sea-orm = { version = "1", features = ["sqlx-sqlite", "runtime-tokio-rustls"] }
sea-orm-migration = { version = "1", features = ["sqlx-sqlite", "runtime-tokio-rustls"] }
ts-rs = { version = "9", features = ["serde-compat", "uuid-impl", "chrono-impl"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
thiserror = "1"
```

#### TypeScript (package.json)

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^1.0.0",
    "@tauri-apps/api": "^2.0.0",
    "@tiptap/react": "^2.5.0",
    "@tiptap/starter-kit": "^2.5.0",
    "@tiptap/extension-mention": "^2.5.0",
    "@tiptap/extension-placeholder": "^2.5.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## 10. Future Considerations

### 10.1 Cloud Sync (v2.0)

When ready to add cloud capabilities:

**Database Migration:**

```rust
// SeaORM makes this straightforward
let db = Database::connect("postgres://user:pass@host/db").await?;
// Same entity code works with PostgreSQL
```

**Sync Strategy:**

- Implement CRDTs or last-write-wins for conflict resolution
- Add `sync_status` field to all entities
- Background sync with offline queue
- Account system with campaign sharing

### 10.2 Collaboration (v2.5)

**Architecture Changes:**

- WebSocket connection for real-time updates
- Operational transforms or CRDT for concurrent editing
- Role-based permissions (GM vs Player view)
- Player-visible vs GM-only content enforcement

### 10.3 Additional Features

| Feature                  | Version | Notes                                     |
| ------------------------ | ------- | ----------------------------------------- |
| Custom random tables     | v1.1    | User-defined tables with weighted rolls   |
| Map integration          | v1.2    | Import maps, place pins for locations     |
| NPC voice generator      | v1.3    | Generate voice/speech patterns for NPCs   |
| Combat encounter builder | v2.0    | Balance encounters with party composition |
| Calendar system          | v2.0    | In-world calendar with events             |
| Player portal            | v2.5    | Shared view for players (limited info)    |
| Mobile companion         | v3.0    | Quick reference app for sessions          |

### 10.4 Monetization Considerations

If pursuing commercial release:

**Free Tier:**

- 1 campaign
- 100 entities
- Basic AI (speed mode only)
- Markdown export

**Pro Tier ($8-12/month):**

- Unlimited campaigns
- Unlimited entities
- Full AI capabilities (quality mode)
- All exports
- Priority support

**Considerations:**

- Users provide their own Anthropic API key, or
- Bundled AI credits with subscription

---

## Appendix A: Glossary

| Term         | Definition                                                    |
| ------------ | ------------------------------------------------------------- |
| Campaign     | A complete game world with all associated content             |
| Entity       | Any discrete element in the world (character, location, etc.) |
| Hero         | A player character (PC)                                       |
| Player       | The real person playing a hero                                |
| NPC          | Non-player character, controlled by the GM                    |
| Lineage      | The fantasy race/species of a character (avoids "race")       |
| Detail Level | 0-100% measure of how fleshed-out an entity is                |
| Session Mode | Special UI state during active gameplay                       |
| MCP          | Model Context Protocol - standard for AI tool integration     |
| FTS5         | SQLite Full-Text Search extension                             |

---

## Appendix B: References

**TTRPG Worldbuilding:**

- Sly Flourish's "Return of the Lazy Dungeon Master"
- Spiral Campaign Development methodology
- "Just-in-Time" worldbuilding approach

**Technical:**

- [Tauri 2.0 Documentation](https://v2.tauri.app/)
- [SeaORM Documentation](https://www.sea-ql.org/SeaORM/)
- [ts-rs GitHub](https://github.com/Aleph-Alpha/ts-rs)
- [Claude Agent SDK Documentation](https://docs.anthropic.com/agent-sdk)
- [Tiptap Editor Documentation](https://tiptap.dev/docs)
- [Model Context Protocol Specification](https://github.com/modelcontextprotocol)

**Existing Tools (Competitive Analysis):**

- Kanka.io
- World Anvil
- LoreKeeper.ai
- Archivist

---

_Document Version: 1.0_  
_Last Updated: November 2025_
