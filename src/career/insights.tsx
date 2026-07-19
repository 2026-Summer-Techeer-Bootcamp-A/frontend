import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { ChevronRight } from 'lucide-react'
import { AsOf, Heatmap } from './charts'
import { TechIcon } from './kit'
import { FONT, tooltipStyle } from '../pages/widgets/base'
import career from '../data/careerData.json'
import market from '../data/marketData.json'
import nRaw from '../data/pearl/n.json'
import y4Raw from '../data/pearl/y4.json'
import gRaw from '../data/pearl/g.json'
import './insights.css'

const RESUME: string[] = career.resume.skills

/* ============================================================
   홈 위젯 1 — 업종 적합도 레이더
   marketData.industry(업종×기술 실측 매트릭스)로 내 보유 기술이
   각 업종 수요의 몇 %를 커버하는지 계산 — 장식이 아니라 실측 적합도.
   ============================================================ */
const IND = market.industry as {
  asOf: string; N: number; industries: string[]; techs: string[]; matrix: number[][]
}

export function computeIndustryFit(skills: string[]) {
  const resumeSet = new Set(skills)
  return IND.industries.map((name, i) => {
    const row = IND.matrix[i]
    const total = row.reduce((a, b) => a + b, 0)
    const owned = row.reduce((s, v, j) => s + (resumeSet.has(IND.techs[j]) ? v : 0), 0)
    const gaps = IND.techs
      .map((t, j) => ({ t, v: row[j] }))
      .filter((x) => !resumeSet.has(x.t))
      .sort((a, b) => b.v - a.v)
    return { name, pct: total ? Math.round((owned / total) * 100) : 0, topGap: gaps[0]?.t }
  })
}

export function IndustryFitRadar({ skills = RESUME }: { skills?: string[] }) {
  const industryFit = useMemo(() => computeIndustryFit(skills), [skills])

  const worstFit = useMemo(() => [...industryFit].sort((a, b) => a.pct - b.pct)[0], [industryFit])
  const bestFit = useMemo(() => [...industryFit].sort((a, b) => b.pct - a.pct)[0], [industryFit])

  const option = useMemo(() => ({
    tooltip: {
      ...tooltipStyle,
      formatter: (p: { data: { value: number[] } }) => {
        const idx = p.data.value
        return industryFit.map((d, i) => `${d.name} <b>${idx[i]}%</b>`).join('<br/>')
      },
    },
    radar: {
      indicator: industryFit.map((d) => ({ name: d.name, max: 100 })),
      shape: 'polygon',
      radius: '68%',
      splitNumber: 4,
      axisName: { color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
      splitLine: { lineStyle: { color: '#e6e9ef' } },
      splitArea: { areaStyle: { color: ['#fbfcfe', '#f4f7fb'] } },
      axisLine: { lineStyle: { color: '#e2e5ec' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: industryFit.map((d) => d.pct), name: '내 적합도',
        areaStyle: { color: 'rgba(11, 11, 12,0.22)' },
        lineStyle: { color: '#0b0b0c', width: 2.5 },
        itemStyle: { color: '#0b0b0c', borderColor: '#fff', borderWidth: 1.5 },
        symbolSize: 5,
      }],
    }],
  }), [industryFit])

  return (
    <div>
      <ReactECharts option={option} style={{ height: 232 }} notMerge />
      <div className="ins-radar__cap">
        가장 잘 맞는 업종은 <b>{bestFit.name}</b>({bestFit.pct}%) · 가장 낮은 업종은{' '}
        <b>{worstFit.name}</b>({worstFit.pct}%) — <TechIcon tech={worstFit.topGap ?? ''} size={14} /> <b>{worstFit.topGap}</b> 미보유 영향이 커요
      </div>
      <AsOf asOf={IND.asOf} n={IND.N} note="국내 분류 가능 공고" />
    </div>
  )
}

/* ============================================================
   홈 위젯 3 — 연쇄 기술 로드맵
   pearl/n.json 공동출현 엣지에서 "내가 아는 기술 → 그 기술과 강하게 얽힌
   미보유 기술" 관계 top3를 체인으로 — 일반적 인기 기술 나열이 아니라
   내 스택에 근거한 다음 스텝.
   ============================================================ */
type NNode = { tech: string; n: number; owned: boolean; category: string }
type NEdge = { a: string; b: string; n: number; strength: number }
const N_DATA = (nRaw as unknown as { as_of: string; sample_size: number; sample_note: string; data: { nodes: NNode[]; edges: NEdge[] } })
const NODE_MAP = new Map(N_DATA.data.nodes.map((x) => [x.tech, x]))

export function computeTechChain(skills: string[], limit = 4) {
  const resumeSet = new Set(skills)
  const cands: { from: string; to: string; strength: number; n: number }[] = []
  for (const e of N_DATA.data.edges) {
    const aOwned = resumeSet.has(e.a)
    const bOwned = resumeSet.has(e.b)
    if (aOwned && !bOwned) cands.push({ from: e.a, to: e.b, strength: e.strength, n: NODE_MAP.get(e.b)?.n ?? 0 })
    else if (bOwned && !aOwned) cands.push({ from: e.b, to: e.a, strength: e.strength, n: NODE_MAP.get(e.a)?.n ?? 0 })
  }
  cands.sort((x, y) => y.strength - x.strength)
  const seen = new Set<string>()
  const out: typeof cands = []
  for (const c of cands) {
    if (seen.has(c.to)) continue
    seen.add(c.to)
    out.push(c)
    if (out.length >= limit) break
  }
  return out
}

export function TechChainRoadmap({ skills = RESUME, limit = 4 }: { skills?: string[]; limit?: number }) {
  const chain = useMemo(() => computeTechChain(skills, limit), [skills, limit])

  return (
    <div className="ins-chain">
      {chain.map((c, i) => (
        <div className="ins-chain__step" key={c.to}>
          <div className="ins-chain__badge">{i + 1}</div>
          <div className="ins-chain__body">
            <div className="ins-chain__t">
              <TechIcon tech={c.from} size={18} /> <ChevronRight size={13} className="ins-chain__arrow" /> <b>{c.to}</b>
            </div>
            <div className="ins-chain__sub">
              {c.from} 보유자의 <b>{Math.round(c.strength * 100)}%</b>가 함께 요구 · {c.n.toLocaleString()}건
            </div>
          </div>
        </div>
      ))}
      <AsOf asOf={N_DATA.as_of} n={N_DATA.sample_size} note={N_DATA.sample_note} />
    </div>
  )
}

/* ============================================================
   통계 탭 — 기술 공동출현 네트워크 그래프 (WidgetN 적응)
   ============================================================ */
const CAT_COLOR: Record<string, string> = {
  language: '#0b0b0c', frontend: '#4fa88a', backend: '#8a6fc4', data_db: '#d68a3c',
  cloud_services: '#2f9bd6', devops: '#6b7280', ai_llm: '#b8892b', mobile: '#c0568a',
}
const CAT_LABEL: Record<string, string> = {
  language: '언어', frontend: '프론트엔드', backend: '백엔드', data_db: '데이터·DB',
  cloud_services: '클라우드', devops: '데브옵스', ai_llm: 'AI/LLM', mobile: '모바일',
}
const OWNED_RING = '#18181b'

export function TechCoNetworkGraph({ skills = RESUME, resumeOnly = false }: { skills?: string[]; resumeOnly?: boolean }) {
  const resumeSet = useMemo(() => new Set(skills), [skills])
  const focusedTechs = useMemo(() => {
    if (!resumeOnly || resumeSet.size === 0) return null
    const visible = new Set(skills.filter((skill) => NODE_MAP.has(skill)))
    skills.forEach((skill) => {
      N_DATA.data.edges
        .filter((edge) => edge.a === skill || edge.b === skill)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5)
        .forEach((edge) => { visible.add(edge.a); visible.add(edge.b) })
    })
    return visible.size > 0 ? visible : null
  }, [resumeOnly, resumeSet, skills])
  const nodes = useMemo(
    () => focusedTechs ? N_DATA.data.nodes.filter((node) => focusedTechs.has(node.tech)) : N_DATA.data.nodes,
    [focusedTechs],
  )
  const edges = useMemo(
    () => focusedTechs ? N_DATA.data.edges.filter((edge) => focusedTechs.has(edge.a) && focusedTechs.has(edge.b)) : N_DATA.data.edges,
    [focusedTechs],
  )
  const maxN = Math.max(...nodes.map((n) => n.n))
  const categories = [...new Set(nodes.map((n) => n.category))]
  const option = useMemo(() => ({
    animationDuration: 800, animationEasing: 'cubicOut',
    tooltip: {
      ...tooltipStyle,
      formatter: (p: { dataType: string; data: { raw: NNode | NEdge } }) => {
        if (p.dataType === 'edge') {
          const e = p.data.raw as NEdge
          return `<b>${e.a} × ${e.b}</b><br/>같이 요구되는 공고 ${e.n.toLocaleString()}건`
        }
        const n = p.data.raw as NNode
        const isOwned = resumeSet.has(n.tech)
        return `<b>${n.tech}</b> <span style="color:${CAT_COLOR[n.category]}">· ${CAT_LABEL[n.category]}</span>${isOwned ? ' <span style="color:#18181b">· 보유</span>' : ''}<br/>공고 ${n.n.toLocaleString()}건`
      },
    },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      force: { repulsion: 130, edgeLength: [30, 80], gravity: 0.14, friction: 0.35 },
      symbolSize: (_v: unknown, p: { data: { raw: NNode } }) => 8 + Math.sqrt(p.data.raw.n / maxN) * 24,
      label: { show: true, position: 'right', distance: 4, fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#43454c' },
      labelLayout: { hideOverlap: true },
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 }, label: { fontWeight: 800 } },
      blur: { itemStyle: { opacity: 0.12 }, lineStyle: { opacity: 0.04 }, label: { opacity: 0.2 } },
      data: nodes.map((n) => {
        const isOwned = resumeSet.has(n.tech)
        return {
          name: n.tech, raw: n,
          itemStyle: {
            color: CAT_COLOR[n.category], borderColor: isOwned ? OWNED_RING : '#fff',
            borderWidth: isOwned ? 3 : 1.2, shadowBlur: isOwned ? 6 : 0, shadowColor: 'rgba(33,68,124,0.4)',
          },
        }
      }),
      links: edges.map((e) => ({
        source: e.a, target: e.b, raw: e,
        lineStyle: { width: 0.6 + e.strength * 3.2, color: 'rgba(90,100,120,0.28)', curveness: 0.1 },
      })),
    }],
  }), [nodes, edges, maxN, resumeSet])
  return (
    <div>
      <ReactECharts option={option} className="ins-network-chart" style={{ height: 420 }} notMerge />
      <div className="ins-legend" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        {categories.map((c) => <span key={c}><i style={{ background: CAT_COLOR[c] }} /> {CAT_LABEL[c]}</span>)}
        <span><i style={{ background: 'transparent', border: `2px solid ${OWNED_RING}` }} /> 보유</span>
      </div>
      <div className="ins-hint">드래그로 움직이거나 확대해보세요 · 노드 크기=공고수 · 선 굵기=동시요구 강도</div>
      <AsOf asOf={N_DATA.as_of} n={N_DATA.sample_size} note={N_DATA.sample_note} />
    </div>
  )
}

/* ============================================================
   통계 탭 — 트렌드 전파 네트워크 (WidgetY4 적응, 글로벌 전용)
   ============================================================ */
type Y4Edge = { leader: string; follower: string; lag: number; corr: number; lc: string; fc: string }
const Y4 = y4Raw as unknown as { as_of: string; sample_size: number; sample_note: string; data: { edges: Y4Edge[]; cat_ko: Record<string, string> } }

export function TrendPropagationGraph() {
  const edges = Y4.data.edges
  const cat: Record<string, string> = {}
  edges.forEach((e) => { cat[e.leader] = e.lc; cat[e.follower] = e.fc })
  const nodes = Object.keys(cat)
  const outdeg: Record<string, number> = {}
  edges.forEach((e) => { outdeg[e.leader] = (outdeg[e.leader] ?? 0) + 1 })
  const catsPresent = [...new Set(nodes.map((n) => cat[n]))]
  const option = useMemo(() => ({
    animationDuration: 800,
    tooltip: {
      ...tooltipStyle,
      formatter: (p: { dataType: string; data: { raw?: Y4Edge }; name: string }) => {
        if (p.dataType === 'edge' && p.data.raw) {
          const e = p.data.raw
          return `<b>${e.leader}</b> 뜨면 <b>${e.lag}달</b> 뒤 <b>${e.follower}</b><br/>교차상관 r=${e.corr}`
        }
        return `<b>${p.name}</b> <span style="color:${CAT_COLOR[cat[p.name]]}">· ${Y4.data.cat_ko[cat[p.name]] ?? cat[p.name]}</span>`
      },
    },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      force: { repulsion: 120, edgeLength: [26, 65], gravity: 0.16, friction: 0.35 },
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 7],
      symbolSize: (_v: unknown, p: { name: string }) => 10 + (outdeg[p.name] ?? 0) * 5,
      label: { show: true, position: 'right', fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#43454c' },
      labelLayout: { hideOverlap: true },
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 }, label: { fontWeight: 800 } },
      blur: { itemStyle: { opacity: 0.12 }, lineStyle: { opacity: 0.05 }, label: { opacity: 0.2 } },
      data: nodes.map((n) => ({ name: n, itemStyle: { color: CAT_COLOR[cat[n]] ?? '#888', borderColor: '#fff', borderWidth: 1.2 } })),
      links: edges.map((e) => ({
        source: e.leader, target: e.follower, raw: e,
        lineStyle: { width: 0.6 + (e.corr - 0.5) * 6, color: 'rgba(90,100,120,0.35)', curveness: 0.15 },
      })),
    }],
  }), [edges, nodes, outdeg, cat])
  return (
    <div>
      <div className="ins-scopebadge">글로벌 전용 · HN 커뮤니티 언급 기준</div>
      <ReactECharts option={option} style={{ height: 280 }} notMerge />
      <div className="ins-legend" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        {catsPresent.map((c) => <span key={c}><i style={{ background: CAT_COLOR[c] }} /> {Y4.data.cat_ko[c] ?? c}</span>)}
      </div>
      <div className="ins-hint">화살표 = 선행 기술이 뜬 뒤 후행 기술이 따라 뜬 시차 · 상관≠인과(참고용)</div>
      <AsOf asOf={Y4.as_of} n={Y4.sample_size} note={Y4.sample_note} />
    </div>
  )
}

/** 네트워크 그래프 옆 요약패널용 — 연결강도(n) 상위 기술. */
export function getNetworkTopConnections(limit = 5): { tech: string; n: number }[] {
  return [...N_DATA.data.nodes].sort((a, b) => b.n - a.n).slice(0, limit).map((n) => ({ tech: n.tech, n: n.n }))
}

/** 요약패널 Top-N 각 기술의 동반출현 상위 상대 기술 — a/b 어느 쪽이든 해당 기술이 걸린
    엣지에서 상대를 뽑아 동시요구 공고수(n) 내림차순 top-limit. (additive) */
export function getNetworkTopPairs(tech: string, limit = 3): { partner: string; n: number }[] {
  return N_DATA.data.edges
    .filter((e) => e.a === tech || e.b === tech)
    .map((e) => ({ partner: e.a === tech ? e.b : e.a, n: e.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
}

/** 트렌드 전파 그래프 옆 요약패널용 — 선도 기술(출발 엣지 수) 상위. */
export function getPropagationTopLeaders(limit = 5): { tech: string; count: number }[] {
  const outdeg: Record<string, number> = {}
  Y4.data.edges.forEach((e) => { outdeg[e.leader] = (outdeg[e.leader] ?? 0) + 1 })
  return Object.entries(outdeg).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tech, count]) => ({ tech, count }))
}

/* ============================================================
   통계 탭 — 기업 규모별(대기업/중견/중소) 기술 요구 차이
   careerData.json 국내 공고 실측 집계(클라이언트 계산) · "격차 큰 순" 정렬.
   ============================================================ */
const DOM_POSTINGS = (career.postings as { pool: string; tier: string | null; techs: string[] }[]).filter((p) => p.pool === '국내')
const TIER_LIST = ['대기업', '중견', '중소'] as const
const TIER_COLOR: Record<string, string> = { 대기업: 'var(--accent-700)', 중견: 'var(--c-accent)', 중소: 'var(--accent-300)' }

function buildTierRows() {
  const byTier: Record<string, Record<string, number>> = { 대기업: {}, 중견: {}, 중소: {} }
  const totalByTier: Record<string, number> = { 대기업: 0, 중견: 0, 중소: 0 }
  for (const p of DOM_POSTINGS) {
    const tier = p.tier ?? ''
    if (!(tier in byTier)) continue
    totalByTier[tier] += 1
    for (const t of p.techs) byTier[tier][t] = (byTier[tier][t] ?? 0) + 1
  }
  const allTechs = new Set<string>()
  TIER_LIST.forEach((tier) => Object.keys(byTier[tier]).forEach((t) => allTechs.add(t)))
  const rows = [...allTechs]
    .map((tech) => {
      const shares = TIER_LIST.map((tier) => (totalByTier[tier] ? Math.round((byTier[tier][tech] ?? 0) / totalByTier[tier] * 1000) / 10 : 0))
      const counts = TIER_LIST.map((tier) => byTier[tier][tech] ?? 0)
      return { tech, shares, spread: Math.max(...shares) - Math.min(...shares), maxCount: Math.max(...counts) }
    })
    .filter((r) => r.maxCount >= 3)
  rows.sort((a, b) => b.spread - a.spread)
  return { rows, totalByTier, byTier }
}
const TIER_DATA = buildTierRows()
const TIER_HEAT_TECHS = TIER_DATA.rows.slice(0, 6).map((r) => r.tech)
const TIER_HEAT_MATRIX = TIER_LIST.map((_, ti) => TIER_HEAT_TECHS.map((_, techi) => TIER_DATA.rows[techi].shares[ti]))

/** 보유 기술 중 "기업 규모에 따라 요구율이 뚜렷이 갈리는" 기술만 추려 신호로 삼는다.
 * Python/AWS/Git 같은 흔한 기술은 티어 간 편차가 5%p 안팎이라 전부 평균 내면 항상
 * 30~36% 근처로 밋밋하게 나오는 문제가 있었음(사용자 피드백) — 편차 15%p 이상인
 * 기술이 하나도 없으면 "차이 없음"을 정직하게 반환한다. */
const TIER_SIGNAL_THRESHOLD = 15
export function computeTierSignal(skills: string[], threshold = TIER_SIGNAL_THRESHOLD) {
  const signalRows = TIER_DATA.rows.filter((r) => r.spread >= threshold)
  const pool = skills.length ? signalRows.filter((r) => skills.includes(r.tech)) : signalRows.slice(0, 5)
  if (!pool.length) return { hasSignal: false as const }
  const picked = [...pool].sort((a, b) => b.spread - a.spread).slice(0, 5)
  const sums = TIER_LIST.map((_, i) => picked.reduce((s, r) => s + r.shares[i], 0) / picked.length)
  const tot = sums.reduce((a, b) => a + b, 0) || 1
  return {
    hasSignal: true as const,
    items: TIER_LIST.map((tier, i) => ({ tier, pct: Math.round((sums[i] / tot) * 100) })),
    examples: picked.slice(0, 3).map((r) => r.tech),
  }
}

/** 한눈에 보는 티어×기술 요구율 히트맵. 대기업·중견·중소는 실제 매출·인원 데이터가 아니라
 * 잘 알려진 국내 기업 20개씩을 수동으로 분류한 것 — "레거시→신진"의 진짜 시계열 근거는
 * 아래 GenerationTrendChart(establishDate 실측)를 참고. */
export function TierCompareChart() {
  return (
    <div className="ins-tier">
      <div className="ins-tier__hint">격차가 큰 상위 {TIER_HEAT_TECHS.length}개 기술 · 진하기=요구 비율</div>
      <Heatmap rows={[...TIER_LIST]} cols={TIER_HEAT_TECHS} matrix={TIER_HEAT_MATRIX} />
      <div className="ins-tier__legend">
        {TIER_LIST.map((tier) => <span key={tier}><i style={{ background: TIER_COLOR[tier] }} /> {tier}(N={TIER_DATA.totalByTier[tier]})</span>)}
      </div>
      <AsOf asOf={career.meta.asOf} note="국내 유명 기업 20개씩 수동 분류 · 실제 매출/인원 기준 아님" />
    </div>
  )
}

/* ============================================================
   통계 탭 — 레거시→신진 기업 세대별 기술 변화 (WidgetG 적응)
   ============================================================ */
type GGen = { key: string; label: string; n: number }
type GRow = { tech: string; shares: number[]; trend: number }
const G_DATA = gRaw as unknown as { as_of: string; sample_size: number; sample_note: string; data: { generations: GGen[]; matrix: GRow[] } }

export function computeGenerationAffinity(skills: string[]) {
  const resumeSet = new Set(skills)
  const D = G_DATA.data
  const mine = D.matrix.filter((m) => resumeSet.has(m.tech))
  const base = mine.length ? mine : D.matrix
  const sums = [0, 1, 2].map((g) => base.reduce((a, m) => a + m.shares[g], 0) / base.length)
  const tot = sums.reduce((a, b) => a + b, 0) || 1
  return sums.map((s) => Math.round((s / tot) * 100))
}

/** computeTierSignal과 같은 원칙 — 설립 세대 간 점유율 편차가 뚜렷한(15%p 이상) 기술만
 * 신호로 삼는다. 없으면 "차이 없음"을 정직하게 반환. */
const GEN_SIGNAL_THRESHOLD = 15
export function computeGenerationSignal(skills: string[], threshold = GEN_SIGNAL_THRESHOLD) {
  const withSpread = G_DATA.data.matrix.map((m) => ({ ...m, spread: Math.max(...m.shares) - Math.min(...m.shares) }))
  const signalRows = withSpread.filter((m) => m.spread >= threshold)
  const pool = skills.length ? signalRows.filter((m) => skills.includes(m.tech)) : [...signalRows].sort((a, b) => b.spread - a.spread).slice(0, 5)
  if (!pool.length) return { hasSignal: false as const }
  const picked = [...pool].sort((a, b) => b.spread - a.spread).slice(0, 5)
  const sums = [0, 1, 2].map((g) => picked.reduce((s, m) => s + m.shares[g], 0) / picked.length)
  const tot = sums.reduce((a, b) => a + b, 0) || 1
  return {
    hasSignal: true as const,
    pcts: sums.map((s) => Math.round((s / tot) * 100)),
    examples: picked.slice(0, 3).map((m) => m.tech),
  }
}

export function GenerationTrendChart({ skills = RESUME }: { skills?: string[] }) {
  const resumeSet = useMemo(() => new Set(skills), [skills])
  const D = G_DATA.data
  const affinity = useMemo(() => computeGenerationAffinity(skills), [skills])
  const domIdx = affinity.indexOf(Math.max(...affinity))
  const genShort = ['레거시', '성장기', '신생']
  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 8, right: 78, top: 16, bottom: 30, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { seriesName: string }) => {
        const m = D.matrix.find((x) => x.tech === p.seriesName)!
        return `<b>${m.tech}</b> ${resumeSet.has(m.tech) ? '<span style="color:#0b0b0c">· 보유</span>' : ''}<br/>${D.generations.map((g, i) => `${g.label.replace('\n', ' ')} <b>${m.shares[i]}%</b>`).join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: D.generations.map((g) => g.label),
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 10.5, fontWeight: 700, lineHeight: 13 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: D.matrix.map((m) => {
      const rising = m.trend >= 0
      const col = rising ? '#0b0b0c' : '#c8382d'
      const isMine = resumeSet.has(m.tech)
      return {
        name: m.tech, type: 'line', data: m.shares, smooth: false,
        symbol: 'circle', symbolSize: isMine ? 7 : 5,
        lineStyle: { color: col, width: isMine ? 2.6 : 1.4, opacity: isMine ? 1 : 0.5 },
        itemStyle: { color: col, borderColor: '#fff', borderWidth: 1.2, opacity: isMine ? 1 : 0.5 },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        endLabel: { show: true, formatter: `${m.tech} ${m.trend > 0 ? '+' : ''}${m.trend}`, color: col, fontFamily: FONT, fontSize: 10, fontWeight: 700, distance: 6 },
        z: isMine ? 5 : 2,
      }
    }),
  }), [D, resumeSet])
  return (
    <div className="ins-gen">
      <ReactECharts option={option} style={{ height: 260 }} notMerge />
      <div className="ins-legend" style={{ marginTop: 4 }}>
        <span><i style={{ background: '#0b0b0c' }} /> 신생일수록 상승</span>
        <span><i style={{ background: '#c8382d' }} /> 신생일수록 하락</span>
      </div>
      <div className="ins-gen__panel">
        {[2, 1, 0].map((gi) => (
          <div key={gi} className={`ins-gen__bar${gi === domIdx ? ' dom' : ''}`}>
            <span className="ins-gen__blabel">{genShort[gi]}</span>
            <span className="ins-gen__track"><i style={{ width: `${affinity[gi]}%` }} /></span>
            <b className="ins-gen__val">{affinity[gi]}%</b>
          </div>
        ))}
        <p className="ins-gen__verdict">당신 스택은 <b>{genShort[domIdx]} 회사</b> 체질이에요</p>
      </div>
      <AsOf asOf={G_DATA.as_of} n={G_DATA.sample_size} note={G_DATA.sample_note} />
    </div>
  )
}

/* ============================================================
   통계 탭 — 국내 다년간 기술 점유율 추이 (2022~2025 · 점핏 단일 소스)
   소스 믹스가 안정된 단일 소스로 고정해 연도 비교 왜곡을 배제.
   ============================================================ */
type YearlyRow = { tech: string; owned: boolean; shares: number[]; delta: number }
const YEARLY = market.techYearly as { asOf: string; source: string; N: number; years: string[]; series: YearlyRow[] }

export function TechYearlyTrendChart({ skills = RESUME }: { skills?: string[] }) {
  const resumeSet = useMemo(() => new Set(skills), [skills])
  const rows = useMemo(() => {
    return YEARLY.series.map(row => ({
      ...row,
      owned: resumeSet.has(row.tech)
    })).slice(0, 6)
  }, [resumeSet])

  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 8, right: 68, top: 16, bottom: 26, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { seriesName: string }) => {
        const m = rows.find((x) => x.tech === p.seriesName)!
        return `<b>${m.tech}</b>${m.owned ? ' <span style="color:#0b0b0c">· 보유</span>' : ''}<br/>${YEARLY.years.map((y, i) => `${y} <b>${m.shares[i]}%</b>`).join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: YEARLY.years,
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: rows.map((m) => {
      const rising = m.delta >= 0
      const col = rising ? '#0b0b0c' : '#c8382d'
      return {
        name: m.tech, type: 'line', data: m.shares, smooth: 0.2,
        symbol: 'circle', symbolSize: m.owned ? 7 : 5,
        lineStyle: { color: col, width: m.owned ? 2.6 : 1.4, opacity: m.owned ? 1 : 0.55 },
        itemStyle: { color: col, borderColor: '#fff', borderWidth: 1.2, opacity: m.owned ? 1 : 0.55 },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        endLabel: { show: true, formatter: `${m.tech}`, color: col, fontFamily: FONT, fontSize: 10, fontWeight: 700, distance: 6 },
        labelLayout: { moveOverlap: 'shiftY' },
        z: m.owned ? 5 : 2,
      }
    }),
  }), [rows])
  return (
    <div>
      <ReactECharts option={option} style={{ height: 260 }} notMerge />
      <div className="ins-legend" style={{ marginTop: 4 }}>
        <span><i style={{ background: '#0b0b0c' }} /> 상승 · 보유는 굵은 선</span>
        <span><i style={{ background: '#c8382d' }} /> 하락</span>
      </div>
      <AsOf asOf={YEARLY.asOf} n={YEARLY.N} note={`${YEARLY.source} 단일 소스 · 소스 믹스 왜곡 배제`} />
    </div>
  )
}

/** 다년간 추이의 급상승·급감 Top5 랭킹 바. */
export function TechMoversBar() {
  const top = YEARLY.series.slice(0, 6)
  const max = Math.max(...top.map((r) => Math.abs(r.delta)), 1)
  return (
    <div className="ins-mov">
      {top.map((r) => {
        const rising = r.delta >= 0
        return (
          <div className="ins-mov__row" key={r.tech}>
            <div className="ins-mov__k"><TechIcon tech={r.tech} size={16} /> {r.tech}</div>
            <div className="ins-mov__tr">
              <i
                className={rising ? 'up' : 'down'}
                style={{ width: `${(Math.abs(r.delta) / max) * 100}%` }}
              />
            </div>
            <div className={`ins-mov__v ${rising ? 'up' : 'down'}`}>{rising ? '+' : ''}{r.delta}%p</div>
          </div>
        )
      })}
      <AsOf asOf={YEARLY.asOf} n={YEARLY.N} note={`${YEARLY.years[0]}→${YEARLY.years[YEARLY.years.length - 1]} 점유율 변화`} />
    </div>
  )
}

/* ============================================================
   시장 인기 기술 위젯 — 히트 스트립 (시안 2c)
   기술마다 연도별 점유율을 히트 셀로 깔고 오른쪽에 최신 비율 + 등락 배지를
   붙인다. 월별 데이터는 없음 — techYearly가 가진 해상도는 연도(2022~2025,
   jumpit 단일소스)뿐이라 셀 라벨도 연도로 표기한다(월별을 지어내지 않음).
   같은 이유로 techYearly에 없는 기술(예: JavaScript, React 등 skillShare
   상위권)은 이 위젯엔 등장하지 않는다 — 순위가 아니라 "연도 추이가 실측된
   기술"만 다루는 별도 관점의 위젯이라는 뜻. 국내(jumpit) 단일 소스라 풀
   토글과 무관하게 항상 국내 값을 보여주며 배지로 이를 밝힌다. */
export function TechDemandHeatStrip({ onSelect }: { onSelect?: (tech: string) => void }) {
  const rows = useMemo(
    () => [...YEARLY.series].sort((a, b) => b.shares[b.shares.length - 1] - a.shares[a.shares.length - 1]),
    [],
  )
  const globalMax = useMemo(() => Math.max(...YEARLY.series.flatMap((r) => r.shares)), [])

  return (
    <div className="ins-heat">
      <div className="ins-scopebadge">국내 전용 · {YEARLY.source} 단일 소스</div>
      <div className="ins-heat__rows">
        {rows.map((r) => {
          const current = r.shares[r.shares.length - 1]
          const rising = r.delta >= 0
          return (
            <button
              type="button"
              className="ins-heat__row"
              key={r.tech}
              onClick={() => onSelect?.(r.tech)}
            >
              <span className="ins-heat__k"><TechIcon tech={r.tech} size={16} /> {r.tech}</span>
              <span className="ins-heat__cells">
                {r.shares.map((v, i) => (
                  <i key={YEARLY.years[i]} style={{ opacity: Math.max(0.14, v / globalMax) }} />
                ))}
              </span>
              <span className="ins-heat__v">
                {current}%
                <span className={`ins-heat__badge ${rising ? 'up' : 'down'}`}>
                  {rising ? '▲' : '▼'}{Math.abs(r.delta)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="ins-heat__yscale">
        <span className="ins-heat__yscale-spacer" />
        <span className="ins-heat__yscale-cells">
          {YEARLY.years.map((y) => <span key={y}>{y}</span>)}
        </span>
        <span className="ins-heat__yscale-spacer" />
      </div>
      <AsOf asOf={YEARLY.asOf} n={YEARLY.N} note="연도별 셀 · 월별 데이터는 미보유" />
    </div>
  )
}
