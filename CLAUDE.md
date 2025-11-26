# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loreweaver is a Tauri v2 desktop application with a React 19 + TypeScript frontend and Rust backend.

## Development Environment

This project uses Nix flakes for reproducible development. Enter the development shell:
```bash
nix develop
```

## Common Commands

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
