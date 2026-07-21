# Resume Tech Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이력서 6장이 쌓인 뒤 완전히 퇴장하고, 공식 컬러 로고와 흰색 기술명을 가진 컬러 기술 칩 30개가 낙하해 쌓이는 독립 Canvas 시각화를 추가한다.

**Architecture:** 새 `resume-tech-transition.ts`가 고정 데이터와 `progress`만으로 이력서·빈 전환·기술 칩 상태를 계산하고 Canvas로 렌더링한다. 기존 이력서 및 기술 칩 렌더러는 재사용하거나 수정하지 않으며, 새 렌더러를 레지스트리에 한 항목으로 등록한다. 순수 상태 계산을 Node 테스트로 검증해 탐색·배속·MP4 내보내기에서 같은 프레임을 보장한다.

**Tech Stack:** TypeScript 5.6, Canvas 2D, Vite 5, Node test runner, `simple-icons` 16.25, `react-icons` 5.7

## Global Constraints

- 작업 브랜치는 `fix/ppt-resume-tech-transition`을 유지한다.
- 기존 `resume-stack-clean.ts`, `tech-chip-pile.ts`, 모노톤 기술 칩, 기술 더미 질문 시각화는 수정하거나 삭제하지 않는다.
- 이력서는 `progress < 0.52`에서만, 기술 칩은 `progress >= 0.54`에서만 표시한다.
- `progress 0.52~0.54`는 두 요소가 모두 없는 빈 스테이지이며 이력서와 칩은 한 프레임에도 함께 표시하지 않는다.
- 기술 칩은 승인된 30개를 정확히 한 번씩 사용한다.
- 칩은 분야별 컬러 배경을 사용하고 기술명은 모두 흰색으로 렌더링한다.
- 이니셜 대신 공식 벡터 로고와 브랜드 컬러를 사용한다.
- 새 런타임 의존성을 설치하지 않는다.
- 배경은 기존 PPT Visual Maker의 다크 스테이지를 사용한다.
- 모든 상태는 결정적이어야 하며 `Math.random()`을 사용하지 않는다.
- 재생 주기는 정확히 `10000ms`다.

---

## File Map

- Create: `src/ppt/viz/resume-tech-transition.ts` — 30개 기술 정의, 공식 로고 매핑, 결정적 상태 계산, Canvas 렌더링, `VizDef` 메타데이터.
- Create: `tests/resumeTechTransition.test.ts` — 타임라인 분리, 30개 기술, 컬러·로고, 결정성, 해상도 비례, 종료 정지 상태 검증.
- Modify: `src/ppt/vizRegistry.ts` — 새 시각화를 기존 항목과 독립적으로 한 번 등록.
- Modify: `package.json` — 기본 `npm test` 명령에 새 테스트 파일 추가.

---

### Task 1: 결정적 타임라인과 30개 기술 상태

**Files:**
- Create: `tests/resumeTechTransition.test.ts`
- Create: `src/ppt/viz/resume-tech-transition.ts`

**Interfaces:**
- Produces: `RESUME_TECH_CHIPS: ResumeTechChipSpec[]`
- Produces: `getResumeTechTransitionState(progress: number, width: number, height: number): ResumeTechTransitionState`
- `ResumeTechTransitionState` contains `phase: 'resume' | 'gap' | 'chips'`, `resumes: ResumeTransitionCardState[]`, `chips: ResumeTechChipState[]`.

- [ ] **Step 1: Write the failing state tests**

Create `tests/resumeTechTransition.test.ts` with the state-focused tests below. The metadata test is added in Task 2.

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RESUME_TECH_CHIPS,
  getResumeTechTransitionState,
} from '../src/ppt/viz/resume-tech-transition.ts'

test('승인된 30개 기술과 세 분야 컬러를 제공한다', () => {
  assert.equal(RESUME_TECH_CHIPS.length, 30)
  assert.equal(new Set(RESUME_TECH_CHIPS.map((chip) => chip.name)).size, 30)
  assert.deepEqual(
    new Set(RESUME_TECH_CHIPS.map((chip) => chip.category)),
    new Set(['language', 'platform', 'infra']),
  )
  assert.ok(RESUME_TECH_CHIPS.every((chip) => chip.logo.path.length > 0))
})

test('이력서와 기술 칩은 어떤 프레임에도 함께 보이지 않는다', () => {
  for (let frame = 0; frame <= 600; frame += 1) {
    const state = getResumeTechTransitionState(frame / 600, 960, 540)
    const resumesVisible = state.resumes.some((card) => card.visible && card.alpha > 0)
    const chipsVisible = state.chips.some((chip) => chip.visible && chip.alpha > 0)
    assert.equal(resumesVisible && chipsVisible, false, `frame ${frame}`)
  }
})

test('52~54% 구간은 완전히 빈 전환이다', () => {
  for (const progress of [0.52, 0.53, 0.5399]) {
    const state = getResumeTechTransitionState(progress, 960, 540)
    assert.equal(state.phase, 'gap')
    assert.equal(state.resumes.some((card) => card.visible), false)
    assert.equal(state.chips.some((chip) => chip.visible), false)
  }
})

test('이력서 6장이 쌓인 뒤 위로 이동하며 사라진다', () => {
  const stacked = getResumeTechTransitionState(0.42, 960, 540)
  const exiting = getResumeTechTransitionState(0.48, 960, 540)
  const gone = getResumeTechTransitionState(0.52, 960, 540)

  assert.equal(stacked.resumes.filter((card) => card.visible).length, 6)
  assert.ok(stacked.resumes.every((card) => card.alpha === 1))
  assert.ok(exiting.resumes[5].y < stacked.resumes[5].y)
  assert.ok(exiting.resumes[5].alpha < 1)
  assert.equal(gone.resumes.some((card) => card.visible), false)
})

test('54% 이후 컬러 기술 칩 30개가 순차 낙하한다', () => {
  const start = getResumeTechTransitionState(0.54, 960, 540)
  const middle = getResumeTechTransitionState(0.72, 960, 540)
  const end = getResumeTechTransitionState(0.92, 960, 540)

  assert.equal(start.chips.filter((chip) => chip.visible).length, 0)
  assert.ok(middle.chips.filter((chip) => chip.visible).length > 0)
  assert.ok(middle.chips.filter((chip) => chip.visible).length < 30)
  assert.ok(end.chips.every((chip) => chip.visible && chip.settled && chip.alpha === 1))
  assert.ok(end.chips.every((chip) => chip.labelColor === '#FFFFFF'))
})

test('마지막 0.8초는 동일한 적층 상태를 유지한다', () => {
  assert.deepEqual(
    getResumeTechTransitionState(0.92, 960, 540),
    getResumeTechTransitionState(1, 960, 540),
  )
})

test('동일 입력은 결정적이고 4K 레이아웃은 720p의 3배다', () => {
  const first = getResumeTechTransitionState(0.76, 1280, 720)
  assert.deepEqual(first, getResumeTechTransitionState(0.76, 1280, 720))

  const small = getResumeTechTransitionState(1, 1280, 720)
  const large = getResumeTechTransitionState(1, 3840, 2160)
  assert.ok(Math.abs(large.chips[0].x - small.chips[0].x * 3) < 0.000001)
  assert.ok(Math.abs(large.chips[0].width - small.chips[0].width * 3) < 0.000001)
  assert.ok(Math.abs(large.resumes[5].width - small.resumes[5].width * 3) < 0.000001)
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run:

```bash
npm exec -- node --test --experimental-strip-types tests/resumeTechTransition.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/ppt/viz/resume-tech-transition.ts`.

- [ ] **Step 3: Implement the data model and deterministic state calculation**

Create `src/ppt/viz/resume-tech-transition.ts`. Start with the imports, types, category styles, timing, and logo adapter below.

```ts
import { Children, isValidElement } from 'react'
import { FaAws } from 'react-icons/fa'
import {
  siOpenjdk, siPython, siJavascript, siTypescript, siGo, siKotlin, siSwift, siRust, siRuby, siPhp,
  siSpring, siReact, siNodedotjs, siDjango, siFastapi, siVuedotjs, siNextdotjs,
  siMysql, siPostgresql, siRedis, siMongodb, siApachekafka, siGraphql,
  siDocker, siKubernetes, siGit, siLinux, siTerraform, siNginx,
} from 'simple-icons'
import type { SimpleIcon } from 'simple-icons'
import type { VizDef, VizRender } from '../types.ts'
import { FONT, clamp01, lerp, easeOut, roundRect, drawBackground } from './common.ts'

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
  [-0.018, 0.018, -0.035], [0.014, 0.014, 0.026], [-0.01, 0.01, -0.018],
  [0.008, 0.006, 0.014], [-0.004, 0.003, -0.008], [0, 0, 0],
] as const

const ENTRY_VECTORS = [
  [-0.72, -0.35, -0.32], [0.72, -0.28, 0.28], [-0.62, 0.42, -0.24],
  [0.62, 0.36, 0.22], [0, -0.75, -0.18], [0, 0.72, 0.16],
] as const

function simpleLogo(icon: SimpleIcon): CanvasLogo {
  return { path: icon.path, color: `#${icon.hex}`, viewBoxWidth: 24, viewBoxHeight: 24 }
}

function awsLogo(): CanvasLogo {
  const element = FaAws({})
  if (!isValidElement<{ children?: unknown }>(element)) {
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
```

Define the exact 30-chip array in bottom-row-first order so lower chips settle before upper rows:

```ts
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
```

Add the deterministic state helpers and exported state function:

```ts
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
```

- [ ] **Step 4: Run the focused state tests**

Run:

```bash
npm exec -- node --test --experimental-strip-types tests/resumeTechTransition.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit the deterministic model**

```bash
git add src/ppt/viz/resume-tech-transition.ts tests/resumeTechTransition.test.ts
git commit -m "feat(ppt): 이력서 기술 전환 상태 추가"
```

---

### Task 2: Canvas 카드·공식 로고·컬러 칩 렌더링

**Files:**
- Modify: `src/ppt/viz/resume-tech-transition.ts`
- Modify: `tests/resumeTechTransition.test.ts`

**Interfaces:**
- Consumes: `getResumeTechTransitionState(progress, width, height)` from Task 1.
- Produces: `renderResumeTechTransition: VizRender`
- Produces: `resumeTechTransitionViz: VizDef`

- [ ] **Step 1: Add the failing renderer metadata test**

Append imports and the test below to `tests/resumeTechTransition.test.ts`:

```ts
import {
  renderResumeTechTransition,
  resumeTechTransitionViz,
} from '../src/ppt/viz/resume-tech-transition.ts'

test('독립된 10초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(resumeTechTransitionViz.id, 'resume-tech-transition')
  assert.equal(resumeTechTransitionViz.title, '이력서에서 기술 스택으로')
  assert.equal(resumeTechTransitionViz.category, 'feature')
  assert.equal(resumeTechTransitionViz.period, 10000)
  assert.equal(resumeTechTransitionViz.render, renderResumeTechTransition)
})
```

Place the new names in the existing import block instead of creating a second import from the same module.

- [ ] **Step 2: Run the focused test and verify the missing export failure**

Run:

```bash
npm exec -- node --test --experimental-strip-types tests/resumeTechTransition.test.ts
```

Expected: FAIL because `renderResumeTechTransition` and `resumeTechTransitionViz` are not exported.

- [ ] **Step 3: Implement isolated Canvas drawing**

Append the following drawing helpers and renderer to `src/ppt/viz/resume-tech-transition.ts`. Do not call `drawTopLabel` or `drawCaption`; the story remains text-free except for the resume label and chip names.

```ts
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
    ctx.fillRect(left, top + (83 + row * 31) * scale, (card.width - 56 * scale) * ratio, (row === 0 ? 5 : 4) * scale)
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
  ctx.translate(centerX - logo.viewBoxWidth * pathScale / 2, -logo.viewBoxHeight * pathScale / 2)
  ctx.scale(pathScale, pathScale)
  ctx.fillStyle = logo.color
  ctx.fill(path)
  ctx.restore()
}

function drawTechChip(ctx: CanvasRenderingContext2D, chipState: ResumeTechChipState): void {
  if (!chipState.visible || chipState.alpha <= 0) return
  const scale = chipState.height / 36
  ctx.save()
  ctx.translate(chipState.x, chipState.y)
  ctx.rotate(chipState.rotation)
  ctx.globalAlpha = chipState.alpha
  ctx.shadowColor = 'rgba(0,0,0,0.26)'
  ctx.shadowBlur = 10 * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = chipState.fill
  roundRect(ctx, -chipState.width / 2, -chipState.height / 2, chipState.width, chipState.height, chipState.height / 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = chipState.border
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()
  const iconX = -chipState.width / 2 + 18 * scale
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.beginPath()
  ctx.arc(iconX, 0, 11.5 * scale, 0, Math.PI * 2)
  ctx.fill()
  drawLogo(ctx, chipState.logo, iconX, 15 * scale)
  ctx.fillStyle = chipState.labelColor
  ctx.font = `600 ${12.5 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(chipState.name, iconX + 17 * scale, 0.5 * scale)
  ctx.restore()
}

export const renderResumeTechTransition: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  const state = getResumeTechTransitionState(progress, width, height)
  if (state.phase === 'resume') state.resumes.forEach((card) => drawResumeCard(ctx, card))
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
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npm exec -- node --test --experimental-strip-types tests/resumeTechTransition.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Type-check and commit the renderer**

Run:

```bash
npx tsc -b --pretty false
```

Expected: exit code 0 with no TypeScript errors.

Then commit:

```bash
git add src/ppt/viz/resume-tech-transition.ts tests/resumeTechTransition.test.ts
git commit -m "feat(ppt): 컬러 기술 로고 전환 렌더링 추가"
```

---

### Task 3: 레지스트리 등록과 전체 회귀 검증

**Files:**
- Modify: `src/ppt/vizRegistry.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `resumeTechTransitionViz: VizDef` from Task 2.
- Produces: `/ppt-visual-maker`의 독립 목록 항목과 기본 테스트 명령 포함.

- [ ] **Step 1: Register the visualization without replacing existing entries**

Add this import next to the other PPT visualization imports in `src/ppt/vizRegistry.ts`:

```ts
import { resumeTechTransitionViz } from './viz/resume-tech-transition'
```

Add the new item immediately after `resumeStackCleanViz` while retaining every existing item:

```ts
  resumeStackCleanViz,
  resumeTechTransitionViz,
  techChipPileViz,
```

- [ ] **Step 2: Include the focused test in the default test command**

In `package.json`, add `tests/resumeTechTransition.test.ts` immediately after `tests/resumeStackClean.test.ts` in the existing `test` script. Preserve `src/career/workflow/roadmapOverlay.test.ts` and every existing visualization test.

The relevant sequence must become:

```json
"tests/resumeStackClean.test.ts tests/resumeTechTransition.test.ts tests/techChipPile.test.ts"
```

- [ ] **Step 3: Run the complete automated test suite**

Run:

```bash
npm test
```

Expected: all existing tests plus the 8 new tests PASS, with 0 failures.

- [ ] **Step 4: Run the production build**

Run:

```bash
npm run build
```

Expected: `tsc -b && vite build` exits 0 and writes the Vite production bundle.

- [ ] **Step 5: Verify the local visualization manually**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 5713
```

Open `http://127.0.0.1:5713/ppt-visual-maker`, select `이력서에서 기술 스택으로`, and verify:

1. 이력서 6장이 쌓인다.
2. 이력서 더미가 위로 올라가며 완전히 사라진다.
3. 빈 화면 뒤에만 컬러 기술 칩 30개가 낙하한다.
4. 각 칩에 이니셜이 아닌 공식 로고가 보인다.
5. 기술명은 모두 흰색이다.
6. 마지막 0.8초 동안 더미가 정지한다.
7. 720p, 1080p, 4K와 `0.5~3배속`에서 요소가 잘리지 않는다.
8. 기존 이력서 더미·컬러 낙하·모노톤·기술 더미 질문 항목이 그대로 남아 있다.

- [ ] **Step 6: Commit the integration**

```bash
git add src/ppt/vizRegistry.ts package.json
git commit -m "feat(ppt): 이력서 기술 전환 시각화 등록"
```

Do not push the branch. Report the three new commit hashes and verification results to the user.
