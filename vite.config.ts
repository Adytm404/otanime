import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true, // Allow any host (serveo, ngrok, localtunnel, etc.)
    proxy: {
      '/api': {
        target: 'https://otanime.webkulo.com',
        changeOrigin: true,
      },
      '/docs': {
        target: 'https://otanime.webkulo.com',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'https://otanime.webkulo.com',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://otanime.webkulo.com',
        changeOrigin: true,
      },
      '/docs': {
        target: 'https://otanime.webkulo.com',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'https://otanime.webkulo.com',
        changeOrigin: true,
      },
    },
  },
});
