import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [devtools(), solidPlugin()],
  server: {
    port: 3000,
    allowedHosts: ['kinderadminpro-webapp-2.onrender.com']
  },
  build: {
    target: 'esnext',
  },
});
