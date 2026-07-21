# 모노 기술 더미 질문 장면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시작부터 완성된 모노 기술 칩 더미 위에 질문 문구만 페이드인·유지·페이드아웃되는 5초짜리 별도 Canvas 시각화를 추가한다.

**Architecture:** 새 모듈은 기존 기술 칩 최종 상태와 모노 스타일을 읽어 고정 더미를 그리며, 진행률에 따라 질문 투명도만 계산한다. 기존 낙하 렌더러와 공통 유틸리티는 변경하지 않고 레지스트리에 새 `VizDef`만 연결한다.

**Tech Stack:** TypeScript, Canvas 2D, React/Vite, Node.js test runner

## Global Constraints

- 기술 칩 16개는 전체 5000ms 동안 처음부터 끝까지 고정된 최종 적층 상태다.
- 질문은 0~0.6초 페이드인, 0.6~3.8초 유지, 3.8~4.6초 페이드아웃, 4.6~5.0초 숨김 상태다.
- 문구는 `쏟아지는 기술들,`과 `내 커리어에 필요한 건 무엇일까?`의 두 줄이다.
- 기존 `tech-chip-pile.ts`, `tech-chip-pile-mono.ts`, `common.ts`를 수정하지 않는다.
- 별, 점군, 입자, 낙하, 반동과 분야별 컬러를 추가하지 않는다.

---

### Task 1: 고정 더미와 질문 페이드 렌더러

**Files:**
- Create: `src/ppt/viz/tech-pile-question.ts`
- Create: `tests/techPileQuestion.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getTechChipPileStates(1, width, height)`, `MONO_CHIP_STYLES`
- Produces: `getTechPileQuestionFrame(progress, width, height)`, `renderTechPileQuestion`, `techPileQuestionViz`

- [ ] **Step 1: 실패 테스트 작성**

```ts
test('모든 시점에 16개 칩이 같은 최종 적층 상태로 고정된다', () => {
  const start = getTechPileQuestionFrame(0, 960, 540)
  const end = getTechPileQuestionFrame(1, 960, 540)
  assert.equal(start.chips.length, 16)
  assert.ok(start.chips.every((chip) => chip.visible && chip.settled))
  assert.deepEqual(start.chips, end.chips)
})

test('질문이 페이드인하고 유지된 뒤 페이드아웃한다', () => {
  assert.equal(getTechPileQuestionFrame(0, 960, 540).questionAlpha, 0)
  assert.ok(getTechPileQuestionFrame(0.06, 960, 540).questionAlpha > 0)
  assert.equal(getTechPileQuestionFrame(0.4, 960, 540).questionAlpha, 1)
  assert.ok(getTechPileQuestionFrame(0.82, 960, 540).questionAlpha < 1)
  assert.equal(getTechPileQuestionFrame(0.94, 960, 540).questionAlpha, 0)
})

test('독립된 5초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(techPileQuestionViz.id, 'tech-pile-question')
  assert.equal(techPileQuestionViz.category, 'feature')
  assert.equal(techPileQuestionViz.period, 5000)
  assert.equal(techPileQuestionViz.render, renderTechPileQuestion)
})
```

`package.json`의 `test` 명령 끝에 `tests/techPileQuestion.test.ts`를 추가한다.

- [ ] **Step 2: 테스트를 실행해 모듈 부재 실패 확인**

Run: `npm test`

Expected: `ERR_MODULE_NOT_FOUND` for `src/ppt/viz/tech-pile-question.ts`.

- [ ] **Step 3: 상태 계산과 Canvas 렌더러 구현**

`questionAlpha`는 600ms까지 `easeInOut(timeMs / 600)`, 3800ms까지 1, 4600ms까지 `1 - easeInOut((timeMs - 3800) / 800)`, 이후 0으로 계산한다. 칩 상태는 항상 `getTechChipPileStates(1, width, height)`를 반환한다.

렌더러는 고정 모노 칩 더미, 바닥선, 두 줄 문구를 그린다. 첫 줄은 중간 회색 20px, 둘째 줄은 흰색 34px 굵은 글자로 배치한다.

```ts
export const techPileQuestionViz: VizDef = {
  id: 'tech-pile-question',
  title: '기술 더미 질문',
  subtitle: '쌓인 기술 앞에서 내게 필요한 방향을 묻다',
  category: 'feature',
  period: 5000,
  render: renderTechPileQuestion,
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 5: 구현 커밋**

```bash
git add package.json tests/techPileQuestion.test.ts src/ppt/viz/tech-pile-question.ts
git commit -m "feat(ppt): 모노 기술 더미 질문 장면 추가"
```

### Task 2: 목록 등록과 검증

**Files:**
- Modify: `src/ppt/vizRegistry.ts`
- Modify: `tests/techPileQuestion.test.ts`

**Interfaces:**
- Consumes: `techPileQuestionViz: VizDef`
- Produces: `/ppt-visual-maker`의 별도 `기술 더미 질문` 항목

- [ ] **Step 1: 레지스트리 실패 테스트 추가**

```ts
test('시각화 목록에 별도 항목으로 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /techPileQuestionViz/)
})
```

- [ ] **Step 2: 테스트를 실행해 등록 누락 실패 확인**

Run: `npm test`

Expected: assertion failure because `techPileQuestionViz` is absent.

- [ ] **Step 3: 레지스트리에 연결**

```ts
import { techPileQuestionViz } from './viz/tech-pile-question'
```

`techChipPileMonoViz` 다음에 `techPileQuestionViz`를 추가한다.

- [ ] **Step 4: 자동 검증**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits with code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: 목록 연결 커밋**

```bash
git add src/ppt/vizRegistry.ts tests/techPileQuestion.test.ts
git commit -m "feat(ppt): 기술 더미 질문 장면을 목록에 등록"
```

- [ ] **Step 6: 로컬 프레임 검증**

`t=0`, `t=0.4`, `t=0.82`, `t=0.94`에서 칩 더미는 동일해야 한다. 질문은 시작에 숨김, 유지 구간에 완전 표시, 0.82에서 페이드아웃 중, 0.94에서 숨김이어야 한다.
