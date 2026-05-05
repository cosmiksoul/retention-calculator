import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GH Pages: served at https://<user>.github.io/retention-calculator/
export default defineConfig({
  plugins: [react()],
  base: '/retention-calculator/',
  build: {
    rollupOptions: {
      output: {
        // Recharts (+ d3) is ~half of the bundle; isolating it lets the rest cache independently.
        manualChunks: {
          recharts: ['recharts'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-slug'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
    include: ['tests/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
  },
})
