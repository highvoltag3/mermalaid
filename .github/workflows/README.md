# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating tasks in this repository.

**Web app hosting:** Vercel Git integration builds and deploys the generated `dist` directory. See [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

## Workflows

### `release.yml`

Automatically creates GitHub releases and builds Tauri applications for macOS and Windows when version tags are pushed.

**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Jobs:**

- `prepare-release` - fails if a published release already exists for the tag, deletes a stale draft, then creates one draft release and passes its id to the build jobs
- `build-tauri` - matrix over macOS and Windows; each runner builds with tauri-action and uploads its installer to that draft

**Output:**

- GitHub Release draft
- macOS `.app` bundle and `.dmg` installer (universal binary)
- Windows x64 NSIS `.exe` installer

**Secrets:** Uses the default `GITHUB_TOKEN` only (no extra repository secrets required for this workflow).

### Vercel deployments

The web app does not need a scheduled GitHub Actions deployment. Import the repository into Vercel and let Vercel create preview deployments for pull requests and production deployments for `main`.

No repository secrets are required for the default static Vite deployment.
