import type { ComponentType } from 'react'
import { useIsDesktop } from './useMediaQuery'

/** 같은 URL에서 폭에 따라 모바일/데스크톱 컴포넌트를 골라 렌더한다.
 *  셸 크롬은 ResponsiveProductLayout이 담당하고, 여기서는 화면 본문만 스왑한다. */
export default function Adaptive({
  mobile: Mobile,
  desktop: Desktop,
}: {
  mobile: ComponentType
  desktop: ComponentType
}) {
  const isDesktop = useIsDesktop()
  const Screen = isDesktop ? Desktop : Mobile
  return <Screen />
}
