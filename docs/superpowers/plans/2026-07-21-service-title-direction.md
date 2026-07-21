# 방향 발견 서비스 타이틀 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다섯 후보 경로 중 하나를 선택해 Fit 심볼과 `Career Fit` 타이틀로 전환하는 7초 화이트 모노톤 Canvas 시각화를 추가한다.

**Architecture:** `service-title-direction.ts`가 고정 경로 데이터, 순수 프레임 계산, Canvas 렌더링, `VizDef`를 독립적으로 소유한다. 기존 `service-title-reveal.ts`는 수정하지 않고 레지스트리에서 바로 다음 항목으로만 연결한다.

**Tech Stack:** TypeScript, Canvas 2D, Node `node:test`, Vite

## Global Constraints

- 기존 타이틀 시각화와 문제 인식 시각화는 수정하지 않는다.
- 전체 재생 시간은 7,000ms다.
- 배경은 `#F7F7F5`, 표현 색상은 흰색·검은색·회색으로 제한한다.
- 후보 경로는 정확히 다섯 개이며 가운데 셋째 경로만 선택한다.
- 최종 텍스트는 `Career Fit`과 `데이터로 찾는 나의 커리어 방향`만 사용한다.
- 좌표와 타이밍은 결정적이어야 하며 `Math.random()`을 사용하지 않는다.
- 현재 브랜치에서 작업하고 원격 저장소에는 push하지 않는다.

---

### Task 1: 방향 발견 프레임 상태와 Canvas 렌더러

**Files:**
- Create: `src/ppt/viz/service-title-direction.ts`
- Create: `tests/serviceTitleDirection.test.ts`

**Interfaces:**
- Consumes: `VizDef`, `VizRender`, `FONT`, `clamp01`, `easeInOut`, `lerp`, `roundRect`, `WHITE_MONO_STAGE_COLOR`
- Produces: `DIRECTION_PATHS`, `getServiceTitleDirectionFrame(progress, width, height)`, `renderServiceTitleDirection`, `serviceTitleDirectionViz`

- [ ] **Step 1: Write the failing state-model test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DIRECTION_PATHS,
  getServiceTitleDirectionFrame,
  renderServiceTitleDirection,
  serviceTitleDirectionViz,
} from '../src/ppt/viz/service-title-direction.ts'

test('다섯 후보 중 가운데 셋째 경로만 선택된다', () => {
  assert.equal(DIRECTION_PATHS.length, 5)
  assert.deepEqual(DIRECTION_PATHS.map((path) => path.selected), [false, false, true, false, false])
})

test('마지막에는 경로가 사라지고 브랜드만 남는다', () => {
  const frame = getServiceTitleDirectionFrame(1, 960, 540)
  assert.ok(frame.paths.every((path) => path.alpha === 0))
  assert.equal(frame.scan.alpha, 0)
  assert.equal(frame.markProgress, 1)
  assert.equal(frame.brandAlpha, 1)
  assert.equal(frame.taglineAlpha, 1)
})

test('독립된 7초 기능 시각화다', () => {
  assert.equal(serviceTitleDirectionViz.id, 'service-title-direction')
  assert.equal(serviceTitleDirectionViz.period, 7000)
  assert.equal(serviceTitleDirectionViz.render, renderServiceTitleDirection)
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test --experimental-strip-types tests/serviceTitleDirection.test.ts`

Expected: `ERR_MODULE_NOT_FOUND` for `src/ppt/viz/service-title-direction.ts`.

- [ ] **Step 3: Implement deterministic frame calculation**

Create `DIRECTION_PATHS` with five fixed cubic Bézier paths from `(210, 270)` to five right-side destinations. Set only index `2` to `selected: true`. Define these exact frame fields:

```ts
interface ServiceTitleDirectionFrame {
  originAlpha: number
  originPulse: number
  paths: DirectionPathState[]
  scan: { pathIndex: number; progress: number; x: number; y: number; alpha: number }
  absorbProgress: number
  markX: number
  markY: number
  markProgress: number
  brandAlpha: number
  taglineAlpha: number
}
```

Use fixed phases for origin `0–900ms`, path draw `700–2,000ms`, scan `1,700–3,300ms`, selection `3,100–4,500ms`, absorption and mark `4,400–5,300ms`, and brand hold `5,200–7,000ms`. Scale all coordinates with `Math.min(width / 960, height / 540)`.

- [ ] **Step 4: Implement Canvas rendering**

Render in this order:

```ts
ctx.fillStyle = WHITE_MONO_STAGE_COLOR
ctx.fillRect(0, 0, width, height)
drawPaths(ctx, frame.paths)
drawOrigin(ctx, frame.originAlpha, frame.originPulse)
drawDestinations(ctx, frame.paths)
drawScanLight(ctx, frame.scan)
drawFitMarkAndBrand(ctx, frame)
```

Use cubic Bézier curves, round line caps, `#D4D4D8` candidates, `#18181B` selected path and mark, and `#71717A` tagline. Do not draw labels, cards, chips, stars, or market glyphs.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test --experimental-strip-types tests/serviceTitleDirection.test.ts`

Expected: state, determinism, scaling, metadata tests pass; registry-order test remains failing until Task 2.

- [ ] **Step 6: Review the new source in isolation**

Run: `git diff --check && rg -n "Math\.random|이력서|시장 데이터" src/ppt/viz/service-title-direction.ts`

Expected: no whitespace errors, no `Math.random()`, and no reused card/data imagery text.

---

### Task 2: Registry and full-suite integration

**Files:**
- Modify: `src/ppt/vizRegistry.ts`
- Modify: `package.json`
- Modify: `tests/serviceTitleDirection.test.ts`

**Interfaces:**
- Consumes: `serviceTitleDirectionViz`
- Produces: ordered registry sequence `serviceTitleRevealViz, serviceTitleDirectionViz`

- [ ] **Step 1: Add the failing registry-order test**

```ts
test('기존 서비스 타이틀 바로 다음에 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /serviceTitleRevealViz,\s*serviceTitleDirectionViz,/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types tests/serviceTitleDirection.test.ts`

Expected: only the registry-order assertion fails.

- [ ] **Step 3: Register the visualization and test file**

Add:

```ts
import { serviceTitleDirectionViz } from './viz/service-title-direction'
```

Place `serviceTitleDirectionViz` immediately after `serviceTitleRevealViz` in `vizRegistry`. Append `tests/serviceTitleDirection.test.ts` to the `npm test` command in `package.json`.

- [ ] **Step 4: Run complete verification**

Run: `npm test && npm run build && git diff --check`

Expected: all tests pass, Vite production build exits `0`, and diff check emits no errors. The existing Vite chunk-size warning is acceptable.

- [ ] **Step 5: Verify in the local browser**

Open `http://127.0.0.1:5713/ppt-visual-maker`, select `Career Fit 타이틀 · 방향`, and inspect the start, scan, selection, and final frames. Confirm no clipping, overlap, console error, or non-monotone color appears.

- [ ] **Step 6: Commit without pushing**

```bash
git add package.json src/ppt/vizRegistry.ts src/ppt/viz/service-title-direction.ts tests/serviceTitleDirection.test.ts
git commit -m "feat(ppt): 방향 발견 서비스 타이틀 추가"
```
