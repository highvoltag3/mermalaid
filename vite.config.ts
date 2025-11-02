import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
})

