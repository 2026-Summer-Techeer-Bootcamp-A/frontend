# Resume Stack Clean Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PPT Visual Maker에 이력서 6장이 순서대로 진입해 중앙의 정돈된 더미로 멈추는 6초짜리 독립 Canvas 시각화를 추가한다.

**Architecture:** 새 `resume-stack-clean.ts`가 시간 기반 카드 상태 계산과 Canvas 렌더를 함께 소유한다. 상태 계산 함수는 Canvas 없이 테스트 가능하게 export하고, 기존 `VizRender`·공용 디자인 헬퍼·플레이어·MP4 파이프라인은 소비만 한다. 기존 시각화 코드는 수정하지 않고 `vizRegistry.ts`에 새 항목만 추가한다.

**Tech Stack:** React 18, TypeScript 5.6, Canvas 2D, Node test runner, Vite

## Global Constraints

- 기존 `src/ppt/viz/problem.ts`와 기존 디자인 토큰·공용 렌더 헬퍼의 구현은 수정하지 않는다.
- 새 시각화 ID는 `resume-stack-clean`, 재생 주기는 `6000ms`, 카테고리는 `feature`다.
- 렌더 상태는 `progress`와 고정 데이터로만 계산하며 `Math.random()`을 사용하지 않는다.
- 720p, 1080p, 4K에서 같은 비례 구도를 유지한다.
- 마지막 `5.0~6.0초`는 완성된 스택을 정지 상태로 유지한다.

---

### Task 1: 결정적 이력서 스택 상태와 회귀 테스트

**Files:**
- Create: `src/ppt/viz/resume-stack-clean.ts`
- Create: `tests/resumeStackClean.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `VizRender`, `FONT`, `clamp01`, `lerp`, `easeOut`, `roundRect`, `drawBackground`, `drawTopLabel`, `drawCaption`
- Produces: `getResumeStackStates(progress, width, height): ResumeCardState[]`, `renderResumeStackClean: VizRender`

- [ ] **Step 1: 테스트 파일을 만들고 기본 테스트 명령에 등록한다**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { getResumeStackStates } from '../src/ppt/viz/resume-stack-clean.ts'

test('첫 0.4초는 모든 이력서가 화면 밖에 있다', () => {
  const cards = getResumeStackStates(0.05, 960, 540)
  assert.equal(cards.filter((card) => card.visible).length, 0)
})

test('이력서 6장이 시간차를 두고 순서대로 나타난다', () => {
  const early = getResumeStackStates(0.2, 960, 540)
  const middle = getResumeStackStates(0.5, 960, 540)
  assert.ok(early.filter((card) => card.visible).length >= 1)
  assert.ok(middle.filter((card) => card.visible).length > early.filter((card) => card.visible).length)
})

test('마지막 1초는 중앙의 동일한 정돈 상태를 유지한다', () => {
  const atFive = getResumeStackStates(5 / 6, 960, 540)
  const atEnd = getResumeStackStates(1, 960, 540)
  assert.deepEqual(atFive, atEnd)
  assert.equal(atEnd.length, 6)
  assert.ok(atEnd.every((card) => card.visible && card.alpha === 1))
})

test('레이아웃은 해상도에 비례한다', () => {
  const small = getResumeStackStates(1, 1280, 720)
  const large = getResumeStackStates(1, 3840, 2160)
  assert.equal(large[5].x, small[5].x * 3)
  assert.equal(large[5].y, small[5].y * 3)
  assert.equal(large[5].width, small[5].width * 3)
})
```

`package.json`의 `test` 스크립트 끝에 `tests/resumeStackClean.test.ts`를 추가한다.

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test`

Expected: `ERR_MODULE_NOT_FOUND` 또는 `getResumeStackStates` 미정의로 실패한다.

- [ ] **Step 3: 새 렌더 파일에 상태 모델과 최소 Canvas 구현을 작성한다**

```ts
import type { VizRender } from '../types'
import {
  FONT,
  clamp01,
  lerp,
  easeOut,
  roundRect,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common'

export interface ResumeCardState {
  index: number
  visible: boolean
  alpha: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

const PERIOD_MS = 6000
const STARTS_MS = [400, 1040, 1680, 2320, 2960, 3600] as const
const ARRIVAL_MS = 700
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

export function getResumeStackStates(progress: number, width: number, height: number): ResumeCardState[] {
  const timeMs = clamp01(progress) * PERIOD_MS
  const cardWidth = Math.min(width * 0.25, height * 0.39)
  const cardHeight = cardWidth * 1.34
  const centerX = width * 0.5
  const centerY = height * 0.5

  return STARTS_MS.map((startMs, index) => {
    const raw = clamp01((timeMs - startMs) / ARRIVAL_MS)
    const arrival = easeOut(raw)
    const [offsetX, offsetY, finalRotation] = FINAL_OFFSETS[index]
    const [entryX, entryY, entryRotation] = ENTRY_VECTORS[index]
    const finalX = centerX + width * offsetX
    const finalY = centerY + height * offsetY
    return {
      index,
      visible: raw > 0,
      alpha: raw,
      x: lerp(centerX + width * entryX, finalX, arrival),
      y: lerp(centerY + height * entryY, finalY, arrival),
      width: cardWidth,
      height: cardHeight,
      rotation: lerp(entryRotation, finalRotation, arrival),
    }
  })
}
```

같은 파일에 다음 렌더 함수를 추가한다.

```ts
function drawResumeCard(ctx: CanvasRenderingContext2D, card: ResumeCardState): void {
  if (!card.visible || card.alpha <= 0) return
  const scale = card.width / 250
  ctx.save()
  ctx.translate(card.x, card.y)
  ctx.rotate(card.rotation)
  ctx.globalAlpha = card.alpha

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.fillStyle = '#f4f4f5'
  roundRect(ctx, -card.width / 2, -card.height / 2, card.width, card.height, 12 * scale)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(24,24,27,0.12)'
  ctx.lineWidth = Math.max(1, scale)
  roundRect(ctx, -card.width / 2, -card.height / 2, card.width, card.height, 12 * scale)
  ctx.stroke()

  const left = -card.width / 2 + 28 * scale
  const top = -card.height / 2 + 30 * scale
  ctx.fillStyle = '#d4d4d8'
  ctx.beginPath()
  ctx.arc(left + 20 * scale, top + 20 * scale, 20 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#3f3f46'
  ctx.font = `700 ${14 * scale}px ${FONT}`
  ctx.fillRect(left + 54 * scale, top + 7 * scale, 92 * scale, 6 * scale)
  ctx.fillStyle = '#a1a1aa'
  ctx.fillRect(left + 54 * scale, top + 24 * scale, 66 * scale, 4 * scale)

  ctx.fillStyle = '#d4d4d8'
  ctx.fillRect(left, top + 61 * scale, card.width - 56 * scale, 1 * scale)
  const widths = [0.92, 0.72, 0.84, 0.61, 0.78]
  widths.forEach((ratio, row) => {
    ctx.fillStyle = row === 0 ? '#71717a' : '#a1a1aa'
    ctx.fillRect(left, top + (83 + row * 31) * scale, (card.width - 56 * scale) * ratio, row === 0 ? 5 * scale : 4 * scale)
  })
  ctx.restore()
}

export const renderResumeStackClean: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  getResumeStackStates(progress, width, height).forEach((card) => drawResumeCard(ctx, card))
  drawTopLabel(ctx, '문제 인식', '쌓이는 이력서')
  drawCaption(ctx, height, progress < 5 / 6 ? '이력서가 한 장씩 모입니다' : '6장의 이력서가 정돈되었습니다')
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test`

Expected: 새 테스트 4개를 포함한 전체 테스트가 통과한다.

- [ ] **Step 5: 렌더 구현을 커밋한다**

```bash
git add src/ppt/viz/resume-stack-clean.ts tests/resumeStackClean.test.ts package.json
git commit -m "feat(ppt): 정돈된 이력서 스택 시각화 추가"
```

### Task 2: PPT Visual Maker 레지스트리 등록과 빌드 검증

**Files:**
- Modify: `src/ppt/vizRegistry.ts`

**Interfaces:**
- Consumes: `renderResumeStackClean: VizRender`
- Produces: `vizRegistry`의 `resume-stack-clean` 항목

- [ ] **Step 1: 레지스트리 계약 테스트를 추가한다**

`tests/resumeStackClean.test.ts`에 다음 테스트를 추가한다.

```ts
import { vizRegistry } from '../src/ppt/vizRegistry.ts'

test('레지스트리에 독립된 6초 기능 시각화로 등록된다', () => {
  const viz = vizRegistry.find((item) => item.id === 'resume-stack-clean')
  assert.ok(viz)
  assert.equal(viz.category, 'feature')
  assert.equal(viz.period, 6000)
  assert.equal(viz.render, renderResumeStackClean)
})
```

테스트 import에 `renderResumeStackClean`을 추가한다.

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test`

Expected: `resume-stack-clean` 항목을 찾지 못해 실패한다.

- [ ] **Step 3: 레지스트리에 새 항목을 추가한다**

`src/ppt/vizRegistry.ts`에 다음 import를 추가한다.

```ts
import { renderResumeStackClean } from './viz/resume-stack-clean'
```

기존 `problem-scatter` 바로 앞에 다음 항목을 추가한다.

```ts
{
  id: 'resume-stack-clean',
  title: '이력서 더미',
  subtitle: '흩어진 이력서 6장이 하나의 더미로 모이다',
  category: 'feature',
  period: 6000,
  render: renderResumeStackClean,
},
```

- [ ] **Step 4: 테스트와 프로덕션 빌드를 검증한다**

Run: `npm test`

Expected: 전체 테스트 통과.

Run: `npm run build`

Expected: TypeScript 오류 없이 Vite 프로덕션 빌드 완료.

- [ ] **Step 5: 레지스트리 변경을 커밋한다**

```bash
git add src/ppt/vizRegistry.ts tests/resumeStackClean.test.ts
git commit -m "feat(ppt): 이력서 스택 시각화를 목록에 등록"
```

### Task 3: 로컬 시각 검증

**Files:**
- No source changes expected

**Interfaces:**
- Consumes: `/ppt-visual-maker`, `?t=0`, `?t=0.5`, `?t=0.84`, `?t=1`
- Produces: 로컬 화면과 MP4 내보내기의 검증 결과

- [ ] **Step 1: 5713 포트에서 개발 서버를 실행한다**

Run: `npm run dev -- --port 5713`

Expected: `http://localhost:5713/` 접속 주소가 출력된다.

- [ ] **Step 2: 핵심 프레임을 확인한다**

`/ppt-visual-maker`에서 `이력서 더미`를 선택하고 시작, 중간, 5초, 종료 프레임을 확인한다. 카드가 화면 경계를 넘지 않고 6장이 순서대로 들어오며 마지막 1초가 동일한지 검증한다.

- [ ] **Step 3: 내보내기 경로를 확인한다**

Chrome에서 1080p, 1x, 60fps MP4 내보내기를 실행한다. 완료 파일명이 `resume-stack-clean-1x-1080p.mp4`이고 재생 흐름이 미리보기와 일치하는지 확인한다.

- [ ] **Step 4: 최종 상태를 확인한다**

Run: `git status --short`

Expected: 기존 사용자 미추적 문서를 제외하고 작업 파일의 미커밋 변경이 없다.
