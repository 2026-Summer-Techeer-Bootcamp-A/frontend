import ReactECharts from 'echarts-for-react'
import data from '../data/competencyData.json'
import './signalCompetency.css'

/* ================================================================
   시그니처 · 회사가 진짜 원하는 사람 (/signal/competency)
   기술 스택을 넘어 '역량·태도'와 '개념'을 실제 공고 텍스트에서 추출.
   핵심 서사 = "말 vs 진심": 전체 언급률 vs 필수 요건률의 격차.
   전부 실데이터(jumpit N=898, 어휘사전 1차 추출). 시뮬레이션 아님.
   viz = ECharts (오버레이 바 · 수요 바). 디자인 = signature-language.md.
   ================================================================ */

const BLUE = '#2f61b8'
const BLUE_ON = '#5a86cf'
const AMBER = '#d9932f'
const ON = '#f4f6fb'
const ON_MUTED = '#8b90a0'
const PBORDER = '#262a34'

type Comp = (typeof data.competency)[number]
const COMP: Comp[] = data.competency
const CONC = data.concept
const META = data._meta
const growth = COMP.find((c) => c.key === '성장·학습') ?? COMP[0]

// 정렬: 전체 언급률 desc (이미 정렬돼 있지만 방어적으로)
const comps = [...COMP].sort((a, b) => b.anyPct - a.anyPct)
const cats = comps.map((c) => c.key)

// 인사이트 파생값
const topReq = [...COMP].sort((a, b) => b.reqPct - a.reqPct).slice(0, 3)
const topGap = [...COMP]
  .map((c) => ({ ...c, gap: +(c.anyPct - c.reqPct).toFixed(1) }))
  .sort((a, b) => b.gap - a.gap)
  .slice(0, 3)

function competencyOption() {
  return {
    animationDuration: 720,
    animationEasing: 'cubicOut',
    grid: { left: 118, right: 60, top: 8, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(90,134,207,0.08)' } },
      backgroundColor: '#12141a',
      borderColor: PBORDER,
      borderWidth: 1,
      textStyle: { color: ON, fontFamily: 'Pretendard', fontSize: 12.5 },
      extraCssText: 'border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.4);',
      formatter: (ps: { dataIndex: number }[]) => {
        const c = comps[ps[0].dataIndex]
        return `<b style="font-size:13px">${c.key}</b><br/>
          <span style="color:${BLUE_ON}">●</span> 전체 언급 <b>${c.anyPct}%</b> (${c.any}건)<br/>
          <span style="color:${BLUE}">●</span> 필수 요건 <b>${c.reqPct}%</b> (${c.req}건)<br/>
          <span style="color:${AMBER}">◆</span> 우대 사항 <b>${c.prefPct}%</b> (${c.pref}건)<br/>
          <span style="color:${ON_MUTED};font-size:11px">예: ${c.ex.join(' · ')}</span>`
      },
    },
    xAxis: {
      type: 'value',
      max: 62,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: cats,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#c4c8d2', fontFamily: 'Pretendard', fontSize: 12.5, fontWeight: 600 },
    },
    series: [
      {
        name: '전체 언급',
        type: 'bar',
        data: comps.map((c) => c.anyPct),
        barWidth: 15,
        itemStyle: { color: 'rgba(90,134,207,0.20)', borderRadius: 8 },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => p.value + '%',
          color: ON_MUTED,
          fontFamily: 'Pretendard',
          fontSize: 11.5,
          fontWeight: 600,
        },
        z: 1,
      },
      {
        name: '필수 요건',
        type: 'bar',
        data: comps.map((c) => c.reqPct),
        barGap: '-100%',
        barWidth: 15,
        itemStyle: {
          borderRadius: 8,
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: BLUE },
              { offset: 1, color: BLUE_ON },
            ],
          },
        },
        label: {
          show: true,
          position: 'insideRight',
          formatter: (p: { value: number }) => (p.value >= 5 ? p.value + '%' : ''),
          color: '#fff',
          fontFamily: 'Pretendard',
          fontSize: 11,
          fontWeight: 700,
        },
        z: 2,
      },
      {
        name: '우대',
        type: 'scatter',
        data: comps.map((c) => [c.prefPct, c.key]),
        symbol: 'diamond',
        symbolSize: 9,
        itemStyle: { color: AMBER, borderColor: '#12141a', borderWidth: 1.5 },
        z: 3,
      },
    ],
  }
}

function conceptOption() {
  const rows = [...CONC].sort((a, b) => a.pct - b.pct) // 아래에서 위로 커지게
  const max = Math.max(...rows.map((r) => r.pct))
  return {
    animationDuration: 720,
    animationEasing: 'cubicOut',
    grid: { left: 118, right: 52, top: 6, bottom: 6 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(47,97,184,0.06)' } },
      backgroundColor: '#fff',
      borderColor: '#e2e5ec',
      borderWidth: 1,
      textStyle: { color: '#1c1d21', fontFamily: 'Pretendard', fontSize: 12.5 },
      extraCssText: 'border-radius:12px; box-shadow:0 8px 24px rgba(20,30,60,0.12);',
      formatter: (ps: { dataIndex: number }[]) => {
        const c = rows[ps[0].dataIndex]
        return `<b>${c.key}</b> · <b>${c.pct}%</b> (${c.n}건)<br/><span style="color:#7c7f88;font-size:11px">예: ${c.ex.join(' · ')}</span>`
      },
    },
    xAxis: { type: 'value', max: Math.ceil(max / 5) * 5, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef1f6' } } },
    yAxis: {
      type: 'category',
      data: rows.map((r) => r.key),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: 'Pretendard', fontSize: 12, fontWeight: 600 },
    },
    series: [
      {
        type: 'bar',
        data: rows.map((r) => r.pct),
        barWidth: 13,
        itemStyle: {
          borderRadius: 7,
          color: (p: { value: number }) => {
            const t = p.value / max
            // 단일 블루 명도 스케일 (안티-레인보우)
            return t > 0.8 ? BLUE : t > 0.45 ? '#4271c0' : '#7ba0dd'
          },
        },
        label: { show: true, position: 'right', formatter: (p: { value: number }) => p.value + '%', color: '#7c7f88', fontFamily: 'Pretendard', fontSize: 11.5, fontWeight: 700 },
      },
    ],
  }
}

const STEPS = [
  { n: '1', t: '어휘사전 매칭', d: '역량·개념을 대표 표현(협업·주도적·MSA…)으로 사전화 → 공고 자유텍스트에서 정규식 카운트. 빠르고 결정적·설명가능.', on: true },
  { n: '2', t: 'LLM 추출·정규화', d: '"혼자서도 끝까지 밀어붙이는" 같은 우회 표현을 LLM이 스팬 추출 → 표준 역량으로 정규화. 정밀도↑.', on: false },
  { n: '3', t: '임베딩 클러스터링', d: '표현을 임베딩→군집화해 사전에 없던 새 역량 축을 발견. 사전 자체를 키우는 단계.', on: false },
]

export default function SignalCompetency() {
  return (
    <div className="competency-stage">
      <div className="cp-canvas">
        <header className="cp-head">
          <div>
            <span className="cp-eyebrow">시그니처 · 실텍스트 추출</span>
            <h1 className="cp-title">회사가 진짜 원하는 사람</h1>
            <p className="cp-dek">
              기술 스택 너머, 공고가 요구하는 <b>역량·태도</b>를 실제 문장에서 뽑았어요.
              말로만 하는 것과 <b>필수로 못 박는 것</b>은 달라요 — 그 격차가 진심이에요.
            </p>
          </div>
          <div className="cp-source">
            <div className="cp-source__n">{META.N.toLocaleString()}</div>
            <div className="cp-source__lbl">국내 공고 실텍스트 (jumpit+wanted)<br />담당업무 · 자격요건 · 우대사항</div>
            <div className="cp-source__badge">실측 · 어휘사전 추출</div>
          </div>
        </header>

        {/* 다크 히어로 · 역량 "말 vs 진심" */}
        <section className="cp-hero">
          <div className="cp-hero__bar">
            <div className="cp-hero__title">
              역량·태도 — 말 vs 진심 <span>바 = 전체 언급률, 진한 부분 = 필수 요건률</span>
            </div>
            <div className="cp-legend">
              <span className="cp-lchip"><i className="cp-i-any" /> 전체 언급</span>
              <span className="cp-lchip"><i className="cp-i-req" /> 필수 요건</span>
              <span className="cp-lchip"><i className="cp-i-pref" /> 우대</span>
            </div>
          </div>
          <ReactECharts option={competencyOption()} style={{ height: 468 }} notMerge />
          <p className="cp-hero__note">
            {growth.key}은 <b>{growth.anyPct}%</b>가 말하지만 필수로 박는 건 <b>{growth.reqPct}%</b>뿐 — 가장 확실한 필수는
            <b style={{ color: BLUE_ON }}> {topReq[0].key}({topReq[0].reqPct}%)</b>과 <b style={{ color: BLUE_ON }}> {topReq[1].key}({topReq[1].reqPct}%)</b>이에요.
          </p>
        </section>

        {/* 하단 2열: 개념 수요 + 인사이트 */}
        <section className="cp-grid">
          <div className="cp-card cp-card--concept">
            <div className="cp-card__h">
              <div className="cp-card__t">개념·아키텍처 수요</div>
              <div className="cp-card__s">공고가 요구하는 문제의 성격 · 실측</div>
            </div>
            <ReactECharts option={conceptOption()} style={{ height: 300 }} notMerge />
          </div>

          <div className="cp-side">
            <div className="cp-card cp-insight">
              <div className="cp-insight__k">가장 확실한 필수 역량</div>
              {topReq.map((c, i) => (
                <div className="cp-insight__row" key={c.key}>
                  <span className="cp-insight__rank">{i + 1}</span>
                  <span className="cp-insight__name">{c.key}</span>
                  <span className="cp-insight__val">{c.reqPct}%</span>
                </div>
              ))}
            </div>
            <div className="cp-card cp-insight">
              <div className="cp-insight__k">말 vs 진심 · 격차 최대</div>
              {topGap.map((c) => (
                <div className="cp-insight__row" key={c.key}>
                  <span className="cp-insight__name">{c.key}</span>
                  <span className="cp-insight__gap">언급 {c.anyPct}% · 필수 {c.reqPct}%</span>
                  <span className="cp-insight__gapv">−{c.gap}%p</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 추출 방식 (How) */}
        <section className="cp-method">
          <div className="cp-method__h">
            <span className="cp-method__ey">추출 방식</span>
            어떻게 뽑았나 — 사전 → LLM → 임베딩 3단
          </div>
          <div className="cp-method__steps">
            {STEPS.map((s) => (
              <div className={'cp-step' + (s.on ? ' is-on' : '')} key={s.n}>
                <div className="cp-step__n">{s.n}</div>
                <div className="cp-step__t">{s.t}{s.on && <span className="cp-step__tag">지금 이 화면</span>}</div>
                <div className="cp-step__d">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="cp-foot">
          <span className="cp-foot__dot" />
          국내 채용공고 <b>N={META.N.toLocaleString()}</b>(jumpit+wanted, {META.asOf} 활성 스냅샷) 자유텍스트 기준 <b>doc-frequency</b>(공고 등장 비율).
          표면형 매칭이라 문맥 오탐·미탐이 일부 있어요 — 정밀도는 2단계 LLM 추출로 보강할 수 있어요.
        </footer>
      </div>
    </div>
  )
}
