# 기술 칩 낙하 · 모노 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 컬러 기술 칩 시각화와 독립적으로 선택 가능한 흑·백·회색 낙하·적층 Canvas 시각화를 추가한다.

**Architecture:** 기존 `getTechChipPileStates(progress, width, height)`를 상태 계산의 단일 정본으로 재사용하고, 새 모노 렌더러는 인덱스 기반 고정 무채색 스타일만 담당한다. 기존 렌더러와 공통 유틸리티는 변경하지 않으며 레지스트리에는 새 정의만 연결한다.

**Tech Stack:** TypeScript, Canvas 2D, React/Vite, Node.js test runner

## Global Constraints

- 기존 `src/ppt/viz/tech-chip-pile.ts`와 `src/ppt/viz/common.ts`는 수정하지 않는다.
- 시각화 ID는 `tech-chip-pile-mono`, 제목은 `기술 칩 낙하 · 모노`, 카테고리는 `feature`, 재생 시간은 8000ms다.
- 기술 16개, 낙하 순서, 반동, 4단 적층 좌표는 기존 상태 계산을 그대로 사용한다.
- 흰색 5개, 중간 회색 6개, 짙은 회색 5개를 고정 순서로 분산한다.
- 외부 이미지, 폰트 다운로드, 물리 엔진, 난수를 추가하지 않는다.

---

### Task 1: 모노 렌더러와 메타데이터

**Files:**
- Create: `src/ppt/viz/tech-chip-pile-mono.ts`
- Create: `tests/techChipPileMono.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `TECH_CHIPS`, `getTechChipPileStates(progress: number, width: number, height: number)` from `tech-chip-pile.ts`
- Produces: `MONO_CHIP_STYLES`, `renderTechChipPileMono: VizRender`, `techChipPileMonoViz: VizDef`

- [ ] **Step 1: 실패 테스트 작성**

`tests/techChipPileMono.test.ts`에서 새 모듈을 import하고 다음을 검증한다.

```ts
test('16개 칩에 흰색 5개, 회색 6개, 짙은 회색 5개를 분산한다', () => {
  assert.equal(MONO_CHIP_STYLES.length, 16)
  assert.deepEqual(
    MONO_CHIP_STYLES.reduce<Record<string, number>>((counts, style) => {
      counts[style.tone] = (counts[style.tone] ?? 0) + 1
      return counts
    }, {}),
    { light: 5, mid: 6, dark: 5 },
  )
})

test('기존 16개 칩의 낙하·적층 상태를 그대로 사용한다', () => {
  assert.equal(TECH_CHIPS.length, 16)
  assert.deepEqual(getTechChipPileStates(1, 960, 540), getTechChipPileStates(1, 960, 540))
})

test('독립된 8초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(techChipPileMonoViz.id, 'tech-chip-pile-mono')
  assert.equal(techChipPileMonoViz.title, '기술 칩 낙하 · 모노')
  assert.equal(techChipPileMonoViz.category, 'feature')
  assert.equal(techChipPileMonoViz.period, 8000)
  assert.equal(techChipPileMonoViz.render, renderTechChipPileMono)
})
```

`package.json`의 `test` 명령 끝에 `tests/techChipPileMono.test.ts`를 추가한다.

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `npm test`

Expected: `ERR_MODULE_NOT_FOUND` for `src/ppt/viz/tech-chip-pile-mono.ts`.

- [ ] **Step 3: 최소 모노 구현 작성**

`src/ppt/viz/tech-chip-pile-mono.ts`에 16개 고정 스타일을 정의한다.

```ts
export type MonoTone = 'light' | 'mid' | 'dark'

export interface MonoChipStyle {
  tone: MonoTone
  fill: string
  border: string
  iconFill: string
  iconText: string
  text: string
}

const TONES: MonoTone[] = [
  'light', 'dark', 'mid', 'light', 'mid', 'dark', 'mid', 'light',
  'dark', 'mid', 'light', 'dark', 'mid', 'light', 'dark', 'mid',
]

export const MONO_CHIP_STYLES = TONES.map((tone) => ({ ...STYLE_BY_TONE[tone], tone }))
```

렌더러는 `drawBackground`, `drawTopLabel`, `drawCaption`, `roundRect`와 기존 상태 계산을 사용한다. 각 상태를 `MONO_CHIP_STYLES[index]`로 그리며, 마지막에 아래 정의를 export한다.

```ts
export const techChipPileMonoViz: VizDef = {
  id: 'tech-chip-pile-mono',
  title: '기술 칩 낙하 · 모노',
  subtitle: '흑백의 기술들이 떨어져 하나의 스택으로 쌓이다',
  category: 'feature',
  period: 8000,
  render: renderTechChipPileMono,
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 5: 구현 커밋**

```bash
git add package.json tests/techChipPileMono.test.ts src/ppt/viz/tech-chip-pile-mono.ts
git commit -m "feat(ppt): 모노 기술 칩 낙하 시각화 추가"
```

### Task 2: 시각화 목록 연결과 최종 검증

**Files:**
- Modify: `src/ppt/vizRegistry.ts`

**Interfaces:**
- Consumes: `techChipPileMonoViz: VizDef`
- Produces: `/ppt-visual-maker` 기능 시각화 목록의 `기술 칩 낙하 · 모노` 항목

- [ ] **Step 1: 레지스트리 테스트 추가**

`tests/techChipPileMono.test.ts`에서 `vizRegistry`를 import하고 다음 테스트를 추가한다.

```ts
test('시각화 목록에 모노 버전이 컬러 버전과 별도로 등록된다', () => {
  assert.ok(vizRegistry.some((viz) => viz.id === 'tech-chip-pile'))
  assert.ok(vizRegistry.some((viz) => viz.id === 'tech-chip-pile-mono'))
})
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `npm test`

Expected: assertion failure because `tech-chip-pile-mono` is absent from `vizRegistry`.

- [ ] **Step 3: 레지스트리에 새 항목 추가**

```ts
import { techChipPileMonoViz } from './viz/tech-chip-pile-mono'
```

`techChipPileViz` 다음에 `techChipPileMonoViz`를 추가한다.

- [ ] **Step 4: 전체 검증**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits with code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: 레지스트리 연결 커밋**

```bash
git add src/ppt/vizRegistry.ts tests/techChipPileMono.test.ts
git commit -m "feat(ppt): 모노 기술 칩 시각화를 목록에 등록"
```

- [ ] **Step 6: 로컬 화면 검증**

`http://127.0.0.1:5713/ppt-visual-maker`에서 `기술 칩 낙하 · 모노`를 선택한다. 시작 프레임은 빈 바닥, 중간 프레임은 순차 낙하, 마지막 프레임은 흰색 5개·회색 6개·짙은 회색 5개의 4단 적층이어야 한다.
