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
| `pnpm desktop:build` | Build desktop app locally (requires platform deps) |
| `pnpm dev:desktop` | Start Vite dev server only |
| `pnpm check-types` | Typecheck all packages |
| `pnpm check` | Biome lint + format |
| `cargo check` (in `src-tauri`) | Check Rust backend |
| `cargo test` (in `src-tauri`) | Run Rust tests |

## Releases

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

### Day-to-day development

When a PR includes a user-facing change, add a changeset:

```bash
pnpm changeset
```

Commit the generated file in `.changeset/` with your PR.

### Publish a release

1. Merge changesets into `main`. GitHub Actions opens a **Version Packages** PR (`.github/workflows/changesets.yml`).
2. Merge that PR. It bumps package versions, updates changelogs, syncs the Tauri/Cargo version, and pushes a `v*` tag.
3. The tag triggers `.github/workflows/release.yml`, which builds installers for Windows, Linux, and macOS (Apple Silicon + Intel).

The release workflow creates a **draft** GitHub Release with artifacts attached. Review it on GitHub, then click **Publish release**.

You can also run the **Release** workflow manually from the GitHub Actions tab (`workflow_dispatch`).

### GitHub settings (one-time)

In repository **Settings → Actions → General → Workflow permissions**, enable **Read and write permissions** so `GITHUB_TOKEN` can upload release assets.

### Local build (WSL / Linux)

```bash
pnpm install
pnpm desktop:build
```

Install the same Linux packages as CI if the build fails on missing system libraries (see `.github/workflows/ci.yml`).

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
