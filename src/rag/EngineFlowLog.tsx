import { Terminal } from 'lucide-react'
import type { Plan, Route, StreamStepKind, ToolResult } from './chatContract'
import { routeLabel, intentLabel } from './chatLabels'
import { DEBUG_KEY_LABELS, formatDebugValue } from './engineDebugFormat'

interface FlowStep {
  kind: StreamStepKind
  tool?: string
  label: string
  detail?: string
}

interface EngineFlowLogProps {
  question: string
  route?: Route
  plan?: Plan
  steps: FlowStep[]
  results: ToolResult[]
}

const STEP_KIND_LOG_LABEL: Record<StreamStepKind, string> = {
  tool: '도구 호출',
  eval: '근거 평가',
  synth: '답변 종합',
}

// 도구 호출 스텝 하나에, 같은 라벨을 가진 tool_result의 debug(실측값: 모델·DB·SQL 등)를 찾아 붙인다.
// 라벨이 토씨까지 같지 않을 수 있어(백엔드가 부가 문구를 덧붙이는 경우) 포함 관계로 느슨하게 매칭한다.
function findDebugFor(step: FlowStep, results: ToolResult[]): Record<string, unknown> | null {
  if (step.kind !== 'tool') return null
  const match = results.find((r) => r.debug && (r.label === step.label || step.label.includes(r.label) || r.label.includes(step.label)))
  return match?.debug ?? null
}

// "모든 과정 보기" 전용 로그 뷰. 그래프·차트는 기본 화면에 이미 나오니 여기서는 다시 그리지 않고,
// 사용자 입력이 라우팅 판정 → 도구 호출(실제로 어떤 모델·DB를 건드렸는지) → 근거 평가 → 답변 종합으로
// 흘러가는 과정을 시간 순 로그로 그대로 보여준다. 개발자가 파이프라인 동작을 검증할 때 보는 화면.
export default function EngineFlowLog({ question, route, plan, steps, results }: EngineFlowLogProps) {
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
            {plan.pool && <span className="rc__flowlog-sub"> · 대상 풀 {plan.pool}</span>}
            {entityEntries.length > 0 && (
              <span className="rc__flowlog-sub"> · {entityEntries.map(([k, v]) => `${k}=${String(v)}`).join(', ')}</span>
            )}
            {plan.subqueries.length > 0 && (
              <span className="rc__flowlog-sub"> · 서브쿼리 {plan.subqueries.map((sq) => `"${sq}"`).join(', ')}</span>
            )}
          </span>
        </div>
      )}

      {steps.map((step, i) => {
        const debug = findDebugFor(step, results)
        return (
          <div className="rc__flowlog-row" key={i}>
            <span className="rc__flowlog-tag">{STEP_KIND_LOG_LABEL[step.kind] ?? step.kind}</span>
            <span className="rc__flowlog-body">
              {step.label}
              {step.detail && <span className="rc__flowlog-sub"> · {step.detail}</span>}
              {step.tool && <code className="rc__flowlog-tool">{step.tool}</code>}
              {debug && (
                <div className="rc__flowlog-debug">
                  {Object.entries(debug).map(([key, value]) => (
                    <div className="rc__flowlog-debug-row" key={key}>
                      <span className="rc__flowlog-debug-k">{DEBUG_KEY_LABELS[key] ?? key}</span>
                      <span className="rc__flowlog-debug-v">{formatDebugValue(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
