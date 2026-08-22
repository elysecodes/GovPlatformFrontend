import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
    poolTimeout: 120000,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
