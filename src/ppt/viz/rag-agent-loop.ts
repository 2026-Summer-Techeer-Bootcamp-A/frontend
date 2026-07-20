// RAG 에이전트 루프: 실제 질문 하나가 들어와 계획으로 쪼개지고, SQL · Vector ·
// Graph 세 도구가 각각 실제 질의를 날려 결과를 받아온다. 관찰에서 근거가
// 부족하면 계획으로 한 번 더 돌아가고, 충분해지면 종합해 답을 낸다.
// 좁은 원형 대신 가로 흐름(질문 -> 계획 -> 도구 3개 -> 관찰 -> 답)으로 배치해
// 질의·결과 텍스트가 겹치지 않게 했다.

import type { VizRender } from '../types'
import { FONT, clamp01, lerp, easeInOut, roundRect, star, chipLabel, drawBackground, drawTopLabel, drawCaption } from './common'

const CAPS = [
  '질문을 계획으로 분해합니다',
  '도구별로 실제 질의를 날려 결과를 관찰합니다',
  '근거가 충분하면 종합해 답을 냅니다',
]

const QUERY_TEXT = '서울 백엔드 신입, React 활용 공고?'
const PLAN_TEXT = '지역 · 경력 필터 + React 의미검색으로 분해'
const OBSERVE_TEXT = '겹치는 공고 18건 · 근거 충분'

interface ToolDef {
  name: string
  query: string
  result: string
  col: string
}

const TOOLS: ToolDef[] = [
  { name: 'SQL', query: '질의: 지역=서울 & 경력=신입', result: '결과: 1,240건', col: '#6ea8fe' },
  { name: 'Vector', query: '질의: React 유사도 검색', result: '결과: top 50', col: '#34d17f' },
  { name: 'Graph', query: '질의: React 연관 확장', result: '결과: 상태관리 · Node', col: '#e2933f' },
]

interface Pt {
  x: number
  y: number
}

interface Layout {
  q: Pt
  plan: Pt
  observe: Pt
  toolX: number
  toolW: number
  toolH: number
  toolY: number[]
}

function buildLayout(w: number, h: number): Layout {
  const toolH = h * 0.2
  return {
    q: { x: w * 0.17, y: h * 0.5 },
    plan: { x: w * 0.37, y: h * 0.5 },
    observe: { x: w * 0.89, y: h * 0.5 },
    toolX: w * 0.6,
    toolW: w * 0.24,
    toolH,
    toolY: [h * 0.5 - h * 0.31 - toolH / 2, h * 0.5 - toolH / 2, h * 0.5 + h * 0.31 - toolH / 2],
  }
}

// 단계별 시간 창.
const PLAN_START = 0.06
const TOOLS_START = 0.2
const TOOLS_STAGGER = 0.07
const OBSERVE_START = 0.5
const LOOP_START = 0.6
const LOOP_END = 0.72
const PULSE_START = 0.72
const PULSE_END = 0.82
const CONVERGE_START = 0.82
const ANSWER_START = 0.9

function nodeCircle(ctx: CanvasRenderingContext2D, pos: Pt, r: number, label: string, active: boolean, col: string, ts: number): void {
  ctx.save()
  const think = active ? 0.5 + 0.5 * Math.sin(ts / 220) : 0
  const rr = r + think * 1.4
  const gl = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, rr * 2)
  gl.addColorStop(0, 'rgba(255,255,255,0.14)')
  gl.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gl
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, rr * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, rr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = col
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, rr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = col
  ctx.font = `800 10.5px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, pos.x, pos.y)
  ctx.restore()
}

function toolCard(ctx: CanvasRenderingContext2D, t: ToolDef, x: number, y: number, w: number, h: number, a: number, pulse: number): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  if (pulse > 0.01) {
    ctx.shadowColor = t.col
    ctx.shadowBlur = 12 * pulse
  }
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  roundRect(ctx, x, y, w, h, 9)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = t.col
  ctx.lineWidth = 1.2
  roundRect(ctx, x, y, w, h, 9)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = t.col
  ctx.font = `800 11px ${FONT}`
  ctx.fillText(t.name, x + 12, y + 16)

  ctx.fillStyle = 'rgba(220,220,224,0.85)'
  ctx.font = `500 8.5px ${FONT}`
  ctx.fillText(t.query, x + 12, y + h / 2 + 2)

  ctx.fillStyle = 'rgba(244,244,245,0.95)'
  ctx.font = `700 9px ${FONT}`
  ctx.fillText(t.result, x + 12, y + h - 14)
  ctx.restore()
}

export const renderRagAgentLoop: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const L = buildLayout(w, h)

  const planActive = p >= PLAN_START && p < TOOLS_START + 0.04
  const observeActive = (p >= OBSERVE_START && p < LOOP_START) || (p >= PULSE_START && p < CONVERGE_START)
  const converge = clamp01((p - CONVERGE_START) / 0.08)

  // 질문 칩: 좌측에서 등장해 계획 노드로 흘러간다.
  const qa = clamp01(p / 0.05)
  if (qa > 0.01) {
    ctx.save()
    ctx.globalAlpha = qa
    ctx.font = `600 10.5px ${FONT}`
    const tw = ctx.measureText(QUERY_TEXT).width
    const qw = tw + 20
    const qh = 26
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    roundRect(ctx, L.q.x - qw / 2, L.q.y - qh / 2, qw, qh, 9)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.lineWidth = 1
    roundRect(ctx, L.q.x - qw / 2, L.q.y - qh / 2, qw, qh, 9)
    ctx.stroke()
    ctx.fillStyle = 'rgba(244,244,245,0.95)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(QUERY_TEXT, L.q.x, L.q.y)
    ctx.restore()
  }
  if (p >= 0.02 && p < PLAN_START + 0.03) {
    const travel = easeInOut(clamp01((p - 0.02) / (PLAN_START + 0.01)))
    star(ctx, lerp(L.q.x + 60, L.plan.x - 22, travel), L.plan.y, 2.2, 0.85 * (1 - Math.abs(travel - 0.5) * 0.4), '#ffffff', 0.4)
  }

  // 계획 노드.
  const planA = clamp01((p - PLAN_START) / 0.08)
  if (planA > 0.01) {
    const col = converge > 0.01 ? '#ffe7a8' : '#f4f4f5'
    ctx.save()
    ctx.globalAlpha = planA
    nodeCircle(ctx, L.plan, 22, '계획', planActive, col, ts)
    ctx.restore()
    chipLabel(ctx, PLAN_TEXT, L.plan.x, L.plan.y + 36, '#9cc2ff', clamp01((p - PLAN_START - 0.03) / 0.08), 8.5)
  }

  // 계획 -> 도구 3개 화살표(점선, 판단 중).
  TOOLS.forEach((t, i) => {
    const cardX = L.toolX
    const cardY = L.toolY[i]
    const cardCenter = { x: cardX, y: cardY + L.toolH / 2 }
    const arrowA = clamp01((p - (TOOLS_START - 0.04)) / 0.1)
    if (arrowA > 0.01 && p < OBSERVE_START) {
      ctx.save()
      ctx.globalAlpha = 0.4 * arrowA
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = t.col
      ctx.lineWidth = 1
      const midX = (L.plan.x + cardCenter.x) / 2
      ctx.beginPath()
      ctx.moveTo(L.plan.x + 24, L.plan.y)
      ctx.bezierCurveTo(midX, L.plan.y, midX, cardCenter.y, cardX, cardCenter.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
    const cardA = clamp01((p - (TOOLS_START + i * TOOLS_STAGGER)) / 0.14)
    const pulseA = clamp01((p - (PULSE_START + i * 0.02)) / 0.06) * (1 - clamp01((p - PULSE_END) / 0.04))
    toolCard(ctx, t, cardX, cardY, L.toolW, L.toolH, cardA, pulseA)

    // 도구 -> 관찰 화살표(결과가 모임).
    const toObserveA = clamp01((p - (TOOLS_START + i * TOOLS_STAGGER + 0.14)) / 0.1)
    if (toObserveA > 0.01) {
      ctx.save()
      ctx.globalAlpha = 0.45 * toObserveA
      ctx.strokeStyle = t.col
      ctx.lineWidth = 1.1
      const midX = (cardX + L.toolW + L.observe.x) / 2
      ctx.beginPath()
      ctx.moveTo(cardX + L.toolW, cardCenter.y)
      ctx.bezierCurveTo(midX, cardCenter.y, midX, L.observe.y, L.observe.x - 20, L.observe.y)
      ctx.stroke()
      ctx.restore()
    }
  })

  // 관찰 노드.
  const observeA = clamp01((p - OBSERVE_START) / 0.08)
  if (observeA > 0.01) {
    const col = converge > 0.01 ? '#ffe7a8' : '#f4f4f5'
    ctx.save()
    ctx.globalAlpha = observeA
    nodeCircle(ctx, L.observe, 20, '관찰', observeActive, col, ts)
    ctx.restore()
    // 도구 카드 열 아래쪽 빈 공간에 배치해 Vector 카드와 겹치지 않게 하고,
    // 수렴이 시작되면(답 카드가 뜨기 전) 미리 페이드아웃한다.
    const observeTextA =
      clamp01((p - OBSERVE_START - 0.05) / 0.08) * (1 - clamp01((p - CONVERGE_START) / 0.06))
    chipLabel(
      ctx,
      OBSERVE_TEXT,
      (L.toolX + L.observe.x) / 2,
      L.toolY[2] + L.toolH + 16,
      '#34d17f',
      observeTextA,
      8.5,
    )
  }

  // 1회 반복: 관찰에서 계획으로 되돌아가는 호.
  const loopK = easeInOut(clamp01((p - LOOP_START) / (LOOP_END - LOOP_START)))
  if (loopK > 0.01 && p < CONVERGE_START + 0.04) {
    const apex = { x: (L.plan.x + L.observe.x) / 2, y: h * 0.12 }
    const bez = (t: number): Pt => {
      const u = 1 - t
      return {
        x: u * u * L.observe.x + 2 * u * t * apex.x + t * t * L.plan.x,
        y: u * u * L.observe.y + 2 * u * t * apex.y + t * t * L.plan.y,
      }
    }
    ctx.save()
    ctx.globalAlpha = 0.6 * (1 - clamp01((p - (LOOP_END + 0.06)) / 0.08))
    ctx.strokeStyle = '#ffe7a8'
    ctx.lineWidth = 1.4
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    const steps = 20
    ctx.moveTo(L.observe.x, L.observe.y)
    for (let i = 1; i <= steps; i++) {
      const pt = bez((i / steps) * loopK)
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    chipLabel(ctx, '1회 반복', apex.x, apex.y - 12, '#ffe7a8', clamp01((loopK - 0.2) / 0.6) * (1 - clamp01((p - (LOOP_END + 0.04)) / 0.08)), 9)
  }

  const stageIdx = p < TOOLS_START ? 0 : p < CONVERGE_START ? 1 : 2
  drawTopLabel(ctx, 'RAG 에이전트', '계획 · 도구 · 실행 · 관찰의 순환')
  drawCaption(ctx, h, CAPS[stageIdx])

  // 수렴 + 답 카드.
  const answerK = clamp01((p - ANSWER_START) / 0.1)
  if (answerK > 0.01) {
    ctx.save()
    ctx.globalAlpha = answerK
    // 도구 카드 열(x >= toolX)과 겹치지 않도록 좌측 하단에 폭을 제한해 배치한다.
    const cw = Math.min(L.toolX - 32, 340)
    const ch = 62
    const cx = 16
    const cy = h - ch - 26
    ctx.fillStyle = 'rgba(255,217,138,0.08)'
    roundRect(ctx, cx, cy, cw, ch, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,217,138,0.45)'
    ctx.lineWidth = 1
    roundRect(ctx, cx, cy, cw, ch, 10)
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#ffe7a8'
    ctx.font = `800 11px ${FONT}`
    ctx.fillText('적합 공고 18건 · React 중심 3곳 추천', cx + 12, cy + 22)
    ctx.fillStyle = 'rgba(230,230,234,0.86)'
    ctx.font = `500 9.5px ${FONT}`
    ctx.fillText('SQL · Vector · Graph 결과를 종합했습니다.', cx + 12, cy + 39)
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.font = `600 8.5px ${FONT}`
    ctx.fillText('근거 3건 인용 · 2회 순환', cx + 12, cy + 54)
    ctx.restore()
  }
}
