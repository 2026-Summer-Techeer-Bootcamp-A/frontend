import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, tooltipStyle } from './base'
import raw from '../../data/pearl/x.json'

type Cat = { name: string; n: number }
type TechRow = { tech: string; pct: number }
const X = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { categories: Cat[]; matrix: number[][]; top_tech: Record<string, TechRow[]> }
}

export default function WidgetX() {
  const cats = X.data.categories.map((c) => c.name)
  // 대각선(자기 자신=100) 제외 최고값 쌍 찾기
  let best = { a: '', b: '', v: 0 }, worst = { a: '', b: '', v: 100 }
  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      const v = X.data.matrix[i][j]
      if (v > best.v) best = { a: cats[i], b: cats[j], v }
      if (v < worst.v) worst = { a: cats[i], b: cats[j], v }
    }
  }

  const heat = {
    animationDuration: 600,
    grid: { left: 96, right: 16, top: 44, bottom: 16 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => `<b>${cats[p.data[1]]}</b> × <b>${cats[p.data[0]]}</b><br/>스택 궁합 <b>${p.data[2]}%</b>`,
    },
    xAxis: {
      type: 'category', position: 'top', data: cats,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12, fontWeight: 700 },
    },
    yAxis: {
      type: 'category', data: [...cats].reverse(),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12, fontWeight: 700 },
    },
    visualMap: { min: 0, max: 100, show: false, inRange: { color: ['#f3f6fb', C.accent300, C.accent700] } },
    series: [
      {
        type: 'heatmap',
        data: X.data.matrix.flatMap((row, i) => row.map((v, j) => [j, cats.length - 1 - i, v])),
        label: {
          show: true, fontFamily: FONT, fontSize: 13, fontWeight: 800,
          formatter: (p: any) => p.data[2],
          color: (p: any) => (p.data[2] > 55 ? '#fff' : C.ink2),
        },
        itemStyle: { borderColor: '#fff', borderWidth: 4, borderRadius: 6 },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 X" title="직군 간 스택 궁합"
      headline={<><b>{best.a}</b>·<b>{best.b}</b>가 스택이 가장 비슷해요(<b style={{ color: C.accent }}>{best.v}%</b>) — <b>{worst.a}</b>·<b>{worst.b}</b>는 거의 안 겹쳐요({worst.v}%)</>}
      note={X.sample_note} asOf={X.as_of} n={X.sample_size}
    >
      <div className="wg-x">
        <ReactECharts option={heat} style={{ height: 320 }} notMerge />
        <div className="wg-x__cards">
          {X.data.categories.map((c) => (
            <div key={c.name} className="wg-x__card">
              <div className="wg-x__cname">{c.name} <span>N={c.n.toLocaleString()}</span></div>
              <div className="wg-x__ctech">
                {X.data.top_tech[c.name].map((t) => (
                  <span key={t.tech} className="chip chip--neutral">{t.tech} {t.pct}%</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="wg-legend">
        <span className="wg-legend__hint">가중 자카드 유사도(Ruzicka) — 상위 20개 기술의 보유율 벡터를 비교, 크기 차이를 그대로 반영해요(얕은 보유율은 낮게 평가)</span>
      </div>
    </WidgetFrame>
  )
}
