import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Waypoints, Check, Star, GraduationCap, FlaskConical } from 'lucide-react'
import conceptRaw from '../data/conceptReal.json'
import './signalConceptBridge.css'

/* ================================================================
   시그니처 · 개념이 요구하는 기술 (/signal/concept-bridge) — 실측 재설계
   기존 9×40 히트매트릭스(한눈에 안 읽힘)를 폐기하고:
     ① 다크 히어로 = ECharts 수요×커버리지 스캐터(우선순위 갭 한눈에)
     ② 개념 카드 9장 = 각 개념이 요구하는 시그니처 스택 + 내 커버리지(스캔 가능)
   데이터: conceptReal.json (jumpit+wanted 실추출, 개념×기술 lift). 시뮬 아님.
   viz = ECharts. 디자인 = signature-language.md.
   ================================================================ */

const ON = '#f4f6fb'
const ON_MUTED = '#8b90a0'
const PBORDER = '#262a34'

type Tech = { tech: string; n: number; rate: number; lift: number; owned: boolean }
type Concept = {
  key: string; label: string; color: string; demand: number; n: number
  coverage: { covPct: number; ownedCount: number; techCount: number; ownedNames: string[] }
  techs: Tech[]; signature: Tech[]; cooc: { key: string; rate: number }[]
}
const DATA = conceptRaw as unknown as {
  _meta: { simulated: boolean; N: number; source: string; asOf: string; note: string; limits: string; owned: string[] }
  concepts: Concept[]
}
const META = DATA._meta
const CONCEPTS = DATA.concepts

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function SignalConceptBridge() {
  const model = useMemo(() => {
    const medDemand = median(CONCEPTS.map((c) => c.demand))
    const medCov = median(CONCEPTS.map((c) => c.coverage.covPct))
    // 우선순위 갭: 수요 높고 커버리지 낮은 개념
    const priority = [...CONCEPTS]
      .filter((c) => c.demand >= medDemand && c.coverage.covPct <= medCov)
      .sort((a, b) => b.demand - a.demand)
    // 배우면 여러 개념 열리는 미보유 기술 (개념 수요 가중)
    const unlock = new Map<string, { tech: string; weight: number; concepts: string[] }>()
    for (const c of CONCEPTS) {
      for (const t of c.techs) {
        if (t.owned) continue
        const e = unlock.get(t.tech) ?? { tech: t.tech, weight: 0, concepts: [] }
        e.weight += (t.rate / 100) * c.demand
        e.concepts.push(c.key)
        unlock.set(t.tech, e)
      }
    }
    const unlockTop = [...unlock.values()].sort((a, b) => b.weight - a.weight).slice(0, 6)
    // 카드 정렬 = 긴급도(수요 × 갭). 중요한 것부터 눈에 들어오게.
    const ordered = [...CONCEPTS].sort(
      (a, b) => b.demand * (100 - b.coverage.covPct) - a.demand * (100 - a.coverage.covPct),
    )
    return { medDemand, medCov, priority, unlockTop, ordered }
  }, [])

  const [focus, setFocus] = useState<string>(model.priority[0]?.key ?? CONCEPTS[0].key)

  const scatterOption = useMemo(() => {
    return {
      animationDuration: 700,
      grid: { left: 56, right: 26, top: 20, bottom: 44 },
      tooltip: {
        backgroundColor: '#12141a', borderColor: PBORDER, borderWidth: 1,
        textStyle: { color: ON, fontFamily: 'Pretendard', fontSize: 12.5 },
        extraCssText: 'border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.4);',
        formatter: (p: { data: { c: Concept } }) => {
          const c = p.data.c
          return `<b>${c.label}</b> · 공고 ${c.n.toLocaleString()}건<br/>
            수요 <b>${c.demand}%</b> · 내 커버리지 <b>${c.coverage.covPct}%</b> (${c.coverage.ownedCount}/${c.coverage.techCount})<br/>
            <span style="color:${ON_MUTED};font-size:11px">시그니처: ${c.signature.slice(0, 3).map((t) => t.tech).join(' · ')}</span>`
        },
      },
      xAxis: {
        type: 'value', name: '수요 (공고 요구율) →', nameLocation: 'middle', nameGap: 28,
        nameTextStyle: { color: ON_MUTED, fontFamily: 'Pretendard', fontSize: 11.5, fontWeight: 700 },
        min: 0, max: Math.ceil(Math.max(...CONCEPTS.map((c) => c.demand)) / 10) * 10 + 4,
        axisLabel: { color: '#6a7180', fontFamily: 'Pretendard', fontSize: 11, formatter: '{value}%' },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      yAxis: {
        type: 'value', name: '↑ 내 커버리지', nameLocation: 'middle', nameGap: 38,
        nameTextStyle: { color: ON_MUTED, fontFamily: 'Pretendard', fontSize: 11.5, fontWeight: 700 },
        min: 30, max: 90,
        axisLabel: { color: '#6a7180', fontFamily: 'Pretendard', fontSize: 11, formatter: '{value}%' },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (_val: number[], p: { data: { c: Concept } }) => 16 + Math.sqrt(p.data.c.n) * 0.9,
          data: CONCEPTS.map((c) => ({
            value: [c.demand, c.coverage.covPct],
            c,
            itemStyle: {
              color: c.color,
              opacity: c.key === focus ? 1 : 0.82,
              borderColor: c.key === focus ? '#fff' : c.color,
              borderWidth: c.key === focus ? 2 : 0,
              shadowBlur: c.key === focus ? 14 : 0,
              shadowColor: c.color,
            },
            label: {
              show: true, position: 'right' as const, distance: 7,
              formatter: (pp: { data: { c: Concept } }) => pp.data.c.label,
              color: '#c4c8d2', fontFamily: 'Pretendard', fontSize: 11, fontWeight: 700,
            },
          })),
          markLine: {
            silent: true, symbol: 'none', label: { show: false },
            lineStyle: { color: 'rgba(255,255,255,0.14)', type: 'dashed' },
            data: [{ xAxis: model.medDemand }, { yAxis: model.medCov }],
          },
          markArea: {
            silent: true,
            itemStyle: { color: 'rgba(216,147,47,0.07)' },
            data: [[{ xAxis: model.medDemand, yAxis: 30 }, { xAxis: 'max', yAxis: model.medCov }]],
          },
        },
      ],
    }
  }, [focus, model])

  return (
    <div className="cb-stage">
      <div className="cb-canvas">
        <header className="cb-head">
          <div>
            <span className="cb-eyebrow"><Waypoints size={13} strokeWidth={2.4} /> 개념 축 · 이 문제를 풀려면 이 스택</span>
            <h1 className="cb-title">개념이 요구하는 기술</h1>
            <p className="cb-dek">
              어떤 엔지니어링 문제를 원하는 공고가 어떤 스택을 요구하는지 — 실제 공고 텍스트에서 뽑았어요.
              <b> 수요는 높은데 내 커버리지가 낮은 개념</b>이 우선순위예요.
            </p>
          </div>
          <div className="cb-metric">
            <div className="cb-metric__n">{CONCEPTS.length}<span>개념</span></div>
            <div className="cb-metric__lbl">× 실측 시그니처 스택</div>
            <div className="cb-metric__badge">실측 · lift 기반 · N={META.N.toLocaleString()}</div>
          </div>
        </header>

        {/* 다크 히어로 · 수요 × 커버리지 스캐터 */}
        <section className="cb-hero">
          <div className="cb-hero__bar">
            <div className="cb-hero__title">우선순위 지도 <span>버블 = 공고 수 · 우하단(수요↑ 커버↓)이 배워야 할 개념</span></div>
            <div className="cb-hero__hint">점 클릭 = 아래 카드 강조</div>
          </div>
          <ReactECharts
            option={scatterOption}
            style={{ height: 340 }}
            notMerge
            onEvents={{ click: (p: { data?: { c?: Concept } }) => p.data?.c && setFocus(p.data.c.key) }}
          />
        </section>

        {/* 개념 카드 9장 */}
        <section className="cb-cards">
          {model.ordered.map((c) => {
            const sigSet = new Set(c.signature.slice(0, 3).map((t) => t.tech))
            const isFocus = c.key === focus
            const isPriority = model.priority.some((p) => p.key === c.key)
            return (
              <article
                key={c.key}
                className={'cb-card' + (isFocus ? ' is-focus' : '')}
                style={{ ['--c' as string]: c.color }}
                onMouseEnter={() => setFocus(c.key)}
              >
                <div className="cb-card__top">
                  <span className="cb-card__dot" />
                  <span className="cb-card__name">{c.label}</span>
                  {isPriority && <span className="cb-card__pri">갭</span>}
                  <span className="cb-card__demand">{c.demand}<i>%</i></span>
                </div>
                <div className="cb-card__sub">공고 {c.n.toLocaleString()}건이 이 문제를 요구</div>

                <div className="cb-chips">
                  {c.techs.slice(0, 4).map((t) => (
                    <span key={t.tech} className={'cb-chip' + (t.owned ? ' is-owned' : '')}>
                      {t.owned && <Check size={11} strokeWidth={3} />}
                      {sigSet.has(t.tech) && !t.owned && <Star size={10} strokeWidth={2.5} className="cb-chip__star" />}
                      {t.tech}
                      <b>{t.rate}%</b>
                    </span>
                  ))}
                </div>

                <div className="cb-cov">
                  <div className="cb-cov__bar">
                    <span className="cb-cov__fill" style={{ width: `${c.coverage.covPct}%` }} />
                  </div>
                  <div className="cb-cov__lbl">
                    내 커버 <b>{c.coverage.covPct}%</b>
                    <span>· {c.coverage.ownedCount}/{c.coverage.techCount} 보유</span>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        {/* 배우면 열리는 기술 */}
        <section className="cb-unlock">
          <div className="cb-unlock__h">
            <GraduationCap size={16} strokeWidth={2.2} />
            다음에 배우면 여러 개념이 한번에 열리는 기술 <span>미보유 · 개념 수요 가중</span>
          </div>
          <div className="cb-unlock__row">
            {model.unlockTop.map((t) => (
              <div key={t.tech} className="cb-unlock__item">
                <span className="cb-unlock__tech">{t.tech}</span>
                <span className="cb-unlock__cnt">{t.concepts.length}개념</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="cb-foot">
          <FlaskConical size={12} strokeWidth={2.2} />
          <span>
            실측 · 국내 공고 <b>N={META.N.toLocaleString()}</b>({META.source}, {META.asOf}). rate = 그 개념 공고 중 해당 기술
            동시 등장 비율, ★ = 그 개념에서 특히 두드러지는 시그니처(lift). 표면형 매칭이라 문맥 오탐·미탐 일부 있어요.
          </span>
        </footer>
      </div>
    </div>
  )
}
