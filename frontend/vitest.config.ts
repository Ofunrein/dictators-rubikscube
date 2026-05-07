import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx,js,jsx}',
      ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 15,
      },
    },
  },
});
