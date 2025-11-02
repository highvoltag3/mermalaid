# Deployment Guide for Appwrite Sites

This guide explains how to deploy Mermalaid to Appwrite Sites.

## Prerequisites

- An Appwrite account and project
- Git repository connected to Appwrite (optional but recommended)
- Node.js 18+ (for local testing)

## Build Configuration

The project is configured for static site deployment with the following settings:

- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Output Directory**: `dist`
- **Framework Adapter**: `static` (static site)

## Appwrite Console Configuration

When setting up your site in the Appwrite Console, use these settings:

### Site Settings

1. **Site Name**: `Mermalaid` (or your preferred name)
2. **Framework**: `React` or `Static Site`
3. **Runtime**: `Node.js 18` or `Node.js 20`

### Build Settings

Configure the following in the Appwrite Console:

- **Install Command**: 
  ```
  npm install
  ```

- **Build Command**: 
  ```
  npm run build
  ```

- **Output Directory**: 
  ```
  dist
  ```

- **Framework Adapter**: 
  ```
  static
  ```

### Environment Variables

Environment variables are optional for basic functionality but can be configured for enhanced features:

**Available Environment Variables:**

- `VITE_OPENAI_API_KEY` (optional) - OpenAI API key for AI error fixing feature
- `VITE_APP_NAME` (optional) - Custom application name (defaults to "Mermalaid")
- `VITE_APP_VERSION` (optional) - Application version
- `VITE_ANALYTICS_ID` (optional) - Analytics tracking ID
- `VITE_ENABLE_AI_FIXER` (optional) - Enable/disable AI fixer feature (default: true)
- `VITE_ENABLE_ANALYTICS` (optional) - Enable/disable analytics (default: false)

**Configuring Environment Variables:**

1. In Appwrite Console, navigate to your site settings
2. Go to the "Environment Variables" section
3. Add each variable with the `VITE_` prefix (required by Vite)
4. Variables are available in code via `import.meta.env.VITE_*`
5. Use the helper functions from `src/utils/env.ts` for type-safe access

**Example:**
```
VITE_OPENAI_API_KEY=sk-...
VITE_APP_NAME=Mermalaid
VITE_ENABLE_AI_FIXER=true
```

**Important:** 
- All client-side environment variables must be prefixed with `VITE_`
- Environment variables are embedded at build time, not runtime
- For security, never commit `.env` files with actual API keys
- Use `env.example` as a template (without sensitive data)

### VCS Integration (Optional but Recommended)

If deploying from a Git repository:

1. **Repository Provider**: Connect your Git provider (GitHub, GitLab, etc.)
2. **Repository**: Select your repository
3. **Production Branch**: `main` (or your main branch)
4. **Auto Deploy**: Enable to automatically deploy on pushes

### Custom Domain (Optional)

1. Add your custom domain in the Appwrite Console
2. Configure DNS records as instructed by Appwrite
3. SSL certificates are automatically provisioned

## Local Build Testing

Before deploying, test the build locally:

```bash
npm install
npm run build
npm run preview
```

The preview server will serve the built files from the `dist` directory, allowing you to verify everything works correctly.

## Deployment

Once configured in the Appwrite Console:

1. Click "Deploy" in your site settings
2. Appwrite will:
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Deploy the `dist` directory
3. Your site will be available at the Appwrite-provided URL

## Troubleshooting

### Build Fails

- Check that all dependencies are listed in `package.json`
- Verify Node.js version compatibility (18+)
- Review build logs in Appwrite Console

### Site Not Loading

- Verify the output directory is set to `dist`
- Check that `index.html` exists in the `dist` directory
- Ensure routing is configured correctly (all routes should serve `index.html` for SPA routing)

### 404 Errors on Routes

- Ensure Appwrite Sites routing is configured to serve `index.html` for all routes (see `.appwrite.json`)

## Build Optimization

The current build configuration includes:

- Minification via esbuild
- No source maps (reduces bundle size)
- Empty output directory on each build (ensures clean builds)

For further optimization, consider:

- Code splitting for large chunks
- Dynamic imports for Monaco Editor
- Lazy loading for Mermaid diagram types
