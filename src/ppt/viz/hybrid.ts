// 하이브리드 검색: LLM 에이전트가 SQL · Graph · Vector 중 도구를 고르는 과정.
// gallery의 c-hybrid IIFE를 순수 함수로 이식했다.

import type { VizRender } from '../types'
import { FONT, clamp01, easeInOut, roundRect, star, chipLabel, drawBackground, drawTopLabel, drawCaption } from './common'

interface ToolDef {
  k: string
  sub: string
  col: string
  pick: 0 | 1
}

const TOOLS: ToolDef[] = [
  { k: 'SQL', sub: '정형 필터', col: '#6ea8fe', pick: 0 },
  { k: 'Graph', sub: '관계 탐색', col: '#e2933f', pick: 1 },
  { k: 'Vector', sub: '의미 검색', col: '#34d17f', pick: 1 },
]

const CAPS = [
  '질문이 에이전트에 도착합니다',
  '에이전트가 도구를 판단합니다',
  '필요한 도구만 선택합니다',
  '실행 결과로 답을 구성합니다',
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function layout(w: number, h: number): { Q: { x: number; y: number }; A: { x: number; y: number }; tpos: Rect[] } {
  const Q = { x: w * 0.13, y: h * 0.5 }
  const A = { x: w * 0.42, y: h * 0.5 }
  const tpos: Rect[] = TOOLS.map((_t, i) => ({
    x: w * 0.72,
    y: h * (0.26 + i * 0.24),
    w: w * 0.24,
    h: h * 0.17,
  }))
  return { Q, A, tpos }
}

function toolCard(ctx: CanvasRenderingContext2D, t: ToolDef, tp: Rect, state: number, ts: number): void {
  const on = state >= 2 && t.pick === 1
  const considering = state === 1
  let bd = 'rgba(255,255,255,0.12)'
  let bg = 'rgba(255,255,255,0.03)'
  let tc = 'rgba(154,154,162,0.9)'
  if (on) {
    bd = t.col
    bg = 'rgba(255,255,255,0.06)'
    tc = t.col
  } else if (considering) {
    bd = 'rgba(255,255,255,0.28)'
  } else if (state >= 2 && t.pick === 0) {
    bg = 'rgba(255,255,255,0.015)'
    tc = 'rgba(154,154,162,0.4)'
    bd = 'rgba(255,255,255,0.06)'
  }

  ctx.save()
  if (state === 3 && t.pick === 1) {
    const pulse = 0.4 + 0.3 * Math.sin(ts / 240)
    ctx.shadowColor = t.col
    ctx.shadowBlur = 14 * pulse
  }
  ctx.fillStyle = bg
  roundRect(ctx, tp.x, tp.y, tp.w, tp.h, 10)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = bd
  ctx.lineWidth = on ? 1.6 : 1
  roundRect(ctx, tp.x, tp.y, tp.w, tp.h, 10)
  ctx.stroke()

  ctx.fillStyle = on ? t.col : 'rgba(255,255,255,0.25)'
  ctx.beginPath()
  ctx.arc(tp.x + 16, tp.y + tp.h / 2, 3.5, 0, Math.PI * 2)
  ctx.fill()

  // 도구명 · 설명 두 줄과 "선택" 뱃지가 카드 안에서 같은 기준선(textBaseline
  // 'middle')을 쓰도록 정밀하게 맞춘다: 두 줄의 중심(centerY)이 카드/아이콘/뱃지의
  // 수직 중심(tp.y + tp.h / 2)과 일치하도록 대칭 오프셋(±7)을 적용한다.
  const centerY = tp.y + tp.h / 2
  const lineOffset = 7

  ctx.fillStyle = tc
  ctx.font = `700 12px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(t.k, tp.x + 28, centerY - lineOffset)

  ctx.fillStyle = on ? 'rgba(255,255,255,0.7)' : 'rgba(154,154,162,0.6)'
  ctx.font = `500 9px ${FONT}`
  ctx.fillText(t.sub, tp.x + 28, centerY + lineOffset)

  if (on && state >= 2) {
    ctx.fillStyle = t.col
    ctx.font = `800 10px ${FONT}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('선택', tp.x + tp.w - 10, centerY)
  }
  ctx.restore()
}

function pillWidth(ctx: CanvasRenderingContext2D, text: string, fs = 10): number {
  ctx.save()
  ctx.font = `600 ${fs}px ${FONT}`
  const tw = ctx.measureText(text).width
  ctx.restore()
  return tw + 14
}

// 마지막 단계에서 실제 사람이 읽는 구조화 답변 카드를 그린다.
// 도구 카드 열(x >= w*0.72)과 겹치지 않도록 카드 폭을 제한하고, 에이전트
// 노드(A) 아래로 충분히 내려서 배치한다.
function drawAnswerCard(ctx: CanvasRenderingContext2D, w: number, h: number, k: number): void {
  if (k <= 0.01) return
  const cx = 16
  const cw = w * 0.68 - 16
  const cyTop = h * 0.62
  const cyBottom = h - 26
  const ch = cyBottom - cyTop
  const pad = 14

  ctx.save()
  ctx.globalAlpha = k
  ctx.fillStyle = 'rgba(52,209,127,0.07)'
  roundRect(ctx, cx, cyTop, cw, ch, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(52,209,127,0.35)'
  ctx.lineWidth = 1
  roundRect(ctx, cx, cyTop, cw, ch, 12)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#34d17f'
  ctx.font = `800 12.5px ${FONT}`
  ctx.fillText('적합 공고 3곳을 찾았습니다', cx + pad, cyTop + 22)

  ctx.fillStyle = 'rgba(230,230,234,0.9)'
  ctx.font = `500 10px ${FONT}`
  ctx.fillText('React 3년 경력이 핵심 매칭입니다.', cx + pad, cyTop + 46)
  ctx.fillText('백엔드 협업 경험도 가점입니다.', cx + pad, cyTop + 64)

  const chip1Text = '관계: React → 상태관리'
  const chip2Text = '유사도 0.89'
  const chip1W = pillWidth(ctx, chip1Text)
  const chip2W = pillWidth(ctx, chip2Text)
  const chipY = cyTop + 92
  const chip1CenterX = cx + pad + chip1W / 2
  const chip2CenterX = cx + pad + chip1W + 8 + chip2W / 2
  chipLabel(ctx, chip1Text, chip1CenterX, chipY, '#9cc2ff', k, 10)
  chipLabel(ctx, chip2Text, chip2CenterX, chipY, '#34d17f', k, 10)

  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(154,154,162,0.85)'
  ctx.font = `600 9px ${FONT}`
  ctx.fillText('tools: Graph, Vector', cx + cw - pad, cyBottom - 14)
  ctx.restore()
}

export const renderHybrid: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const { Q, A, tpos } = layout(w, h)
  const state = p < 0.24 ? 0 : p < 0.4 ? 1 : p < 0.58 ? 2 : p < 0.78 ? 3 : 4

  ctx.save()
  const qw = 94
  const qh = 28
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  roundRect(ctx, Q.x - qw / 2, Q.y - qh / 2, qw, qh, 9)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  roundRect(ctx, Q.x - qw / 2, Q.y - qh / 2, qw, qh, 9)
  ctx.stroke()
  ctx.fillStyle = 'rgba(244,244,245,0.95)'
  ctx.font = `600 11px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('질문', Q.x, Q.y)
  ctx.restore()

  if (p < 0.24) {
    const k = easeInOut(clamp01(p / 0.22))
    const dx = Q.x + 50 + (A.x - 24 - (Q.x + 50)) * k
    star(ctx, dx, Q.y, 2.4, 0.9, '#ffffff', 0.4)
  }

  const think = state === 1 ? 0.5 + 0.5 * Math.sin(ts / 200) : 0
  const ar = 24 + think * 2
  ctx.save()
  const gl = ctx.createRadialGradient(A.x, A.y, 0, A.x, A.y, ar * 2)
  gl.addColorStop(0, 'rgba(255,255,255,0.18)')
  gl.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gl
  ctx.beginPath()
  ctx.arc(A.x, A.y, ar * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(A.x, A.y, ar, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = state >= 2 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(A.x, A.y, ar, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(244,244,245,0.95)'
  ctx.font = `800 11px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('LLM', A.x, A.y - 4)
  ctx.fillStyle = 'rgba(154,154,162,0.9)'
  ctx.font = `600 8px ${FONT}`
  ctx.fillText('에이전트', A.x, A.y + 8)
  ctx.restore()

  tpos.forEach((tp, i) => {
    const t = TOOLS[i]
    const midX = (A.x + tp.x) / 2
    const ty = tp.y + tp.h / 2
    if (state === 1) {
      ctx.save()
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(ts / 200 + i)
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(A.x + 24, A.y)
      ctx.bezierCurveTo(midX, A.y, midX, ty, tp.x, ty)
      ctx.stroke()
      ctx.restore()
    } else if (state >= 2 && t.pick === 1) {
      ctx.save()
      ctx.strokeStyle = t.col
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(A.x + 24, A.y)
      ctx.bezierCurveTo(midX, A.y, midX, ty, tp.x, ty)
      ctx.stroke()
      if (state === 3) {
        const bt = (ts / 900 + i) % 1
        const fx = tp.x + (A.x + 24 - tp.x) * bt
        const fy = ty + (A.y - ty) * bt
        ctx.globalAlpha = 0.95
        ctx.fillStyle = t.col
        ctx.beginPath()
        ctx.arc(fx, fy, 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (state === 2) {
        const ft = (ts / 700) % 1
        const fx = A.x + 24 + (tp.x - (A.x + 24)) * ft
        const fy = A.y + (ty - A.y) * ft
        ctx.globalAlpha = 0.9
        ctx.fillStyle = t.col
        ctx.beginPath()
        ctx.arc(fx, fy, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    toolCard(ctx, t, tp, state, ts)
  })

  if (state === 1) {
    chipLabel(ctx, '도구 판단 중', A.x, A.y - ar * 2 - 2, 'rgba(244,244,245,0.9)', clamp01((p - 0.24) / 0.06), 9)
  }
  if (state >= 2 && p < 0.78) {
    // 답변 카드가 등장하기 전(state 4, p>=0.78)에 완전히 사라지도록 페이드아웃을
    // 앞당겨, 카드 하단 테두리/캡션 행과 겹치는 구간이 생기지 않게 한다.
    chipLabel(
      ctx,
      'Graph + Vector 선택',
      A.x,
      h - 18,
      '#f4f4f5',
      clamp01((p - 0.4) / 0.06) * clamp01((0.78 - p) / 0.04),
      9,
    )
  }

  if (state === 4) {
    const k = clamp01((p - 0.78) / 0.16)
    drawAnswerCard(ctx, w, h, k)
  }

  drawTopLabel(ctx, '하이브리드 검색', '에이전틱 도구 선택')
  drawCaption(ctx, h, CAPS[Math.min(state, 3)])
}
