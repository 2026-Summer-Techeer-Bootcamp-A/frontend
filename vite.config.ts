import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// docs/ 는 frontend 루트 밖(repo 루트)에 있어, dev 서버가 상위 디렉터리를 읽도록 허용한다.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
