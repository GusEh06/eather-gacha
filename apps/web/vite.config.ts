import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
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
