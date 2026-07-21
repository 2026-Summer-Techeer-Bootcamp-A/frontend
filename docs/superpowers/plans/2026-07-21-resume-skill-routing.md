# 이력서 기술 분야 분류 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이력서에서 모노톤 기술 칩 8개가 하나씩 나와 백엔드·프론트·데이터·인프라 레인을 따라 이동한 뒤 자연스럽게 사라지는 별도 Canvas 시각화를 추가한다.

**Architecture:** 새 모듈 하나가 고정 기술 데이터, 진행률 기반 순수 상태 계산, Canvas 렌더링을 소유한다. 레지스트리는 새 `VizDef`만 연결하고 기존 이력서·별·기술 칩 시각화와 공통 유틸리티는 변경하지 않는다.

**Tech Stack:** TypeScript, Canvas 2D, React/Vite, Node.js test runner

## Global Constraints

- 기술은 Java, React, Docker, MySQL, Spring, AWS, Python, Git의 8개다.
- 최종 분야별 수는 백엔드 2, 프론트 1, 데이터 2, 인프라 3이다.
- 칩 명도는 백엔드 흰색, 프론트 밝은 회색, 데이터 중간 회색, 인프라 검정이다.
- 전체 재생 시간은 9000ms이며 마지막 1초에는 모든 칩이 사라진 정지 상태를 유지한다.
- 별, 점군, 입자, 방사형 허브, 난수와 외부 의존성을 사용하지 않는다.
- 기존 `problem.ts`, `resume-stack-clean.ts`, `tech-chip-pile.ts`, `tech-chip-pile-mono.ts`, `common.ts`는 수정하지 않는다.

---

### Task 1: 기술 이동 상태와 Canvas 렌더러

**Files:**
- Create: `src/ppt/viz/resume-skill-routing.ts`
- Create: `tests/resumeSkillRouting.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `RESUME_SKILLS`, `getResumeSkillRoutingFrame(progress, width, height)`, `renderResumeSkillRouting`, `resumeSkillRoutingViz`
- `getResumeSkillRoutingFrame` returns `{ skills: ResumeSkillState[]; completed: Record<SkillField, number> }`

- [ ] **Step 1: 실패 테스트 작성**

`tests/resumeSkillRouting.test.ts`에 다음 동작을 검증한다.

```ts
test('8개 기술을 네 분야와 네 단계 모노톤에 매핑한다', () => {
  assert.deepEqual(
    RESUME_SKILLS.map(({ name, field, tone }) => ({ name, field, tone })),
    [
      { name: 'Java', field: 'backend', tone: 'white' },
      { name: 'React', field: 'frontend', tone: 'light' },
      { name: 'Docker', field: 'infra', tone: 'black' },
      { name: 'MySQL', field: 'data', tone: 'mid' },
      { name: 'Spring', field: 'backend', tone: 'white' },
      { name: 'AWS', field: 'infra', tone: 'black' },
      { name: 'Python', field: 'data', tone: 'mid' },
      { name: 'Git', field: 'infra', tone: 'black' },
    ],
  )
})

test('기술 칩은 순차 이동하고 도착하면 사라진다', () => {
  const start = getResumeSkillRoutingFrame(0.05, 960, 540)
  const middle = getResumeSkillRoutingFrame(0.45, 960, 540)
  const end = getResumeSkillRoutingFrame(8 / 9, 960, 540)
  assert.equal(start.skills.filter((skill) => skill.visible).length, 0)
  assert.ok(middle.skills.some((skill) => skill.visible && skill.inTransit))
  assert.ok(middle.skills.some((skill) => skill.arrived))
  assert.ok(end.skills.every((skill) => !skill.visible && skill.arrived))
})

test('최종 분야별 완료 수를 유지한다', () => {
  assert.deepEqual(getResumeSkillRoutingFrame(1, 960, 540).completed, {
    backend: 2,
    frontend: 1,
    data: 2,
    infra: 3,
  })
})

test('독립된 9초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(resumeSkillRoutingViz.id, 'resume-skill-routing')
  assert.equal(resumeSkillRoutingViz.category, 'feature')
  assert.equal(resumeSkillRoutingViz.period, 9000)
  assert.equal(resumeSkillRoutingViz.render, renderResumeSkillRouting)
})
```

`package.json`의 `test` 명령 끝에 `tests/resumeSkillRouting.test.ts`를 추가한다.

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `npm test`

Expected: `ERR_MODULE_NOT_FOUND` for `src/ppt/viz/resume-skill-routing.ts`.

- [ ] **Step 3: 최소 상태 계산 구현**

`src/ppt/viz/resume-skill-routing.ts`에 아래 고정 타이밍을 사용한다.

```ts
const PERIOD_MS = 9000
const FIRST_START_MS = 700
const START_GAP_MS = 650
const JOURNEY_MS = 1750
```

각 기술의 `local = clamp01((timeMs - startMs) / JOURNEY_MS)`를 계산한다. `0 < local < 1`이면 visible/inTransit, `local >= 1`이면 arrived다. 2차 베지어 곡선으로 위치를 계산하고 마지막 22%에서 alpha와 scale을 0으로 줄인다. 완료 수는 arrived 기술을 분야별로 합산한다.

- [ ] **Step 4: Canvas 렌더러 구현**

어두운 배경 위에 왼쪽 모노톤 이력서, 오른쪽 네 분야 라벨과 곡선 레인을 그린다. 기술 칩은 상태 계산 결과의 위치·크기·투명도를 사용하고, 분야 카운트는 `분류 완료 n`으로 표시한다. 상단 라벨은 `문제 인식 · 이력서 속 기술 분류`, 하단 캡션은 시작·분류 중·완료 세 상태로 변경한다.

```ts
export const resumeSkillRoutingViz: VizDef = {
  id: 'resume-skill-routing',
  title: '이력서 기술 분류',
  subtitle: '내 기술이 분야별 경로를 따라 분류되다',
  category: 'feature',
  period: PERIOD_MS,
  render: renderResumeSkillRouting,
}
```

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 6: 구현 커밋**

```bash
git add package.json tests/resumeSkillRouting.test.ts src/ppt/viz/resume-skill-routing.ts
git commit -m "feat(ppt): 이력서 기술 분야 분류 시각화 추가"
```

### Task 2: 목록 등록과 최종 검증

**Files:**
- Modify: `src/ppt/vizRegistry.ts`
- Modify: `tests/resumeSkillRouting.test.ts`

**Interfaces:**
- Consumes: `resumeSkillRoutingViz: VizDef`
- Produces: `/ppt-visual-maker`의 별도 `이력서 기술 분류` 항목

- [ ] **Step 1: 레지스트리 실패 테스트 추가**

Node 테스트에서 브라우저용 확장자 없는 import를 직접 평가하지 않도록 `vizRegistry.ts` 소스를 읽어 다음을 검증한다.

```ts
test('시각화 목록에 별도 항목으로 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /resumeSkillRoutingViz/)
})
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `npm test`

Expected: assertion failure because `resumeSkillRoutingViz` is absent.

- [ ] **Step 3: 레지스트리에 연결**

```ts
import { resumeSkillRoutingViz } from './viz/resume-skill-routing'
```

`techChipPileMonoViz` 다음에 `resumeSkillRoutingViz`를 추가한다.

- [ ] **Step 4: 자동 검증**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: Vite production build exits with code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: 목록 연결 커밋**

```bash
git add src/ppt/vizRegistry.ts tests/resumeSkillRouting.test.ts
git commit -m "feat(ppt): 이력서 기술 분류 시각화를 목록에 등록"
```

- [ ] **Step 6: 로컬 프레임 검증**

`http://127.0.0.1:5713/ppt-visual-maker`에서 새 항목을 선택하고 `t=0.05`, `t=0.45`, `t=0.9` 프레임을 확인한다. 시작에는 칩이 없고, 중간에는 기술이 네 분야 레인을 따라 이동하며, 마지막에는 모든 칩이 사라지고 `2·1·2·3` 완료 수가 남아야 한다.
