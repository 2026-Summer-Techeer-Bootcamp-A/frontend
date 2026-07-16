# Market Flow Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연도별 수요 레이스 차트가 카드 밖으로 넘쳐 채용 공고 캘린더와 겹치는 문제를 해결한다.

**Architecture:** 시장 흐름을 포함한 네 그리드의 기존 108px 행 규칙은 유지한다. 범프 차트만 128px로 줄여 2×2 카드 안에 안정적으로 담고 주변 판도 카드의 기존 밀도를 보존한다.

**Tech Stack:** React 18, TypeScript, CSS Grid, Node.js 내장 테스트 러너

## Global Constraints

- 모든 시장 섹션의 기존 108px 행 높이를 변경하지 않는다.
- 기존 4열/2열/1열 반응형 열 구조를 유지한다.
- 범프 차트 콘텐츠를 숨기거나 축소하지 않는다.

---

### Task 1: 시장 흐름 그리드 높이 회귀 테스트와 수정

**Files:**
- Create: `tests/marketFlowLayout.test.ts`
- Modify: `src/desktop/pages/market.css:271`
- Modify: `src/desktop/pages/placeholders.tsx:933`
- Modify: `src/career/wowWidgets.tsx:1607`

**Interfaces:**
- Consumes: `.dmkt2__sec-grid--flow`와 다른 시장 그리드 선택자
- Produces: 기존 `grid-auto-rows: 108px` 규칙, 128px 범프 차트, 레이스 카드 전용 압축 간격

- [ ] **Step 1: 실패하는 CSS 계약 테스트 작성**

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/desktop/pages/market.css', import.meta.url), 'utf8')

test('시장 흐름 그리드는 다른 시장 그리드와 같은 108px 행 밀도를 유지한다', () => {
  assert.match(css, /\.dmkt2__sec-grid--flow,[\s\S]*?grid-auto-rows:\s*108px;/)
})

test('다른 시장 그리드는 기존 108px 행 밀도를 유지한다', () => {
  assert.match(css, /\.dmkt2__sec-grid--demand2,[\s\S]*?\.dmkt2__sec-grid--global4\s*\{[^}]*grid-auto-rows:\s*108px;/)
})
```

- [ ] **Step 2: 테스트를 실행해 올바르게 실패하는지 확인**

Run: `node --test --experimental-strip-types tests/marketFlowLayout.test.ts`

Expected: 시장 흐름의 기존 108px 규칙과 범프 차트 128px 규칙을 찾지 못해 FAIL한다.

- [ ] **Step 3: 시장 흐름 행 규칙을 분리해 최소 수정**

```css
.dmkt2__sec-grid--flow,
.dmkt2__sec-grid--demand2,
.dmkt2__sec-grid--tech,
.dmkt2__sec-grid--global4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 108px;
}
```

`dmkt2__sec-grid--flow`를 기존 공용 규칙에 유지하고, `BumpChart`의 `H`를 `128`로 줄인다.

- [ ] **Step 4: 회귀 테스트와 전체 타입·번들 빌드 확인**

Run: `node --test --experimental-strip-types tests/marketFlowLayout.test.ts`

Expected: 4 tests PASS.

Run: `npm run build`

Expected: TypeScript와 Vite 빌드가 오류 없이 완료된다.

- [ ] **Step 5: 변경 범위 검토**

Run: `git diff --check`

Expected: 공백 오류가 없고 변경 파일이 테스트, 시장 CSS, 설계·계획 문서로 한정된다.

### Task 2: 대표 추월 배지 하나 복원

**Files:**
- Modify: `tests/marketFlowLayout.test.ts`
- Modify: `src/career/wowWidgets.tsx`

**Interfaces:**
- Consumes: `RankHistory`, `xOf`, `yOf`
- Produces: `computeStrongestOvertake(...): Overtake | null`

- [ ] **Step 1: 차트 전체에서 배지가 하나만 렌더링되는 실패 테스트 작성**

`tests/marketFlowLayout.test.ts`에서 `computeStrongestOvertake`와 단일 조건부 렌더링, 교차점 기준 `o.y - 17` 좌표를 검사한다.

- [ ] **Step 2: 회귀 테스트 실패 확인**

Run: `node --test --experimental-strip-types tests/marketFlowLayout.test.ts`

Expected: 대표 추월 계산과 렌더링이 없어 FAIL한다.

- [ ] **Step 3: 가장 큰 교차 하나만 계산하고 작은 배지 렌더링**

모든 기술 쌍과 연도 구간의 교차를 계산하고 `Math.abs(d0) + Math.abs(d1)`이 가장 큰 하나만 반환한다. 배지는 실제 교차점의 `y - 17` 위치에 너비 26px, 높이 13px로 렌더링한다.

- [ ] **Step 4: 회귀 테스트와 기존 테스트 확인**

Run: `node --test --experimental-strip-types tests/marketFlowLayout.test.ts`

Expected: 7 tests PASS.

Run: `npm.cmd test`

Expected: 기존 7 tests PASS.
