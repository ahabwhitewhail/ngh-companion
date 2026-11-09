import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` -> dist/ for Tauri/Capacitor; `npm run build:single` -> one self-contained HTML
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [preact(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096 },
}))
