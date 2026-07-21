// 이력서 더미 → 컬러 기술 칩 전환: 이력서 6장이 완전히 퇴장한 뒤
// 공식 로고를 포함한 기술 칩 30개가 낙하해 쌓이는 독립 장면이다.

import { Children, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { FaAws } from 'react-icons/fa'
import {
  siApachekafka,
  siDjango,
  siDocker,
  siFastapi,
  siGit,
  siGo,
  siGraphql,
  siJavascript,
  siKotlin,
  siKubernetes,
  siLinux,
  siMongodb,
  siMysql,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siOpenjdk,
  siPhp,
  siPostgresql,
  siPython,
  siReact,
  siRedis,
  siRuby,
  siRust,
  siSpring,
  siSwift,
  siTerraform,
  siTypescript,
  siVuedotjs,
} from 'simple-icons'
import type { SimpleIcon } from 'simple-icons'
import type { VizDef, VizRender } from '../types.ts'
import {
  FONT,
  clamp01,
  drawBackground,
  easeOut,
  lerp,
  roundRect,
} from './common.ts'

export type ResumeTechCategory = 'language' | 'platform' | 'infra'
export type ResumeTechPhase = 'resume' | 'gap' | 'chips'

export interface CanvasLogo {
  path: string
  color: string
  viewBoxWidth: number
  viewBoxHeight: number
}

export interface ResumeTechChipSpec {
  name: string
  category: ResumeTechCategory
  logo: CanvasLogo
  row: 0 | 1 | 2 | 3 | 4
  finalOffsetX: number
  finalRotation: number
  driftX: number
}

export interface ResumeTransitionCardState {
  index: number
  visible: boolean
  alpha: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export interface ResumeTechChipState extends ResumeTechChipSpec {
  visible: boolean
  settled: boolean
  alpha: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  border: string
  labelColor: '#FFFFFF'
}

export interface ResumeTechTransitionState {
  phase: ResumeTechPhase
  resumes: ResumeTransitionCardState[]
  chips: ResumeTechChipState[]
}

const PERIOD_MS = 10000
const RESUME_STARTS_MS = [300, 880, 1460, 2040, 2620, 3200] as const
const RESUME_ARRIVAL_MS = 650
const RESUME_EXIT_START_MS = 4300
const RESUME_EXIT_END_MS = 5200
const CHIP_START_MS = 5400
const CHIP_GAP_MS = 90
const CHIP_DROP_MS = 950

const CATEGORY_STYLES: Record<ResumeTechCategory, { fill: string; border: string }> = {
  language: { fill: '#315F9E', border: '#6EA8FE' },
  platform: { fill: '#1F7650', border: '#34D17F' },
  infra: { fill: '#9A5B1F', border: '#E2933F' },
}

const FINAL_OFFSETS = [
  [-0.018, 0.018, -0.035],
  [0.014, 0.014, 0.026],
  [-0.01, 0.01, -0.018],
  [0.008, 0.006, 0.014],
  [-0.004, 0.003, -0.008],
  [0, 0, 0],
] as const

const ENTRY_VECTORS = [
  [-0.72, -0.35, -0.32],
  [0.72, -0.28, 0.28],
  [-0.62, 0.42, -0.24],
  [0.62, 0.36, 0.22],
  [0, -0.75, -0.18],
  [0, 0.72, 0.16],
] as const

function simpleLogo(icon: SimpleIcon): CanvasLogo {
  return { path: icon.path, color: `#${icon.hex}`, viewBoxWidth: 24, viewBoxHeight: 24 }
}

function awsLogo(): CanvasLogo {
  // simple-icons 16에서는 AWS 항목이 제거되어 이미 설치된 react-icons의
  // Font Awesome 공식 AWS 벡터 경로를 Canvas 데이터로 변환한다.
  const element = FaAws({})
  if (!isValidElement<{ children?: ReactNode }>(element)) {
    return { path: '', color: '#FF9900', viewBoxWidth: 640, viewBoxHeight: 512 }
  }
  const pathElement = Children.toArray(element.props.children).find(
    (child) => isValidElement<{ d?: string }>(child) && typeof child.props.d === 'string',
  )
  return {
    path: isValidElement<{ d?: string }>(pathElement) ? pathElement.props.d ?? '' : '',
    color: '#FF9900',
    viewBoxWidth: 640,
    viewBoxHeight: 512,
  }
}

function chip(
  name: string,
  category: ResumeTechCategory,
  logo: CanvasLogo,
  index: number,
): ResumeTechChipSpec {
  const row = Math.floor(index / 6) as 0 | 1 | 2 | 3 | 4
  const column = index % 6
  const rowShift = row % 2 === 0 ? 0 : 18
  return {
    name,
    category,
    logo,
    row,
    finalOffsetX: -312 + column * 125 + rowShift,
    finalRotation: [-0.028, 0.021, -0.014, 0.018, -0.022, 0.012][column],
    driftX: [-52, 44, -36, 58, -46, 34][(index + row) % 6],
  }
}

// 아래 행부터 위 행 순으로 떨어지되 분야 색상이 층마다 자연스럽게 섞이도록 고정한다.
export const RESUME_TECH_CHIPS: ResumeTechChipSpec[] = [
  chip('Java', 'language', simpleLogo(siOpenjdk), 0),
  chip('Spring', 'platform', simpleLogo(siSpring), 1),
  chip('AWS', 'infra', awsLogo(), 2),
  chip('Python', 'language', simpleLogo(siPython), 3),
  chip('Docker', 'infra', simpleLogo(siDocker), 4),
  chip('React', 'platform', simpleLogo(siReact), 5),
  chip('TypeScript', 'language', simpleLogo(siTypescript), 6),
  chip('Kafka', 'platform', simpleLogo(siApachekafka), 7),
  chip('Kubernetes', 'infra', simpleLogo(siKubernetes), 8),
  chip('Redis', 'platform', simpleLogo(siRedis), 9),
  chip('Go', 'language', simpleLogo(siGo), 10),
  chip('MySQL', 'platform', simpleLogo(siMysql), 11),
  chip('Git', 'infra', simpleLogo(siGit), 12),
  chip('Vue', 'platform', simpleLogo(siVuedotjs), 13),
  chip('Swift', 'language', simpleLogo(siSwift), 14),
  chip('PostgreSQL', 'platform', simpleLogo(siPostgresql), 15),
  chip('Linux', 'infra', simpleLogo(siLinux), 16),
  chip('Node.js', 'platform', simpleLogo(siNodedotjs), 17),
  chip('Kotlin', 'language', simpleLogo(siKotlin), 18),
  chip('MongoDB', 'platform', simpleLogo(siMongodb), 19),
  chip('Terraform', 'infra', simpleLogo(siTerraform), 20),
  chip('Django', 'platform', simpleLogo(siDjango), 21),
  chip('Ruby', 'language', simpleLogo(siRuby), 22),
  chip('Nginx', 'infra', simpleLogo(siNginx), 23),
  chip('JavaScript', 'language', simpleLogo(siJavascript), 24),
  chip('FastAPI', 'platform', simpleLogo(siFastapi), 25),
  chip('PHP', 'language', simpleLogo(siPhp), 26),
  chip('GraphQL', 'platform', simpleLogo(siGraphql), 27),
  chip('Rust', 'language', simpleLogo(siRust), 28),
  chip('Next.js', 'platform', simpleLogo(siNextdotjs), 29),
]

function getResumeStates(timeMs: number, width: number, height: number): ResumeTransitionCardState[] {
  const cardWidth = Math.min(width * 0.25, height * 0.39)
  const cardHeight = cardWidth * 1.34
  const centerX = width * 0.5
  const centerY = height * 0.5
  const exit = clamp01((timeMs - RESUME_EXIT_START_MS) / (RESUME_EXIT_END_MS - RESUME_EXIT_START_MS))

  return RESUME_STARTS_MS.map((startMs, index) => {
    const raw = clamp01((timeMs - startMs) / RESUME_ARRIVAL_MS)
    const arrival = easeOut(raw)
    const [offsetX, offsetY, finalRotation] = FINAL_OFFSETS[index]
    const [entryX, entryY, entryRotation] = ENTRY_VECTORS[index]
    const finalX = centerX + width * offsetX
    const finalY = centerY + height * offsetY
    return {
      index,
      visible: raw > 0 && timeMs < RESUME_EXIT_END_MS,
      alpha: raw * (1 - exit),
      x: lerp(centerX + width * entryX, finalX, arrival),
      y: lerp(centerY + height * entryY, finalY, arrival) - height * 0.42 * easeOut(exit),
      width: cardWidth,
      height: cardHeight,
      rotation: lerp(entryRotation, finalRotation, arrival),
    }
  })
}

function getChipStates(timeMs: number, width: number, height: number): ResumeTechChipState[] {
  const scale = Math.min(width / 960, height / 540)
  const chipHeight = 36 * scale
  const floorY = height * 0.86
  const rowGap = 34 * scale

  return RESUME_TECH_CHIPS.map((tech, index) => {
    const local = clamp01((timeMs - CHIP_START_MS - index * CHIP_GAP_MS) / CHIP_DROP_MS)
    const fall = clamp01(local / 0.78)
    const bounce = clamp01((local - 0.78) / 0.22)
    const targetX = width * 0.5 + tech.finalOffsetX * scale
    const targetY = floorY - chipHeight / 2 - tech.row * rowGap
    const startX = targetX + tech.driftX * scale
    const startY = -60 * scale
    const bounceLift = bounce > 0 && bounce < 1
      ? Math.sin(bounce * Math.PI) * 10 * scale * (1 - bounce * 0.35)
      : 0
    const style = CATEGORY_STYLES[tech.category]
    return {
      ...tech,
      visible: timeMs > CHIP_START_MS && local > 0,
      settled: local >= 1,
      alpha: clamp01(local / 0.1),
      x: lerp(startX, targetX, fall),
      y: lerp(startY, targetY, fall * fall) - bounceLift,
      width: (50 + tech.name.length * 6.6) * scale,
      height: chipHeight,
      rotation: lerp(tech.finalRotation * -6, tech.finalRotation, fall)
        + Math.sin(bounce * Math.PI) * 0.035,
      fill: style.fill,
      border: style.border,
      labelColor: '#FFFFFF',
    }
  })
}

export function getResumeTechTransitionState(
  progress: number,
  width: number,
  height: number,
): ResumeTechTransitionState {
  const timeMs = clamp01(progress) * PERIOD_MS
  const phase: ResumeTechPhase = timeMs < RESUME_EXIT_END_MS
    ? 'resume'
    : timeMs < CHIP_START_MS
      ? 'gap'
      : 'chips'
  return {
    phase,
    resumes: getResumeStates(timeMs, width, height),
    chips: getChipStates(timeMs, width, height),
  }
}

function drawResumeCard(ctx: CanvasRenderingContext2D, card: ResumeTransitionCardState): void {
  if (!card.visible || card.alpha <= 0) return

  const scale = card.width / 250
  const left = -card.width / 2 + 28 * scale
  const top = -card.height / 2 + 30 * scale

  ctx.save()
  ctx.translate(card.x, card.y)
  ctx.rotate(card.rotation)
  ctx.globalAlpha = card.alpha

  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.fillStyle = '#F4F4F5'
  roundRect(ctx, -card.width / 2, -card.height / 2, card.width, card.height, 12 * scale)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(24,24,27,0.12)'
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  ctx.fillStyle = '#D4D4D8'
  ctx.beginPath()
  ctx.arc(left + 20 * scale, top + 20 * scale, 20 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#3F3F46'
  ctx.fillRect(left + 54 * scale, top + 7 * scale, 92 * scale, 6 * scale)
  ctx.fillStyle = '#A1A1AA'
  ctx.fillRect(left + 54 * scale, top + 24 * scale, 66 * scale, 4 * scale)
  ctx.fillStyle = '#D4D4D8'
  ctx.fillRect(left, top + 61 * scale, card.width - 56 * scale, Math.max(1, scale))

  ;[0.92, 0.72, 0.84, 0.61, 0.78].forEach((ratio, row) => {
    ctx.fillStyle = row === 0 ? '#71717A' : '#A1A1AA'
    ctx.fillRect(
      left,
      top + (83 + row * 31) * scale,
      (card.width - 56 * scale) * ratio,
      (row === 0 ? 5 : 4) * scale,
    )
  })

  if (card.index === 5) {
    ctx.fillStyle = '#52525B'
    ctx.font = `700 ${11 * scale}px ${FONT}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('RESUME', card.width / 2 - 22 * scale, card.height / 2 - 20 * scale)
  }

  ctx.restore()
}

const logoPathCache = new Map<string, Path2D>()

function drawLogo(ctx: CanvasRenderingContext2D, logo: CanvasLogo, centerX: number, size: number): void {
  if (!logo.path || typeof Path2D === 'undefined') return

  let path = logoPathCache.get(logo.path)
  if (!path) {
    try {
      path = new Path2D(logo.path)
      logoPathCache.set(logo.path, path)
    } catch {
      return
    }
  }

  const maxDimension = Math.max(logo.viewBoxWidth, logo.viewBoxHeight)
  const pathScale = size / maxDimension
  ctx.save()
  ctx.translate(
    centerX - (logo.viewBoxWidth * pathScale) / 2,
    -(logo.viewBoxHeight * pathScale) / 2,
  )
  ctx.scale(pathScale, pathScale)
  ctx.fillStyle = logo.color
  ctx.fill(path)
  ctx.restore()
}

function drawTechChip(ctx: CanvasRenderingContext2D, state: ResumeTechChipState): void {
  if (!state.visible || state.alpha <= 0) return

  const scale = state.height / 36
  ctx.save()
  ctx.translate(state.x, state.y)
  ctx.rotate(state.rotation)
  ctx.globalAlpha = state.alpha

  ctx.shadowColor = 'rgba(0,0,0,0.26)'
  ctx.shadowBlur = 10 * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = state.fill
  roundRect(ctx, -state.width / 2, -state.height / 2, state.width, state.height, state.height / 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = state.border
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  const iconX = -state.width / 2 + 18 * scale
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.beginPath()
  ctx.arc(iconX, 0, 11.5 * scale, 0, Math.PI * 2)
  ctx.fill()
  drawLogo(ctx, state.logo, iconX, 15 * scale)

  ctx.fillStyle = state.labelColor
  ctx.font = `600 ${12.5 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(state.name, iconX + 17 * scale, 0.5 * scale)
  ctx.restore()
}

export const renderResumeTechTransition: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  const state = getResumeTechTransitionState(progress, width, height)

  if (state.phase === 'resume') {
    state.resumes.forEach((card) => drawResumeCard(ctx, card))
  }

  if (state.phase === 'chips') {
    const scale = Math.min(width / 960, height / 540)
    const floorY = height * 0.86 + 22 * scale
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = Math.max(1, scale)
    ctx.beginPath()
    ctx.moveTo(width * 0.08, floorY)
    ctx.lineTo(width * 0.92, floorY)
    ctx.stroke()
    ctx.restore()
    state.chips.forEach((chipState) => drawTechChip(ctx, chipState))
  }
}

export const resumeTechTransitionViz: VizDef = {
  id: 'resume-tech-transition',
  title: '이력서에서 기술 스택으로',
  subtitle: '이력서 더미가 사라지고 30개의 기술이 쏟아지다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderResumeTechTransition,
}
