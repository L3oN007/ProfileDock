# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## Adding a changeset

When your PR includes a user-facing change, run:

```bash
pnpm changeset
```

Follow the prompts to select affected packages and the semver bump type (`patch`, `minor`, or `major`). Commit the generated file in `.changeset/` with your PR.

## Releasing

1. Merging changesets into `main` opens a **Version Packages** PR via GitHub Actions.
2. Merging that PR bumps versions, updates changelogs, syncs the Tauri app version, and pushes a `v*` tag.
3. The tag triggers `.github/workflows/release.yml` to build desktop installers.
