# Tech Chip Pile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3색 카테고리 기술 칩 16개가 위에서 순차 낙하해 한 번 반동하고 4단 더미로 쌓이는 8초짜리 독립 Canvas 시각화를 추가한다.

**Architecture:** 새 `tech-chip-pile.ts`가 고정 기술 데이터, 시간별 순수 상태 계산, Canvas 렌더를 소유한다. 기존 공용 Canvas 디자인 헬퍼와 플레이어·MP4 파이프라인은 소비만 하며, 기존 시각화 구현은 변경하지 않는다. 순수 상태와 메타데이터는 Node 테스트로 검증하고 실제 목록 노출과 핵심 프레임은 로컬 브라우저에서 검증한다.

**Tech Stack:** TypeScript 5.6, Canvas 2D, Node test runner, Vite

## Global Constraints

- 기존 `problem.ts`, `resume-stack-clean.ts`, 공용 디자인 헬퍼, 플레이어, 내보내기 구현은 수정하지 않는다.
- ID는 `tech-chip-pile`, 카테고리는 `feature`, 재생 주기는 `8000ms`다.
- 기술은 16개이며 언어 블루 `#6EA8FE`, 프레임워크·데이터 그린 `#34D17F`, 클라우드·인프라 앰버 `#E2933F`를 사용한다.
- 외부 물리엔진과 `Math.random()`을 사용하지 않는다.
- 마지막 `7.0~8.0초`는 동일한 4단 적층 상태를 유지한다.

---

### Task 1: 기술 칩 낙하 상태와 Canvas 렌더

**Files:**
- Create: `src/ppt/viz/tech-chip-pile.ts`
- Create: `tests/techChipPile.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `VizDef`, `VizRender`, `FONT`, `clamp01`, `lerp`, `roundRect`, `drawBackground`, `drawTopLabel`, `drawCaption`
- Produces: `TECH_CHIPS`, `getTechChipPileStates(progress, width, height): TechChipState[]`, `renderTechChipPile`, `techChipPileViz`

- [ ] **Step 1: 실패 테스트를 추가하고 기본 테스트 명령에 등록한다**

`tests/techChipPile.test.ts`는 다음 동작을 검증한다.

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TECH_CHIPS,
  getTechChipPileStates,
  renderTechChipPile,
  techChipPileViz,
} from '../src/ppt/viz/tech-chip-pile.ts'

test('첫 0.4초는 모든 기술 칩이 화면 위에 대기한다', () => {
  assert.equal(getTechChipPileStates(0.04, 960, 540).filter((chip) => chip.visible).length, 0)
})

test('16개 기술 칩이 세 카테고리 색상을 사용한다', () => {
  assert.equal(TECH_CHIPS.length, 16)
  assert.deepEqual(new Set(TECH_CHIPS.map((chip) => chip.color)), new Set(['#6EA8FE', '#34D17F', '#E2933F']))
})

test('중간 프레임에는 일부 칩만 순차 낙하한다', () => {
  const visible = getTechChipPileStates(0.45, 960, 540).filter((chip) => chip.visible).length
  assert.ok(visible > 0 && visible < 16)
})

test('마지막 1초는 4단 적층 상태를 유지한다', () => {
  const atSeven = getTechChipPileStates(7 / 8, 960, 540)
  const atEnd = getTechChipPileStates(1, 960, 540)
  assert.deepEqual(atSeven, atEnd)
  assert.equal(new Set(atEnd.map((chip) => chip.row)).size, 4)
  assert.ok(atEnd.every((chip) => chip.visible && chip.settled && chip.alpha === 1))
})

test('동일 입력은 동일하고 해상도는 3배로 비례한다', () => {
  const middle = getTechChipPileStates(0.63, 1280, 720)
  assert.deepEqual(middle, getTechChipPileStates(0.63, 1280, 720))
  const small = getTechChipPileStates(1, 1280, 720)
  const large = getTechChipPileStates(1, 3840, 2160)
  assert.ok(Math.abs(large[0].x - small[0].x * 3) < 0.000001)
  assert.ok(Math.abs(large[0].width - small[0].width * 3) < 0.000001)
})

test('독립된 8초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(techChipPileViz.id, 'tech-chip-pile')
  assert.equal(techChipPileViz.category, 'feature')
  assert.equal(techChipPileViz.period, 8000)
  assert.equal(techChipPileViz.render, renderTechChipPile)
})
```

`package.json`의 `test` 스크립트 끝에 `tests/techChipPile.test.ts`를 추가한다.

- [ ] **Step 2: 테스트가 새 모듈 부재로 실패하는지 확인한다**

Run: `npm test`

Expected: `ERR_MODULE_NOT_FOUND` for `tech-chip-pile.ts`.

- [ ] **Step 3: 고정 기술 데이터와 상태 계산을 구현한다**

`src/ppt/viz/tech-chip-pile.ts`에 다음 구조를 구현한다.

```ts
export type TechCategory = 'language' | 'platform' | 'infra'

export interface TechChipSpec {
  name: string
  icon: string
  category: TechCategory
  color: string
  row: 0 | 1 | 2 | 3
  finalOffsetX: number
  finalRotation: number
  driftX: number
}

export interface TechChipState extends TechChipSpec {
  visible: boolean
  settled: boolean
  alpha: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

const PERIOD_MS = 8000
const FIRST_DROP_MS = 400
const DROP_GAP_MS = 280
const DROP_DURATION_MS = 1200

export function getTechChipPileStates(progress: number, width: number, height: number): TechChipState[] {
  const timeMs = clamp01(progress) * PERIOD_MS
  const scale = Math.min(width / 960, height / 540)
  const chipHeight = 42 * scale
  const floorY = height * 0.82
  const rowGap = 37 * scale

  return TECH_CHIPS.map((chip, index) => {
    const startMs = FIRST_DROP_MS + index * DROP_GAP_MS
    const local = clamp01((timeMs - startMs) / DROP_DURATION_MS)
    const fall = clamp01(local / 0.78)
    const bounce = clamp01((local - 0.78) / 0.22)
    const targetX = width * 0.5 + chip.finalOffsetX * scale
    const targetY = floorY - chipHeight / 2 - chip.row * rowGap
    const startX = targetX + chip.driftX * scale
    const startY = -70 * scale
    const fallY = lerp(startY, targetY, fall * fall)
    const bounceLift = bounce > 0 && bounce < 1 ? Math.sin(bounce * Math.PI) * 12 * scale * (1 - bounce * 0.35) : 0

    return {
      ...chip,
      visible: local > 0,
      settled: local >= 1,
      alpha: clamp01(local / 0.12),
      x: lerp(startX, targetX, fall),
      y: fallY - bounceLift,
      width: (52 + chip.name.length * 7.2) * scale,
      height: chipHeight,
      rotation: lerp(chip.finalRotation * -6, chip.finalRotation, fall) + Math.sin(bounce * Math.PI) * 0.04,
    }
  })
}
```

`TECH_CHIPS`는 아래에서 위로 `5 + 5 + 4 + 2`개 순서로 다음처럼 고정한다.

```ts
const CATEGORY_COLORS: Record<TechCategory, string> = {
  language: '#6EA8FE',
  platform: '#34D17F',
  infra: '#E2933F',
}

function chip(
  name: string,
  icon: string,
  category: TechCategory,
  row: 0 | 1 | 2 | 3,
  finalOffsetX: number,
  finalRotation: number,
  driftX: number,
): TechChipSpec {
  return { name, icon, category, color: CATEGORY_COLORS[category], row, finalOffsetX, finalRotation, driftX }
}

export const TECH_CHIPS: TechChipSpec[] = [
  chip('Java', 'J', 'language', 0, -260, -0.035, -55),
  chip('Spring', 'S', 'platform', 0, -130, 0.025, 45),
  chip('AWS', 'A', 'infra', 0, 0, -0.018, -35),
  chip('Docker', 'D', 'infra', 0, 130, 0.03, 60),
  chip('Python', 'P', 'language', 0, 260, -0.025, -50),
  chip('React', 'R', 'platform', 1, -220, 0.022, 40),
  chip('TypeScript', 'T', 'language', 1, -110, -0.02, -60),
  chip('Kafka', 'K', 'platform', 1, 0, 0.015, 35),
  chip('Kubernetes', 'K', 'infra', 1, 110, -0.025, -45),
  chip('Redis', 'R', 'platform', 1, 220, 0.03, 50),
  chip('Go', 'G', 'language', 2, -165, -0.02, -35),
  chip('MySQL', 'M', 'platform', 2, -55, 0.02, 45),
  chip('Git', 'G', 'infra', 2, 55, -0.018, -50),
  chip('Terraform', 'T', 'infra', 2, 165, 0.024, 40),
  chip('PostgreSQL', 'P', 'platform', 3, -60, -0.015, -30),
  chip('Linux', 'L', 'infra', 3, 60, 0.015, 30),
]
```

- [ ] **Step 4: Career Fit 칩 렌더를 구현한다**

`drawTechChip()`과 메인 렌더는 다음 계약으로 구현한다.

```ts
const CHIP_STYLES: Record<TechCategory, { fill: string; border: string }> = {
  language: { fill: 'rgba(110,168,254,0.13)', border: 'rgba(110,168,254,0.68)' },
  platform: { fill: 'rgba(52,209,127,0.13)', border: 'rgba(52,209,127,0.68)' },
  infra: { fill: 'rgba(226,147,63,0.13)', border: 'rgba(226,147,63,0.68)' },
}

function drawTechChip(ctx: CanvasRenderingContext2D, state: TechChipState): void {
  if (!state.visible || state.alpha <= 0) return
  const scale = state.height / 42
  const style = CHIP_STYLES[state.category]
  ctx.save()
  ctx.translate(state.x, state.y)
  ctx.rotate(state.rotation)
  ctx.globalAlpha = state.alpha
  ctx.shadowColor = 'rgba(0,0,0,0.24)'
  ctx.shadowBlur = 10 * scale
  ctx.shadowOffsetY = 4 * scale
  ctx.fillStyle = style.fill
  roundRect(ctx, -state.width / 2, -state.height / 2, state.width, state.height, state.height / 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, scale)
  ctx.stroke()
  const iconX = -state.width / 2 + 21 * scale
  ctx.fillStyle = state.color
  ctx.beginPath()
  ctx.arc(iconX, 0, 12 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#18181B'
  ctx.font = `800 ${11 * scale}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(state.icon, iconX, 0.5 * scale)
  ctx.fillStyle = '#F4F4F5'
  ctx.font = `600 ${14 * scale}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(state.name, iconX + 19 * scale, 0.5 * scale)
  ctx.restore()
}

export const renderTechChipPile: VizRender = (ctx, width, height, progress) => {
  drawBackground(ctx, width, height)
  const scale = Math.min(width / 960, height / 540)
  const floorY = height * 0.82 + 27 * scale
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(width * 0.16, floorY)
  ctx.lineTo(width * 0.84, floorY)
  ctx.stroke()
  ctx.restore()
  getTechChipPileStates(progress, width, height).forEach((state) => drawTechChip(ctx, state))
  drawTopLabel(ctx, '문제 인식', '쏟아지는 기술')
  drawCaption(ctx, height, progress < 0.72 ? '기술들이 끊임없이 쏟아집니다' : '16개의 기술이 하나의 더미로 쌓였습니다')
}

export const techChipPileViz: VizDef = {
  id: 'tech-chip-pile',
  title: '기술 칩 낙하',
  subtitle: '기술들이 떨어져 하나의 스택으로 쌓이다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderTechChipPile,
}
```

- [ ] **Step 5: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 새 테스트 6개를 포함한 전체 테스트 통과.

- [ ] **Step 6: 구현을 커밋한다**

```bash
git add src/ppt/viz/tech-chip-pile.ts tests/techChipPile.test.ts package.json
git commit -m "feat(ppt): 기술 칩 낙하 적층 시각화 추가"
```

### Task 2: 레지스트리 등록과 빌드 검증

**Files:**
- Modify: `src/ppt/vizRegistry.ts`

**Interfaces:**
- Consumes: `techChipPileViz: VizDef`
- Produces: `vizRegistry`의 독립 `기술 칩 낙하` 항목

- [ ] **Step 1: 레지스트리에 새 객체를 추가한다**

```ts
import { techChipPileViz } from './viz/tech-chip-pile'
```

`resumeStackCleanViz` 다음에 `techChipPileViz,`를 추가한다. 다른 항목과 순서는 변경하지 않는다.

- [ ] **Step 2: 테스트와 프로덕션 빌드를 실행한다**

Run: `npm test`

Expected: 전체 테스트 통과.

Run: `npm run build`

Expected: TypeScript 오류 없이 Vite 빌드 완료.

- [ ] **Step 3: 등록 변경을 커밋한다**

```bash
git add src/ppt/vizRegistry.ts
git commit -m "feat(ppt): 기술 칩 낙하 시각화를 목록에 등록"
```

### Task 3: 5713 로컬 프레임 검증

**Files:**
- No source changes expected

**Interfaces:**
- Consumes: `/ppt-visual-maker?t=0.04`, `?t=0.45`, `?t=0.875`, `?t=1`
- Produces: 목록 노출·중간 낙하·완성 적층의 시각 검증 결과

- [ ] **Step 1: 개발 서버를 실행한다**

Run: `npm run dev -- --host 127.0.0.1 --port 5713`

Expected: `http://127.0.0.1:5713/`가 출력된다.

- [ ] **Step 2: 목록과 핵심 프레임을 확인한다**

`기술 칩 낙하` 항목을 선택하고 시작 프레임은 빈 화면, 중간 프레임은 일부 칩 낙하, `t=0.875`와 `t=1`은 동일한 4단 적층 상태인지 확인한다. 블루·그린·앰버가 카테고리별로 일관되고 라벨이 읽히는지 확인한다.

- [ ] **Step 3: 최종 상태를 확인한다**

Run: `git status --short`

Expected: 기존 사용자 미추적 문서를 제외하고 작업 파일의 미커밋 변경이 없다.
