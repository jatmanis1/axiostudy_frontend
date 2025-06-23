import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.worker.mjs'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs-worker': ['pdfjs-dist/build/pdf.worker.mjs'],
        },
      },
    },
  },
  define: {
    'process.env': {},  // Polyfill process.env for frontend
  },
})
