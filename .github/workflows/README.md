# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating various tasks.

## Workflows

### `release.yml`
Automatically creates GitHub releases and builds Tauri macOS applications when version tags are pushed.

**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Output:** 
- GitHub Release draft
- macOS `.app` bundle and `.dmg` installer

---

### `deploy-appwrite.yml`
Automatically builds and deploys the web application to Appwrite Sites.

**Trigger:**
- Push to `main` branch
- Push to `feature/appwrite-sites` branch
- Manual workflow dispatch

**Behavior:**
- Runs `npm ci`, `npm run build`, then packages **`dist/`** as **`site-code.tar.gz`** and uploads it with **`curl`** to the Appwrite Sites REST API (`POST /v1/sites/{siteId}/deployments`). No Appwrite CLI is used.
- Sends **`activate=true`** in the multipart request so the deployment becomes **Active** when ready, without a manual activate step in the Appwrite console.
- **Concurrency:** only one run per branch at a time; newer pushes cancel an in-progress deploy on the same branch.

**Required Secrets:**
Configure these in your GitHub repository settings → Secrets and variables → Actions:

1. **`APPWRITE_API_KEY`** (required)
   - Your Appwrite API key with Sites deployment permissions
   - Get from: Appwrite Console → Settings → API Keys

2. **`APPWRITE_PROJECT_ID`** (required)
   - Your Appwrite Project ID
   - Get from: Appwrite Console → Settings → General

3. **`APPWRITE_SITE_ID`** (required)
   - Your Appwrite Site ID
   - Get from: Appwrite Console → Sites → Your Site → Settings

4. **`APPWRITE_ENDPOINT`** (required for Appwrite Cloud)
   - Must be your **regional** API base URL, e.g. `https://fra.cloud.appwrite.io/v1` (see Appwrite Console → your project).
   - For self-hosted Appwrite, set this to your instance’s `/v1` URL.

**Optional Build-Time Environment Variables:**
You can also add these as secrets if you want to use them during build:

- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version
- `VITE_ANALYTICS_ID` - Analytics tracking ID
- `VITE_ENABLE_AI_FIXER` - Enable AI fixer feature
- `VITE_ENABLE_ANALYTICS` - Enable analytics

**Note:** Do NOT add `VITE_OPENAI_API_KEY` as a GitHub secret for build-time embedding. API keys should be handled client-side through Appwrite's environment variables feature or other secure methods.

---

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each required secret with its value
5. Save the secret

## Testing the Deployment

1. Push changes to `main` or `feature/appwrite-sites` branch
2. The workflow will automatically trigger
3. Monitor the workflow in the **Actions** tab
4. Once complete, check your Appwrite Console to verify the deployment

## Manual Deployment

You can manually trigger the deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Appwrite Sites** workflow
3. Click **Run workflow**
4. Choose the branch and click **Run workflow**

## Troubleshooting

### Build Fails
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Review build logs for specific errors

### Deployment Fails
- Verify all required secrets are set correctly (including non-empty **`APPWRITE_SITE_ID`**)
- Check API key has proper permissions (Sites deployment)
- Ensure Site ID matches your Appwrite Console
- Verify project ID is correct
- Confirm **`APPWRITE_ENDPOINT`** uses your **region** host (`https://<REGION>.cloud.appwrite.io/v1`), not the generic `cloud.appwrite.io` URL

### API upload vs Git-connected builds in the Appwrite console
- Deployments **from this Action** use the **REST upload** path; Appwrite may label the source differently from **Git-connected builds** that run install/build on Appwrite’s side. This workflow always uploads a full pre-built **`dist/`** (as `.tar.gz`) after `npm run build`.

### Site stuck on Ready (not Active)
- This workflow sends **`activate=true`** on create so GitHub-triggered uploads should go live without clicking Activate. If you deploy only via **Appwrite’s Git integration**, you may still need to activate in the console unless Appwrite enables auto-activation for that site.

### Site Not Updating
- Appwrite Sites may take a few minutes to update
- Check deployment status in Appwrite Console
- Verify the build output directory is `dist`
