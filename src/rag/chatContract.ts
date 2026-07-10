// /chat v2 응답 계약 — 프론트 단일 진실원.
// 스펙 docs/superpowers/specs/2026-07-10-rag-hybrid-agentic-graph-design.md §5 동결본.
// 백엔드 T3 완료 시 이 타입에 응답을 그대로 맞춘다(픽스처 → 실제 API 무변경 스위치).

export type Pool = 'global' | 'domestic'
export type Route = 'sql' | 'vector' | 'graph' | 'mixed'
export type ToolName = 'sql' | 'vector' | 'graph'

/** 파이프라인 단계 하나. status는 재검색 루프 시각화용. */
export type StepKind = 'plan' | 'tool' | 'eval' | 'synth'
export interface ChatStep {
  kind: StepKind
  tool?: ToolName          // kind==='tool'일 때 어떤 도구인지
  label: string
  detail: string
  status?: 'run' | 'done' | 'retry'  // 'retry' = evaluator가 재검색을 걸었음
}

export interface Plan {
  intent: string
  subqueries: string[]
  tools: ToolName[]
  pool: Pool
}

// --- tool_results: 기존 union 유지 + graph 추가 ---
export interface ListItem { name: string; sub?: string; metric: string; pct?: number; rank?: number }
export interface GraphNode { id: string; label: string; group?: string; focus?: boolean }
export interface GraphEdge { source: string; target: string; strength?: number; label?: string }

export type ToolResult =
  | { kind: 'trend'; label: string; n: number; unit: string; delta: string; spark: number[] }
  | { kind: 'list'; label: string; items: ListItem[] }
  | { kind: 'compare'; label: string; beforeLabel: string; before: number; afterLabel: string; after: number; deltaLabel: string }
  | { kind: 'stat'; label: string; big: number; suffix: string; caption: string; sub: string }
  | { kind: 'graph'; label: string; nodes: GraphNode[]; edges: GraphEdge[]; focusId: string; traversal: string[] }

export interface Citation {
  type: 'sql' | 'vector' | 'graph' | 'posting' | 'community'
  ref: string
  label: string
}

export interface AnswerSeg { text: string; cite: string }
export interface Confidence { level: number; n: number }

export interface ChatResponse {
  answer: AnswerSeg[]
  route: Route
  plan: Plan
  steps: ChatStep[]
  tool_results: ToolResult[]
  citations: Citation[]
  confidence: Confidence
  degraded: boolean
}

/** 데모/픽스처 항목: 응답 + 칩 라벨 + 유저 질문. */
export interface DemoScenario {
  id: string
  chipLabel: string
  userQ: string
  response: ChatResponse
}
