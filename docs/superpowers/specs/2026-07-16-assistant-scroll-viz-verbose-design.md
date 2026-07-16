# 어시스턴트 스크롤·그래프 다양화·Verbose 실측값 — 설계 스펙

작성일 2026-07-16. 브랜치는 frontend 저장소 기준(작업 시작 시 결정). 대상: `/assistant`
(`AssistantWorkspace` = 좌 `ResumeInsight` / 우 `RagConsole`).

## 배경

체크리스트 3항목을 조사한 결과, 세 항목 모두 백지에서 시작하는 게 아니라 이미 존재하는
코드(버그·죽은 컴포넌트·가짜 데이터)를 바로잡거나 연결하는 작업에 가깝다는 게 확인됐다.

- **스크롤**: 원인이 특정된 실제 버그. 가짜로 재현한 게 아니라 devtools로 수정 후 즉시
  해소되는 것까지 검증했다.
- **그래프**: `AssistantVisualizer.tsx`(ECharts network/sankey)와 `VizChart.tsx`(ECharts
  line/bar/radar/donut/grouped)가 이미 구현돼 있는데 실채팅 결과 렌더링(`RagConsole.tsx`의
  `ToolResultCard`)에 연결돼 있지 않다(둘 다 미사용 dangling 컴포넌트).
- **Verbose**: `EngineTechnicalDetails.tsx`가 이미 있지만 "쿼리 벡터 프리뷰"가
  `[0.024827, -0.015291, ...]` 하드코딩 가짜값이다. 백엔드 `vector_tool.py`/`sql_tool.py`/
  `graph_tool.py`는 실제 임베딩 벡터·실행 SQL 원문을 이미 로컬 변수로 계산하지만 API
  계약(`chatContract.ts` / `schemas.py`)에는 실려 나가지 않는다. 이 프로젝트는 "LLM이 지어낸
  숫자 금지, 전부 실데이터" 원칙이 강한 곳이라(`demoScenarios.ts` 주석 등) 가짜 벡터를 보여주는
  건 원칙 위반 — 진짜로 하려면 백엔드도 같이 손대야 한다.

## 확정된 방향 (사용자 결정)

- Verbose의 "실제 벡터·계산값"은 **백엔드까지 포함**해서 진짜 값을 노출한다(프론트 페이크 금지).
- 그래프 라이브러리는 **ECharts로 통일**한다. D3는 도입하지 않는다 — 이미 `echarts-for-react`
  의존성이 있고, 죽은 코드가 필요한 차트 종류(line/bar/radar/donut/grouped/network/sankey)를
  대부분 커버한다.

## 대상 파일 (구현 파티션)

세 Phase는 파일이 거의 겹치지 않아 병렬 진행 가능. 커밋은 Phase 단위로 분리한다.

### Phase 1 — 좌·우 패널 독립 스크롤 (버그 픽스)

- `src/desktop/DesktopShell.css` — `.dshell__content:has(.aw) > .kit-trans { height: 100%; }`
  추가.

**원인**: 페이지 전환 래퍼(`src/career/kit.tsx:745`, `.kit-trans`)에 `height:100%`가 없어
`.aw`(`assistant-workspace.css`)의 `height:100%` 체인이 끊긴다. `.dshell__content:has(.aw)
{ overflow: hidden }`(다른 라우트는 페이지 자체가 스크롤되므로 상관없지만, `/assistant`는
좌우 pane이 각자 스크롤하도록 의도적으로 외부 스크롤을 막아둔 규칙) 때문에, 체인이 끊겨
`.aw`가 콘텐츠 높이만큼 부풀면 그 초과분이 스크롤 없이 그냥 잘려서 안 보인다. 위 CSS 한 줄로
`.kit-trans`에 정의된 높이를 되살리면 `.aw` → `.aw__pane` → `.ri`/`.rc`까지 다시 실제 높이로
바운드되고, 각 pane에 이미 걸려 있는 `overflow-y: auto`(`.aw__pane--left > .ri`,
`.aw__pane--right > .rc`, `.rc__body`)가 정상 동작한다. devtools로 실제 주입해 좌우 패널이
각자 독립 스크롤되는 것을 확인했다. `:has(.aw)`로 스코프했으므로 다른 라우트의 페이지 전환
동작(`kit-trans--push`/`--tab` 포함)은 영향받지 않는다.

### Phase 2 — 결과별 그래프 다양화

- `src/rag/RagConsole.tsx` — `ToolResultCard`(374행 부근)가 `tool_result.kind`+모양에 따라
  차트 컴포넌트를 고르도록 확장.
- `src/rag/AssistantVisualizer.tsx` — 기존 network/sankey 로직 재사용, 실데이터 연결.
  현재 `graphResult`/`vectorResult` 판별 로직은 이미 실데이터(`ToolResult`) 기준으로 짜여
  있으므로 큰 변경 없이 `RagConsole`에서 import해서 쓰면 된다.
- `src/rag/VizChart.tsx` — `demoScenarios`의 `Viz` 타입 대신 `ToolResult` → `Viz` 변환 헬퍼를
  하나 추가(`kind: trend` → line, `kind: compare` → grouped/radar)해서 실채팅에도 재사용.
  데모 시나리오 쪽 호출부(`RagConsole`의 데모 재생 로직이 있다면)는 그대로 둔다.
- 신규: region_distribution 같은 지역×비중 결과에 ECharts heatmap 옵션 추가(`AssistantVisualizer`
  또는 별도 작은 빌더 함수).

| 결과 모양 | 차트 |
|---|---|
| `kind: graph` | 네트워크 그래프 / Sankey 토글 (기존 `AssistantVisualizer`) |
| `kind: trend` | ECharts 라인 (`VizChart` line 옵션 재사용) |
| `kind: compare` | ECharts 그룹 바 또는 레이더 |
| `kind: list` (랭킹) | 지금 미니바 유지, "차트로 보기" 토글 시 ECharts 수평바 |
| region_distribution intent | ECharts heatmap 신규 |

기본 모드는 지금처럼 미니바만 보여주고, 확장 차트는 "모든 과정 보기" 이상에서만 노출한다
(Phase 3의 3단계 모드와 연결).

### Phase 3 — 기본 / 모든 과정 보기 / Verbose 3단계 + 백엔드 실측값

**프론트**

- `src/rag/RagConsole.tsx` — `Mode` 타입을 `'basic' | 'full' | 'verbose'`로 확장.
  - 기본: 답변 + 인용 + 신뢰도만(현행 유지).
  - 모든 과정 보기: 지금 `verbose`가 하던 것(단계·도구 결과 카드) — 그대로, 이름만 분리.
  - Verbose: 위에 `EngineTechnicalDetails`(실데이터 버전)까지 추가로 노출.
  - 세그먼트 컨트롤 버튼 3개로 확장(`rc__seg` 마크업 재사용).
- `src/rag/chatStream.ts` / `chatContract.ts` — `streamChat` 호출에 `verbose: boolean` 파라미터
  추가, `ChatRequestBody`에 `verbose?: boolean` 필드 추가. `StreamToolResult`/`ToolResult`에
  `debug?: Record<string, unknown>` 필드 추가.
- `src/rag/EngineTechnicalDetails.tsx` — 하드코딩된 `쿼리 벡터 프리뷰` 등 가짜 값 전부 제거하고,
  `turn.results[].debug`(백엔드가 verbose일 때만 채워 보내는 실측값)를 그대로 렌더링하도록
  재작성. 백엔드가 안 보내는 필드(=debug가 없는 도구)는 해당 섹션을 아예 숨긴다.

**백엔드**

- `app/services/rag/schemas.py` — `ChatRequest`에 `verbose: bool = False` 추가.
  `ToolResult`에 `debug: dict[str, Any] | None = None` 추가.
- `app/services/rag/pipeline.py` — `run_chat_events(session, question, pool, *, verbose=False,
  collect=None)`로 시그니처 확장, `_dispatch(session, p, verbose=verbose)`까지 관통.
- `app/services/rag/tools/vector_tool.py` — `semantic_search(..., verbose=False)`.
  `verbose=True`일 때 반환 dict에 `debug` 추가:
  `{"embedding_preview": [round(x, 6) for x in vec[:8]], "embedding_dim": len(vec),
  "sql": "<실제 실행된 SQL 원문>", "distance_metric": "cosine (pgvector <=> )"}`.
- `app/services/rag/tools/sql_tool.py` — 각 함수(`top_skills`/`skill_demand`/
  `multi_skill_compare`/`top_locations`/`top_concepts`/`top_certs`)가 이미 로컬 변수로 만드는
  `sql`/`params`를 `verbose=True`일 때 결과 dict의 `debug`로 실어 보낸다.
- `app/services/rag/tools/graph_tool.py` — `co_occurring_skills`가 이미 계산하는 강도 산식의
  분자/분모 실값을 `debug`로 실어 보낸다.
- `app/routers/chat.py` — `body.verbose`를 `run_chat`/`run_chat_events`에 그대로 전달.

**비목표**: 임베딩 전체 1024차원 노출(프리뷰 8차원까지만 — 발표 자료로 충분하고 페이로드
낭비 방지), D3 신규 도입, 비-verbose 응답 페이로드 크기 변화(옵셔널 필드라 영향 없음).

## 검증

- `npm run build`(frontend), 백엔드 관련 pytest(수정된 tools 모듈 대상).
- devtools로 `/assistant`에서 좌·우 패널에 긴 콘텐츠(예시 보기 + verbose 대화 여러 턴)를 채운
  뒤 각각 독립 스크롤되는지 확인(Phase 1 회귀 검증).
- 채팅 시나리오별(cooccurrence/semantic_search/skill_demand/compare/region_distribution)로
  질문을 던져 각 결과 kind에 맞는 차트가 뜨는지 확인(Phase 2).
- Verbose 모드에서 백엔드가 실제로 다른 임베딩 프리뷰·SQL 원문을 질문마다 다르게 내려주는지
  확인 — 고정값이면 가짜이므로 실패로 간주(Phase 3).

## 비목표 (이번 범위 밖)

- 모바일 `/assistant` 레이아웃 개편(데스크톱 우선, 기존 `@media max-width:1023px` 보정 유지).
- `resume-insight.css`의 예시/블러 프리뷰 로직 변경.
- 채팅 히스토리 저장·재방문 복원(기존 localStorage 캐시 범위 밖의 새 기능 추가 없음).
