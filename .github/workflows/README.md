# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating tasks in this repository.

**Appwrite Sites:** This repo does **not** deploy to Appwrite via GitHub Actions. Connect your GitHub repository in the [Appwrite Console](https://cloud.appwrite.io) (Sites → your site → VCS / Git integration) and use **Auto Deploy** on your production branch. See [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Workflows

### `release.yml`

Automatically creates GitHub releases and builds Tauri macOS applications when version tags are pushed.

**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Output:**

- GitHub Release draft
- macOS `.app` bundle and `.dmg` installer

**Secrets:** Uses the default `GITHUB_TOKEN` only (no extra repository secrets required for this workflow).
