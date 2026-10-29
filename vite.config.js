import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, cpSync } from 'node:fs'

// Which club is being built: CLUB=norton npm run build (defaults to leon).
// Club name, short name and colours for the installed app come from clubs/<club>/club.json.
const club = JSON.parse(readFileSync(`./clubs/${process.env.CLUB || 'leon'}/club.json`, 'utf8'))
const clubHtml = () => ({
  name: 'club-html',
  transformIndexHtml: (html) => html
    .replaceAll('%CLUB_NAME%', club.name)
    .replaceAll('%CLUB_SHORT%', club.short)
    .replaceAll('%CLUB_DESC%', club.description),
})

// The how-to page for adding clubs (sop/) is published with the Leon build only, at /sop/.
const sopPage = () => ({
  name: 'sop-page',
  apply: 'build',
  closeBundle() { if ((process.env.CLUB || 'leon') === 'leon') cpSync('sop', 'dist/sop', { recursive: true }) },
})

export default defineConfig({
  plugins: [
    react(),
    clubHtml(),
    sopPage(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: club.name,
        short_name: club.short,
        description: club.description,
        theme_color: club.themeColor,
        background_color: club.themeColor,
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'apple touch icon' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'sop/**'],
        navigateFallbackDenylist: [/^\/sop(\/|$)/, /^\/api\//, /^\/img\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ]
})
