// 이력서 더미 → 컬러 기술 칩 전환: 이력서 6장이 완전히 퇴장한 뒤
// 공식 로고 기술 칩 30개와 역량 개념 칩 10개가 섞여 낙하하는 독립 장면이다.

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

export type ResumeTechCategory = 'language' | 'platform' | 'infra' | 'concept'
export type ResumeTechPhase = 'resume' | 'gap' | 'chips'
export type ResumeChipKind = 'technology' | 'concept'
export type ConceptSymbol =
  | 'traffic'
  | 'msa'
  | 'security'
  | 'distributed'
  | 'availability'
  | 'performance'
  | 'realtime'
  | 'pipeline'
  | 'incident'
  | 'observability'
  | 'api'
  | 'cloud'
  | 'testing'

export interface CanvasLogo {
  path: string
  color: string
  viewBoxWidth: number
  viewBoxHeight: number
}

export interface ResumeTechChipSpec {
  name: string
  kind: ResumeChipKind
  category: ResumeTechCategory
  logo?: CanvasLogo
  symbol?: ConceptSymbol
  row: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  finalOffsetX: number
  finalOffsetY: number
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

const PERIOD_MS = 11000
const RESUME_STARTS_MS = [330, 968, 1606, 2244, 2882, 3520] as const
const RESUME_ARRIVAL_MS = 715
const RESUME_EXIT_START_MS = 4730
const RESUME_EXIT_END_MS = 5720
const CHIP_START_MS = 5940
const CHIP_GAP_MS = 80
const CHIP_DROP_MS = 900

const CATEGORY_STYLES: Record<ResumeTechCategory, { fill: string; border: string }> = {
  language: { fill: '#315F9E', border: '#6EA8FE' },
  platform: { fill: '#1F7650', border: '#34D17F' },
  infra: { fill: '#9A5B1F', border: '#E2933F' },
  concept: { fill: '#4A3564', border: '#A78BC7' },
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

// 아래가 넓고 위로 갈수록 좁아지되, 같은 열이 생기지 않도록 X/Y/회전을
// 칩마다 다르게 고정한다. 무작위처럼 보이면서 탐색·MP4 결과는 항상 같다.
const PILE_SLOTS = [
  { row: 0, x: -310, y: 0, rotation: -0.052 },
  { row: 0, x: -216, y: 3, rotation: 0.031 },
  { row: 0, x: -118, y: -2, rotation: -0.024 },
  { row: 0, x: -14, y: 2, rotation: 0.046 },
  { row: 0, x: 91, y: -4, rotation: -0.035 },
  { row: 0, x: 202, y: 1, rotation: 0.026 },
  { row: 0, x: 309, y: -3, rotation: -0.041 },
  { row: 1, x: -298, y: 1, rotation: 0.037 },
  { row: 1, x: -204, y: -4, rotation: -0.049 },
  { row: 1, x: -105, y: 3, rotation: 0.022 },
  { row: 1, x: 4, y: -2, rotation: -0.032 },
  { row: 1, x: 112, y: 4, rotation: 0.051 },
  { row: 1, x: 219, y: -1, rotation: -0.021 },
  { row: 1, x: 304, y: 2, rotation: 0.043 },
  { row: 2, x: -274, y: -3, rotation: -0.028 },
  { row: 2, x: -163, y: 2, rotation: 0.047 },
  { row: 2, x: -51, y: -4, rotation: -0.039 },
  { row: 2, x: 61, y: 1, rotation: 0.019 },
  { row: 2, x: 174, y: 4, rotation: -0.055 },
  { row: 2, x: 281, y: -2, rotation: 0.034 },
  { row: 3, x: -283, y: 3, rotation: 0.025 },
  { row: 3, x: -169, y: -3, rotation: -0.045 },
  { row: 3, x: -47, y: 2, rotation: 0.052 },
  { row: 3, x: 72, y: -4, rotation: -0.018 },
  { row: 3, x: 183, y: 1, rotation: 0.041 },
  { row: 3, x: 287, y: 4, rotation: -0.033 },
  { row: 4, x: -235, y: -2, rotation: -0.048 },
  { row: 4, x: -113, y: 4, rotation: 0.029 },
  { row: 4, x: 13, y: -3, rotation: -0.022 },
  { row: 4, x: 139, y: 2, rotation: 0.054 },
  { row: 4, x: 246, y: -1, rotation: -0.037 },
  { row: 5, x: -242, y: 3, rotation: 0.044 },
  { row: 5, x: -121, y: -4, rotation: -0.031 },
  { row: 5, x: 7, y: 1, rotation: 0.023 },
  { row: 5, x: 132, y: -2, rotation: -0.051 },
  { row: 5, x: 238, y: 4, rotation: 0.035 },
  { row: 6, x: -178, y: -3, rotation: -0.026 },
  { row: 6, x: -57, y: 3, rotation: 0.049 },
  { row: 6, x: 76, y: -2, rotation: -0.042 },
  { row: 6, x: 184, y: 2, rotation: 0.027 },
  { row: 7, x: -119, y: 2, rotation: 0.038 },
  { row: 7, x: 8, y: -3, rotation: -0.047 },
  { row: 7, x: 128, y: 1, rotation: 0.024 },
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
  const slot = PILE_SLOTS[index]
  return {
    name,
    kind: 'technology',
    category,
    logo,
    row: slot.row,
    finalOffsetX: slot.x,
    finalOffsetY: slot.y,
    finalRotation: slot.rotation,
    driftX: [-61, 47, -38, 56, -49, 34, 68, -43, 51, -57][index % 10],
  }
}

function conceptChip(name: string, symbol: ConceptSymbol, index: number): ResumeTechChipSpec {
  const state = chip(name, 'concept', { path: '', color: '#E7D8F8', viewBoxWidth: 24, viewBoxHeight: 24 }, index)
  return { ...state, kind: 'concept', logo: undefined, symbol }
}

// 아래 행부터 위 행 순으로 떨어지되 분야 색상이 층마다 자연스럽게 섞이도록 고정한다.
export const RESUME_TECH_CHIPS: ResumeTechChipSpec[] = [
  chip('Java', 'language', simpleLogo(siOpenjdk), 0),
  chip('Spring', 'platform', simpleLogo(siSpring), 1),
  conceptChip('대규모 트래픽 처리', 'traffic', 2),
  chip('AWS', 'infra', awsLogo(), 3),
  chip('Python', 'language', simpleLogo(siPython), 4),
  conceptChip('API 설계', 'api', 5),
  chip('Docker', 'infra', simpleLogo(siDocker), 6),
  chip('React', 'platform', simpleLogo(siReact), 7),
  conceptChip('MSA', 'msa', 8),
  chip('TypeScript', 'language', simpleLogo(siTypescript), 9),
  chip('Kafka', 'platform', simpleLogo(siApachekafka), 10),
  chip('Kubernetes', 'infra', simpleLogo(siKubernetes), 11),
  conceptChip('보안', 'security', 12),
  chip('Redis', 'platform', simpleLogo(siRedis), 13),
  chip('Go', 'language', simpleLogo(siGo), 14),
  conceptChip('클라우드 아키텍처', 'cloud', 15),
  chip('MySQL', 'platform', simpleLogo(siMysql), 16),
  chip('Git', 'infra', simpleLogo(siGit), 17),
  conceptChip('분산 시스템', 'distributed', 18),
  chip('Vue', 'platform', simpleLogo(siVuedotjs), 19),
  chip('Swift', 'language', simpleLogo(siSwift), 20),
  chip('PostgreSQL', 'platform', simpleLogo(siPostgresql), 21),
  conceptChip('고가용성', 'availability', 22),
  chip('Linux', 'infra', simpleLogo(siLinux), 23),
  chip('Node.js', 'platform', simpleLogo(siNodedotjs), 24),
  conceptChip('테스트 자동화', 'testing', 25),
  chip('Kotlin', 'language', simpleLogo(siKotlin), 26),
  chip('MongoDB', 'platform', simpleLogo(siMongodb), 27),
  conceptChip('성능 최적화', 'performance', 28),
  chip('Terraform', 'infra', simpleLogo(siTerraform), 29),
  chip('Django', 'platform', simpleLogo(siDjango), 30),
  chip('Ruby', 'language', simpleLogo(siRuby), 31),
  conceptChip('실시간 처리', 'realtime', 32),
  chip('Nginx', 'infra', simpleLogo(siNginx), 33),
  chip('JavaScript', 'language', simpleLogo(siJavascript), 34),
  conceptChip('데이터 파이프라인', 'pipeline', 35),
  chip('FastAPI', 'platform', simpleLogo(siFastapi), 36),
  chip('PHP', 'language', simpleLogo(siPhp), 37),
  conceptChip('장애 대응', 'incident', 38),
  chip('GraphQL', 'platform', simpleLogo(siGraphql), 39),
  chip('Rust', 'language', simpleLogo(siRust), 40),
  conceptChip('모니터링·관측성', 'observability', 41),
  chip('Next.js', 'platform', simpleLogo(siNextdotjs), 42),
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
  const rowGap = 31 * scale

  return RESUME_TECH_CHIPS.map((tech, index) => {
    const local = clamp01((timeMs - CHIP_START_MS - index * CHIP_GAP_MS) / CHIP_DROP_MS)
    const fall = clamp01(local / 0.78)
    const bounce = clamp01((local - 0.78) / 0.22)
    const targetX = width * 0.5 + tech.finalOffsetX * scale
    const targetY = floorY - chipHeight / 2 - tech.row * rowGap + tech.finalOffsetY * scale
    const startX = targetX + tech.driftX * scale
    const startY = -60 * scale
    const bounceLift = bounce > 0 && bounce < 1
      ? Math.sin(bounce * Math.PI) * 10 * scale * (1 - bounce * 0.35)
      : 0
    const style = CATEGORY_STYLES[tech.category]
    const labelUnits = Array.from(tech.name).reduce(
      (sum, character) => sum + (character.charCodeAt(0) > 127 ? 1.65 : 1),
      0,
    )
    return {
      ...tech,
      visible: timeMs > CHIP_START_MS && local > 0,
      settled: local >= 1,
      alpha: clamp01(local / 0.1),
      x: lerp(startX, targetX, fall),
      y: lerp(startY, targetY, fall * fall) - bounceLift,
      width: (50 + labelUnits * 6.6) * scale,
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

function drawConceptSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: ConceptSymbol,
  centerX: number,
  size: number,
): void {
  const half = size / 2
  const nodeRadius = size * 0.105
  ctx.save()
  ctx.translate(centerX, 0)
  ctx.strokeStyle = '#E7D8F8'
  ctx.fillStyle = '#E7D8F8'
  ctx.lineWidth = Math.max(1.2, size * 0.09)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  switch (symbol) {
    case 'traffic':
      ctx.moveTo(-half * 0.7, half * 0.55)
      ctx.lineTo(-half * 0.2, 0)
      ctx.lineTo(half * 0.12, half * 0.18)
      ctx.lineTo(half * 0.68, -half * 0.58)
      ctx.moveTo(half * 0.3, -half * 0.58)
      ctx.lineTo(half * 0.68, -half * 0.58)
      ctx.lineTo(half * 0.64, -half * 0.2)
      break
    case 'msa':
      ctx.moveTo(-half * 0.5, -half * 0.42)
      ctx.lineTo(half * 0.5, -half * 0.42)
      ctx.lineTo(half * 0.5, half * 0.42)
      ctx.lineTo(-half * 0.5, half * 0.42)
      ctx.closePath()
      ctx.stroke()
      for (const [x, y] of [[-0.5, -0.42], [0.5, -0.42], [0.5, 0.42], [-0.5, 0.42]] as const) {
        ctx.beginPath()
        ctx.arc(x * half, y * half, nodeRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    case 'security':
      ctx.moveTo(0, -half * 0.72)
      ctx.lineTo(half * 0.58, -half * 0.44)
      ctx.lineTo(half * 0.48, half * 0.2)
      ctx.quadraticCurveTo(0, half * 0.72, 0, half * 0.72)
      ctx.quadraticCurveTo(-half * 0.48, half * 0.2, -half * 0.48, half * 0.2)
      ctx.lineTo(-half * 0.58, -half * 0.44)
      ctx.closePath()
      break
    case 'distributed':
      for (const [x, y] of [[0, 0], [-0.6, -0.48], [0.6, -0.48], [-0.6, 0.48], [0.6, 0.48]] as const) {
        if (x !== 0 || y !== 0) {
          ctx.moveTo(0, 0)
          ctx.lineTo(x * half, y * half)
        }
      }
      ctx.stroke()
      for (const [x, y] of [[0, 0], [-0.6, -0.48], [0.6, -0.48], [-0.6, 0.48], [0.6, 0.48]] as const) {
        ctx.beginPath()
        ctx.arc(x * half, y * half, nodeRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    case 'availability':
      ctx.arc(0, 0, half * 0.68, 0, Math.PI * 2)
      ctx.moveTo(-half * 0.35, 0)
      ctx.lineTo(-half * 0.06, half * 0.3)
      ctx.lineTo(half * 0.42, -half * 0.32)
      break
    case 'performance':
      ctx.arc(0, half * 0.2, half * 0.62, Math.PI, 0)
      ctx.moveTo(0, half * 0.2)
      ctx.lineTo(half * 0.4, -half * 0.25)
      break
    case 'realtime':
      ctx.arc(0, 0, half * 0.68, 0, Math.PI * 2)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -half * 0.42)
      ctx.moveTo(0, 0)
      ctx.lineTo(half * 0.36, half * 0.2)
      break
    case 'pipeline':
      ctx.moveTo(-half * 0.7, 0)
      ctx.lineTo(half * 0.7, 0)
      ctx.moveTo(half * 0.4, -half * 0.28)
      ctx.lineTo(half * 0.7, 0)
      ctx.lineTo(half * 0.4, half * 0.28)
      ctx.stroke()
      for (const x of [-0.58, -0.08, 0.42]) {
        ctx.beginPath()
        ctx.arc(x * half, 0, nodeRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      return
    case 'incident':
      ctx.moveTo(0, -half * 0.7)
      ctx.lineTo(half * 0.7, half * 0.62)
      ctx.lineTo(-half * 0.7, half * 0.62)
      ctx.closePath()
      ctx.moveTo(0, -half * 0.25)
      ctx.lineTo(0, half * 0.2)
      break
    case 'observability':
      ctx.moveTo(-half * 0.74, 0)
      ctx.quadraticCurveTo(0, -half * 0.72, half * 0.74, 0)
      ctx.quadraticCurveTo(0, half * 0.72, -half * 0.74, 0)
      ctx.closePath()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, nodeRadius * 1.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    case 'api':
      ctx.moveTo(-half * 0.68, -half * 0.5)
      ctx.lineTo(-half * 0.38, 0)
      ctx.lineTo(-half * 0.68, half * 0.5)
      ctx.moveTo(half * 0.68, -half * 0.5)
      ctx.lineTo(half * 0.38, 0)
      ctx.lineTo(half * 0.68, half * 0.5)
      ctx.moveTo(-half * 0.14, half * 0.58)
      ctx.lineTo(half * 0.14, -half * 0.58)
      break
    case 'cloud':
      ctx.moveTo(-half * 0.62, half * 0.34)
      ctx.bezierCurveTo(-half * 0.88, half * 0.12, -half * 0.7, -half * 0.18, -half * 0.42, -half * 0.18)
      ctx.bezierCurveTo(-half * 0.28, -half * 0.66, half * 0.38, -half * 0.66, half * 0.48, -half * 0.16)
      ctx.bezierCurveTo(half * 0.82, -half * 0.1, half * 0.86, half * 0.34, half * 0.54, half * 0.4)
      ctx.lineTo(-half * 0.62, half * 0.4)
      break
    case 'testing':
      ctx.arc(0, 0, half * 0.68, 0, Math.PI * 2)
      ctx.moveTo(-half * 0.36, 0)
      ctx.lineTo(-half * 0.08, half * 0.3)
      ctx.lineTo(half * 0.44, -half * 0.34)
      break
  }

  ctx.stroke()
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
  ctx.fillStyle = state.kind === 'concept' ? 'rgba(31,20,46,0.72)' : 'rgba(255,255,255,0.94)'
  ctx.beginPath()
  ctx.arc(iconX, 0, 11.5 * scale, 0, Math.PI * 2)
  ctx.fill()
  if (state.kind === 'concept' && state.symbol) {
    drawConceptSymbol(ctx, state.symbol, iconX, 15 * scale)
  } else if (state.logo) {
    drawLogo(ctx, state.logo, iconX, 15 * scale)
  }

  ctx.fillStyle = state.labelColor
  ctx.font = `600 ${(state.kind === 'concept' ? 11.5 : 12.5) * scale}px ${FONT}`
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
  subtitle: '이력서 더미가 사라지고 43개의 기술·개념이 쏟아지다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderResumeTechTransition,
}
