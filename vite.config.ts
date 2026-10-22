import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 404.html is its own small page: hosts serve it for any address that doesn't exist.
    rollupOptions: { input: ['index.html', '404.html'] },
  },
})
