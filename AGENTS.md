# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Mermalaid is a client-side Mermaid diagram editor (React 18 + TypeScript + Vite). It has an optional Tauri/Rust desktop wrapper, but the web app is the primary development target and does **not** require a backend or database.

### Key commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 5173) |
| Unit tests | `npm run test` (Vitest, jsdom) |
| E2E tests | `npm run test:e2e` (Playwright, requires Chromium) |
| Type check | `npx tsc --noEmit` |
| Lint | `npx eslint .` |
| Build | `npm run build` |

See `package.json` scripts for the full list.

### Non-obvious caveats

- **ESLint plugins are not listed in `package.json`.** The repo ships an `eslint.config.js` that imports `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `globals`, but none are declared as dependencies. Run `npm install --save-dev eslint @eslint/js@^9 eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh globals` if linting fails with missing-package errors.
- **Playwright Chromium must be installed separately** before E2E tests work: `npx playwright install chromium --with-deps`.
- The Vite dev server binds to all interfaces by default (`host: true` in `vite.config.ts`). For stable E2E runs, Playwright overrides this to `--host 127.0.0.1`.
- Tauri/Rust toolchain is only needed for desktop builds (`npm run tauri:dev`). The web-only workflow (`npm run dev`) requires no Rust.
