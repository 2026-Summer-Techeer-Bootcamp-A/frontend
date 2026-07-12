import { useMemo, useState } from 'react'
import {
  Sparkles, ArrowUpRight, ArrowDownRight, TrendingUp, Layers,
  FlaskConical, Info,
} from 'lucide-react'
import conceptRaw from '../data/conceptData.json'
import './signalConceptTrend.css'

/* ================= 데이터 타입 (conceptData.json 형태에 맞춰 정의) ================= */
interface ConceptTech { tech: string; w: number }
interface ConceptCooc { key: string; rate: number }
interface Concept {
  key: string
  label: string
  color: string
  demand: number
  delta: number
  me: 0 | 1 | 2
  yearly: number[]
  techs: ConceptTech[]
  cooc: ConceptCooc[]
}
interface ConceptMeta {
  simulated: boolean
  note: string
  asOf: string
  years: number[]
  N: number
  levelLegend: Record<string, string>
}
interface ConceptShape {
  _meta: ConceptMeta
  concepts: Concept[]
}
const data = conceptRaw as unknown as ConceptShape
const META = data._meta
const LEVEL = META.levelLegend

/* ================= 유틸 ================= */
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

/* 캐럿 델타 (녹/적, tabular-nums) — Signal 패밀리 패턴 재사용 */
function Delta({ v, suffix = '%p' }: { v: number; suffix?: string }) {
  const up = v >= 0
  return (
    <span className={`sct-delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? <ArrowUpRight size={13} strokeWidth={2.6} /> : <ArrowDownRight size={13} strokeWidth={2.6} />}
      <span className="sct-num">{up ? '+' : '−'}{fmt1(Math.abs(v))}{suffix}</span>
    </span>
  )
}

/* 내 경험 레벨 칩 (0 없음 / 1 부분 / 2 강함) */
function MeChip({ me }: { me: 0 | 1 | 2 }) {
  const cls = me === 2 ? 'is-strong' : me === 1 ? 'is-part' : 'is-none'
  return <span className={`sct-me ${cls}`}>{LEVEL[String(me)]}</span>
}

/* 카디널 스플라인 (Catmull-Rom → 큐빅 베지어) — SignalTrend와 동일 */
interface Pt { x: number; y: number }
function smooth(pts: Pt[], k = 0.5): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + ((p2.x - p0.x) / 6) * k * 2
    const c1y = p1.y + ((p2.y - p0.y) / 6) * k * 2
    const c2x = p2.x - ((p3.x - p1.x) / 6) * k * 2
    const c2y = p2.y - ((p3.y - p1.y) / 6) * k * 2
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

/* 미니 슬로프 스파크라인 (자기 값 정규화) */
function Slope({ yearly, tone }: { yearly: number[]; tone: 'up' | 'flat' }) {
  const w = 74
  const h = 26
  const pad = 3
  const mn = Math.min(...yearly)
  const mx = Math.max(...yearly)
  const span = mx - mn || 1
  const pts: Pt[] = yearly.map((s, i) => ({
    x: pad + (i / (yearly.length - 1)) * (w - pad * 2),
    y: h - pad - ((s - mn) / span) * (h - pad * 2),
  }))
  const end = pts[pts.length - 1]
  return (
    <svg className={`sct-slope sct-slope--${tone}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={smooth(pts)} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={end.x} cy={end.y} r="2.6" />
    </svg>
  )
}

/* ================= 스트림(멀티라인) 좌표계 ================= */
const VW = 1180
const VH = 468
const PL = 52
const PR = 132
const PT = 46
const PB = 48
const PLOT_W = VW - PL - PR
const PLOT_H = VH - PT - PB
const YMAX = 36
const BASE = PT + PLOT_H
const AI_INFLECTION = 3 // 2023 = years[3]

/* on-dark 대비용 밝은 변형 (다크 히어로에서 선/라벨 가독) */
const ON_DARK: Record<string, string> = {
  '#6b5bd6': '#8f7ff0', // AI 바이올렛
  '#0b0b0c': '#6f9bd8', // 블루
  '#2a9db0': '#4dc0d2', // 틸
  '#d9932f': '#e0a53b', // 앰버
  '#c8506a': '#d47089', // 로즈
}
const MUTE_GREY = '#4c5466'

type Tier = 'ai' | 'major' | 'minor'
function tierOf(c: Concept): Tier {
  if (c.key === 'ai') return 'ai'
  // 2026 점유율 20%+ 인 굵직한 개념은 색을 유지(단, 뮤트), 나머지는 그레이로 물러남
  return c.yearly[c.yearly.length - 1] >= 20 ? 'major' : 'minor'
}

export default function SignalConceptTrend() {
  const [focus, setFocus] = useState<string | null>(null)

  const model = useMemo(() => {
    const years = META.years
    const n = years.length
    const yearX = (i: number) => PL + (i / (n - 1)) * PLOT_W
    const shareY = (v: number) => PT + (1 - v / YMAX) * PLOT_H

    const lines = data.concepts.map((c) => {
      const tier = tierOf(c)
      const pts: Pt[] = c.yearly.map((v, i) => ({ x: yearX(i), y: shareY(v) }))
      const stroke =
        tier === 'ai' ? c.color
        : tier === 'major' ? ON_DARK[c.color] || c.color
        : MUTE_GREY
      return {
        key: c.key,
        label: c.label,
        tier,
        stroke,
        color: c.color,
        me: c.me,
        delta: c.delta,
        yearly: c.yearly,
        end: c.yearly[c.yearly.length - 1],
        pts,
        d: smooth(pts),
      }
    })

    // 그리기 순서: minor → major → ai (강조가 맨 위)
    const zrank: Record<Tier, number> = { minor: 0, major: 1, ai: 2 }
    const drawOrder = [...lines].sort((a, b) => zrank[a.tier] - zrank[b.tier])

    // 우측(2026) 라벨 충돌 회피 — y 오름차순 후 최소 간격 확보
    const labels = lines
      .map((l) => ({ key: l.key, label: l.label, tier: l.tier, stroke: l.stroke, end: l.end, y: shareY(l.end) }))
      .sort((a, b) => a.y - b.y)
    const GAP = 15
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y - labels[i - 1].y < GAP) labels[i].y = labels[i - 1].y + GAP
    }

    // AI 스택 영역 (라인 → 베이스라인 닫기)
    const ai = lines.find((l) => l.key === 'ai')!
    const aiArea = `${ai.d} L ${ai.pts[n - 1].x} ${BASE} L ${ai.pts[0].x} ${BASE} Z`
    const aiInflect = ai.pts[AI_INFLECTION]

    // 헤드라인 지표 = AI 2026 수요
    const aiEnd = ai.end
    const aiInt = Math.trunc(aiEnd)
    const aiFrac = fmt1(aiEnd).split('.')[1]

    // 뜨는 개념 (delta 내림차순) / 성숙·정체 (delta 오름차순)
    const byDeltaDesc = [...data.concepts].sort((a, b) => b.delta - a.delta)
    const risers = byDeltaDesc.slice(0, 5)
    const maturers = [...byDeltaDesc].reverse().slice(0, 4)

    return {
      years, n, lines, drawOrder, labels, yearX, shareY,
      ai, aiArea, aiInflect, aiEnd, aiInt, aiFrac,
      topRiser: byDeltaDesc[0], topMature: byDeltaDesc[byDeltaDesc.length - 1],
      risers, maturers,
    }
  }, [])

  const gridShares = [0, 10, 20, 30]
  const focusLine = model.lines.find((l) => l.key === focus) || null
  const yearsSpan = `${model.years[0]} → ${model.years[model.n - 1]}`

  return (
    <div className="signalconcept-stage">
      <div className="sct-canvas">
        {/* ============ 헤더 ============ */}
        <header className="sct-head">
          <div className="sct-head__lead">
            <div className="sct-eyebrow">
              <Sparkles size={13} strokeWidth={2.4} />
              개념 축 · 무엇을 만드는 시장인가
            </div>
            {/* ── 정직성 배지 (앰버, 눈에 띄게) ── */}
            <div className="sct-sim" role="note">
              <FlaskConical size={13} strokeWidth={2.4} />
              <span className="sct-sim__lead">시뮬레이션</span>
              <span className="sct-sim__body">개념 파서 완성 가정 · 실집계 아님</span>
            </div>
            <h1 className="sct-title">AI, 3년 만에 판을 이렇게 바꿨어요</h1>
            <p className="sct-dek">
              도구가 아니라 <b>무엇을 만드는가</b>의 축입니다. 2020→2026, 채용시장이 요구하는
              엔지니어링 개념의 부상과 성숙을 한 흐름으로 봅니다.
            </p>
          </div>

          <div className="sct-hero-metric">
            <div className="sct-hm__kicker">AI · LLM · 2026 수요</div>
            <div className="sct-hm__row">
              <div className="sct-hm__big">
                <span className="sct-num">{model.aiInt}</span>
                <span className="sct-hm__frac">.{model.aiFrac}%</span>
              </div>
              <ArrowUpRight className="sct-hm__caret" size={26} strokeWidth={2.6} />
            </div>
            <div className="sct-hm__ctx">
              <b>AI · LLM</b> · 2023 변곡점 이후 3년 만에
              <span className="sct-hm__delta"> +{Math.trunc(Math.abs(model.ai.delta))}%p</span>
            </div>
            <div className="sct-capsule" aria-hidden="true">
              <span className="sct-capsule__base" style={{ width: `${(model.ai.yearly[0] / YMAX) * 100}%` }} />
              <span className="sct-capsule__fill" style={{ width: `${(model.aiEnd / YMAX) * 100}%` }} />
            </div>
            <div className="sct-foot">
              <Info size={11} strokeWidth={2.2} />
              표본 {META.N.toLocaleString()}건 · {META.asOf} · <em>시뮬레이션</em>
            </div>
          </div>
        </header>

        {/* ============ 다크 히어로 · 스트림(멀티라인) 차트 ============ */}
        <section className="sct-hero">
          <div className="sct-hero__bar">
            <div className="sct-hero__title">
              개념 부상 곡선 <span>연도별 개념 점유율 · {yearsSpan}</span>
            </div>
            <div className="sct-seg" role="tablist" aria-label="축">
              <button className="is-active" role="tab" aria-selected="true">개념 축</button>
              <button className="is-disabled" role="tab" aria-selected="false" aria-disabled="true" disabled>
                도구 축
              </button>
            </div>
          </div>

          <div className="sct-plotwrap">
            <svg className="sct-stream" viewBox={`0 0 ${VW} ${VH}`} role="img"
              aria-label="2020부터 2026까지 엔지니어링 개념별 점유율 추이 스트림 차트">
              <defs>
                <linearGradient id="sctAiArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b5bd6" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#6b5bd6" stopOpacity="0" />
                </linearGradient>
                <filter id="sctGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4.2" />
                </filter>
              </defs>

              {/* 가로 그리드 (점선 헤어라인) */}
              {gridShares.map((g) => (
                <line key={`h${g}`} x1={PL} y1={model.shareY(g)} x2={PL + PLOT_W} y2={model.shareY(g)}
                  stroke="#22262f" strokeWidth="1" strokeDasharray="2 6" />
              ))}
              {/* y축 라벨 */}
              {gridShares.map((g) => (
                <text key={`hl${g}`} x={PL - 12} y={model.shareY(g) + 4} textAnchor="end" className="sct-axis">
                  {g}%
                </text>
              ))}
              <text x={PL - 12} y={PT - 20} textAnchor="start" className="sct-axis sct-axis--strong">
                점유율 ↑
              </text>

              {/* x축 연도 라벨 */}
              {model.years.map((y, i) => (
                <text key={`yl${y}`} x={model.yearX(i)} y={BASE + 28} textAnchor="middle"
                  className={`sct-axis sct-axis--year ${i === AI_INFLECTION ? 'is-mark' : ''}`}>
                  {y}
                </text>
              ))}

              {/* 2023 AI 변곡점 마커 */}
              <line x1={model.yearX(AI_INFLECTION)} y1={PT - 6} x2={model.yearX(AI_INFLECTION)} y2={BASE + 8}
                className="sct-inflect" />
              <g transform={`translate(${model.yearX(AI_INFLECTION)}, ${PT - 10})`} className="sct-inflect__tag">
                <rect x={-52} y={-20} width="104" height="22" rx="11" fill="#1b1730" stroke="#4b3fa0" />
                <text x={0} y={-5} textAnchor="middle" className="sct-inflect__t">AI 변곡점 · 2023</text>
              </g>

              {/* AI 스택 영역 (서지 강조) */}
              <path d={model.aiArea} fill="url(#sctAiArea)"
                className={`sct-aiarea ${focus && focus !== 'ai' ? 'is-dim' : ''}`} />

              {/* 라인들 (minor → major → ai) */}
              {model.drawOrder.map((l, i) => {
                const dim = focus && focus !== l.key
                const isAi = l.tier === 'ai'
                return (
                  <g key={l.key}
                    className={`sct-lineg sct-lineg--${l.tier} ${dim ? 'is-dim' : ''} ${focus === l.key ? 'is-focus' : ''}`}
                    onMouseEnter={() => setFocus(l.key)}
                    onMouseLeave={() => setFocus(null)}>
                    <path d={l.d} className="sct-hit" fill="none" />
                    {isAi && <path d={l.d} className="sct-glow" fill="none" stroke={l.color} filter="url(#sctGlow)" />}
                    <path d={l.d} className="sct-line" fill="none" stroke={l.stroke} pathLength={1}
                      style={{ animationDelay: `${120 + i * 55}ms` }} />
                  </g>
                )
              })}

              {/* AI 2023 변곡점 노드 */}
              <circle cx={model.aiInflect.x} cy={model.aiInflect.y} r="4.5"
                className="sct-inflect__dot" fill="#6b5bd6" stroke="#eef3fb" strokeWidth="1.6" />

              {/* 우측(2026) 다이렉트 라벨 */}
              {model.labels.map((lb) => (
                <text key={`rl${lb.key}`} x={PL + PLOT_W + 12} y={lb.y + 4} textAnchor="start"
                  className={`sct-endlbl sct-endlbl--${lb.tier} ${focus && focus !== lb.key ? 'is-dim' : ''}`}
                  fill={lb.stroke}>
                  {lb.label} <tspan className="sct-endlbl__sh">{fmt1(lb.end)}%</tspan>
                </text>
              ))}

              {/* 단일 포커스 값 pill (연도별 경로) */}
              {focusLine && (
                <g className="sct-vpill" pointerEvents="none">
                  <rect x={PL + 8} y={PT + 2} width="452" height="42" rx="10" fill="#191c24" stroke="#2c313d" />
                  <text x={PL + 22} y={PT + 19} className="sct-vpill__name">{focusLine.label}</text>
                  <text x={PL + 22} y={PT + 35} className="sct-vpill__meta">
                    {model.years.map((y, i) => `${String(y).slice(2)} ${fmt1(focusLine.yearly[i])}%`).join('   ·   ')}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* 범례 */}
          <div className="sct-legend">
            <span className="sct-chip sct-chip--ai"><i />AI · LLM (변곡점)</span>
            <span className="sct-chip sct-chip--major"><i />주요 개념</span>
            <span className="sct-chip sct-chip--minor"><i />그 외 개념</span>
            <span className="sct-legend__spacer" />
            <span className="sct-legend__span">{yearsSpan} · 개념 점유율</span>
          </div>
        </section>

        {/* ============ 하단 라이트 카드 2-up ============ */}
        <div className="sct-cards">
          <article className="sct-card">
            <div className="sct-card__head">
              <div className="sct-card__ic sct-card__ic--rise"><TrendingUp size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="sct-card__title">뜨는 개념</div>
                <div className="sct-card__sub">3년 점유율 증가폭 상위</div>
              </div>
            </div>
            <ul className="sct-rows">
              {model.risers.map((c) => (
                <li key={c.key} className="sct-row">
                  <span className="sct-row__name">
                    {c.label}
                    <MeChip me={c.me} />
                  </span>
                  <Slope yearly={c.yearly} tone="up" />
                  <span className="sct-row__now sct-num">{fmt1(c.yearly[c.yearly.length - 1])}%</span>
                  <span className="sct-row__delta"><Delta v={c.delta} /></span>
                </li>
              ))}
            </ul>
          </article>

          <article className="sct-card">
            <div className="sct-card__head">
              <div className="sct-card__ic sct-card__ic--mature"><Layers size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="sct-card__title">성숙·정체 개념</div>
                <div className="sct-card__sub">이미 자리 잡아 증가폭이 완만</div>
              </div>
            </div>
            <ul className="sct-rows">
              {model.maturers.map((c) => (
                <li key={c.key} className="sct-row">
                  <span className="sct-row__name">
                    {c.label}
                    <MeChip me={c.me} />
                  </span>
                  <Slope yearly={c.yearly} tone="flat" />
                  <span className="sct-row__now sct-num">{fmt1(c.yearly[c.yearly.length - 1])}%</span>
                  <span className="sct-row__delta"><Delta v={c.delta} /></span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </div>
  )
}
