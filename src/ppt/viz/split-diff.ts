// 적합도 원문인용 비교(Split Diff): 이력서 원문과 공고 원문을 좌우로 놓고,
// LLM이 문장 단위로 순차 대조하며 충족은 원문을 인용해 초록으로, 공백은
// 주황으로 판정한다. 실제 커리어 적합도 Split Diff 기능의 판정 메커니즘을
// 그대로 재현한다.

import type { VizRender } from '../types'
import { FONT, clamp01, roundRect, chipLabel, drawBackground, drawTopLabel, drawCaption, palette } from './common'

const RESUME = [
  'React·TypeScript로 3년간 프론트엔드 개발',
  'Node.js 기반 REST API 설계 및 배포 경험',
  'AWS EC2·S3 운영, Docker 컨테이너화',
  'PostgreSQL 스키마 설계와 쿼리 튜닝',
  '애자일 스크럼 팀에서 협업 리드',
]

interface Requirement {
  text: string
  matchIdx: number // RESUME의 인덱스, 공백이면 -1
}

const REQUIREMENTS: Requirement[] = [
  { text: 'React 활용 3년 이상', matchIdx: 0 },
  { text: 'TypeScript 기반 프론트엔드 경험', matchIdx: 0 },
  { text: 'Node.js API 설계 경험 우대', matchIdx: 1 },
  { text: 'AWS 인프라 운영 경험', matchIdx: 2 },
  { text: 'Docker 컨테이너 환경 이해', matchIdx: 2 },
  { text: 'RDB 스키마 설계 능력', matchIdx: 3 },
  { text: 'Kubernetes 운영 경험', matchIdx: -1 },
  { text: '대규모 트래픽 처리 경험', matchIdx: -1 },
]

const MATCHED_COUNT = REQUIREMENTS.filter((r) => r.matchIdx >= 0).length // 6
const GAP_COUNT = REQUIREMENTS.length - MATCHED_COUNT // 2

const CAPS = ['LLM이 이력서와 공고를 문장 단위로 대조합니다', '충족은 원문을 인용해 근거로, 공백은 갭으로 표시합니다']

const REVEAL_START = 0.08
const REVEAL_END = 0.74
const SUMMARY_START = 0.82

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string {
  ctx.save()
  ctx.font = font
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.restore()
    return text
  }
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1)
  }
  ctx.restore()
  return `${t}…`
}

function buildRects(w: number, h: number, count: number, side: 'left' | 'right', cardW: number): Rect[] {
  const y0 = h * 0.16
  const bandH = h * 0.48
  const gap = side === 'left' ? 11 : 6
  const cardH = (bandH - (count - 1) * gap) / count
  const x = side === 'left' ? w * 0.05 : w * 0.95 - cardW
  const rects: Rect[] = []
  for (let i = 0; i < count; i++) {
    rects.push({ x, y: y0 + i * (cardH + gap), w: cardW, h: cardH })
  }
  return rects
}

function drawResumeCard(ctx: CanvasRenderingContext2D, r: Rect, text: string, a: number): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  roundRect(ctx, r.x, r.y, r.w, r.h, 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'
  ctx.lineWidth = 1
  roundRect(ctx, r.x, r.y, r.w, r.h, 7)
  ctx.stroke()
  ctx.fillStyle = palette.good
  ctx.font = `700 11px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('“', r.x + 6, r.y + r.h / 2)
  const font = `500 10px ${FONT}`
  const fitted = fitText(ctx, text, r.w - 26, font)
  ctx.fillStyle = 'rgba(230,230,234,0.92)'
  ctx.font = font
  ctx.fillText(fitted, r.x + 15, r.y + r.h / 2 + 0.5)
  ctx.restore()
}

type ReqState = 'pending' | 'good' | 'warn'

function drawReqCard(ctx: CanvasRenderingContext2D, r: Rect, text: string, state: ReqState, a: number): void {
  if (a <= 0.01) return
  let bd = 'rgba(255,255,255,0.14)'
  let bg = 'rgba(255,255,255,0.03)'
  let iconCol = 'rgba(154,154,162,0.5)'
  if (state === 'good') {
    bd = 'rgba(52,209,127,0.55)'
    bg = palette.goodBg
    iconCol = palette.good
  } else if (state === 'warn') {
    bd = 'rgba(226,147,63,0.55)'
    bg = palette.warnBg
    iconCol = palette.warn
  }
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = bg
  roundRect(ctx, r.x, r.y, r.w, r.h, 7)
  ctx.fill()
  ctx.strokeStyle = bd
  ctx.lineWidth = 1
  roundRect(ctx, r.x, r.y, r.w, r.h, 7)
  ctx.stroke()

  // 상태 아이콘: 원 안에 체크(선분 두 개) 또는 갭(가로선 하나). 이모지 대신 직접 그린다.
  const icx = r.x + 11
  const icy = r.y + r.h / 2
  const irad = Math.min(6, r.h * 0.28)
  ctx.strokeStyle = iconCol
  ctx.fillStyle = 'transparent'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.arc(icx, icy, irad, 0, Math.PI * 2)
  ctx.stroke()
  if (state === 'good') {
    ctx.beginPath()
    ctx.moveTo(icx - irad * 0.5, icy)
    ctx.lineTo(icx - irad * 0.1, icy + irad * 0.4)
    ctx.lineTo(icx + irad * 0.55, icy - irad * 0.45)
    ctx.stroke()
  } else if (state === 'warn') {
    ctx.beginPath()
    ctx.moveTo(icx - irad * 0.5, icy)
    ctx.lineTo(icx + irad * 0.5, icy)
    ctx.stroke()
  }

  const font = `500 9.5px ${FONT}`
  const fitted = fitText(ctx, text, r.w - 26, font)
  ctx.fillStyle = state === 'pending' ? 'rgba(200,200,206,0.6)' : 'rgba(240,240,242,0.95)'
  ctx.font = font
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(fitted, icx + irad + 7, r.y + r.h / 2 + 0.5)
  ctx.restore()
}

export const renderSplitDiff: VizRender = (ctx, w, h, p, _ts) => {
  drawBackground(ctx, w, h)

  const leftW = w * 0.32
  const rightW = w * 0.34
  const leftRects = buildRects(w, h, RESUME.length, 'left', leftW)
  const rightRects = buildRects(w, h, REQUIREMENTS.length, 'right', rightW)

  // 컬럼 라벨.
  const colA = clamp01(p / 0.06)
  if (colA > 0.01) {
    ctx.save()
    ctx.globalAlpha = colA
    ctx.font = `700 9.5px ${FONT}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(154,154,162,0.85)'
    ctx.textAlign = 'left'
    ctx.fillText('이력서 원문', leftRects[0].x, leftRects[0].y - 8)
    ctx.textAlign = 'right'
    ctx.fillText('공고 요구', rightRects[0].x + rightW, rightRects[0].y - 8)
    ctx.restore()
  }

  RESUME.forEach((text, i) => drawResumeCard(ctx, leftRects[i], text, colA))

  const n = REQUIREMENTS.length
  const step = (REVEAL_END - REVEAL_START) / n
  REQUIREMENTS.forEach((req, i) => {
    const itemStart = REVEAL_START + i * step
    const cardA = clamp01((p - itemStart) / (step * 0.7))
    if (cardA <= 0.01) return
    const judged = clamp01((p - itemStart - step * 0.3) / (step * 0.5)) > 0.5
    const state: ReqState = !judged ? 'pending' : req.matchIdx >= 0 ? 'good' : 'warn'
    drawReqCard(ctx, rightRects[i], req.text, state, cardA)

    if (judged && req.matchIdx >= 0) {
      const a = leftRects[req.matchIdx]
      const b = rightRects[i]
      const x1 = a.x + a.w
      const y1 = a.y + a.h / 2
      const x2 = b.x
      const y2 = b.y + b.h / 2
      const mx = (x1 + x2) / 2
      const lineA = clamp01((p - itemStart - step * 0.35) / (step * 0.5))
      ctx.save()
      ctx.globalAlpha = lineA
      ctx.strokeStyle = 'rgba(52,209,127,0.5)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2)
      ctx.stroke()
      ctx.restore()
    }

    // 판정 순간의 짧은 배지: 다음 항목이 시작하기 전에 사라져 겹치지 않는다.
    const badgeA = clamp01((p - itemStart - step * 0.4) / (step * 0.35)) * (1 - clamp01((p - itemStart - step * 0.95) / (step * 0.35)))
    if (badgeA > 0.01) {
      const b = rightRects[i]
      const bx = req.matchIdx >= 0 ? (leftRects[req.matchIdx].x + leftRects[req.matchIdx].w + b.x) / 2 : b.x - 46
      const by = b.y + b.h / 2
      const label = req.matchIdx >= 0 ? '충족 · 이력서 인용' : '공백 · 대응 없음'
      const col = req.matchIdx >= 0 ? palette.good : palette.warn
      chipLabel(ctx, label, bx, by, col, badgeA, 8.5)
    }
  })

  const summaryA = clamp01((p - SUMMARY_START) / 0.1)
  if (summaryA > 0.01) {
    ctx.save()
    ctx.globalAlpha = summaryA
    ctx.font = `700 12px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = palette.ink
    ctx.fillText(
      `충족 ${MATCHED_COUNT} · 공백 ${GAP_COUNT} · 근거 원문 인용`,
      w / 2,
      h - 32,
    )
    ctx.restore()
  }

  const stageIdx = p < 0.42 ? 0 : 1
  drawTopLabel(ctx, 'Split Diff', '이력서 × 공고 원문 대조')
  drawCaption(ctx, h, CAPS[stageIdx])
}
