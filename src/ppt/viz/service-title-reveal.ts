// 서비스 타이틀 전환: 질문 장면에 남은 기술 더미를 이력서로 압축하고,
// 오른쪽의 채용시장 데이터와 결합해 Career Fit 브랜드를 완성한다.

import type { VizDef, VizRender } from '../types.ts'
import { FONT, clamp01, easeInOut, lerp, roundRect } from './common.ts'
import { getTechChipPileStates } from './tech-chip-pile.ts'
import { MONO_CHIP_STYLES, WHITE_MONO_STAGE_COLOR } from './tech-chip-pile-mono.ts'

export interface MarketGlyphSpec {
  x: number
  y: number
  width: number
  kind: 'card' | 'dot'
  delay: number
}

export interface MarketGlyphState extends MarketGlyphSpec {
  alpha: number
  renderX: number
  renderY: number
  height: number
}

export interface RevealChipState {
  name: string
  icon: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  alpha: number
  compressProgress: number
  index: number
}

export interface RevealParticleState {
  source: 'resume' | 'market'
  x: number
  y: number
  alpha: number
  progress: number
  radius: number
}

export interface ServiceTitleRevealFrame {
  chips: RevealChipState[]
  floorAlpha: number
  resumeAlpha: number
  resumeProgress: number
  market: MarketGlyphState[]
  particles: RevealParticleState[]
  markProgress: number
  markScale: number
  brandAlpha: number
  taglineAlpha: number
}

export const MARKET_GLYPHS: MarketGlyphSpec[] = Array.from({ length: 24 }, (_, index) => ({
  x: 646 + (index % 4) * 62 + (Math.floor(index / 4) % 2) * 12,
  y: 126 + Math.floor(index / 4) * 54,
  width: index % 3 === 0 ? 42 : 34,
  kind: index % 5 === 0 ? 'dot' : 'card',
  delay: index * 34,
}))

const PERIOD_MS = 7000

function phase(timeMs: number, startMs: number, endMs: number): number {
  return easeInOut(clamp01((timeMs - startMs) / (endMs - startMs)))
}

export function getServiceTitleRevealFrame(
  progress: number,
  width: number,
  height: number,
): ServiceTitleRevealFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const compress = phase(timeMs, 500, 1900)
  const floorAlpha = 1 - phase(timeMs, 500, 1500)
  const resumeAlpha = phase(timeMs, 500, 1200) * (1 - phase(timeMs, 3200, 4300))
  const pile = getTechChipPileStates(1, width, height)

  const chips = pile.map((chip, index): RevealChipState => {
    const targetX = (174 + (index % 2) * 62) * scale
    const targetY = (178 + Math.floor(index / 2) * 27) * scale
    const targetScale = 0.34

    return {
      name: chip.name,
      icon: chip.icon,
      index,
      x: lerp(chip.x, targetX, compress),
      y: lerp(chip.y, targetY, compress),
      width: lerp(chip.width, chip.width * targetScale, compress),
      height: lerp(chip.height, chip.height * targetScale, compress),
      rotation: lerp(chip.rotation, 0, compress),
      alpha: 1 - phase(timeMs, 3000, 4200),
      compressProgress: compress,
    }
  })

  const marketFadeOut = 1 - phase(timeMs, 3200, 4300)
  const market = MARKET_GLYPHS.map((glyph): MarketGlyphState => {
    const appear = phase(timeMs, 1500 + glyph.delay, 2100 + glyph.delay)

    return {
      ...glyph,
      alpha: appear * marketFadeOut,
      renderX: glyph.x * scale,
      renderY: glyph.y * scale,
      width: glyph.width * scale,
      height: (glyph.kind === 'dot' ? 8 : 18) * scale,
    }
  })

  const particles = Array.from({ length: 20 }, (_, index): RevealParticleState => {
    const source: RevealParticleState['source'] = index < 10 ? 'resume' : 'market'
    const local = phase(timeMs, 2600 + (index % 10) * 55, 3900 + (index % 10) * 55)
    const startX = (source === 'resume' ? 270 : 690) * scale
    const startY = (180 + (index % 10) * 22) * scale
    const endX = 480 * scale
    const endY = 245 * scale
    const curve = (source === 'resume' ? -1 : 1) * Math.sin(local * Math.PI) * 38 * scale

    return {
      source,
      x: lerp(startX, endX, local),
      y: lerp(startY, endY, local) + curve,
      alpha: local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0,
      progress: local,
      radius: (2 + index % 3) * scale,
    }
  })

  const markProgress = phase(timeMs, 4100, 4900)
  const pulse = Math.sin(markProgress * Math.PI) * 0.12

  return {
    chips,
    floorAlpha,
    resumeAlpha,
    resumeProgress: compress,
    market,
    particles,
    markProgress,
    markScale: 1 + pulse,
    brandAlpha: phase(timeMs, 4900, 5400),
    taglineAlpha: phase(timeMs, 5200, 5600),
  }
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha: number,
): void {
  if (alpha <= 0) return
  const scale = Math.min(width / 960, height / 540)
  const floorY = height * 0.82 + 27 * scale

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = 'rgba(24,24,27,0.15)'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(width * 0.16, floorY)
  ctx.lineTo(width * 0.84, floorY)
  ctx.stroke()
  ctx.restore()
}

function drawResume(
  ctx: CanvasRenderingContext2D,
  frame: ServiceTitleRevealFrame,
  width: number,
  height: number,
): void {
  if (frame.resumeAlpha <= 0) return
  const scale = Math.min(width / 960, height / 540)
  const x = 125 * scale
  const y = 145 * scale
  const cardWidth = 170 * scale
  const cardHeight = 250 * scale

  ctx.save()
  ctx.globalAlpha = frame.resumeAlpha
  ctx.shadowColor = 'rgba(24,24,27,0.08)'
  ctx.shadowBlur = 16 * scale
  ctx.shadowOffsetY = 6 * scale
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = '#A1A1AA'
  ctx.lineWidth = Math.max(1, 1.2 * scale)
  roundRect(ctx, x, y, cardWidth, cardHeight, 12 * scale)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.stroke()

  ctx.fillStyle = '#27272A'
  ctx.beginPath()
  ctx.arc(x + 27 * scale, y + 28 * scale, 8 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#A1A1AA'
  for (let row = 0; row < 8; row += 1) {
    roundRect(
      ctx,
      x + 22 * scale,
      y + (64 + row * 22) * scale,
      (96 + row % 3 * 13) * scale,
      5 * scale,
      2.5 * scale,
    )
    ctx.fill()
  }
  ctx.restore()
}

function drawMarketGlyph(ctx: CanvasRenderingContext2D, glyph: MarketGlyphState): void {
  if (glyph.alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = glyph.alpha
  if (glyph.kind === 'dot') {
    ctx.fillStyle = '#71717A'
    ctx.beginPath()
    ctx.arc(glyph.renderX, glyph.renderY, glyph.height / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = '#A1A1AA'
    ctx.lineWidth = Math.max(1, glyph.height / 18)
    roundRect(
      ctx,
      glyph.renderX - glyph.width / 2,
      glyph.renderY - glyph.height / 2,
      glyph.width,
      glyph.height,
      glyph.height * 0.24,
    )
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#71717A'
    ctx.beginPath()
    ctx.moveTo(glyph.renderX - glyph.width * 0.3, glyph.renderY)
    ctx.lineTo(glyph.renderX + glyph.width * 0.22, glyph.renderY)
    ctx.stroke()
  }
  ctx.restore()
}

function drawRevealChip(ctx: CanvasRenderingContext2D, chip: RevealChipState): void {
  if (chip.alpha <= 0) return
  const style = MONO_CHIP_STYLES[chip.index]
  const scale = chip.height / 42

  ctx.save()
  ctx.globalAlpha = chip.alpha
  ctx.translate(chip.x, chip.y)
  ctx.rotate(chip.rotation)
  ctx.shadowColor = 'rgba(0,0,0,0.32)'
  ctx.shadowBlur = 11 * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = style.fill
  roundRect(ctx, -chip.width / 2, -chip.height / 2, chip.width, chip.height, chip.height / 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  const iconX = -chip.width / 2 + 21 * scale
  ctx.fillStyle = style.iconFill
  ctx.beginPath()
  ctx.arc(iconX, 0, 12 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = style.iconText
  ctx.font = `800 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(chip.icon, iconX, 0.5 * scale)

  if (scale > 0.55) {
    ctx.fillStyle = style.text
    ctx.font = `600 ${14 * scale}px ${FONT}`
    ctx.textAlign = 'left'
    ctx.fillText(chip.name, iconX + 19 * scale, 0.5 * scale)
  }
  ctx.restore()
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: RevealParticleState): void {
  if (particle.alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = particle.alpha
  ctx.fillStyle = particle.source === 'resume' ? '#27272A' : '#71717A'
  ctx.beginPath()
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFitMarkAndBrand(
  ctx: CanvasRenderingContext2D,
  frame: ServiceTitleRevealFrame,
  width: number,
  height: number,
): void {
  if (frame.markProgress <= 0) return
  const scale = Math.min(width / 960, height / 540)
  const markX = lerp(480, 401, frame.brandAlpha) * scale
  const markY = 245 * scale
  const size = 36 * scale * frame.markScale

  ctx.save()
  ctx.globalAlpha = frame.markProgress
  ctx.fillStyle = '#18181B'
  roundRect(ctx, markX - size / 2, markY - size / 2, size, size, 10 * scale)
  ctx.fill()
  ctx.fillStyle = '#F7F7F5'
  ctx.beginPath()
  ctx.moveTo(markX - 7 * scale, markY + 7 * scale)
  ctx.lineTo(markX + 8 * scale, markY - 8 * scale)
  ctx.lineTo(markX + 8 * scale, markY + 8 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = frame.brandAlpha
  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${38 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Career Fit', 432 * scale, markY)
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

export const renderServiceTitleReveal: VizRender = (ctx, width, height, progress) => {
  ctx.fillStyle = WHITE_MONO_STAGE_COLOR
  ctx.fillRect(0, 0, width, height)
  const frame = getServiceTitleRevealFrame(progress, width, height)

  drawFloor(ctx, width, height, frame.floorAlpha)
  drawResume(ctx, frame, width, height)
  frame.market.forEach((glyph) => drawMarketGlyph(ctx, glyph))
  frame.chips.forEach((chip) => drawRevealChip(ctx, chip))
  frame.particles.forEach((particle) => drawParticle(ctx, particle))
  drawFitMarkAndBrand(ctx, frame, width, height)
}

export const serviceTitleRevealViz: VizDef = {
  id: 'service-title-reveal',
  title: 'Career Fit 타이틀',
  subtitle: '이력서와 시장 데이터가 만나 커리어 방향이 되다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderServiceTitleReveal,
}
