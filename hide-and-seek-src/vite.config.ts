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
        // Åpner appen når man trykker på et varsel.
        importScripts: ['sw-notify.js'],
        // Bare Oslo (standardbyen) lastes ned på forhånd. De andre byene lagres første gang de
        // åpnes, så telefonen slipper å laste ned alle byene (7,5 MB) ved første besøk.
        globPatterns: ['**/*.{js,css,html,svg}', 'data/oslo/**/*.{json,geojson}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/[a-z]+\/.+\.(json|geojson)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'city-data', cacheableResponse: { statuses: [200] } },
          },
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
