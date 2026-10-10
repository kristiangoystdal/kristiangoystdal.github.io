import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// GitHub Pages serverer repoet rett fra main uten byggesteg, så bygget
// skrives til ../hide-and-seek og committes.
export default defineConfig({
  base: './',
  build: { outDir: '../hide-and-seek', emptyOutDir: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hide and Seek Oslo',
        short_name: 'Hide & Seek',
        description: 'Spørsmålstracker for Jetlag Hide and Seek på Oslo T-bane',
        lang: 'nb',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#101317',
        theme_color: '#101317',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,geojson}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(cache\.kartverket\.no|tile\.openstreetmap\.org|server\.arcgisonline\.com)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
})
