// 시각화 4종이 공유하는 팔레트 · 이징 · 그리기 헬퍼.
// gallery 시안(ppt-viz-gallery.html)의 IIFE 유틸 함수를 TS로 그대로 이식했다.
// 모든 함수는 순수하다(외부 상태를 참조하지 않는다).

export const FONT =
  "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

// 스테이지 배경색. 기본값은 디자인 시스템 정본 #282828이나, PptVisualMaker.tsx
// 우측 패널의 컬러피커로 실행 중 바꿀 수 있게 모듈 상태로 둔다. render는 여전히
// 단일 세션(프리뷰 또는 내보내기 1회) 내에서는 같은 (p,ts,w,h) 입력에 같은 그림을
// 내므로 순수함수 계약을 깨지 않는다.
let stageBg = '#282828'

export function getStageColor(): string {
  return stageBg
}

export function setStageColor(hex: string): void {
  stageBg = hex
}

// mp4 내보내기 중에는 좌상단 제목 라벨/좌하단 캡션을 감춘다(vizExport.ts가 제어).
// 15개 viz 파일의 render 시그니처를 건드리지 않기 위해 모듈 플래그로 둔다.
let chromeVisible = true

export function setChromeVisible(v: boolean): void {
  chromeVisible = v
}

export const palette = {
  ink: '#f4f4f5',
  muted: '#9a9aa2',
  muted2: '#6f6f78',
  chipBg: 'rgba(255,255,255,0.05)',
  chipBd: 'rgba(255,255,255,0.13)',
  good: '#34d17f',
  goodBg: 'rgba(52,209,127,0.14)',
  warn: '#e2933f',
  warnBg: 'rgba(226,147,63,0.14)',
  blue: '#6ea8fe',
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2)
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

// 결정론적 시드 난수. 같은 seed면 항상 같은 값을 반환한다.
// Math.random() 대신 사용해 render(ctx,w,h,p,ts)의 순수성을 지킨다.
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function star(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  a: number,
  col: string,
  spike = 0,
): void {
  ctx.save()
  ctx.globalAlpha = a * 0.28
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2)
  g.addColorStop(0, col)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2)
  ctx.fill()
  if (spike > 0.02) {
    ctx.globalAlpha = a * spike * 0.9
    ctx.strokeStyle = col
    ctx.lineWidth = 0.8
    const L = r * 3.6 * spike
    ctx.beginPath()
    ctx.moveTo(cx - L, cy)
    ctx.lineTo(cx + L, cy)
    ctx.moveTo(cx, cy - L)
    ctx.lineTo(cx, cy + L)
    ctx.stroke()
  }
  ctx.globalAlpha = a
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function chipLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  col: string,
  a: number,
  fs = 10,
): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.font = `600 ${fs}px ${FONT}`
  const tw = ctx.measureText(text).width
  const pw = tw + 14
  const ph = fs + 8
  const x = cx - pw / 2
  const y = cy - ph / 2
  ctx.globalAlpha = a * 0.92
  ctx.fillStyle = 'rgba(30,30,30,0.9)'
  roundRect(ctx, x, y, pw, ph, ph / 2)
  ctx.fill()
  ctx.globalAlpha = a * 0.7
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, pw, ph, ph / 2)
  ctx.stroke()
  ctx.globalAlpha = a
  ctx.fillStyle = col
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy + 0.5)
  ctx.restore()
}

// problem.ts(문제 인식)와 solution.ts(해결 워크플로우)가 공유하는 플래그십 기술
// 데이터. problem.ts의 끝(흩어진 별)과 solution.ts의 시작이 같은 이름·같은 산포
// 위치를 가리켜야 두 시각화가 하나의 이야기처럼 이어진다.
export type FlagshipCategory = '언어' | '백엔드' | '데이터' | '인프라' | '프론트'

export interface FlagshipTech {
  name: string
  cat: FlagshipCategory
  own: boolean
  pre: string | null
  // 이 순서로 배우는 근거: 공고 수요 순위 힌트(실측 없는 항목은 과장 없는 예시치).
  hint: string
}

export const FLAGSHIP_TECHS: FlagshipTech[] = [
  { name: 'Java', cat: '언어', own: true, pre: null, hint: '수요 상위 5%' },
  { name: 'Python', cat: '언어', own: false, pre: null, hint: '수요 상위 9%' },
  { name: 'TypeScript', cat: '언어', own: false, pre: null, hint: '수요 상위 7%' },
  { name: 'Go', cat: '언어', own: false, pre: null, hint: '수요 상위 15%' },
  { name: 'Spring', cat: '백엔드', own: true, pre: 'Java', hint: '수요 상위 8%' },
  { name: 'MySQL', cat: '데이터', own: false, pre: null, hint: '수요 상위 11%' },
  { name: 'Redis', cat: '데이터', own: false, pre: 'MySQL', hint: '수요 상위 22%' },
  { name: 'React', cat: '프론트', own: true, pre: 'TypeScript', hint: '수요 상위 6%' },
  { name: 'Docker', cat: '인프라', own: true, pre: 'Spring', hint: '수요 상위 12%' },
  { name: 'AWS', cat: '인프라', own: true, pre: 'Docker', hint: '수요 상위 10%' },
  { name: 'K8s', cat: '인프라', own: false, pre: 'Docker', hint: '수요 상위 14%' },
  { name: 'Kafka', cat: '백엔드', own: false, pre: 'Spring', hint: '수요 상위 19%' },
]

// pre(선행 기술) 체인에서 깊이를 자동 계산한다(위상정렬 longest-path).
// pre가 없으면 depth 0, 있으면 depth(pre)+1. 손으로 매긴 depth 필드는 pre 체인과
// 어긋나 화살표가 거꾸로 휘거나 컬럼을 건너뛰는 버그를 냈기 때문에 제거했다.
export function computeDepths(techs: FlagshipTech[]): number[] {
  const byName = new Map(techs.map((t, i) => [t.name, i]))
  const depths = new Array<number>(techs.length).fill(-1)
  function resolve(i: number, visiting: Set<number>): number {
    if (depths[i] >= 0) return depths[i]
    // 순환 참조 방지 가드(정상 데이터라면 도달하지 않는다).
    if (visiting.has(i)) {
      depths[i] = 0
      return 0
    }
    visiting.add(i)
    const t = techs[i]
    const preIdx = t.pre ? byName.get(t.pre) : undefined
    const d = preIdx === undefined ? 0 : resolve(preIdx, visiting) + 1
    depths[i] = d
    return d
  }
  techs.forEach((_, i) => resolve(i, new Set()))
  return depths
}

// 북두칠성(Big Dipper) 배치. 앞 7개는 국자 모양(손잡이 0~3, 국자 3~6),
// 뒤 5개는 국자를 흐트러뜨리지 않게 주변에 둔 동반별이다. 정규화 좌표(가용 영역
// 기준 0~1)라 여백만 반영하면 어느 해상도에서도 같은 모양이 나온다.
const BIG_DIPPER: readonly [number, number][] = [
  [0.06, 0.45], // 0 Alkaid  손잡이 끝
  [0.21, 0.31], // 1 Mizar
  [0.36, 0.24], // 2 Alioth
  [0.51, 0.29], // 3 Megrez  손잡이와 국자 연결
  [0.67, 0.21], // 4 Dubhe
  [0.71, 0.45], // 5 Merak
  [0.53, 0.51], // 6 Phecda
  [0.16, 0.72], // 7 동반별
  [0.42, 0.73], // 8 동반별
  [0.85, 0.64], // 9 동반별
  [0.9, 0.36], // 10 동반별
  [0.66, 0.71], // 11 동반별
]

// FLAGSHIP_TECHS[i]가 흩어질 때 도착하는 결정론적 최종 좌표(북두칠성 모양).
// 상단 라벨/파이프라인 영역과 하단 캡션 영역을 피해 여백을 둔다.
// problem.ts(문제 인식) 끝 상태와 solution.ts(해결) 시작 상태가 이 좌표로 완벽히 이어진다.
export function scatterPosition(i: number, w: number, h: number): { x: number; y: number } {
  const marginX = 30
  const marginTop = 42
  const marginBottom = 32
  const [nx, ny] = BIG_DIPPER[i % BIG_DIPPER.length]
  return {
    x: marginX + nx * (w - marginX * 2),
    y: marginTop + ny * (h - marginTop - marginBottom),
  }
}

// 흩어짐의 과부하 느낌을 더하는 배경 먼지 별(라벨 없음, 실제 기술 데이터와 무관).
// problem.ts(문제 인식) 끝과 solution.ts(해결 워크플로우) 시작이 같은 위치를
// 가리켜야 두 화면이 하나의 이야기처럼 이어지므로 시드 함수를 여기서 공유한다.
export const NOISE_STAR_COUNT = 26

export function noiseStarPosition(i: number, w: number, h: number): { x: number; y: number } {
  const marginX = 20
  const marginTop = 36
  const marginBottom = 30
  const sx = seededRandom(i * 6.47 + 101.3)
  const sy = seededRandom(i * 8.29 + 205.7)
  return {
    x: marginX + sx * (w - marginX * 2),
    y: marginTop + sy * (h - marginTop - marginBottom),
  }
}

// 배경은 항상 현재 stageBg(기본 #282828, 컬러피커로 변경 가능)로 채운 뒤 그린다.
export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save()
  ctx.fillStyle = stageBg
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// gallery의 .lbl(좌상단 "카테고리 · 제목" 라벨)을 canvas에 직접 그린다.
// mp4 내보내기 중에는 chromeVisible이 false라 그리지 않는다.
export function drawTopLabel(ctx: CanvasRenderingContext2D, category: string, title: string): void {
  if (!chromeVisible) return
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const x = 18
  const y = 19
  ctx.font = `700 11px ${FONT}`
  ctx.fillStyle = palette.ink
  const catW = ctx.measureText(category).width
  ctx.fillText(category, x, y)
  ctx.font = `600 11px ${FONT}`
  ctx.fillStyle = palette.muted
  ctx.fillText(` · ${title}`, x + catW, y)
  ctx.restore()
}

// gallery의 .subcap(좌하단 점 + 캡션 텍스트)을 canvas에 직접 그린다.
// mp4 내보내기 중에는 chromeVisible이 false라 그리지 않는다.
export function drawCaption(ctx: CanvasRenderingContext2D, h: number, text: string): void {
  if (!chromeVisible) return
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const y = h - 15
  ctx.fillStyle = palette.good
  ctx.beginPath()
  ctx.arc(21, y, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `500 11.5px ${FONT}`
  ctx.fillStyle = palette.muted
  ctx.fillText(text, 32, y)
  ctx.restore()
}
