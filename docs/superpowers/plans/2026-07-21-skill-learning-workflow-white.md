# White Skill Learning Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 흰 배경에 흩어진 14개 기술 중 `Java → Spring → Docker → AWS`만 선택·정렬·연결되는 독립 Canvas 시각화를 추가한다.

**Architecture:** 새 시각화 파일이 고정 기술 데이터, 진행률 기반 순수 프레임 계산, Canvas 렌더링, `VizDef`를 모두 소유한다. 기존 시각화는 변경하지 않고 레지스트리와 테스트 실행 스크립트에 새 항목만 추가한다.

**Tech Stack:** TypeScript, Canvas 2D API, Node `node:test`, Vite

## Global Constraints

- 기준 캔버스는 960×540이고 모든 좌표와 크기는 `Math.min(width / 960, height / 540)`으로 비례 조정한다.
- 기술 칩은 정확히 14개이며 선택 순서는 `Java → Spring → Docker → AWS`다.
- 전체 주기는 7,000ms이고 마지막 1,200ms에는 완성 장면을 유지한다.
- 배경은 `#F7F7F5`, 선택 칩은 검은색 계열, 미선택 칩은 흰색·회색 계열을 사용한다.
- 기존 `src/ppt/viz/*.ts` 구현과 공통 렌더링 코드는 수정하지 않는다.
- 프레임 상태는 같은 진행률과 해상도에 항상 같은 값을 반환하는 순수 함수로 계산한다.

---

## File Structure

- Create: `src/ppt/viz/skill-learning-workflow-white.ts` — 고정 기술 데이터, 타임라인 상태 계산, 화이트 Canvas 렌더러, 시각화 메타데이터
- Create: `tests/skillLearningWorkflowWhite.test.ts` — 기술 선택 순서, 타임라인, 결정성, 해상도 비례, 메타데이터, 레지스트리 등록 검증
- Modify: `package.json` — 새 테스트 파일을 `npm test` 실행 목록에 추가
- Modify: `src/ppt/vizRegistry.ts` — 새 시각화를 기능 시각화 목록에 등록

### Task 1: 순수 프레임 모델과 화이트 Canvas 렌더러

**Files:**
- Create: `tests/skillLearningWorkflowWhite.test.ts`
- Create: `src/ppt/viz/skill-learning-workflow-white.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `FONT`, `clamp01`, `easeInOut`, `lerp`, `roundRect` from `src/ppt/viz/common.ts`; `VizDef`, `VizRender` from `src/ppt/types.ts`
- Produces: `WORKFLOW_SKILLS`, `getSkillLearningWorkflowFrame(progress, width, height)`, `renderSkillLearningWorkflowWhite`, `skillLearningWorkflowWhiteViz`

- [ ] **Step 1: Write the failing state and metadata tests**

Create `tests/skillLearningWorkflowWhite.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WORKFLOW_SKILLS,
  getSkillLearningWorkflowFrame,
  renderSkillLearningWorkflowWhite,
  skillLearningWorkflowWhiteViz,
} from '../src/ppt/viz/skill-learning-workflow-white.ts'

test('14개 기술 중 네 기술만 정해진 학습 순서를 가진다', () => {
  assert.equal(WORKFLOW_SKILLS.length, 14)
  assert.deepEqual(
    WORKFLOW_SKILLS.filter((skill) => skill.order !== null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((skill) => skill.name),
    ['Java', 'Spring', 'Docker', 'AWS'],
  )
})

test('시작에는 14개 기술이 흩어져 있고 연결과 문구는 보이지 않는다', () => {
  const frame = getSkillLearningWorkflowFrame(0, 960, 540)
  assert.equal(frame.skills.filter((skill) => skill.visible).length, 14)
  assert.ok(frame.skills.every((skill) => skill.moveProgress === 0))
  assert.ok(frame.connections.every((connection) => connection.progress === 0))
  assert.equal(frame.messageAlpha, 0)
})

test('선택 기술은 강조된 뒤 중앙 워크플로우로 이동한다', () => {
  const selecting = getSkillLearningWorkflowFrame(0.3, 960, 540)
  assert.ok(selecting.skills.some((skill) => skill.selected && skill.selectionProgress > 0))

  const arranged = getSkillLearningWorkflowFrame(0.56, 960, 540)
  const selected = arranged.skills
    .filter((skill) => skill.selected)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  assert.equal(selected.length, 4)
  assert.ok(selected.every((skill) => skill.moveProgress === 1))
  assert.ok(selected.every((skill, index) => index === 0 || skill.x > selected[index - 1].x))
})

test('마지막에는 네 기술과 완성된 세 연결 및 문구만 남는다', () => {
  const frame = getSkillLearningWorkflowFrame(1, 960, 540)
  assert.deepEqual(
    frame.skills.filter((skill) => skill.visible).map((skill) => skill.name),
    ['Java', 'Spring', 'Docker', 'AWS'],
  )
  assert.equal(frame.connections.length, 3)
  assert.ok(frame.connections.every((connection) => connection.progress === 1))
  assert.equal(frame.messageAlpha, 1)
})

test('동일 입력은 동일하고 2배 해상도에서 좌표와 크기도 2배다', () => {
  const small = getSkillLearningWorkflowFrame(0.5, 960, 540)
  assert.deepEqual(small, getSkillLearningWorkflowFrame(0.5, 960, 540))
  const large = getSkillLearningWorkflowFrame(0.5, 1920, 1080)
  assert.ok(Math.abs(large.skills[0].x - small.skills[0].x * 2) < 0.000001)
  assert.ok(Math.abs(large.skills[0].width - small.skills[0].width * 2) < 0.000001)
})

test('독립된 7초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(skillLearningWorkflowWhiteViz.id, 'skill-learning-workflow-white')
  assert.equal(skillLearningWorkflowWhiteViz.title, '나의 기술 학습 경로')
  assert.equal(skillLearningWorkflowWhiteViz.category, 'feature')
  assert.equal(skillLearningWorkflowWhiteViz.period, 7000)
  assert.equal(skillLearningWorkflowWhiteViz.render, renderSkillLearningWorkflowWhite)
})
```

Append the new test path to the existing `test` script in `package.json`:

```json
"test": "node --test --experimental-strip-types src/career/homeApi.test.ts src/career/workflow/relations.test.ts tests/coverageScore.test.ts tests/resumeStackClean.test.ts tests/techChipPile.test.ts tests/techChipPileMono.test.ts tests/resumeSkillRouting.test.ts tests/techPileQuestion.test.ts tests/skillLearningWorkflowWhite.test.ts"
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --experimental-strip-types tests/skillLearningWorkflowWhite.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `skill-learning-workflow-white.ts`.

- [ ] **Step 3: Implement the deterministic frame model**

Create `src/ppt/viz/skill-learning-workflow-white.ts` with these public types, fixed data, and timeline constants:

```ts
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
```

- [ ] **Step 4: Implement the white-stage Canvas renderer and metadata**

Continue the same file with focused draw functions:

```ts
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
  const selectedMix = skill.selectionProgress
  ctx.save()
  ctx.globalAlpha = skill.alpha
  ctx.translate(skill.x, skill.y)
  ctx.shadowColor = skill.selected ? `rgba(24,24,27,${0.12 * selectedMix})` : 'rgba(24,24,27,0.05)'
  ctx.shadowBlur = (7 + selectedMix * 10) * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = selectedMix > 0.5 ? '#18181B' : '#FFFFFF'
  roundRect(ctx, -skill.width / 2, -skill.height / 2, skill.width, skill.height, skill.height / 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = selectedMix > 0.5 ? '#18181B' : '#D4D4D8'
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()

  const iconX = -skill.width / 2 + 22 * scale
  ctx.fillStyle = selectedMix > 0.5 ? '#F4F4F5' : '#E4E4E7'
  ctx.beginPath()
  ctx.arc(iconX, 0, 12 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#27272A'
  ctx.font = `800 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(skill.icon, iconX, 0.5 * scale)
  ctx.fillStyle = selectedMix > 0.5 ? '#FAFAFA' : '#52525B'
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
    drawConnection(ctx, selected[connection.fromOrder], selected[connection.toOrder], connection.progress)
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
```

- [ ] **Step 5: Run the focused test and full suite**

Run:

```bash
node --test --experimental-strip-types tests/skillLearningWorkflowWhite.test.ts
npm test
```

Expected: focused file reports 6 passing tests; full suite passes with no failures.

- [ ] **Step 6: Commit the isolated visualization**

```bash
git add package.json tests/skillLearningWorkflowWhite.test.ts src/ppt/viz/skill-learning-workflow-white.ts
git commit -m "feat(ppt): 화이트 기술 학습 워크플로우 추가"
```

### Task 2: 시각화 목록 등록과 통합 검증

**Files:**
- Modify: `tests/skillLearningWorkflowWhite.test.ts`
- Modify: `src/ppt/vizRegistry.ts`

**Interfaces:**
- Consumes: `skillLearningWorkflowWhiteViz` from `src/ppt/viz/skill-learning-workflow-white.ts`
- Produces: `/ppt-visual-maker` 기능 시각화 목록의 `skill-learning-workflow-white` 항목

- [ ] **Step 1: Write the failing registry test**

Append to `tests/skillLearningWorkflowWhite.test.ts`:

```ts
import { readFileSync } from 'node:fs'

test('시각화 목록에 별도 항목으로 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /skillLearningWorkflowWhiteViz/)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --experimental-strip-types tests/skillLearningWorkflowWhite.test.ts
```

Expected: FAIL in `시각화 목록에 별도 항목으로 등록된다` because the registry does not contain `skillLearningWorkflowWhiteViz`.

- [ ] **Step 3: Register the visualization**

Add this import to `src/ppt/vizRegistry.ts` after the other new feature visual imports:

```ts
import { skillLearningWorkflowWhiteViz } from './viz/skill-learning-workflow-white'
```

Add the entry immediately after `resumeSkillRoutingViz`:

```ts
  resumeSkillRoutingViz,
  skillLearningWorkflowWhiteViz,
```

- [ ] **Step 4: Run automated verification**

Run:

```bash
node --test --experimental-strip-types tests/skillLearningWorkflowWhite.test.ts
npm test
npm run build
git diff --check
```

Expected: focused tests pass, full tests pass, TypeScript/Vite production build succeeds, and `git diff --check` prints no errors.

- [ ] **Step 5: Verify the local animation visually**

Open `http://127.0.0.1:5713/ppt-visual-maker`, select `나의 기술 학습 경로`, and inspect these checkpoints:

- 0%: 14 chips visible on the white stage; no lines or caption.
- 30%: selected chips are darkening in sequence.
- 56%: four selected chips are centered left-to-right.
- 75%: connections are being drawn and background chips are gone.
- 100%: `Java → Spring → Docker → AWS` and the final caption remain visible.
- 2× playback: no overlap, clipping, stale trail, or white flash inside the scene.

- [ ] **Step 6: Commit registry integration**

```bash
git add tests/skillLearningWorkflowWhite.test.ts src/ppt/vizRegistry.ts
git commit -m "feat(ppt): 기술 학습 워크플로우를 목록에 등록"
```
