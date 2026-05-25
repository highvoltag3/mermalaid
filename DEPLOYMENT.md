# Deployment Guide for Vercel

This guide explains how to deploy Mermalaid to Vercel as a static Vite app.

## Prerequisites

- A Vercel account on the Hobby/free plan or a team plan
- Access to the GitHub repository
- Node.js 20.19+ for local build testing

No Appwrite project, Appwrite API key, or scheduled keep-alive deployment is required.

## Build Configuration

The repository includes `vercel.json` with the settings Vercel needs:

- **Framework Preset**: `Vite`
- **Install Command**: `npm ci`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Root Directory**: `.`

`vercel.json` also rewrites all paths to `index.html` so React Router routes work on refresh and direct visits.

## Vercel Project Setup

1. In Vercel, choose **Add New... > Project**.
2. Import the GitHub repository.
3. Keep the detected framework as **Vite**.
4. Confirm the project uses:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Set the production branch to `main`.
6. Deploy.

Vercel creates preview deployments for pull requests and branch pushes. Pushes to `main` create production deployments.

## Environment Variables

Environment variables are optional for basic functionality. Add any client-side variables in Vercel project settings with the `VITE_` prefix:

- `VITE_OPENAI_API_KEY` (optional) - OpenAI API key for the AI error fixing feature
- `VITE_APP_NAME` (optional) - Custom application name; defaults to `Mermalaid`
- `VITE_APP_VERSION` (optional) - Application version; defaults to `package.json`
- `VITE_GITHUB_REPO` (optional) - GitHub repository shown in release links
- `VITE_PUBLIC_SHARE_BASE_URL` (optional) - Public share origin override
- `VITE_ANALYTICS_ID` (optional) - Analytics tracking ID
- `VITE_ENABLE_AI_FIXER` (optional) - Enable or disable AI fixer; defaults to `true`
- `VITE_ENABLE_ANALYTICS` (optional) - Enable analytics; defaults to `false`

Important:

- Vite embeds `VITE_` variables at build time.
- `VITE_` variables are visible in the browser bundle.
- Never commit `.env` files with real credentials.
- Use `.env.example` as the local template.

## Local Build Testing

Before deploying, test the build locally:

```bash
npm ci
npm run build
npm run preview
```

The preview server serves the built files from `dist`.

## How Deployment Runs

1. **Vercel Git integration** - Vercel builds and deploys the app when GitHub sends branch, pull request, and `main` updates.
2. **Preview deployments** - Pull requests and feature branches get preview URLs automatically.
3. **Production deployments** - Pushes to `main` deploy to production.
4. **Manual deployments** - Maintainers can still use the Vercel CLI if needed.

The previous Appwrite keep-alive workflow has been removed because Vercel does not require scheduled redeploys to keep a static app active.

### Desktop releases are separate from the web app

`npm run release` / `npm run release:patch` etc. bump the version, push `main`, and push a `v*` tag. That triggers [.github/workflows/release.yml](.github/workflows/release.yml) for the Tauri macOS build and GitHub Release draft. Web deployment is handled separately by Vercel.

## Troubleshooting

### Build fails

- Check that dependencies are listed in `package.json`.
- Verify Node.js is 20.19+.
- Review the Vercel deployment build logs.

### Site is not loading

- Verify the output directory is `dist`.
- Check that `dist/index.html` exists after `npm run build`.
- Confirm `vercel.json` is present in the repository root.

### 404 errors on routes

- Confirm `vercel.json` contains the SPA rewrite from `/(.*)` to `/index.html`.
- Redeploy after changing routing configuration.

## Build Optimization

The current build configuration includes:

- Minification via esbuild
- No source maps to reduce bundle size
- Empty output directory on each build

For further optimization, consider:

- Code splitting for large chunks
- Dynamic imports for Monaco Editor
- Lazy loading for Mermaid diagram types
