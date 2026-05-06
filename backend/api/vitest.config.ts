import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/**/*.test.{ts,js}',
        'src/server.js',
        'src/mockServer.ts',
        'src/solverHybrid.test.js',
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
      },
    },
  },
});
