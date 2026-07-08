import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, RESUME, tooltipStyle } from './base'
import raw from '../../data/pearl/y2.json'

type Missing = { tech: string; pct: number }
type Target = { name: string; kind: string; coverage: number; missing: Missing[]; n: number }
const Y = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { targets: Target[]; resume: string[] }
}

export default function WidgetY2() {
  const targets = [...Y.data.targets].sort((a, b) => a.coverage - b.coverage) // 오름차순 → 위쪽이 최고
  const top = Y.data.targets[0]
  const roleColor = (k: string) => (k === 'role' ? C.accent : C.gold)

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 108, right: 54, top: 12, bottom: 26 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const t = targets[p.dataIndex]
        const miss = t.missing.map((m) => `${m.tech} ${m.pct}%`).join(' · ')
        return `<b>${t.name}</b> <span style="color:${C.muted}">· ${t.kind === 'role' ? '직군' : '산업'} N=${t.n.toLocaleString()}</span><br/>내 커버리지 <b style="color:${roleColor(t.kind)}">${t.coverage}%</b><br/>부족: ${miss || '없음'}`
      },
    },
    xAxis: {
      type: 'value', max: 100,
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5, formatter: '{value}%' },
      axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'category', data: targets.map((t) => t.name),
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12, fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        type: 'bar', barWidth: 16,
        data: targets.map((t) => ({ value: t.coverage, itemStyle: { color: roleColor(t.kind), borderRadius: [0, 5, 5, 0] } })),
        label: {
          show: true, position: 'right', distance: 6,
          formatter: (p: any) => targets[p.dataIndex].coverage + '%',
          color: C.ink2, fontFamily: MONO, fontSize: 11, fontWeight: 800,
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 Y2" title="전직 가능성 지도 — 내 스택은 어디로"
      headline={<>내 스택은 <b style={{ color: C.gold }}>{top.name}</b>에 <b>{top.coverage}%</b> 맞아요 — 지금 직무 말고도 갈 수 있는 곳이 보여요</>}
      note={Y.sample_note} asOf={Y.as_of} n={Y.sample_size}
    >
      <ReactECharts option={option} style={{ height: 380 }} notMerge />
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 직군</span>
        <span><i style={{ background: C.gold }} /> 산업</span>
        <span className="wg-legend__hint">그 직군/산업 요구스택 상위 15개를 내 이력서({RESUME.length}개)가 얼마나 커버하는지 · 막대에 올리면 부족 기술이 나와요</span>
      </div>
    </WidgetFrame>
  )
}
