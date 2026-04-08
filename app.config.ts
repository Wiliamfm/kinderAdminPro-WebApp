import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  ssr: false,
  middleware: './src/middleware.ts',
  server: {
    preset: 'node-server',
  },
  vite: {
    server: {
      allowedHosts: true,
    },
    build: {
      target: 'esnext',
    },
  },
});
