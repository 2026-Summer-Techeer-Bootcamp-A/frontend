import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Compass, Database, FileText, Loader2, Scale, Search, Share2, Sparkles, X } from 'lucide-react'
import type {
  PostingPostingPayload,
  ResumeMarketPayload,
  ResumePostingPayload,
  SplitDiffPayload,
  Plan,
  Route,
  StreamStepKind,
  ToolResult,
} from './chatContract'
import { msLabel, routeLabel } from './chatLabels'

// 1a 파이프라인 계기판 — 접히는 아코디언(옛 ProcessTimeline)을 대체한다. plan → tool(0개 이상) →
// eval → synth → final 프레임이 도착하는 순서를 가로 노드 레일로 그려, 지금 어떤 도구가 실행
// 중이고 각 도구가 실제로 무엇을 찾았는지(결과 미리보기 칩)를 실시간으로 보여준다.
//
// 도구 이름 매핑 근거: backend/app/services/rag/pipeline.py의 _dispatch()가 tool_output에 채우는
// "tool" 필드값을 코드로 직접 확인했다 — sql_tool/vector_tool/graph_tool/compare_tool/resume_tool
// 다섯 파일 전부 "tool": "sql"|"vector"|"graph"|"compare"|"resume" 리터럴만 쓴다. plan.tools는
// 라우터가 텍스트 인텐트만 보고 미리 적어두는 "예상" 값이라 첨부 우선 설계(K2)로 실제 실행
// 도구가 바뀌는 경우(예: resume_coverage로 계획했는데 첨부 공고가 있어 compare로 실행)에는
// 계획과 실행이 어긋난다 — 그래서 이 노드는 plan.tools를 미리 그리지 않고, 실제로 도착한
// step(kind==='tool') 프레임 기준으로만 노드를 만든다(없는 도구를 항상 그리지 않는 안전한 설계).

export interface StepEntry {
  kind: StreamStepKind
  tool?: string
  label: string
  detail?: string
  durationMs?: number | null
  debug?: Record<string, unknown> | null
}

type NodeState = 'done' | 'active' | 'pending' | 'error'
type PipelineStatus = 'loading' | 'done' | 'error'

interface ToolNodeMeta {
  label: string
  short: string
  Icon: LucideIcon
}

// 실행된 스텝의 tool 문자열을 그대로 키로 쓴다 — 백엔드가 새 도구를 추가해도(예 hypothetical
// "market") 매핑에 없으면 DEFAULT_TOOL_META로 안전하게 떨어질 뿐, 화면이 깨지지 않는다.
const TOOL_NODE_META: Record<string, ToolNodeMeta> = {
  sql: { label: 'SQL 검색', short: 'SQL', Icon: Database },
  vector: { label: '벡터 검색', short: 'VEC', Icon: Search },
  graph: { label: '그래프 조회', short: 'GRAPH', Icon: Share2 },
  compare: { label: 'LLM 비교 판정', short: 'AI', Icon: Scale },
  resume: { label: '이력서 분석', short: '이력서', Icon: FileText },
}
const DEFAULT_TOOL_META: ToolNodeMeta = { label: '도구 조회', short: '·', Icon: Search }

function isSplitDiff(c: unknown): c is SplitDiffPayload {
  return !!c && typeof c === 'object' && 'counts' in c
}
function isResumeMarket(c: unknown): c is ResumeMarketPayload {
  return !!c && typeof c === 'object' && 'coverage_score' in c
}
function isPostingPosting(c: unknown): c is PostingPostingPayload {
  return !!c && typeof c === 'object' && 'shared' in c
}
function isResumePosting(c: unknown): c is ResumePostingPayload {
  return !!c && typeof c === 'object' && 'coverage_pct' in c
}

// 노드 아래 붙는 결과 미리보기 칩 — 실제 result 프레임의 수치만 쓴다(가짜 라벨 금지).
function resultChip(result: ToolResult): string {
  if (result.compare) {
    if (isSplitDiff(result.compare)) {
      const { met, partial, gap } = result.compare.counts
      return `요구사항 ${met + partial + gap}건 판정`
    }
    if (isResumeMarket(result.compare)) return `커버리지 ${Math.round(result.compare.coverage_score)}%`
    if (isPostingPosting(result.compare)) return `공통 기술 ${result.compare.shared.length}개`
    if (isResumePosting(result.compare)) return `커버리지 ${result.compare.coverage_pct}%`
  }
  if (result.kind === 'posting_list') return `공고 ${result.items.length}건`
  if (result.items.length > 0) return `${result.items.length}건`
  if (result.value !== undefined && result.value !== null) return `${result.value}${result.unit ?? ''}`
  if (result.nodes.length > 0) return `연관 ${result.nodes.length}개`
  return '완료'
}

function miniStat(tool: string | undefined, result: ToolResult): { code: string; value: string } {
  const meta = (tool && TOOL_NODE_META[tool]) || DEFAULT_TOOL_META
  if (result.compare) {
    if (isSplitDiff(result.compare)) {
      const { met, partial, gap } = result.compare.counts
      return { code: meta.short, value: String(met + partial + gap) }
    }
    if (isResumeMarket(result.compare)) return { code: meta.short, value: `${Math.round(result.compare.coverage_score)}%` }
    if (isPostingPosting(result.compare)) return { code: meta.short, value: String(result.compare.shared.length) }
    if (isResumePosting(result.compare)) return { code: meta.short, value: `${result.compare.coverage_pct}%` }
  }
  if (result.items.length > 0) return { code: meta.short, value: String(result.items.length) }
  if (result.value !== undefined && result.value !== null) return { code: meta.short, value: String(result.value) }
  return { code: meta.short, value: '완료' }
}

interface PipeNodeVM {
  key: string
  label: string
  chip: string | null
  state: NodeState
  Icon: LucideIcon
}

function buildNodes(
  plan: Plan | undefined,
  route: Route | undefined,
  steps: StepEntry[],
  results: ToolResult[],
  status: PipelineStatus,
  citationsCount: number | undefined,
): PipeNodeVM[] {
  if (!plan) return []
  const nodes: PipeNodeVM[] = [
    { key: 'plan', label: '계획', chip: routeLabel(route), state: 'done', Icon: Compass },
  ]

  const toolSteps = steps.filter((s) => s.kind === 'tool')
  toolSteps.forEach((step, i) => {
    const meta = (step.tool && TOOL_NODE_META[step.tool]) || DEFAULT_TOOL_META
    const result = results[i]
    nodes.push({
      key: `tool-${i}`,
      label: meta.label,
      chip: result ? resultChip(result) : '정리하는 중…',
      state: result ? 'done' : 'active',
      Icon: meta.Icon,
    })
  })

  const hasEval = steps.some((s) => s.kind === 'eval')
  const hasSynth = steps.some((s) => s.kind === 'synth')

  if (status === 'error') {
    nodes.push({ key: 'synth', label: '종합', chip: '중단됨', state: 'error', Icon: X })
    return nodes
  }

  // 다음 도구가 아직 안 왔으면(eval 전이면 도구가 더 올 수 있다) 정체를 특정하지 않는 범용
  // "다음 단계" 자리를 하나 비워둔다 — 어떤 도구가 다음에 실행될지 미리 단정하지 않기 위함.
  if (status === 'loading' && !hasEval) {
    nodes.push({ key: 'next', label: '도구 조회', chip: '진행 중…', state: 'active', Icon: Loader2 })
  }

  const synthState: NodeState = status === 'done' ? 'done' : hasEval || hasSynth ? 'active' : 'pending'
  const synthChip =
    status === 'done'
      ? citationsCount
        ? `근거 ${citationsCount}건 인용`
        : '분석 완료'
      : hasSynth
        ? '답변 작성 중…'
        : hasEval
          ? '근거 검증 중…'
          : null
  nodes.push({ key: 'synth', label: '종합', chip: synthChip, state: synthState, Icon: Sparkles })

  return nodes
}

function usePipelineElapsed(status: PipelineStatus): number {
  const startRef = useRef(Date.now())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (status !== 'loading') return
    const id = setInterval(() => setNow(Date.now()), 150)
    return () => clearInterval(id)
  }, [status])
  return now - startRef.current
}

export interface PipelineDashboardProps {
  route?: Route
  plan?: Plan
  planDurationMs?: number | null
  steps: StepEntry[]
  results: ToolResult[]
  status: PipelineStatus
  totalDurationMs?: number | null
  citationsCount?: number
}

export default function PipelineDashboard({
  route,
  plan,
  steps,
  results,
  status,
  totalDurationMs,
  citationsCount,
}: PipelineDashboardProps) {
  const elapsed = usePipelineElapsed(status)

  const nodes = useMemo(
    () => buildNodes(plan, route, steps, results, status, citationsCount),
    [plan, route, steps, results, status, citationsCount],
  )

  const miniStats = useMemo(() => {
    const toolSteps = steps.filter((s) => s.kind === 'tool')
    return toolSteps.map((step, i) => (results[i] ? miniStat(step.tool, results[i]) : null)).filter((v): v is { code: string; value: string } => !!v)
  }, [steps, results])

  if (nodes.length === 0) return null

  const doneCount = nodes.filter((n) => n.state === 'done').length
  const progressPct = nodes.length > 0 ? Math.round((doneCount / nodes.length) * 100) : 0

  const timerLabel =
    status === 'loading'
      ? `${msLabel(elapsed) ?? '0ms'} 경과`
      : status === 'done'
        ? `${msLabel(totalDurationMs) ?? ''} 소요`.trim()
        : '중단됨'

  const footSentence =
    status === 'error'
      ? '진행이 중단됐어요'
      : status === 'done'
        ? ''
        : !steps.some((s) => s.kind === 'tool')
          ? '질문을 분석하고 있어요'
          : steps.some((s) => s.kind === 'eval')
            ? '근거를 종합하는 중이에요'
            : '관련 데이터를 찾고 있어요'

  return (
    <div className="rc__pipe" aria-live="polite">
      <div className="rc__pipe-top">
        <span className="rc__pipe-timer">{timerLabel}</span>
      </div>

      <div className={`rc__pipe-rail rc__pipe-rail--${status}`}>
        <span className="rc__pipe-track" aria-hidden="true" />
        <span className="rc__pipe-progress" aria-hidden="true" style={{ width: `${progressPct}%` }} />
        {nodes.map((node) => (
          <div className={`rc__pipe-node rc__pipe-node--${node.state}`} key={node.key}>
            <span className={`rc__pipe-bead${node.state === 'active' ? ' rc__pipe-bead--spin' : ''}`}>
              <node.Icon size={16} aria-hidden="true" />
            </span>
            <span className="rc__pipe-nlabel">{node.label}</span>
            {node.chip && (
              <span className={`rc__pipe-chip${node.state === 'active' ? ' rc__pipe-chip--shimmer' : ''}`}>{node.chip}</span>
            )}
          </div>
        ))}
      </div>

      {(footSentence || miniStats.length > 0) && (
        <div className={`rc__pipe-foot${status === 'done' ? ' rc__pipe-foot--done' : status === 'error' ? ' rc__pipe-foot--error' : ''}`}>
          {footSentence ? <span>{footSentence}</span> : null}
          {miniStats.length > 0 && (
            <span className="rc__pipe-mini">
              {miniStats.map((m, i) => (
                <span key={i}>{m.code} {m.value}</span>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
