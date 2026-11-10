import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'

// Build modes:
//   npm run build         -> dist/        web assets for the Android and Windows apps
//   npm run build:single  -> dist-single/ one self-contained HTML file
//   npm run build:pages   -> dist-pages/  browser version for GitHub Pages (installable, works offline)
export default defineConfig(({ mode }) => {
  const pages = mode === 'pages'
  return {
    base: pages ? '/ngh-companion/' : './',
    // e2e: local signaling relay for the two-browser table test (see e2e/)
    resolve: mode === 'e2e' ? { alias: { trystero: '/e2e/trystero-shim.ts' } } : undefined,
    plugins: [
      preact(),
      ...(mode === 'single' ? [viteSingleFile()] : []),
      ...(pages
        ? [VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
            manifest: {
              name: 'NGH Companion',
              short_name: 'NGH',
              description: 'Unofficial companion for the Never Going Home RPG: soldier record, +One dice, cards.',
              lang: 'ru',
              start_url: '/ngh-companion/',
              scope: '/ngh-companion/',
              display: 'standalone',
              orientation: 'any',
              background_color: '#dcd5c1',
              theme_color: '#23211c',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], cleanupOutdatedCaches: true },
          })]
        : []),
    ],
    build: {
      outDir: mode === 'single' ? 'dist-single' : pages ? 'dist-pages' : mode === 'e2e' ? 'dist-e2e' : 'dist',
      assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    },
  }
})
