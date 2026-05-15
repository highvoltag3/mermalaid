# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating tasks in this repository.

**Appwrite Sites:** `keep-appwrite-active.yml` builds the web app and deploys the generated `dist` directory to Appwrite Sites every 5 days. See [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Workflows

### `release.yml`

Automatically creates GitHub releases and builds Tauri macOS applications when version tags are pushed.

**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Output:**

- GitHub Release draft
- macOS `.app` bundle and `.dmg` installer

**Secrets:** Uses the default `GITHUB_TOKEN` only (no extra repository secrets required for this workflow).

### `keep-appwrite-active.yml`

Builds and deploys the static web app to Appwrite Sites so the project receives a real deployment on a recurring schedule.

**Trigger:** Every 5 days and manual dispatch.

**Secrets:**

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_SITE_ID`
