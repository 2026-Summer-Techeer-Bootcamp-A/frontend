import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, tooltipStyle } from './base'
import raw from '../../data/pearl/r.json'

type Sig = { tech: string; index: number; share_pct: number; n: number }
type Industry = { name: string; n: number; signature: Sig[] }
const R = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { industries: Industry[] }
}

// 마지막 글자 받침 유무로 은/는 조사 선택
function eun_neun(word: string) {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return '는'
  return (ch - 0xac00) % 28 === 0 ? '는' : '은'
}

export default function WidgetR() {
  const inds = R.data.industries
  const [sel, setSel] = useState(inds.find((i) => i.name === '게임')?.name ?? inds[0].name)
  const ind = inds.find((i) => i.name === sel)!
  const rows = [...ind.signature].reverse()

  const option = {
    animationDuration: 600, animationEasing: 'cubicOut',
    grid: { left: 108, right: 50, top: 14, bottom: 26 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const s: Sig = rows[p.dataIndex]
        return `<b>${s.tech}</b><br/>${ind.name} 공고의 <b>${s.share_pct}%</b>가 요구 (전체 평균 대비 <b style="color:${C.gold}">${s.index}배</b>)<br/>n=${s.n}`
      },
    },
    xAxis: {
      type: 'value', name: '전체 평균 대비 배수', nameLocation: 'middle', nameGap: 24,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11 },
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5, formatter: '{value}x' },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'category', data: rows.map((r) => r.tech),
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12.5, fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        type: 'bar', barWidth: 20,
        data: rows.map((r) => ({ value: r.index, itemStyle: { color: C.gold, borderRadius: [0, 6, 6, 0] } })),
        label: {
          show: true, position: 'right', distance: 6,
          formatter: (p: any) => `${rows[p.dataIndex].index}x`,
          color: C.ink2, fontFamily: MONO, fontSize: 11.5, fontWeight: 800,
        },
        markLine: {
          silent: true, symbol: 'none', label: { show: false },
          lineStyle: { color: C.line, width: 1 },
          data: [{ xAxis: 1 }],
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 R" title="산업 스택 지문"
      headline={<>겉보기엔 다 비슷한데 — <b>{sel}</b>{eun_neun(sel)} <b style={{ color: C.gold }}>{rows[rows.length - 1].tech}</b>가 평균의 <b>{rows[rows.length - 1].index}배</b>예요</>}
      aside={
        <div className="wg-r__chips">
          {inds.map((i) => (
            <button key={i.name} className={`wg-c__chip ${sel === i.name ? 'on' : ''}`} onClick={() => setSel(i.name)}>
              {i.name}
            </button>
          ))}
        </div>
      }
      note={R.sample_note} asOf={R.as_of} n={ind.n}
    >
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
      <div className="wg-legend">
        <span className="wg-legend__hint">1배(점선) = 전체 산업 평균과 동일한 요구율. 오른쪽으로 갈수록 그 산업만의 특징 스택이에요.</span>
      </div>
    </WidgetFrame>
  )
}
