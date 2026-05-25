# Deployment (Vercel)

Internal. Static Vite app — [`vercel.json`](../vercel.json) owns install/build/output and SPA rewrites.

## Setup

1. Import repo in Vercel (framework **Vite**, production branch **`main`**).
2. Confirm: install `npm ci`, build `npm run build`, output `dist`.
3. Set Production env vars (below). Rebuild after any env change.

**Flow:** PRs → preview; `main` → production. macOS releases are separate ([`release.yml`](../.github/workflows/release.yml)).

## Production env vars

`VITE_*` is baked into the client bundle — not for secrets you need to hide.

| Variable | Value |
|----------|--------|
| `VITE_APP_NAME` | `Mermalaid` |
| `VITE_GITHUB_REPO` | `highvoltag3/mermalaid` |
| `VITE_PUBLIC_SHARE_BASE_URL` | `https://mermalaid.com` |
| `VITE_ENABLE_AI_FIXER` | `true` |
| `VITE_ENABLE_ANALYTICS` | `false` |
| `VITE_OPENAI_API_KEY` | Your OpenAI key — only if AI fixer is on |

Do **not** set `VITE_APP_VERSION` — version comes from `package.json` at build time.

Preview: omit `VITE_PUBLIC_SHARE_BASE_URL`; set `VITE_ENABLE_AI_FIXER` to `false` if you want.

Local template: [.env.example](../.env.example).

## Verify before merge

```bash
npm ci
npm run build
npm run preview
npm run test:e2e:preview
```

## OG / Twitter images

After changing the app icon:

```bash
pip3 install pillow
python3 scripts/generate-og-image.py
```

Commit `public/og-image.png` and `public/twitter-image.png`.
