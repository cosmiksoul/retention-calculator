import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GH Pages: served at https://<user>.github.io/retention-calculator/
export default defineConfig({
  plugins: [react()],
  base: '/retention-calculator/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
    include: ['tests/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
  },
})
