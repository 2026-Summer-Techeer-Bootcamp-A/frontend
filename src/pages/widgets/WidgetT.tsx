import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, tooltipStyle } from './base'
import raw from '../../data/pearl/t.json'

type Lang = {
  lang: string; repo_n: number; fork_ratio: number; issue_per_1k_star: number
  median_days_since_push: number | null; job_demand_pct: number | null; in_taxonomy: boolean
}
const T = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { languages: Lang[] }
}

export default function WidgetT() {
  const rows = [...T.data.languages].reverse()
  const top = T.data.languages[0]

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 96, right: 16, top: 14, bottom: 26 },
    tooltip: {
      ...tooltipStyle, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => {
        const l: Lang = rows[ps[0].dataIndex]
        const demand = l.job_demand_pct != null ? `${l.job_demand_pct}%` : '비교 불가(taxonomy 미포함)'
        return `<b>${l.lang}</b> · 저장소 ${l.repo_n}개<br/>포크/스타 비율 <b style="color:${C.accent}">${l.fork_ratio}%</b><br/>최근 push 중위 <b>${l.median_days_since_push}일 전</b><br/>채용 수요 ${demand}`
      },
    },
    xAxis: {
      type: 'value', name: '포크/스타 비율(%)', nameLocation: 'middle', nameGap: 24,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11 },
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5, formatter: '{value}%' },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'category', data: rows.map((r) => r.lang),
      axisLabel: { color: C.ink2, fontFamily: FONT, fontSize: 12, fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        type: 'bar', barWidth: 15,
        data: rows.map((r) => ({
          value: r.fork_ratio,
          itemStyle: { color: r.job_demand_pct == null ? C.neutral300 : C.accent, borderRadius: [0, 5, 5, 0] },
        })),
        label: {
          show: true, position: 'right', distance: 6,
          formatter: (p: any) => rows[p.dataIndex].fork_ratio + '%',
          color: C.ink2, fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 T" title="GitHub 생태계 활력 지수"
      headline={<><b>{top.lang}</b>의 포크/스타 비율이 <b style={{ color: C.accent }}>{top.fork_ratio}%</b>로 가장 높아요 — 스타는 감탄, 포크는 진짜 가져다 쓴다는 뜻이에요</>}
      note={T.sample_note} asOf={T.as_of} n={T.sample_size}
    >
      <div className="wg-c__howto">
        <div className="wg-c__howtitle">이 지표, 이렇게 만들었어요</div>
        <ol className="wg-c__steps">
          <li><b>포크/스타 비율</b> = 그 언어 저장소들의 (전체 포크 수 ÷ 전체 스타 수) × 100. 스타는 "관심 표시"고 포크는 "내 코드베이스로 가져가 쓰겠다"는 행동이라, 비율이 높을수록 실사용 강도가 세다고 봐요.</li>
          <li>GitHub 일별 스냅샷 2,056개 저장소의 <b>language</b> 필드를 그대로 썼어요 — repo 하나하나를 수동으로 매핑할 필요가 없어요.</li>
          <li>표본 20개 미만인 언어(HCL·Scala·Lua 등)는 우연 노이즈로 보고 뺐어요.</li>
        </ol>
      </div>
      <ReactECharts option={option} style={{ height: 420 }} notMerge />
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 채용 수요 비교 가능</span>
        <span><i style={{ background: C.neutral300 }} /> taxonomy 미포함(Go·Rust·Swift·C 등) — 채용수요 비교 불가</span>
      </div>
    </WidgetFrame>
  )
}
