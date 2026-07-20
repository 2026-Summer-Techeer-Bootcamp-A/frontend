// 매칭률: 이력서 × 공고 적합도.
// gallery의 s-match(DOM+SVG)를 canvas 순수 함수로 변환했다. 칩·연결선·적합도 링을
// 전부 canvas에 그린다.

import type { VizRender } from '../types'
import { FONT, clamp01, roundRect, drawBackground, drawTopLabel, drawCaption, palette } from './common'

const LEFT = ['Java', 'Spring', 'AWS', 'React', 'Docker']
const RIGHT = ['Java', 'Spring', 'Kotlin', 'React', 'Kafka']
const MATCH_IDX = [0, 1, 3]
const WARN_IDX = [2, 4]

const CAPS = ['기술을 맞대어 봅니다', '일치하는 기술을 잇습니다', '적합도 87%']

const CHIP_FONT = `600 11px ${FONT}`
const CHIP_H = 26
const ICON = 16
const GAP_ROW = 10
const PAD_L = 7
const PAD_R = 10
const GAP_ICON_TEXT = 6

type ChipState = 'default' | 'good' | 'warn'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function measureChipWidth(ctx: CanvasRenderingContext2D, text: string): number {
  ctx.save()
  ctx.font = CHIP_FONT
  const tw = ctx.measureText(text).width
  ctx.restore()
  return PAD_L + ICON + GAP_ICON_TEXT + tw + PAD_R
}

function buildRects(ctx: CanvasRenderingContext2D, w: number, h: number, list: string[], side: 'left' | 'right'): Rect[] {
  const y0 = h * 0.24
  const rects: Rect[] = []
  let y = y0
  for (let i = 0; i < list.length; i++) {
    const cw = measureChipWidth(ctx, list[i])
    const x = side === 'left' ? w * 0.07 : w * 0.93 - cw
    rects.push({ x, y, w: cw, h: CHIP_H })
    y += CHIP_H + GAP_ROW
  }
  return rects
}

function drawChip(ctx: CanvasRenderingContext2D, rect: Rect, text: string, side: 'left' | 'right', state: ChipState): void {
  let bg: string = palette.chipBg
  let bd: string = palette.chipBd
  let iconBg = 'rgba(255,255,255,0.13)'
  let iconFg = '#ffffff'
  const textCol: string = palette.ink
  if (state === 'good') {
    bg = palette.goodBg
    bd = 'rgba(52,209,127,0.5)'
    iconBg = palette.good
    iconFg = '#06210f'
  } else if (state === 'warn') {
    bg = palette.warnBg
    bd = 'rgba(226,147,63,0.5)'
    iconBg = palette.warn
    iconFg = '#2a1704'
  }

  ctx.save()
  ctx.fillStyle = bg
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2)
  ctx.fill()
  ctx.strokeStyle = bd
  ctx.lineWidth = 1
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2)
  ctx.stroke()

  const iconY = rect.y + rect.h / 2 - ICON / 2
  const iconX = side === 'left' ? rect.x + PAD_L : rect.x + rect.w - PAD_R - ICON
  ctx.fillStyle = iconBg
  roundRect(ctx, iconX, iconY, ICON, ICON, 5)
  ctx.fill()
  ctx.fillStyle = iconFg
  ctx.font = `800 9px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text[0], iconX + ICON / 2, iconY + ICON / 2 + 0.5)

  ctx.fillStyle = textCol
  ctx.font = CHIP_FONT
  ctx.textAlign = side === 'left' ? 'left' : 'right'
  const textX = side === 'left' ? iconX + ICON + GAP_ICON_TEXT : iconX - GAP_ICON_TEXT
  ctx.fillText(text, textX, rect.y + rect.h / 2 + 0.5)
  ctx.restore()
}

function drawRing(ctx: CanvasRenderingContext2D, w: number, h: number, pct: number): void {
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.155
  const sw = Math.max(5, r * 0.19)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = sw
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  if (pct > 0) {
    ctx.strokeStyle = palette.good
    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = palette.ink
  ctx.font = `800 ${Math.round(r * 0.62)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${pct}%`, cx, cy - r * 0.06)
  ctx.fillStyle = palette.muted
  ctx.font = `600 ${Math.round(r * 0.27)}px ${FONT}`
  ctx.fillText('적합도', cx, cy + r * 0.62)
  ctx.restore()
}

function chipState(index: number, p: number): ChipState {
  if (p <= 0.32) return 'default'
  const k = (p - 0.32) / 0.45
  const mi = MATCH_IDX.indexOf(index)
  if (mi >= 0) {
    return k > mi / MATCH_IDX.length ? 'good' : 'default'
  }
  if (WARN_IDX.includes(index)) return 'warn'
  return 'default'
}

export const renderMatch: VizRender = (ctx, w, h, p, _ts) => {
  drawBackground(ctx, w, h)
  const leftRects = buildRects(ctx, w, h, LEFT, 'left')
  const rightRects = buildRects(ctx, w, h, RIGHT, 'right')

  const chipsVisible = p > 0.08
  if (chipsVisible) {
    for (let i = 0; i < LEFT.length; i++) {
      drawChip(ctx, leftRects[i], LEFT[i], 'left', chipState(i, p))
    }
    for (let i = 0; i < RIGHT.length; i++) {
      drawChip(ctx, rightRects[i], RIGHT[i], 'right', chipState(i, p))
    }
  }

  if (p > 0.32) {
    const k = clamp01((p - 0.32) / 0.45)
    MATCH_IDX.forEach((mi, j) => {
      if (k < ((j + 1) / MATCH_IDX.length) * 0.9) return
      const a = leftRects[mi]
      const b = rightRects[mi]
      const x1 = a.x + a.w
      const y1 = a.y + a.h / 2
      const x2 = b.x
      const y2 = b.y + b.h / 2
      const mx = (x1 + x2) / 2
      ctx.save()
      ctx.strokeStyle = 'rgba(52,209,127,0.55)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2)
      ctx.stroke()
      ctx.restore()
    })
  }

  const val = p < 0.4 ? 0 : Math.min(87, Math.round(((p - 0.4) / 0.4) * 87))
  drawRing(ctx, w, h, val)

  const ci = p < 0.35 ? 0 : p < 0.7 ? 1 : 2
  drawTopLabel(ctx, '매칭률', '이력서 × 공고')
  drawCaption(ctx, h, CAPS[ci])
}
