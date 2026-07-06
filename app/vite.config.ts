import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/JP-Learner/', // MUST match repo name. Drives BASE_URL, SW scope, manifest.
  plugins: [
    react(),
    tailwind(), // Tailwind v4 Vite plugin — NO postcss.config, NO tailwind.config.js
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'JP-Learner',
        short_name: 'JP-Learner',
        lang: 'es',
        start_url: '.', // relative → resolves under /JP-Learner/
        scope: '.',
        display: 'standalone',
        background_color: '#F5F5F8',
        theme_color: '#5A5AE6',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], // precache hashed assets (cache-first)
        navigateFallback: 'index.html', // SPA shell
        runtimeCaching: [
          {
            // content JSON: a NEW class must appear on refresh (PWA-03) → network-first
            urlPattern: ({ url }) => url.pathname.includes('/content/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'content-json',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200 },
            },
          },
        ],
      },
    }),
  ],
})
