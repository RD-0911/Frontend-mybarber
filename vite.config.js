import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    historyApiFallback: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core separado
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Recharts en su propio chunk — solo se carga cuando entra al Dashboard
          'recharts': ['recharts'],
        },
      },
    },
  },
})