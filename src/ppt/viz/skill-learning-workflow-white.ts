// 화이트 기술 학습 워크플로우: 흩어진 14개 기술 중 네 기술만 선택해
// Java → Spring → Docker → AWS 순서로 정렬하고 연결한다.

import type { VizDef, VizRender } from '../types.ts'
import { FONT, clamp01, easeInOut, lerp, roundRect } from './common.ts'

export interface WorkflowSkillSpec {
  name: string
  icon: string
  order: number | null
  startX: number
  startY: number
}

export interface WorkflowSkillState extends WorkflowSkillSpec {
  selected: boolean
  visible: boolean
  alpha: number
  selectionProgress: number
  moveProgress: number
  x: number
  y: number
  width: number
  height: number
}

export interface WorkflowConnectionState {
  fromOrder: number
  toOrder: number
  progress: number
}

export interface SkillLearningWorkflowFrame {
  skills: WorkflowSkillState[]
  connections: WorkflowConnectionState[]
  messageAlpha: number
}

export const WORKFLOW_SKILLS: WorkflowSkillSpec[] = [
  { name: 'Java', icon: 'J', order: 0, startX: 112, startY: 116 },
  { name: 'Spring', icon: 'S', order: 1, startX: 642, startY: 92 },
  { name: 'Docker', icon: 'D', order: 2, startX: 802, startY: 318 },
  { name: 'AWS', icon: 'A', order: 3, startX: 222, startY: 408 },
  { name: 'React', icon: 'R', order: null, startX: 346, startY: 92 },
  { name: 'Python', icon: 'P', order: null, startX: 828, startY: 132 },
  { name: 'MySQL', icon: 'M', order: null, startX: 496, startY: 148 },
  { name: 'Git', icon: 'G', order: null, startX: 104, startY: 284 },
  { name: 'Kubernetes', icon: 'K', order: null, startX: 676, startY: 414 },
  { name: 'TypeScript', icon: 'T', order: null, startX: 378, startY: 430 },
  { name: 'Kafka', icon: 'K', order: null, startX: 850, startY: 230 },
  { name: 'Redis', icon: 'R', order: null, startX: 538, startY: 372 },
  { name: 'Node.js', icon: 'N', order: null, startX: 248, startY: 210 },
  { name: 'Go', icon: 'G', order: null, startX: 718, startY: 248 },
]

const PERIOD_MS = 7000
const SELECT_START_MS = 650
const SELECT_GAP_MS = 420
const SELECT_DURATION_MS = 360
const MOVE_START_MS = 2200
const MOVE_END_MS = 3800
const FADE_START_MS = 2550
const FADE_END_MS = 3900
const CONNECTION_START_MS = 3900
const CONNECTION_GAP_MS = 420
const CONNECTION_DURATION_MS = 520
const MESSAGE_START_MS = 5100
const MESSAGE_END_MS = 5650

function targetX(order: number): number {
  return 205 + order * 184
}

function progressBetween(timeMs: number, startMs: number, endMs: number): number {
  return easeInOut(clamp01((timeMs - startMs) / (endMs - startMs)))
}

export function getSkillLearningWorkflowFrame(
  progress: number,
  width: number,
  height: number,
): SkillLearningWorkflowFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const moveProgress = progressBetween(timeMs, MOVE_START_MS, MOVE_END_MS)
  const backgroundAlpha = 1 - progressBetween(timeMs, FADE_START_MS, FADE_END_MS)

  const skills = WORKFLOW_SKILLS.map((skill): WorkflowSkillState => {
    const selected = skill.order !== null
    const selectionStart = SELECT_START_MS + (skill.order ?? 0) * SELECT_GAP_MS
    const selectionProgress = selected
      ? progressBetween(timeMs, selectionStart, selectionStart + SELECT_DURATION_MS)
      : 0
    const destinationX = selected ? targetX(skill.order ?? 0) : skill.startX
    const destinationY = selected ? 270 : skill.startY
    const chipWidth = 74 + skill.name.length * 7

    return {
      ...skill,
      selected,
      visible: selected || backgroundAlpha > 0,
      alpha: selected ? 1 : backgroundAlpha,
      selectionProgress,
      moveProgress: selected ? moveProgress : 0,
      x: lerp(skill.startX, destinationX, selected ? moveProgress : 0) * scale,
      y: lerp(skill.startY, destinationY, selected ? moveProgress : 0) * scale,
      width: chipWidth * scale,
      height: 44 * scale,
    }
  })

  return {
    skills,
    connections: [0, 1, 2].map((fromOrder) => ({
      fromOrder,
      toOrder: fromOrder + 1,
      progress: progressBetween(
        timeMs,
        CONNECTION_START_MS + fromOrder * CONNECTION_GAP_MS,
        CONNECTION_START_MS + fromOrder * CONNECTION_GAP_MS + CONNECTION_DURATION_MS,
      ),
    })),
    messageAlpha: progressBetween(timeMs, MESSAGE_START_MS, MESSAGE_END_MS),
  }
}

function drawWhiteStage(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#F7F7F5'
  ctx.fillRect(0, 0, width, height)
  const scale = Math.min(width / 960, height / 540)

  ctx.save()
  ctx.fillStyle = 'rgba(24,24,27,0.045)'
  for (let x = 30 * scale; x < width; x += 30 * scale) {
    for (let y = 30 * scale; y < height; y += 30 * scale) {
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.7, scale), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  from: WorkflowSkillState,
  to: WorkflowSkillState,
  progress: number,
): void {
  if (progress <= 0) return
  const scale = from.height / 44
  const startX = from.x + from.width / 2 + 10 * scale
  const endX = to.x - to.width / 2 - 13 * scale
  const currentX = lerp(startX, endX, progress)

  ctx.save()
  ctx.strokeStyle = '#27272A'
  ctx.fillStyle = '#27272A'
  ctx.lineWidth = Math.max(2, 2.5 * scale)
  ctx.beginPath()
  ctx.moveTo(startX, from.y)
  ctx.lineTo(currentX, to.y)
  ctx.stroke()

  if (progress === 1) {
    ctx.beginPath()
    ctx.moveTo(endX, to.y)
    ctx.lineTo(endX - 9 * scale, to.y - 6 * scale)
    ctx.lineTo(endX - 9 * scale, to.y + 6 * scale)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawWorkflowChip(ctx: CanvasRenderingContext2D, skill: WorkflowSkillState): void {
  if (!skill.visible || skill.alpha <= 0) return
  const scale = skill.height / 44
  const selected = skill.selectionProgress > 0.5

  ctx.save()
  ctx.globalAlpha = skill.alpha
  ctx.translate(skill.x, skill.y)
  ctx.shadowColor = skill.selected
    ? `rgba(24,24,27,${0.12 * skill.selectionProgress})`
    : 'rgba(24,24,27,0.05)'
  ctx.shadowBlur = (7 + skill.selectionProgress * 10) * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = selected ? '#18181B' : '#FFFFFF'
  roundRect(ctx, -skill.width / 2, -skill.height / 2, skill.width, skill.height, skill.height / 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = selected ? '#18181B' : '#D4D4D8'
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  const iconX = -skill.width / 2 + 22 * scale
  ctx.fillStyle = selected ? '#F4F4F5' : '#E4E4E7'
  ctx.beginPath()
  ctx.arc(iconX, 0, 12 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#27272A'
  ctx.font = `800 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(skill.icon, iconX, 0.5 * scale)

  ctx.fillStyle = selected ? '#FAFAFA' : '#52525B'
  ctx.font = `700 ${14 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(skill.name, iconX + 19 * scale, 0.5 * scale)
  ctx.restore()
}

export const renderSkillLearningWorkflowWhite: VizRender = (ctx, width, height, progress) => {
  drawWhiteStage(ctx, width, height)
  const frame = getSkillLearningWorkflowFrame(progress, width, height)
  const selected = frame.skills
    .filter((skill) => skill.selected)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  frame.connections.forEach((connection) => {
    drawConnection(
      ctx,
      selected[connection.fromOrder],
      selected[connection.toOrder],
      connection.progress,
    )
  })
  frame.skills.forEach((skill) => drawWorkflowChip(ctx, skill))

  const scale = Math.min(width / 960, height / 540)
  ctx.save()
  ctx.globalAlpha = frame.messageAlpha
  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${28 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('나에게 필요한 기술을, 배워야 할 순서대로', width / 2, 390 * scale)
  ctx.restore()
}

export const skillLearningWorkflowWhiteViz: VizDef = {
  id: 'skill-learning-workflow-white',
  title: '나의 기술 학습 경로',
  subtitle: '흩어진 기술에서 필요한 순서를 연결하다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderSkillLearningWorkflowWhite,
}
