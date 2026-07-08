import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, RESUME, tooltipStyle } from './base'
import raw from '../../data/pearl/g.json'

type Gen = { key: string; label: string; n: number }
type Row = { tech: string; shares: number[]; trend: number }
const G = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { generations: Gen[]; matrix: Row[] }
}

export default function WidgetG() {
  const D = G.data
  const owned = (t: string) => RESUME.includes(t)

  const affinity = useMemo(() => {
    const mine = D.matrix.filter((m) => owned(m.tech))
    const base = mine.length ? mine : D.matrix
    const sums = [0, 1, 2].map((g) => base.reduce((a, m) => a + m.shares[g], 0) / base.length)
    const tot = sums.reduce((a, b) => a + b, 0) || 1
    return sums.map((s) => Math.round((s / tot) * 100))
  }, [])
  const domIdx = affinity.indexOf(Math.max(...affinity))

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 44, right: 116, top: 16, bottom: 40 },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: any) => {
        const m = D.matrix.find((x) => x.tech === p.seriesName)!
        return `<b>${m.tech}</b> ${owned(m.tech) ? `<span style="color:${C.accent}">· 보유</span>` : ''}<br/>
          ${D.generations.map((g, i) => `${g.label.replace('\n', ' ')} <b>${m.shares[i]}%</b>`).join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category', boundaryGap: false,
      data: D.generations.map((g) => g.label),
      axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false },
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 15 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: C.muted, fontFamily: FONT, fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: C.line2 } }, axisLine: { show: false },
    },
    series: D.matrix.map((m) => {
      const rising = m.trend >= 0
      const col = rising ? C.accent : C.danger
      const isMine = owned(m.tech)
      return {
        name: m.tech, type: 'line', data: m.shares, smooth: false,
        symbol: 'circle', symbolSize: isMine ? 9 : 6,
        lineStyle: { color: col, width: isMine ? 3 : 1.6, opacity: isMine ? 1 : 0.55 },
        itemStyle: { color: col, borderColor: '#fff', borderWidth: 1.5, opacity: isMine ? 1 : 0.55 },
        emphasis: { focus: 'series', lineStyle: { width: 3.5 } },
        endLabel: {
          show: true, formatter: `${m.tech}  ${m.trend > 0 ? '+' : ''}${m.trend}`,
          color: col, fontFamily: MONO, fontSize: 11, fontWeight: 700, distance: 8,
        },
        z: isMine ? 5 : 2,
      }
    }),
  }

  const genShort = ['레거시', '성장기', '신생']
  return (
    <WidgetFrame
      tag="후보 G" title="회사 세대론"
      headline={<>스택은 회사의 <b>나이</b>를 말해줘요 — 신생 회사의 <b style={{ color: C.accent }}>20%</b>가 TypeScript를 써요</>}
      note={G.sample_note} asOf={G.as_of} n={G.sample_size}
    >
      <div className="wg-g">
        <div className="wg-g__chart">
          <ReactECharts option={option} style={{ height: 380 }} notMerge />
          <div className="wg-legend">
            <span><i style={{ background: C.accent }} /> 신생일수록 상승</span>
            <span><i style={{ background: C.danger }} /> 신생일수록 하락</span>
            <span><i style={{ background: C.accent, boxShadow: '0 0 0 2px #dde8f9' }} /> 굵은 선 = 내 보유</span>
          </div>
        </div>
        <div className="wg-g__panel">
          <div className="wg-g__ptitle">내 스택의 세대 성향</div>
          {[2, 1, 0].map((gi) => (
            <div key={gi} className={`wg-g__bar ${gi === domIdx ? 'dom' : ''}`}>
              <span className="wg-g__blabel">{genShort[gi]}</span>
              <div className="wg-g__track"><i style={{ width: `${affinity[gi]}%` }} /></div>
              <b className="tnum">{affinity[gi]}%</b>
            </div>
          ))}
          <p className="wg-g__verdict">
            당신 스택은 <b style={{ color: C.accent }}>{genShort[domIdx]} 회사</b> 체질이에요
          </p>
        </div>
      </div>
    </WidgetFrame>
  )
}
