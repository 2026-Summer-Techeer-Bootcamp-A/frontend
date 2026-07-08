import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, tooltipStyle } from './base'
import raw from '../../data/pearl/u.json'

type Item = {
  tech: string; category: string; repo_reach: number; reach_pct: number
  job_demand_pct: number; owned: boolean; reach_pctl: number; demand_pctl: number
}
const U = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { items: Item[]; opportunities: Item[] }
}

export default function WidgetU() {
  const items = U.data.items
  const top = U.data.opportunities[0]

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 56, right: 90, top: 20, bottom: 44 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const it: Item = p.data.it
        return `<b>${it.tech}</b>${it.owned ? ` <span style="color:${C.accent}">· 보유</span>` : ''}<br/>
          GitHub 저장소 언급 <b>${it.repo_reach}개</b> · 상위 ${100 - it.reach_pctl}%<br/>
          채용 수요 <b>${it.job_demand_pct}%</b> · 상위 ${100 - it.demand_pctl}%`
      },
    },
    xAxis: {
      type: 'value', min: 0, max: 100, name: 'GitHub 저장소 언급 브레스 →', nameLocation: 'middle', nameGap: 28,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11.5, fontWeight: 700 },
      axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100, name: '채용 수요 →', nameLocation: 'middle', nameGap: 24,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11.5, fontWeight: 700 },
      axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: C.line2 } },
    },
    series: [
      {
        type: 'scatter',
        data: items.map((it) => {
          const isOpp = U.data.opportunities.some((o) => o.tech === it.tech)
          return {
            value: [it.reach_pctl, it.demand_pctl], it,
            symbolSize: 9 + Math.sqrt(it.repo_reach) * 1.6,
            itemStyle: {
              color: it.owned ? C.accent : isOpp ? C.gold : C.neutral300,
              borderColor: isOpp ? C.gold : '#fff', borderWidth: isOpp ? 2.5 : 1.2,
              shadowBlur: isOpp ? 8 : 0, shadowColor: 'rgba(184,137,43,0.5)',
            },
            label: (isOpp || it.owned)
              ? { show: true, position: 'top', distance: 5, formatter: it.tech, color: C.ink2, fontFamily: FONT, fontSize: 10.5, fontWeight: 700 }
              : { show: false },
          }
        }),
        markLine: {
          silent: true, symbol: 'none', label: { show: false },
          lineStyle: { color: C.neutral300, width: 1, type: 'dashed' },
          data: [{ xAxis: 50 }, { yAxis: 50 }],
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 U" title="GitHub topics 자동교차 — 2차 관심 신호"
      headline={<>HN(후보 A)과 독립적으로 봐도 <b style={{ color: C.gold }}>{top.tech}</b>는 여전히 저평가예요 — 저장소 태그 상위 {100 - top.reach_pctl}%인데 채용은 상위 {100 - top.demand_pctl}%</>}
      note={U.sample_note} asOf={U.as_of} n={U.sample_size}
    >
      <ReactECharts option={option} style={{ height: 420 }} notMerge />
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 보유 기술</span>
        <span><i style={{ background: C.gold, boxShadow: `0 0 0 2px #f7efd9` }} /> 교차검증된 기회(우상단 대비 좌하단)</span>
        <span><i style={{ background: C.neutral300 }} /> 그 외</span>
        <span className="wg-legend__hint">점 크기 = topics 태그 저장소 수 · A는 HN 언급, U는 GitHub 저장소 topics 태그 — 서로 다른 소스로 같은 결론이면 신뢰도가 올라가요</span>
      </div>
    </WidgetFrame>
  )
}
