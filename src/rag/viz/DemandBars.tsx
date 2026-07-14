import { useMemo } from 'react'
import { max as d3Max, scaleBand, scaleLinear } from 'd3'

// 수요 상위 스킬 막대 — api.skillShare(top_k) 결과를 그대로 받는다.
// 각 막대의 길이는 항상 "수요 share"이고, 색은 owned 여부만 구분한다(길이를 owned로 왜곡하지 않는다).
// 색만으로 구분되지 않도록 각 행에 "· 보유" 텍스트와 상단 범례를 함께 둔다.

export interface DemandBarDatum {
  canonical: string
  share: number // 0~1 비율(백엔드 skill-share 응답 그대로)
  owned: boolean
}

export interface DemandBarsProps {
  items: DemandBarDatum[]
  sample?: boolean
  width?: number
}

const ROW_H = 44
const BAR_Y = 18
const BAR_H = 16
const MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

export default function DemandBars({ items, sample = false, width = 480 }: DemandBarsProps) {
  const innerWidth = width - MARGIN.left - MARGIN.right
  const height = MARGIN.top + MARGIN.bottom + Math.max(1, items.length) * ROW_H

  const maxShare = Math.max(0.05, d3Max(items, (d) => d.share) ?? 0.05)
  const xScale = useMemo(
    () => scaleLinear().domain([0, maxShare]).range([0, innerWidth]).clamp(true),
    [maxShare, innerWidth],
  )
  const yScale = useMemo(
    () =>
      scaleBand()
        .domain(items.map((d) => d.canonical))
        .range([0, items.length * ROW_H])
        .paddingInner(0.15)
        .paddingOuter(0.08),
    [items],
  )

  if (items.length === 0) {
    return <div className="rv__empty">표시할 수요 데이터가 없어요.</div>
  }

  return (
    <div className="rv__bars">
      {sample && <span className="rv__badge">예시</span>}
      <div className="rv__legend">
        <span className="rv__legend-item">
          <i className="rv__swatch rv__swatch--owned" aria-hidden="true" />보유
        </span>
        <span className="rv__legend-item">
          <i className="rv__swatch rv__swatch--gap" aria-hidden="true" />미보유
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="채용 공고 수요 상위 스킬과 내 보유 여부">
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {items.map((d) => {
            const y = yScale(d.canonical) ?? 0
            const barW = Math.max(2, xScale(d.share))
            const pctLabel = `${Math.round(d.share * 100)}%`
            return (
              <g key={d.canonical} transform={`translate(0, ${y})`}>
                <text x={0} y={0} dominantBaseline="hanging" className="rv__bar-label">
                  {d.canonical}
                  {d.owned ? ' · 보유' : ''}
                </text>
                <text x={innerWidth} y={0} dominantBaseline="hanging" textAnchor="end" className="rv__bar-value">
                  {pctLabel}
                </text>
                <rect x={0} y={BAR_Y} width={innerWidth} height={BAR_H} rx={BAR_H / 2} className="rv__bar-track" />
                <rect
                  x={0}
                  y={BAR_Y}
                  width={barW}
                  height={BAR_H}
                  rx={BAR_H / 2}
                  className={`rv__bar-fill${d.owned ? ' rv__bar-fill--owned' : ' rv__bar-fill--gap'}`}
                />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
