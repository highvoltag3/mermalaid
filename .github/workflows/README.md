# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating tasks in this repository.

**Web app hosting:** Vercel Git integration builds and deploys the generated `dist` directory. See [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Workflows

### `release.yml`

Automatically creates GitHub releases and builds Tauri macOS applications when version tags are pushed.

**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Output:**

- GitHub Release draft
- macOS `.app` bundle and `.dmg` installer

**Secrets:** Uses the default `GITHUB_TOKEN` only (no extra repository secrets required for this workflow).

### Vercel deployments

The web app does not need a scheduled GitHub Actions deployment. Import the repository into Vercel and let Vercel create preview deployments for pull requests and production deployments for `main`.

No repository secrets are required for the default static Vite deployment.
