import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiPort = Number(process.env.API_PORT) || 8787;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true } },
  },
  worker: { format: 'es' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
