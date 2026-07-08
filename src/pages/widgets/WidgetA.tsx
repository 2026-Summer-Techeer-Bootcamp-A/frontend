import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, tooltipStyle } from './base'
import raw from '../../data/pearl/a.json'

type S = {
  tech: string; i_pct: number; d_pct: number; i_now: number; d_now: number
  n: number; owned: boolean; cat: string; tail: number[]
}
type LL = { tech: string; lag_q: number; corr: number }
const A = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { quarters: string[]; series: S[]; pearls: S[]; leadlag: LL[] }
}

const CAT_COLOR: Record<string, string> = { 진주: C.gold, 과열: C.danger, 주류: C.accent, 변방: C.neutral300 }
// 데이터 파일(a.json)의 내부 분류값은 '진주'를 그대로 쓰지만, 화면 표시는 '기회'로 통일
const CAT_LABEL: Record<string, string> = { 진주: '기회', 과열: '과열', 주류: '주류', 변방: '변방' }

export default function WidgetA() {
  const [reveal, setReveal] = useState(0) // 0=전체, 1=기회만 강조
  const S = A.data.series

  const dot = (s: S) => {
    const dim = reveal === 1 && s.cat !== '진주'
    const base = s.owned ? C.accent : CAT_COLOR[s.cat]
    return {
      value: [s.i_pct, s.d_pct], s,
      symbolSize: 12 + Math.log10(s.n) * 5,
      itemStyle: {
        color: base, opacity: dim ? 0.18 : 0.9,
        borderColor: s.cat === '진주' ? C.gold : s.owned ? C.accent700 : '#fff',
        borderWidth: s.cat === '진주' ? 2.5 : 1.5,
        shadowBlur: s.cat === '진주' && !dim ? 10 : 0, shadowColor: 'rgba(184,137,43,0.5)',
      },
      label: {
        show: !dim, position: 'right' as const, distance: 6, formatter: s.tech,
        color: C.ink2, fontFamily: FONT, fontSize: 10.5, fontWeight: 700,
      },
    }
  }

  const option = {
    animationDuration: 800, animationEasing: 'cubicOut',
    grid: { left: 58, right: 100, top: 24, bottom: 48 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const s: S = p.data.s
        return `<b>${s.tech}</b> <span style="color:${CAT_COLOR[s.cat]}">· ${CAT_LABEL[s.cat]}</span><br/>
          개발자 관심(HN) <b>${s.i_now}%</b> · 상위 ${100 - s.i_pct}%<br/>
          채용 수요 <b>${s.d_now}%</b> · 상위 ${100 - s.d_pct}%<br/>공고 ${s.n.toLocaleString()}건`
      },
    },
    xAxis: {
      type: 'value', min: 0, max: 100, name: '개발자 관심 (HN) →', nameLocation: 'middle', nameGap: 30,
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
        type: 'scatter', data: S.map(dot),
        markLine: {
          silent: true, symbol: 'none', label: { show: false },
          lineStyle: { color: C.neutral300, width: 1, type: 'dashed' },
          data: [{ xAxis: 50 }, { yAxis: 50 }],
        },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(184,137,43,0.05)' },
          data: [[{ xAxis: 0, yAxis: 50 }, { xAxis: 50, yAxis: 100 }]], // 기회 사분면
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 A · 킬링" title="Hype vs Hire — 관심 × 수요" scopeBadge="글로벌 전용 · HN 커뮤니티 기준"
      headline={<>개발자가 떠드는 기술과 회사가 뽑는 기술은 달라요 — 좌상단이 <b style={{ color: C.gold }}>숨은 기회</b>예요</>}
      aside={
        <div className="ds-seg wg-seg">
          <button className={reveal === 0 ? 'on' : ''} onClick={() => setReveal(0)}>전체</button>
          <button className={reveal === 1 ? 'on' : ''} onClick={() => setReveal(1)}>기회만</button>
        </div>
      }
      note={A.sample_note} asOf={A.as_of} n={A.sample_size}
    >
      <div className="wg-a">
        <div className="wg-a__chart">
          <ReactECharts option={option} style={{ height: 420 }} notMerge />
          <div className="wg-a__quads">
            <span className="q tl">💎 기회 · 저관심 고수요</span>
            <span className="q tr">주류</span>
            <span className="q bl">변방</span>
            <span className="q br">🔥 과열 · 고관심 저수요</span>
          </div>
        </div>
        <div className="wg-a__side">
          <div className="wg-a__ptitle">기회 사분면 <span>저평가·저경쟁</span></div>
          {A.data.pearls.map((p) => (
            <div key={p.tech} className="wg-a__pearl">
              <b>{p.tech}</b>
              <span>수요 상위 {100 - p.d_pct}% · 관심 하위 {p.i_pct}%</span>
            </div>
          ))}
          <div className="wg-a__lltitle">관심이 먼저, 채용이 뒤따라와요</div>
          {A.data.leadlag.map((l) => (
            <div key={l.tech} className="wg-a__ll">
              <b>{l.tech}</b>
              <span className="wg-a__lag">+{l.lag_q}분기 시차</span>
              <span className="wg-a__corr">r={l.corr}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="wg-legend">
        <span><i style={{ background: C.gold }} /> 기회(저관심·고수요)</span>
        <span><i style={{ background: C.danger }} /> 과열(고관심·저수요)</span>
        <span><i style={{ background: C.accent }} /> 주류·보유</span>
        <span className="wg-legend__hint">점 크기 = 전체 공고 수</span>
      </div>
    </WidgetFrame>
  )
}
