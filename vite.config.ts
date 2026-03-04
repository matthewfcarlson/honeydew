import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Silence Sass deprecation warnings from Bulma (uses legacy syntax)
        silenceDeprecations: ['slash-div', 'global-builtin', 'import', 'color-functions', 'if-function'],
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-trpc': ['@trpc/client'],
        },
      },
    },
  },
  server: {
    port: 8080,
  },
})
