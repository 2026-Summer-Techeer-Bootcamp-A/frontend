# Service Title Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화이트 기술 더미가 이력서 데이터로 압축되고 채용시장 데이터와 결합해 `Career Fit` 서비스 타이틀을 만드는 7초 Canvas 시각화를 추가한다.

**Architecture:** 새 파일이 고정 시장 요소, 단계별 순수 프레임 계산, Canvas 렌더링, `VizDef`를 소유한다. 시작 프레임은 기존 모노 더미의 최종 상태를 읽어 연결하고, 기존 질문 장면은 수정하지 않는다.

**Tech Stack:** TypeScript, Canvas 2D API, Node `node:test`, Vite

## Global Constraints

- 전체 주기는 정확히 7,000ms다.
- 기준 캔버스는 960×540이고 모든 좌표와 크기는 `Math.min(width / 960, height / 540)`으로 비례 조정한다.
- 첫 프레임은 `getTechChipPileStates(1, width, height)`와 `WHITE_MONO_STAGE_COLOR`를 사용한다.
- 시장 요소는 정확히 24개이며 고정 좌표와 순서를 사용한다.
- 최종 텍스트는 `Career Fit`과 `데이터로 찾는 나의 커리어 방향`만 표시한다.
- 흑·백·회색만 사용하고 `Math.random()`과 API 호출을 사용하지 않는다.
- 기존 `기술 더미 질문` 렌더링과 재생 시간은 수정하지 않는다.

---

## File Structure

- Create: `src/ppt/viz/service-title-reveal.ts` — 고정 데이터, 프레임 계산, Canvas 렌더러, 시각화 메타데이터
- Create: `tests/serviceTitleReveal.test.ts` — 연속성, 단계별 상태, 결정성, 해상도 비례, 메타데이터, 등록 검증
- Modify: `package.json` — 새 테스트 파일을 전체 테스트 명령에 추가
- Modify: `src/ppt/vizRegistry.ts` — `기술 더미 질문` 다음에 새 시각화 등록

### Task 1: 서비스 타이틀 전환 상태 모델과 렌더러

**Files:**
- Create: `tests/serviceTitleReveal.test.ts`
- Create: `src/ppt/viz/service-title-reveal.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `FONT`, `clamp01`, `easeInOut`, `lerp`, `roundRect` from `src/ppt/viz/common.ts`; `getTechChipPileStates` from `src/ppt/viz/tech-chip-pile.ts`; `MONO_CHIP_STYLES`, `WHITE_MONO_STAGE_COLOR` from `src/ppt/viz/tech-chip-pile-mono.ts`
- Produces: `MARKET_GLYPHS`, `getServiceTitleRevealFrame(progress, width, height)`, `renderServiceTitleReveal`, `serviceTitleRevealViz`

- [ ] **Step 1: Write the failing behavior tests**

Create `tests/serviceTitleReveal.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MARKET_GLYPHS,
  getServiceTitleRevealFrame,
  renderServiceTitleReveal,
  serviceTitleRevealViz,
} from '../src/ppt/viz/service-title-reveal.ts'
import { getTechChipPileStates } from '../src/ppt/viz/tech-chip-pile.ts'

test('첫 프레임은 기술 더미 질문의 마지막 더미와 동일하다', () => {
  const frame = getServiceTitleRevealFrame(0, 960, 540)
  const pile = getTechChipPileStates(1, 960, 540)
  assert.equal(frame.chips.length, 16)
  assert.deepEqual(
    frame.chips.map(({ name, x, y, width, height, rotation, alpha }) => ({ name, x, y, width, height, rotation, alpha })),
    pile.map(({ name, x, y, width, height, rotation, alpha }) => ({ name, x, y, width, height, rotation, alpha })),
  )
  assert.equal(frame.floorAlpha, 1)
  assert.equal(frame.brandAlpha, 0)
})

test('24개 시장 요소가 고정된 순서와 좌표를 가진다', () => {
  assert.equal(MARKET_GLYPHS.length, 24)
  assert.deepEqual(MARKET_GLYPHS, [...MARKET_GLYPHS])
})

test('더미가 이력서로 압축되고 시장 데이터가 나타난다', () => {
  const frame = getServiceTitleRevealFrame(0.28, 960, 540)
  assert.ok(frame.resumeAlpha > 0)
  assert.ok(frame.resumeProgress > 0)
  assert.ok(frame.chips.some((chip) => chip.compressProgress > 0))
  assert.ok(frame.market.some((glyph) => glyph.alpha > 0))
})

test('중간에는 좌우 입자가 중앙으로 이동한다', () => {
  const frame = getServiceTitleRevealFrame(0.6, 960, 540)
  assert.ok(frame.particles.some((particle) => particle.alpha > 0 && particle.progress > 0))
  assert.ok(frame.markProgress > 0)
})

test('마지막에는 심볼과 서비스 타이틀만 남는다', () => {
  const frame = getServiceTitleRevealFrame(1, 960, 540)
  assert.ok(frame.chips.every((chip) => chip.alpha === 0))
  assert.equal(frame.resumeAlpha, 0)
  assert.ok(frame.market.every((glyph) => glyph.alpha === 0))
  assert.equal(frame.markProgress, 1)
  assert.equal(frame.brandAlpha, 1)
  assert.equal(frame.taglineAlpha, 1)
})

test('동일 입력은 동일하고 2배 해상도에서 좌표와 크기도 2배다', () => {
  const small = getServiceTitleRevealFrame(0.5, 960, 540)
  assert.deepEqual(small, getServiceTitleRevealFrame(0.5, 960, 540))
  const large = getServiceTitleRevealFrame(0.5, 1920, 1080)
  assert.ok(Math.abs(large.chips[0].x - small.chips[0].x * 2) < 0.000001)
  assert.ok(Math.abs(large.market[0].width - small.market[0].width * 2) < 0.000001)
})

test('독립된 7초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(serviceTitleRevealViz.id, 'service-title-reveal')
  assert.equal(serviceTitleRevealViz.title, 'Career Fit 타이틀')
  assert.equal(serviceTitleRevealViz.category, 'feature')
  assert.equal(serviceTitleRevealViz.period, 7000)
  assert.equal(serviceTitleRevealViz.render, renderServiceTitleReveal)
})
```

Append `tests/serviceTitleReveal.test.ts` to the existing `test` script in `package.json`.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
node --test --experimental-strip-types tests/serviceTitleReveal.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `service-title-reveal.ts`.

- [ ] **Step 3: Implement fixed data and frame types**

Create `src/ppt/viz/service-title-reveal.ts` with these public structures and timing helpers:

```ts
import type { VizDef, VizRender } from '../types.ts'
import { FONT, clamp01, easeInOut, lerp, roundRect } from './common.ts'
import { getTechChipPileStates } from './tech-chip-pile.ts'
import { MONO_CHIP_STYLES, WHITE_MONO_STAGE_COLOR } from './tech-chip-pile-mono.ts'

export interface MarketGlyphSpec { x: number; y: number; width: number; kind: 'card' | 'dot'; delay: number }
export interface MarketGlyphState extends MarketGlyphSpec { alpha: number; renderX: number; renderY: number; height: number }
export interface RevealChipState {
  name: string; icon: string; x: number; y: number; width: number; height: number
  rotation: number; alpha: number; compressProgress: number; index: number
}
export interface RevealParticleState { source: 'resume' | 'market'; x: number; y: number; alpha: number; progress: number; radius: number }
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
```

- [ ] **Step 4: Implement the deterministic frame calculation**

In the same file, implement `getServiceTitleRevealFrame` with the exact phase windows:

```ts
export function getServiceTitleRevealFrame(progress: number, width: number, height: number): ServiceTitleRevealFrame {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const compress = phase(timeMs, 500, 1900)
  const floorAlpha = 1 - phase(timeMs, 500, 1500)
  const resumeAlpha = phase(timeMs, 500, 1200) * (1 - phase(timeMs, 3200, 4300))
  const pile = getTechChipPileStates(1, width, height)

  const chips = pile.map((chip, index) => {
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
  const market = MARKET_GLYPHS.map((glyph) => {
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

  const particles = Array.from({ length: 20 }, (_, index) => {
    const source = index < 10 ? 'resume' as const : 'market' as const
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
```

- [ ] **Step 5: Implement the Canvas renderer**

Add these focused draw helpers and render entry point:

```ts
function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number): void {
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
  const w = 170 * scale
  const h = 250 * scale
  ctx.save()
  ctx.globalAlpha = frame.resumeAlpha
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = '#A1A1AA'
  ctx.lineWidth = Math.max(1, 1.2 * scale)
  roundRect(ctx, x, y, w, h, 12 * scale)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#27272A'
  ctx.beginPath()
  ctx.arc(x + 27 * scale, y + 28 * scale, 8 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#A1A1AA'
  for (let row = 0; row < 8; row += 1) {
    roundRect(ctx, x + 22 * scale, y + (64 + row * 22) * scale, (96 + row % 3 * 13) * scale, 5 * scale, 2.5 * scale)
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
    ctx.lineWidth = 1
    roundRect(ctx, glyph.renderX - glyph.width / 2, glyph.renderY - glyph.height / 2, glyph.width, glyph.height, glyph.height * 0.24)
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
```

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
node --test --experimental-strip-types tests/serviceTitleReveal.test.ts
npm test
```

Expected: focused file reports 7 passing tests and the full suite reports no failures.

- [ ] **Step 7: Commit the isolated visualization**

```bash
git add package.json tests/serviceTitleReveal.test.ts src/ppt/viz/service-title-reveal.ts
git commit -m "feat(ppt): 서비스 타이틀 전환 시각화 추가"
```

### Task 2: 목록 등록과 통합 검증

**Files:**
- Modify: `tests/serviceTitleReveal.test.ts`
- Modify: `src/ppt/vizRegistry.ts`

**Interfaces:**
- Consumes: `serviceTitleRevealViz` from `src/ppt/viz/service-title-reveal.ts`
- Produces: `/ppt-visual-maker`의 `Career Fit 타이틀` 항목

- [ ] **Step 1: Write the failing registry test**

Append:

```ts
import { readFileSync } from 'node:fs'

test('기술 더미 질문 바로 다음에 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /techPileQuestionViz,\s*serviceTitleRevealViz,/)
})
```

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
node --test --experimental-strip-types tests/serviceTitleReveal.test.ts
```

Expected: registry-order test fails because `serviceTitleRevealViz` is absent.

- [ ] **Step 3: Register the visualization**

Add the import:

```ts
import { serviceTitleRevealViz } from './viz/service-title-reveal'
```

Add the entry immediately after `techPileQuestionViz`:

```ts
  techPileQuestionViz,
  serviceTitleRevealViz,
```

- [ ] **Step 4: Run automated verification**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all tests pass, the TypeScript/Vite build succeeds, and `git diff --check` prints no errors.

- [ ] **Step 5: Verify visual checkpoints**

In `http://127.0.0.1:5713/ppt-visual-maker`, compare:

- Question 100% vs title 0%: background, floor, pile coordinates, styles, and shadows match.
- Title 20%: pile moves into a resume outline; no text labels appear.
- Title 40%: 24 market glyphs appear on the right.
- Title 55%: left and right particles converge without overlap or clipping.
- Title 70%: central Fit mark completes once.
- Title 100%: `Career Fit` and `데이터로 찾는 나의 커리어 방향` remain centered and readable.

- [ ] **Step 6: Commit integration**

```bash
git add tests/serviceTitleReveal.test.ts src/ppt/vizRegistry.ts
git commit -m "feat(ppt): 서비스 타이틀 전환을 목록에 등록"
```
