import { defineConfig } from 'vitest/config';
import path from 'path';
import { createRequire } from 'module';

const requireNext = createRequire(path.resolve(__dirname, '../../apps/next/package.json'));
const react = requireNext('@vitejs/plugin-react').default || requireNext('@vitejs/plugin-react');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': path.dirname(requireNext.resolve('react/package.json')),
      'react-dom': path.dirname(requireNext.resolve('react-dom/package.json')),
      'react-native': 'react-native-web',
      '@sunshade/ui': path.resolve(__dirname, './src'),
      '@testing-library/react': requireNext.resolve('@testing-library/react'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: false,
  },
});
