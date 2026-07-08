import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, RESUME, tooltipStyle } from './base'
import raw from '../../data/pearl/y1.json'

type Step = { step: number; tech: string; category: string; matched_after: number; delta: number; freq_pct: number }
const Y = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { start_matched: number; total: number; threshold: number; steps: Step[]; resume: string[] }
}

const CAT_KO: Record<string, string> = {
  language: '언어', frontend: '프론트', backend: '백엔드', data_db: '데이터·DB',
  cloud_services: '클라우드', devops: '데브옵스', ai_llm: 'AI/LLM', mobile: '모바일',
}

export default function WidgetY1() {
  const D = Y.data
  const startPct = Math.round((D.start_matched / D.total) * 100)
  const finalMatched = D.steps.length ? D.steps[D.steps.length - 1].matched_after : D.start_matched
  const finalPct = Math.round((finalMatched / D.total) * 100)

  // 누적 계단: 현재 → +1 → +2 ...
  const cats = ['지금', ...D.steps.map((s) => `+${s.tech}`)]
  const cumulative = [D.start_matched, ...D.steps.map((s) => s.matched_after)]

  const option = {
    animationDuration: 800, animationEasing: 'cubicOut',
    grid: { left: 96, right: 64, top: 12, bottom: 26 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        if (p.dataIndex === 0) return `<b>지금</b><br/>도달 공고 ${D.start_matched.toLocaleString()}개 (${startPct}%)`
        const s = D.steps[p.dataIndex - 1]
        return `<b>+${s.tech}</b> <span style="color:${C.muted}">· ${CAT_KO[s.category] ?? s.category}</span><br/>도달 <b>${s.matched_after.toLocaleString()}개</b> (<b style="color:${C.accent}">+${s.delta.toLocaleString()}</b>)<br/>시장 요구율 ${s.freq_pct}%`
      },
    },
    xAxis: {
      type: 'value', name: '도달 공고 수', nameLocation: 'middle', nameGap: 24,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11 },
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5 },
      axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'category', data: cats,
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12.5, fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        type: 'bar', barWidth: 20,
        data: cumulative.map((v, i) => ({
          value: v,
          itemStyle: { color: i === 0 ? C.neutral300 : C.accent, borderRadius: [0, 6, 6, 0] },
        })),
        label: {
          show: true, position: 'right', distance: 8,
          formatter: (p: any) => (p.dataIndex === 0 ? `${p.value.toLocaleString()}` : `+${D.steps[p.dataIndex - 1].delta.toLocaleString()}`),
          color: (p: any) => (p.dataIndex === 0 ? C.muted : C.accent700),
          fontFamily: MONO, fontSize: 11, fontWeight: 800,
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 Y1" title="학습 로드맵 — 뭘 순서대로 배울까"
      headline={<>이 순서로 <b>5개</b>만 배우면 지원 가능 공고가 <b>{startPct}%</b> → <b style={{ color: C.accent }}>{finalPct}%</b>로 뛰어요</>}
      note={Y.sample_note} asOf={Y.as_of} n={Y.sample_size}
    >
      <div className="wg-c__howto">
        <div className="wg-c__howtitle">이 순서, 이렇게 뽑았어요</div>
        <ol className="wg-c__steps">
          <li><b>① 도달 공고</b> = 그 공고 요구기술의 <b>{D.threshold}% 이상</b>을 내가 가진 공고. 지금 내 8개 스킬로는 {D.start_matched.toLocaleString()}개({startPct}%)에 도달해요.</li>
          <li><b>② 그리디 최적화.</b> 빈도순이 아니라 <b>"추가했을 때 도달 공고가 가장 많이 느는" 기술</b>을 매 단계 골라요. 이미 커버되는 공고는 빼고 계산하니, 2순위는 빈도 2위가 아니라 "새 공고를 가장 많이 여는" 기술이에요.</li>
          <li><b>③</b> 그래서 단순 "많이 요구되는 기술 5개"와 다른 순서가 나와요 — 겹치는 걸 피한 실제 최단 경로예요.</li>
        </ol>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
      <div className="wg-legend">
        <span className="wg-legend__hint">내 기술: {RESUME.join(' · ')}</span>
      </div>
    </WidgetFrame>
  )
}
