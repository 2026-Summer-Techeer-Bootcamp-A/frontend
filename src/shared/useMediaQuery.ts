import { useEffect, useState } from 'react'

/** 뷰포트 미디어쿼리 구독 훅. SPA 전용(SSR 없음)이라 초기값을 window에서 바로 읽는다. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// 데스크톱 셸 진입 기준. 500~1023px(태블릿)은 당분간 모바일 레이아웃으로 처리한다(Phase 3에서 재검토).
export const DESKTOP_MIN = 1024

/** 데스크톱(사이드바 셸) 여부. 이 값으로 셸/레이아웃을 스왑한다. */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${DESKTOP_MIN}px)`)
}

/** OS 수준 모션 축소 설정. JS에서 애니메이션 타이밍(딜레이 스킵 등)을 분기해야 하는
 * 곳에서 쓴다 — 순수 CSS @media만으로 안 되는 경우(예: setTimeout 체인) 전용. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
