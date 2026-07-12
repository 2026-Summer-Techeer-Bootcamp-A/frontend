import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { FONT, tooltipStyle } from './base'
import raw from '../../data/pearl/y4.json'

type Edge = { leader: string; follower: string; lag: number; corr: number; lc: string; fc: string }
const Y = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { edges: Edge[]; cat_ko: Record<string, string> }
}

const CAT_COLOR: Record<string, string> = {
  language: '#0b0b0c', frontend: '#4fa88a', backend: '#8a6fc4', data_db: '#d68a3c',
  cloud_services: '#2f9bd6', devops: '#6b7280', ai_llm: '#b8892b', mobile: '#c0568a',
}

export default function WidgetY4() {
  const edges = Y.data.edges
  const cat: Record<string, string> = {}
  edges.forEach((e) => { cat[e.leader] = e.lc; cat[e.follower] = e.fc })
  const nodes = Object.keys(cat)
  const outdeg: Record<string, number> = {}
  edges.forEach((e) => { outdeg[e.leader] = (outdeg[e.leader] ?? 0) + 1 })
  const top = edges[0]
  const catsPresent = [...new Set(nodes.map((n) => cat[n]))]

  const option = {
    animationDuration: 900,
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        if (p.dataType === 'edge') {
          const e = p.data.raw as Edge
          return `<b>${e.leader}</b> 뜨면 <b>${e.lag}달</b> 뒤 <b>${e.follower}</b><br/>교차상관 r=${e.corr}`
        }
        return `<b>${p.name}</b> <span style="color:${CAT_COLOR[cat[p.name]]}">· ${Y.data.cat_ko[cat[p.name]] ?? cat[p.name]}</span>`
      },
    },
    series: [
      {
        type: 'graph', layout: 'force',
        left: '4%', right: '4%', top: '8%', bottom: '8%',
        roam: true, draggable: true,
        force: { repulsion: 300, edgeLength: [50, 130], gravity: 0.12, friction: 0.3 },
        edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 9],
        symbolSize: (_v: any, p: any) => 16 + (outdeg[p.name] ?? 0) * 7,
        label: { show: true, position: 'right', fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#43454c' },
        labelLayout: { hideOverlap: true },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 }, label: { fontWeight: 800 } },
        blur: { itemStyle: { opacity: 0.12 }, lineStyle: { opacity: 0.05 }, label: { opacity: 0.2 } },
        data: nodes.map((n) => ({
          name: n,
          itemStyle: { color: CAT_COLOR[cat[n]] ?? '#888', borderColor: '#fff', borderWidth: 1.5 },
        })),
        links: edges.map((e) => ({
          source: e.leader, target: e.follower, raw: e,
          lineStyle: { width: 0.8 + (e.corr - 0.5) * 8, color: 'rgba(90,100,120,0.35)', curveness: 0.15 },
        })),
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 Y4" title="트렌드 전파 — 다음에 뜰 기술"
      scopeBadge="글로벌 전용 · HN 커뮤니티 기준"
      headline={<><b>{top.leader}</b>가 뜨면 <b>{top.lag}달</b> 뒤 <b>{top.follower}</b>가 따라 떴어요 — 화살표가 선행지표예요</>}
      note={Y.sample_note} asOf={Y.as_of} n={Y.sample_size}
    >
      <div className="wg-y4">
        <ReactECharts option={option} style={{ height: 440 }} notMerge />
        <div className="wg-y4__list">
          <div className="wg-y4__ltitle">가장 강한 선행 관계</div>
          {edges.slice(0, 9).map((e, i) => (
            <div key={i} className="wg-y4__row">
              <span className="wg-y4__lead" style={{ color: CAT_COLOR[e.lc] }}>{e.leader}</span>
              <span className="wg-y4__arrow">→ {e.lag}달 →</span>
              <span className="wg-y4__foll" style={{ color: CAT_COLOR[e.fc] }}>{e.follower}</span>
              <span className="wg-y4__corr">r={e.corr}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="wg-legend">
        {catsPresent.map((c) => (
          <span key={c}><i style={{ background: CAT_COLOR[c] }} /> {Y.data.cat_ko[c] ?? c}</span>
        ))}
        <span className="wg-legend__hint">HN 언급량 시계열의 교차상관 · 화살표 = 선행 기술이 뜬 뒤 후행 기술이 따라 뜬 시차 · 상관은 인과가 아님(참고용)</span>
      </div>
    </WidgetFrame>
  )
}
