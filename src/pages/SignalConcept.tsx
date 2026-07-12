import { useMemo, useState } from 'react'
import {
  Brain, ArrowUpRight, ArrowDownRight, Target, Award, Radar, Info, AlertTriangle,
} from 'lucide-react'
import conceptRaw from '../data/conceptData.json'
import './signalConcept.css'

/* ---------- 데이터 타입 (conceptData.json 형태에 맞춰 정의) ---------- */
type Level = 0 | 1 | 2
interface ConceptTech { tech: string; w: number }
interface ConceptCooc { key: string; rate: number }
interface Concept {
  key: string
  label: string
  color: string
  demand: number
  delta: number
  me: Level
  yearly: number[]
  techs: ConceptTech[]
  cooc: ConceptCooc[]
}
interface ConceptMeta {
  simulated: boolean
  note: string
  asOf: string
  N: number
  years: number[]
  levelLegend: Record<string, string>
}
interface ConceptShape {
  _meta: ConceptMeta
  concepts: Concept[]
}
const conceptData = conceptRaw as unknown as ConceptShape

/* ---------- 유틸 ---------- */
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

/* 캐럿 델타 (녹/적, tabular-nums) */
function Delta({ v, suffix = '%p' }: { v: number; suffix?: string }) {
  const up = v >= 0
  return (
    <span className={`scm-delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? <ArrowUpRight size={13} strokeWidth={2.6} /> : <ArrowDownRight size={13} strokeWidth={2.6} />}
      <span className="scm-num">{up ? '+' : '−'}{fmt1(Math.abs(v))}{suffix}</span>
    </span>
  )
}

/* ---------- 산점도 좌표계 ---------- */
const VW = 1160
const VH = 470
const PL = 64
const PR = 60
const PT = 54
const PB = 64
const PLOT_W = VW - PL - PR
const PLOT_H = VH - PT - PB
const XMAX = 38 // 수요(언급률) 상한, 최대 34 여유
const YMIN = -2
const YMAX = 22 // 성장(3년 Δ) 범위 2~19 여유
const xS = (demand: number) => PL + (demand / XMAX) * PLOT_W
const yS = (delta: number) => PT + ((YMAX - delta) / (YMAX - YMIN)) * PLOT_H
const BOTTOM = PT + PLOT_H

/* 직접 라벨 배치 (9개 전부 · 충돌 최소화) */
type Dir = 'up' | 'down' | 'right'
const labelCfg: Record<string, { dir: Dir; dx?: number }> = {
  ai: { dir: 'up' },
  cloud: { dir: 'right' },
  scale: { dir: 'right' },
  msa: { dir: 'up' },
  data: { dir: 'up' },
  realtime: { dir: 'down' },
  devops: { dir: 'down' },
  security: { dir: 'down' },
  global: { dir: 'down' },
}

/* ---------- 레이더 좌표계 ---------- */
const RVW = 360
const RCX = 180
const RCY = 178
const RMAX = 116

export default function SignalConcept() {
  const [hover, setHover] = useState<string | null>(null)

  const model = useMemo(() => {
    const meta = conceptData._meta
    const concepts = conceptData.concepts

    // 경험 가중 커버리지 = Σ(me/2 × demand) / Σ(demand) × 100
    const sumDemand = concepts.reduce((a, c) => a + c.demand, 0)
    const sumWeighted = concepts.reduce((a, c) => a + (c.me / 2) * c.demand, 0)
    const coverage = (sumWeighted / sumDemand) * 100

    const owned = concepts.filter((c) => c.me > 0)
    const strong = concepts.filter((c) => c.me === 2)
    const partial = concepts.filter((c) => c.me === 1)
    const none = concepts.filter((c) => c.me === 0)

    // 내 경험 개념의 성장 모멘텀 (me 가중 평균 Δ)
    const wSum = owned.reduce((a, c) => a + c.me / 2, 0) || 1
    const momentum = owned.reduce((a, c) => a + (c.me / 2) * c.delta, 0) / wSum

    // 최상위 경험 갭: me=0 중 (수요+성장) 최대
    const topGap = [...none].sort((a, b) => (b.demand + b.delta) - (a.demand + a.delta))[0]

    // 경험 갭 리스트: me=0, 수요 내림차순
    const gapList = [...none].sort((a, b) => b.demand - a.demand)

    // 내 강점: me=2, 수요 내림차순
    const strengths = [...strong].sort((a, b) => b.demand - a.demand)

    // 산점도 포인트
    const points = concepts.map((c) => ({
      ...c,
      x: xS(c.demand),
      y: yS(c.delta),
      r: 11 + (c.demand / XMAX) * 11, // ~14.5 .. 20.8
    }))

    // 레이더 노드 (9축)
    const step = (Math.PI * 2) / concepts.length
    const radar = concepts.map((c, i) => {
      const ang = -Math.PI / 2 + i * step
      const cos = Math.cos(ang)
      const sin = Math.sin(ang)
      const rr = (c.me / 2) * RMAX
      const anchor: 'start' | 'middle' | 'end' = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
      const lr = RMAX + 15
      return {
        key: c.key,
        label: c.label,
        color: c.color,
        me: c.me,
        cos,
        sin,
        vx: RCX + cos * rr,
        vy: RCY + sin * rr,
        ax: RCX + cos * RMAX,
        ay: RCY + sin * RMAX,
        lx: RCX + cos * lr,
        ly: RCY + sin * lr,
        anchor,
      }
    })
    const polyMe = radar.map((n) => `${n.vx.toFixed(1)},${n.vy.toFixed(1)}`).join(' ')
    const ring = (lvl: number) =>
      radar
        .map((n) => `${(RCX + n.cos * (lvl / 2) * RMAX).toFixed(1)},${(RCY + n.sin * (lvl / 2) * RMAX).toFixed(1)}`)
        .join(' ')

    return {
      note: meta.note,
      asOf: meta.asOf,
      N: meta.N,
      years: meta.years,
      levelLegend: meta.levelLegend,
      coverage,
      coverageInt: Math.trunc(coverage),
      coverageFrac: fmt1(coverage).split('.')[1],
      momentum,
      strongCount: strong.length,
      partialCount: partial.length,
      noneCount: none.length,
      total: concepts.length,
      topGap,
      gapList,
      strengths,
      points,
      radar,
      polyMe,
      ringL1: ring(1),
      ringL2: ring(2),
    }
  }, [])

  const gridX = [0, 10, 20, 30]
  const gridY = [0, 5, 10, 15, 20]

  const hoveredPt = model.points.find((p) => p.key === hover) || null
  const callout = model.points.find((p) => p.key === model.topGap.key) || null

  return (
    <div className="scm-stage">
      <div className="scm-canvas">
        {/* ============ 정직성 배지 ============ */}
        <div className="scm-honesty" role="note">
          <AlertTriangle size={14} strokeWidth={2.4} />
          <span>시뮬레이션 · 개념 파서 완성 가정 (실집계 아님)</span>
        </div>

        {/* ============ 헤더 ============ */}
        <header className="scm-head">
          <div className="scm-head__lead">
            <div className="scm-eyebrow">
              <Brain size={13} strokeWidth={2.4} />
              개념 축 · 면접이 진짜 묻는 것
            </div>
            <h1 className="scm-title">당신의 개념 좌표</h1>
            <p className="scm-dek">
              면접은 도구가 아니라 문제 경험을 물어요. 엔지니어링 개념을 수요 × 성장 위에 얹고,
              그 위에 내 경험을 겹쳐 어떤 개념이 비었는지 봅니다.
            </p>
          </div>

          <div className="scm-cov">
            <div className="scm-cov__row">
              <div className="scm-cov__big">
                <span className="scm-num">{model.coverageInt}</span>
                <span className="scm-cov__frac">.{model.coverageFrac}%</span>
              </div>
              <Delta v={model.momentum} />
            </div>
            <div className="scm-cov__label">
              경험 가중 커버리지 · 강한 {model.strongCount} · 부분 {model.partialCount} · 없음 {model.noneCount}
            </div>
            <div className="scm-capsule">
              <span className="scm-capsule__fill" style={{ width: `${model.coverage}%` }} />
            </div>
            <div className="scm-foot">
              <Info size={11} strokeWidth={2.2} />
              시뮬레이션 · 개념 파서가 공고 {model.N.toLocaleString()}건을 읽었다고 가정 · {model.asOf}
            </div>
          </div>
        </header>

        {/* ============ 다크 히어로 · 개념 산점도 ============ */}
        <section className="scm-hero">
          <div className="scm-hero__bar">
            <div className="scm-hero__title">
              개념 수요 지형 <span>수요 × 성장 산점도 · 채움 = 내 경험</span>
            </div>
            <div className="scm-seg" role="tablist" aria-label="축">
              <button className="is-active" role="tab" aria-selected="true">개념</button>
              <button className="is-disabled" role="tab" aria-selected="false" aria-disabled="true" disabled>
                기술
              </button>
            </div>
          </div>

          <div className="scm-plotwrap">
            <svg className="scm-scatter" viewBox={`0 0 ${VW} ${VH}`} role="img"
              aria-label="개념 수요 대비 성장 산점도">
              <defs>
                <radialGradient id="scmStrong" cx="38%" cy="34%" r="72%">
                  <stop offset="0%" stopColor="#7ba0dd" />
                  <stop offset="52%" stopColor="#0b0b0c" />
                  <stop offset="100%" stopColor="#254c92" />
                </radialGradient>
                <radialGradient id="scmHot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0b0b0c" stopOpacity="0.20" />
                  <stop offset="55%" stopColor="#0b0b0c" stopOpacity="0.07" />
                  <stop offset="100%" stopColor="#0b0b0c" stopOpacity="0" />
                </radialGradient>
                <filter id="scmGlow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
              </defs>

              {/* 우상단(고수요·고성장) 은은한 블루 글로우 */}
              <ellipse cx={xS(32)} cy={yS(18)} rx="300" ry="180" fill="url(#scmHot)" />

              {/* 그리드 (점선 헤어라인) */}
              {gridX.map((gx) => (
                <line key={`gx${gx}`} x1={xS(gx)} y1={PT} x2={xS(gx)} y2={BOTTOM}
                  stroke="#22262f" strokeWidth="1" strokeDasharray="2 5" />
              ))}
              {gridY.map((gy) => (
                <line key={`gy${gy}`} x1={PL} y1={yS(gy)} x2={VW - PR} y2={yS(gy)}
                  stroke="#22262f" strokeWidth="1" strokeDasharray="2 5" />
              ))}

              {/* 0% 성장선 강조 */}
              <line x1={PL} y1={yS(0)} x2={VW - PR} y2={yS(0)}
                stroke="#39404d" strokeWidth="1.5" />
              <text x={PL + 4} y={yS(0) - 7} textAnchor="start" className="scm-zero">성장 0%</text>

              {/* 축 라벨 */}
              {gridX.map((gx) => (
                <text key={`xl${gx}`} x={xS(gx)} y={BOTTOM + 22} textAnchor="middle" className="scm-axis">
                  {gx}%
                </text>
              ))}
              {gridY.map((gy) => (
                <text key={`yl${gy}`} x={PL - 12} y={yS(gy) + 4} textAnchor="end" className="scm-axis">
                  {gy > 0 ? `+${gy}` : gy}
                </text>
              ))}
              <text x={VW - PR} y={BOTTOM + 44} textAnchor="end" className="scm-axis scm-axis--strong">
                수요(공고 언급률) →
              </text>
              <text x={PL - 12} y={PT - 22} textAnchor="start" className="scm-axis scm-axis--strong">
                성장(3년 Δ) ↑
              </text>

              {/* 사분면 캡션 */}
              <text x={VW - PR - 6} y={PT + 16} textAnchor="end" className="scm-quad">고수요 · 고성장 = 지금 필수</text>
              <text x={PL + 6} y={PT + 16} textAnchor="start" className="scm-quad">저수요 · 고성장 = 신흥 개념</text>
              <text x={VW - PR - 6} y={BOTTOM - 8} textAnchor="end" className="scm-quad">고수요 · 저성장 = 성숙</text>
              <text x={PL + 6} y={BOTTOM - 8} textAnchor="start" className="scm-quad">저수요 · 저성장</text>

              {/* 호버 단일 포커스 가이드 */}
              {hoveredPt && (
                <g className="scm-guide">
                  <line x1={hoveredPt.x} y1={hoveredPt.y} x2={hoveredPt.x} y2={BOTTOM}
                    stroke="#556074" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={PL} y1={hoveredPt.y} x2={hoveredPt.x} y2={hoveredPt.y}
                    stroke="#556074" strokeWidth="1" strokeDasharray="3 3" />
                </g>
              )}

              {/* 경험 없음(me=0) 점 — 흐린 그레이, 개념색 얇은 링 */}
              {model.points.filter((p) => p.me === 0).map((p, i) => (
                <g key={p.key} className="scm-bub"
                  onMouseEnter={() => setHover(p.key)} onMouseLeave={() => setHover(null)}
                  style={{ animationDelay: `${i * 34}ms`, opacity: hover && hover !== p.key ? 0.32 : 1 }}>
                  <circle cx={p.x} cy={p.y} r={p.r} fill="#3a4150"
                    stroke={p.color} strokeOpacity="0.45" strokeWidth="1.4" />
                </g>
              ))}

              {/* 부분 경험(me=1) 점 — 중간 블루, 반투명 */}
              {model.points.filter((p) => p.me === 1).map((p, i) => (
                <g key={p.key} className="scm-bub"
                  onMouseEnter={() => setHover(p.key)} onMouseLeave={() => setHover(null)}
                  style={{ animationDelay: `${120 + i * 40}ms`, opacity: hover && hover !== p.key ? 0.4 : 1 }}>
                  <circle cx={p.x} cy={p.y} r={p.r} fill="#3a6fc4" fillOpacity="0.58"
                    stroke="#5a86cf" strokeWidth="1.3" strokeOpacity="0.85" />
                </g>
              ))}

              {/* 강한 경험(me=2) 점 — 블루 발광 + 링 */}
              {model.points.filter((p) => p.me === 2).map((p, i) => (
                <g key={p.key} className="scm-bub scm-strong"
                  onMouseEnter={() => setHover(p.key)} onMouseLeave={() => setHover(null)}
                  style={{ animationDelay: `${220 + i * 46}ms`, opacity: hover && hover !== p.key ? 0.5 : 1 }}>
                  <circle cx={p.x} cy={p.y} r={p.r + 6} fill="#0b0b0c" opacity="0.5" filter="url(#scmGlow)" />
                  <circle cx={p.x} cy={p.y} r={p.r} fill="url(#scmStrong)" stroke="#eef3fb" strokeWidth="1.6" />
                </g>
              ))}

              {/* 직접 라벨 (9개 전부) */}
              {model.points.map((p) => {
                const cfg = labelCfg[p.key] || { dir: 'up' as Dir }
                let lx = p.x
                let ly = p.y
                let anchor: 'start' | 'middle' | 'end' = 'middle'
                if (cfg.dir === 'up') { ly = p.y - p.r - 10 }
                else if (cfg.dir === 'down') { ly = p.y + p.r + 17 }
                else { lx = p.x + p.r + 8; ly = p.y + 4; anchor = 'start' }
                const owned = p.me > 0
                return (
                  <text key={`lb${p.key}`} x={lx + (cfg.dx || 0)} y={ly} textAnchor={anchor}
                    className={`scm-lbl ${owned ? 'scm-lbl--owned' : 'scm-lbl--gap'}`}>
                    {p.label} <tspan className="scm-lbl__sh">{p.demand}%</tspan>
                  </text>
                )
              })}

              {/* 최상위 갭 콜아웃 pill */}
              {callout && (() => {
                const boxW = 214
                const bx = Math.min(callout.x - boxW + 24, VW - PR - boxW)
                const by = callout.y - callout.r - 26 - 30
                return (
                  <g className="scm-callout">
                    <line x1={callout.x} y1={callout.y - callout.r} x2={callout.x} y2={callout.y - callout.r - 26}
                      stroke="#8b90a0" strokeWidth="1" />
                    <g transform={`translate(${bx}, ${by})`}>
                      <rect width={boxW} height="30" rx="15" fill="#f4f6fb" />
                      <circle cx="16" cy="15" r="4" fill={callout.color} />
                      <text x="28" y="19" className="scm-callout__t">
                        {callout.label} · 고수요인데 경험 없음
                      </text>
                    </g>
                  </g>
                )
              })()}

              {/* 호버 값 pill (수요 / 성장 / 내 경험) */}
              {hoveredPt && (() => {
                const near = hoveredPt.x > VW - 210
                const px = near ? hoveredPt.x - 178 : hoveredPt.x + 14
                const py = Math.max(PT + 4, hoveredPt.y - 56)
                return (
                  <g className="scm-vpill">
                    <rect x={px} y={py} width="166" height="52" rx="9" fill="#191c24" stroke="#2c313d" />
                    <text x={px + 12} y={py + 17} className="scm-vpill__name">{hoveredPt.label}</text>
                    <text x={px + 12} y={py + 32} className="scm-vpill__meta">
                      수요 {hoveredPt.demand}% · 성장 {hoveredPt.delta >= 0 ? '+' : '−'}{Math.abs(hoveredPt.delta)}%p
                    </text>
                    <text x={px + 12} y={py + 46} className="scm-vpill__lvl">
                      내 경험 · {model.levelLegend[String(hoveredPt.me)]}
                    </text>
                  </g>
                )
              })()}
            </svg>
          </div>

          {/* 범례 */}
          <div className="scm-legend">
            <span className="scm-chip scm-chip--strong"><i />강한 경험 (레벨 2)</span>
            <span className="scm-chip scm-chip--partial"><i />부분 경험 (레벨 1)</span>
            <span className="scm-chip scm-chip--gap"><i />경험 없음 (레벨 0)</span>
            <span className="scm-chip scm-chip--size">
              <i className="s1" /><i className="s2" /><i className="s3" />
              버블 크기 = 수요
            </span>
            <span className="scm-legend__spacer" />
            <span className="scm-legend__span">{model.years[0]} → {model.years[model.years.length - 1]} · 성장 Δ · 시뮬레이션</span>
          </div>
        </section>

        {/* ============ 하단 · 레이더 + 갭/강점 ============ */}
        <div className="scm-cards">
          {/* 내 개념 DNA 레이더 */}
          <article className="scm-card scm-card--radar">
            <div className="scm-card__head">
              <div className="scm-card__ic scm-card__ic--radar"><Radar size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="scm-card__title">내 개념 DNA</div>
                <div className="scm-card__sub">9개 개념 · 내 경험 레벨(0 · 1 · 2)</div>
              </div>
            </div>
            <div className="scm-radarwrap">
              <svg viewBox={`0 0 ${RVW} ${RVW}`} className="scm-radar" role="img" aria-label="개념별 경험 레이더">
                {/* 레벨 링 */}
                <polygon points={model.ringL2} className="scm-ring scm-ring--2" />
                <polygon points={model.ringL1} className="scm-ring scm-ring--1" />
                {/* 스포크 */}
                {model.radar.map((n) => (
                  <line key={`sp${n.key}`} x1={RCX} y1={RCY} x2={n.ax} y2={n.ay} className="scm-spoke" />
                ))}
                {/* 내 경험 폴리곤 */}
                <polygon points={model.polyMe} className="scm-poly" />
                {/* 노드 */}
                {model.radar.map((n) => (
                  <circle key={`nd${n.key}`} cx={n.vx} cy={n.vy} r={n.me === 0 ? 2.5 : 4}
                    className={`scm-node scm-node--${n.me}`} />
                ))}
                {/* 축 라벨 */}
                {model.radar.map((n) => (
                  <text key={`rl${n.key}`} x={n.lx} y={n.ly + 3} textAnchor={n.anchor}
                    className={`scm-raxis ${n.me === 2 ? 'is-strong' : n.me === 0 ? 'is-gap' : ''}`}>
                    <tspan className="scm-raxis__dot" fill={n.color}>●</tspan> {n.label}
                  </text>
                ))}
              </svg>
            </div>
            <div className="scm-rlegend">
              <span className="scm-rl"><i className="l2" />레벨 2</span>
              <span className="scm-rl"><i className="l1" />레벨 1</span>
              <span className="scm-rl"><i className="l0" />레벨 0</span>
            </div>
          </article>

          {/* 갭 + 강점 */}
          <div className="scm-side">
            <article className="scm-card">
              <div className="scm-card__head">
                <div className="scm-card__ic scm-card__ic--gap"><Target size={16} strokeWidth={2.2} /></div>
                <div>
                  <div className="scm-card__title">경험 갭 Top</div>
                  <div className="scm-card__sub">고수요인데 경험 0 · 면접 취약 지점</div>
                </div>
              </div>
              <ul className="scm-rows">
                {model.gapList.map((c) => (
                  <li key={c.key} className="scm-row">
                    <span className="scm-row__name">
                      <i className="scm-row__dot" style={{ background: c.color }} />
                      {c.label}
                    </span>
                    <span className="scm-row__demand scm-num">{c.demand}%</span>
                    <span className="scm-row__delta"><Delta v={c.delta} /></span>
                  </li>
                ))}
              </ul>
              <div className="scm-card__note">
                <Info size={11} strokeWidth={2.2} />
                면접 대비 포인트: {model.topGap.label} 문제 경험 1개를 스토리로 준비하세요.
              </div>
            </article>

            <article className="scm-card">
              <div className="scm-card__head">
                <div className="scm-card__ic scm-card__ic--strong"><Award size={16} strokeWidth={2.2} /></div>
                <div>
                  <div className="scm-card__title">내 강점 개념</div>
                  <div className="scm-card__sub">강한 경험(레벨 2) · 면접에서 밀어붙일 축</div>
                </div>
              </div>
              <ul className="scm-rows">
                {model.strengths.map((c) => (
                  <li key={c.key} className="scm-row">
                    <span className="scm-row__name">
                      <i className="scm-row__dot" style={{ background: c.color }} />
                      {c.label}
                      <span className="scm-row__mine">강한 경험</span>
                    </span>
                    <span className="scm-row__demand scm-num">{c.demand}%</span>
                    <span className="scm-row__delta"><Delta v={c.delta} /></span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}
