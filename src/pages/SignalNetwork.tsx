import { useMemo, useState } from 'react'
import {
  Waypoints, Link2, Unlink, TrendingUp, Info, Check,
} from 'lucide-react'
import marketRaw from '../data/marketData.json'
import techsRaw from '../data/techs.json'
import './signalNetwork.css'

/* ---------- 데이터 타입 (실데이터 형태에 맞춰 최소 정의) ---------- */
interface CoocItem {
  tech: string
  coRate: number
  coCount: number
}
interface CoocHub {
  base: number
  items: CoocItem[]
}
interface SkillShareItem {
  tech: string
  count: number
  share: number
  owned: boolean
}
interface TechYear {
  tech: string
  owned: boolean
  shares: number[]
  delta: number
}
interface MarketShape {
  cooccurrence: Record<string, CoocHub>
  skillShare: Record<string, { N: number; asOf: string; items: SkillShareItem[] }>
  techYearly: { years: string[]; series: TechYear[] }
}
interface TechCount {
  tech: string
  count: number
}
const market = marketRaw as unknown as MarketShape
const techs = techsRaw as unknown as TechCount[]

/* ---------- 유틸 ---------- */
const fmtN = (n: number) => n.toLocaleString()
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/* ---------- SVG 좌표계 ---------- */
const VW = 1160
const VH = 520
const PADX = 76
const PADY = 56

interface LayNode {
  tech: string
  owned: boolean
  count: number
  x: number
  y: number
  r: number
  deg: number
  ownedDeg: number
}
interface LayEdge {
  a: string
  b: string
  coRate: number
  coCount: number
  x1: number
  y1: number
  x2: number
  y2: number
  w: number
  op: number
  ownedTouch: boolean
}

/* ---------- 결정론적 force 레이아웃 (한 번 계산 후 FREEZE) ---------- */
function computeLayout(
  names: string[],
  rad: number[],
  edges: { a: string; b: string; coRate: number }[],
  idx: Record<string, number>,
) {
  const N = names.length
  const cx = VW / 2
  const cy = VH / 2
  const GA = Math.PI * (3 - Math.sqrt(5)) // 골든 앵글 시드 (RNG 미사용)
  const pos = names.map((_, i) => {
    const a = i * GA
    const rr = Math.sqrt(i + 0.5)
    return { x: cx + Math.cos(a) * rr * 128, y: cy + Math.sin(a) * rr * 58 }
  })
  const k = 182
  let temp = 190
  const iters = 600
  for (let it = 0; it < iters; it++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }))
    // 반발력
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = pos[i].x - pos[j].x
        let dy = pos[i].y - pos[j].y
        const d = Math.hypot(dx, dy) || 0.01
        const f = (k * k) / d
        const ux = dx / d
        const uy = dy / d
        disp[i].x += ux * f
        disp[i].y += uy * f
        disp[j].x -= ux * f
        disp[j].y -= uy * f
      }
    }
    // 인력 (coRate 높을수록 강함)
    for (const e of edges) {
      const i = idx[e.a]
      const j = idx[e.b]
      const dx = pos[i].x - pos[j].x
      const dy = pos[i].y - pos[j].y
      const d = Math.hypot(dx, dy) || 0.01
      const strength = 0.55 + (e.coRate / 100) * 1.1
      const f = ((d * d) / k) * strength
      const ux = dx / d
      const uy = dy / d
      disp[i].x -= ux * f
      disp[i].y -= uy * f
      disp[j].x += ux * f
      disp[j].y += uy * f
    }
    // 약한 중력 + 냉각 적용
    for (let i = 0; i < N; i++) {
      disp[i].x += (cx - pos[i].x) * 0.004
      disp[i].y += (cy - pos[i].y) * 0.05
      const dl = Math.hypot(disp[i].x, disp[i].y) || 0.01
      pos[i].x += (disp[i].x / dl) * Math.min(dl, temp)
      pos[i].y += (disp[i].y / dl) * Math.min(dl, temp)
    }
    temp = Math.max(temp * 0.982, 1.5)
  }
  const fit = (aniso: boolean) => {
    let mnx = 1e9
    let mxx = -1e9
    let mny = 1e9
    let mxy = -1e9
    for (let i = 0; i < N; i++) {
      mnx = Math.min(mnx, pos[i].x - rad[i])
      mxx = Math.max(mxx, pos[i].x + rad[i])
      mny = Math.min(mny, pos[i].y - rad[i])
      mxy = Math.max(mxy, pos[i].y + rad[i])
    }
    let sx = (VW - 2 * PADX) / (mxx - mnx || 1)
    let sy = (VH - 2 * PADY) / (mxy - mny || 1)
    if (!aniso) {
      const s = Math.min(sx, sy)
      sx = s
      sy = s
    }
    const ox = (VW - (mxx - mnx) * sx) / 2 - mnx * sx
    const oy = (VH - (mxy - mny) * sy) / 2 - mny * sy
    for (const p of pos) {
      p.x = p.x * sx + ox
      p.y = p.y * sy + oy
    }
  }
  fit(false)
  // 반지름 인식 겹침 완화 (노드 겹침 방지, 결정론적)
  for (let pass = 0; pass < 60; pass++) {
    let moved = false
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j].x - pos[i].x
        const dy = pos[j].y - pos[i].y
        const d = Math.hypot(dx, dy) || 0.01
        const need = rad[i] + rad[j] + 16
        if (d < need) {
          const push = (need - d) / 2
          const ux = dx / d
          const uy = dy / d
          pos[i].x -= ux * push
          pos[i].y -= uy * push
          pos[j].x += ux * push
          pos[j].y += uy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
  fit(true) // 프레임을 채우도록 최종 정규화
  return pos
}

export default function SignalNetwork() {
  const [focus, setFocus] = useState<string | null>(null)
  const [emphasize, setEmphasize] = useState(true)

  const model = useMemo(() => {
    const co = market.cooccurrence
    const dom = market.skillShare['국내']
    const countMap: Record<string, number> = {}
    techs.forEach((t) => {
      countMap[t.tech] = t.count
    })

    // 보유 집합: skillShare 국내 owned ∪ techYearly owned
    const owned = new Set<string>()
    dom.items.filter((i) => i.owned).forEach((i) => owned.add(i.tech))
    market.techYearly.series.filter((t) => t.owned).forEach((t) => owned.add(t.tech))

    // 노드 = 허브 ∪ 아이템 (중복 제거)
    const nameSet = new Set<string>()
    Object.keys(co).forEach((h) => {
      nameSet.add(h)
      co[h].items.forEach((i) => nameSet.add(i.tech))
    })
    const names = [...nameSet]
    const idx: Record<string, number> = {}
    names.forEach((n, i) => {
      idx[n] = i
    })

    // 엣지 = 허브→아이템, 상호 중복 제거(최대 coRate 유지)
    const emap: Record<string, { a: string; b: string; coRate: number; coCount: number }> = {}
    Object.keys(co).forEach((h) => {
      co[h].items.forEach((it) => {
        const key = [h, it.tech].sort().join('|')
        if (!emap[key] || it.coRate > emap[key].coRate) {
          emap[key] = { a: h, b: it.tech, coRate: it.coRate, coCount: it.coCount }
        }
      })
    })
    const rawEdges = Object.values(emap)

    // 반지름 = 수요(count) sqrt 스케일 → [13,36]
    const counts = names.map((n) => countMap[n] ?? 0)
    const smin = Math.sqrt(Math.min(...counts))
    const smax = Math.sqrt(Math.max(...counts))
    const radOf = (n: string) =>
      13 + ((Math.sqrt(countMap[n] ?? 0) - smin) / (smax - smin || 1)) * 23
    const rad = names.map(radOf)

    // 좌표 (한 번 계산 후 동결)
    const pos = computeLayout(names, rad, rawEdges, idx)

    // 인접(포커스용) + 차수
    const adj = new Map<string, Set<string>>()
    names.forEach((n) => adj.set(n, new Set()))
    rawEdges.forEach((e) => {
      adj.get(e.a)!.add(e.b)
      adj.get(e.b)!.add(e.a)
    })

    const nodes: LayNode[] = names.map((n, i) => {
      const nb = adj.get(n)!
      let ownedDeg = 0
      nb.forEach((m) => {
        if (owned.has(m)) ownedDeg += 1
      })
      return {
        tech: n,
        owned: owned.has(n),
        count: countMap[n] ?? 0,
        x: pos[i].x,
        y: pos[i].y,
        r: rad[i],
        deg: nb.size,
        ownedDeg,
      }
    })
    const nodeByName: Record<string, LayNode> = {}
    nodes.forEach((n) => {
      nodeByName[n.tech] = n
    })

    // 엣지 폭/투명도 (coRate 정규화)
    const crMin = Math.min(...rawEdges.map((e) => e.coRate))
    const crMax = Math.max(...rawEdges.map((e) => e.coRate))
    const edges: LayEdge[] = rawEdges.map((e) => {
      const t = clamp01((e.coRate - crMin) / (crMax - crMin || 1))
      const na = nodeByName[e.a]
      const nb = nodeByName[e.b]
      return {
        a: e.a,
        b: e.b,
        coRate: e.coRate,
        coCount: e.coCount,
        x1: na.x,
        y1: na.y,
        x2: nb.x,
        y2: nb.y,
        w: 0.5 + t * 1.5,
        op: 0.25 + t * 0.35,
        ownedTouch: owned.has(e.a) || owned.has(e.b),
      }
    })

    const ownedCount = nodes.filter((n) => n.owned).length
    const total = nodes.length
    const coverage = (ownedCount / total) * 100

    // 카드1: 가장 강한 동반 쌍 (coRate 상위)
    const topPairs = [...rawEdges]
      .sort((x, y) => y.coRate - x.coRate)
      .slice(0, 6)
      .map((e) => {
        // 허브(더 큰 수요)를 앞에 표기
        const [hub, tech] =
          (countMap[e.a] ?? 0) >= (countMap[e.b] ?? 0) ? [e.a, e.b] : [e.b, e.a]
        return {
          hub,
          tech,
          coRate: e.coRate,
          bothOwned: owned.has(e.a) && owned.has(e.b),
        }
      })

    // 카드2: 내 기술의 이웃 · 미보유 (보유 기술과 동반하지만 미보유, coRate 순)
    const gapNb: Record<string, { tech: string; via: string; coRate: number; coCount: number }> = {}
    Object.keys(co).forEach((h) => {
      co[h].items.forEach((it) => {
        ;[
          [h, it.tech],
          [it.tech, h],
        ].forEach(([x, y]) => {
          if (owned.has(x) && !owned.has(y)) {
            if (!gapNb[y] || it.coRate > gapNb[y].coRate) {
              gapNb[y] = { tech: y, via: x, coRate: it.coRate, coCount: it.coCount }
            }
          }
        })
      })
    })
    const gapNeighbors = Object.values(gapNb).sort((a, b) => b.coRate - a.coRate)

    return {
      nodes,
      nodeByName,
      edges,
      adj,
      ownedCount,
      total,
      coverage,
      coverageInt: Math.trunc(coverage),
      coverageFrac: (Math.round(coverage * 10) / 10).toFixed(1).split('.')[1],
      topPairs,
      gapNeighbors,
      N: dom.N,
      asOf: dom.asOf,
      labelThreshold: 25, // 이 반지름 이상 노드만 상시 라벨
    }
  }, [])

  const focusNode = focus ? model.nodeByName[focus] : null
  const focusAdj = focus ? model.adj.get(focus)! : null
  const isActive = (tech: string) =>
    !focus || tech === focus || (focusAdj ? focusAdj.has(tech) : false)

  return (
    <div className="signal-stage sn-stage">
      <div className="sg-canvas">
        {/* ============ 헤더 ============ */}
        <header className="sg-head">
          <div className="sg-head__lead">
            <div className="sg-eyebrow">
              <Waypoints size={13} strokeWidth={2.4} />
              기술 동반수요 네트워크 · 실채용공고 기반
            </div>
            <h1 className="sg-title">함께 요구되는 기술의 지도</h1>
            <p className="sg-dek">
              한 공고가 어떤 기술을 함께 원하는지 잇고, 내 기술이 어디에 연결돼 있고, 바로 옆
              어떤 기술이 비어 있는지 봅니다.
            </p>
          </div>

          <div className="sg-cov">
            <div className="sg-cov__row">
              <div className="sg-cov__big">
                <span className="sg-num">{model.ownedCount}</span>
                <span className="sg-cov__frac">/{model.total}</span>
              </div>
              <span className="sn-covtag">
                <Check size={13} strokeWidth={2.8} />
                <span className="sg-num">{model.coverageInt}.{model.coverageFrac}%</span>
              </span>
            </div>
            <div className="sg-cov__label">
              핵심 기술 {model.total}개 중 {model.ownedCount}개를 연결 · 동반수요 그래프
            </div>
            <div className="sg-capsule">
              <span className="sg-capsule__fill" style={{ width: `${model.coverage}%` }} />
            </div>
            <div className="sg-foot">
              <Info size={11} strokeWidth={2.2} />
              출처: 실채용공고 {fmtN(model.N)}건 · {model.asOf}
            </div>
          </div>
        </header>

        {/* ============ 다크 히어로 패널 ============ */}
        <section className="sg-hero">
          <div className="sg-hero__bar">
            <div className="sg-hero__title">
              기술 네트워크 <span>동반수요 force graph</span>
            </div>
            <div className="sn-controls">
              <button
                type="button"
                className={`sn-toggle ${emphasize ? 'is-on' : ''}`}
                aria-pressed={emphasize}
                onClick={() => setEmphasize((v) => !v)}
              >
                <span className="sn-toggle__dot" />
                내 기술 강조
              </button>
              <div className="sg-seg" role="tablist" aria-label="지역">
                <button className="is-active" role="tab" aria-selected="true">
                  국내
                </button>
                <button
                  className="is-disabled"
                  role="tab"
                  aria-selected="false"
                  aria-disabled="true"
                  disabled
                >
                  국외
                </button>
              </div>
            </div>
          </div>

          <div className="sn-plotwrap">
            <svg
              className="sn-graph"
              viewBox={`0 0 ${VW} ${VH}`}
              role="img"
              aria-label="기술 동반수요 네트워크"
              onMouseLeave={() => setFocus(null)}
            >
              <defs>
                <radialGradient id="snOwned" cx="38%" cy="34%" r="72%">
                  <stop offset="0%" stopColor="#7ba0dd" />
                  <stop offset="52%" stopColor="#2f61b8" />
                  <stop offset="100%" stopColor="#254c92" />
                </radialGradient>
                <filter id="snGlow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>

              {/* ===== 엣지 (먼저 그림) ===== */}
              <g className="sn-edges">
                {model.edges.map((e) => {
                  const active = !focus || e.a === focus || e.b === focus
                  const stroke = e.ownedTouch ? '#3a4a66' : '#262a34'
                  const op = focus ? (active ? Math.min(0.75, e.op + 0.2) : 0.06) : e.op
                  const w = focus && active ? e.w + 0.4 : e.w
                  return (
                    <line
                      key={`${e.a}|${e.b}`}
                      x1={e.x1}
                      y1={e.y1}
                      x2={e.x2}
                      y2={e.y2}
                      stroke={stroke}
                      strokeWidth={w}
                      strokeLinecap="round"
                      opacity={op}
                    />
                  )
                })}
              </g>

              {/* ===== 노드 ===== */}
              <g className="sn-nodes">
                {model.nodes.map((n, i) => {
                  const active = isActive(n.tech)
                  // 기본 투명도: 포커스 시 비이웃은 0.15로, 아니면 보유/미보유 기준
                  let op: number
                  if (focus) op = active ? 1 : 0.15
                  else if (n.owned) op = 1
                  else op = emphasize ? 0.55 : 0.82
                  return (
                    <g
                      key={n.tech}
                      className="sn-node"
                      style={{ animationDelay: `${i * 22}ms`, opacity: op }}
                      onMouseEnter={() => setFocus(n.tech)}
                      onFocus={() => setFocus(n.tech)}
                      tabIndex={0}
                    >
                      {n.owned && (
                        <circle
                          className="sn-node__glow"
                          cx={n.x}
                          cy={n.y}
                          r={n.r + 5}
                          fill="#2f61b8"
                          opacity={emphasize || focus ? 0.5 : 0.32}
                          filter="url(#snGlow)"
                        />
                      )}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        fill={n.owned ? 'url(#snOwned)' : '#2a3140'}
                        stroke={n.owned ? '#eef3fb' : '#3a4150'}
                        strokeWidth={n.owned ? 1.5 : 1}
                      />
                    </g>
                  )
                })}
              </g>

              {/* ===== 라벨 (큰 노드 상시 + 포커스 이웃) ===== */}
              <g className="sn-labels">
                {model.nodes.map((n) => {
                  const active = isActive(n.tech)
                  const show =
                    (!focus && n.r >= model.labelThreshold) ||
                    (focus && active) ||
                    (!focus && n.owned && n.r >= 20)
                  if (!show) return null
                  const dim = focus ? !active : false
                  return (
                    <text
                      key={`lb-${n.tech}`}
                      x={n.x}
                      y={n.y + n.r + 14}
                      textAnchor="middle"
                      className={`sn-lbl ${n.owned ? 'is-owned' : 'is-gap'}`}
                      opacity={dim ? 0.12 : 1}
                    >
                      {n.tech}
                    </text>
                  )
                })}
              </g>
            </svg>

            {/* ===== 단일 포커스 사이드 pill (HTML) ===== */}
            {focusNode && (
              <aside className="sn-pill" aria-live="polite">
                <div className="sn-pill__head">
                  <span className={`sn-pill__dot ${focusNode.owned ? 'is-owned' : 'is-gap'}`} />
                  <span className="sn-pill__name">{focusNode.tech}</span>
                  {focusNode.owned && <span className="sn-pill__mine">내 기술</span>}
                </div>
                <div className="sn-pill__stat">
                  <span className="sn-pill__k">수요</span>
                  <span className="sn-pill__v sg-num">{fmtN(focusNode.count)}건</span>
                </div>
                <div className="sn-pill__stat">
                  <span className="sn-pill__k">동반 기술</span>
                  <span className="sn-pill__v sg-num">{focusNode.deg}개</span>
                </div>
                <div className="sn-pill__cov">
                  이웃 중{' '}
                  <b className="sg-num">
                    {focusNode.ownedDeg}/{focusNode.deg}
                  </b>{' '}
                  보유
                  <span className="sn-pill__bar">
                    <span
                      className="sn-pill__barfill"
                      style={{
                        width: `${focusNode.deg ? (focusNode.ownedDeg / focusNode.deg) * 100 : 0}%`,
                      }}
                    />
                  </span>
                </div>
              </aside>
            )}

            {/* faint 출처 라인 */}
            <div className="sn-source">동반율 = 해당 기술 공고 중 함께 요구된 비율 · {model.asOf}</div>
          </div>

          {/* 범례 */}
          <div className="sg-legend">
            <span className="sg-chip sg-chip--owned">
              <i />내 기술 (Owned)
            </span>
            <span className="sg-chip sg-chip--gap">
              <i />시장 (Gap)
            </span>
            <span className="sg-chip sg-chip--size">
              <i className="s1" />
              <i className="s2" />
              <i className="s3" />
              노드 크기 = 수요
            </span>
            <span className="sn-chip-edge">
              <i />연결 = 동반수요
            </span>
            <span className="sg-legend__spacer" />
            <span className="sg-legend__span">
              {model.total}개 기술 · {model.edges.length}개 연결
            </span>
          </div>
        </section>

        {/* ============ 하단 라이트 카드 2-up ============ */}
        <div className="sg-cards">
          <article className="sg-card">
            <div className="sg-card__head">
              <div className="sg-card__ic sg-card__ic--rise">
                <Link2 size={16} strokeWidth={2.2} />
              </div>
              <div>
                <div className="sg-card__title">가장 강한 동반 쌍</div>
                <div className="sg-card__sub">한 공고에서 함께 요구될 확률 상위</div>
              </div>
            </div>
            <ul className="sg-rows">
              {model.topPairs.map((p) => (
                <li key={`${p.hub}-${p.tech}`} className="sg-row sn-row-pair">
                  <span className="sg-row__name">
                    {p.hub}
                    <span className="sn-plus">+</span>
                    {p.tech}
                    {p.bothOwned && <span className="sg-row__mine">둘 다 보유</span>}
                  </span>
                  <span className="sg-row__demand sg-num">{p.coRate}%</span>
                  <span className="sn-bar-cell">
                    <span className="sn-bar">
                      <span className="sn-bar__fill" style={{ width: `${p.coRate}%` }} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="sg-card">
            <div className="sg-card__head">
              <div className="sg-card__ic sg-card__ic--gap">
                <Unlink size={16} strokeWidth={2.2} />
              </div>
              <div>
                <div className="sg-card__title">내 기술의 이웃 · 미보유</div>
                <div className="sg-card__sub">보유 기술과 자주 함께 뜨지만 아직 없는 기술</div>
              </div>
            </div>
            <ul className="sg-rows">
              {model.gapNeighbors.map((g) => (
                <li key={g.tech} className="sg-row">
                  <span className="sg-row__name">
                    {g.tech}
                    <span className="sn-via">{g.via} 옆</span>
                  </span>
                  <span className="sg-row__demand sg-num">{g.coRate}%</span>
                  <span className="sn-gap-delta">
                    <TrendingUp size={13} strokeWidth={2.6} />
                    <span className="sg-num">{fmtN(g.coCount)}건</span>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </div>
  )
}
