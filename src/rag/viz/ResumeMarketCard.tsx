import VizChart from '../VizChart'
import type { Viz } from '../demoScenarios'
import { categoryLabel } from '../chatLabels'
import type { ResumeMarketPayload } from '../chatContract'
import CoverageRing from './CoverageRing'
import GapList from './GapList'
import type { DemandBarDatum } from './DemandBars'

// 이력서 ↔ 시장 비교 카드(스펙 3.c) — 새 echarts를 만들지 않고 기존 VizChart(radar)·GapList·
// CoverageRing 3개를 그대로 조립한다. radar[{category,coverage 0..1}] → VizChart의 radar indicator
// (max 100)로, gap_top5 → GapList의 DemandBarDatum(share 0..1)으로, coverage_score → CoverageRing
// 소형(우상단)으로 매핑한다.
export interface ResumeMarketCardProps {
  payload: ResumeMarketPayload
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

export default function ResumeMarketCard({ payload }: ResumeMarketCardProps) {
  const { coverage_score, radar, gap_top5 } = payload

  const radarViz: Viz = {
    kind: 'radar',
    indicators: radar.map((r) => ({ name: categoryLabel(r.category), max: 100 })),
    values: radar.map((r) => Math.round(clamp01(r.coverage) * 100)),
  }

  const gapItems: DemandBarDatum[] = gap_top5.map((g) => ({
    canonical: g.canonical,
    share: clamp01(g.freq),
    owned: false,
  }))

  return (
    <div className="rv__marketcard">
      <div className="rv__marketcard-top">
        <div className="rv__marketcard-radar">
          {radar.length > 0 ? (
            <VizChart viz={radarViz} />
          ) : (
            <div className="rv__empty">레이더로 보여줄 카테고리별 데이터가 부족해요.</div>
          )}
        </div>
        <div className="rv__marketcard-score">
          <CoverageRing score={coverage_score} size={64} />
        </div>
      </div>
      <div className="rv__marketcard-gaps">
        <h4 className="rv__diffcol-h">배울 우선순위 (수요순 Top 5)</h4>
        <GapList items={gapItems} />
      </div>
    </div>
  )
}
