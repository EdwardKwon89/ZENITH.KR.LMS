import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 10000,
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'tests/e2e/**',
      'scratch/**',
      // Live-DB integration tests: require real Supabase + .env.local — excluded from CI regression
      'tests/integration/p6-transport-policy.test.ts',
      'tests/integration/tracking-business-qa.test.ts',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Integration tests share remote DB state — sequential to prevent data races
    fileParallelism: false,
  },
});
