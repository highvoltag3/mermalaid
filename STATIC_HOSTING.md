# Static Hosting Configuration

This document outlines the static hosting setup for Mermalaid and confirms compatibility with various hosting platforms.

## Static Site Features

Mermalaid is fully configured as a static single-page application (SPA) with:

✅ **No server-side dependencies** - Pure client-side React application  
✅ **No API calls** - All functionality runs in the browser  
✅ **Static assets** - All resources are bundled and optimized  
✅ **SPA routing** - Client-side routing configured for all paths  
✅ **Environment variables** - Optional build-time configuration support  

## Build Output

The production build generates a static `dist/` directory containing:

- `index.html` - Main HTML entry point
- `assets/` - JavaScript and CSS bundles (hashed filenames for cache busting)
- Static assets and public files

## Hosting Platform Compatibility

### ✅ Appwrite Sites
- **Configuration**: `.appwrite.json`
- **Build**: `npm run build`
- **Output**: `dist/`
- **SPA Routing**: Configured via `.appwrite.json` routes

### ✅ Vercel
- **Configuration**: Automatic detection (Vite/React)
- **Build**: `npm run build`
- **Output**: `dist/`
- **SPA Routing**: Automatic via `vercel.json` or auto-detection

### ✅ Netlify
- **Configuration**: `netlify.toml` (optional)
- **Build**: `npm run build`
- **Output**: `dist/`
- **SPA Routing**: `public/_redirects` file included

### ✅ GitHub Pages
- **Configuration**: Manual setup or GitHub Actions
- **Build**: `npm run build`
- **Output**: `dist/`
- **SPA Routing**: Requires custom 404.html or redirect setup

### ✅ Cloudflare Pages
- **Configuration**: Automatic or `wrangler.toml`
- **Build**: `npm run build`
- **Output**: `dist/`
- **SPA Routing**: Automatic or via `_redirects`

## SPA Routing Configuration

All hosting platforms should serve `index.html` for all routes to support client-side routing:

**Appwrite Sites**: Configured in `.appwrite.json`
```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**Netlify**: `public/_redirects`
```
/*    /index.html   200
```

**Vercel**: Automatic (or `vercel.json` with similar routing)

## Build Optimization

The production build is optimized for static hosting:

- ✅ Minification via esbuild
- ✅ No source maps (reduces bundle size)
- ✅ Code splitting enabled
- ✅ Asset hashing for cache busting
- ✅ Empty output directory on each build

## Node.js Version

- **Recommended**: Node.js 20+ (specified in `.nvmrc`)
- **Minimum**: Node.js 18+

## Environment Variables

Environment variables are embedded at build time (not runtime). Configure them in your hosting platform's environment variable settings before building.

See `DEPLOYMENT.md` for details on available environment variables.

## Testing Locally

Test the static build locally:

```bash
npm run build
npm run preview
```

The preview server serves the `dist/` directory exactly as it would be hosted.

## File Structure

```
dist/
├── index.html          # Main entry point
├── assets/
│   ├── index-*.js      # JavaScript bundles
│   └── index-*.css     # CSS bundles
└── _redirects          # SPA routing (Netlify)
```

## Security Considerations

- ✅ No server-side code execution
- ✅ No database connections
- ✅ All API calls (if any) are client-side only
- ✅ Environment variables are build-time only (not runtime secrets)

## Performance

- ✅ Optimized bundle sizes
- ✅ Lazy loading for large dependencies (Monaco Editor, Mermaid)
- ✅ Gzip compression supported
- ✅ Asset caching via hashed filenames
