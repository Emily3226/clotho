import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { APP_NAME } from './src/config';

const apiPort = Number(process.env.API_PORT) || 8787;

export default defineConfig({
  base: './',
  plugins: [react(), { name: 'app-name', transformIndexHtml: (html: string) => html.replaceAll('%APP_NAME%', APP_NAME) }],
  server: {
    port: 5173,
    proxy: { '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true } },
  },
  worker: { format: 'es' },
  // Each test runs thousands of simulated lives, and CI machines can be slow.
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 30000 },
});
