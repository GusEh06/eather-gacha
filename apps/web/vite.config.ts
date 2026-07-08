import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Railway/Render/Fly place a reverse proxy in front with its own generated
// hostname. Vite's dev-server host check would otherwise reject every
// request from it as a DNS-rebinding attempt, so the known deployment
// hostname(s) must be allow-listed explicitly (set ALLOWED_HOST in the
// service's env vars if the assigned domain changes).
const allowedHosts = [
  "localhost",
  "aether-web-production-ce3a.up.railway.app",
  ...(process.env.ALLOWED_HOST ? [process.env.ALLOWED_HOST] : []),
]

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // animejs v3 has no "exports" field — point directly at the ES module
      animejs: path.resolve(__dirname, 'node_modules/animejs/lib/anime.es.js'),
    },
  },

  optimizeDeps: {
    include: ['animejs'],
  },

  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      router: {
        autoCodeSplitting: true,
      },
    }),
    viteReact(),
  ],

  server: {
    host: true, // Docker / 0.0.0.0
    port: 3000,
    allowedHosts,

    watch: {
      usePolling: true,
      interval: 1000,
    },
  },

  preview: {
    host: true,
    port: 3000,
    allowedHosts,
  },
})
