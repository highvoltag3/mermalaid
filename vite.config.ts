import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use absolute path for Appwrite Sites deployment
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
  },
  // Expose environment variables to the client
  // Variables prefixed with VITE_ will be available via import.meta.env
  envPrefix: 'VITE_',
  // Optimize dependencies - exclude Tauri plugins that aren't available in web
  optimizeDeps: {
    exclude: [
      '@tauri-apps/plugin-updater',
      '@tauri-apps/api/app',
      '@tauri-apps/api/process',
    ],
  },
  // Resolve conditions for Tauri plugins
  resolve: {
    conditions: ['browser', 'default'],
    // Alias Tauri modules to empty stubs for web builds
    alias: {
      '@tauri-apps/plugin-updater': resolve(__dirname, 'src/utils/tauri-stubs.ts'),
      '@tauri-apps/api/app': resolve(__dirname, 'src/utils/tauri-stubs.ts'),
      '@tauri-apps/api/process': resolve(__dirname, 'src/utils/tauri-stubs.ts'),
    },
  },
})

