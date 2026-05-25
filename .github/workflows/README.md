# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating tasks in this repository.

**GitHub Pages:** `deploy-github-pages.yml` builds the web app and deploys the generated `dist` directory to GitHub Pages. See [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Workflows

### `release.yml`

Automatically creates GitHub releases and builds Tauri macOS applications when version tags are pushed.

**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Output:**

- GitHub Release draft
- macOS `.app` bundle and `.dmg` installer

**Secrets:** Uses the default `GITHUB_TOKEN` only (no extra repository secrets required for this workflow).

### `deploy-github-pages.yml`

Builds and deploys the static web app to GitHub Pages using the official Pages artifact and deploy actions.

**Trigger:** Pushes to `main` and manual dispatch.

**Repository variables:**

- `GH_PAGES_BASE_PATH` (optional) — set to `/<repo>/` only when deploying without the custom domain.
