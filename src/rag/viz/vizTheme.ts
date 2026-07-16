// RAG 챗 시각화 공용 테마 토큰 — VizChart.tsx가 쓰던 하드코딩 상수를 여기로 승격해
// AssistantVisualizer(echartsOptions.ts)와 데모 시나리오(VizChart.tsx) 양쪽이 같은 팔레트를 쓰게 한다.
// 값 자체는 src/design/tokens.ts의 accent[500]/neutral 램프와 일치시켜 디자인 시스템과 어긋나지 않게 유지한다.

export const INK = '#0b0b0c' // tokens.palette.accent[500]
export const SERIES = ['#0b0b0c', '#8fb0e2', '#bcd0f0', '#dde8f9']
export const GRID = '#eef1f6'
export const AXIS = '#e2e5ec'
export const MUTED = '#71717a' // tokens.palette.neutral[500]
export const INK_LABEL = '#43454c'
export const FONT = "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif"

// metric 문자열("408건", "22.7%")에서 숫자만 추출한다. pct 필드가 있으면 그쪽을 우선 쓰고,
// 이건 pct가 비어있는 방어적 케이스에서만 쓰는 폴백이다.
export function parseMetricNumber(metric?: string): number {
  if (!metric) return 0
  const m = metric.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}
