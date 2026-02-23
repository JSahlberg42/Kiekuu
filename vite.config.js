import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react')) return 'react';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('/firebase/')) return 'firebase';
            if (id.includes('lucide-react')) return 'icons';
          }
        }
      }
    }
  }
})
