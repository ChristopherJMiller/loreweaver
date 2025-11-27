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

**Remember to use `nix develop -c` to run commands inside of the nix enviornment**

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

### Frontend (`src/`)

- React 19 with TypeScript
- Vite as build tool (port 1420)
- Calls Rust backend via `@tauri-apps/api/core` `invoke()` function

### Backend (`src-tauri/`)

- Rust with Tauri v2
- `lib.rs`: Main entry point, defines Tauri commands and app builder
- `main.rs`: Windows-specific entry point wrapper
- Commands are registered via `tauri::generate_handler![]` macro

### Frontend-Backend Communication

Rust functions marked with `#[tauri::command]` can be called from the frontend:

```typescript
// Frontend
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { arg1, arg2 });
```

```rust
// Backend (src-tauri/src/lib.rs)
#[tauri::command]
fn command_name(arg1: String, arg2: i32) -> Result<String, String> { }
```

### Configuration

- `src-tauri/tauri.conf.json`: Tauri app configuration (window size, bundling, security)
- `src-tauri/capabilities/`: Permission capabilities for Tauri plugins

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

**Example:**

```
feat(entity): add Character entity and migration

- Create Character SeaORM entity with all fields per DESIGN_DOC
- Add migration for characters table
- Export types via ts-rs

Closes #9
```

### Project Structure

```
loreweaver/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Windows entry point
│   │   ├── lib.rs                # Main entry, command registration
│   │   ├── commands/             # Tauri command handlers
│   │   ├── db/                   # Database layer
│   │   ├── entities/             # SeaORM entities
│   │   └── export/               # Export engines
│   └── Cargo.toml
├── src/                          # TypeScript frontend
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Root component
│   ├── components/               # React components
│   ├── stores/                   # Zustand stores
│   ├── lib/                      # Utilities
│   └── types/                    # ts-rs generated types
├── ai/                           # AI layer
│   ├── agents/                   # Claude agents
│   └── mcp-server/               # MCP server
└── DESIGN_DOC.md                 # Canonical design specification
```

### Key References

- **DESIGN_DOC.md** - Complete system design, data models, architecture
- **Section 4** - Data model definitions for all entities
- **Section 5** - AI system design (agents, MCP tools)
- **Section 9** - Technical implementation plan

### Specialized Agents

This project has Claude Code agents in `.claude/agents/`:

- **testing-specialist** - Write and verify tests
- **code-reviewer** - Review code quality before commits
- **architecture-guardian** - Validate architectural decisions
- **project-manager** - Track issues, close completed work, manage milestones

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
