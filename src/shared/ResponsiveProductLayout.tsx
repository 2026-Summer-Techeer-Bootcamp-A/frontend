import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { useIsDesktop } from './useMediaQuery'
import DesktopShell from '../desktop/DesktopShell'

import DefaultLoader from './DefaultLoader'

/** 제품 라우트 공통 레이아웃.
 *  - 데스크톱: 사이드바 + 톱바 셸(DesktopShell)이 콘텐츠를 감싼다(셸은 라우트 전환에도 유지).
 *  - 모바일: 기존 폰 화면이 자기 프레임을 들고 오므로 셸 없이 그대로 통과시킨다. */
export default function ResponsiveProductLayout() {
  const isDesktop = useIsDesktop()
  
  const content = (
    <Suspense fallback={<DefaultLoader size="small" />}>
      <Outlet />
    </Suspense>
  )

  if (isDesktop) {
    return (
      <DesktopShell>
        {content}
      </DesktopShell>
    )
  }
  return content
}
