# Deployment Guide for GitHub Pages

This guide explains how to deploy Mermalaid to GitHub Pages as a static Vite app.

## Prerequisites

- GitHub Pages enabled for this repository
- Repository Pages source set to **GitHub Actions**
- Node.js 24 for local testing

## Build configuration

The project is configured for static deployment with these settings:

- **Install command**: `npm ci`
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **SPA fallback**: `dist/404.html` is copied from `dist/index.html`

## GitHub Pages workflow

`.github/workflows/deploy-github-pages.yml` deploys the app to GitHub Pages:

1. Checks out the repo
2. Installs dependencies with `npm ci`
3. Builds the app with `npm run build`
4. Copies `dist/index.html` to `dist/404.html` so direct visits to client routes work
5. Adds `.nojekyll`
6. Uploads `dist` as a Pages artifact
7. Deploys the artifact with `actions/deploy-pages`

The workflow runs on pushes to `main` and can also be run manually from the GitHub Actions tab.

## Custom domain

The repository includes `public/CNAME` for:

```text
mermalaid.com
```

Keep `VITE_BASE_PATH` unset for this custom-domain deployment because the app is served from `/`.

## Repository-subpath deployment

If you remove the custom domain and publish at `https://<owner>.github.io/<repo>/`, set the repository variable `GH_PAGES_BASE_PATH` to:

```text
/<repo>/
```

The workflow passes this value as `VITE_BASE_PATH` so Vite asset URLs and React Router's basename match the Pages subpath.

## Environment variables

Environment variables are optional for basic functionality.

Available build-time variables:

- `VITE_OPENAI_API_KEY` (optional) - OpenAI API key for AI error fixing
- `VITE_APP_NAME` (optional) - Custom application name
- `VITE_APP_VERSION` (optional) - Application version
- `VITE_GITHUB_REPO` (optional) - Release source in `owner/repo` format
- `VITE_PUBLIC_SHARE_BASE_URL` (optional) - Public web origin for desktop share links
- `VITE_ANALYTICS_ID` (optional) - Analytics tracking ID
- `VITE_ENABLE_AI_FIXER` (optional) - Set to `false` to disable AI fixer
- `VITE_ENABLE_ANALYTICS` (optional) - Set to `true` to enable analytics
- `VITE_BASE_PATH` (optional) - Build base path, usually provided through `GH_PAGES_BASE_PATH`

Important:

- Vite only exposes variables prefixed with `VITE_`.
- Client variables are embedded at build time.
- Do not publish private API keys in a public static bundle.

## Local build testing

Before deploying, test the production build locally:

```bash
npm ci
npm run build
npm run preview
```

To test repository-subpath behavior locally:

```bash
VITE_BASE_PATH=/mermalaid/ npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Then open `http://127.0.0.1:4173/mermalaid/`.

## Troubleshooting

### Site not loading

- Verify Pages source is set to GitHub Actions.
- Confirm the workflow completed successfully.
- Check that `index.html`, `404.html`, `.nojekyll`, and `CNAME` exist in the uploaded artifact.

### 404 errors on direct routes

- Confirm the workflow copied `dist/index.html` to `dist/404.html`.
- If using repository-subpath hosting, confirm `GH_PAGES_BASE_PATH` matches `/<repo>/`.

### Assets load from the wrong path

- Keep `GH_PAGES_BASE_PATH` unset for `https://mermalaid.com`.
- Set `GH_PAGES_BASE_PATH` to `/<repo>/` for `https://<owner>.github.io/<repo>/`.

### Desktop releases

`npm run release` / `npm run release:patch` etc. bump the version, push `main`, and push a `v*` tag. That triggers `.github/workflows/release.yml` for the Tauri macOS build + GitHub Release draft. Web deployment is handled by the GitHub Pages workflow on pushes to `main`.
