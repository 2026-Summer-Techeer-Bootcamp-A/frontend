import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { BarChart3, Network } from 'lucide-react'
import type { ToolResult } from './chatContract'

function useCountUp(target: number, duration = 650) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return v
}

function MiniSpark({ points }: { points: number[] }) {
  const W = 108, H = 30, P = 3
  const max = Math.max(...points) * 1.1 || 1
  const min = Math.min(...points) * 0.9
  const x = (i: number) => P + (i * (W - P * 2)) / (points.length - 1)
  const y = (val: number) => H - P - ((val - min) / (max - min || 1)) * (H - P * 2)
  const line = points.map((val, i) => `${x(i)},${y(val)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <polyline points={line} fill="none" stroke="#2f61b8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** graph tool_result → echarts force 레이아웃. focus 노드는 크게·액센트, traversal 순서로 강조. */
function GraphCard({ r }: { r: Extract<ToolResult, { kind: 'graph' }> }) {
  const option = {
    tooltip: { show: true },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      force: { repulsion: 130, edgeLength: [40, 90], gravity: 0.14, friction: 0.35 },
      label: { show: true, fontSize: 11, color: '#43454c' },
      lineStyle: { color: '#cdd2db', width: 1.4, curveness: 0.06 },
      emphasis: { focus: 'adjacency' },
      edgeLabel: { show: true, formatter: (p: { data: { label?: string } }) => p.data.label ?? '', fontSize: 10, color: '#7c7f88' },
      data: r.nodes.map((n) => ({
        id: n.id, name: n.label,
        symbolSize: n.focus ? 42 : 26,
        itemStyle: { color: n.focus ? '#2f61b8' : '#8fb0e2', borderColor: '#fff', borderWidth: 2 },
        label: { color: n.focus ? '#1c1d21' : '#43454c', fontWeight: n.focus ? 700 : 500 },
      })),
      links: r.edges.map((e) => ({
        source: e.source, target: e.target, label: e.label,
        lineStyle: { width: e.strength ? 1 + (e.strength / 100) * 3 : 1.4 },
      })),
    }],
  }
  return (
    <div className="tl-card tl-card--graph">
      <div className="tl-card__head"><Network size={12} /> {r.label}</div>
      <ReactECharts option={option} style={{ height: 240 }} notMerge />
      <div className="tl-card__cap">순회 {r.traversal.length}개 노드 · 엣지 강도 = 동시출현율</div>
    </div>
  )
}

export default function ToolLane({ results }: { results: ToolResult[] }) {
  return (
    <div className={`tl-lanes${results.length > 1 ? ' tl-lanes--multi' : ''}`}>
      {results.map((r, i) => <ToolCard key={i} r={r} />)}
    </div>
  )
}

function ToolCard({ r }: { r: ToolResult }) {
  const before = useCountUp(r.kind === 'compare' ? r.before : 0)
  const after = useCountUp(r.kind === 'compare' ? r.after : 0)
  const big = useCountUp(r.kind === 'stat' ? r.big : 0)

  if (r.kind === 'graph') return <GraphCard r={r} />

  return (
    <div className="tl-card">
      <div className="tl-card__head"><BarChart3 size={12} /> {r.label}</div>

      {r.kind === 'trend' && (
        <div className="tl-stat">
          <b>{r.n.toLocaleString()}</b><span>{r.unit}</span>
          <MiniSpark points={r.spark} /><span className="tl-delta">{r.delta}</span>
        </div>
      )}

      {r.kind === 'list' && (
        <div className="tl-list">
          {r.items.map((it) => (
            <div className="tl-row" key={it.name}>
              {it.rank && <span className="tl-rank">{it.rank}</span>}
              <span className="co">{it.name}</span>
              {it.sub && <span className="role">{it.sub}</span>}
              {it.pct !== undefined && <span className="tl-bar"><span style={{ width: `${it.pct}%` }} /></span>}
              <span className="pct">{it.metric}</span>
            </div>
          ))}
        </div>
      )}

      {r.kind === 'compare' && (
        <div className="tl-compare">
          <div className="tl-compare__side"><span className="lbl">{r.beforeLabel}</span><b>{before.toLocaleString()}</b></div>
          <span className="tl-compare__arrow">→</span>
          <div className="tl-compare__side"><span className="lbl">{r.afterLabel}</span><b>{after.toLocaleString()}</b></div>
          <span className="tl-delta">{r.deltaLabel}</span>
        </div>
      )}

      {r.kind === 'stat' && (
        <div className="tl-bigstat">
          <b>{big.toLocaleString()}{r.suffix}</b>
          <div className="tl-bigstat__meta"><span>{r.caption}</span><span className="muted">{r.sub}</span></div>
        </div>
      )}
    </div>
  )
}
