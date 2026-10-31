import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/ecosystemia/',
  plugins: [preact()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
