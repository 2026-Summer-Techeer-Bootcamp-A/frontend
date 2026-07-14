# Guest Search Filter UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이력서가 없는 사용자도 실제 백엔드 데이터 범위에서 직무·기술·국내 지역·국내 마감 조건으로 공고를 세부 검색할 수 있게 한다.

**Architecture:** 백엔드는 수정하지 않고 기존 `/skills`, `/job-categories`, `/stats/region-density`, `/postings` 계약만 사용한다. 큰 `placeholders.tsx`의 충돌 면적을 줄이기 위해 필터 UI를 별도 컴포넌트로 분리하고, 기존 `DesktopJobs`에는 상태와 API 파라미터 연결만 남긴다.

**Tech Stack:** React 18, TypeScript, Vite, Node 내장 `node:test`

## Global Constraints

- 등록일과 경력 필터는 추가하지 않는다.
- 기술 여러 개는 기존 API 의미대로 OR 조건으로 검색한다.
- 지역과 마감 필터는 국내 풀에서만 활성화한다.
- 마감 필터에는 마감일 미기재 공고가 제외된다는 안내를 표시한다.
- 이력서 미등록 시 `match` 정렬을 사용하지 않는다.
- 백엔드, lockfile, `AGENTS.md`는 수정하지 않는다.
- 기존 URL의 `deadline=1`은 7일 조건으로 계속 해석한다.

---

### Task 1: 필터 상태 규칙을 순수 함수로 분리

**Files:**
- Create: `src/desktop/pages/jobsFilterState.ts`
- Test: `tests/jobsFilterState.test.ts`

**Interfaces:**
- Produces: `JobPool`, `JobSort`, `parseDeadlineDays`, `normalizeJobSort`, `mergeSkillOptions`

- [ ] **Step 1: 실패 테스트 작성**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeSkillOptions, normalizeJobSort, parseDeadlineDays } from '../src/desktop/pages/jobsFilterState.ts'

test('기존 deadline=1을 7일로 해석한다', () => {
  assert.equal(parseDeadlineDays(new URLSearchParams('deadline=1')), 7)
})

test('이력서 없는 사용자의 매칭순을 최신순으로 정규화한다', () => {
  assert.equal(normalizeJobSort('match', false, '국내'), 'latest')
})

test('글로벌의 마감순을 최신순으로 정규화한다', () => {
  assert.equal(normalizeJobSort('deadline', true, '국외'), 'latest')
})

test('선택 기술과 API 기술을 중복 없이 합친다', () => {
  assert.deepEqual(mergeSkillOptions(['Java'], ['Java', 'Spring']), ['Java', 'Spring'])
})
```

- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인**

Run: `node --test --experimental-strip-types tests/jobsFilterState.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: 최소 구현 작성**

```ts
export type JobPool = '국내' | '국외'
export type JobSort = 'match' | 'latest' | 'deadline'
export const DEADLINE_OPTIONS = [3, 7, 14, 30] as const

export function parseDeadlineDays(params: URLSearchParams): number | undefined {
  const value = Number(params.get('deadline_days'))
  if (DEADLINE_OPTIONS.includes(value as (typeof DEADLINE_OPTIONS)[number])) return value
  return params.get('deadline') === '1' ? 7 : undefined
}

export function normalizeJobSort(sort: JobSort, hasResume: boolean, pool: JobPool): JobSort {
  if (sort === 'match' && !hasResume) return 'latest'
  if (sort === 'deadline' && pool === '국외') return 'latest'
  return sort
}

export function mergeSkillOptions(selected: string[], fetched: string[]): string[] {
  return [...new Set([...selected, ...fetched])].sort((a, b) => a.localeCompare(b))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test --experimental-strip-types tests/jobsFilterState.test.ts`

Expected: 4 tests PASS.

### Task 2: 게스트 필터 패널 구현 및 기존 API 연결

**Files:**
- Create: `src/desktop/pages/JobsFilterPanel.tsx`
- Modify: `src/desktop/pages/placeholders.tsx`
- Modify: `src/career/api.ts`

**Interfaces:**
- Consumes: `JobPool`, `JobSort`, `DEADLINE_OPTIONS`
- Produces: 제어형 `JobsFilterPanel` 컴포넌트

- [ ] **Step 1: 메타 조회 타입을 명시하고 기술 검색 limit를 선택 가능하게 변경**

```ts
skills(q = '', limit = 20) {
  return request<{ skills: Array<{ canonical: string; category: string; aliases: string[] }> }>(
    withQuery('/skills', { q, limit }),
  )
}
```

- [ ] **Step 2: 필터 패널 컴포넌트 작성**

패널은 이력서 안내, 검색어, 풀, 검색 가능한 기술 OR 선택, 직무, 국내 지역, 국내 마감 기간, 정렬, 초기화, 결과 건수를 렌더링한다. 모든 상태는 props로 받고 변경 시 부모 콜백만 호출한다.

- [ ] **Step 3: DesktopJobs에 메타 API와 상태 연결**

`jobsApi.categories()`, `jobsApi.skills()`, `marketApi.regionDensity({ pool: 'domestic', limit: 100 })`를 읽고 실패 시 현재 결과에서 계산한 기술 및 기존 직무 목록으로 폴백한다. `/postings`에는 기존 파라미터만 전달한다.

- [ ] **Step 4: URL 호환성 유지**

`tech`, `position`, `district`, `deadline_days`, `sort`를 URL에 반영하고, 글로벌 전환 시 `district`와 `deadline_days`를 제거한다. 기존 `deadline=1`은 읽기만 하고 다음 URL 갱신에서 `deadline_days=7`로 정규화한다.

### Task 3: 패널 스타일과 회귀 검증

**Files:**
- Modify: `src/desktop/pages/jobs.css`

- [ ] **Step 1: 기술 검색·선택 요약·국내 전용 안내·초기화 버튼 스타일 추가**

기존 `.djobs__*` 네임스페이스만 사용하고 전역 선택자와 기존 레이아웃 값은 변경하지 않는다.

- [ ] **Step 2: 단위 테스트 실행**

Run: `node --test --experimental-strip-types tests/jobsFilterState.test.ts`

Expected: all tests PASS.

- [ ] **Step 3: 프로덕션 빌드 실행**

Run: `npm run build`

Expected: TypeScript와 Vite build 성공.

- [ ] **Step 4: 변경 범위 확인**

Run: `git status --short && git diff --check && git diff --stat`

Expected: 백엔드·lockfile·`AGENTS.md` 변경 없음, whitespace 오류 없음.
