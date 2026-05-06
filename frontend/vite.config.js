import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Copie backend/config.json → backend/static/config.json après chaque build
// pour que Vercel puisse le servir comme fichier statique.
function copyConfigPlugin() {
  return {
    name: 'copy-config-json',
    closeBundle() {
      const src  = resolve(__dirname, '../backend/config.json')
      const dest = resolve(__dirname, '../backend/static/config.json')
      if (existsSync(src)) {
        copyFileSync(src, dest)
        console.log('[copy-config] backend/config.json → backend/static/config.json ✓')
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), copyConfigPlugin()],
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
