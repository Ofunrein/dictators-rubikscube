/*
 * Vite Config — our dev server and build tool.
 *
 * Vite is what runs when you type "npm run dev". It serves the React app,
 * hot-reloads changes instantly, and bundles everything for production.
 *
 * What this config does:
 *   - Enables React support via the react() plugin
 *   - Sets the dev server port to 5400 (so the frontend always lives at localhost:5400)
 *   - Sets up a proxy so any request to /api/v1/* gets forwarded to the backend
 *     API running on port 5200. This way the browser only talks to one port
 *     (5400) and never has to worry about CORS or cross-origin issues.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_PORT = process.env.VITE_API_PORT || 5200;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_DEV_PORT || 5400),
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
