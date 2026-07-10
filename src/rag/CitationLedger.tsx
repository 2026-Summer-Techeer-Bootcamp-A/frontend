import { Database, FileText, Network, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { Citation, Confidence } from './chatContract'

const TYPE_ICON = {
  sql: Database, vector: FileText, graph: Network, posting: FileText, community: Network,
} as const

/** 근거 원장 — 모든 출처를 담담히 나열한다. 정직성의 시각화. */
export default function CitationLedger({ citations, confidence, degraded }: {
  citations: Citation[]; confidence: Confidence; degraded: boolean
}) {
  const dots = Array.from({ length: 5 }, (_, i) => i < confidence.level)
  return (
    <div className="cl">
      <div className="cl__head">
        <span className="cl__conf">
          <span className="cl__dots">{dots.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</span>
          근거 <b>{confidence.n.toLocaleString()}</b>건 기반
        </span>
        {degraded
          ? <span className="cl__flag cl__flag--degraded"><TriangleAlert size={12} /> 폴백 응답</span>
          : <span className="cl__flag cl__flag--ok"><ShieldCheck size={12} /> 근거 검증됨</span>}
      </div>
      <ul className="cl__list">
        {citations.map((c, i) => {
          const Icon = TYPE_ICON[c.type]
          return (
            <li key={i} className="cl__item">
              <Icon size={12} /><span className="cl__ref">{c.ref}</span><span className="cl__label">{c.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
