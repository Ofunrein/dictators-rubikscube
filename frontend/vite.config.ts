import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env['VITE_API_PORT'] ?? '5200';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env['VITE_DEV_PORT'] ?? '5400'),
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
});
