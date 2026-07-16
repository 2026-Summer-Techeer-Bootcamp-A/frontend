import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// docs/ 는 frontend 루트 밖(repo 루트)에 있어, dev 서버가 상위 디렉터리를 읽도록 허용한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts') || id.includes('zrender')) {
              return 'vendor-echarts';
            }
            if (id.includes('d3')) {
              return 'vendor-d3';
            }
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('highlight.js')) {
              return 'vendor-highlight';
            }
            return 'vendor-libs';
          }
          if (id.includes('src/design/')) {
            return 'vendor-design';
          }
          if (id.includes('src/pages/widgets/')) {
            return 'vendor-widgets';
          }
          if (id.includes('src/pages/') && !id.includes('src/pages/widgets/')) {
            return 'vendor-lab-pages';
          }
        }
      }
    }
  }
})
