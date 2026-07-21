// 방향 발견 서비스 타이틀: 다섯 후보 경로를 탐색한 뒤 하나의 방향만 남기고,
// 선택된 도착점을 Career Fit 브랜드로 전환한다.

import type { VizDef, VizRender } from '../types.ts'
import { FONT, clamp01, easeInOut, lerp, roundRect } from './common.ts'
import { WHITE_MONO_STAGE_COLOR } from './tech-chip-pile-mono.ts'

export interface DirectionPoint {
  x: number
  y: number
}

export interface DirectionPathSpec {
  start: DirectionPoint
  control1: DirectionPoint
  control2: DirectionPoint
  end: DirectionPoint
  selected: boolean
}

export interface DirectionPathState extends DirectionPathSpec {
  drawProgress: number
  selectionProgress: number
  alpha: number
  visibleStart: number
  visibleEnd: number
  destinationAlpha: number
  lineWidth: number
}

export interface DirectionScanState {
  pathIndex: number
  progress: number
  x: number
  y: number
  alpha: number
  radius: number
}

export interface ServiceTitleDirectionFrame {
  originAlpha: number
  originPulse: number
  paths: DirectionPathState[]
  scan: DirectionScanState
  absorbProgress: number
  markX: number
  markY: number
  markProgress: number
  markScale: number
  brandAlpha: number
  taglineAlpha: number
}

export const DIRECTION_PATHS: DirectionPathSpec[] = [
  {
    start: { x: 210, y: 270 },
    control1: { x: 338, y: 254 },
    control2: { x: 526, y: 116 },
    end: { x: 720, y: 126 },
    selected: false,
  },
  {
    start: { x: 210, y: 270 },
    control1: { x: 350, y: 260 },
    control2: { x: 530, y: 184 },
    end: { x: 720, y: 198 },
    selected: false,
  },
  {
    start: { x: 210, y: 270 },
    control1: { x: 364, y: 270 },
    control2: { x: 548, y: 270 },
    end: { x: 720, y: 270 },
    selected: true,
  },
  {
    start: { x: 210, y: 270 },
    control1: { x: 350, y: 280 },
    control2: { x: 530, y: 356 },
    end: { x: 720, y: 342 },
    selected: false,
  },
  {
    start: { x: 210, y: 270 },
    control1: { x: 338, y: 286 },
    control2: { x: 526, y: 424 },
    end: { x: 720, y: 414 },
    selected: false,
  },
]

const PERIOD_MS = 7000

function phase(timeMs: number, startMs: number, endMs: number): number {
  return easeInOut(clamp01((timeMs - startMs) / (endMs - startMs)))
}

function scalePoint(point: DirectionPoint, scale: number): DirectionPoint {
  return { x: point.x * scale, y: point.y * scale }
}

function cubicPoint(
  start: DirectionPoint,
  control1: DirectionPoint,
  control2: DirectionPoint,
  end: DirectionPoint,
  progress: number,
): DirectionPoint {
  const t = clamp01(progress)
  const inverse = 1 - t
  const inverse2 = inverse * inverse
  const t2 = t * t

  return {
    x: inverse2 * inverse * start.x
      + 3 * inverse2 * t * control1.x
      + 3 * inverse * t2 * control2.x
      + t2 * t * end.x,
    y: inverse2 * inverse * start.y
      + 3 * inverse2 * t * control1.y
      + 3 * inverse * t2 * control2.y
      + t2 * t * end.y,
  }
}

export function getServiceTitleDirectionFrame(
  progress: number,
  width: number,
  height: number,
): ServiceTitleDirectionFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const originFadeOut = 1 - phase(timeMs, 4100, 4800)
  const absorbProgress = phase(timeMs, 4400, 5100)
  const selectedPathFade = 1 - phase(timeMs, 4500, 5100)
  const rejectionProgress = phase(timeMs, 3100, 4000)

  const paths = DIRECTION_PATHS.map((path, index): DirectionPathState => {
    const drawProgress = phase(timeMs, 700 + index * 100, 1600 + index * 100)
    const selectionProgress = path.selected ? phase(timeMs, 3100, 3700) : 0
    const alpha = path.selected
      ? drawProgress * selectedPathFade
      : drawProgress * (1 - rejectionProgress)
    const visibleStart = path.selected ? absorbProgress : 0
    const visibleEnd = path.selected ? 1 : 1 - rejectionProgress

    return {
      start: scalePoint(path.start, scale),
      control1: scalePoint(path.control1, scale),
      control2: scalePoint(path.control2, scale),
      end: scalePoint(path.end, scale),
      selected: path.selected,
      drawProgress,
      selectionProgress,
      alpha,
      visibleStart,
      visibleEnd,
      destinationAlpha: alpha * (1 - absorbProgress),
      lineWidth: lerp(1.4, 3.2, selectionProgress) * scale,
    }
  })

  let scan: DirectionScanState = {
    pathIndex: -1,
    progress: 0,
    x: DIRECTION_PATHS[0].start.x * scale,
    y: DIRECTION_PATHS[0].start.y * scale,
    alpha: 0,
    radius: 5 * scale,
  }

  if (timeMs > 1700 && timeMs < 3300) {
    const scanProgress = clamp01((timeMs - 1700) / 1600)
    const pathPosition = Math.min(4.999999, scanProgress * 5)
    const pathIndex = Math.floor(pathPosition)
    const local = pathPosition - pathIndex
    const path = paths[pathIndex]
    const point = cubicPoint(path.start, path.control1, path.control2, path.end, local)

    scan = {
      pathIndex,
      progress: local,
      x: point.x,
      y: point.y,
      alpha: Math.sin(local * Math.PI),
      radius: (5 + Math.sin(local * Math.PI) * 3) * scale,
    }
  }

  const selectedEnd = scalePoint(DIRECTION_PATHS[2].end, scale)
  const brandAlpha = phase(timeMs, 5000, 5500)
  const markProgress = phase(timeMs, 4300, 5000)
  const pulse = Math.sin(markProgress * Math.PI) * 0.1

  return {
    originAlpha: phase(timeMs, 0, 400) * originFadeOut,
    originPulse: phase(timeMs, 0, 900) * (1 - phase(timeMs, 900, 1500)),
    paths,
    scan,
    absorbProgress,
    markX: lerp(selectedEnd.x, 401 * scale, absorbProgress),
    markY: lerp(selectedEnd.y, 245 * scale, absorbProgress),
    markProgress,
    markScale: 1 + pulse,
    brandAlpha,
    taglineAlpha: phase(timeMs, 5200, 5700),
  }
}

function tracePathRange(
  ctx: CanvasRenderingContext2D,
  path: DirectionPathState,
  startProgress: number,
  endProgress: number,
): void {
  const start = clamp01(startProgress)
  const end = clamp01(endProgress)
  if (end <= start) return

  const steps = 48
  const first = cubicPoint(path.start, path.control1, path.control2, path.end, start)
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)

  for (let index = 1; index <= steps; index += 1) {
    const t = lerp(start, end, index / steps)
    const point = cubicPoint(path.start, path.control1, path.control2, path.end, t)
    ctx.lineTo(point.x, point.y)
  }
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: DirectionPathState[]): void {
  paths.forEach((path) => {
    if (path.alpha <= 0 || path.drawProgress <= 0) return
    const end = Math.min(path.drawProgress, path.visibleEnd)

    ctx.save()
    ctx.globalAlpha = path.alpha
    ctx.strokeStyle = path.selected && path.selectionProgress > 0 ? '#18181B' : '#C4C4C8'
    ctx.lineWidth = path.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    tracePathRange(ctx, path, path.visibleStart, end)
    ctx.stroke()
    ctx.restore()
  })
}

function drawOrigin(
  ctx: CanvasRenderingContext2D,
  scale: number,
  alpha: number,
  pulse: number,
): void {
  if (alpha <= 0) return
  const x = 210 * scale
  const y = 270 * scale

  ctx.save()
  ctx.globalAlpha = alpha
  if (pulse > 0) {
    ctx.globalAlpha = alpha * (1 - pulse) * 0.48
    ctx.strokeStyle = '#71717A'
    ctx.lineWidth = Math.max(1, scale)
    ctx.beginPath()
    ctx.arc(x, y, (10 + pulse * 30) * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.globalAlpha = alpha
  ctx.fillStyle = '#18181B'
  ctx.beginPath()
  ctx.arc(x, y, 7 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDestinations(ctx: CanvasRenderingContext2D, paths: DirectionPathState[], scale: number): void {
  paths.forEach((path) => {
    if (path.destinationAlpha <= 0) return

    ctx.save()
    ctx.globalAlpha = path.destinationAlpha
    ctx.fillStyle = path.selected && path.selectionProgress > 0 ? '#18181B' : '#F7F7F5'
    ctx.strokeStyle = path.selected && path.selectionProgress > 0 ? '#18181B' : '#A1A1AA'
    ctx.lineWidth = Math.max(1, 1.3 * scale)
    ctx.beginPath()
    ctx.arc(path.end.x, path.end.y, lerp(5, 8, path.selectionProgress) * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  })
}

function drawScanLight(ctx: CanvasRenderingContext2D, scan: DirectionScanState): void {
  if (scan.alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = scan.alpha
  ctx.shadowColor = 'rgba(24,24,27,0.34)'
  ctx.shadowBlur = scan.radius * 2.6
  ctx.fillStyle = '#18181B'
  ctx.beginPath()
  ctx.arc(scan.x, scan.y, scan.radius * 0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFitMarkAndBrand(
  ctx: CanvasRenderingContext2D,
  frame: ServiceTitleDirectionFrame,
  width: number,
  height: number,
): void {
  if (frame.markProgress <= 0) return
  const scale = Math.min(width / 960, height / 540)
  const size = 36 * scale * frame.markScale

  ctx.save()
  ctx.globalAlpha = frame.markProgress
  ctx.fillStyle = '#18181B'
  roundRect(ctx, frame.markX - size / 2, frame.markY - size / 2, size, size, 10 * scale)
  ctx.fill()
  ctx.fillStyle = '#F7F7F5'
  ctx.beginPath()
  ctx.moveTo(frame.markX - 7 * scale, frame.markY + 7 * scale)
  ctx.lineTo(frame.markX + 8 * scale, frame.markY - 8 * scale)
  ctx.lineTo(frame.markX + 8 * scale, frame.markY + 8 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = frame.brandAlpha
  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${38 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Career Fit', 432 * scale, 245 * scale)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = frame.taglineAlpha
  ctx.fillStyle = '#71717A'
  ctx.font = `600 ${18 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('데이터로 찾는 나의 커리어 방향', width / 2, 305 * scale)
  ctx.restore()
}

export const renderServiceTitleDirection: VizRender = (ctx, width, height, progress) => {
  ctx.fillStyle = WHITE_MONO_STAGE_COLOR
  ctx.fillRect(0, 0, width, height)

  const scale = Math.min(width / 960, height / 540)
  const frame = getServiceTitleDirectionFrame(progress, width, height)

  drawPaths(ctx, frame.paths)
  drawOrigin(ctx, scale, frame.originAlpha, frame.originPulse)
  drawDestinations(ctx, frame.paths, scale)
  drawScanLight(ctx, frame.scan)
  drawFitMarkAndBrand(ctx, frame, width, height)
}

export const serviceTitleDirectionViz: VizDef = {
  id: 'service-title-direction',
  title: 'Career Fit 타이틀 · 방향',
  subtitle: '여러 가능성 중 나에게 맞는 커리어 방향을 찾다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderServiceTitleDirection,
}
