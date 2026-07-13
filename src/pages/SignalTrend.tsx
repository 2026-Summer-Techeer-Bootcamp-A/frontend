import { useMemo, useState } from 'react'
import {
  ArrowRightLeft, ArrowUpRight, ArrowDownRight, Minus,
  TrendingUp, TrendingDown, Activity, ListOrdered, Info,
} from 'lucide-react'
import marketRaw from '../data/marketData.json'
import './signalTrend.css'

/* ---------- 데이터 타입 (실데이터 형태에 맞춰 최소 정의) ---------- */
interface TechYear {
  tech: string
  owned: boolean
  shares: number[]
  delta: number
}
interface SkillShareBlock {
  N: number
  asOf: string
}
interface TrendPoint {
  period: string
  hn: number
  jumpit: number
  wanted: number
  N: number
}
interface MarketShape {
  techYearly: { years: string[]; series: TechYear[] }
  skillShare: Record<string, SkillShareBlock>
  trend: { asOf: string; sources: string[]; series: TrendPoint[] }
}
const market = marketRaw as unknown as MarketShape

/* ---------- 유틸 ---------- */
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const first = (t: TechYear) => t.shares[0]
const last = (t: TechYear) => t.shares[t.shares.length - 1]

/* 캐럿 델타 (녹/적, tabular-nums) */
function Delta({ v, suffix = '%p' }: { v: number; suffix?: string }) {
  const up = v >= 0
  return (
    <span className={`st-delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? <ArrowUpRight size={13} strokeWidth={2.6} /> : <ArrowDownRight size={13} strokeWidth={2.6} />}
      <span className="st-num">{up ? '+' : '−'}{fmt1(Math.abs(v))}{suffix}</span>
    </span>
  )
}

/* 순위 이동 배지 (양수 = 상승) */
function RankMove({ moved }: { moved: number }) {
  if (moved === 0) {
    return (
      <span className="st-move is-flat">
        <Minus size={12} strokeWidth={2.6} /><span className="st-num">0</span>
      </span>
    )
  }
  const up = moved > 0
  return (
    <span className={`st-move ${up ? 'is-up' : 'is-down'}`}>
      {up ? <ArrowUpRight size={12} strokeWidth={2.6} /> : <ArrowDownRight size={12} strokeWidth={2.6} />}
      <span className="st-num">{Math.abs(moved)}</span>
    </span>
  )
}

/* 미니 슬로프 스파크라인 (자기 4개 값 정규화) */
function Slope({ shares, tone }: { shares: number[]; tone: 'up' | 'down' }) {
  const w = 78
  const h = 26
  const pad = 3
  const mn = Math.min(...shares)
  const mx = Math.max(...shares)
  const span = mx - mn || 1
  const pts = shares.map((s, i) => {
    const x = pad + (i / (shares.length - 1)) * (w - pad * 2)
    const y = h - pad - ((s - mn) / span) * (h - pad * 2)
    return { x, y }
  })
  const d = smooth(pts)
  const cls = tone === 'up' ? 'st-slope--up' : 'st-slope--down'
  const end = pts[pts.length - 1]
  return (
    <svg className={`st-slope ${cls}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={end.x} cy={end.y} r="2.6" />
    </svg>
  )
}

/* ---------- 카디널 스플라인 (Catmull-Rom → 큐빅 베지어) ---------- */
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

/* ---------- 범프 차트 좌표계 ---------- */
const VW = 1180
const VH = 520
const PL = 200
const PR = 196
const PT = 44
const PB = 46
const PLOT_W = VW - PL - PR
const PLOT_H = VH - PT - PB
const MAXRANK = 10
const yearX = (i: number, n: number) => PL + (i / (n - 1)) * PLOT_W
const rankY = (r: number) => PT + ((r - 1) / (MAXRANK - 1)) * PLOT_H

/* 색 카테고리: owned=블루 / Java=로즈(최대 하락) / Next.js=앰버(비보유 최대 상승) / 나머지=그레이 */
type Cat = 'owned' | 'fall' | 'rise' | 'muted'
function catOf(t: TechYear): Cat {
  if (t.owned) return 'owned'
  if (t.tech === 'Java') return 'fall'
  if (t.tech === 'Next.js') return 'rise'
  return 'muted'
}

export default function SignalTrend() {
  const [focus, setFocus] = useState<string | null>(null)

  const model = useMemo(() => {
    const years = market.techYearly.years
    const n = years.length
    const series = market.techYearly.series
    const dom = market.skillShare['국내']

    // 연도별 순위 (share 내림차순 → 1위부터)
    const rankByYear: Record<string, number>[] = years.map((_, i) => {
      const order = [...series].sort((a, b) => b.shares[i] - a.shares[i])
      const map: Record<string, number> = {}
      order.forEach((t, idx) => { map[t.tech] = idx + 1 })
      return map
    })

    // 각 기술의 라인 (연도별 rank 좌표) + 메타
    const lines = series.map((t) => {
      const ranks = years.map((_, i) => rankByYear[i][t.tech])
      const pts: Pt[] = ranks.map((r, i) => ({ x: yearX(i, n), y: rankY(r) }))
      return {
        tech: t.tech,
        owned: t.owned,
        cat: catOf(t),
        shares: t.shares,
        delta: t.delta,
        ranks,
        rankStart: ranks[0],
        rankEnd: ranks[ranks.length - 1],
        pts,
        d: smooth(pts),
      }
    })
    // 그리기 순서: 그레이 → rise/fall → owned (강조가 위로)
    const order: Record<Cat, number> = { muted: 0, rise: 1, fall: 1, owned: 2 }
    const drawOrder = [...lines].sort((a, b) => order[a.cat] - order[b.cat])

    // 헤드라인: 최대 상승 기술
    const risersAll = [...series].sort((a, b) => b.delta - a.delta)
    const topRiser = risersAll[0]
    const topFaller = risersAll[risersAll.length - 1]
    const trRankStart = rankByYear[0][topRiser.tech]
    const trRankEnd = rankByYear[n - 1][topRiser.tech]

    // 뜨는/지는 카드
    const risers = risersAll.filter((t) => t.delta > 0)
      .map((t) => ({ tech: t.tech, delta: t.delta, last: last(t), shares: t.shares, owned: t.owned }))
    const fallers = [...series].filter((t) => t.delta < 0).sort((a, b) => a.delta - b.delta)
      .map((t) => ({ tech: t.tech, delta: t.delta, last: last(t), shares: t.shares, owned: t.owned }))

    // Then vs Now 리더보드 (Top-5)
    const rank2022 = rankByYear[0]
    const rank2025 = rankByYear[n - 1]
    const top5_2022set = new Set(
      [...series].sort((a, b) => b.shares[0] - a.shares[0]).slice(0, 5).map((t) => t.tech),
    )
    const board2022 = [...series].sort((a, b) => b.shares[0] - a.shares[0]).slice(0, 5)
      .map((t) => ({ tech: t.tech, share: first(t), owned: t.owned }))
    const board2025 = [...series].sort((a, b) => b.shares[n - 1] - a.shares[n - 1]).slice(0, 5)
      .map((t) => ({
        tech: t.tech,
        share: last(t),
        owned: t.owned,
        moved: rank2022[t.tech] - rank2025[t.tech], // 양수 = 상승
        isNew: !top5_2022set.has(t.tech),
      }))

    // 채용 볼륨 맥박 (bump 창과 동일한 2022~2025)
    const vol = market.trend.series.filter((p) => years.includes(p.period))
      .map((p) => ({ period: p.period, N: p.N }))
    const volMax = Math.max(...vol.map((v) => v.N))
    const peakIdx = vol.findIndex((v) => v.N === volMax)

    return {
      years, n, lines, drawOrder,
      topRiser, topFaller, trRankStart, trRankEnd,
      risers, fallers, board2022, board2025,
      vol, volMax, peakIdx,
      N: dom.N, asOf: dom.asOf,
      volSources: market.trend.sources,
    }
  }, [])

  const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const focusLine = model.lines.find((l) => l.tech === focus) || null

  // 최대 상승/하락 라인 (콜아웃/강조용)
  const riserLine = model.lines.find((l) => l.tech === model.topRiser.tech)!
  const fallerLine = model.lines.find((l) => l.tech === model.topFaller.tech)!

  // 볼륨 맥박 area path
  const volW = 1180
  const volH = 84
  const volPL = 8
  const volPR = 8
  const volPT = 14
  const volPB = 22
  const vN = model.vol.length
  const volX = (i: number) => volPL + (i / (vN - 1)) * (volW - volPL - volPR)
  const volY = (v: number) => volPT + (1 - v / model.volMax) * (volH - volPT - volPB)
  const volPts: Pt[] = model.vol.map((d, i) => ({ x: volX(i), y: volY(d.N) }))
  const volLineD = smooth(volPts)
  const volAreaD = `${volLineD} L ${volPts[vN - 1].x} ${volH - volPB} L ${volPts[0].x} ${volH - volPB} Z`

  return (
    <div className="signaltrend-stage">
      <div className="st-canvas">
        {/* ============ 헤더 ============ */}
        <header className="st-head">
          <div className="st-head__lead">
            <div className="st-eyebrow">
              <ArrowRightLeft size={13} strokeWidth={2.4} />
              시장 변화 · 실채용공고 기반
            </div>
            <h1 className="st-title">3년 새 판이 이렇게 바뀌었어요</h1>
            <p className="st-dek">
              2022 → 2025, 채용공고 속 기술 점유율 순위가 어떻게 오르내렸는지 한 흐름으로 봅니다.
            </p>
          </div>

          <div className="st-hero-metric">
            <div className="st-hm__kicker">3년 최대 상승</div>
            <div className="st-hm__row">
              <div className="st-hm__big">
                <span className="st-num">+{Math.trunc(Math.abs(model.topRiser.delta))}</span>
                <span className="st-hm__frac">.{fmt1(Math.abs(model.topRiser.delta)).split('.')[1]}%p</span>
              </div>
              <ArrowUpRight className="st-hm__caret" size={26} strokeWidth={2.6} />
            </div>
            <div className="st-hm__ctx">
              <b>{model.topRiser.tech}</b> · {model.trRankStart}위 → {model.trRankEnd}위 · {model.topFaller.tech}를 제치고 1위
            </div>
            <div className="st-capsule" aria-hidden="true">
              <span className="st-capsule__base" style={{ width: `${(first(model.topRiser) / 30) * 100}%` }} />
              <span className="st-capsule__fill" style={{ width: `${(last(model.topRiser) / 30) * 100}%` }} />
            </div>
            <div className="st-foot">
              <Info size={11} strokeWidth={2.2} />
              출처: 실채용공고 {model.N.toLocaleString()}건 · {model.asOf}
            </div>
          </div>
        </header>

        {/* ============ 다크 히어로 · 범프 차트 ============ */}
        <section className="st-hero">
          <div className="st-hero__bar">
            <div className="st-hero__title">
              순위 이동 <span>채용공고 점유율 순위 흐름 · 2022 → 2025</span>
            </div>
            <div className="st-seg" role="tablist" aria-label="지역">
              <button className="is-active" role="tab" aria-selected="true">국내</button>
              <button className="is-disabled" role="tab" aria-selected="false" aria-disabled="true" disabled>
                국외
              </button>
            </div>
          </div>

          <div className="st-plotwrap">
            <svg className="st-bump" viewBox={`0 0 ${VW} ${VH}`} role="img"
              aria-label="2022부터 2025까지 기술 점유율 순위 이동 범프 차트">
              <defs>
                <linearGradient id="stOwned" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5a86cf" />
                  <stop offset="100%" stopColor="#0b0b0c" />
                </linearGradient>
                <filter id="stGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>

              {/* 가로 순위 헤어라인 */}
              {ranks.map((r) => (
                <line key={`hr${r}`} x1={PL} y1={rankY(r)} x2={PL + PLOT_W} y2={rankY(r)}
                  stroke="#22262f" strokeWidth="1" strokeDasharray="2 6" />
              ))}
              {/* 세로 연도선 */}
              {model.years.map((_, i) => (
                <line key={`vy${i}`} x1={yearX(i, model.n)} y1={PT - 8} x2={yearX(i, model.n)} y2={PT + PLOT_H + 8}
                  stroke="#262a34" strokeWidth="1" strokeDasharray="2 6" />
              ))}

              {/* 순위 축 눈금 (far-left) */}
              {ranks.map((r) => (
                <text key={`ra${r}`} x={30} y={rankY(r) + 4} className="st-rankaxis">{r}</text>
              ))}
              <text x={30} y={PT - 16} className="st-axis st-axis--strong">순위 ↑</text>

              {/* 연도 라벨 */}
              {model.years.map((y, i) => (
                <text key={`yl${y}`} x={yearX(i, model.n)} y={PT + PLOT_H + 30} textAnchor="middle"
                  className="st-axis st-axis--year">{y}</text>
              ))}

              {/* 라인 (그레이 → 강조 → owned 순으로) */}
              {model.drawOrder.map((l, i) => {
                const dim = focus && focus !== l.tech
                return (
                  <g key={l.tech}
                    className={`st-lineg st-lineg--${l.cat} ${dim ? 'is-dim' : ''} ${focus === l.tech ? 'is-focus' : ''}`}
                    onMouseEnter={() => setFocus(l.tech)}
                    onMouseLeave={() => setFocus(null)}>
                    {/* 넓은 히트 영역 */}
                    <path d={l.d} className="st-hit" fill="none" />
                    {/* 발광 (owned) */}
                    {l.cat === 'owned' && (
                      <path d={l.d} className="st-glow" fill="none" filter="url(#stGlow)" />
                    )}
                    {/* 본선 */}
                    <path d={l.d} className="st-line" fill="none" pathLength={1}
                      style={{ animationDelay: `${120 + i * 60}ms` }} />
                    {/* 연도별 점 */}
                    {l.pts.map((p, j) => (
                      <circle key={j} cx={p.x} cy={p.y} className="st-node"
                        style={{ animationDelay: `${260 + i * 60 + j * 40}ms` }} />
                    ))}
                  </g>
                )
              })}

              {/* 좌측 끝(2022) 라벨 — 이름만 */}
              {model.lines.map((l) => {
                const dim = focus && focus !== l.tech
                return (
                  <text key={`ll${l.tech}`} x={PL - 16} y={rankY(l.rankStart) + 4} textAnchor="end"
                    className={`st-endlbl st-endlbl--${l.cat} ${dim ? 'is-dim' : ''}`}>
                    {l.tech}
                  </text>
                )
              })}
              {/* 우측 끝(2025) 라벨 — 이름 + 점유율 */}
              {model.lines.map((l) => {
                const dim = focus && focus !== l.tech
                return (
                  <text key={`rl${l.tech}`} x={PL + PLOT_W + 16} y={rankY(l.rankEnd) + 4} textAnchor="start"
                    className={`st-endlbl st-endlbl--${l.cat} ${dim ? 'is-dim' : ''}`}>
                    {l.tech} <tspan className="st-endlbl__sh">{fmt1(l.shares[l.shares.length - 1])}%</tspan>
                  </text>
                )
              })}

              {/* 최대 상승/하락 강조 라벨 (라인 시작점 옆, 델타) */}
              <text x={riserLine.pts[0].x + 10} y={rankY(riserLine.rankStart) - 12} className="st-tag st-tag--rise">
                최대 상승 +{fmt1(Math.abs(model.topRiser.delta))}%p
              </text>
              <text x={fallerLine.pts[0].x + 10} y={rankY(fallerLine.rankStart) - 12} className="st-tag st-tag--fall">
                최대 하락 {'−'}{fmt1(Math.abs(model.topFaller.delta))}%p
              </text>

              {/* 1위 교체 콜아웃 (2024→2025 크로싱) */}
              {(() => {
                const cx = (yearX(2, model.n) + yearX(3, model.n)) / 2
                const boxW = 176
                const bx = cx - boxW / 2
                const by = 6
                return (
                  <g className="st-callout" pointerEvents="none">
                    <line x1={cx} y1={by + 28} x2={cx} y2={rankY(1) - 6} stroke="#556074" strokeWidth="1" strokeDasharray="3 3" />
                    <rect x={bx} y={by} width={boxW} height="26" rx="13" fill="#f4f6fb" />
                    <text x={bx + 14} y={by + 17} className="st-callout__t">
                      {model.topRiser.tech} ↑  {model.topFaller.tech} ↓ · 1위 교체
                    </text>
                  </g>
                )
              })()}

              {/* 단일 포커스 값 pill (좌상단) */}
              {focusLine && (
                <g className="st-vpill" pointerEvents="none">
                  <rect x={PL + 8} y={PT + 2} width="250" height="42" rx="10" fill="#191c24" stroke="#2c313d" />
                  <text x={PL + 22} y={PT + 19} className="st-vpill__name">{focusLine.tech}</text>
                  <text x={PL + 22} y={PT + 35} className="st-vpill__meta">
                    {model.years.map((y, i) => `${y.slice(2)} ${fmt1(focusLine.shares[i])}%`).join('  ·  ')}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* 범례 */}
          <div className="st-legend">
            <span className="st-chip st-chip--owned"><i />내 기술 (Owned)</span>
            <span className="st-chip st-chip--rise"><i />비보유 최대 상승</span>
            <span className="st-chip st-chip--fall"><i />최대 하락</span>
            <span className="st-chip st-chip--muted"><i />시장 기타</span>
            <span className="st-legend__spacer" />
            <span className="st-legend__span">{model.years[0]} → {model.years[model.n - 1]} · 점유율 순위</span>
          </div>
        </section>

        {/* ============ 채용 볼륨 맥박 스트립 ============ */}
        <section className="st-pulse">
          <div className="st-pulse__lead">
            <div className="st-pulse__ic"><Activity size={15} strokeWidth={2.3} /></div>
            <div>
              <div className="st-pulse__title">채용 볼륨 맥박</div>
              <div className="st-pulse__sub">표본 공고 수 · 연도별</div>
            </div>
          </div>
          <div className="st-pulse__chart">
            <svg viewBox={`0 0 ${volW} ${volH}`} preserveAspectRatio="none" className="st-pulse__svg" aria-hidden="true">
              <defs>
                <linearGradient id="stVolFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b0b0c" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#0b0b0c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={volAreaD} fill="url(#stVolFill)" />
              <path d={volLineD} fill="none" stroke="#5a86cf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {volPts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === model.peakIdx ? 3.6 : 2.4}
                  fill={i === model.peakIdx ? '#0b0b0c' : '#3a4150'}
                  stroke={i === model.peakIdx ? '#eef3fb' : 'none'} strokeWidth="1.4" />
              ))}
            </svg>
            <div className="st-pulse__labels">
              {model.vol.map((d, i) => (
                <span key={d.period} className={`st-pulse__yr ${i === model.peakIdx ? 'is-peak' : ''}`}>
                  <b className="st-num">{d.N.toLocaleString()}</b>
                  <em>{d.period}{i === model.peakIdx ? ' · 최다' : ''}</em>
                </span>
              ))}
            </div>
          </div>
          <div className="st-pulse__note">
            출처 {model.volSources.join(' · ')}
          </div>
        </section>

        {/* ============ 하단 라이트 카드 2-up (뜨는 / 지는) ============ */}
        <div className="st-cards">
          <article className="st-card">
            <div className="st-card__head">
              <div className="st-card__ic st-card__ic--rise"><TrendingUp size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="st-card__title">뜨는 스킬</div>
                <div className="st-card__sub">3년 점유율 증가폭 상위</div>
              </div>
            </div>
            <ul className="st-rows">
              {model.risers.map((r) => (
                <li key={r.tech} className="st-row">
                  <span className="st-row__name">
                    {r.tech}
                    {r.owned && <span className="st-row__mine">내 기술</span>}
                  </span>
                  <Slope shares={r.shares} tone="up" />
                  <span className="st-row__now st-num">{fmt1(r.last)}%</span>
                  <span className="st-row__delta"><Delta v={r.delta} /></span>
                </li>
              ))}
            </ul>
          </article>

          <article className="st-card">
            <div className="st-card__head">
              <div className="st-card__ic st-card__ic--fall"><TrendingDown size={16} strokeWidth={2.2} /></div>
              <div>
                <div className="st-card__title">지는 스킬</div>
                <div className="st-card__sub">3년 점유율 감소폭 상위</div>
              </div>
            </div>
            <ul className="st-rows">
              {model.fallers.map((r) => (
                <li key={r.tech} className="st-row">
                  <span className="st-row__name">
                    {r.tech}
                    {r.owned && <span className="st-row__mine">내 기술</span>}
                  </span>
                  <Slope shares={r.shares} tone="down" />
                  <span className="st-row__now st-num">{fmt1(r.last)}%</span>
                  <span className="st-row__delta"><Delta v={r.delta} /></span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* ============ Then vs Now 리더보드 ============ */}
        <section className="st-board">
          <div className="st-board__head">
            <div className="st-card__ic st-card__ic--lead"><ListOrdered size={16} strokeWidth={2.2} /></div>
            <div>
              <div className="st-card__title">리더보드 · Then vs Now</div>
              <div className="st-card__sub">2022 Top 5 가 2025 엔 이렇게 바뀌었어요</div>
            </div>
          </div>
          <div className="st-board__grid">
            <div className="st-board__col">
              <div className="st-board__cap">2022</div>
              <ol className="st-lead">
                {model.board2022.map((r, i) => (
                  <li key={r.tech} className="st-lead__row">
                    <span className="st-lead__rank st-num">{i + 1}</span>
                    <span className="st-lead__name">
                      {r.tech}
                      {r.owned && <span className="st-row__mine">내 기술</span>}
                    </span>
                    <span className="st-lead__sh st-num">{fmt1(r.share)}%</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="st-board__arrow"><ArrowRightLeft size={16} strokeWidth={2.2} /></div>
            <div className="st-board__col">
              <div className="st-board__cap st-board__cap--now">2025</div>
              <ol className="st-lead">
                {model.board2025.map((r, i) => (
                  <li key={r.tech} className="st-lead__row">
                    <span className="st-lead__rank st-num">{i + 1}</span>
                    <span className="st-lead__name">
                      {r.tech}
                      {r.owned && <span className="st-row__mine">내 기술</span>}
                      {r.isNew && <span className="st-lead__new">NEW</span>}
                    </span>
                    <span className="st-lead__sh st-num">{fmt1(r.share)}%</span>
                    <RankMove moved={r.moved} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
