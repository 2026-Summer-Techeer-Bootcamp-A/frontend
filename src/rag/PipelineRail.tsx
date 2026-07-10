import { Cpu, Database, GitBranch, RotateCcw, ScanSearch } from 'lucide-react'
import type { ChatStep, StepKind } from './chatContract'

const KIND_ICON: Record<StepKind, typeof Cpu> = {
  plan: Cpu,
  tool: Database,
  eval: ScanSearch,
  synth: GitBranch,
}

/** steps[]를 세로 사고 트레이스로. 지금까지 도달한(activeIndex 이하) 단계만 렌더하고,
 *  새로 드러나는 단계는 아래에서 위로 부드럽게 떠오른다(사고 모델이 과정을 흘리듯).
 *  마지막(activeIndex)이 현재 처리 중, 그 앞은 완료. retry 단계는 재검색 표식을 단다. */
export default function PipelineRail({ steps, activeIndex }: { steps: ChatStep[]; activeIndex: number }) {
  return (
    <ol className="pl-rail" aria-label="RAG 파이프라인 진행">
      {steps.slice(0, activeIndex + 1).map((s, i) => {
        const state = i === activeIndex ? 'active' : 'done'
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
                <span className="pl-node__loop"><RotateCcw size={11} /> 근거 부족 → 재검색</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
