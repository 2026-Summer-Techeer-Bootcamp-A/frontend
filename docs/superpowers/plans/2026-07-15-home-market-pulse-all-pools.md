# Home Market Pulse All Pools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈의 `전체` 풀에서 국내·해외 채용 시장 통계를 합산해 카드 하나로 표시한다.

**Architecture:** 기존 국내·해외 통계 API를 병렬 호출하고 `homeApi.ts`의 순수 함수로 타임라인과 기술 점유율을 합산한다. `HomeMarketPulse.tsx`는 선택된 풀에 따라 단일 응답 또는 합산 응답을 상태에 저장하고 기존 렌더링을 그대로 사용한다.

**Tech Stack:** React 18, TypeScript, Node 내장 테스트 러너, 기존 `/api/v1/stats/*` API

## Global Constraints

- 새 백엔드 API와 새 컴포넌트 파일을 추가하지 않는다.
- `전체`일 때만 국내·해외 요청을 함께 수행한다.
- 전체 배지는 `전체`, 기술 목록은 합산 Top 5로 표시한다.
- 기존 특이값 처리, 로딩, 오류 시 카드 숨김 정책을 유지한다.

---

### Task 1: 통계 합산 순수 함수

**Files:**
- Modify: `src/career/homeApi.ts`
- Test: `src/career/homeApi.test.ts`

**Interfaces:**
- Consumes: `PostingTimelineDto[]`, `SkillShareDto[]`
- Produces: `mergePostingTimelines(timelines): PostingTimelineDto`, `mergeSkillShares(shares, topK): SkillShareDto`

- [ ] **Step 1: 실패 테스트 작성**

`homeApi.test.ts`에 서로 겹치는 날짜와 기술을 가진 국내·해외 fixture를 추가한다. 타임라인의 같은 날짜 `total`이 합산되고, 기술 `posting_count`와 `sample_size`가 합쳐진 뒤 `share`와 Top 5 순서가 다시 계산되는지 단언한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm.cmd test`

Expected: `mergePostingTimelines`와 `mergeSkillShares`가 아직 없어 실패.

- [ ] **Step 3: 최소 구현**

`mergePostingTimelines`는 날짜 Map에 `total`과 숫자형 `matched`를 합산하고 날짜순으로 정렬한다. `mergeSkillShares`는 canonical Map에 `posting_count`를 합산하고 전체 `sample_size`로 share를 소수 넷째 자리까지 다시 계산한 뒤 `topK`만 반환한다. 두 함수의 `as_of`는 입력 중 가장 늦은 날짜를 사용한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm.cmd test`

Expected: 기존 특이값 테스트와 신규 합산 테스트 모두 PASS.

### Task 2: 전체 풀 카드 연동

**Files:**
- Modify: `src/desktop/pages/home/HomeMarketPulse.tsx`

**Interfaces:**
- Consumes: Task 1의 `mergePostingTimelines`, `mergeSkillShares`
- Produces: `pool='all'`일 때 합산된 `share`, `timeline` 상태와 `전체` 배지

- [ ] **Step 1: 전체 풀 요청 구성**

`pool='all'`이면 국내·해외 `postingTimeline(..., 365)`와 `skillShare(..., 100)`을 병렬 호출한다. 단일 풀이면 기존처럼 해당 풀 Top 5와 타임라인만 호출한다.

- [ ] **Step 2: 합산 결과 연결**

전체 응답은 Task 1 함수로 합산해 기존 상태에 저장한다. `POOL_LABEL`에 `all: '전체'`를 추가하고 기존 스파크라인·특이값·기술 Top 5 렌더링을 재사용한다.

- [ ] **Step 3: 전체 검증**

Run: `npm.cmd test`

Expected: 모든 테스트 PASS.

Run: `npm.cmd run build`

Expected: TypeScript와 Vite 빌드 exit code 0.

수동 확인: 상단 `국내`, `해외`, `전체` 전환 시 카드 배지와 수치가 각각 변경되고 `전체`가 양쪽 합산값을 표시한다.
