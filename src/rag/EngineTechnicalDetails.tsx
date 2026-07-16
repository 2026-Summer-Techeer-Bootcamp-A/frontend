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
