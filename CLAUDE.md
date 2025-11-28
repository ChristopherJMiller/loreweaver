# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loreweaver is a Tauri v2 desktop application with a React 19 + TypeScript frontend and Rust backend.

**Repository:** https://github.com/ChristopherJMiller/loreweaver

## Development Environment

This project uses Nix flakes for reproducible development. Enter the development shell:

```bash
nix develop
```

## Common Commands

**Remember to use `nix develop -c` to run commands inside of the nix environment**

**Development (runs both frontend and backend):**

```bash
cargo tauri dev
```

**Build for production:**

```bash
cargo tauri build
```

**Frontend only (Vite dev server on port 1420):**

```bash
pnpm dev
```

**Type checking:**

```bash
pnpm build  # runs tsc && vite build
```

**Rust commands (from src-tauri/):**

```bash
cargo check
cargo clippy
cargo test
```

**Generate SeaORM entities from migrations:**

```bash
# Must be run from inside nix develop shell
./src-tauri/scripts/generate-entities.sh
```

This script:

1. Removes the old dev.db
2. Runs all migrations to create a fresh database schema
3. Uses `sea-orm-cli generate entity` to generate entity files in `entity/src/`
4. Generated entities need manual addition of ts-rs derives (see issue #15 for automation ideas)

## Architecture

### Three-Layer Architecture

The application follows strict layer separation:

1. **Frontend (React/TS)** - UI and state management only, NO business logic
2. **Backend (Rust/Tauri)** - Commands, business logic, data persistence
3. **AI Layer (TypeScript)** - Agents, MCP Server, model selection (future)

### Frontend (`src/`)

- React 19 with TypeScript
- Vite as build tool (port 1420)
- Zustand for state management
- Radix UI + Tailwind CSS for components
- Calls Rust backend via `@tauri-apps/api/core` `invoke()` function

### Backend (`src-tauri/`)

- Rust with Tauri v2
- SeaORM for database (SQLite)
- `lib.rs`: Main entry point, defines Tauri commands and app builder
- `main.rs`: Windows-specific entry point wrapper
- Commands are registered via `tauri::generate_handler![]` macro

### Configuration

- `src-tauri/tauri.conf.json`: Tauri app configuration (window size, bundling, security)
- `src-tauri/capabilities/`: Permission capabilities for Tauri plugins

## Development Patterns

### Three-Layer Command Pattern

All Tauri commands follow a three-layer architecture for testability:

**Layer 1 - Implementation Functions** (testable core logic):
```rust
pub async fn create_character_impl(
    db: &DatabaseConnection,
    campaign_id: String,
    name: String,
) -> Result<CharacterResponse, AppError> {
    // Business logic here
}
```

**Layer 2 - Response Types** (data serialization):
```rust
pub struct CharacterResponse {
    pub id: String,
    pub name: String,
    pub created_at: String,  // DateTimeUtc → String conversion
}

impl From<character::Model> for CharacterResponse {
    fn from(model: character::Model) -> Self { ... }
}
```

**Layer 3 - Tauri Command Wrapper**:
```rust
#[tauri::command(rename_all = "snake_case")]
pub async fn create_character(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
) -> Result<CharacterResponse, AppError> {
    create_character_impl(&state.db, campaign_id, name).await
}
```

### Frontend-Backend Communication

**CRITICAL: All invoke arguments must use snake_case, never camelCase.**

This is enforced by Tauri's `rename_all = "snake_case"` and verified by contract tests.

```typescript
// CORRECT
await invoke("create_character", { campaign_id: "123", name: "Hero" });

// WRONG - will fail silently or error
await invoke("create_character", { campaignId: "123", name: "Hero" });
```

### Tauri Wrapper Library

All Tauri commands are wrapped in `src/lib/tauri.ts`:

```typescript
export const characters = {
  create: (data: {...}) => invoke<Character>("create_character", data),
  get: (id: string) => invoke<Character>("get_character", { id }),
  list: (input: ListByCampaignInput) => invoke<Character[]>("list_characters", input),
  update: (data: {...}) => invoke<Character>("update_character", data),
  delete: (id: string) => invoke<boolean>("delete_character", { id }),
};
```

### TypeScript Type Generation (ts-rs)

Types are auto-generated from Rust entities:

**Rust entity:**
```rust
#[derive(Clone, Debug, DeriveEntityModel, Serialize, Deserialize, ts_rs::TS)]
#[sea_orm(table_name = "characters")]
#[ts(rename = "Characters")]
#[ts(export)]
pub struct Model { ... }
```

**Generated types** go to `src/types/bindings/` and are re-exported in `src/types/index.ts`:
```typescript
export type { Characters as Character } from "./bindings/Characters";
```

### Zustand State Management

Uses a generic factory pattern for entity stores:

```typescript
// Creates a store with consistent CRUD operations
const useCharacterStore = createEntityStore<Character>("character");

// Usage
const { entities, fetchAll, create, update, remove } = useCharacterStore();
```

The campaign store (`src/stores/campaignStore.ts`) is special - it manages the global active campaign selection with localStorage persistence.

### Database Migrations

Located in `src-tauri/migration/src/`:

**Naming:** `m{YYYYMMDD}_{sequence}_{table_name}.rs`

**Conventions:**
- All tables use string UUID primary keys
- Include `created_at` and `updated_at` timestamps
- Foreign keys specify cascade delete
- Create indexes on foreign key columns

**Workflow:** Write migration → Register in `migration/src/lib.rs` → Run entity generation script

### Error Handling

Use the `AppError` enum from `src-tauri/src/error.rs`:

```rust
pub enum AppError {
    Database(sea_orm::DbErr),
    NotFound(String),
    Validation(String),
    Internal(String),
}
```

Commands return `Result<T, AppError>` which serializes for Tauri IPC.

### Testing Conventions

**Contract Tests** (`src/lib/tauri.contract.test.ts`):
- Verify all invoke calls use snake_case arguments
- Mock `invoke` and test argument shapes

**Store Tests** (`src/stores/createEntityStore.test.ts`):
- Test store factory generates correct command names
- Verify argument passing to Tauri commands

**Rust Tests:**
- Use `#[cfg(test)]` modules in command files
- Test `_impl` functions directly with in-memory SQLite

## Adding a New Entity

1. Write migration in `migration/src/m{timestamp}_{name}.rs`
2. Register in `migration/src/lib.rs`
3. Run `./src-tauri/scripts/generate-entities.sh` (from nix shell)
4. Add ts-rs derives to generated entity
5. Create command module in `src-tauri/src/commands/{entity}.rs` with 3-layer pattern
6. Register commands in `lib.rs` generate_handler
7. Create wrapper in `src/lib/tauri.ts`
8. Optionally create store via `createEntityStore` factory
9. Re-export types in `src/types/index.ts`
10. Add contract tests to verify naming

## Project Structure

```
loreweaver/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Windows entry point
│   │   ├── lib.rs                # Main entry, command registration
│   │   ├── commands/             # Tauri command handlers (3-layer pattern)
│   │   ├── db/                   # Database connection and state
│   │   ├── error.rs              # AppError enum
│   │   └── export/               # Export engines
│   ├── entity/src/               # SeaORM entities (generated + ts-rs)
│   ├── migration/src/            # Database migrations
│   └── Cargo.toml
├── src/                          # TypeScript frontend
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Root component with routing
│   ├── components/               # React components
│   ├── stores/                   # Zustand stores
│   │   ├── campaignStore.ts      # Global campaign state
│   │   └── createEntityStore.ts  # Generic store factory
│   ├── lib/                      # Utilities
│   │   └── tauri.ts              # Typed Tauri command wrappers
│   └── types/                    # TypeScript types
│       ├── bindings/             # ts-rs generated (auto)
│       └── index.ts              # Re-exports with naming
├── ai/                           # AI layer (future)
│   ├── agents/                   # Claude agents
│   └── mcp-server/               # MCP server
├── .claude/                      # Claude Code configuration
│   └── agents/                   # Specialized agents
└── DESIGN_DOC.md                 # Canonical design specification
```

## Project Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

Closes #<issue-number>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `docs` - Documentation changes
- `test` - Adding or correcting tests
- `chore` - Build process or auxiliary tool changes
- `perf` - Performance improvement
- `ci` - CI/CD changes

**Scopes:**

- `db` - Database/SeaORM changes
- `entity` - Entity model changes
- `cmd` - Tauri command changes
- `ui` - Frontend UI changes
- `editor` - Tiptap editor changes
- `ai` - AI/Claude SDK changes
- `mcp` - MCP Server changes
- `session` - Session mode changes
- `export` - Export functionality
- `types` - Type definitions (ts-rs)
- `store` - Zustand store changes

**Example:**

```
feat(entity): add Character entity and migration

- Create Character SeaORM entity with all fields per DESIGN_DOC
- Add migration for characters table
- Export types via ts-rs

Closes #9
```

### Key References

- **DESIGN_DOC.md** - Complete system design, data models, architecture
- **Section 4** - Data model definitions for all entities
- **Section 5** - AI system design (agents, MCP tools)
- **Section 9** - Technical implementation plan

## Specialized Agents

This project has Claude Code agents in `.claude/agents/`. **Use these proactively** when the situation matches their purpose.

### Testing Specialist (`testing-specialist`)

**Model:** Sonnet | **Permissions:** allowEdits

**Purpose:** Ensures code quality through comprehensive testing for Rust backend and React frontend.

**Use proactively when:**
- After implementing new features (to create tests)
- When fixing bugs (to add regression tests)
- Before PRs to main branch (to verify test coverage)
- When refactoring code (to ensure tests still pass)

**Capabilities:**
- Writes Rust unit tests using `#[cfg(test)]` and `tokio::test` for async
- Creates React tests with Vitest and `@testing-library/react`
- Uses in-memory SQLite for database tests

**Coverage Targets:**
- Business Logic: 70% minimum
- UI Components: 50% minimum

### Code Reviewer (`code-reviewer`)

**Model:** Opus | **Permissions:** readOnly

**Purpose:** Reviews code for quality, consistency, security, and adherence to project conventions.

**Use proactively when:**
- Before committing significant changes
- After completing a feature implementation
- When refactoring existing code
- After AI-assisted code generation

**Review Checklist:**
- Correctness and edge case handling
- Follows commit message format and code style
- No N+1 queries, unnecessary re-renders, blocking operations
- No security vulnerabilities (XSS, injection, hardcoded secrets)
- No `any` types in TypeScript
- Proper error handling

### Architecture Guardian (`architecture-guardian`)

**Model:** Opus | **Permissions:** readOnly

**Purpose:** Maintains architectural integrity, prevents technical debt, ensures design document compliance.

**Use proactively when:**
- Adding new modules or directories
- Adding new dependencies
- Modifying cross-layer code (frontend calling backend)
- Implementing features from DESIGN_DOC.md
- Making structural changes to the codebase

**Enforces:**
- Layer separation (frontend/backend/AI)
- Type safety via ts-rs at boundaries
- Local-first architecture (offline capability)
- Module boundaries and allowed dependencies

### Project Manager (`project-manager`)

**Model:** Haiku | **Permissions:** allowEdits

**Purpose:** Tracks project progress, ensures issues are closed, maintains GitHub project state.

**Use proactively when:**
- At the start of a session (to identify current work items)
- After completing work on an issue (to close it properly)
- When committing code (to verify issue references)
- At the end of a session (to update project state)

**Responsibilities:**
- Issue lifecycle management
- Commit message verification
- Milestone tracking
- Session start/end checklists

## Workflow: Committing and Closing Issues

Follow this workflow when completing work on an issue:

### 1. Stage Changes

Ensure all work is staged (files should appear in `git status` under "Changes to be committed"):

```bash
git add .
```

### 2. Create Commit with Issue References

Write a descriptive commit message that references the closed issue(s) using `Closes #N`:

```bash
git commit -m "$(cat <<'EOF'
feat(scope): brief description

- Bullet point detail 1
- Bullet point detail 2

Closes #33, Closes #34

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Important:** Never close issues prematurely. Keep them open until the commit is created.

### 3. Verify Commit

Check that the commit was created with proper references:

```bash
git log --oneline -1
```

### 4. Push to Remote

Push the commit to the default branch (main):

```bash
git push origin main
```

### 5. GitHub Auto-Closes Issues

GitHub automatically closes issues when commits containing "Closes #N" are pushed to the default branch. Verify in the issue:

```bash
gh issue view <number> --json state
```

### Common Patterns

**Single issue:**
```
Closes #33
```

**Multiple issues:**
```
Closes #33, Closes #34
```

**Related but not completing:**
```
Refs #35
```

**Blocked issue:**
```
See #35 (blocked by this issue)
```

### Never Do This

- Close issues manually via GitHub UI before commits are pushed
- Create commits without issue references
- Push without verifying the commit message format
