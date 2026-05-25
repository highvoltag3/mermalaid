import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Set `DEV_HTTPS=1` (see `npm run dev:https`) for HTTPS so LAN URLs are a secure context (Web Crypto / private links). */
const useDevHttps = process.env.DEV_HTTPS === '1'

function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath) return '/'
  if (basePath === './') return './'

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...(useDevHttps ? [basicSsl()] : [])],
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
  server: {
    port: parseInt(process.env.PORT || '5173'),
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
  },
  // Expose environment variables to the client
  // Variables prefixed with VITE_ will be available via import.meta.env
  envPrefix: 'VITE_',
})

