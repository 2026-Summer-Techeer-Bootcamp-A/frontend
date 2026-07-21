// 이력서 기술 분야 분류: 모노톤 기술 칩 8개가 이력서에서 하나씩 나와
// 네 분야의 곡선 레인을 따라 이동하고 목적지에 흡수되듯 사라진다.

import type { VizDef, VizRender } from '../types.ts'
import {
  FONT,
  clamp01,
  easeInOut,
  lerp,
  roundRect,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common.ts'

export type SkillField = 'backend' | 'frontend' | 'data' | 'infra'
export type SkillTone = 'white' | 'light' | 'mid' | 'black'

export interface ResumeSkillSpec {
  name: string
  icon: string
  field: SkillField
  tone: SkillTone
}

export interface ResumeSkillState extends ResumeSkillSpec {
  visible: boolean
  inTransit: boolean
  arrived: boolean
  alpha: number
  scale: number
  x: number
  y: number
  width: number
  height: number
  journey: number
}

export interface ResumeSkillRoutingFrame {
  skills: ResumeSkillState[]
  completed: Record<SkillField, number>
}

interface ToneStyle {
  fill: string
  border: string
  text: string
  iconFill: string
  iconText: string
  line: string
}

const PERIOD_MS = 9000
const FIRST_START_MS = 700
const START_GAP_MS = 650
const JOURNEY_MS = 1750

const FIELD_ORDER: SkillField[] = ['backend', 'frontend', 'data', 'infra']

const FIELD_LABELS: Record<SkillField, string> = {
  backend: '백엔드',
  frontend: '프론트',
  data: '데이터',
  infra: '인프라',
}

const FIELD_TONES: Record<SkillField, SkillTone> = {
  backend: 'white',
  frontend: 'light',
  data: 'mid',
  infra: 'black',
}

const TONE_STYLES: Record<SkillTone, ToneStyle> = {
  white: {
    fill: '#F4F4F5',
    border: '#FFFFFF',
    text: '#18181B',
    iconFill: '#18181B',
    iconText: '#FFFFFF',
    line: 'rgba(244,244,245,0.38)',
  },
  light: {
    fill: '#D4D4D8',
    border: '#F4F4F5',
    text: '#27272A',
    iconFill: '#3F3F46',
    iconText: '#FFFFFF',
    line: 'rgba(212,212,216,0.3)',
  },
  mid: {
    fill: '#8B8B90',
    border: '#B8B8BC',
    text: '#111113',
    iconFill: '#2F2F33',
    iconText: '#FFFFFF',
    line: 'rgba(150,150,155,0.28)',
  },
  black: {
    fill: '#171719',
    border: '#A1A1A6',
    text: '#F7F7F8',
    iconFill: '#E4E4E7',
    iconText: '#18181B',
    line: 'rgba(161,161,166,0.24)',
  },
}

export const RESUME_SKILLS: ResumeSkillSpec[] = [
  { name: 'Java', icon: 'J', field: 'backend', tone: 'white' },
  { name: 'React', icon: 'R', field: 'frontend', tone: 'light' },
  { name: 'Docker', icon: 'D', field: 'infra', tone: 'black' },
  { name: 'MySQL', icon: 'M', field: 'data', tone: 'mid' },
  { name: 'Spring', icon: 'S', field: 'backend', tone: 'white' },
  { name: 'AWS', icon: 'A', field: 'infra', tone: 'black' },
  { name: 'Python', icon: 'P', field: 'data', tone: 'mid' },
  { name: 'Git', icon: 'G', field: 'infra', tone: 'black' },
]

function fieldY(field: SkillField, scale: number): number {
  return (130 + FIELD_ORDER.indexOf(field) * 100) * scale
}

function quadratic(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  }
}

export function getResumeSkillRoutingFrame(
  progress: number,
  width: number,
  height: number,
): ResumeSkillRoutingFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const completed: Record<SkillField, number> = { backend: 0, frontend: 0, data: 0, infra: 0 }

  const skills = RESUME_SKILLS.map((skill, index): ResumeSkillState => {
    const startMs = FIRST_START_MS + index * START_GAP_MS
    const raw = (timeMs - startMs) / JOURNEY_MS
    const journey = clamp01(raw)
    const visible = raw > 0 && raw < 1
    const arrived = raw >= 1
    if (arrived) completed[skill.field] += 1

    const start = {
      x: 248 * scale,
      y: (175 + index * 25) * scale,
    }
    const end = {
      x: 742 * scale,
      y: fieldY(skill.field, scale),
    }
    const control = {
      x: 490 * scale,
      y: lerp(start.y, end.y, 0.36) + (index % 2 === 0 ? -18 : 18) * scale,
    }
    const position = quadratic(start, control, end, easeInOut(journey))
    const birth = clamp01(journey / 0.08)
    const absorb = 1 - clamp01((journey - 0.78) / 0.22)
    const shrink = clamp01((journey - 0.72) / 0.28)

    return {
      ...skill,
      visible,
      inTransit: visible,
      arrived,
      alpha: visible ? birth * absorb : 0,
      scale: lerp(1, 0.16, shrink),
      x: position.x,
      y: position.y,
      width: (56 + skill.name.length * 8) * scale,
      height: 38 * scale,
      journey,
    }
  })

  return { skills, completed }
}

function drawResume(
  ctx: CanvasRenderingContext2D,
  scale: number,
  frame: ResumeSkillRoutingFrame,
): void {
  const cx = 185 * scale
  const cy = 275 * scale
  const width = 190 * scale
  const height = 292 * scale

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 7 * scale
  ctx.fillStyle = '#E7E7E9'
  roundRect(ctx, cx - width / 2, cy - height / 2, width, height, 10 * scale)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = Math.max(1, scale)
  roundRect(ctx, cx - width / 2, cy - height / 2, width, height, 10 * scale)
  ctx.stroke()

  const left = cx - width / 2 + 22 * scale
  const top = cy - height / 2 + 22 * scale
  ctx.fillStyle = '#27272A'
  ctx.font = `800 ${13 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('RESUME', left, top + 8 * scale)

  ctx.fillStyle = '#A1A1A6'
  ctx.fillRect(left, top + 24 * scale, 100 * scale, 4 * scale)
  ctx.fillRect(left, top + 36 * scale, 72 * scale, 3 * scale)

  ctx.fillStyle = '#52525B'
  ctx.font = `700 ${9 * scale}px ${FONT}`
  ctx.fillText('SKILLS', left, top + 62 * scale)

  RESUME_SKILLS.forEach((skill, index) => {
    const state = frame.skills[index]
    const remaining = state.journey === 0 ? 1 : 1 - clamp01(state.journey / 0.1)
    const rowY = top + (82 + index * 25) * scale
    ctx.globalAlpha = 0.9 * remaining
    ctx.fillStyle = '#3F3F46'
    ctx.font = `600 ${10 * scale}px ${FONT}`
    ctx.fillText(skill.name, left + 8 * scale, rowY)
    ctx.fillStyle = '#B4B4B8'
    ctx.fillRect(left + 78 * scale, rowY - 4 * scale, (50 + (index % 3) * 10) * scale, 3 * scale)
  })
  ctx.restore()
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  field: SkillField,
  scale: number,
  count: number,
  pulse: number,
): void {
  const tone = FIELD_TONES[field]
  const style = TONE_STYLES[tone]
  const y = fieldY(field, scale)
  const start = { x: 286 * scale, y: 270 * scale }
  const end = { x: 742 * scale, y }
  const control = { x: 505 * scale, y: lerp(start.y, end.y, 0.45) }

  ctx.save()
  ctx.strokeStyle = style.line
  ctx.lineWidth = (1.1 + pulse * 0.8) * scale
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(control.x, control.y, end.x, end.y)
  ctx.stroke()

  ctx.globalAlpha = 0.9 + pulse * 0.1
  ctx.fillStyle = style.fill
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, scale)
  roundRect(ctx, 755 * scale, (y / scale - 22) * scale, 116 * scale, 44 * scale, 22 * scale)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = style.text
  ctx.font = `700 ${13 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(FIELD_LABELS[field], 813 * scale, y - 5 * scale)
  ctx.font = `600 ${9 * scale}px ${FONT}`
  ctx.fillText(`분류 완료 ${count}`, 813 * scale, y + 11 * scale)
  ctx.restore()
}

function drawSkillChip(ctx: CanvasRenderingContext2D, skill: ResumeSkillState): void {
  if (!skill.visible || skill.alpha <= 0) return
  const style = TONE_STYLES[skill.tone]
  const unit = skill.height / 38

  ctx.save()
  ctx.translate(skill.x, skill.y)
  ctx.scale(skill.scale, skill.scale)
  ctx.globalAlpha = skill.alpha
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 10 * unit
  ctx.shadowOffsetY = 4 * unit
  ctx.fillStyle = style.fill
  roundRect(ctx, -skill.width / 2, -skill.height / 2, skill.width, skill.height, skill.height / 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, unit)
  ctx.stroke()

  const iconX = -skill.width / 2 + 20 * unit
  ctx.fillStyle = style.iconFill
  ctx.beginPath()
  ctx.arc(iconX, 0, 11 * unit, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = style.iconText
  ctx.font = `800 ${10 * unit}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(skill.icon, iconX, 0.5 * unit)

  ctx.fillStyle = style.text
  ctx.font = `700 ${13 * unit}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(skill.name, iconX + 17 * unit, 0.5 * unit)
  ctx.restore()
}

export const renderResumeSkillRouting: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  const scale = Math.min(width / 960, height / 540)
  const frame = getResumeSkillRoutingFrame(progress, width, height)

  FIELD_ORDER.forEach((field) => {
    const fieldSkills = frame.skills.filter((skill) => skill.field === field)
    const pulse = fieldSkills.reduce((max, skill) => {
      const value = skill.journey > 0.76 && skill.journey < 1
        ? Math.sin(((skill.journey - 0.76) / 0.24) * Math.PI)
        : 0
      return Math.max(max, value)
    }, 0)
    drawRoute(ctx, field, scale, frame.completed[field], pulse)
  })

  drawResume(ctx, scale, frame)
  frame.skills.forEach((skill) => drawSkillChip(ctx, skill))

  drawTopLabel(ctx, '문제 인식', '이력서 속 기술 분류')
  const visibleCount = frame.skills.filter((skill) => skill.visible).length
  const completedCount = Object.values(frame.completed).reduce((sum, count) => sum + count, 0)
  const caption = completedCount === RESUME_SKILLS.length
    ? '8개의 기술이 네 분야로 분류되었습니다'
    : visibleCount > 0 || completedCount > 0
      ? '내 기술이 알맞은 분야로 이동합니다'
      : '이력서에서 사용할 수 있는 기술을 찾습니다'
  drawCaption(ctx, height, caption)
}

export const resumeSkillRoutingViz: VizDef = {
  id: 'resume-skill-routing',
  title: '이력서 기술 분류',
  subtitle: '내 기술이 분야별 경로를 따라 분류되다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderResumeSkillRouting,
}
