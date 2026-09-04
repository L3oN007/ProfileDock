# @profiledock/desktop

## 0.3.3

### Patch Changes

- Fix mass Chromium tabs opening on Windows after fresh install. Expose Tauri build env vars in Vite, render in-app navigation as buttons instead of anchor tags, disable route preloading in Tauri, and add multi-layer navigation guards (HTML script, Tauri plugin, Rust on_navigation handler).
- @ProfileDock/env@0.3.3
  - @ProfileDock/ui@0.3.3

## 0.3.2

### Patch Changes

- Fix sidebar navigation styling on Windows Tauri (muted text colors, active state, focus ring) and restore dashboard page content visibility by correcting flex layout overflow.
- @ProfileDock/env@0.3.2
  - @ProfileDock/ui@0.3.2

## 0.3.1

### Patch Changes

- Fix Windows Tauri navigation opening Chromium tabs when clicking in-app links (Dashboard, Settings, New profile, and other routes). Replace anchor-based routing with RouterLink/RouterButton and add a navigation guard. Fix missing country flags on Windows builds using SVG flag icons.
- @ProfileDock/env@0.3.1
  - @ProfileDock/ui@0.3.1

## 0.3.0

### Minor Changes

- Add in-app update checks, network info lookup, seed/repair profile devtools, CloakBrowser Windows install fix, cross-platform fingerprint normalization, and Brave Search as the default search engine for browser profiles.

### Patch Changes

- Updated dependencies
  - @ProfileDock/ui@0.3.0
  - @ProfileDock/env@0.3.0

## 0.2.1

### Patch Changes

- Fix Biome lint issues, apply rustfmt formatting across the Tauri backend, and improve code readability across desktop services and UI components.
- @ProfileDock/env@0.2.1
  - @ProfileDock/ui@0.2.1

## 0.2.0

### Minor Changes

- Add proxy management, CloakBrowser integration, groups/tags/activity tracking, extensions management, profile editing with cookie import/export, device management with presets, and a refreshed design system with tab navigation and form components.

### Patch Changes

- @ProfileDock/env@0.2.0
  - @ProfileDock/ui@0.2.0
