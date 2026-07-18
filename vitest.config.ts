import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// vite.config.ts와 별도로 둔다 — build/dev 설정(manualChunks, proxy 등)이 테스트 실행에는
// 불필요하고, vitest 전용 옵션(environment/setupFiles)을 얹기 위한 최소 구성.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    globals: true,
    // 기존 .test.ts 파일들은 node:test 러너 전용(package.json "test" 스크립트)이라 vitest
    // 기본 include에 걸리면 깨진다. 이 프로젝트에 새로 들어오는 vitest+RTL 컴포넌트 테스트는
    // .test.tsx로만 쓰기로 하고, 레거시 .test.ts는 건드리지 않는다.
    include: ['src/**/*.test.tsx'],
  },
})
