// 정돈된 이력서 스택: 이력서 6장이 화면 밖에서 한 장씩 들어와 중앙의
// 정돈된 더미로 멈춘다. 기존 문제 인식 시각화와 독립된 발표용 장면이다.

import type { VizRender } from '../types.ts'
import {
  FONT,
  clamp01,
  lerp,
  easeOut,
  roundRect,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common.ts'

export interface ResumeCardState {
  index: number
  visible: boolean
  alpha: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

const PERIOD_MS = 6000
const STARTS_MS = [400, 1040, 1680, 2320, 2960, 3600] as const
const ARRIVAL_MS = 700

// 마지막 카드는 정확히 중앙에 놓고, 아래 카드일수록 작은 위치·회전 차이로
// 종이 더미의 깊이만 만든다. 값은 화면 크기 비율과 라디안이다.
const FINAL_OFFSETS = [
  [-0.018, 0.018, -0.035],
  [0.014, 0.014, 0.026],
  [-0.01, 0.01, -0.018],
  [0.008, 0.006, 0.014],
  [-0.004, 0.003, -0.008],
  [0, 0, 0],
] as const

// 카드별 진입 방향과 초기 회전. 모든 값은 고정되어 탐색·MP4 렌더가
// 같은 progress에서 항상 같은 프레임을 만든다.
const ENTRY_VECTORS = [
  [-0.72, -0.35, -0.32],
  [0.72, -0.28, 0.28],
  [-0.62, 0.42, -0.24],
  [0.62, 0.36, 0.22],
  [0, -0.75, -0.18],
  [0, 0.72, 0.16],
] as const

export function getResumeStackStates(progress: number, width: number, height: number): ResumeCardState[] {
  const timeMs = clamp01(progress) * PERIOD_MS
  const cardWidth = Math.min(width * 0.25, height * 0.39)
  const cardHeight = cardWidth * 1.34
  const centerX = width * 0.5
  const centerY = height * 0.5

  return STARTS_MS.map((startMs, index) => {
    const raw = clamp01((timeMs - startMs) / ARRIVAL_MS)
    const arrival = easeOut(raw)
    const [offsetX, offsetY, finalRotation] = FINAL_OFFSETS[index]
    const [entryX, entryY, entryRotation] = ENTRY_VECTORS[index]
    const finalX = centerX + width * offsetX
    const finalY = centerY + height * offsetY

    return {
      index,
      visible: raw > 0,
      alpha: raw,
      x: lerp(centerX + width * entryX, finalX, arrival),
      y: lerp(centerY + height * entryY, finalY, arrival),
      width: cardWidth,
      height: cardHeight,
      rotation: lerp(entryRotation, finalRotation, arrival),
    }
  })
}

function drawResumeCard(ctx: CanvasRenderingContext2D, card: ResumeCardState): void {
  if (!card.visible || card.alpha <= 0) return

  const scale = card.width / 250
  const left = -card.width / 2 + 28 * scale
  const top = -card.height / 2 + 30 * scale

  ctx.save()
  ctx.translate(card.x, card.y)
  ctx.rotate(card.rotation)
  ctx.globalAlpha = card.alpha

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.fillStyle = '#f4f4f5'
  roundRect(ctx, -card.width / 2, -card.height / 2, card.width, card.height, 12 * scale)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(24,24,27,0.12)'
  ctx.lineWidth = Math.max(1, scale)
  roundRect(ctx, -card.width / 2, -card.height / 2, card.width, card.height, 12 * scale)
  ctx.stroke()

  // 익명 프로필과 중립적인 텍스트 라인만 사용해 실제 개인정보처럼 보이지 않게 한다.
  ctx.fillStyle = '#d4d4d8'
  ctx.beginPath()
  ctx.arc(left + 20 * scale, top + 20 * scale, 20 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#3f3f46'
  ctx.fillRect(left + 54 * scale, top + 7 * scale, 92 * scale, 6 * scale)
  ctx.fillStyle = '#a1a1aa'
  ctx.fillRect(left + 54 * scale, top + 24 * scale, 66 * scale, 4 * scale)

  ctx.fillStyle = '#d4d4d8'
  ctx.fillRect(left, top + 61 * scale, card.width - 56 * scale, Math.max(1, scale))

  const lineWidths = [0.92, 0.72, 0.84, 0.61, 0.78]
  lineWidths.forEach((ratio, row) => {
    ctx.fillStyle = row === 0 ? '#71717a' : '#a1a1aa'
    ctx.fillRect(
      left,
      top + (83 + row * 31) * scale,
      (card.width - 56 * scale) * ratio,
      (row === 0 ? 5 : 4) * scale,
    )
  })

  // 마지막 카드에만 작은 문서 라벨을 넣어 더미의 정돈된 최상단을 강조한다.
  if (card.index === 5) {
    ctx.fillStyle = '#52525b'
    ctx.font = `700 ${11 * scale}px ${FONT}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('RESUME', card.width / 2 - 22 * scale, card.height / 2 - 20 * scale)
  }

  ctx.restore()
}

export const renderResumeStackClean: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  getResumeStackStates(progress, width, height).forEach((card) => drawResumeCard(ctx, card))
  drawTopLabel(ctx, '문제 인식', '쌓이는 이력서')
  drawCaption(ctx, height, progress < 5 / 6 ? '이력서가 한 장씩 모입니다' : '6장의 이력서가 정돈되었습니다')
}
