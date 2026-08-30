import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'ui': path.resolve(__dirname, '../../packages/ui'),
      '@sunshade/supabase': path.resolve(__dirname, '../../packages/supabase'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'app/dashboard/**/*.ts',
        'app/dashboard/**/*.tsx',
      ],
    },
  },
});
