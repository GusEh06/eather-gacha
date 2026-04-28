import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

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

    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
})

