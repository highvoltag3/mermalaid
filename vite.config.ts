import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Set `DEV_HTTPS=1` (see `npm run dev:https`) for HTTPS so LAN URLs are a secure context (Web Crypto / private links). */
const useDevHttps = process.env.DEV_HTTPS === '1'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...(useDevHttps ? [basicSsl()] : [])],
  base: '/', // Use absolute path for Appwrite Sites deployment
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

