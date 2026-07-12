import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { FONT, tooltipStyle } from './base'
import raw from '../../data/pearl/n.json'

type Node = { tech: string; n: number; owned: boolean; category: string }
type Edge = { a: string; b: string; n: number; strength: number; p_ab: number; p_ba: number }
const N = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { nodes: Node[]; edges: Edge[]; categories: string[] }
}

const CAT_COLOR: Record<string, string> = {
  language: '#0b0b0c', frontend: '#4fa88a', backend: '#8a6fc4', data_db: '#d68a3c',
  cloud_services: '#2f9bd6', devops: '#6b7280', ai_llm: '#b8892b', mobile: '#c0568a',
}
const CAT_LABEL: Record<string, string> = {
  language: '언어', frontend: '프론트엔드', backend: '백엔드', data_db: '데이터·DB',
  cloud_services: '클라우드', devops: '데브옵스', ai_llm: 'AI/LLM', mobile: '모바일',
}
const OWNED_RING = '#21447c'

export default function WidgetN() {
  const nodes = N.data.nodes
  const maxN = Math.max(...nodes.map((n) => n.n))
  const top3 = [...N.data.edges].sort((a, b) => b.strength - a.strength).slice(0, 3)
  const hubs = [...nodes].sort((a, b) =>
    N.data.edges.filter((e) => e.a === b.tech || e.b === b.tech).length -
    N.data.edges.filter((e) => e.a === a.tech || e.b === a.tech).length,
  )[0]
  const totalPairs = (nodes.length * (nodes.length - 1)) / 2

  const option = {
    animationDuration: 900, animationEasing: 'cubicOut',
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        if (p.dataType === 'edge') {
          const e = p.data.raw as Edge
          return `<b>${e.a} × ${e.b}</b><br/>${e.a} 공고 중 <b>${Math.round(e.p_ab * 100)}%</b>가 ${e.b}도 요구<br/>${e.b} 공고 중 <b>${Math.round(e.p_ba * 100)}%</b>가 ${e.a}도 요구`
        }
        const n = p.data.raw as Node
        return `<b>${n.tech}</b> <span style="color:${CAT_COLOR[n.category]}">· ${CAT_LABEL[n.category]}</span>${n.owned ? ' <span style="color:#21447c">· 보유</span>' : ''}<br/>공고 ${n.n.toLocaleString()}건`
      },
    },
    series: [
      {
        type: 'graph', layout: 'force',
        roam: true, draggable: true,
        force: { repulsion: 320, edgeLength: [60, 170], gravity: 0.1, friction: 0.3 },
        symbolSize: (_v: any, p: any) => 14 + Math.sqrt(p.data.raw.n / maxN) * 40,
        label: {
          show: true, position: 'right', distance: 5,
          fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#43454c',
        },
        labelLayout: { hideOverlap: true },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 }, label: { fontWeight: 800 } },
        blur: { itemStyle: { opacity: 0.12 }, lineStyle: { opacity: 0.04 }, label: { opacity: 0.2 } },
        data: nodes.map((n) => ({
          name: n.tech, raw: n,
          itemStyle: {
            color: CAT_COLOR[n.category],
            borderColor: n.owned ? OWNED_RING : '#fff',
            borderWidth: n.owned ? 3.5 : 1.5,
            shadowBlur: n.owned ? 8 : 0, shadowColor: 'rgba(33,68,124,0.4)',
          },
        })),
        links: N.data.edges.map((e) => ({
          source: e.a, target: e.b, raw: e,
          lineStyle: { width: 0.8 + e.strength * 4.5, color: 'rgba(90,100,120,0.28)', curveness: 0.1 },
        })),
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 N" title="스킬 네트워크 — 진짜 구조가 보이는 지점"
      headline={<>React를 원하면 JavaScript도 <b>{Math.round(top3[0].strength * 100)}%</b> — <b>{hubs.tech}</b>가 {N.data.nodes.length}개 기술을 잇는 허브예요</>}
      note={N.sample_note} asOf={N.as_of} n={N.sample_size}
    >
      <div className="wg-c__howto">
        <div className="wg-c__howtitle">연관성, 이렇게 계산했어요</div>
        <ol className="wg-c__steps">
          <li>
            <b>① 대상 선정.</b> 전체 소스(글로벌+국내) 통합 공고에서 SaaS·협업툴·디자인툴을 뺀
            순수 기술 스택 377개 중, 공고 등장 빈도 상위 <b>{nodes.length}개</b>만 노드로 삼았어요.
          </li>
          <li>
            <b>② 연관 강도 = 조건부확률.</b> 두 기술 A·B가 같은 공고에 함께 등장한 공고 수를 각각의
            전체 등장 수로 나눠, "A 요구 공고 중 B도 요구하는 비율"과 "B 요구 공고 중 A도 요구하는 비율" 중
            <b> 더 높은 쪽</b>을 연관 강도로 써요. (React-JavaScript 100%면 React를 요구하는 공고는 사실상 전부 JavaScript도 요구한다는 뜻)
          </li>
          <li>
            <b>③ 노이즈 컷.</b> 두 기술이 함께 등장한 공고가 40건 미만이면 우연으로 보고 버려요.
          </li>
          <li>
            <b>④ 엣지 선별.</b> {nodes.length}개를 다 이으면 최대 {totalPairs.toLocaleString()}쌍이라 해어볼이 돼요.
            그래서 <b>각 기술마다 가장 강하게 연관된 4개 관계만</b> 남겼어요(현재 {N.data.edges.length}개 엣지) — 그래서
            프론트엔드·클라우드·모바일 같은 클러스터가 저절로 드러나요.
          </li>
          <li>
            <b>⑤ 배치.</b> 물리 시뮬레이션(force-directed layout)이 서로 자주 얽히는 기술은 가깝게,
            안 그런 기술은 멀게 자동으로 배치해요 — 사람이 순서를 정하지 않아요.
          </li>
        </ol>
      </div>
      <ReactECharts option={option} style={{ height: 560 }} notMerge />
      <div className="wg-legend">
        {N.data.categories.map((c) => (
          <span key={c}><i style={{ background: CAT_COLOR[c] }} /> {CAT_LABEL[c]}</span>
        ))}
        <span><i style={{ background: 'transparent', border: `2.5px solid ${OWNED_RING}` }} /> 보유(굵은 테두리)</span>
      </div>
      <div className="wg-legend" style={{ marginTop: 6 }}>
        <span className="wg-legend__hint">드래그로 노드를 움직이거나 스크롤로 확대해 보세요 · 마우스를 올리면 연결된 기술만 남아요 · 상위 {nodes.length}개 기술, 각 노드당 최강 연결 4개만 표시</span>
      </div>
    </WidgetFrame>
  )
}
