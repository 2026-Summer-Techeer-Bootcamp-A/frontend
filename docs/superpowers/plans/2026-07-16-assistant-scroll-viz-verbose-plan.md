# 어시스턴트 스크롤·그래프 다양화·Verbose 실측값 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/assistant` 화면에서 (1) 좌·우 패널이 각자 독립 스크롤되게 고치고, (2) 실채팅 결과에
ECharts 기반 다양한 차트(네트워크/Sankey/막대)를 연결하고, (3) 답변 과정 표시를 기본/모든 과정
보기/Verbose 3단계로 나누고 Verbose에서 백엔드가 실제로 계산한 벡터·SQL 원문을 보여준다.

**Architecture:** 프론트(frontend 저장소)와 백엔드(backend 저장소)는 별개 git 저장소다. 세
Phase는 파일이 거의 겹치지 않아 순서대로 진행하되, Phase 1·2는 프론트 단독, Phase 3은 백엔드
먼저(스키마→도구 3종→파이프라인) 끝내고 프론트가 그 위에 얹힌다. 죽은 코드
(`AssistantVisualizer.tsx`, `EngineTechnicalDetails.tsx`)를 재활용하되 가짜 데이터는 전부
제거하고 실제 백엔드 응답 필드로 교체한다.

**Tech Stack:** React + TypeScript + Vite(프론트), FastAPI + SQLAlchemy + Pydantic(백엔드),
차트는 `echarts-for-react`(이미 두 저장소에 설치돼 있음, 신규 의존성 없음). 프론트 테스트는
`node --test --experimental-strip-types`(Vitest/Jest 아님, 프로젝트 기존 관행). 백엔드 테스트는
pytest + `sqlite_engine`/`pg_conn` 픽스처(`tests/conftest.py`, 기존 관행).

## Global Constraints

- D3 신규 도입 금지 — 차트는 ECharts로 통일(스펙 확정 사항).
- Verbose에 표시하는 값은 전부 실측값이어야 한다 — 하드코딩·추정값 금지(프로젝트 원칙,
  `demoScenarios.ts` 주석 "LLM이 지어낸 숫자가 아님"과 동일 기준).
- `verbose` 플래그가 없거나 `False`일 때 기존 API 응답 모양(필드 존재 여부·값)은 변하지 않는다
  (옵셔널 필드만 추가, 회귀 없음).
- 코드/주석에 이모지 사용 금지(레포 전역 관례).
- 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` 포함.

---

## 사전 준비 — 브랜치

- [ ] **Step 1: frontend 저장소에 새 브랜치 생성**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
git checkout -b feat/assistant-scroll-viz-verbose main
```

- [ ] **Step 2: backend 저장소에 새 브랜치 생성 (main 기준 — feat/cicd-advanced-optimization 위에 얹지 않는다)**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
git checkout -b feat/chat-verbose-debug main
```

Expected: 두 저장소 모두 새 브랜치로 전환됨(`git branch --show-current`로 확인).

---

## Phase 1 — 좌·우 패널 독립 스크롤 (frontend)

### Task 1: `.kit-trans` 높이 체인 복구

**Files:**
- Modify: `frontend/src/desktop/DesktopShell.css:209-211`

**Interfaces:** 없음(순수 CSS, 다른 Phase와 의존성 없음).

- [ ] **Step 1: 현재 버그를 재현해서 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run dev &
sleep 2
```

브라우저(또는 devtools MCP)로 `http://localhost:5173/assistant` 접속 후 콘솔에서:

```js
document.querySelector('.dshell__content > .kit-trans').getBoundingClientRect().height
document.querySelector('.dshell__content').clientHeight
```

Expected: 첫 번째 값이 `auto`로 콘텐츠에 딸려 커지고, `.dshell__content`의 `overflow-y`가
`hidden`이라 둘째 값보다 큰 콘텐츠가 스크롤 없이 잘려서 사라지는 걸 확인(이미 이번 세션에서
devtools로 실측 확인됨: `.aw` 높이가 1287px인데 `.dshell__content`는 1169px였음).

- [ ] **Step 2: 수정 적용**

`frontend/src/desktop/DesktopShell.css`의 기존 규칙:

```css
.dshell__content:has(.aw) {
  overflow: hidden;
}
```

바로 아래에 추가:

```css
/* 어시스턴트 워크스페이스(.aw)의 height:100% 체인이 페이지 전환 래퍼(kit-trans, kit.tsx)를
   지나며 끊기지 않게 여기서만 높이를 강제한다. kit-trans는 다른 라우트에서도 재사용되므로
   :has(.aw)로 스코프해 다른 페이지 전환 애니메이션(kit-trans--push/--tab 등)에는 영향 없다. */
.dshell__content:has(.aw) > .kit-trans {
  height: 100%;
}
```

- [ ] **Step 3: 수정 확인 — 좌·우 패널이 각자 독립 스크롤되는지**

devtools 콘솔에서:

```js
const ri = document.querySelector('.ri')
const rc = document.querySelector('.rc')
;[ri, rc].map(el => ({ cls: el.className, scrollH: el.scrollHeight, clientH: el.clientHeight }))
```

Expected: `.aw`의 `getBoundingClientRect().height`가 `.dshell__content.clientHeight`와 거의
같아짐(패딩 차이만). 왼쪽 패널에서 "예시 보기"를 누르고 오른쪽에서 Verbose로 질문을 여러 번
보내 콘텐츠를 길게 만든 뒤, 마우스 휠로 왼쪽/오른쪽을 각각 스크롤해보면 서로 독립적으로
움직이고 콘텐츠가 잘리지 않는지 육안 확인(자동화된 시각 회귀 테스트는 이 프로젝트에 없음 —
기존 관행대로 수동 devtools 확인).

- [ ] **Step 4: 다른 라우트가 영향받지 않았는지 확인**

`/home`, `/resume`, `/my` 등 `.aw`가 없는 라우트를 열어 페이지 전환 애니메이션과 스크롤이
기존과 동일하게 동작하는지 확인(`:has(.aw)` 스코프 덕분에 CSS 매칭 자체가 안 되지만, 눈으로
한 번 더 확인).

- [ ] **Step 5: 빌드 확인 + 커밋**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run build
```

Expected: 에러 없이 빌드 성공.

```bash
git add src/desktop/DesktopShell.css
git commit -m "$(cat <<'EOF'
fix(desktop): restore height chain for assistant workspace scroll

kit-trans page-transition wrapper had no height:100%, so .aw's height
chain broke and overflow content was clipped by .dshell__content's
overflow:hidden instead of scrolling inside each pane.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — 결과별 그래프 다양화 (frontend)

### Task 2: `AssistantVisualizer` CSS 뼈대 추가

`AssistantVisualizer.tsx`는 이미 구현돼 있지만 참조하는 CSS 클래스(`rc__viz-box` 등)가
`rag-console.css`에 없어 지금 붙여도 스타일 없이 깨진 모양으로 나온다.

**Files:**
- Modify: `frontend/src/rag/rag-console.css` (파일 끝에 새 섹션 추가)

**Interfaces:** 없음(CSS만).

- [ ] **Step 1: CSS 추가**

`frontend/src/rag/rag-console.css` 파일 끝에 추가:

```css
/* === 도구 결과 시각화 박스 (AssistantVisualizer) — network/sankey/bar 공용 크롬 ===
   결과 카드(.rc__tr)와 별개로, "모든 과정 보기" 이상에서 결과 배열 전체를 보고 가장
   적합한 차트 하나를 골라 보여주는 블록이다. */
.rc__viz-box {
  border: 1px solid #e2e5ec;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}
.rc__viz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.rc__viz-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #5b5e66;
}
.rc__viz-tabs {
  display: inline-flex;
  gap: 4px;
}
.rc__viz-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #7c7f88;
  background: #f3f5f9;
  border: 1px solid #e2e5ec;
  border-radius: 999px;
  padding: 4px 9px;
  cursor: pointer;
}
.rc__viz-tab.active {
  background: #0b0b0c;
  color: #fff;
  border-color: #0b0b0c;
}
.rc__viz-tab:focus-visible {
  outline: 2px solid #28539c;
  outline-offset: 1px;
}
.rc__viz-chart-wrap {
  width: 100%;
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run build
```

Expected: 성공(아직 `AssistantVisualizer`를 아무도 import하지 않으므로 동작 변화는 없음).

- [ ] **Step 3: 커밋**

```bash
git add src/rag/rag-console.css
git commit -m "$(cat <<'EOF'
style(rag): add rc__viz-box CSS for AssistantVisualizer

Component already existed but referenced classes that were never
defined, so it would have rendered unstyled. Adding the CSS now,
ahead of wiring the component into RagConsole.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### Task 3: `AssistantVisualizer`를 실채팅 결과에 연결

**Files:**
- Modify: `frontend/src/rag/AssistantVisualizer.tsx:20-22`
- Modify: `frontend/src/rag/RagConsole.tsx` (import 추가, `TurnBlock` 렌더 블록 추가)

**Interfaces:**
- Consumes: `ToolResult`(`kind`, `label`, `items`, `nodes`, `edges`) — `chatContract.ts`에 이미
  정의됨. 변경 없음.
- Produces: `AssistantVisualizer(props: { results: ToolResult[]; route?: Route })` — 이미 있는
  시그니처 그대로(내부 매칭 로직만 compare kind로 확장).

- [ ] **Step 1: `AssistantVisualizer.tsx`의 `listResult` 매칭에 `compare` kind 포함**

`frontend/src/rag/AssistantVisualizer.tsx:20-22`의 현재 코드:

```tsx
  const graphResult = results.find((r) => r.kind === 'graph')
  const vectorResult = results.find((r) => r.kind === 'list' && (r.label.includes('유사') || r.label.includes('유사도')))
  const listResult = results.find((r) => r.kind === 'list' && !r.label.includes('유사') && !r.label.includes('유사도'))
```

교체:

```tsx
  const graphResult = results.find((r) => r.kind === 'graph')
  const vectorResult = results.find((r) => r.kind === 'list' && (r.label.includes('유사') || r.label.includes('유사도')))
  const listResult = results.find(
    (r) => (r.kind === 'list' || r.kind === 'compare') && !r.label.includes('유사') && !r.label.includes('유사도'),
  )
```

(`multi_skill_compare`가 반환하는 `kind: 'compare'` 결과도 이제 하단 수평 막대 차트로
그려진다.)

- [ ] **Step 2: `RagConsole.tsx`에 import 추가**

`frontend/src/rag/RagConsole.tsx` 상단 import 블록(6-8행 부근)에 추가:

```tsx
import AssistantVisualizer from './AssistantVisualizer'
```

- [ ] **Step 3: `TurnBlock`에 시각화 블록 추가**

`frontend/src/rag/RagConsole.tsx`의 `TurnBlock` 함수 안, 기존 "도구 결과" 블록
(`mode === 'verbose' && turn.results.length > 0 && (...)`, 251-258행 부근) 바로 앞에 추가:

```tsx
      {mode === 'verbose' && turn.results.length > 0 && (
        <AssistantVisualizer results={turn.results} route={turn.route} />
      )}

      {mode === 'verbose' && turn.results.length > 0 && (
        <div className="rc__ev-group">
          <div className="rc__ev-k">도구 결과</div>
          <div className="rc__tool-results">
            {turn.results.map((r, i) => <ToolResultCard key={i} result={r} />)}
          </div>
        </div>
      )}
```

(지금은 `mode`가 아직 `'basic' | 'verbose'` 2단이라 `mode === 'verbose'`로 충분하다. Task 11에서
`Mode`가 3단으로 늘어날 때 이 조건들을 `mode !== 'basic'`으로 한 번에 바꾼다 — 지금 단계에서는
건드리지 않는다.)

- [ ] **Step 4: 개발 서버에서 실제 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run dev &
sleep 2
```

`/assistant`에서 "모든 과정 보기 · Verbose" 모드로 전환 후 아래 질문들을 순서대로 보내(백엔드
서버가 떠 있어야 함 — 없으면 Phase 3 백엔드 작업 완료 후 다시 확인해도 됨):
- "React 배우면 뭘 같이 알아야 해?" → 네트워크 그래프/Sankey 토글이 뜨는지
- "내 이력서랑 비슷한 공고 찾아줘" → 유사도 네트워크가 뜨는지
- "React·Vue·Angular 비교해줘" → 수평 막대 차트가 뜨는지 (compare kind)

Expected: 각 시나리오에서 `.rc__viz-box`가 렌더되고 해당 차트 종류가 표시됨. 백엔드가 아직
안 떠 있어 요청이 실패하면 이 확인은 Phase 3 완료 후로 미루고 다음 단계로 진행해도 된다(빌드
성공이 이 Task의 필수 게이트).

- [ ] **Step 5: 빌드 확인 + 커밋**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run build
git add src/rag/AssistantVisualizer.tsx src/rag/RagConsole.tsx
git commit -m "$(cat <<'EOF'
feat(rag): wire AssistantVisualizer into live chat results

AssistantVisualizer (ECharts network/sankey/bar) existed but was never
imported anywhere. Connect it to RagConsole's verbose tool-result view
and extend its list-result matching to also cover compare-kind results
(multi_skill_compare), so skill comparisons get a bar chart too.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3a — 백엔드 verbose 실측값 (backend)

### Task 4: 스키마에 `verbose`/`debug` 필드 추가

**Files:**
- Modify: `backend/app/services/rag/schemas.py`
- Test: `backend/tests/test_rag_verbose_schema.py`

**Interfaces:**
- Produces: `ChatRequest.verbose: bool = False`, `ToolResult.debug: dict[str, Any] | None = None`.
  이후 모든 Task가 이 필드를 채운다.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_rag_verbose_schema.py` 생성:

```python
from app.services.rag.schemas import ChatRequest, ToolResult


def test_chat_request_verbose_defaults_false() -> None:
    req = ChatRequest(question="React 채용 추이 어때?")
    assert req.verbose is False


def test_chat_request_accepts_verbose_true() -> None:
    req = ChatRequest(question="React 채용 추이 어때?", verbose=True)
    assert req.verbose is True


def test_tool_result_debug_defaults_none() -> None:
    result = ToolResult(kind="list", label="수요 상위 기술", items=[])
    assert result.debug is None


def test_tool_result_accepts_debug_payload() -> None:
    result = ToolResult(
        kind="list",
        label="수요 상위 기술",
        items=[],
        debug={"sql": "SELECT 1", "params": {"pool": None}},
    )
    assert result.debug == {"sql": "SELECT 1", "params": {"pool": None}}
```

- [ ] **Step 2: 실패 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
python -m pytest tests/test_rag_verbose_schema.py -v
```

Expected: `verbose`/`debug` 필드가 아직 없어 `ValidationError`(예상 밖 필드는 pydantic이
기본적으로 무시하므로 정확히는 `req.verbose`/`result.debug` 접근 시 `AttributeError`) 로 FAIL.

- [ ] **Step 3: 스키마 수정**

`backend/app/services/rag/schemas.py`의 `ChatRequest`:

```python
class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    pool: Literal["domestic", "global"] | None = None
    verbose: bool = False
```

같은 파일의 `ToolResult`:

```python
class ToolResult(BaseModel):
    kind: Literal["list", "stat", "trend", "graph", "compare"]
    label: str
    items: list[ToolResultItem] = []
    value: float | int | str | None = None
    unit: str | None = None
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    debug: dict[str, Any] | None = None
```

- [ ] **Step 4: 통과 확인**

```bash
python -m pytest tests/test_rag_verbose_schema.py -v
```

Expected: 4개 테스트 모두 PASS.

- [ ] **Step 5: 커밋**

```bash
git add app/services/rag/schemas.py tests/test_rag_verbose_schema.py
git commit -m "$(cat <<'EOF'
feat(rag): add verbose request flag and debug result field

Optional fields only — verbose defaults False and debug defaults None,
so existing /chat and /chat/stream callers see no change in shape.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### Task 5: `vector_tool.semantic_search`에 실측 임베딩/SQL 노출

**Files:**
- Modify: `backend/app/services/rag/tools/vector_tool.py`
- Test: `backend/tests/test_vector_tool_verbose.py`

**Interfaces:**
- Consumes: `Task 4`의 `ToolResult.debug` 필드(반환 dict의 `tool_result` 안에 넣는다).
- Produces: `semantic_search(session, query, pool=None, limit=8, verbose=False)` — 새 키워드
  인자 `verbose` 추가. 반환 dict 모양은 그대로, `tool_result["debug"]`만 추가됨.

이 함수는 pgvector(`CAST(:qv AS vector)`)를 쓰므로 sqlite로는 못 돌린다. 실제 임베딩 모델을
띄우지 않고 플러밍만 검증하려고 `embed_query`를 monkeypatch한다 — 이 테스트가 검증하는 건
"verbose일 때 실제 vec/sql이 debug로 나가는가"이지 BGE-M3 정확도가 아니므로 적절한 격리다.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_vector_tool_verbose.py` 생성:

```python
from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.services.rag.tools import vector_tool


@pytest.fixture
def pg_session(pg_conn) -> Iterator[Session]:
    """pg_conn(conftest 공용) 위에 posting/posting_embedding 최소 데이터를 얹은 세션."""
    from sqlalchemy import create_engine

    from app.core.config import settings

    engine = create_engine(settings.database_url)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    with testing_session() as session:
        session.execute(
            __import__("sqlalchemy").text(
                "INSERT INTO posting (source, source_uid, pool, company, title) "
                "VALUES ('test', 'vt-1', 'domestic', '테스트컴퍼니', '백엔드 개발자') "
                "ON CONFLICT DO NOTHING"
            )
        )
        posting_id = session.execute(
            __import__("sqlalchemy").text(
                "SELECT id FROM posting WHERE source='test' AND source_uid='vt-1'"
            )
        ).scalar()
        vec_literal = "[" + ",".join(["0.01"] * 1024) + "]"
        session.execute(
            __import__("sqlalchemy").text(
                f"INSERT INTO posting_embedding (id, embedding) VALUES (:pid, CAST(:v AS vector)) "
                f"ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding"
            ),
            {"pid": posting_id, "v": vec_literal},
        )
        session.commit()
        yield session
        session.execute(
            __import__("sqlalchemy").text("DELETE FROM posting WHERE source='test' AND source_uid='vt-1'")
        )
        session.commit()
    engine.dispose()


@pytest.mark.integration
def test_semantic_search_verbose_false_has_no_debug(pg_session, monkeypatch) -> None:
    monkeypatch.setattr(vector_tool, "embed_query", lambda q: [0.01] * 1024)
    result = vector_tool.semantic_search(pg_session, "백엔드 개발자", pool="domestic", verbose=False)
    assert result is not None
    assert result["tool_result"].get("debug") is None


@pytest.mark.integration
def test_semantic_search_verbose_true_exposes_real_vector_and_sql(pg_session, monkeypatch) -> None:
    monkeypatch.setattr(vector_tool, "embed_query", lambda q: [0.01] * 1024)
    result = vector_tool.semantic_search(pg_session, "백엔드 개발자", pool="domestic", verbose=True)
    assert result is not None
    debug = result["tool_result"]["debug"]
    assert debug["embedding_dim"] == 1024
    assert debug["embedding_preview"] == [0.01] * 8
    assert "posting_embedding" in debug["sql"]
    assert "<=>" in debug["sql"]
    assert debug["distance_metric"].startswith("cosine")
```

- [ ] **Step 2: 실패 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
python -m pytest tests/test_vector_tool_verbose.py -v -m integration
```

Expected: `DATABASE_URL`이 설정돼 있으면 `verbose` 키워드 인자가 없어 `TypeError`로 FAIL.
`DATABASE_URL`이 없는 로컬 환경이면 conftest 규칙대로 SKIP(그 경우 이 Task는 아래 Step 3~5
코드 변경만 적용하고, 실제 통과 확인은 CI/Postgres가 있는 환경에서 한다 — 기존 프로젝트
관행과 동일).

- [ ] **Step 3: `semantic_search` 수정**

`backend/app/services/rag/tools/vector_tool.py`의 현재 함수 전체를 교체:

```python
def semantic_search(
    session: Session, query: str, pool: str | None = None, limit: int = 8, verbose: bool = False
) -> dict | None:
    vec = embed_query(query)
    if vec is None:
        return None

    qv = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
    sql = (
        f"SELECT p.id, p.title, p.company, p.pool, "
        f"(e.embedding <=> CAST(:qv AS vector)) AS dist "
        f"FROM posting_embedding e "
        f"JOIN posting p ON p.id = e.id "
        f"WHERE {_POOL_WHERE} "
        f"ORDER BY e.embedding <=> CAST(:qv AS vector) LIMIT :limit"
    )
    rows = session.execute(
        text(sql),
        {"qv": qv, "pool": norm_pool(pool), "limit": limit},
    ).all()
    if not rows:
        return None

    items = []
    for r in rows:
        sim = round((1.0 - float(r.dist)) * 100, 1)
        label = r.title if not r.company else f"{r.title} ({r.company})"
        items.append({"name": label, "metric": f"{sim}% 유사", "pct": sim})

    facts = "; ".join(f"{it['name']} {it['metric']}" for it in items[:5])
    debug = (
        {
            "embedding_model": "BGE-M3",
            "embedding_dim": len(vec),
            "embedding_preview": [round(float(x), 6) for x in vec[:8]],
            "distance_metric": "cosine (pgvector <=>)",
            "sql": sql,
        }
        if verbose
        else None
    )
    return {
        "tool": "vector",
        "tool_result": {"kind": "list", "label": "의미 유사 공고", "items": items, "debug": debug},
        "citation": {"type": "vector", "ref": "채용공고 의미벡터", "label": "BGE-M3 코사인 top-k"},
        "n": len(rows),
        "facts": f"질문과 의미가 가까운 공고(코사인 유사도순) — {facts}",
    }
```

- [ ] **Step 4: 통과 확인**

```bash
python -m pytest tests/test_vector_tool_verbose.py -v -m integration
```

Expected: `DATABASE_URL`이 있는 환경에서 2개 테스트 PASS. 없으면 SKIP(정상).

- [ ] **Step 5: 커밋**

```bash
git add app/services/rag/tools/vector_tool.py tests/test_vector_tool_verbose.py
git commit -m "$(cat <<'EOF'
feat(rag): expose real query embedding preview and SQL in verbose mode

The 1024-dim BGE-M3 vector and executed SQL were already computed but
discarded. verbose=True now surfaces the first 8 dims (enough to prove
it's a real vector without bloating payload) plus the exact SQL text.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### Task 6: `sql_tool.py` 6개 함수에 실측 SQL/파라미터 노출

**Files:**
- Modify: `backend/app/services/rag/tools/sql_tool.py`
- Test: `backend/tests/test_sql_tool_verbose.py`

**Interfaces:**
- Produces: `top_skills`/`top_concepts`/`top_certs`/`top_locations`/`skill_demand`/
  `multi_skill_compare` 전부 `verbose: bool = False` 키워드 인자를 받고, `verbose=True`일 때
  반환 dict의 `tool_result["debug"]`에 `{"sql": ..., "params": ...}`(또는 loop 케이스는
  `{"sql": ...}`)를 채운다.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_sql_tool_verbose.py` 생성:

```python
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base
from app.models import Posting, PostingTech, Skill
from app.services.rag.tools import sql_tool


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    with testing_session() as s:
        react = Skill(canonical="React", category="frontend", is_ambiguous=False)
        vue = Skill(canonical="Vue", category="frontend", is_ambiguous=False)
        s.add_all([react, vue])
        s.flush()
        p1 = Posting(source="t", source_uid="1", pool="domestic", title="프론트 개발자")
        p2 = Posting(source="t", source_uid="2", pool="domestic", title="프론트 개발자2")
        s.add_all([p1, p2])
        s.flush()
        s.add_all(
            [
                PostingTech(posting_id=p1.id, skill_id=react.id),
                PostingTech(posting_id=p2.id, skill_id=react.id),
                PostingTech(posting_id=p2.id, skill_id=vue.id),
            ]
        )
        s.commit()
        yield s
    engine.dispose()


def test_top_skills_verbose_false_has_no_debug(session: Session) -> None:
    result = sql_tool.top_skills(session, pool="domestic", verbose=False)
    assert result["tool_result"].get("debug") is None


def test_top_skills_verbose_true_exposes_real_sql(session: Session) -> None:
    result = sql_tool.top_skills(session, pool="domestic", verbose=True)
    debug = result["tool_result"]["debug"]
    assert "posting_tech" in debug["sql"]
    assert "GROUP BY s.canonical" in debug["sql"]
    assert debug["params"]["pool"] == "domestic"


def test_skill_demand_verbose_true_exposes_real_sql(session: Session) -> None:
    result = sql_tool.skill_demand(session, "React", pool="domestic", verbose=True)
    assert result is not None
    debug = result["tool_result"]["debug"]
    assert "posting_tech" in debug["sql"]
    assert debug["params"]["sid"] is not None


def test_multi_skill_compare_verbose_true_exposes_real_sql(session: Session) -> None:
    result = sql_tool.multi_skill_compare(session, ["React", "Vue"], pool="domestic", verbose=True)
    assert result is not None
    debug = result["tool_result"]["debug"]
    assert "posting_tech" in debug["sql"]
```

- [ ] **Step 2: 실패 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
python -m pytest tests/test_sql_tool_verbose.py -v
```

Expected: `verbose` 키워드 인자가 없어 `TypeError`로 4개 모두 FAIL.

- [ ] **Step 3: `top_skills` 수정**

`backend/app/services/rag/tools/sql_tool.py`의 `top_skills` 함수 전체 교체:

```python
def top_skills(
    session: Session,
    pool: str | None = None,
    limit: int = 8,
    category: str | None = None,
    entry_level: bool = False,
    verbose: bool = False,
) -> dict:
    total = total_postings(session, pool, category=category, entry_level=entry_level)
    join = _category_join(category)
    where_extra = _entry_level_where(entry_level)
    count_expr = "COUNT(DISTINCT pt.posting_id)" if category else "COUNT(*)"
    sql = (
        f"SELECT s.canonical, {count_expr} n FROM posting_tech pt "
        f"JOIN skill s ON s.id = pt.skill_id "
        f"JOIN posting p ON p.id = pt.posting_id "
        f"{join}"
        f"WHERE {_POOL_WHERE} AND pt.is_deleted = false{where_extra} "
        f"GROUP BY s.canonical ORDER BY n DESC LIMIT :limit"
    )
    extra_params = _filter_params(category)
    rows = _top(session, sql, pool, limit, extra_params=extra_params)
    items = [
        {"name": n, "metric": f"{c:,}건", "pct": round(100 * c / total, 1) if total else 0.0}
        for n, c in rows
    ]
    facts_body = "; ".join(
        f"{n} {c}건({round(100 * c / total, 1) if total else 0}%)" for n, c in rows
    )
    if category or entry_level:
        label = f"수요 상위 기술{_filter_label_suffix(category, entry_level)}"
        citation_label = (
            f"기술태그 집계 · 공고 {total:,}건{_filter_citation_suffix(category, entry_level)}"
        )
        facts = (
            f"pool={pool or '전체'} 직군={category or '전체'} "
            f"신입={'예' if entry_level else '무관'} 총 {total:,}건 기준 상위 기술 — {facts_body}"
        )
    else:
        label = "수요 상위 기술"
        citation_label = f"기술태그 집계 · 공고 {total:,}건"
        facts = f"pool={pool or '전체'} 총 {total:,}건 기준 상위 기술 — {facts_body}"
    debug = (
        {"sql": sql, "params": {"pool": norm_pool(pool), "limit": limit, **extra_params}}
        if verbose
        else None
    )
    return {
        "tool": "sql",
        "tool_result": {"kind": "list", "label": label, "items": items, "debug": debug},
        "citation": {
            "type": "sql",
            "ref": "채용공고·기술 태그",
            "label": citation_label,
        },
        "n": total,
        "facts": facts,
    }
```

- [ ] **Step 4: `top_concepts` 수정**

`top_concepts` 함수 전체 교체:

```python
def top_concepts(session: Session, pool: str | None = None, limit: int = 8, verbose: bool = False) -> dict:
    total = total_postings(session, pool)
    sql = (
        f"SELECT c.name, COUNT(*) n FROM posting_concept pc "
        f"JOIN concept c ON c.id = pc.concept_id "
        f"JOIN posting p ON p.id = pc.posting_id "
        f"WHERE {_POOL_WHERE} AND pc.is_deleted = false "
        f"GROUP BY c.name ORDER BY n DESC LIMIT :limit"
    )
    rows = _top(session, sql, pool, limit)
    items = [
        {"name": n, "metric": f"{c:,}건", "pct": round(100 * c / total, 1) if total else 0.0}
        for n, c in rows
    ]
    facts = "; ".join(f"{n} {c}건" for n, c in rows)
    debug = {"sql": sql, "params": {"pool": norm_pool(pool), "limit": limit}} if verbose else None
    return {
        "tool": "sql",
        "tool_result": {"kind": "list", "label": "빈출 개념·패러다임", "items": items, "debug": debug},
        "citation": {
            "type": "sql",
            "ref": "채용공고·개념",
            "label": f"개념 집계 · 공고 {total:,}건",
        },
        "n": total,
        "facts": f"pool={pool or '전체'} 상위 개념 — {facts}",
    }
```

- [ ] **Step 5: `top_certs` 수정**

`top_certs` 함수 전체 교체:

```python
def top_certs(
    session: Session,
    pool: str | None = None,
    limit: int = 8,
    category: str | None = None,
    entry_level: bool = False,
    verbose: bool = False,
) -> dict:
    total = total_postings(session, pool, category=category, entry_level=entry_level)
    join = _category_join(category)
    where_extra = _entry_level_where(entry_level)
    count_expr = "COUNT(DISTINCT pc.posting_id)" if category else "COUNT(*)"
    sql = (
        f"SELECT ct.name, {count_expr} n FROM posting_cert pc "
        f"JOIN cert ct ON ct.id = pc.cert_id "
        f"JOIN posting p ON p.id = pc.posting_id "
        f"{join}"
        f"WHERE {_POOL_WHERE} AND pc.is_deleted = false{where_extra} "
        f"GROUP BY ct.name ORDER BY n DESC LIMIT :limit"
    )
    extra_params = _filter_params(category)
    rows = _top(session, sql, pool, limit, extra_params=extra_params)
    items = [
        {"name": n, "metric": f"{c:,}건", "pct": round(100 * c / total, 1) if total else 0.0}
        for n, c in rows
    ]
    facts_body = "; ".join(f"{n} {c}건" for n, c in rows)
    if category or entry_level:
        label = f"요구 상위 자격증{_filter_label_suffix(category, entry_level)}"
        citation_label = (
            f"자격증 요구 집계 · 공고 {total:,}건{_filter_citation_suffix(category, entry_level)}"
        )
        facts = (
            f"pool={pool or '전체'} 직군={category or '전체'} "
            f"신입={'예' if entry_level else '무관'} 총 {total:,}건 기준 상위 자격증 — {facts_body}"
        )
    else:
        label = "요구 상위 자격증"
        citation_label = f"자격증 요구 집계 · 공고 {total:,}건"
        facts = f"pool={pool or '전체'} 총 {total:,}건 기준 상위 자격증 — {facts_body}"
    debug = (
        {"sql": sql, "params": {"pool": norm_pool(pool), "limit": limit, **extra_params}}
        if verbose
        else None
    )
    return {
        "tool": "sql",
        "tool_result": {"kind": "list", "label": label, "items": items, "debug": debug},
        "citation": {
            "type": "sql",
            "ref": "채용공고·자격증",
            "label": citation_label,
        },
        "n": total,
        "facts": facts,
    }
```

- [ ] **Step 6: `top_locations` 수정**

`top_locations` 함수 전체 교체:

```python
def top_locations(session: Session, pool: str | None = None, limit: int = 8, verbose: bool = False) -> dict:
    total = total_postings(session, pool)
    sql = (
        f"SELECT p.region_district, COUNT(*) n FROM posting p "
        f"WHERE {_POOL_WHERE} AND p.region_district IS NOT NULL "
        f"GROUP BY p.region_district ORDER BY n DESC LIMIT :limit"
    )
    rows = _top(session, sql, pool, limit)
    items = [
        {"name": n, "metric": f"{c:,}건", "pct": round(100 * c / total, 1) if total else 0.0}
        for n, c in rows
    ]
    facts = "; ".join(f"{n} {c}건({round(100 * c / total, 1) if total else 0}%)" for n, c in rows)
    debug = {"sql": sql, "params": {"pool": norm_pool(pool), "limit": limit}} if verbose else None
    return {
        "tool": "sql",
        "tool_result": {"kind": "list", "label": "지역별 공고 분포", "items": items, "debug": debug},
        "citation": {
            "type": "sql",
            "ref": "채용공고·지역",
            "label": f"지역별 집계 · 공고 {total:,}건",
        },
        "n": total,
        "facts": (
            f"pool={pool or '전체'} 기준(지역 정보는 국내 공고에만 있음) "
            f"지역별 공고 분포 — {facts}"
        ),
    }
```

- [ ] **Step 7: `skill_demand` 수정**

`skill_demand` 함수 전체 교체:

```python
def skill_demand(
    session: Session,
    skill_name: str,
    pool: str | None = None,
    category: str | None = None,
    entry_level: bool = False,
    verbose: bool = False,
) -> dict | None:
    resolved = resolve_skill(session, skill_name)
    if not resolved:
        return None
    skill_id, canonical = resolved
    total = total_postings(session, pool, category=category, entry_level=entry_level)
    join = _category_join(category)
    where_extra = _entry_level_where(entry_level)
    params: dict[str, object] = {"sid": skill_id, "pool": norm_pool(pool)}
    params.update(_filter_params(category))
    sql = (
        f"SELECT COUNT(DISTINCT pt.posting_id) FROM posting_tech pt "
        f"JOIN posting p ON p.id = pt.posting_id "
        f"{join}"
        f"WHERE pt.skill_id = :sid AND pt.is_deleted = false AND {_POOL_WHERE}{where_extra}"
    )
    n = int(session.execute(text(sql), params).scalar() or 0)
    pct = round(100 * n / total, 1) if total else 0.0
    if category or entry_level:
        label = f"{canonical} 수요{_filter_label_suffix(category, entry_level)}"
        citation_label = (
            f"{canonical} 요구 공고 {n:,}건{_filter_citation_suffix(category, entry_level)}"
        )
        facts = (
            f"{canonical}을(를) 요구하는 공고는 {n:,}건(pool={pool or '전체'} "
            f"직군={category or '전체'} 신입={'예' if entry_level else '무관'} "
            f"{total:,}건 중 {pct}%)"
        )
    else:
        label = f"{canonical} 수요"
        citation_label = f"{canonical} 요구 공고 {n:,}건"
        facts = f"{canonical}을(를) 요구하는 공고는 {n:,}건(pool={pool or '전체'} {total:,}건 중 {pct}%)"
    debug = {"sql": sql, "params": params} if verbose else None
    return {
        "tool": "sql",
        "tool_result": {
            "kind": "stat",
            "label": label,
            "value": n,
            "unit": "건",
            "items": [{"name": canonical, "metric": f"{n:,}건", "pct": pct}],
            "debug": debug,
        },
        "citation": {
            "type": "sql",
            "ref": f"{canonical} 공고 매칭",
            "label": citation_label,
        },
        "n": n,
        "facts": facts,
    }
```

- [ ] **Step 8: `multi_skill_compare` 수정**

`multi_skill_compare` 함수 전체 교체:

```python
def multi_skill_compare(
    session: Session,
    skill_names: list[str],
    pool: str | None = None,
    category: str | None = None,
    entry_level: bool = False,
    verbose: bool = False,
) -> dict | None:
    """여러 기술의 수요를 한 번에 비교한다 (compare 결과 kind=list 반환).

    각 기술을 skill_demand로 개별 조회한 뒤 하나의 compare 결과로 합산한다.
    하나도 해소 못 하면 None 반환.
    """
    total = total_postings(session, pool, category=category, entry_level=entry_level)
    items = []
    resolved_names = []
    last_sql: str | None = None

    for name in skill_names:
        resolved = resolve_skill(session, name)
        if not resolved:
            continue
        skill_id, canonical = resolved
        join = _category_join(category)
        where_extra = _entry_level_where(entry_level)
        params: dict[str, object] = {"sid": skill_id, "pool": norm_pool(pool)}
        params.update(_filter_params(category))
        sql = (
            f"SELECT COUNT(DISTINCT pt.posting_id) FROM posting_tech pt "
            f"JOIN posting p ON p.id = pt.posting_id "
            f"{join}"
            f"WHERE pt.skill_id = :sid AND pt.is_deleted = false AND {_POOL_WHERE}{where_extra}"
        )
        last_sql = sql
        n = int(session.execute(text(sql), params).scalar() or 0)
        pct = round(100 * n / total, 1) if total else 0.0
        items.append({"name": canonical, "metric": f"{n:,}건", "pct": pct})
        resolved_names.append(canonical)

    if not items:
        return None

    skills_joined = "·".join(resolved_names)
    filter_suffix = _filter_label_suffix(category, entry_level)
    facts_body = "; ".join(f"{it['name']} {it['metric']}({it['pct']}%)" for it in items)
    facts = (
        f"국내 채용 공고 {total:,}건 기준 {skills_joined} 비교 결과{filter_suffix} — {facts_body}"
    )
    debug = (
        {
            "sql": last_sql,
            "note": "동일 SQL을 기술마다 :sid만 바꿔 재실행(위는 마지막 실행분)",
        }
        if verbose
        else None
    )
    return {
        "tool": "sql",
        "tool_result": {
            "kind": "compare",
            "label": f"{skills_joined} 수요 비교{filter_suffix}",
            "items": items,
            "debug": debug,
        },
        "citation": {
            "type": "sql",
            "ref": f"{skills_joined} 비교",
            "label": f"{skills_joined} 요구 공고 비교 · 공고 {total:,}건",
        },
        "n": total,
        "facts": facts,
    }
```

- [ ] **Step 9: 통과 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
python -m pytest tests/test_sql_tool_verbose.py -v
```

Expected: 4개 테스트 모두 PASS.

- [ ] **Step 10: 회귀 확인 — 기존 sql_tool 관련 테스트가 깨지지 않았는지**

```bash
python -m pytest tests/ -k "sql_tool or skill or posting" -v
```

Expected: 기존 테스트 전부 PASS(시그니처에 키워드 인자만 추가했으므로 기존 위치 인자 호출은
영향 없음).

- [ ] **Step 11: 커밋**

```bash
git add app/services/rag/tools/sql_tool.py tests/test_sql_tool_verbose.py
git commit -m "$(cat <<'EOF'
feat(rag): expose real executed SQL and params in verbose mode

All six sql_tool aggregation functions now accept verbose=False and,
when True, attach the exact SQL text and bound params they already
build locally. No behavior change when verbose is omitted.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### Task 7: `graph_tool.co_occurring_skills`에 강도 산식 실측값 노출

**Files:**
- Modify: `backend/app/services/rag/tools/graph_tool.py`
- Test: `backend/tests/test_graph_tool_verbose.py`

**Interfaces:**
- Produces: `co_occurring_skills(session, skill_name, pool=None, limit=8, verbose=False)`.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_graph_tool_verbose.py` 생성:

```python
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base
from app.models import Posting, PostingTech, Skill
from app.services.rag.tools import graph_tool


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    with testing_session() as s:
        react = Skill(canonical="React", category="frontend", is_ambiguous=False)
        redux = Skill(canonical="Redux", category="frontend", is_ambiguous=False)
        ts = Skill(canonical="TypeScript", category="language", is_ambiguous=False)
        s.add_all([react, redux, ts])
        s.flush()
        p1 = Posting(source="t", source_uid="1", pool="domestic", title="프론트 개발자")
        p2 = Posting(source="t", source_uid="2", pool="domestic", title="프론트 개발자2")
        s.add_all([p1, p2])
        s.flush()
        s.add_all(
            [
                PostingTech(posting_id=p1.id, skill_id=react.id),
                PostingTech(posting_id=p1.id, skill_id=redux.id),
                PostingTech(posting_id=p1.id, skill_id=ts.id),
                PostingTech(posting_id=p2.id, skill_id=react.id),
                PostingTech(posting_id=p2.id, skill_id=ts.id),
            ]
        )
        s.commit()
        yield s
    engine.dispose()


def test_co_occurring_skills_verbose_false_has_no_debug(session: Session) -> None:
    result = graph_tool.co_occurring_skills(session, "React", pool="domestic", verbose=False)
    assert result is not None
    assert result["tool_result"].get("debug") is None


def test_co_occurring_skills_verbose_true_exposes_formula_and_sql(session: Session) -> None:
    result = graph_tool.co_occurring_skills(session, "React", pool="domestic", verbose=True)
    assert result is not None
    debug = result["tool_result"]["debug"]
    assert debug["base_postings"] == 2
    assert "posting_tech" in debug["sql_1hop"]
    assert "strength" in debug["strength_formula"]
```

- [ ] **Step 2: 실패 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
python -m pytest tests/test_graph_tool_verbose.py -v
```

Expected: `verbose` 키워드 인자가 없어 2개 모두 FAIL.

- [ ] **Step 3: `co_occurring_skills` 수정**

`backend/app/services/rag/tools/graph_tool.py`의 함수 시그니처와 반환부만 수정(1-hop/2-hop
SQL 조립·순회 로직은 그대로 두고, 시그니처에 `verbose` 추가 + 반환 직전에 `debug` 조립):

시그니처 교체:

```python
def co_occurring_skills(
    session: Session, skill_name: str, pool: str | None = None, limit: int = 8, verbose: bool = False
) -> dict | None:
```

1-hop 쿼리를 만드는 기존 블록의 `session.execute(text(f"..."), {...}).all()` 호출을, SQL을
먼저 변수에 담고 실행하도록 바꾼다 — 기존:

```python
    # 1-hop: 루트 기술과 직접 공동출현하는 이웃 기술 목록 (skill_id도 함께 조회)
    rows = session.execute(
        text(
            f"SELECT s2.canonical, s2.id, COUNT(DISTINCT pt2.posting_id) n "
            f"FROM posting_tech pt1 "
            f"JOIN posting_tech pt2 ON pt1.posting_id = pt2.posting_id "
            f"  AND pt2.skill_id <> pt1.skill_id AND pt2.is_deleted = false "
            f"JOIN skill s2 ON s2.id = pt2.skill_id "
            f"JOIN posting p ON p.id = pt1.posting_id "
            f"WHERE pt1.skill_id = :sid AND pt1.is_deleted = false AND {_POOL_WHERE} "
            f"GROUP BY s2.canonical, s2.id ORDER BY n DESC LIMIT :limit"
        ),
        {"sid": skill_id, "pool": pool, "limit": limit},
    ).all()
```

교체:

```python
    # 1-hop: 루트 기술과 직접 공동출현하는 이웃 기술 목록 (skill_id도 함께 조회)
    sql_1hop = (
        f"SELECT s2.canonical, s2.id, COUNT(DISTINCT pt2.posting_id) n "
        f"FROM posting_tech pt1 "
        f"JOIN posting_tech pt2 ON pt1.posting_id = pt2.posting_id "
        f"  AND pt2.skill_id <> pt1.skill_id AND pt2.is_deleted = false "
        f"JOIN skill s2 ON s2.id = pt2.skill_id "
        f"JOIN posting p ON p.id = pt1.posting_id "
        f"WHERE pt1.skill_id = :sid AND pt1.is_deleted = false AND {_POOL_WHERE} "
        f"GROUP BY s2.canonical, s2.id ORDER BY n DESC LIMIT :limit"
    )
    rows = session.execute(text(sql_1hop), {"sid": skill_id, "pool": pool, "limit": limit}).all()
```

2-hop cross 쿼리도 같은 방식으로, 기존:

```python
        cross_rows = session.execute(
            text(
                f"SELECT s1.canonical sa, s2.canonical sb, COUNT(DISTINCT pt1.posting_id) n "
                f"FROM posting_tech pt1 "
                f"JOIN posting_tech pt2 ON pt1.posting_id = pt2.posting_id "
                f"  AND pt2.skill_id > pt1.skill_id AND pt2.is_deleted = false "
                f"JOIN skill s1 ON s1.id = pt1.skill_id "
                f"JOIN skill s2 ON s2.id = pt2.skill_id "
                f"JOIN posting p ON p.id = pt1.posting_id "
                f"WHERE pt1.skill_id IN ({id_list}) "
                f"  AND pt2.skill_id IN ({id_list}) "
                f"  AND pt1.is_deleted = false AND {_POOL_WHERE} "
                f"GROUP BY s1.canonical, s2.canonical "
                f"ORDER BY n DESC LIMIT 20"
            ),
            {"pool": pool},
        ).all()
```

교체:

```python
        sql_cross = (
            f"SELECT s1.canonical sa, s2.canonical sb, COUNT(DISTINCT pt1.posting_id) n "
            f"FROM posting_tech pt1 "
            f"JOIN posting_tech pt2 ON pt1.posting_id = pt2.posting_id "
            f"  AND pt2.skill_id > pt1.skill_id AND pt2.is_deleted = false "
            f"JOIN skill s1 ON s1.id = pt1.skill_id "
            f"JOIN skill s2 ON s2.id = pt2.skill_id "
            f"JOIN posting p ON p.id = pt1.posting_id "
            f"WHERE pt1.skill_id IN ({id_list}) "
            f"  AND pt2.skill_id IN ({id_list}) "
            f"  AND pt1.is_deleted = false AND {_POOL_WHERE} "
            f"GROUP BY s1.canonical, s2.canonical "
            f"ORDER BY n DESC LIMIT 20"
        )
        cross_rows = session.execute(text(sql_cross), {"pool": pool}).all()
```

`if len(neighbor_ids) >= 2:` 블록 밖(2-hop을 안 도는 경우 `sql_cross`가 정의 안 되므로) 함수
맨 위, `neighbor_ids: list[int] = []` 선언 바로 다음 줄에 `sql_cross: str | None = None`을
추가해 미정의 참조를 막는다.

마지막 `return` 직전(`facts = "; ".join(...)` 다음 줄)에 추가:

```python
    debug = (
        {
            "strength_formula": "strength = (동반 공고 n건 / 대상 기술 기준 공고 base건) x 100",
            "base_postings": base,
            "sql_1hop": sql_1hop,
            "sql_2hop_cross": sql_cross,
        }
        if verbose
        else None
    )
```

그리고 `return` 문의 `"tool_result": {...}` 안에 `"debug": debug`를 추가:

```python
    return {
        "tool": "graph",
        "tool_result": {
            "kind": "graph",
            "label": f"{canonical} 동반 기술(공동출현)",
            "items": items,
            "nodes": nodes,
            "edges": edges,
            "debug": debug,
        },
        "citation": {
            "type": "graph",
            "ref": f"{canonical} 동반출현",
            "label": f"{canonical} 요구 공고 {base:,}건의 동반 기술",
        },
        "n": base,
        "facts": f"{canonical}을(를) 요구하는 공고 {base:,}건 기준 동반 기술 비율 — {facts}",
    }
```

- [ ] **Step 4: 통과 확인**

```bash
python -m pytest tests/test_graph_tool_verbose.py -v
```

Expected: 2개 테스트 모두 PASS.

- [ ] **Step 5: 커밋**

```bash
git add app/services/rag/tools/graph_tool.py tests/test_graph_tool_verbose.py
git commit -m "$(cat <<'EOF'
feat(rag): expose real co-occurrence SQL and strength formula in verbose

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### Task 8: `pipeline.py`/`chat.py`로 `verbose` 관통시키기

**Files:**
- Modify: `backend/app/services/rag/pipeline.py`
- Modify: `backend/app/routers/chat.py`
- Test: `backend/tests/test_chat_verbose_e2e.py`

**Interfaces:**
- Consumes: Task 4~7의 모든 `verbose` 키워드 인자.
- Produces: `run_chat_events(session, question, pool=None, *, verbose=False, collect=None)`,
  `run_chat(session, question, pool=None, verbose=False)`. `/chat`, `/chat/stream` 라우트가
  `body.verbose`를 그대로 전달.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_chat_verbose_e2e.py` 생성:

```python
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_session
from app.main import app
from app.models import Posting, PostingTech, Skill


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    with testing_session() as seed:
        react = Skill(canonical="React", category="frontend", is_ambiguous=False)
        seed.add(react)
        seed.flush()
        p1 = Posting(source="t", source_uid="1", pool="domestic", title="프론트 개발자")
        seed.add(p1)
        seed.flush()
        seed.add(PostingTech(posting_id=p1.id, skill_id=react.id))
        seed.commit()

    def override_get_session() -> Iterator[Session]:
        with testing_session() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_chat_default_has_no_debug_on_results(client: TestClient) -> None:
    response = client.post("/api/v1/chat", json={"question": "React 수요 어때?"})
    assert response.status_code == 200
    body = response.json()
    assert all(r.get("debug") is None for r in body["tool_results"])


def test_chat_verbose_true_attaches_debug(client: TestClient) -> None:
    response = client.post("/api/v1/chat", json={"question": "React 수요 어때?", "verbose": True})
    assert response.status_code == 200
    body = response.json()
    assert any(r.get("debug") is not None for r in body["tool_results"])
```

(엔드포인트 prefix `/api/v1`은 기존 라우터 등록 방식을 따른다 — 다른 테스트 파일에서 이미
쓰는 경로와 동일한지 `grep -n "api/v1" tests/*.py`로 먼저 확인하고, 다르면 그 값에 맞춘다.)

- [ ] **Step 2: prefix 확인 후 필요시 테스트 경로 수정**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
grep -rn "\"/chat\"\|'/chat'" tests/ app/main.py app/routers/ 2>/dev/null
```

이 결과에 맞춰 Step 1 테스트의 URL을 실제 마운트 경로로 맞춘다.

- [ ] **Step 3: 실패 확인**

```bash
python -m pytest tests/test_chat_verbose_e2e.py -v
```

Expected: `verbose` 필드를 보내도 아직 파이프라인이 안 받으므로 두 번째 테스트가 FAIL(debug가
항상 None).

- [ ] **Step 4: `pipeline.py` 수정**

`backend/app/services/rag/pipeline.py`의 `_dispatch` 시그니처와 각 분기에 `verbose` 전달:

```python
def _dispatch(session: Session, p: Plan, verbose: bool = False) -> tuple[list[dict], bool]:
```

함수 본문 중 도구 호출 5곳을 다음과 같이 바꾼다(그 외 로직은 그대로):

```python
    if p.intent == "cooccurrence" and skill:
        r = graph_tool.co_occurring_skills(session, skill, pool, verbose=verbose)
        if r:
            out.append(r)
    elif p.intent == "semantic_search":
        r = vector_tool.semantic_search(session, p.subqueries[0] if p.subqueries else "", pool, verbose=verbose)
        if r:
            out.append(r)
    elif p.intent == "skill_demand" and skill:
        r = sql_tool.skill_demand(
            session, skill, pool, category=category, entry_level=entry_level, verbose=verbose
        )
        if r:
            out.append(r)
    elif p.intent == "compare":
        skills_list = p.entities.get("skills") or []
        if skills_list:
            r = sql_tool.multi_skill_compare(
                session, list(skills_list), pool, category=category, entry_level=entry_level, verbose=verbose
            )
            if r:
                out.append(r)
    elif p.intent == "concept_ranking":
        out.append(sql_tool.top_concepts(session, pool, verbose=verbose))
    elif p.intent == "cert_ranking":
        out.append(
            sql_tool.top_certs(session, pool, category=category, entry_level=entry_level, verbose=verbose)
        )
    elif p.intent == "region_distribution":
        out.append(sql_tool.top_locations(session, pool, verbose=verbose))

    used_fallback_branch = not out
    if used_fallback_branch:  # 위에서 못 채웠으면(대상 미해소 등) 기술 랭킹으로 폴백
        out.append(
            sql_tool.top_skills(
                session, pool, category=category, entry_level=entry_level, verbose=verbose
            )
        )
    fell_back = used_fallback_branch and not category and not entry_level

    if p.intent in ("skill_ranking", "skill_demand") and out:
        primary_items = out[0]["tool_result"].get("items") or []
        if primary_items:
            insight_skill = primary_items[0]["name"]
            insight = graph_tool.co_occurring_skills(session, insight_skill, pool, verbose=verbose)
            if insight:
                out.append(insight)

    return out, fell_back
```

`run_chat_events` 시그니처를 교체:

```python
def run_chat_events(
    session: Session,
    question: str,
    pool: str | None = None,
    *,
    verbose: bool = False,
    collect: dict[str, Any] | None = None,
) -> Iterator[dict[str, Any]]:
```

함수 본문에서 `tool_outputs, fell_back = _dispatch(session, p)` 줄을 찾아:

```python
        tool_outputs, fell_back = _dispatch(session, p, verbose=verbose)
```

로 교체.

`run_chat` 함수도 교체:

```python
def run_chat(session: Session, question: str, pool: str | None = None, verbose: bool = False) -> ChatResponse:
    collect: dict[str, Any] = {}
    for _event in run_chat_events(session, question, pool, verbose=verbose, collect=collect):
        pass  # 이벤트는 스트리밍 전용 — 비스트리밍 조립은 collect로 한다
```

(이후 `if "exception" in collect:` 부터 끝까지는 그대로.)

- [ ] **Step 5: `chat.py` 수정**

`backend/app/routers/chat.py` 전체 교체:

```python
"""POST /chat — 하이브리드 Agentic + Graph RAG 엔드포인트(v2 구조화 JSON).

설계: docs/superpowers/specs/2026-07-10-rag-hybrid-agentic-graph-design.md 5절.
"""

import json
from collections.abc import Iterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.deps import SessionDep
from app.services.rag.pipeline import run_chat, run_chat_events
from app.services.rag.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, session: SessionDep) -> ChatResponse:
    return run_chat(session, body.question, body.pool, body.verbose)


@router.post("/chat/stream")
def chat_stream(body: ChatRequest, session: SessionDep) -> StreamingResponse:
    def gen() -> Iterator[str]:
        for event in run_chat_events(session, body.question, body.pool, verbose=body.verbose):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
```

- [ ] **Step 6: 통과 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
python -m pytest tests/test_chat_verbose_e2e.py -v
```

Expected: 2개 테스트 모두 PASS.

- [ ] **Step 7: 전체 rag 관련 테스트 회귀 확인**

```bash
python -m pytest tests/ -k "chat or rag or sql_tool or vector_tool or graph_tool" -v
```

Expected: 이번 Phase에서 건드린 것 포함 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add app/services/rag/pipeline.py app/routers/chat.py tests/test_chat_verbose_e2e.py
git commit -m "$(cat <<'EOF'
feat(rag): thread verbose flag from /chat and /chat/stream to tools

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3b — 프론트 3단계 모드 + 실측값 렌더링 (frontend)

### Task 9: `chatContract.ts`/`chatStream.ts`에 `verbose`/`debug` 배선

**Files:**
- Modify: `frontend/src/rag/chatContract.ts`
- Modify: `frontend/src/rag/chatStream.ts`

**Interfaces:**
- Produces: `ToolResult.debug?: Record<string, unknown> | null`,
  `StreamToolResult.debug?: Record<string, unknown> | null`,
  `ChatRequestBody.verbose?: boolean`,
  `streamChat(question, pool, verbose, handlers): Promise<void>` — 세 번째 인자 추가(기존
  `handlers`는 네 번째로 밀림 — 호출부는 Task 11에서 갱신).

- [ ] **Step 1: `chatContract.ts` 수정**

`frontend/src/rag/chatContract.ts`의 `ToolResult` 인터페이스:

```typescript
export interface ToolResult {
  kind: ToolResultKind
  label: string
  items: ToolResultItem[]
  value?: number | string
  unit?: string
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
  debug?: Record<string, unknown> | null
}
```

`ChatRequestBody` 인터페이스:

```typescript
export interface ChatRequestBody {
  question: string
  pool?: Pool
  verbose?: boolean
}
```

`StreamToolResult` 인터페이스:

```typescript
export interface StreamToolResult {
  kind: ToolResultKind
  label: string
  items?: ToolResultItem[]
  value?: number | string
  unit?: string
  nodes?: Record<string, unknown>[]
  edges?: Record<string, unknown>[]
  debug?: Record<string, unknown> | null
}
```

`normalizeStreamResult` 함수:

```typescript
export function normalizeStreamResult(r: StreamToolResult): ToolResult {
  return {
    kind: r.kind,
    label: r.label,
    items: r.items ?? [],
    value: r.value,
    unit: r.unit,
    nodes: r.nodes ?? [],
    edges: r.edges ?? [],
    debug: r.debug ?? undefined,
  }
}
```

- [ ] **Step 2: `chatStream.ts` 수정**

`frontend/src/rag/chatStream.ts`의 `streamChat` 함수 시그니처와 body 조립부:

```typescript
export async function streamChat(
  question: string,
  pool: Pool | undefined,
  verbose: boolean,
  handlers: StreamHandlers,
): Promise<void> {
  const body = { question, ...(pool ? { pool } : {}), ...(verbose ? { verbose: true } : {}) }
```

(이후 함수 본문은 그대로 — `fetch` 호출의 `body: JSON.stringify(body)`는 변경 없음.)

- [ ] **Step 3: 빌드 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run build
```

Expected: `RagConsole.tsx`의 기존 `streamChat(question, undefined, { onPlan: ... })` 호출이
인자 개수가 안 맞아 **에러가 나는 게 정상**(다음 Task에서 고침). 이 시점의 빌드 실패 메시지가
`streamChat`을 부르는 위치(`RagConsole.tsx`)를 정확히 가리키는지만 확인하고 다음 Task로
진행한다.

- [ ] **Step 4: 커밋(빌드 실패 상태로 커밋하지 않는다 — Task 11과 함께 커밋)**

이 Task는 커밋하지 않고 다음 Task로 이어간다(중간에 빌드가 깨진 상태로 커밋하면 이력이 깨끗하지
않으므로, 이 Task의 변경은 Task 11 커밋에 합쳐 넣는다). Working tree는 그대로 둔다.

### Task 10: `EngineTechnicalDetails.tsx`를 실측값 렌더링으로 재작성

**Files:**
- Create: `frontend/src/rag/engineDebugFormat.ts`
- Test: `frontend/tests/engineDebugFormat.test.ts`
- Modify: `frontend/src/rag/EngineTechnicalDetails.tsx` (전체 재작성)
- Modify: `frontend/src/rag/rag-console.css` (엔진 상세 CSS 추가)

**Interfaces:**
- Consumes: Task 9의 `ToolResult.debug`, `chatContract.ts`의 `Plan`/`Route`.
- Produces: `EngineTechnicalDetails(props: { route?: Route; plan?: Plan; results: ToolResult[] })`
  — 기존 `{ turn: LocalTurn }` 단일 prop에서 바뀜(Task 11 호출부에서 새 시그니처로 호출).
  `formatDebugValue(value: unknown): string`, `DEBUG_KEY_LABELS: Record<string, string>` export.

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/tests/engineDebugFormat.test.ts` 생성:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { DEBUG_KEY_LABELS, formatDebugValue } from '../src/rag/engineDebugFormat.ts'

test('formatDebugValue는 배열을 대괄호로 감싸 콤마로 이어붙인다', () => {
  assert.equal(formatDebugValue([0.024827, -0.015291, 0.089421]), '[0.024827, -0.015291, 0.089421]')
})

test('formatDebugValue는 객체를 JSON 문자열로 만든다', () => {
  assert.equal(formatDebugValue({ pool: 'domestic', limit: 8 }), '{"pool":"domestic","limit":8}')
})

test('formatDebugValue는 null과 undefined를 em dash로 표시한다', () => {
  assert.equal(formatDebugValue(null), '—')
  assert.equal(formatDebugValue(undefined), '—')
})

test('formatDebugValue는 문자열·숫자를 그대로 문자열화한다', () => {
  assert.equal(formatDebugValue('SELECT 1'), 'SELECT 1')
  assert.equal(formatDebugValue(1024), '1024')
})

test('DEBUG_KEY_LABELS는 백엔드 debug 키를 한국어 라벨로 매핑한다', () => {
  assert.equal(DEBUG_KEY_LABELS.embedding_preview, '쿼리 벡터 프리뷰 (앞 8차원)')
  assert.equal(DEBUG_KEY_LABELS.sql, '실행 SQL')
})
```

- [ ] **Step 2: 실패 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
node --test --experimental-strip-types tests/engineDebugFormat.test.ts
```

Expected: 모듈이 없어 `ERR_MODULE_NOT_FOUND`로 FAIL.

- [ ] **Step 3: `engineDebugFormat.ts` 작성**

`frontend/src/rag/engineDebugFormat.ts` 생성:

```typescript
// EngineTechnicalDetails가 백엔드 ToolResult.debug(임의의 key-value)를 렌더링할 때 쓰는
// 순수 포맷 헬퍼. React 컴포넌트(.tsx)와 분리해 node:test로 직접 단위 테스트한다.

export const DEBUG_KEY_LABELS: Record<string, string> = {
  embedding_model: '임베딩 모델',
  embedding_dim: '임베딩 차원',
  embedding_preview: '쿼리 벡터 프리뷰 (앞 8차원)',
  distance_metric: '유사도 메트릭',
  sql: '실행 SQL',
  sql_1hop: '실행 SQL (1-Hop)',
  sql_2hop_cross: '실행 SQL (2-Hop 교차)',
  params: '바인딩 파라미터',
  strength_formula: '강도 산식',
  base_postings: '기준 공고 수',
  note: '비고',
}

export function formatDebugValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
```

- [ ] **Step 4: 통과 확인**

```bash
node --test --experimental-strip-types tests/engineDebugFormat.test.ts
```

Expected: 5개 테스트 모두 PASS.

- [ ] **Step 5: `EngineTechnicalDetails.tsx` 전체 재작성**

`frontend/src/rag/EngineTechnicalDetails.tsx` 전체를 다음으로 교체(기존 route별 하드코딩 가짜
분기 전부 제거):

```tsx
import { Fragment } from 'react'
import { Terminal } from 'lucide-react'
import type { Plan, Route, ToolResult } from './chatContract'
import { DEBUG_KEY_LABELS, formatDebugValue } from './engineDebugFormat'

interface EngineTechnicalDetailsProps {
  route?: Route
  plan?: Plan
  results: ToolResult[]
}

// verbose 모드 전용 — 백엔드가 실제로 계산한 값(debug 필드)만 그대로 보여준다. debug가 없는
// 도구 결과는 섹션 자체를 만들지 않는다(가짜 값으로 채우지 않는다).
export default function EngineTechnicalDetails({ route, plan, results }: EngineTechnicalDetailsProps) {
  const withDebug = results.filter(
    (r): r is ToolResult & { debug: Record<string, unknown> } => !!r.debug,
  )
  if (!plan && withDebug.length === 0) return null

  return (
    <div className="rc__engine-tech">
      <div className="rc__engine-title">
        <Terminal size={14} />
        <span>RAG 파이프라인 실측값 (Verbose)</span>
      </div>

      {plan && (
        <div className="rc__engine-section">
          <div className="rc__engine-section-title">쿼리 라우팅 · 플래닝</div>
          <div className="rc__engine-grid">
            <span className="rc__engine-key">라우트</span>
            <span className="rc__engine-val highlight">{route ?? '알 수 없음'}</span>
            <span className="rc__engine-key">판정된 의도</span>
            <span className="rc__engine-val highlight">{plan.intent}</span>
            <span className="rc__engine-key">타겟 데이터 풀</span>
            <span className="rc__engine-val">{plan.pool ?? '전체'}</span>
            <span className="rc__engine-key">추출된 개체</span>
            <span className="rc__engine-val">{JSON.stringify(plan.entities)}</span>
            {plan.subqueries.length > 0 && (
              <>
                <span className="rc__engine-key">서브쿼리</span>
                <span className="rc__engine-val">
                  {plan.subqueries.map((sq, i) => (
                    <div key={i}>&quot;{sq}&quot;</div>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {withDebug.map((r, i) => (
        <div className="rc__engine-section" key={i}>
          <div className="rc__engine-section-title">{r.label} — 실측 계산값</div>
          <div className="rc__engine-grid">
            {Object.entries(r.debug).map(([key, value]) => (
              <Fragment key={key}>
                <span className="rc__engine-key">{DEBUG_KEY_LABELS[key] ?? key}</span>
                <span className="rc__engine-val highlight">{formatDebugValue(value)}</span>
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: 엔진 상세 CSS 추가**

`frontend/src/rag/rag-console.css` 파일 끝(Task 2에서 추가한 `.rc__viz-*` 섹션 다음)에 추가:

```css
/* === RAG 파이프라인 실측값 (EngineTechnicalDetails) — Verbose 전용 === */
.rc__engine-tech {
  border: 1px solid #e2e5ec;
  border-radius: 12px;
  background: #fafbfc;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rc__engine-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: #43454c;
}
.rc__engine-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rc__engine-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #7c7f88;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.rc__engine-grid {
  display: grid;
  grid-template-columns: minmax(96px, auto) 1fr;
  gap: 4px 10px;
  font-size: 12px;
}
.rc__engine-key {
  color: #7c7f88;
}
.rc__engine-val {
  color: #1c1d21;
  font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace;
  overflow-wrap: anywhere;
}
.rc__engine-val.highlight {
  color: #28539c;
  font-weight: 600;
}
```

- [ ] **Step 7: 빌드 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run build
```

Expected: `EngineTechnicalDetails`를 아직 아무도 새 시그니처로 호출하지 않으므로(옛
호출부도 없음 — 애초에 dangling 컴포넌트였음) 에러 없이 성공.

- [ ] **Step 8: 커밋**

```bash
git add src/rag/engineDebugFormat.ts tests/engineDebugFormat.test.ts src/rag/EngineTechnicalDetails.tsx src/rag/rag-console.css
git commit -m "$(cat <<'EOF'
feat(rag): rewrite EngineTechnicalDetails to render real debug data

Removed the hardcoded fake vector preview and route-based branches.
Now renders whatever the backend actually attaches to ToolResult.debug
(Task 6-8 of the backend plan) generically, with no fabricated values.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### Task 11: `RagConsole.tsx` — 기본 / 모든 과정 보기 / Verbose 3단계로 확장

**Files:**
- Modify: `frontend/src/rag/RagConsole.tsx`

**Interfaces:**
- Consumes: Task 9의 `streamChat(question, pool, verbose, handlers)`, Task 10의
  `EngineTechnicalDetails(props)`.
- Produces: `Mode = 'basic' | 'full' | 'verbose'` (컴포넌트 내부 타입, 외부 소비자 없음).

- [ ] **Step 1: `Mode` 타입 확장**

`frontend/src/rag/RagConsole.tsx`의:

```tsx
type Mode = 'basic' | 'verbose'
```

교체:

```tsx
type Mode = 'basic' | 'full' | 'verbose'
```

- [ ] **Step 2: import 추가**

상단 import 블록에 추가(Task 3에서 이미 `AssistantVisualizer`는 추가돼 있음):

```tsx
import EngineTechnicalDetails from './EngineTechnicalDetails'
```

- [ ] **Step 3: `runTurn`/`submit`/`retry`가 verbose 플래그를 넘기도록 수정**

`runTurn` 함수:

```tsx
  const runTurn = (id: number, question: string, verbose: boolean) => {
    streamChat(question, undefined, verbose, {
      onPlan: (e) => patchTurn(id, { route: e.route, plan: e.plan }),
      onStep: (e) => patchTurn(id, (t) => ({ steps: [...t.steps, { kind: e.kind, tool: e.tool, label: e.label, detail: e.detail }] })),
      onResult: (e) => patchTurn(id, (t) => ({ results: [...t.results, normalizeStreamResult(e.result)] })),
      onFinal: (e) =>
        patchTurn(id, {
          status: 'done',
          final: { answer: e.answer, citations: e.citations, confidence: e.confidence, degraded: e.degraded },
          error: undefined,
        }),
      onError: (message) => patchTurn(id, { status: 'error', error: message }),
    }).then(() => {
      patchTurn(id, (t) => (t.status === 'loading' ? { status: 'error', error: '스트림이 예기치 않게 끊겼어요.' } : {}))
    })
  }
```

`submit` 함수:

```tsx
  const submit = (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    const id = nextTurnId++
    setTurns((prev) => [...prev, { id, question: q, status: 'loading', steps: [], results: [] }])
    runTurn(id, q, mode === 'verbose')
  }
```

`retry` 함수:

```tsx
  const retry = (turn: Turn) => {
    patchTurn(turn.id, { status: 'loading', error: undefined, route: undefined, plan: undefined, steps: [], results: [], final: undefined })
    runTurn(turn.id, turn.question, mode === 'verbose')
  }
```

- [ ] **Step 4: 툴바 버튼 3개로 확장**

```tsx
        <div className="rc__seg" role="group" aria-label="답변 과정 표시 수준">
          <button type="button" aria-pressed={mode === 'basic'} onClick={() => setMode('basic')}>기본</button>
          <button type="button" aria-pressed={mode === 'full'} onClick={() => setMode('full')}>모든 과정 보기</button>
          <button type="button" aria-pressed={mode === 'verbose'} onClick={() => setMode('verbose')}>Verbose · 실측값</button>
        </div>
```

- [ ] **Step 5: `TurnBlock` 게이트를 3단에 맞게 조정**

Task 3에서 추가한 두 블록(`mode === 'verbose' && turn.results.length > 0 && (...)` 두 곳,
`AssistantVisualizer`와 "도구 결과" 카드 목록)을 `mode !== 'basic'`으로 바꾸고, 그 아래에
`EngineTechnicalDetails` 렌더를 추가한다. `TurnBlock` 함수 안의 관련 블록 전체를 다음으로
교체:

```tsx
      {mode !== 'basic' && turn.results.length > 0 && (
        <AssistantVisualizer results={turn.results} route={turn.route} />
      )}

      {mode !== 'basic' && turn.results.length > 0 && (
        <div className="rc__ev-group">
          <div className="rc__ev-k">도구 결과</div>
          <div className="rc__tool-results">
            {turn.results.map((r, i) => <ToolResultCard key={i} result={r} />)}
          </div>
        </div>
      )}

      {mode === 'verbose' && (turn.plan || turn.results.some((r) => r.debug)) && (
        <EngineTechnicalDetails route={turn.route} plan={turn.plan} results={turn.results} />
      )}
```

`mode === 'verbose' && turn.steps.length > 0` 조건의 "답변을 만든 방식" 단계 블록도
`mode !== 'basic'`으로 바꾼다(이건 "모든 과정 보기"에서도 이미 보이던 것이라 자연스럽게
확장):

```tsx
      {mode !== 'basic' && turn.steps.length > 0 && (
        <div className="rc__ev-group">
          <div className="rc__ev-k">답변을 만든 방식</div>
          <div className="rc__steps">
            {turn.steps.map((s, i) => <StepRow key={i} step={s} />)}
          </div>
        </div>
      )}
```

`FinalBlock`의 `mode === 'basic' && (...)` 힌트 블록은 그대로 둔다(기본 모드에서만 보이는 안내
문구, 변경 불필요 — 문구 "모든 과정 보기"는 이미 버튼 이름과 일치).

- [ ] **Step 6: 개발 서버로 3단계 토글 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run dev &
sleep 2
```

`/assistant`에서 세 버튼을 각각 눌러 질문 하나를 보내보고:
- 기본: 답변+인용+신뢰도만 보임
- 모든 과정 보기: 위에 더해 단계·차트·원본 결과 카드가 보임
- Verbose: 위에 더해 `RC 파이프라인 실측값` 블록이 보이고, 백엔드가 떠 있으면 실제 SQL/벡터
  프리뷰가 질문마다 다르게 나오는지 확인(고정값이면 실패로 간주 — 스펙 검증 기준)

- [ ] **Step 7: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 성공(Task 9에서 일부러 깨뒀던 `streamChat` 호출부 인자 불일치가 이번
Task의 Step 3에서 고쳐져 다시 통과함).

- [ ] **Step 8: 프론트 단위 테스트 전체 확인**

```bash
node --test --experimental-strip-types tests/*.test.ts
```

Expected: 기존 테스트 + `engineDebugFormat.test.ts` 전부 PASS.

- [ ] **Step 9: 커밋 (Task 9의 변경 포함)**

```bash
git add src/rag/chatContract.ts src/rag/chatStream.ts src/rag/RagConsole.tsx
git commit -m "$(cat <<'EOF'
feat(rag): split process view into basic/full/verbose, wire real debug data

Mode goes from a 2-way toggle to three tiers. Verbose sends
verbose:true to /chat/stream and renders whatever real SQL/embedding
data the backend attaches (EngineTechnicalDetails), on top of the
full-mode chart/step view.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## 최종 통합 확인

### Task 12: 프론트+백엔드 동시 기동 후 전체 시나리오 재확인

**Files:** 없음(검증 전용 Task).

- [ ] **Step 1: 백엔드 기동**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend
# 프로젝트 기존 실행 방식(uvicorn 등)을 README/기존 스크립트에서 확인 후 기동
```

- [ ] **Step 2: 프론트 기동**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend
npm run dev
```

- [ ] **Step 3: 시나리오 체크리스트**

`/assistant`에서:
1. 왼쪽 "예시 보기" + 오른쪽 Verbose로 대화 3턴 이상 쌓기 → 좌우 각각 마우스 휠로 끝까지
   스크롤되는지(Phase 1).
2. "React 배우면 뭘 같이?" → 네트워크/Sankey 토글 차트(Phase 2).
3. "React·Vue·Angular 비교해줘" → compare 결과가 막대 차트로(Phase 2).
4. 기본/모든 과정 보기/Verbose 3단 토글 전환 시 단계적으로 정보량이 늘어나는지, Verbose에서
   질문마다 다른 실측 SQL·벡터 프리뷰가 뜨는지(Phase 3).
5. `/home`, `/resume` 등 다른 라우트 스크롤·전환 애니메이션이 기존과 동일한지(Phase 1 회귀).

- [ ] **Step 4: 두 저장소 모두 최종 빌드/테스트 일괄 확인**

```bash
cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend && npm run build && node --test --experimental-strip-types tests/*.test.ts
cd /home/rivermoon/Documents/techeer-2026-summer-a/backend && python -m pytest tests/ -v
```

Expected: 전부 PASS/성공. 이 Task는 커밋할 코드 변경이 없다 — 확인만 하고 종료.
