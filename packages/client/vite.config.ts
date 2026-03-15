import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@ben10/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/colyseus': {
        target: 'http://localhost:2567',
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
});
