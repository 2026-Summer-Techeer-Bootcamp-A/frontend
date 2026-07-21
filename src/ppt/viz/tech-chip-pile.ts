// 기술 칩 낙하·적층: 3색 카테고리 기술 칩 16개가 순차적으로 떨어져
// 한 번 반동한 뒤 4단 더미로 안착한다. 모든 궤적은 고정 데이터로 계산한다.

import type { VizDef, VizRender } from '../types.ts'
import {
  FONT,
  clamp01,
  lerp,
  roundRect,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common.ts'

export type TechCategory = 'language' | 'platform' | 'infra'

export interface TechChipSpec {
  name: string
  icon: string
  category: TechCategory
  color: string
  row: 0 | 1 | 2 | 3
  finalOffsetX: number
  finalRotation: number
  driftX: number
}

export interface TechChipState extends TechChipSpec {
  visible: boolean
  settled: boolean
  alpha: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

const PERIOD_MS = 8000
const FIRST_DROP_MS = 400
const DROP_GAP_MS = 280
const DROP_DURATION_MS = 1200

const CATEGORY_COLORS: Record<TechCategory, string> = {
  language: '#6EA8FE',
  platform: '#34D17F',
  infra: '#E2933F',
}

const CHIP_STYLES: Record<TechCategory, { fill: string; border: string }> = {
  language: { fill: 'rgba(110,168,254,0.13)', border: 'rgba(110,168,254,0.68)' },
  platform: { fill: 'rgba(52,209,127,0.13)', border: 'rgba(52,209,127,0.68)' },
  infra: { fill: 'rgba(226,147,63,0.13)', border: 'rgba(226,147,63,0.68)' },
}

function chip(
  name: string,
  icon: string,
  category: TechCategory,
  row: 0 | 1 | 2 | 3,
  finalOffsetX: number,
  finalRotation: number,
  driftX: number,
): TechChipSpec {
  return { name, icon, category, color: CATEGORY_COLORS[category], row, finalOffsetX, finalRotation, driftX }
}

// 아래 행부터 위 행 순서로 그려 위쪽 칩이 자연스럽게 앞에 놓인다.
export const TECH_CHIPS: TechChipSpec[] = [
  chip('Java', 'J', 'language', 0, -260, -0.035, -55),
  chip('Spring', 'S', 'platform', 0, -130, 0.025, 45),
  chip('AWS', 'A', 'infra', 0, 0, -0.018, -35),
  chip('Docker', 'D', 'infra', 0, 130, 0.03, 60),
  chip('Python', 'P', 'language', 0, 260, -0.025, -50),
  chip('React', 'R', 'platform', 1, -220, 0.022, 40),
  chip('TypeScript', 'T', 'language', 1, -110, -0.02, -60),
  chip('Kafka', 'K', 'platform', 1, 0, 0.015, 35),
  chip('Kubernetes', 'K', 'infra', 1, 110, -0.025, -45),
  chip('Redis', 'R', 'platform', 1, 220, 0.03, 50),
  chip('Go', 'G', 'language', 2, -165, -0.02, -35),
  chip('MySQL', 'M', 'platform', 2, -55, 0.02, 45),
  chip('Git', 'G', 'infra', 2, 55, -0.018, -50),
  chip('Terraform', 'T', 'infra', 2, 165, 0.024, 40),
  chip('PostgreSQL', 'P', 'platform', 3, -60, -0.015, -30),
  chip('Linux', 'L', 'infra', 3, 60, 0.015, 30),
]

export function getTechChipPileStates(progress: number, width: number, height: number): TechChipState[] {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const chipHeight = 42 * scale
  const floorY = height * 0.82
  const rowGap = 37 * scale

  return TECH_CHIPS.map((tech, index) => {
    const startMs = FIRST_DROP_MS + index * DROP_GAP_MS
    const local = clamp01((timeMs - startMs) / DROP_DURATION_MS)
    const fall = clamp01(local / 0.78)
    const bounce = clamp01((local - 0.78) / 0.22)
    const targetX = width * 0.5 + tech.finalOffsetX * scale
    const targetY = floorY - chipHeight / 2 - tech.row * rowGap
    const startX = targetX + tech.driftX * scale
    const startY = -70 * scale
    const fallY = lerp(startY, targetY, fall * fall)
    const bounceLift = bounce > 0 && bounce < 1
      ? Math.sin(bounce * Math.PI) * 12 * scale * (1 - bounce * 0.35)
      : 0

    return {
      ...tech,
      visible: local > 0,
      settled: local >= 1,
      alpha: clamp01(local / 0.12),
      x: lerp(startX, targetX, fall),
      y: fallY - bounceLift,
      width: (52 + tech.name.length * 7.2) * scale,
      height: chipHeight,
      rotation: lerp(tech.finalRotation * -6, tech.finalRotation, fall) + Math.sin(bounce * Math.PI) * 0.04,
    }
  })
}

function drawTechChip(ctx: CanvasRenderingContext2D, state: TechChipState): void {
  if (!state.visible || state.alpha <= 0) return

  const scale = state.height / 42
  const style = CHIP_STYLES[state.category]

  ctx.save()
  ctx.translate(state.x, state.y)
  ctx.rotate(state.rotation)
  ctx.globalAlpha = state.alpha
  ctx.shadowColor = 'rgba(0,0,0,0.24)'
  ctx.shadowBlur = 10 * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = style.fill
  roundRect(ctx, -state.width / 2, -state.height / 2, state.width, state.height, state.height / 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  const iconX = -state.width / 2 + 21 * scale
  ctx.fillStyle = state.color
  ctx.beginPath()
  ctx.arc(iconX, 0, 12 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(state.icon, iconX, 0.5 * scale)

  ctx.fillStyle = '#F4F4F5'
  ctx.font = `600 ${14 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(state.name, iconX + 19 * scale, 0.5 * scale)
  ctx.restore()
}

export const renderTechChipPile: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  const scale = Math.min(width / 960, height / 540)
  const floorY = height * 0.82 + 27 * scale

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(width * 0.16, floorY)
  ctx.lineTo(width * 0.84, floorY)
  ctx.stroke()
  ctx.restore()

  getTechChipPileStates(progress, width, height).forEach((state) => drawTechChip(ctx, state))
  drawTopLabel(ctx, '문제 인식', '쏟아지는 기술')
  drawCaption(
    ctx,
    height,
    progress < 0.72 ? '기술들이 끊임없이 쏟아집니다' : '16개의 기술이 하나의 더미로 쌓였습니다',
  )
}

export const techChipPileViz: VizDef = {
  id: 'tech-chip-pile',
  title: '기술 칩 낙하',
  subtitle: '기술들이 떨어져 하나의 스택으로 쌓이다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderTechChipPile,
}
