import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // C-1 (bundle-barrel-imports): pré-bundling do lucide-react elimina carregamento de 1.583
  // módulos desnecessários no dev, reduzindo boot time em ~2.8s e cold start em 200–800ms.
  optimizeDeps: {
    include: ['lucide-react']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('react-select')) return 'vendor-react-select';
          if (id.includes('react-calendar')) return 'vendor-react-calendar';

          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
