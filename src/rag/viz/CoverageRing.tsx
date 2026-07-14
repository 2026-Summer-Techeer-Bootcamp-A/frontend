import { useEffect, useMemo, useRef } from 'react'
import { arc as d3Arc, scaleLinear, select as d3Select } from 'd3'

// 커버리지 도넛 링 — 저장 이력서 + 로그인 시 실 API(coverage_score)를 그대로 그리고,
// 그게 없을 때는 상위 호출부가 계산한 폴백값(수요 상위 스킬 대비 보유 비율)을 같은 모양으로 넘겨받는다.
// 색만으로 값을 전달하지 않도록 중앙 숫자 라벨 + 보유/전체 텍스트를 항상 병기한다.

export interface CoverageRingProps {
  score: number // 0~100
  ownedCount?: number
  totalCount?: number
  sample?: boolean
  size?: number
}

const FULL_TURN = Math.PI * 2

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

export default function CoverageRing({ score, ownedCount, totalCount, sample = false, size = 148 }: CoverageRingProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const pct = clampPct(score)

  const radius = size / 2
  const thickness = Math.max(10, Math.round(size * 0.12))
  const outerR = radius - 2
  const innerR = outerR - thickness

  const angleScale = useMemo(() => scaleLinear().domain([0, 100]).range([0, FULL_TURN]).clamp(true), [])

  const arcGen = useMemo(
    () => d3Arc<{ startAngle: number; endAngle: number }>().innerRadius(innerR).outerRadius(outerR),
    [innerR, outerR],
  )

  const trackPath = useMemo(
    () => arcGen({ startAngle: 0, endAngle: FULL_TURN - 0.0001 }),
    [arcGen],
  )
  const fillPath = useMemo(() => {
    if (pct <= 0) return null
    const endAngle = pct >= 100 ? FULL_TURN - 0.0001 : angleScale(pct)
    return arcGen({ startAngle: 0, endAngle })
  }, [arcGen, angleScale, pct])

  // 값 자체는 React가 그대로 렌더하고, d3.select는 마운트 시 부드러운 등장 트랜지션에만 관여시킨다
  // (React가 이미 소유한 자식 노드를 d3가 다시 만들거나 지우지 않게 하기 위함).
  useEffect(() => {
    if (!svgRef.current) return
    const sel = d3Select(svgRef.current)
    sel.style('opacity', 0)
    sel.transition().duration(420).style('opacity', 1)
  }, [])

  const roundedPct = Math.round(pct)
  const ownedLabel = totalCount != null && totalCount > 0 ? `${ownedCount ?? 0} / ${totalCount} 보유` : null
  const ariaLabel = `커버리지 ${roundedPct}%${ownedLabel ? `, ${ownedLabel}` : ''}`

  return (
    <div className="rv__ring">
      {sample && <span className="rv__badge">예시</span>}
      <svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label={ariaLabel}>
        <g transform={`translate(${radius}, ${radius})`}>
          {trackPath && <path d={trackPath} fill="var(--line, #e6e9ef)" />}
          {fillPath && <path d={fillPath} fill="var(--c-ink, #0b0b0c)" />}
        </g>
        <text x={radius} y={radius - 3} textAnchor="middle" dominantBaseline="middle" className="rv__ring-num">
          {roundedPct}%
        </text>
        <text x={radius} y={radius + 17} textAnchor="middle" dominantBaseline="middle" className="rv__ring-sub">
          커버리지
        </text>
      </svg>
      {ownedLabel && <div className="rv__ring-label">{ownedLabel}</div>}
    </div>
  )
}
