#!/usr/bin/env node
/**
 * Catch Vercel FUNCTION_INVOCATION_FAILED regressions before deploy.
 *
 * Vercel's Node runtime invokes `default.fetch(request)`. A bare
 * `export default async function (req: Request)` is treated as the legacy
 * Node `(req, res)` shape and crashes on Web API usage (`req.headers.get`,
 * `req.text()`, `new URL(req.url)` with a host-less path).
 *
 * This script bundles each api entry with esbuild (same shape as local
 * reproduction), asserts `default.fetch` exists, and invokes a few cheap
 * paths that must not throw.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

const ENTRIES = [
  'api/sign.ts',
  'api/preview.ts',
  'api/og.ts',
  'api/slack/commands.ts',
  'api/slack/interactions.ts',
]

async function bundleEntry(entry, outDir) {
  const outfile = join(outDir, entry.replace(/\.ts$/, '.mjs').replaceAll('/', '__'))
  await esbuild.build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'silent',
  })
  return outfile
}

async function assertWebHandler(entry, mod) {
  if (!mod?.default || typeof mod.default.fetch !== 'function') {
    throw new Error(`${entry}: missing default.fetch Web Standard export`)
  }

  const fetchHandler = mod.default.fetch.bind(mod.default)

  if (entry === 'api/sign.ts') {
    const res = await fetchHandler(
      new Request('https://www.mermalaid.com/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    )
    if (res.status !== 403) {
      throw new Error(`${entry}: expected 403 for missing Origin, got ${res.status}`)
    }
  }

  if (entry === 'api/preview.ts') {
    const res = await fetchHandler(new Request('https://www.mermalaid.com/api/preview'))
    if (res.status !== 302) {
      throw new Error(`${entry}: expected 302 for missing c, got ${res.status}`)
    }
  }

  if (entry === 'api/og.ts') {
    const res = await fetchHandler(new Request('https://www.mermalaid.com/api/og'))
    if (res.status !== 302) {
      throw new Error(`${entry}: expected 302 for missing c, got ${res.status}`)
    }
  }

  if (entry.startsWith('api/slack/')) {
    const res = await fetchHandler(
      new Request('https://www.mermalaid.com/' + entry.replace(/\.ts$/, ''), {
        method: 'GET',
      }),
    )
    if (res.status !== 405) {
      throw new Error(`${entry}: expected 405 for GET, got ${res.status}`)
    }
  }
}

async function main() {
  // Ensure esbuild is resolvable from the repo (vite already depends on it).
  require.resolve('esbuild')

  const outDir = await mkdtemp(join(tmpdir(), 'mermalaid-api-handlers-'))
  try {
    for (const entry of ENTRIES) {
      const outfile = await bundleEntry(entry, outDir)
      // Write a tiny importer so Node loads the ESM bundle cleanly.
      const loader = join(outDir, `load-${entry.replaceAll('/', '__')}.mjs`)
      await writeFile(loader, `export { default } from ${JSON.stringify(pathToFileURL(outfile).href)}\n`)
      const mod = await import(pathToFileURL(loader).href)
      await assertWebHandler(entry, mod)
      console.log(`ok ${entry}`)
    }
  } finally {
    await rm(outDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
