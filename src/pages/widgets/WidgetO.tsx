import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, tooltipStyle } from './base'
import raw from '../../data/pearl/o.json'

type Row = { tech: string; category: string; global_pct: number; domestic_pct: number; diff: number; g_n: number; d_n: number }
const CAT_LABEL: Record<string, string> = {
  language: '언어', frontend: '프론트엔드', backend: '백엔드', data_db: '데이터·DB',
  cloud_services: '클라우드', devops: '데브옵스', ai_llm: 'AI/LLM', mobile: '모바일',
}
const O = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { global_favored: Row[]; domestic_favored: Row[]; g_total: number; d_total: number }
}

const DOMESTIC_COLOR = C.success

export default function WidgetO() {
  const rows = [...O.data.global_favored].reverse().concat(O.data.domestic_favored)
  const cats = rows.map((r) => r.tech)
  const topGlobal = O.data.global_favored[0]
  const topDomestic = O.data.domestic_favored[0]

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 88, right: 56, top: 14, bottom: 26 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const r: Row = rows[p.dataIndex]
        return `<b>${r.tech}</b> <span style="color:${C.muted}">· ${CAT_LABEL[r.category] ?? r.category}</span><br/>글로벌 풀에서 <b style="color:${C.accent}">${r.global_pct}%</b> (${r.g_n.toLocaleString()}건)<br/>국내 풀에서 <b style="color:${DOMESTIC_COLOR}">${r.domestic_pct}%</b> (${r.d_n.toLocaleString()}건)`
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: C.muted, fontFamily: FONT, fontSize: 11, formatter: (v: number) => (v > 0 ? '+' : '') + v + 'p' },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'category', data: cats,
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12, fontWeight: 600 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        type: 'bar', barWidth: 15,
        data: rows.map((r) => ({
          value: r.diff,
          itemStyle: { color: r.diff >= 0 ? C.accent : DOMESTIC_COLOR, borderRadius: r.diff >= 0 ? [0, 5, 5, 0] : [5, 0, 0, 5] },
        })),
        label: {
          show: true,
          position: (p: any) => (rows[p?.dataIndex ?? 0]?.diff >= 0 ? 'right' : 'left') as any,
          formatter: (p: any) => (rows[p.dataIndex].diff > 0 ? '+' : '') + rows[p.dataIndex].diff + 'p',
          color: C.ink2, fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
        },
        markLine: {
          silent: true, symbol: 'none', label: { show: false },
          lineStyle: { color: C.ink, width: 1.5 },
          data: [{ xAxis: 0 }],
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 O" title="글로벌 vs 국내 — 시장이 다르다"
      headline={<>같은 시장이 아니에요 — 국내는 <b style={{ color: DOMESTIC_COLOR }}>{topDomestic.tech}</b> 등 기본기에 집중, 글로벌은 <b style={{ color: C.accent }}>{topGlobal.tech}</b> 같은 스택이 상대적으로 더 갈려요</>}
      note={O.sample_note} asOf={O.as_of} n={O.sample_size}
    >
      <ReactECharts option={option} style={{ height: 460 }} notMerge />
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 글로벌이 더 원함 (하위 8개, 위쪽)</span>
        <span><i style={{ background: DOMESTIC_COLOR }} /> 국내가 더 원함 (하위 8개, 아래쪽)</span>
        <span className="wg-legend__hint">막대 = 각 풀 내 점유율 차이(%p)</span>
      </div>
    </WidgetFrame>
  )
}
