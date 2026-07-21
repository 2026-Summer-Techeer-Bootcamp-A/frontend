// 모노 기술 더미 질문 장면: 완성된 칩 더미는 고정하고
// 질문 문구만 페이드인·유지·페이드아웃한다.

import type { VizDef, VizRender } from '../types.ts'
import {
  FONT,
  clamp01,
  easeInOut,
  roundRect,
  drawBackground,
} from './common.ts'
import { getTechChipPileStates } from './tech-chip-pile.ts'
import { MONO_CHIP_STYLES } from './tech-chip-pile-mono.ts'

export interface TechPileQuestionFrame {
  chips: ReturnType<typeof getTechChipPileStates>
  questionAlpha: number
}

const PERIOD_MS = 5000
const FADE_IN_END_MS = 600
const HOLD_END_MS = 3800
const FADE_OUT_END_MS = 4600

export function getTechPileQuestionFrame(
  progress: number,
  width: number,
  height: number,
): TechPileQuestionFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  let questionAlpha = 0

  if (timeMs < FADE_IN_END_MS) {
    questionAlpha = easeInOut(timeMs / FADE_IN_END_MS)
  } else if (timeMs < HOLD_END_MS) {
    questionAlpha = 1
  } else if (timeMs < FADE_OUT_END_MS) {
    questionAlpha = 1 - easeInOut((timeMs - HOLD_END_MS) / (FADE_OUT_END_MS - HOLD_END_MS))
  }

  return {
    chips: getTechChipPileStates(1, width, height),
    questionAlpha,
  }
}

function drawStaticMonoChip(
  ctx: CanvasRenderingContext2D,
  state: ReturnType<typeof getTechChipPileStates>[number],
  index: number,
): void {
  const style = MONO_CHIP_STYLES[index]
  const scale = state.height / 42

  ctx.save()
  ctx.translate(state.x, state.y)
  ctx.rotate(state.rotation)
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

function drawQuestion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha: number,
): void {
  if (alpha <= 0) return
  const scale = Math.min(width / 960, height / 540)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#A1A1AA'
  ctx.font = `600 ${20 * scale}px ${FONT}`
  ctx.fillText('쏟아지는 기술들,', width / 2, 142 * scale)

  ctx.fillStyle = '#F4F4F5'
  ctx.font = `800 ${34 * scale}px ${FONT}`
  ctx.fillText('내 커리어에 필요한 건 무엇일까?', width / 2, 190 * scale)
  ctx.restore()
}

export const renderTechPileQuestion: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  const scale = Math.min(width / 960, height / 540)
  const frame = getTechPileQuestionFrame(progress, width, height)
  const floorY = height * 0.82 + 27 * scale

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(width * 0.16, floorY)
  ctx.lineTo(width * 0.84, floorY)
  ctx.stroke()
  ctx.restore()

  frame.chips.forEach((chip, index) => drawStaticMonoChip(ctx, chip, index))
  drawQuestion(ctx, width, height, frame.questionAlpha)
}

export const techPileQuestionViz: VizDef = {
  id: 'tech-pile-question',
  title: '기술 더미 질문',
  subtitle: '쌓인 기술 앞에서 내게 필요한 방향을 묻다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderTechPileQuestion,
}
