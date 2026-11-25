import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Set `DEV_HTTPS=1` (see `npm run dev:https`) for HTTPS so LAN URLs are a secure context (Web Crypto / private links). */
const useDevHttps = process.env.DEV_HTTPS === '1'

/**
 * Dev server binds to localhost by default. Opt into LAN with `DEV_HOST=1`
 * (or `vite --host`) when you intentionally want phones/other machines to connect.
 */
const bindLan =
  process.env.DEV_HOST === '1' ||
  process.env.DEV_HOST === 'true' ||
  process.env.DEV_HOST === '0.0.0.0'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...(useDevHttps ? [basicSsl()] : [])],
  base: '/',
  server: {
    port: parseInt(process.env.PORT || '5173'),
    host: bindLan ? true : '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Keep Monaco in its own chunk so the main editor route stays leaner.
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor')) return 'monaco-editor'
          return undefined
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  // Expose environment variables to the client
  // Variables prefixed with VITE_ will be available via import.meta.env
  envPrefix: 'VITE_',
})

