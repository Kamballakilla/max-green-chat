import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/max-green-chat/',
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', restoreMocks: true },
});
