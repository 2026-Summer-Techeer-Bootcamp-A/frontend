# 마이 · 어시스턴트 리디자인 + 전역 라운딩 — 설계 스펙

작성일 2026-07-14. 브랜치 `feat/mypage-assistant-redesign` (frontend).
목표: 마이페이지·어시스턴트가 "넓은데 비어보이는" 문제를 홈과 같은 **옅은 회색 배경 + 흰 카드**
레이아웃 + 밀도 개선으로 해소하고, 어시스턴트에 **실데이터 기반 d3 시각화**와
**ChatGPT/Claude식 중앙 정렬 챗 첫 화면**을 넣는다. 전역 카드 라운딩을 미디엄으로 낮춘다.

## 확정된 방향 (사용자 결정)

- 시각화 범위: **핵심 3종** (커버리지 링 + 수요 대비 내 보유 바 + 미보유 갭 리스트). 네트워크/트렌드는 후순위 여지만 남긴다.
- 어시스턴트 레이아웃: **좌 분석 대시보드 / 우 중앙정렬 챗** (기존 40/60 접이식 유지).
- 빈/비로그인 상태: **블러 프리뷰 + `예시 보기` 버튼** (클릭 시 샘플 데이터로 채움).
- 마이페이지: **프로필·활동 허브 유지 + 밀도 개선**, 상단에 **미니 커버리지 스냅샷 + 어시스턴트 링크**.
- 라운딩: **미디엄** — `THEME.radius 22→14`, `.dcard 18→12`, `.dshell__content 24→16`. 작은 태그 칩(완전 원형)은 유지.
- 챗 첫 화면: **개인화 그리팅** (`{이름}님, 오늘은 뭘 볼까요?` + 데이터 훅 한 줄), 비로그인 시 중립 문구.
- 이력서 불러오기: **불러오면 자동 분석 실행**.
- 어시스턴트 결과: **localStorage 캐시**로 새로고침·재방문 시 복원.

## 대상 파일 (구현 파티션)

라운딩·배경은 공용 파일을 건드리므로 **Phase A를 먼저 커밋**한 뒤 B/C/D를 병렬로 돌린다.
B/C/D는 파일이 서로 겹치지 않게 파티션한다.

### Phase A — 전역 라운딩 + 회색 배경 (공용, 선행)
- `src/career/themes.ts` — `THEME.radius 22 → 14`.
- `src/desktop/DesktopShell.tsx:222` — 회색 배경 조건을 `/home` 단일 비교에서
  `['/home','/resume','/assistant'].includes(pathname)` 형태로 확장(작은 헬퍼로).
- `src/desktop/DesktopShell.css` — `.dshell__content` `border-radius: 24px → 16px`.
- `src/desktop/pages/placeholders.css` — `.dcard` `border-radius: 18px → 12px`.
- 이 4개 파일 범위에서 눈에 띄는 하드코딩 큰 반경(≥20px, 완전 원형 999 제외)만 톤 맞춰 소폭 하향.
  다른 페이지 CSS는 이번 범위에서 건드리지 않는다(회귀 방지).

### Phase B — 마이페이지 밀도 개선 (`DesktopMy`)
- `src/desktop/pages/placeholders.tsx` — `DesktopMy()` 함수 (1410~1605).
- `src/desktop/pages/placeholders.css` — `.dmy*` 계열 스타일.
- Phase A 회색 배경 덕에 기존 `.dcard`가 흰 카드로 살아난다. 추가로:
  - 상단 히어로 영역에 **미니 커버리지 스냅샷**: 작은 도넛 링(커버리지%) + `자세히 분석 →`
    버튼 → `navigate('/assistant')`. 비로그인/이력서 없음 시 "로그인하면 커버리지가 보여요" 정도.
  - 카드 패딩/간격/빈 상태 카피 정리로 빈 느낌 완화. 2컬럼 밸런스 조정.
  - 커버리지 스냅샷 도넛은 Phase C가 만드는 재사용 링 컴포넌트를 **쓰지 말고**(파일 충돌 회피)
    B 안에서 간단한 인라인 SVG 도넛으로 그린다. 값은 기존 `coverage`(activeResume.coveragePct
    ?? calculateCoverage) 로직 재사용.

### Phase C — 어시스턴트 좌: 이력서 분석 대시보드 (핵심)
- `src/rag/ResumeInsight.tsx`
- `src/rag/resume-insight.css` (C 전용. `rag-console.css`는 건드리지 않는다)
- `src/rag/resumeInsightApi.ts` (필요 시 coverage/skill-share 헬퍼 추가 — 단, 아래처럼 기존 `career/api.ts` 재사용 권장)
- `src/rag/assistant-workspace.css` (C 소유. 좌·우 pane을 흰 카드로 감싸는 스타일 포함)
- 새 파일 `src/rag/viz/*.tsx` — d3 SVG 시각화 컴포넌트 3종.
- 데이터:
  - 커버리지 링: `api.coverage({ resumeId, token }, position)` → `{ coverage_score, top_skills[{canonical, owned}] }`.
    `Identity = { resumeId, token }`; 토큰은 `getAuthToken()`, resumeId는 불러온 저장 이력서 id.
    로그인+저장 이력서일 때만 실호출, 아니면 블러/샘플.
  - 수요 바 + 갭: `api.skillShare({ pool, position, top_k })` (공개) → `items[{canonical, share, posting_count}]`.
    보유 스킬 셋과 교차: 보유=채운 막대, 미보유=빈 막대. 갭 = 수요 상위 중 미보유 랭킹.
  - 피드백·면접질문: 기존 `/resume/feedback` 흐름 유지(그대로 하단에 배치).
- 동작:
  - 저장 이력서 `불러오기` 선택 시 스킬셋 로드 후 **자동으로 분석 실행**(feedback + 시각화 fetch).
  - 결과(피드백/질문 + 시각화 원천 데이터)를 **localStorage에 이력서별 키로 캐시**, 마운트 시 복원.
  - 빈/비로그인: 시각화를 **블러 처리** + 오버레이 CTA(`로그인하면 내 데이터로 채워져요`) +
    **`예시 보기`** 버튼 → 하드코딩 샘플(예: 백엔드 지원자)로 3종 시각화를 채워 보여준다.
    샘플임을 나타내는 `예시` 뱃지 표기.
- 색: near-black 모노 베이스 + 저채도 액센트(메모리 color 규칙). 코드/주석에 이모지 금지.

### Phase D — 어시스턴트 우: 챗 첫 화면 (`RagConsole`)
- `src/rag/RagConsole.tsx` — `turns.length === 0` 빈 상태(`rc__empty`, 122줄)를 중앙 정렬 그리팅으로.
- `src/rag/rag-console.css` — 챗 빈 상태 스타일 추가/수정. **기존 `rc__*` 클래스는 삭제/개명 금지**
  (ResumeInsight가 공유 사용). 추가·확장만 한다.
- 내용:
  - 세로 중앙 정렬된 그리팅: 개인화(`{이름}님, 오늘은 뭘 볼까요?` — `useAuth().user`) +
    데이터 훅 한 줄. 비로그인 시 중립 문구.
  - 추천 질문을 그리팅 아래 **카드형 버튼**으로(기존 하단 칩과 별개 또는 통합). 클릭 시 `submit(question)`.
  - 대화 시작되면 기존 챗 뷰 그대로.

## 검증

- `npm run build` (tsc -b + vite build) 통과.
- Playwright로 `/resume`, `/assistant` 데스크톱 스크린샷 — 회색+흰카드, 라운딩, 3 시각화(예시 보기),
  챗 중앙 그리팅 확인.
- 로그인/비로그인 두 상태 모두 화면이 비어보이지 않는지 확인.

## 비목표 (이번 범위 밖)

- 백엔드 신규 엔드포인트 추가.
- 네트워크(force graph)·연도 트렌드 시각화(레이아웃 여지만 남김).
- 모바일 `ResumeScreen.tsx` 리디자인(데스크톱 우선).
- 라운딩 외 다른 페이지(홈/대시보드/검색/마켓) 리디자인.
