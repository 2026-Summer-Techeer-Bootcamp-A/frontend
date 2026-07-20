// RAG: 질문 → 임베딩 → 근사최근접 탐색 → top-k 재순위 → LLM 주입.
// gallery의 c-rag IIFE를 순수 함수로 이식했다. 점군 위치는 Math.random() 대신
// seededRandom(i)으로 계산해 같은 (w,h)에서 항상 같은 배치가 나오게 했다.
// 2차 개선: 상단 5단계 파이프라인 라벨, top-3 근거를 실제 청크 카드로 확장,
// 마지막에 카드가 LLM 노드로 주입되는 비트를 추가했다.

import type { VizRender } from '../types'
import {
  FONT,
  clamp01,
  easeInOut,
  lerp,
  roundRect,
  star,
  chipLabel,
  seededRandom,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common'

const STAGES = ['질문', '임베딩', '근사최근접 탐색', 'top-k 재순위', 'LLM 종합']

// 단계 경계는 아래 애니메이션 비트들의 등장 타이밍과 맞춰뒀다.
const STAGE_AT = [0, 0.12, 0.3, 0.52, 0.74]

const CAPS = [
  '질문이 들어옵니다',
  '질문을 벡터로 임베딩합니다',
  '벡터공간에서 가까운 데이터를 찾습니다',
  '가장 가까운 근거 3건을 확보합니다',
  '근거를 종합해 하나의 답을 세웁니다',
]

interface Point {
  x: number
  y: number
  d: number
}

interface Chunk {
  source: string
  category: string
  snippet: string
  score: string
  match: string[]
}

const CHUNKS: Chunk[] = [
  {
    source: '원티드',
    category: '백엔드',
    snippet: 'React 3년 이상, Node 기반 API 설계 경험',
    score: '0.93',
    match: ['React'],
  },
  {
    source: '잡코리아',
    category: '풀스택',
    snippet: 'TypeScript React SPA 유지보수',
    score: '0.89',
    match: ['TypeScript', 'React'],
  },
  {
    source: '사람인',
    category: '서버',
    snippet: 'REST API, React 연동 협업',
    score: '0.85',
    match: ['React'],
  },
]

function buildPoints(w: number, h: number): { q: { x: number; y: number }; pts: Point[]; ev: Point[] } {
  const rx0 = w * 0.5
  const rx1 = w - 16
  const ry0 = 58
  const ry1 = h - 24
  const q = { x: w * 0.74, y: h * 0.52 }
  const pts: Point[] = []
  for (let i = 0; i < 70; i++) {
    const px = rx0 + seededRandom(i * 2 + 1) * (rx1 - rx0)
    const py = ry0 + seededRandom(i * 2 + 2) * (ry1 - ry0)
    pts.push({ x: px, y: py, d: Math.hypot(px - q.x, py - q.y) })
  }
  const sorted = pts.slice().sort((a, b) => a.d - b.d)
  const ev = sorted.slice(1, 4)
  return { q, pts, ev }
}

// 스니펫 안에서 tokens에 해당하는 부분만 분리해 하이라이트 여부를 붙인다.
function splitHighlight(text: string, tokens: string[]): { t: string; hl: boolean }[] {
  if (tokens.length === 0) return [{ t: text, hl: false }]
  const esc = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(`(${esc})`, 'g')
  return text
    .split(re)
    .filter((s) => s.length > 0)
    .map((s) => ({ t: s, hl: tokens.includes(s) }))
}

function drawPipeline(ctx: CanvasRenderingContext2D, w: number, stageIdx: number): void {
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const y = 34
  let cx = 18
  const sep = '   ·   '
  STAGES.forEach((s, i) => {
    const active = i === stageIdx
    const done = i < stageIdx
    ctx.font = active ? `700 9px ${FONT}` : `600 9px ${FONT}`
    ctx.fillStyle = active ? '#34d17f' : done ? 'rgba(220,220,224,0.55)' : 'rgba(154,154,162,0.4)'
    ctx.fillText(s, cx, y)
    cx += ctx.measureText(s).width
    if (i < STAGES.length - 1) {
      ctx.font = `600 9px ${FONT}`
      ctx.fillStyle = 'rgba(154,154,162,0.28)'
      ctx.fillText(sep, cx, y)
      cx += ctx.measureText(sep).width
    }
  })
  ctx.restore()
  ctx.save()
  const maxW = Math.min(cx - 18, w - 36)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(18, y + 9)
  ctx.lineTo(18 + maxW, y + 9)
  ctx.stroke()
  ctx.restore()
}

function drawChunkCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cw: number,
  ch: number,
  chunk: Chunk,
  a: number,
): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  roundRect(ctx, x, y, cw, ch, 8)
  ctx.fill()
  ctx.strokeStyle = 'rgba(52,209,127,0.3)'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, cw, ch, 8)
  ctx.stroke()

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = `700 11.5px ${FONT}`
  ctx.fillStyle = 'rgba(244,244,245,0.95)'
  ctx.fillText(`${chunk.source} · ${chunk.category}`, x + 13, y + 17)

  ctx.textAlign = 'right'
  ctx.font = `800 13px ${FONT}`
  ctx.fillStyle = '#34d17f'
  ctx.fillText(chunk.score, x + cw - 13, y + 17)

  const segs = splitHighlight(chunk.snippet, chunk.match)
  ctx.textAlign = 'left'
  ctx.font = `600 11.5px ${FONT}`
  let tx = x + 13
  const ty = y + ch - 16
  segs.forEach((s) => {
    ctx.fillStyle = s.hl ? '#34d17f' : 'rgba(198,198,206,0.92)'
    ctx.fillText(s.t, tx, ty)
    tx += ctx.measureText(s.t).width
  })
  ctx.restore()
}

export const renderRag: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const { q, pts, ev } = buildPoints(w, h)

  const stageIdx =
    p < STAGE_AT[1] ? 0 : p < STAGE_AT[2] ? 1 : p < STAGE_AT[3] ? 2 : p < STAGE_AT[4] ? 3 : 4
  drawPipeline(ctx, w, stageIdx)

  const qa = clamp01(p / 0.12)
  if (qa > 0) {
    ctx.save()
    ctx.globalAlpha = qa
    const qw = 150
    const qh = 28
    const qx = 16
    const qy = 48
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    roundRect(ctx, qx, qy, qw, qh, 9)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.lineWidth = 1
    roundRect(ctx, qx, qy, qw, qh, 9)
    ctx.stroke()
    ctx.fillStyle = 'rgba(244,244,245,0.95)'
    ctx.font = `600 11px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('React 3년 · 백엔드 공고?', qx + 12, qy + qh / 2)
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.font = `700 9px ${FONT}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('질문', qx + 2, qy - 6)
    ctx.restore()
  }

  // 임베딩 밴드: 라벨을 막대 위에 충분한 간격을 두고 배치해 겹치지 않게 한다.
  const embBaseY = h * 0.34
  const maxBarH = 26
  const ea = clamp01((p - 0.16) / 0.14)
  if (ea > 0) {
    ctx.save()
    const bx = 20
    const bw = w * 0.4 - 40
    const n = 18
    const gap = bw / n
    ctx.globalAlpha = ea * 0.9
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.font = `700 9px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('BGE-M3 임베딩 · 1024차원', bx, embBaseY - maxBarH - 10)
    for (let i = 0; i < n; i++) {
      const hh = 5 + (maxBarH - 5) * Math.abs(Math.sin(i * 1.3 + 2))
      const t = clamp01((ea * n - i) / 2)
      if (t <= 0) continue
      ctx.globalAlpha = ea * t
      ctx.fillStyle = 'rgba(110,168,254,0.85)'
      ctx.fillRect(bx + i * gap, embBaseY - hh, gap * 0.62, hh)
    }
    ctx.globalAlpha = ea * 0.5
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(70, 76)
    ctx.lineTo(70, embBaseY - maxBarH - 16)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.setLineDash([3, 4])
  ctx.beginPath()
  ctx.moveTo(w * 0.46, 44)
  ctx.lineTo(w * 0.46, h - 16)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = clamp01((p - 0.3) / 0.1) * 0.8
  ctx.fillStyle = 'rgba(154,154,162,0.9)'
  ctx.font = `700 9px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('벡터공간 · 49,015건', w * 0.5, 58)
  ctx.restore()

  // 점군은 흐리게 뒤쪽 레이어로: 카드/근거 표시보다 먼저, 더 낮은 알파로 그린다.
  const cloudA = clamp01((p - 0.3) / 0.12)
  pts.forEach((pt, i) => {
    const isEv = ev.includes(pt)
    const tw = 0.7 + 0.3 * Math.sin(ts / 400 + i)
    let a = cloudA * (0.14 + 0.06 * tw)
    let rad = 1.2
    let col = '255,255,255'
    if (isEv && p > 0.52) {
      const k = clamp01((p - 0.52) / 0.16)
      a = cloudA * (0.35 + 0.4 * k)
      rad = 1.4 + 1.8 * k
      col = '52,209,127'
    }
    star(ctx, pt.x, pt.y, rad, a, `rgb(${col})`)
  })

  if (p > 0.34) {
    // 종합 단계로 들어가면 우측 벡터공간의 강조는 은은히 흐려져, 좌측에서 근거가
    // 하나로 합쳐지는 데 초점을 내준다.
    const rightFade = 1 - clamp01((p - 0.72) / 0.18)
    const mv = easeInOut(clamp01((p - 0.34) / 0.16))
    const sx = lerp(w * 0.3, q.x, mv)
    const sy = lerp(h * 0.5, q.y, mv)
    star(ctx, sx, sy, 3.4, 0.95 * rightFade, '#6ea8fe', 0.6 * rightFade)
    if (mv >= 1) {
      chipLabel(ctx, '질문 벡터', q.x, q.y - 16, '#9cc2ff', clamp01((p - 0.5) / 0.1) * rightFade, 9)
    }
    if (p > 0.52) {
      ev.forEach((e, j) => {
        const k = clamp01((p - 0.52 - j * 0.05) / 0.14)
        if (k <= 0) return
        ctx.save()
        ctx.strokeStyle = `rgba(52,209,127,${0.45 * k * rightFade})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(q.x, q.y)
        ctx.lineTo(lerp(q.x, e.x, k), lerp(q.y, e.y, k))
        ctx.stroke()
        ctx.restore()
      })
    }
  }

  // top-3 근거 청크 카드: 좌측 하단에 쌓였다가 가운데로 부드럽게 합쳐지며 하나의
  // 답 카드가 된다(우하단 별도 답변 없이, 세 근거가 곧 답이 되는 구조).
  const cardX = 16
  const cardW = w * 0.42
  const cardTop = h * 0.44
  const cardBottom = h - 24
  const cardGap = 10
  const cardH = Math.max(40, Math.min(58, (cardBottom - cardTop - cardGap * 2) / 3))
  const centerY = cardTop + (cardH + cardGap)
  // 세 카드는 가운데로 수렴하며 합쳐짐(mergeK)이 끝날 때 완전히 사라지고, 그 자리에서
  // 답 카드(ansK)가 이어받아 떠오른다. 두 구간이 순차라 뒤 카드가 비치지 않는다.
  const mergeK = easeInOut(clamp01((p - 0.66) / 0.2))
  const ansK = clamp01((p - 0.86) / 0.14)

  CHUNKS.forEach((chunk, j) => {
    const appear = clamp01((p - 0.52 - j * 0.05) / 0.14)
    if (appear <= 0) return
    const slotY = cardTop + j * (cardH + cardGap)
    const y = lerp(slotY, centerY, mergeK)
    let a = appear * (1 - clamp01((mergeK - 0.6) / 0.4))
    if (j !== 1) a *= 1 - clamp01((mergeK - 0.4) / 0.4)
    const slide = (1 - appear) * 14
    drawChunkCard(ctx, cardX - slide, y, cardW, cardH, chunk, a)
  })

  // 합쳐진 답 카드: 세 근거가 모인 자리에서 초록에서 금빛으로 물들며 떠오른다.
  if (ansK > 0) {
    const ah2 = Math.max(cardH + 22, 68)
    const ay2 = centerY + cardH / 2 - ah2 / 2
    ctx.save()
    ctx.globalAlpha = ansK
    // 불투명 베이스로 뒤에 남은 잔상을 가린다.
    ctx.fillStyle = 'rgb(40,40,40)'
    roundRect(ctx, cardX, ay2, cardW, ah2, 10)
    ctx.fill()
    const glowP = 0.85 + 0.15 * Math.sin(ts / 300)
    ctx.shadowColor = 'rgba(255,217,138,0.5)'
    ctx.shadowBlur = 12 * glowP
    ctx.fillStyle = 'rgba(255,217,138,0.12)'
    roundRect(ctx, cardX, ay2, cardW, ah2, 10)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255,217,138,0.5)'
    ctx.lineWidth = 1.3
    roundRect(ctx, cardX, ay2, cardW, ah2, 10)
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffe7a8'
    ctx.font = `800 14px ${FONT}`
    ctx.fillText('React 중심 백엔드 3곳 추천', cardX + 14, ay2 + 21)
    ctx.fillStyle = 'rgba(232,232,236,0.92)'
    ctx.font = `600 11.5px ${FONT}`
    ctx.fillText('세 공고 모두 React 실무를 요구', cardX + 14, ay2 + 42)
    ctx.fillStyle = 'rgba(255,231,168,0.92)'
    ctx.font = `700 10.5px ${FONT}`
    ctx.fillText('근거 3건 종합 · 평균 0.89', cardX + 14, ay2 + 60)
    ctx.restore()
  }

  drawTopLabel(ctx, 'RAG', '근거를 찾는 법')
  drawCaption(ctx, h, CAPS[stageIdx])
}
