import { useMemo } from 'react'
import { max as d3Max, scaleBand, scaleLinear } from 'd3'
import type { DemandBarDatum } from './DemandBars'

// 미보유 갭 랭킹 — 수요 상위 스킬 중 내가 보유하지 않은 것만 골라 배울 우선순위 순으로 보여준다.
// 입력 items는 이미 미보유만 걸러 share 내림차순으로 정렬돼 들어온다고 가정한다(호출부 책임).

export interface GapListProps {
  items: DemandBarDatum[]
  sample?: boolean
  width?: number
}

const ROW_H = 40
const BAR_Y = 16
const BAR_H = 14
const RANK_W = 26
const MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }

export default function GapList({ items, sample = false, width = 480 }: GapListProps) {
  const innerWidth = width - MARGIN.left - MARGIN.right - RANK_W
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
    return <div className="rv__empty">미보유 갭이 없어요 — 수요 상위 스킬을 이미 대부분 보유하고 있어요.</div>
  }

  return (
    <div className="rv__gaps">
      {sample && <span className="rv__badge">예시</span>}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="배울 우선순위가 높은 미보유 스킬 랭킹">
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {items.map((d, i) => {
            const y = yScale(d.canonical) ?? 0
            const barW = Math.max(2, xScale(d.share))
            const pctLabel = `${Math.round(d.share * 100)}%`
            return (
              <g key={d.canonical} transform={`translate(0, ${y})`}>
                <circle cx={11} cy={BAR_Y + BAR_H / 2} r={9} className="rv__gap-rank-bg" />
                <text x={11} y={BAR_Y + BAR_H / 2} dominantBaseline="middle" textAnchor="middle" className="rv__gap-rank">
                  {i + 1}
                </text>
                <text x={RANK_W} y={0} dominantBaseline="hanging" className="rv__bar-label">
                  {d.canonical}
                </text>
                <text x={RANK_W + innerWidth} y={0} dominantBaseline="hanging" textAnchor="end" className="rv__bar-value">
                  {pctLabel}
                </text>
                <rect x={RANK_W} y={BAR_Y} width={innerWidth} height={BAR_H} rx={BAR_H / 2} className="rv__bar-track" />
                <rect x={RANK_W} y={BAR_Y} width={barW} height={BAR_H} rx={BAR_H / 2} className="rv__bar-fill rv__bar-fill--gap" />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
