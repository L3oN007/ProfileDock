# ProfileDock

ProfileDock is a desktop application for managing browser profiles, proxies, and automation workflows.

## Stack

- **Frontend**: React, TanStack Router, TanStack Query, TailwindCSS
- **Desktop**: Tauri 2 (Rust backend)
- **Database**: SQLite (sqlx)
- **Monorepo**: pnpm workspaces + Turborepo

## Getting Started

```bash
pnpm install
```

### Desktop development (WSL / Linux)

```bash
pnpm desktop:dev
```

### Web-only development

```bash
pnpm dev:desktop
```

## Project Structure

```
ProfileDock/
├── apps/
│   └── desktop/              # Tauri desktop app
│       ├── src/              # React frontend
│       │   ├── app/          # Layout, providers
│       │   ├── features/     # Feature modules
│       │   ├── lib/tauri/    # Typed IPC wrappers
│       │   └── routes/       # TanStack Router routes
│       └── src-tauri/        # Rust backend
│           └── src/
│               ├── commands/         # Tauri IPC layer
│               ├── application/      # Services
│               ├── domain/           # Types & models
│               ├── infrastructure/   # DB, FS, process
│               ├── state/            # AppState
│               └── error/            # Unified error model
├── packages/
│   ├── ui/                   # Shared shadcn/ui components
│   ├── env/                  # Environment config
│   └── config/               # Shared TS config
└── docs/
    └── phase0.md             # Foundation phase spec
```

## Architecture

```
React Feature → TS API wrapper → Tauri invoke() → Command → Service → Repository/Process/OS
```

Rust is the source of truth for database, filesystem, browser processes, and configuration.

## App Data Directory

Runtime data is stored outside the source tree:

- **Linux/WSL**: `~/.local/share/ProfileDock/`
- **Windows**: `%LOCALAPPDATA%\ProfileDock\`

```
ProfileDock/
├── profiledock.db
├── config.json
├── logs/profiledock.log
├── profiles/
├── browsers/
├── cache/
└── temp/
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm desktop:dev` | Start Tauri desktop app |
| `pnpm dev:desktop` | Start Vite dev server only |
| `pnpm check-types` | Typecheck all packages |
| `pnpm check` | Biome lint + format |
| `cargo check` (in `src-tauri`) | Check Rust backend |
| `cargo test` (in `src-tauri`) | Run Rust tests |

## Phase 0 Status

Foundation layer complete:

- [x] Monorepo renamed (`apps/desktop`)
- [x] FE/Rust boundary with typed IPC
- [x] AppState, AppPaths, SQLite + migrations
- [x] Unified error model
- [x] Tracing/logging to app data dir
- [x] ProcessManager abstraction
- [x] BrowserProvider + CloakBrowser detection
- [x] Dashboard + Settings UI shell
- [x] CI (lint, typecheck, cargo fmt/clippy/test)
