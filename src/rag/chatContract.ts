// POST /api/v1/chat 응답 계약 — 실제 백엔드 계약을 그대로 반영한 프론트 단일 진실원.
// 원천: backend/app/services/rag/schemas.py (ChatRequest/ChatResponse).
// answer는 세그먼트 배열이 아니라 순수 문자열이다 — 예전 아스피레이셔널 계약(AnswerSeg[])과 다르니 주의.

export type Pool = 'domestic' | 'global'
export type Route = 'sql' | 'vector' | 'graph' | 'mixed'
export type StepKind = 'plan' | 'tool' | 'eval' | 'synth'
export type ToolResultKind =
  | 'list' | 'stat' | 'trend' | 'graph' | 'compare'
  | 'resume_posting' | 'posting_posting' | 'resume_market' // 이력서·공고 비교 카드(다음 슬라이스에서 렌더)
  | 'resume_posting_llm' // 커리어 적합도 Split Diff: 이력서 vs 공고 원문 LLM 판정(SplitDiff 전담)
  | 'posting_posting_llm' // 커리어 적합도 Split Diff: 공고 vs 공고 원문 LLM 판정. resume_posting_llm과 같은
                           // SplitDiffPayload 모양을 쓴다 — SplitDiff는 kind가 아니라 payload 필드로 렌더한다.
  | 'posting_list' // 공고 카드 리스트(semantic_search·resume_recommend) — PostingResultCards 전담, 차트 금지(백엔드 PR #80)

// 컴포저에 첨부되는 이력서·공고 한 건. resume은 대화당 최대 1개(백엔드가 resume_id 단수로만 받음),
// posting은 여러 개 가능(posting_ids[]). id는 resume_id 또는 posting id 그 자체.
export type AttachmentKind = 'resume' | 'posting'
export interface ChatAttachment {
  kind: AttachmentKind
  id: number
  title: string
  subtitle?: string
}

/** 파이프라인 단계 하나. kind==='tool'일 때만 tool이 채워진다.
 *  debug는 kind==='synth'일 때만 채워진다(LLM 모델/temperature/토큰/재시도 실측값). */
export interface ChatStep {
  kind: StepKind
  tool?: string
  label: string
  detail?: string
  duration_ms?: number | null
  debug?: Record<string, unknown> | null
}

export interface Plan {
  intent: string
  subqueries: string[]
  tools: string[]
  pool: string | null
  entities: Record<string, unknown>
}

export interface ToolResultItem {
  name: string
  metric?: string
  pct?: number
  // posting_list 전용(백엔드 PR #80) — 공고 원본 id·회사·풀. 다른 kind는 채우지 않는다.
  id?: number
  company?: string
  pool?: string
  // posting_list 전용(백엔드 PR #81) — resume_recommend(이력서 첨부)일 때만 matched/missing_skills가
  // 채워진다. semantic_search(이력서 없음)는 region만 있고 skills 두 배열은 없거나 비어있을 수 있다.
  region?: string
  matched_skills?: string[]
  missing_skills?: string[]
  concepts?: string[]
}

// 비교 3종의 전용 payload — items[]로는 표현 안 되는 구조라 kind별로 별도 필드를 둔다.
// 실제 렌더(SkillDiff/PostingDiff/ResumeMarketCard)는 다음 슬라이스에서 붙는다 — 지금은 계약만 정의.
export interface ResumePostingPayload {
  resume_title: string
  posting_title: string
  coverage_pct: number
  matched_skills: string[]
  missing_skills: string[]
  extra_skills: string[]
}

export interface PostingPostingPayload {
  postingA: string
  postingB: string
  shared: string[]
  onlyA: string[]
  onlyB: string[]
}

export interface ResumeMarketPayload {
  coverage_score: number
  radar: { category: string; coverage: number }[]
  gap_top5: { canonical: string; freq: number; category: string }[]
}

// 요구사항 한 줄(Split Diff 한 행) — 원천: backend/app/services/rag/tools/compare_tool.py
// resume_posting_llm_compare/posting_posting_llm_compare가 조립하는 requirements[] 원소와
// 필드명을 그대로 맞춘다. quote는 이전 계약의 resume_quote를 일반화한 이름이다 — 판정 대상
// 문서(이력서 또는 비교 공고) 쪽 근거 인용을 한쪽 필드명으로 통일해서 받는다.
// 잠정 계약(백엔드 posting_posting_llm 작업과 나중에 필드명을 맞춰야 한다).
export type RequirementVerdict = 'met' | 'partial' | 'gap'

// 요구사항이 공고 원문의 어느 섹션(자격요건/우대사항)에서 나왔는지. 백엔드
// app/services/career/requirements.py의 extract_requirements는 아직 posting_description의
// 섹션 구분(normalize_jobkorea_sections가 만드는 "자격 요건"/"우대 사항" 제목)을 유지한 채
// LLM에 넘기지 않는다 — 섹션 텍스트를 전부 이어붙인 평문(_description_to_text)만 LLM이 보므로
// 요구사항 단위로 섹션 출처를 되짚을 방법이 없다. 그래서 이 필드는 항상 옵셔널이고, 백엔드가
// 섹션 출처를 함께 내려주기 전까지는 값이 오지 않는다 — 없는 값을 프론트에서 지어내지 않는다
// (UI 쪽 기본 처리는 requirementKindOf, SplitDiff.tsx 참고: 값이 없으면 '자격요건'으로 본다).
export type RequirementKind = 'must' | 'preferred'

export interface SplitDiffRequirement {
  id: string
  text: string
  source_quote: string
  verdict: RequirementVerdict
  quote: string
  rationale: string
  next_step: string
  requirement_kind?: RequirementKind
}

// 커리어 적합도 Split Diff payload — kind가 "resume_posting_llm"(이력서 vs 공고)이든
// "posting_posting_llm"(공고 vs 공고)이든 같은 모양을 쓴다. base_*는 기준 문서, target_*는
// 그 기준을 얼마나 채우는지 판정받는 대상 문서다. target_title은 이력서처럼 제목이 없는
// 경우 빈 문자열일 수 있다 — 그때 UI는 " · title" 부분을 생략한다.
export interface SplitDiffPayload {
  base_role: string
  base_title: string
  target_role: string
  target_title: string
  score: number
  counts: { met: number; partial: number; gap: number }
  summary: string
  requirements: SplitDiffRequirement[]
  degraded: boolean
  // 기준 문서(공고) 원문 전체. 백엔드가 아직 안 내려주는 옵셔널 필드다(compare_tool.py는
  // 지금 base_role/base_title 등 요약 필드만 조립하고 원문 description은 프론트로 넘기지
  // 않는다) — 나중에 붙을 것을 대비한 잠정 계약. 값이 오면 SplitDiff가 원문 그대로를 렌더하며
  // 그 안에서 각 requirement의 source_quote 구간을 찾아 하이라이트하고, 없거나 매칭이
  // 불안정하면(구절을 원문에서 못 찾거나 겹치면) source_quote들을 문단 흐름으로 나열하는
  // 폴백으로 안전하게 내려간다.
  base_description?: string
}

export interface ToolResult {
  kind: ToolResultKind
  label: string
  items: ToolResultItem[]
  value?: number | string
  unit?: string
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
  debug?: Record<string, unknown> | null
  facts?: string | null
  compare?: ResumePostingPayload | PostingPostingPayload | ResumeMarketPayload | SplitDiffPayload // kind로 어떤 payload인지 판별
}

export interface Citation {
  type: string
  ref: string
  label: string
}

export interface Confidence {
  level: number // 0~5
  n: number // 근거 표본 수
}

export interface ChatResponse {
  answer: string
  route: Route
  plan: Plan
  steps: ChatStep[]
  tool_results: ToolResult[]
  citations: Citation[]
  confidence: Confidence
  degraded: boolean
  degraded_reasons: string[]
  total_duration_ms?: number | null
}

export interface ChatRequestBody {
  question: string
  pool?: Pool
  verbose?: boolean
  attachments?: ChatAttachment[]
  // 이력서 확인 세션 id(POST /resume/confirm 응답의 session_id). 있으면 백엔드가 세션에
  // 실린 이력서 원문으로 커리어 적합도 LLM 판정(resume_posting_llm_compare)을 태운다.
  resume_session_id?: string
}

// ============================================================
// POST /api/v1/chat/stream 응답 계약 (SSE) — 위 /chat과 같은 파이프라인을
// 단계별로 프레임 하나씩 흘려보낸다. 원천: 세션 스크래치패드 sse-chat-contract.md.
// answer는 토큰 스트리밍이 아니라 final 프레임에서 한 번에 온다 —
// 라이브 체감은 plan → tool → eval → synth 단계가 하나씩 나타나는 것.
// ============================================================

/** step 프레임의 kind는 tool·eval·synth만 온다 — plan은 별도 plan 프레임으로 이미 다룬다. */
export type StreamStepKind = 'tool' | 'eval' | 'synth'

/** result 프레임의 items/nodes/edges는 비어있으면 아예 필드가 생략될 수 있어 옵셔널로 둔다.
 *  화면에 쓸 때는 ToolResult로 정규화(빈 배열 기본값)해서 기존 렌더 컴포넌트를 그대로 재사용한다. */
export interface StreamToolResult {
  kind: ToolResultKind
  label: string
  items?: ToolResultItem[]
  value?: number | string
  unit?: string
  nodes?: Record<string, unknown>[]
  edges?: Record<string, unknown>[]
  debug?: Record<string, unknown> | null
  facts?: string | null
  compare?: ResumePostingPayload | PostingPostingPayload | ResumeMarketPayload | SplitDiffPayload
}

export type ChatStreamEvent =
  | {
      type: 'plan'
      route: Route
      plan: Plan
      duration_ms?: number | null
      debug?: Record<string, unknown> | null
    }
  | {
      type: 'step'
      kind: StreamStepKind
      tool?: string
      label: string
      detail?: string
      duration_ms?: number | null
      debug?: Record<string, unknown> | null
    }
  | { type: 'result'; result: StreamToolResult }
  | {
      type: 'final'
      answer: string
      citations: Citation[]
      confidence: Confidence
      degraded: boolean
      degraded_reasons: string[]
      total_duration_ms?: number | null
    }
  | { type: 'error'; message: string }

/** 정규화: StreamToolResult의 옵셔널 배열을 ToolResult 형태(빈 배열 기본값)로 채워
 *  RagConsole의 ToolResultCard 등 기존 렌더 컴포넌트를 스트리밍 데이터에도 그대로 쓴다. */
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
    facts: r.facts ?? undefined,
    compare: r.compare,
  }
}
