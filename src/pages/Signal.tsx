import { useMemo, useState } from 'react'
import {
  Crosshair, ArrowUpRight, ArrowDownRight, TrendingUp, Target, Info,
} from 'lucide-react'
import marketRaw from '../data/marketData.json'
import './signal.css'

/* ---------- 데이터 타입 (실데이터 형태에 맞춰 최소한으로 정의) ---------- */
interface TechYear {
  tech: string
  owned: boolean
  shares: number[]
  delta: number
}
interface SkillShareItem {
  tech: string
  count: number
  share: number
  owned: boolean
}
interface SkillShareBlock {
  N: number
  asOf: string
  items: SkillShareItem[]
}
interface MarketShape {
  techYearly: { years: string[]; series: TechYear[] }
  skillShare: Record<string, SkillShareBlock>
}
const market = marketRaw as unknown as MarketShape

/* ---------- 유틸 ---------- */
const latestOf = (t: TechYear) => t.shares[t.shares.length - 1]
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

/* 캐럿 델타 (녹/적, tabular-nums) */
function Delta({ v, suffix = '%p' }: { v: number; suffix?: string }) {
  const up = v >= 0
  return (
    <span className={`sg-delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? <ArrowUpRight size={13} strokeWidth={2.6} /> : <ArrowDownRight size={13} strokeWidth={2.6} />}
      <span className="sg-num">{up ? '+' : '−'}{fmt1(Math.abs(v))}{suffix}</span>
    </span>
  )
}

/* ---------- 산점도 좌표계 ---------- */
const VW = 1160
const VH = 470
const PL = 60
const PR = 56
const PT = 52
const PB = 60
const PLOT_W = VW - PL - PR
const PLOT_H = VH - PT - PB
const XMAX = 30 // 수요(share) 상한, 최대 26.3 여유
const YMIN = -16
const YMAX = 12 // 성장(delta) 범위 -13.8 ~ 9.8 여유
const xS = (share: number) => PL + (share / XMAX) * PLOT_W
const yS = (delta: number) => PT + ((YMAX - delta) / (YMAX - YMIN)) * PLOT_H
const BOTTOM = PT + PLOT_H

/* 직접 라벨 배치 (보유 기술 + 최고기회만) */
type Anchor = 'start' | 'middle' | 'end'
const labelCfg: Record<string, { dx: number; dy: number; anchor: Anchor }> = {
  Python: { dx: 14, dy: 20, anchor: 'start' },
  AWS: { dx: 18, dy: 5, anchor: 'start' },
  Docker: { dx: 0, dy: -20, anchor: 'middle' },
  TypeScript: { dx: 0, dy: -22, anchor: 'middle' },
}

export default function Signal() {
  const [hover, setHover] = useState<string | null>(null)

  const model = useMemo(() => {
    const series = market.techYearly.series
    const dom = market.skillShare['국내']

    // 커버리지: 수요가중 = sum(보유 latestShare) / sum(전체 latestShare)
    const sumAll = series.reduce((a, t) => a + latestOf(t), 0)
    const sumOwned = series.filter((t) => t.owned).reduce((a, t) => a + latestOf(t), 0)
    const coverage = (sumOwned / sumAll) * 100
    const ownedList = series.filter((t) => t.owned)
    const ownedMomentum =
      ownedList.reduce((a, t) => a + t.delta, 0) / (ownedList.length || 1)

    // 정규화 범위
    const shares = series.map(latestOf)
    const deltas = series.map((t) => t.delta)
    const sMin = Math.min(...shares)
    const sMax = Math.max(...shares)
    const dMin = Math.min(...deltas)
    const dMax = Math.max(...deltas)
    const norm = (v: number, mn: number, mx: number) => (mx === mn ? 0 : (v - mn) / (mx - mn))

    const notOwned = series.filter((t) => !t.owned)

    // 최고 기회: 미보유 중 (수요정규화 + 성장정규화) 최대
    const topGap = [...notOwned]
      .map((t) => ({
        tech: t.tech,
        score: norm(latestOf(t), sMin, sMax) + norm(t.delta, dMin, dMax),
        latest: latestOf(t),
        delta: t.delta,
      }))
      .sort((a, b) => b.score - a.score)[0]

    // 갭 리스트: 미보유 latestShare 내림차순 top5
    const gapList = [...notOwned]
      .sort((a, b) => latestOf(b) - latestOf(a))
      .slice(0, 5)
      .map((t) => ({ tech: t.tech, latest: latestOf(t), delta: t.delta, owned: t.owned }))

    // 성장 급상승: delta 내림차순 top5
    const risers = [...series]
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5)
      .map((t) => ({ tech: t.tech, latest: latestOf(t), delta: t.delta, owned: t.owned }))

    // 산점도 포인트 (좌표/반지름)
    const points = series.map((t) => {
      const latest = latestOf(t)
      const r = t.owned
        ? 10 + Math.min(1, latest / XMAX) * 8 // 10..18
        : 6 + Math.min(1, latest / XMAX) * 3 // 6..9
      return {
        tech: t.tech,
        owned: t.owned,
        latest,
        delta: t.delta,
        x: xS(latest),
        y: yS(t.delta),
        r,
      }
    })

    return {
      coverage,
      coverageInt: Math.trunc(coverage),
      coverageFrac: fmt1(coverage).split('.')[1],
      ownedCount: ownedList.length,
      total: series.length,
      ownedMomentum,
      N: dom.N,
      asOf: dom.asOf,
      topGap,
      gapList,
      risers,
      points,
      years: market.techYearly.years,
    }
  }, [])

  const gridX = [0, 10, 20, 30]
  const gridY = [10, 5, 0, -5, -10, -15]

  const hoveredPt = model.points.find((p) => p.tech === hover) || null
  const callout = model.points.find((p) => p.tech === model.topGap.tech) || null

  return (
    <div className="signal-stage">
      <div className="sg-canvas">
        {/* ============ 헤더 ============ */}
        <header className="sg-head">
          <div className="sg-head__lead">
            <div className="sg-eyebrow">
              <Crosshair size={13} strokeWidth={2.4} />
              시장 포지셔닝 · 실채용공고 기반
            </div>
            <h1 className="sg-title">당신의 시장 좌표</h1>
            <p className="sg-dek">
              내 기술을 수요 × 성장 지형 위에 얹어, 어디에 서 있고 어디가 비었는지 한눈에 봅니다.
            </p>
          </div>

          <div className="sg-cov">
            <div className="sg-cov__row">
              <div className="sg-cov__big">
                <span className="sg-num">{model.coverageInt}</span>
                <span className="sg-cov__frac">.{model.coverageFrac}%</span>
              </div>
              <Delta v={model.ownedMomentum} />
            </div>
            <div className="sg-cov__label">
              수요가중 커버리지 · {model.ownedCount}/{model.total} 핵심 기술 보유
            </div>
            <div className="sg-capsule">
              <span className="sg-capsule__fill" style={{ width: `${model.coverage}%` }} />
            </div>
            <div className="sg-foot">
              <Info size={11} strokeWidth={2.2} />
              출처: 실채용공고 {model.N.toLocaleString()}건 · {model.asOf}
            </div>
          </div>
        </header>

        {/* ============ 다크 히어로 패널 ============ */}
        <section className="sg-hero">
          <div className="sg-hero__bar">
            <div className="sg-hero__title">
              기술 지형 <span>수요 × 성장 산점도</span>
            </div>
            <div className="sg-seg" role="tablist" aria-label="지역">
              <button className="is-active" role="tab" aria-selected="true">국내</button>
              <button className="is-disabled" role="tab" aria-selected="false" aria-disabled="true" disabled>
                국외
              </button>
            </div>
          </div>

          <div className="sg-plotwrap">
            <svg className="sg-scatter" viewBox={`0 0 ${VW} ${VH}`} role="img"
              aria-label="기술 수요 대비 성장 산점도">
              <defs>
                <radialGradient id="sgOwned" cx="38%" cy="34%" r="72%">
                  <stop offset="0%" stopColor="#7ba0dd" />
                  <stop offset="52%" stopColor="#0b0b0c" />
                  <stop offset="100%" stopColor="#254c92" />
                </radialGradient>
                <radialGradient id="sgHot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0b0b0c" stopOpacity="0.20" />
                  <stop offset="55%" stopColor="#0b0b0c" stopOpacity="0.07" />
                  <stop offset="100%" stopColor="#0b0b0c" stopOpacity="0" />
                </radialGradient>
                <filter id="sgGlow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
                <filter id="sgField" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="26" />
                </filter>
              </defs>

              {/* 우상단(고수요·고성장) 은은한 블루 글로우 */}
              <ellipse cx={xS(27)} cy={yS(9)} rx="290" ry="200" fill="url(#sgHot)" />

              {/* 실데이터 밀도 필드 — 실제 점들이 모인 곳이 밝아지는 지형(가짜 점 없음) */}
              <g filter="url(#sgField)">
                {model.points.map((p) => (
                  <circle key={`fld${p.tech}`} cx={p.x} cy={p.y} r="50"
                    fill="#0b0b0c" opacity={p.owned ? 0.09 : 0.05} />
                ))}
              </g>

              {/* 그리드 (점선 헤어라인, 가로+세로) */}
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
              <text x={VW - PR} y={yS(0) - 7} textAnchor="end" className="sg-zero">성장 0%</text>

              {/* 축 라벨 */}
              {gridX.map((gx) => (
                <text key={`xl${gx}`} x={xS(gx)} y={BOTTOM + 22} textAnchor="middle" className="sg-axis">
                  {gx}%
                </text>
              ))}
              {gridY.map((gy) => (
                <text key={`yl${gy}`} x={PL - 12} y={yS(gy) + 4} textAnchor="end" className="sg-axis">
                  {gy > 0 ? `+${gy}` : gy}
                </text>
              ))}
              <text x={VW - PR} y={BOTTOM + 44} textAnchor="end" className="sg-axis sg-axis--strong">
                수요(공고 점유율) →
              </text>
              <text x={PL - 12} y={PT - 22} textAnchor="start" className="sg-axis sg-axis--strong">
                성장(3년 Δ) ↑
              </text>

              {/* 사분면 캡션 */}
              <text x={VW - PR - 6} y={PT + 16} textAnchor="end" className="sg-quad">고수요 · 고성장 = 기회 구간</text>
              <text x={PL + 6} y={PT + 16} textAnchor="start" className="sg-quad">저수요 · 고성장 = 신흥</text>
              <text x={VW - PR - 6} y={BOTTOM - 8} textAnchor="end" className="sg-quad">고수요 · 저성장 = 성숙</text>
              <text x={PL + 6} y={BOTTOM - 8} textAnchor="start" className="sg-quad">저수요 · 저성장</text>

              {/* 호버 단일 포커스 가이드 */}
              {hoveredPt && (
                <g className="sg-guide">
                  <line x1={hoveredPt.x} y1={hoveredPt.y} x2={hoveredPt.x} y2={BOTTOM}
                    stroke="#556074" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={PL} y1={hoveredPt.y} x2={hoveredPt.x} y2={hoveredPt.y}
                    stroke="#556074" strokeWidth="1" strokeDasharray="3 3" />
                </g>
              )}

              {/* 미보유(Gap) 점 — 흐린 그레이, 뒤로 물러남 */}
              {model.points.filter((p) => !p.owned).map((p, i) => (
                <circle key={p.tech} cx={p.x} cy={p.y} r={p.r}
                  className="sg-dot sg-dot--gap"
                  fill="#3a4150"
                  onMouseEnter={() => setHover(p.tech)}
                  onMouseLeave={() => setHover(null)}
                  style={{ animationDelay: `${i * 36}ms`, opacity: hover && hover !== p.tech ? 0.34 : 0.72 }} />
              ))}

              {/* 보유(Owned) 점 — 블루 발광 + 링 */}
              {model.points.filter((p) => p.owned).map((p, i) => (
                <g key={p.tech} className="sg-owned"
                  onMouseEnter={() => setHover(p.tech)}
                  onMouseLeave={() => setHover(null)}
                  style={{ animationDelay: `${180 + i * 44}ms`, opacity: hover && hover !== p.tech ? 0.5 : 1 }}>
                  <circle cx={p.x} cy={p.y} r={p.r + 6} fill="#0b0b0c" opacity="0.5" filter="url(#sgGlow)" />
                  <circle cx={p.x} cy={p.y} r={p.r} fill="url(#sgOwned)" stroke="#eef3fb" strokeWidth="1.5" />
                </g>
              ))}

              {/* 직접 라벨 (보유 기술) */}
              {model.points.filter((p) => p.owned).map((p) => {
                const c = labelCfg[p.tech] || { dx: 0, dy: -20, anchor: 'middle' as Anchor }
                return (
                  <text key={`lb${p.tech}`} x={p.x + c.dx} y={p.y + c.dy}
                    textAnchor={c.anchor} className="sg-lbl sg-lbl--owned">
                    {p.tech} <tspan className="sg-lbl__sh">{fmt1(p.latest)}%</tspan>
                  </text>
                )
              })}

              {/* 최상위 갭 라벨 (콜아웃 대상 제외, 수요 상위 2개) */}
              {model.gapList
                .filter((g) => g.tech !== model.topGap.tech)
                .slice(0, 2)
                .map((g) => {
                  const p = model.points.find((pp) => pp.tech === g.tech)
                  if (!p) return null
                  return (
                    <text key={`gl${g.tech}`} x={p.x} y={p.y + p.r + 15} textAnchor="middle"
                      className="sg-lbl sg-lbl--gap">
                      {g.tech} <tspan className="sg-lbl__sh">{fmt1(g.latest)}%</tspan>
                    </text>
                  )
                })}

              {/* 최고기회 콜아웃 pill */}
              {callout && (
                <g className="sg-callout">
                  <line x1={callout.x} y1={callout.y - callout.r} x2={callout.x} y2={callout.y - callout.r - 26}
                    stroke="#8b90a0" strokeWidth="1" />
                  <g transform={`translate(${callout.x - 96}, ${callout.y - callout.r - 26 - 30})`}>
                    <rect width="192" height="30" rx="15" fill="#f4f6fb" />
                    <circle cx="16" cy="15" r="4" fill="#0b0b0c" />
                    <text x="28" y="19" className="sg-callout__t">
                      {callout.tech} · 고수요인데 미보유
                    </text>
                  </g>
                </g>
              )}

              {/* 호버 값 pill */}
              {hoveredPt && (() => {
                const near = hoveredPt.x > VW - 200
                const px = near ? hoveredPt.x - 168 : hoveredPt.x + 14
                const py = Math.max(PT + 4, hoveredPt.y - 46)
                return (
                  <g className="sg-vpill">
                    <rect x={px} y={py} width="154" height="40" rx="9" fill="#191c24" stroke="#2c313d" />
                    <text x={px + 12} y={py + 17} className="sg-vpill__name">{hoveredPt.tech}</text>
                    <text x={px + 12} y={py + 32} className="sg-vpill__meta">
                      수요 {fmt1(hoveredPt.latest)}% · 성장 {hoveredPt.delta >= 0 ? '+' : '−'}{fmt1(Math.abs(hoveredPt.delta))}%p
                    </text>
                  </g>
                )
              })()}
            </svg>
          </div>

          {/* 범례 */}
          <div className="sg-legend">
            <span className="sg-chip sg-chip--owned"><i />내 기술 (Owned)</span>
            <span className="sg-chip sg-chip--gap"><i />시장 (Gap)</span>
            <span className="sg-chip sg-chip--size">
              <i className="s1" /><i className="s2" /><i className="s3" />
              노드 크기 = 수요
            </span>
            <span className="sg-legend__spacer" />
            <span className="sg-legend__span">{model.years[0]} → {model.years[model.years.length - 1]} · 성장 Δ</span>
          </div>
        </section>

        {/* ============ 하단 라이트 카드 2-up ============ */}
        <div className="sg-cards">
          <article className="sg-card">
            <div className="sg-card__head">
              <div className="sg-card__ic sg-card__ic--gap"><Target size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="sg-card__title">빈 구멍 · 고수요 미보유</div>
                <div className="sg-card__sub">아직 안 가진 기술을 수요 순으로</div>
              </div>
            </div>
            <ul className="sg-rows">
              {model.gapList.map((r) => (
                <li key={r.tech} className="sg-row">
                  <span className="sg-row__name">{r.tech}</span>
                  <span className="sg-row__demand sg-num">{fmt1(r.latest)}%</span>
                  <span className="sg-row__delta"><Delta v={r.delta} /></span>
                </li>
              ))}
            </ul>
          </article>

          <article className="sg-card">
            <div className="sg-card__head">
              <div className="sg-card__ic sg-card__ic--rise"><TrendingUp size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="sg-card__title">성장 급상승</div>
                <div className="sg-card__sub">3년 점유율 증가폭 상위</div>
              </div>
            </div>
            <ul className="sg-rows">
              {model.risers.map((r) => (
                <li key={r.tech} className="sg-row">
                  <span className="sg-row__name">
                    {r.tech}
                    {r.owned && <span className="sg-row__mine">내 기술</span>}
                  </span>
                  <span className="sg-row__demand sg-num">{fmt1(r.latest)}%</span>
                  <span className="sg-row__delta"><Delta v={r.delta} /></span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </div>
  )
}
