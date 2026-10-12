import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Otanime - Streaming Anime Sub Indo',
        short_name: 'Otanime',
        description: 'Streaming anime subtitle Indonesia',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#121214',
        background_color: '#121214',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        // Backend routes are served by the API, not the SPA shell
        navigateFallbackDenylist: [/^\/api/, /^\/docs/, /^\/openapi\.json/],
        runtimeCaching: [
          {
            // Posters and thumbnails
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
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
