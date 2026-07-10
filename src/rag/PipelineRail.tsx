import { Cpu, Database, GitBranch, ScanSearch, Sparkle } from 'lucide-react'
import type { ChatStep, StepKind } from './chatContract'

const KIND_ICON: Record<StepKind, typeof Cpu> = {
  plan: Cpu,
  tool: Database,
  eval: ScanSearch,
  synth: GitBranch,
}

/** steps[]를 세로 레일로. activeIndex까지 점등, retry 단계는 루프 표식을 단다.
 *  "유리 파이프라인" — 신호가 위→아래로 흐르며 각 단계의 실제 작업(detail)을 담담히 드러낸다. */
export default function PipelineRail({ steps, activeIndex }: { steps: ChatStep[]; activeIndex: number }) {
  return (
    <ol className="pl-rail" aria-label="RAG 파이프라인 진행">
      {steps.map((s, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
        const Icon = KIND_ICON[s.kind]
        const retry = s.status === 'retry'
        return (
          <li key={i} className={`pl-node pl-node--${state}${retry ? ' pl-node--retry' : ''}`}>
            <span className="pl-node__rail" aria-hidden="true">
              <span className="pl-node__dot"><Icon size={12} /></span>
            </span>
            <span className="pl-node__body">
              <span className="pl-node__label">{s.label}</span>
              <span className="pl-node__detail">{s.detail}</span>
              {retry && (
                <span className="pl-node__loop"><Sparkle size={11} /> 근거 부족 → 재검색</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
