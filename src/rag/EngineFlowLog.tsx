import { Terminal } from 'lucide-react'
import type { Citation, Confidence, Plan, Route, StreamStepKind, ToolResult } from './chatContract'
import { routeLabel, intentLabel } from './chatLabels'
import { DEBUG_KEY_LABELS, formatDebugValue } from './engineDebugFormat'

interface FlowStep {
  kind: StreamStepKind
  tool?: string
  label: string
  detail?: string
  durationMs?: number | null
  debug?: Record<string, unknown> | null
}

interface EngineFlowLogProps {
  question: string
  route?: Route
  plan?: Plan
  planDurationMs?: number | null
  planDebug?: Record<string, unknown> | null
  steps: FlowStep[]
  results: ToolResult[]
  citations?: Citation[]
  confidence?: Confidence
  degradedReasons?: string[]
  totalDurationMs?: number | null
}

const STEP_KIND_LOG_LABEL: Record<StreamStepKind, string> = {
  tool: '도구 호출',
  eval: '근거 평가',
  synth: '답변 종합',
}

// 도구 호출 스텝 하나에, 같은 라벨을 가진 tool_result 전체(facts + debug)를 찾아 붙인다.
// 라벨이 토씨까지 같지 않을 수 있어(백엔드가 부가 문구를 덧붙이는 경우) 포함 관계로 느슨하게 매칭한다.
function findResultFor(step: FlowStep, results: ToolResult[]): ToolResult | null {
  if (step.kind !== 'tool') return null
  return results.find((r) => (r.debug || r.facts) && (r.label === step.label || step.label.includes(r.label) || r.label.includes(step.label))) ?? null
}

function msLabel(ms?: number | null): string | null {
  if (ms === null || ms === undefined) return null
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

// plan 라우팅 줄 · 도구 호출 스텝(tool_result.debug) · 답변 종합 스텝(LLM last_debug) 세 군데가
// 모두 "key-value 목록"이라는 같은 모양이라 렌더링을 한 곳으로 모은다.
function DebugRows({ debug }: { debug: Record<string, unknown> }) {
  return (
    <div className="rc__flowlog-debug">
      {Object.entries(debug).map(([key, value]) => (
        <div className="rc__flowlog-debug-row" key={key}>
          <span className="rc__flowlog-debug-k">{DEBUG_KEY_LABELS[key] ?? key}</span>
          <span className="rc__flowlog-debug-v">{formatDebugValue(key, value)}</span>
        </div>
      ))}
    </div>
  )
}

// "모든 과정 보기" 전용 로그 뷰. 그래프·차트는 기본 화면에 이미 나오니 여기서는 다시 그리지 않고,
// 사용자 입력이 라우팅 판정 → 도구 호출(실제로 어떤 모델·DB를 건드렸는지) → 근거 평가 → 답변 종합으로
// 흘러가는 과정을 시간 순 로그로 그대로 보여준다. 개발자가 파이프라인 동작을 검증할 때 보는 화면.
export default function EngineFlowLog({
  question,
  route,
  plan,
  planDurationMs,
  planDebug,
  steps,
  results,
  citations,
  confidence,
  degradedReasons,
  totalDurationMs,
}: EngineFlowLogProps) {
  const entityEntries = plan?.entities ? Object.entries(plan.entities).filter(([, v]) => v !== null && v !== undefined) : []

  return (
    <div className="rc__flowlog">
      <div className="rc__flowlog-head">
        <Terminal size={14} />
        <span>요청 처리 로그</span>
      </div>

      <div className="rc__flowlog-row">
        <span className="rc__flowlog-tag">입력</span>
        <span className="rc__flowlog-body">&quot;{question}&quot;</span>
      </div>

      {plan && (
        <div className="rc__flowlog-row">
          <span className="rc__flowlog-tag">라우팅</span>
          <span className="rc__flowlog-body">
            {routeLabel(route)} · {intentLabel(plan.intent)}
            {msLabel(planDurationMs) && <span className="rc__flowlog-sub"> · {msLabel(planDurationMs)}</span>}
            {plan.pool && <span className="rc__flowlog-sub"> · 대상 풀 {plan.pool}</span>}
            {entityEntries.length > 0 && (
              <span className="rc__flowlog-sub"> · {entityEntries.map(([k, v]) => `${k}=${String(v)}`).join(', ')}</span>
            )}
            {plan.subqueries.length > 0 && (
              <span className="rc__flowlog-sub"> · 서브쿼리 {plan.subqueries.map((sq) => `"${sq}"`).join(', ')}</span>
            )}
            {planDebug && <DebugRows debug={planDebug} />}
          </span>
        </div>
      )}

      {steps.map((step, i) => {
        const result = findResultFor(step, results)
        const debug = step.debug ?? result?.debug
        return (
          <div className="rc__flowlog-row" key={i}>
            <span className="rc__flowlog-tag">{STEP_KIND_LOG_LABEL[step.kind] ?? step.kind}</span>
            <span className="rc__flowlog-body">
              {step.label}
              {msLabel(step.durationMs) && <span className="rc__flowlog-sub"> · {msLabel(step.durationMs)}</span>}
              {step.detail && <span className="rc__flowlog-sub"> · {step.detail}</span>}
              {step.tool && <code className="rc__flowlog-tool">{step.tool}</code>}
              {result?.facts && <div className="rc__flowlog-facts">&quot;{result.facts}&quot;</div>}
              {debug && <DebugRows debug={debug} />}
            </span>
          </div>
        )
      })}

      {/* final 프레임이 도착해야만 알 수 있는 값들 — 답변이 끝나기 전에는 조용히 생략된다. */}
      {msLabel(totalDurationMs) && (
        <div className="rc__flowlog-row">
          <span className="rc__flowlog-tag">총 소요</span>
          <span className="rc__flowlog-body">{msLabel(totalDurationMs)}</span>
        </div>
      )}

      {confidence && (
        <div className="rc__flowlog-row">
          <span className="rc__flowlog-tag">신뢰도</span>
          <span className="rc__flowlog-body">
            레벨 {confidence.level}/5 · 근거 표본 {confidence.n.toLocaleString()}건
          </span>
        </div>
      )}

      {citations && citations.length > 0 && (
        <div className="rc__flowlog-row">
          <span className="rc__flowlog-tag">인용</span>
          <span className="rc__flowlog-body">
            {citations.map((c, i) => (
              <div key={i}>
                [{i + 1}] {c.label} <span className="rc__flowlog-sub">· {c.type} · {c.ref}</span>
              </div>
            ))}
          </span>
        </div>
      )}

      {degradedReasons && degradedReasons.length > 0 && (
        <div className="rc__flowlog-row">
          <span className="rc__flowlog-tag">저하 사유</span>
          <span className="rc__flowlog-body">
            {degradedReasons.map((r, i) => <div key={i}>{r}</div>)}
          </span>
        </div>
      )}
    </div>
  )
}
