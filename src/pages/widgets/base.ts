// ============================================================
// 위젯 공유 베이스 — 디자인 토큰과 정합하는 색·차트·유틸
// 슬레이트 블루 액센트(#2f61b8) 위에서, 진주/기회는 골드 1색으로.
// ============================================================
import { useEffect, useRef, useState } from 'react'

export const C = {
  accent: '#2f61b8',
  accent700: '#21447c',
  accent600: '#28539c',
  accent400: '#5a86cf',
  accent300: '#8fb0e2',
  accent100: '#dde8f9',
  accent50: '#eef3fb',
  ink: '#1c1d21',
  ink2: '#43454c',
  muted: '#7c7f88',
  line: '#e6e9ef',
  line2: '#eef1f6',
  bg: '#f6f8fc',
  // 진주·기회 = 골드 1색
  gold: '#b8892b',
  goldSoft: '#d8b25e',
  goldBg: '#f7efd9',
  // 쇠퇴·디스카운트 = 뮤트 레드
  danger: '#c8382d',
  dangerSoft: '#d98077',
  dangerBg: '#fbe9e7',
  success: '#218a58',
  successBg: '#e6f5ed',
  neutral: '#a2a6b0',
  neutral200: '#e2e5ec',
  neutral300: '#cdd2db',
} as const

export const FONT = "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif"
export const MONO = "'SF Mono', 'Roboto Mono', ui-monospace, monospace"

// 데모용 이력서 스킬셋 — 보유(악센트)/갭(골드) 색 구분에 사용
export const RESUME = ['Python', 'React', 'TypeScript', 'JavaScript', 'AWS', 'Git', 'MySQL', 'Node.js']

// 공통 툴팁 스타일 (흰 카드 + 얇은 보더 + 미세 섀도)
export const tooltipStyle = {
  backgroundColor: '#fff',
  borderColor: C.line,
  borderWidth: 1,
  padding: [10, 13] as [number, number],
  textStyle: { color: C.ink, fontFamily: FONT, fontSize: 12.5, fontWeight: 500 as const },
  extraCssText: 'border-radius:12px; box-shadow:0 8px 24px rgba(20,30,60,0.10), 0 2px 6px rgba(20,30,60,0.05);',
}

export const axisLabel = { color: C.muted, fontFamily: FONT, fontSize: 11.5, fontWeight: 600 as const }
export const axisLine = { lineStyle: { color: C.line } }
export const splitLine = { lineStyle: { color: C.line2, type: 'dashed' as const } }

// 숫자 카운트업 훅 — 진입 1회 또는 값 변경 시 부드럽게
export function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - p, 3) // cubicOut
      setVal(start + (target - start) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}

export const fmtUsd = (n: number) => '$' + Math.round(n / 1000) + 'k'
export const fmtInt = (n: number) => Math.round(n).toLocaleString()
export const pct = (n: number) => (n > 0 ? '+' : '') + Math.round(n) + '%'
