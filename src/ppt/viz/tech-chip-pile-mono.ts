// 기술 칩 낙하·적층 화이트 모노: 기존 고정 궤적을 재사용하고
// 화이트 스테이지 위에 흰색·회색·짙은 회색 칩을 그린다.

import type { VizDef, VizRender } from '../types.ts'
import {
  FONT,
  roundRect,
} from './common.ts'
import { getTechChipPileStates } from './tech-chip-pile.ts'

export type MonoTone = 'light' | 'mid' | 'dark'

export interface MonoChipStyle {
  tone: MonoTone
  fill: string
  border: string
  iconFill: string
  iconText: string
  text: string
}

export const WHITE_MONO_STAGE_COLOR = '#F7F7F5'

const STYLE_BY_TONE: Record<MonoTone, Omit<MonoChipStyle, 'tone'>> = {
  light: {
    fill: '#F4F4F5',
    border: '#CFCFD3',
    iconFill: '#18181B',
    iconText: '#FFFFFF',
    text: '#18181B',
  },
  mid: {
    fill: '#929296',
    border: '#C7C7CA',
    iconFill: '#2A2A2D',
    iconText: '#F7F7F8',
    text: '#111113',
  },
  dark: {
    fill: '#202124',
    border: '#A1A1A6',
    iconFill: '#E4E4E7',
    iconText: '#18181B',
    text: '#F7F7F8',
  },
}

const TONES: MonoTone[] = [
  'light', 'dark', 'mid', 'light', 'mid', 'dark', 'mid', 'light',
  'dark', 'mid', 'light', 'dark', 'mid', 'light', 'dark', 'mid',
]

export const MONO_CHIP_STYLES: MonoChipStyle[] = TONES.map((tone) => ({
  ...STYLE_BY_TONE[tone],
  tone,
}))

function drawMonoTechChip(
  ctx: CanvasRenderingContext2D,
  state: ReturnType<typeof getTechChipPileStates>[number],
  style: MonoChipStyle,
): void {
  if (!state.visible || state.alpha <= 0) return

  const scale = state.height / 42

  ctx.save()
  ctx.translate(state.x, state.y)
  ctx.rotate(state.rotation)
  ctx.globalAlpha = state.alpha
  ctx.shadowColor = 'rgba(0,0,0,0.32)'
  ctx.shadowBlur = 11 * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = style.fill
  roundRect(ctx, -state.width / 2, -state.height / 2, state.width, state.height, state.height / 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  const iconX = -state.width / 2 + 21 * scale
  ctx.fillStyle = style.iconFill
  ctx.beginPath()
  ctx.arc(iconX, 0, 12 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = style.iconText
  ctx.font = `800 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(state.icon, iconX, 0.5 * scale)

  ctx.fillStyle = style.text
  ctx.font = `600 ${14 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(state.name, iconX + 19 * scale, 0.5 * scale)
  ctx.restore()
}

export const renderTechChipPileMono: VizRender = (ctx, width, height, progress) => {
  ctx.save()
  ctx.fillStyle = WHITE_MONO_STAGE_COLOR
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  const scale = Math.min(width / 960, height / 540)
  const floorY = height * 0.82 + 27 * scale

  ctx.save()
  ctx.strokeStyle = 'rgba(24,24,27,0.15)'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(width * 0.16, floorY)
  ctx.lineTo(width * 0.84, floorY)
  ctx.stroke()
  ctx.restore()

  getTechChipPileStates(progress, width, height).forEach((state, index) => {
    drawMonoTechChip(ctx, state, MONO_CHIP_STYLES[index])
  })
}

export const techChipPileMonoViz: VizDef = {
  id: 'tech-chip-pile-mono',
  title: '기술 칩 낙하 · 모노',
  subtitle: '흑백의 기술들이 떨어져 하나의 스택으로 쌓이다',
  category: 'feature',
  period: 8000,
  render: renderTechChipPileMono,
}
