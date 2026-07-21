// 목표 기술 격차: 현재 이력서와 목표 직무 사이에 경로를 만들고,
// 보유 기술 이후의 빈 구간에서 흐름을 멈춰 부족 기술을 드러낸다.

import type { VizDef, VizRender } from '../types.ts'
import { FONT, clamp01, easeInOut, lerp, roundRect } from './common.ts'
import { WHITE_MONO_STAGE_COLOR } from './tech-chip-pile-mono.ts'

export type GapNodeStatus = 'owned' | 'missing'

export interface GapPathNodeSpec {
  name: string
  icon: string
  status: GapNodeStatus
  x: number
  y: number
}

export interface GapPathNodeState extends GapPathNodeSpec {
  alpha: number
  fillProgress: number
  gapAlpha: number
  radius: number
}

export interface GapPathSegmentState {
  fromX: number
  fromY: number
  toX: number
  toY: number
  status: 'connected' | 'gap'
  progress: number
  guideAlpha: number
}

export interface CareerGapPathFrame {
  resumeAlpha: number
  targetAlpha: number
  nodes: GapPathNodeState[]
  segments: GapPathSegmentState[]
  stopPulse: number
  questionAlpha: number
}

export const GAP_PATH_NODES: GapPathNodeSpec[] = [
  { name: 'Java', icon: 'J', status: 'owned', x: 280, y: 292 },
  { name: 'Spring', icon: 'S', status: 'owned', x: 382, y: 230 },
  { name: 'Docker', icon: 'D', status: 'missing', x: 484, y: 292 },
  { name: 'Kubernetes', icon: 'K', status: 'missing', x: 586, y: 230 },
  { name: 'AWS', icon: 'A', status: 'missing', x: 688, y: 292 },
]

const PERIOD_MS = 7500
const RESUME_ANCHOR = { x: 220, y: 270 }
const TARGET_ANCHOR = { x: 748, y: 270 }

function phase(timeMs: number, startMs: number, endMs: number): number {
  return easeInOut(clamp01((timeMs - startMs) / (endMs - startMs)))
}

export function getCareerGapPathFrame(
  progress: number,
  width: number,
  height: number,
): CareerGapPathFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const nodes = GAP_PATH_NODES.map((node, index): GapPathNodeState => {
    const appearStart = node.status === 'owned' ? 700 + index * 500 : 2100 + (index - 2) * 380
    const alpha = phase(timeMs, appearStart, appearStart + 480)
    const fillProgress = node.status === 'owned'
      ? phase(timeMs, appearStart + 120, appearStart + 520)
      : 0
    const gapAlpha = node.status === 'missing'
      ? phase(timeMs, 3000 + (index - 2) * 360, 3900 + (index - 2) * 360)
      : 0

    return {
      ...node,
      x: node.x * scale,
      y: node.y * scale,
      radius: 23 * scale,
      alpha,
      fillProgress,
      gapAlpha,
    }
  })

  const anchors = [
    { x: RESUME_ANCHOR.x * scale, y: RESUME_ANCHOR.y * scale },
    ...nodes.map(({ x, y }) => ({ x, y })),
    { x: TARGET_ANCHOR.x * scale, y: TARGET_ANCHOR.y * scale },
  ]

  const segments = anchors.slice(0, -1).map((anchor, index): GapPathSegmentState => {
    const status: GapPathSegmentState['status'] = index < 2 ? 'connected' : 'gap'
    const progress = status === 'connected'
      ? phase(timeMs, 620 + index * 560, 1120 + index * 560)
      : 0

    return {
      fromX: anchor.x,
      fromY: anchor.y,
      toX: anchors[index + 1].x,
      toY: anchors[index + 1].y,
      status,
      progress,
      guideAlpha: status === 'gap' ? phase(timeMs, 2500 + (index - 2) * 260, 3300 + (index - 2) * 260) : 0,
    }
  })

  const stopStage = phase(timeMs, 2500, 3100)
  const pulse = 0.55 + Math.sin(timeMs / 180) * 0.45

  return {
    resumeAlpha: 1,
    targetAlpha: 1,
    nodes,
    segments,
    stopPulse: stopStage * pulse,
    questionAlpha: phase(timeMs, 5000, 5800),
  }
}

function drawResumeCard(
  ctx: CanvasRenderingContext2D,
  scale: number,
  alpha: number,
): void {
  const x = 54 * scale
  const y = 165 * scale
  const width = 166 * scale
  const height = 210 * scale

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = 'rgba(24,24,27,0.08)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 7 * scale
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = '#A1A1AA'
  ctx.lineWidth = Math.max(1, 1.2 * scale)
  roundRect(ctx, x, y, width, height, 14 * scale)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.stroke()

  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${15 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('나의 이력서', x + 22 * scale, y + 30 * scale)

  const ownedSkills = ['Java', 'Spring', 'Git', 'MySQL']
  ownedSkills.forEach((skill, index) => {
    const chipY = y + (70 + index * 31) * scale
    ctx.fillStyle = index < 2 ? '#27272A' : '#F4F4F5'
    ctx.strokeStyle = index < 2 ? '#27272A' : '#D4D4D8'
    roundRect(ctx, x + 20 * scale, chipY - 10 * scale, 92 * scale, 21 * scale, 10.5 * scale)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = index < 2 ? '#FFFFFF' : '#52525B'
    ctx.font = `700 ${11 * scale}px ${FONT}`
    ctx.fillText(skill, x + 31 * scale, chipY + 0.5 * scale)
  })
  ctx.restore()
}

function drawTargetCard(
  ctx: CanvasRenderingContext2D,
  scale: number,
  alpha: number,
): void {
  const x = 748 * scale
  const y = 197 * scale
  const width = 158 * scale
  const height = 146 * scale

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = 'rgba(24,24,27,0.08)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 7 * scale
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = '#71717A'
  ctx.lineWidth = Math.max(1, 1.4 * scale)
  roundRect(ctx, x, y, width, height, 16 * scale)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.stroke()

  ctx.fillStyle = '#A1A1AA'
  ctx.font = `700 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('목표 직무', x + 22 * scale, y + 30 * scale)
  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${18 * scale}px ${FONT}`
  ctx.fillText('백엔드 개발자', x + 22 * scale, y + 62 * scale)

  ctx.strokeStyle = '#D4D4D8'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(x + 22 * scale, y + 91 * scale)
  ctx.lineTo(x + 136 * scale, y + 91 * scale)
  ctx.stroke()
  ctx.fillStyle = '#71717A'
  ctx.font = `600 ${11 * scale}px ${FONT}`
  ctx.fillText('요구 기술 5개', x + 22 * scale, y + 116 * scale)
  ctx.restore()
}

function drawSegment(ctx: CanvasRenderingContext2D, segment: GapPathSegmentState, scale: number): void {
  if (segment.status === 'connected' && segment.progress > 0) {
    ctx.save()
    ctx.strokeStyle = '#27272A'
    ctx.lineWidth = Math.max(2, 2.4 * scale)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(segment.fromX, segment.fromY)
    ctx.lineTo(
      lerp(segment.fromX, segment.toX, segment.progress),
      lerp(segment.fromY, segment.toY, segment.progress),
    )
    ctx.stroke()
    ctx.restore()
  }

  if (segment.status === 'gap' && segment.guideAlpha > 0) {
    ctx.save()
    ctx.globalAlpha = segment.guideAlpha
    ctx.strokeStyle = '#A1A1AA'
    ctx.lineWidth = Math.max(1, 1.5 * scale)
    ctx.setLineDash([5 * scale, 7 * scale])
    ctx.beginPath()
    ctx.moveTo(segment.fromX, segment.fromY)
    ctx.lineTo(segment.toX, segment.toY)
    ctx.stroke()
    ctx.restore()
  }
}

function drawNode(ctx: CanvasRenderingContext2D, node: GapPathNodeState, scale: number): void {
  if (node.alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = node.alpha
  ctx.translate(node.x, node.y)

  if (node.status === 'owned') {
    ctx.fillStyle = '#27272A'
    ctx.beginPath()
    ctx.arc(0, 0, node.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
  } else {
    ctx.globalAlpha *= 0.48 + node.gapAlpha * 0.52
    ctx.fillStyle = '#FAFAFA'
    ctx.strokeStyle = '#A1A1AA'
    ctx.lineWidth = Math.max(1, 1.5 * scale)
    ctx.setLineDash([4 * scale, 4 * scale])
    ctx.beginPath()
    ctx.arc(0, 0, node.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#71717A'
  }

  ctx.font = `800 ${13 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(node.icon, 0, 0.5 * scale)

  ctx.fillStyle = node.status === 'owned' ? '#27272A' : '#71717A'
  ctx.font = `700 ${12 * scale}px ${FONT}`
  ctx.fillText(node.name, 0, 39 * scale)
  ctx.restore()
}

function drawStopMarker(
  ctx: CanvasRenderingContext2D,
  frame: CareerGapPathFrame,
  scale: number,
): void {
  if (frame.stopPulse <= 0 || frame.nodes.length < 3) return
  const from = frame.nodes[1]
  const to = frame.nodes[2]
  const x = lerp(from.x, to.x, 0.46)
  const y = lerp(from.y, to.y, 0.46)
  const radius = (7 + frame.stopPulse * 4) * scale

  ctx.save()
  ctx.globalAlpha = 0.35 + frame.stopPulse * 0.55
  ctx.strokeStyle = '#18181B'
  ctx.lineWidth = Math.max(1, 1.6 * scale)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#18181B'
  ctx.beginPath()
  ctx.arc(x, y, 3.5 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawQuestion(
  ctx: CanvasRenderingContext2D,
  width: number,
  scale: number,
  alpha: number,
): void {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${29 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('목표까지, 무엇이 부족할까?', width / 2, 452 * scale)
  ctx.restore()
}

export const renderCareerGapPath: VizRender = (ctx, width, height, progress) => {
  ctx.fillStyle = WHITE_MONO_STAGE_COLOR
  ctx.fillRect(0, 0, width, height)

  const scale = Math.min(width / 960, height / 540)
  const frame = getCareerGapPathFrame(progress, width, height)

  drawResumeCard(ctx, scale, frame.resumeAlpha)
  drawTargetCard(ctx, scale, frame.targetAlpha)
  frame.segments.forEach((segment) => drawSegment(ctx, segment, scale))
  frame.nodes.forEach((node) => drawNode(ctx, node, scale))
  drawStopMarker(ctx, frame, scale)
  drawQuestion(ctx, width, scale, frame.questionAlpha)
}

export const careerGapPathViz: VizDef = {
  id: 'career-gap-path',
  title: '목표 기술 격차',
  subtitle: '현재 기술과 목표 직무 사이의 빈 구간을 발견하다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderCareerGapPath,
}
