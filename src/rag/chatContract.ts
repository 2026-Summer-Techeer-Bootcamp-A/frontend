// POST /api/v1/chat 응답 계약 — 실제 백엔드 계약을 그대로 반영한 프론트 단일 진실원.
// 원천: backend/app/services/rag/schemas.py (ChatRequest/ChatResponse).
// answer는 세그먼트 배열이 아니라 순수 문자열이다 — 예전 아스피레이셔널 계약(AnswerSeg[])과 다르니 주의.

export type Pool = 'domestic' | 'global'
export type Route = 'sql' | 'vector' | 'graph' | 'mixed'
export type StepKind = 'plan' | 'tool' | 'eval' | 'synth'
export type ToolResultKind = 'list' | 'stat' | 'trend' | 'graph' | 'compare'

/** 파이프라인 단계 하나. kind==='tool'일 때만 tool이 채워진다. */
export interface ChatStep {
  kind: StepKind
  tool?: string
  label: string
  detail?: string
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
}

export interface ChatRequestBody {
  question: string
  pool?: Pool
  verbose?: boolean
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
}

export type ChatStreamEvent =
  | { type: 'plan'; route: Route; plan: Plan }
  | { type: 'step'; kind: StreamStepKind; tool?: string; label: string; detail?: string }
  | { type: 'result'; result: StreamToolResult }
  | { type: 'final'; answer: string; citations: Citation[]; confidence: Confidence; degraded: boolean }
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
  }
}
