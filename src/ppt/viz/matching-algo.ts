// 매칭 알고리즘 가중치: 적합도 87%가 어떻게 계산되는지 보여준다.
// 보유 스킬과 공고 요구 스킬의 교집합을 찾고, 스킬별 수요 가중치를 곱해
// 가중합으로 적합도를 낸다. match.ts의 칩 언어를 재사용하되, 계산 과정
// 자체(가중치 숫자 · 누적 수식 · 진행 막대)를 화면에 노출한다는 점이 다르다.

import type { VizRender } from '../types'
import { FONT, clamp01, easeOut, roundRect, chipLabel, drawBackground, drawTopLabel, drawCaption, palette } from './common'

const MY_SKILLS = ['Java', 'Spring', 'React', 'AWS', 'Docker']
const JOB_SKILLS = ['Java', 'Spring', 'React', 'AWS', 'Docker', 'Kubernetes', 'Kafka']
// 매칭된 5개 스킬의 수요 가중치(예시치, JOB_SKILLS와 같은 순서로 대응).
const MATCH_WEIGHTS = [0.9, 0.75, 0.8, 0.65, 0.58]
// 공백인 2개 요구 스킬의 수요 가중치(예시치). 가중합에는 들어가지 못한다.
const GAP_WEIGHTS = [0.3, 0.25]
const MATCHED_SUM = MATCH_WEIGHTS.reduce((a, b) => a + b, 0) // 3.68
const TOTAL_SUM = MATCHED_SUM + GAP_WEIGHTS.reduce((a, b) => a + b, 0) // 4.23
const FIT_PCT = Math.round((MATCHED_SUM / TOTAL_SUM) * 100) // 87

const CAPS = ['보유와 요구의 교집합을 찾습니다', '스킬별 수요 가중치를 곱합니다', '가중합으로 적합도를 냅니다']

const CHIP_FONT_L = `600 11px ${FONT}`
const CHIP_FONT_R = `600 10px ${FONT}`
const CHIP_H_L = 27
const CHIP_H_R = 20
const ICON_L = 16
const ICON_R = 13
const GAP_L = 12
const GAP_R = 7
const PAD_L = 7
const PAD_R = 9
const GAP_ICON_TEXT = 5

// 애니메이션 타이밍 창.
const CHIPS_IN_END = 0.1
const LINE_START = 0.1
const LINE_END = 0.3
const BADGE_START = 0.3
const BADGE_END = 0.54
const BAR_START = 0.54
const BAR_FILL_END = 0.78
const PCT_START = 0.76
const SUMMARY_START = 0.86

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function measureChipWidth(ctx: CanvasRenderingContext2D, text: string, font: string, icon: number): number {
  ctx.save()
  ctx.font = font
  const tw = ctx.measureText(text).width
  ctx.restore()
  return PAD_L + icon + GAP_ICON_TEXT + tw + PAD_R
}

function buildRects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  list: string[],
  side: 'left' | 'right',
  chipH: number,
  gap: number,
  font: string,
  icon: number,
): Rect[] {
  const y0 = h * 0.16
  const rects: Rect[] = []
  let y = y0
  for (let i = 0; i < list.length; i++) {
    const cw = measureChipWidth(ctx, list[i], font, icon)
    const x = side === 'left' ? w * 0.06 : w * 0.94 - cw
    rects.push({ x, y, w: cw, h: chipH })
    y += chipH + gap
  }
  return rects
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  text: string,
  side: 'left' | 'right',
  state: 'default' | 'good' | 'warn',
  font: string,
  icon: number,
  a: number,
): void {
  if (a <= 0.01) return
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
  ctx.globalAlpha = a
  ctx.fillStyle = bg
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2)
  ctx.fill()
  ctx.strokeStyle = bd
  ctx.lineWidth = 1
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2)
  ctx.stroke()

  const iconY = rect.y + rect.h / 2 - icon / 2
  const iconX = side === 'left' ? rect.x + PAD_L : rect.x + rect.w - PAD_R - icon
  ctx.fillStyle = iconBg
  roundRect(ctx, iconX, iconY, icon, icon, 4)
  ctx.fill()
  ctx.fillStyle = iconFg
  ctx.font = `800 ${Math.round(icon * 0.55)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text[0], iconX + icon / 2, iconY + icon / 2 + 0.5)

  ctx.fillStyle = textCol
  ctx.font = font
  ctx.textAlign = side === 'left' ? 'left' : 'right'
  const textX = side === 'left' ? iconX + icon + GAP_ICON_TEXT : iconX - GAP_ICON_TEXT
  ctx.fillText(text, textX, rect.y + rect.h / 2 + 0.5)
  ctx.restore()
}

export const renderMatchingAlgo: VizRender = (ctx, w, h, p, _ts) => {
  drawBackground(ctx, w, h)

  const leftRects = buildRects(ctx, w, h, MY_SKILLS, 'left', CHIP_H_L, GAP_L, CHIP_FONT_L, ICON_L)
  const rightRects = buildRects(ctx, w, h, JOB_SKILLS, 'right', CHIP_H_R, GAP_R, CHIP_FONT_R, ICON_R)

  const chipsA = clamp01(p / CHIPS_IN_END)
  if (chipsA > 0.01) {
    MY_SKILLS.forEach((s, i) => drawChip(ctx, leftRects[i], s, 'left', 'default', CHIP_FONT_L, ICON_L, chipsA))
    JOB_SKILLS.forEach((s, i) => {
      const isGap = i >= 5
      const state: 'default' | 'warn' = isGap && p > 0.18 ? 'warn' : 'default'
      drawChip(ctx, rightRects[i], s, 'right', state, CHIP_FONT_R, ICON_R, chipsA)
    })
  }

  // 공백 라벨: 미보유 요구 스킬 옆에 작게 표시.
  GAP_WEIGHTS.forEach((_wgt, gi) => {
    const idx = 5 + gi
    const a = clamp01((p - (BADGE_START + gi * 0.06)) / 0.1)
    if (a <= 0.01) return
    const r = rightRects[idx]
    chipLabel(ctx, '공백', r.x - 32, r.y + r.h / 2, palette.warn, a, 8.5)
  })

  // 매칭 연결선: 교집합을 초록 선으로 잇는다(LINE_START~LINE_END, 순차 등장).
  const n = MATCH_WEIGHTS.length
  for (let i = 0; i < n; i++) {
    const kLine = clamp01((p - LINE_START - (i * (LINE_END - LINE_START)) / n) / ((LINE_END - LINE_START) / n))
    if (kLine <= 0.01) continue
    const a = leftRects[i]
    const b = rightRects[i]
    const x1 = a.x + a.w
    const y1 = a.y + a.h / 2
    const x2 = b.x
    const y2 = b.y + b.h / 2
    const mx = (x1 + x2) / 2
    ctx.save()
    ctx.globalAlpha = kLine
    ctx.strokeStyle = 'rgba(52,209,127,0.55)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2)
    ctx.stroke()
    ctx.restore()

    // 가중치 배지: 연결선이 다 그려진 뒤 순차로 붙는다(BADGE_START~BADGE_END).
    const kBadge = clamp01((p - BADGE_START - (i * (BADGE_END - BADGE_START)) / n) / ((BADGE_END - BADGE_START) / n))
    if (kBadge > 0.01) {
      const midY = (y1 + y2) / 2
      chipLabel(ctx, MATCH_WEIGHTS[i].toFixed(2), mx, midY, palette.good, kBadge, 9.5)
    }
  }

  // 우측 칩이 좌측보다 아래로 더 내려가므로(7개 vs 5개), 계산 영역은 그 아래에서 시작.
  const calcTop = h * 0.68

  // 누적 수식: 가중치가 하나씩 더해지며 문자열이 자란다.
  const barA = clamp01((p - BAR_START) / 0.06)
  if (barA > 0.01) {
    let terms = ''
    for (let i = 0; i < n; i++) {
      const kBadge = clamp01((p - BADGE_START - (i * (BADGE_END - BADGE_START)) / n) / ((BADGE_END - BADGE_START) / n))
      if (kBadge < 0.5) break
      terms += (terms ? ' + ' : '') + MATCH_WEIGHTS[i].toFixed(2)
    }
    if (p > BAR_START + 0.02) {
      terms += ` = ${MATCHED_SUM.toFixed(2)}`
    }
    if (p > BAR_START + 0.08) {
      terms += ` / ${TOTAL_SUM.toFixed(2)}`
    }
    ctx.save()
    ctx.globalAlpha = barA
    ctx.font = `600 11px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(230,230,234,0.92)'
    ctx.fillText(terms, w / 2, calcTop - 8)
    ctx.restore()
  }

  // 가중합 진행 막대: 초록으로 채워지는 부분이 매칭 비중, 옅은 주황 트랙이 공백 비중.
  const barX = w * 0.06
  const barW = w * 0.88
  const barY = calcTop + 8
  const barH = Math.max(14, h * 0.065)
  if (barA > 0.01) {
    ctx.save()
    ctx.globalAlpha = barA
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, barX, barY, barW, barH, barH / 2)
    ctx.fill()
    ctx.fillStyle = palette.warnBg
    roundRect(ctx, barX + barW * (FIT_PCT / 100), barY, barW * (1 - FIT_PCT / 100), barH, barH / 2)
    ctx.fill()
    ctx.restore()

    const fillK = easeOut(clamp01((p - BAR_START) / (BAR_FILL_END - BAR_START)))
    const fillW = barW * (FIT_PCT / 100) * fillK
    if (fillW > 1) {
      ctx.save()
      ctx.globalAlpha = barA
      ctx.fillStyle = palette.good
      roundRect(ctx, barX, barY, fillW, barH, barH / 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // 롤업 퍼센트: 막대가 다 채워질 즈음 큼직하게 등장.
  const pctA = clamp01((p - PCT_START) / 0.12)
  if (pctA > 0.01) {
    ctx.save()
    ctx.globalAlpha = pctA
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = palette.good
    ctx.font = `800 ${Math.round(h * 0.075)}px ${FONT}`
    ctx.fillText(`적합도 ${FIT_PCT}%`, w / 2, barY + barH + Math.round(h * 0.075) + 6)
    ctx.restore()
  }

  // 요약 라인.
  const summaryA = clamp01((p - SUMMARY_START) / 0.1)
  if (summaryA > 0.01) {
    ctx.save()
    ctx.globalAlpha = summaryA
    ctx.font = `600 10.5px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.fillText(`매칭 5/7 · 가중 반영 · 적합 ${FIT_PCT}%`, w / 2, h - 30)
    ctx.restore()
  }

  const stageIdx = p < LINE_END ? 0 : p < BAR_START ? 1 : 2
  drawTopLabel(ctx, '매칭 알고리즘', '가중치로 적합도를 계산하다')
  drawCaption(ctx, h, CAPS[stageIdx])
}
