// POST /api/v1/chat 응답 계약 — 실제 백엔드 계약을 그대로 반영한 프론트 단일 진실원.
// 원천: backend/app/services/rag/schemas.py (ChatRequest/ChatResponse).
// answer는 세그먼트 배열이 아니라 순수 문자열이다 — 예전 아스피레이셔널 계약(AnswerSeg[])과 다르니 주의.

export type Pool = 'domestic' | 'global'
export type Route = 'sql' | 'vector' | 'graph' | 'mixed'
export type StepKind = 'plan' | 'tool' | 'eval' | 'synth'
export type ToolResultKind =
  | 'list' | 'stat' | 'trend' | 'graph' | 'compare'
  | 'resume_posting' | 'posting_posting' | 'resume_market' // 이력서·공고 비교 카드(다음 슬라이스에서 렌더)
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
  compare?: ResumePostingPayload | PostingPostingPayload | ResumeMarketPayload // kind로 어떤 payload인지 판별
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
  compare?: ResumePostingPayload | PostingPostingPayload | ResumeMarketPayload
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
