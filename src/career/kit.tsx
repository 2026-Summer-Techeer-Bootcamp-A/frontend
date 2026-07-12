import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Search, Plus, Check, X, Settings2 } from 'lucide-react'
import {
  siPython, siJavascript, siTypescript, siReact, siNodedotjs, siPostgresql, siGit,
  siDocker, siHtml5, siCss, siMysql, siLinux, siKubernetes, siGooglecloud, siTerraform,
  siSpring, siDjango, siKotlin, siSwift, siGo, siRust, siVuedotjs, siFastapi, siRedis,
  siMongodb, siGraphql, siApachekafka, siRuby, siPhp, siNginx, siElasticsearch,
  siFlutter, siJira, siNextdotjs, siExpress, siMariadb,
} from 'simple-icons'
import { Sparkline } from './charts'
import { useDashboardConfig, toggleWidget, type WidgetSection } from './dashboardConfig'
import './kit.css'

// 실제 브랜드 아이콘 (simple-icons). 상표 이슈로 없는 것은 이니셜 배지로 폴백.
const ICONS: Record<string, { path: string; hex: string }> = {
  Python: siPython, JavaScript: siJavascript, TypeScript: siTypescript, React: siReact,
  'Node.js': siNodedotjs, Node: siNodedotjs, PostgreSQL: siPostgresql, Git: siGit, Docker: siDocker,
  HTML: siHtml5, CSS: siCss, MySQL: siMysql, Linux: siLinux, Kubernetes: siKubernetes, GCP: siGooglecloud,
  Terraform: siTerraform, Spring: siSpring, Django: siDjango, Kotlin: siKotlin, Swift: siSwift,
  Go: siGo, Golang: siGo, Rust: siRust, Vue: siVuedotjs, FastAPI: siFastapi, Redis: siRedis,
  MongoDB: siMongodb, GraphQL: siGraphql, Kafka: siApachekafka, Ruby: siRuby, PHP: siPhp, Nginx: siNginx,
  Elasticsearch: siElasticsearch, Flutter: siFlutter, Jira: siJira, 'Next.js': siNextdotjs,
  Express: siExpress, MariaDB: siMariadb,
}

/* ============================================================
   커리어 앱 위젯 킷 — Apple 톤 + 슬레이트블루, 과장식 없음.
   벤치마크(Glassdoor/LinkedIn/Tableau Pulse) 위계 원칙 반영.
   ============================================================ */

/* ---------- 애니메이션 게이지 (반원, stroke-dashoffset 트랜지션) ---------- */
export function ArcGauge({ pct, size = 168, ghost }: { pct: number; size?: number; ghost?: number }) {
  const r = 70
  const len = Math.PI * r // 반원 길이
  const off = (v: number) => len * (1 - Math.max(0, Math.min(100, v)) / 100)
  return (
    <svg viewBox="0 0 180 96" style={{ width: size, height: (size * 96) / 180 }} className="kit-arc">
      <path d="M20 82 A70 70 0 0 1 160 82" fill="none" stroke="#e7ecf4" strokeWidth="13" strokeLinecap="round" />
      {ghost != null && ghost > pct && (
        <path
          d="M20 82 A70 70 0 0 1 160 82" fill="none" stroke="var(--accent-200)" strokeWidth="13" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={off(ghost)} className="kit-arc__ghost"
        />
      )}
      <path
        d="M20 82 A70 70 0 0 1 160 82" fill="none" stroke="var(--c-accent)" strokeWidth="13" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={off(pct)} className="kit-arc__fill"
      />
    </svg>
  )
}

/* ---------- 1. 포지셔닝 점수 히어로 ---------- */
export function StatHero({
  value, unit = '%', title, sub, tag, rings, legend,
}: { value: number; unit?: string; title: string; sub?: ReactNode; tag?: ReactNode; rings?: ReactNode; legend?: ReactNode }) {
  const n = useCountUp(value)
  return (
    <div className="kit-hero">
      <div className="kit-hero__label">{title}</div>
      <div className="kit-hero__row">
        <div className="kit-hero__num">
          {n}<span className="kit-hero__unit">{unit}</span>
          {tag && <span className="kit-hero__tag">{tag}</span>}
        </div>
        {rings && <div className="kit-hero__rings">{rings}</div>}
      </div>
      {sub && <div className="kit-hero__sub">{sub}</div>}
      {legend && <div className="kit-hero__legend">{legend}</div>}
    </div>
  )
}

/* ---------- Apple 운동 링 스타일 2-지표 통합 요약 ----------
   장식용이 아니라, 히어로 숫자(기술 커버리지) 하나로는 안 보이는
   "도달률"(실제 지원 가능한 공고 비율)을 함께 겹쳐 보여주는 요약. */
export type RingMetric = { key: string; label: string; pct: number; ghost?: number; color: string; note?: string }

export function ActivityRings({ metrics, size = 66, trackColor = 'var(--accent-50)' }: { metrics: RingMetric[]; size?: number; trackColor?: string }) {
  const sw = size * 0.115
  const gap = sw * 0.32
  const c = size / 2
  const pad = 1.5
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="kit-rings">
      {metrics.map((m, i) => {
        const r = c - pad - sw / 2 - i * (sw + gap)
        const circ = 2 * Math.PI * r
        const off = (v: number) => circ * (1 - Math.max(0, Math.min(100, v)) / 100)
        return (
          <g key={m.key} transform={`rotate(-90 ${c} ${c})`}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
            {m.ghost != null && m.ghost > m.pct && (
              <circle
                cx={c} cy={c} r={r} fill="none" stroke={m.color} opacity={0.32} strokeWidth={sw} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={off(m.ghost)} className="kit-rings__ghost"
              />
            )}
            <circle
              cx={c} cy={c} r={r} fill="none" stroke={m.color} strokeWidth={sw} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={off(m.pct)} className="kit-rings__fill"
            />
          </g>
        )
      })}
    </svg>
  )
}

export function RingLegend({ metrics }: { metrics: RingMetric[] }) {
  return (
    <div className="kit-hero__legend-row">
      {metrics.map((m) => (
        <span key={m.key} className="kit-rlg">
          <i style={{ background: m.color }} />
          {m.label} <b>{m.pct}%</b>
          {m.note && <span className="kit-rlg__note">{m.note}</span>}
        </span>
      ))}
    </div>
  )
}

/* ---------- 1b. 이력서 없음 Empty State ---------- */
export function ResumeEmptyCard({ totalPostings, onSubmit }: { totalPostings: number; onSubmit: () => void }) {
  return (
    <div className="kit-hero kit-hero--empty">
      <div className="kit-hero__label">아직 점수가 없어요</div>
      <div className="kit-hero__sub" style={{ marginTop: 6, maxWidth: '100%' }}>
        이력서를 등록하면 <b>{totalPostings.toLocaleString()}건</b> 공고 중 내 위치를 계산해드려요
      </div>
      <button className="kit-hero__cta" onClick={onSubmit}>이력서 등록하기</button>
    </div>
  )
}

/* ---------- 2. 커버리지 What-if 시뮬레이터 ---------- */
type Tech = { tech: string; count: number }
export function CoverageWhatIf({
  ownedF, totalF, gap, onOpenTech,
}: { ownedF: number; totalF: number; gap: Tech[]; onOpenTech?: (t: string) => void }) {
  const [added, setAdded] = useState<string[]>([])
  const addedF = gap.filter((g) => added.includes(g.tech)).reduce((s, g) => s + g.count, 0)
  const base = Math.round((ownedF / totalF) * 100)
  const next = Math.round(((ownedF + addedF) / totalF) * 100)
  const toggle = (t: string) => setAdded((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))
  return (
    <div className="kit-whatif">
      <div className="kit-cbar">
        <i className="kit-cbar__base" style={{ width: `${base}%` }} />
        {next > base && <i className="kit-cbar__ghost" style={{ left: `${base}%`, width: `${next - base}%` }} />}
      </div>
      <div className="kit-cbar__cap">
        <span>{added.length ? <>커버리지 <b>{base}% → {next}%</b> · 공고 <b>+{addedF.toLocaleString()}</b></> : '기회 기술을 탭해 배우면?'}</span>
        {next > base && <b className="kit-cbar__delta">+{next - base}%</b>}
      </div>
      <div className="kit-whatif__chips">
        {gap.map((g) => (
          <button
            key={g.tech}
            className={`kit-whatif__chip${added.includes(g.tech) ? ' on' : ''}`}
            onClick={() => (onOpenTech && added.includes(g.tech)) ? onOpenTech(g.tech) : toggle(g.tech)}
          >
            +{g.tech}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 2b. 커버리지 분포 히스토그램 + What-if ---------- */
export type HistJob = { techs: string[]; held: number; total: number }
export function CoverageHistogram({
  postings, mySkills, gap, poolLabel, threshold = 50,
}: { postings: HistJob[]; mySkills: string[]; gap: Tech[]; poolLabel: string; threshold?: number }) {
  const [added, setAdded] = useState<string[]>([])
  const BINS = 14
  const total = postings.length
  const baseReached = useMemo(() => {
    return postings.filter((p) => (p.total ? Math.round((100 * p.held) / p.total) : 0) >= threshold).length
  }, [postings, threshold])

  const sortedGap = useMemo(() => {
    return [...gap].map((g) => {
      const reachedWithTech = postings.filter((p) => {
        const extra = (p.techs.includes(g.tech) && !mySkills.includes(g.tech)) ? 1 : 0
        const pct = p.total ? Math.round((100 * (p.held + extra)) / p.total) : 0
        return pct >= threshold
      }).length
      const increase = reachedWithTech - baseReached
      const pctIncrease = total ? Number(((reachedWithTech - baseReached) / total * 100).toFixed(1)) : 0
      return { ...g, increase, pctIncrease }
    }).sort((a, b) => b.increase - a.increase)
  }, [gap, postings, mySkills, baseReached, threshold, total])

  const pctOf = (p: HistJob) => {
    const extra = added.filter((a) => p.techs.includes(a) && !mySkills.includes(a)).length
    return p.total ? Math.round((100 * (p.held + extra)) / p.total) : 0
  }
  const hist = new Array(BINS).fill(0)
  postings.forEach((p) => { hist[Math.min(BINS - 1, Math.floor((pctOf(p) / 100) * BINS))]++ })
  const reached = postings.filter((p) => pctOf(p) >= threshold).length
  const max = Math.max(...hist, 1)
  const toggle = (t: string) => setAdded((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))
  return (
    <div className="kit-hist">
      <div className="kit-hist__headline">
        {poolLabel} 공고 {total}건 중 <b>{reached}건</b>에 지원 가능해요
        {reached > baseReached && <span className="kit-hist__delta">+{reached - baseReached}</span>}
        {total < 50 && <div className="kit-hist__sample">표본 {total}건 — 참고용</div>}
      </div>
      <div className="kit-hist__chart">
        <div className="kit-hist__thr" style={{ left: `${threshold}%` }} />
        {hist.map((h, i) => {
          const binPct = (i / BINS) * 100
          return (
            <div key={i} className="kit-hist__col">
              <i className={binPct >= threshold ? 'on' : ''} style={{ height: `${(h / max) * 100}%` }} />
            </div>
          )
        })}
      </div>
      <div className="kit-hist__axis"><span>0%</span><span className="thr">문턱 {threshold}%</span><span>100%</span></div>
      <div className="kit-hist__whatif-label">이 기술을 배우면? (커버리지 상승순)</div>
      <div className="kit-whatif__chips" style={{ marginTop: 6 }}>
        {sortedGap.map((g) => (
          <button key={g.tech} className={`kit-whatif__chip${added.includes(g.tech) ? ' on' : ''}`}
            onClick={() => toggle(g.tech)}>
            +{g.tech} (+{g.pctIncrease}%)
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 스와이프 페이저 (드래그 + 방향키 + 페이지 닷) ---------- */
export function SwipePager({ pages }: { pages: { key: string; node: ReactNode }[] }) {
  const [idx, setIdx] = useState(0)
  const startX = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const max = pages.length - 1
  const go = (dir: number) => setIdx((s) => Math.min(max, Math.max(0, s + dir)))

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [max])

  // 포인터(마우스+터치 통합) 드래그
  const onDown = (e: React.PointerEvent) => { startX.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onUp = (e: React.PointerEvent) => {
    if (startX.current == null) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    startX.current = null
  }
  return (
    <div ref={rootRef} tabIndex={0} className="kit-pager-root">
      <div className="kit-pager" onPointerDown={onDown} onPointerUp={onUp}>
        <div className="kit-pager__track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {pages.map((p) => <div className="kit-pager__page" key={p.key}>{p.node}</div>)}
        </div>
      </div>
      <div className="kit-pager__dots">
        {pages.map((p, i) => (
          <button key={p.key} className={idx === i ? 'on' : ''} onClick={() => setIdx(i)} aria-label={`페이지 ${i + 1}`} />
        ))}
      </div>
    </div>
  )
}

/* ---------- 다이나믹 독 — 하단 독(내비게이션 바)이 다이나믹 아일랜드처럼
   너비·높이·라운드가 부드럽게 변하며 그 자리에서 리스트가 펼쳐짐.
   지도처럼 화면 아무 지점에나 뜨는 컨텍스트 메뉴 대신, 항상 엄지가 닿는
   하단 고정 위치에서 확장되므로 모바일에서 다루기 쉬움. ---------- */
export function DynamicDock({
  expanded, collapsed, children, width = 268, expandedWidth = 320, expandedHeight = 320,
}: {
  expanded: boolean; collapsed: ReactNode; children: ReactNode
  width?: number; expandedWidth?: number; expandedHeight?: number
}) {
  return (
    <div
      className={`kit-dock${expanded ? ' expanded' : ''}`}
      style={{ width: expanded ? expandedWidth : width, height: expanded ? expandedHeight : 64 }}
    >
      <div className="kit-dock__face kit-dock__face--collapsed">{collapsed}</div>
      <div className="kit-dock__face kit-dock__face--expanded">{children}</div>
    </div>
  )
}

/* ---------- 3. 기회 사분면 스캐터 ---------- */
export type QuadItem = { tech: string; demand: number; owned: boolean; count: number }
export function OpportunityQuadrant({ items, onPick }: { items: QuadItem[]; onPick?: (t: string) => void }) {
  const W = 320, H = 200
  const list = [...items].sort((a, b) => b.demand - a.demand).slice(0, 12)
  const n = list.length
  const maxC = Math.max(...list.map((i) => i.count), 1)
  // X = 수요 랭크로 균등 분산(높을수록 오른쪽). Y = 보유 상단 / 미보유 하단.
  const laid = list.map((it, rank) => {
    const x = 24 + ((n - 1 - rank) / (n - 1 || 1)) * (W - 48)
    const band = it.owned ? 0.26 : 0.72
    const jit = (((rank * 41) % 9) - 4) * 0.02
    const y = 12 + (band + jit) * (H - 30)
    const opp = !it.owned
    return { ...it, x, y, r: 5 + (it.count / maxC) * 8, opp, rank }
  })
  return (
    <div className="kit-quad">
      <svg viewBox={`0 0 ${W} ${H}`} className="kit-quad__svg">
        <line x1={W / 2} y1="6" x2={W / 2} y2={H - 18} stroke="#e7ecf4" strokeWidth="1" />
        <line x1="16" y1={H / 2 - 3} x2={W - 16} y2={H / 2 - 3} stroke="#e7ecf4" strokeWidth="1" />
        <text x="20" y="15" className="kit-quad__q">보유</text>
        <text x={W - 20} y={H - 6} textAnchor="end" className="kit-quad__q opp">미보유</text>
        <text x={W - 18} y={H / 2 + 12} textAnchor="end" className="kit-quad__ax">수요 →</text>
        {laid.map((p, i) => {
          // 라벨: 기회는 항상, 강점은 상위 4개만. 위/아래 교차로 겹침 완화.
          const showLabel = p.opp || p.rank < 4
          const above = i % 2 === 0
          return (
            <g key={p.tech} onClick={() => onPick?.(p.tech)} style={{ cursor: onPick ? 'pointer' : 'default' }}>
              <circle cx={p.x} cy={p.y} r={p.r}
                fill={p.opp ? '#c76a2e' : 'var(--c-accent)'} fillOpacity={p.opp ? 0.9 : 0.8} />
              {showLabel && (
                <text x={p.x} y={above ? p.y - p.r - 3 : p.y + p.r + 9} textAnchor="middle" className="kit-quad__lbl">{p.tech}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="kit-quad__legend">
        <span><i style={{ background: 'var(--c-accent)' }} />보유</span>
        <span><i style={{ background: '#c76a2e' }} />미보유 · 고수요</span>
      </div>
    </div>
  )
}

/* ---------- 기술 스택 아이콘 (브랜드색 이니셜 배지, 무의존) ---------- */
const TECH: Record<string, [string, string]> = {
  Python: ['Py', '#3776AB'], JavaScript: ['JS', '#d9a400'], TypeScript: ['TS', '#3178C6'],
  React: ['Re', '#0a9fbf'], 'Node.js': ['No', '#539E43'], Node: ['No', '#539E43'], AWS: ['aws', '#e8890c'],
  Docker: ['Dk', '#2496ED'], Kubernetes: ['K8', '#326CE5'], PostgreSQL: ['PG', '#31648c'], MySQL: ['My', '#33637d'],
  Git: ['Git', '#e5502e'], Java: ['Jv', '#d32f2f'], Go: ['Go', '#00889c'], Golang: ['Go', '#00889c'], Rust: ['Rs', '#b7410e'],
  Azure: ['Az', '#0078D4'], GCP: ['GCP', '#2f6ee0'], HTML: ['H5', '#E34F26'], CSS: ['C3', '#1572B6'],
  Linux: ['Lx', '#4b5563'], Spring: ['Sp', '#5aa62f'], Django: ['Dj', '#0C4B33'], Kotlin: ['Kt', '#7F52FF'],
  Swift: ['Sw', '#F05138'], 'C++': ['C+', '#00599C'], 'C#': ['C#', '#68217A'], SQL: ['SQL', '#5b6470'],
  Terraform: ['Tf', '#7B42BC'], Vue: ['Vue', '#369e6f'], FastAPI: ['Fa', '#059669'], Redis: ['Rd', '#DC382D'],
  MongoDB: ['Mo', '#3f9a37'], GraphQL: ['GQ', '#c81f81'], Kafka: ['Kf', '#2b2b2b'], Ruby: ['Rb', '#CC342D'],
  PHP: ['PHP', '#4F5D95'], Scala: ['Sc', '#DC322F'], Elasticsearch: ['ES', '#0b7285'], Nginx: ['Ng', '#22863a'],
  Salesforce: ['SF', '#0d80c9'], iOS: ['iOS', '#3b4148'], Android: ['An', '#2f9e5f'], Flutter: ['Fl', '#0468D7'],
  'Next.js': ['Nx', '#2b2b2b'], Express: ['Ex', '#4b5563'], MariaDB: ['Ma', '#5a4b3c'], Oracle: ['Or', '#C74634'],
  Jira: ['Ji', '#2684FF'], Slack: ['Sl', '#4A154B'],
}
// 매칭% → 채도 그라데이션. 100%=진한 accent, 낮을수록 채도가 빠짐.
export function matchGrad(pct: number): string {
  const p = Math.max(0, Math.min(100, pct)) / 100
  const lig = 74 - p * 62 // 74% (light gray, low match) ~ 12% (near-black, high match)
  return `linear-gradient(90deg, hsl(220 4% ${Math.round(lig + 10)}%), hsl(220 4% ${Math.round(lig)}%))`
}

function techLabel(t: string) { return TECH[t]?.[0] ?? (t.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || t.slice(0, 2)) }
function techColor(t: string) {
  if (TECH[t]) return TECH[t][1]
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) & 0xffff
  return `hsl(${h % 360} 42% 42%)`
}
export function TechIcon({ tech, size = 26 }: { tech: string; size?: number }) {
  const ic = ICONS[tech]
  if (ic) {
    return (
      <span className="kit-ticon kit-ticon--real" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} fill={`#${ic.hex}`} aria-hidden>
          <path d={ic.path} />
        </svg>
      </span>
    )
  }
  return (
    <span className="kit-ticon" style={{ width: size, height: size, background: techColor(tech), fontSize: Math.round(size * 0.4) }}>
      {techLabel(tech)}
    </span>
  )
}

/* ---------- 4. 요즘의 시장 펄스 카드 (기술 아이콘 · 근거 병기) ---------- */
export type PulseItem = { tech: string; text: ReactNode; evidence?: string }
export function PulseCard({ items }: { items: PulseItem[] }) {
  return (
    <div className="kit-pulse">
      {items.map((it, i) => (
        <div className="kit-pulse__row" key={i}>
          <TechIcon tech={it.tech} size={30} />
          <div className="kit-pulse__body">
            <span className="kit-pulse__tx">{it.text}</span>
            {it.evidence && <span className="kit-pulse__ev">{it.evidence}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- 5. 섹션 헤더 (명명 그룹핑) ---------- */
/* ---------- 지도 미니 잡카드 (가로) + 스켈레톤 ---------- */
export function MiniJobCard({
  logo, company, matchPct, onClick,
}: { logo: ReactNode; company: string; matchPct: number; onClick?: () => void }) {
  return (
    <button className="kit-mjc" onClick={onClick}>
      {logo}
      <div className="kit-mjc__b">
        <span className="kit-mjc__nm">{company}</span>
        <span className="kit-mjc__mt">{matchPct}% 매칭</span>
      </div>
    </button>
  )
}
export function MiniJobSkeleton() {
  return (
    <div className="kit-mjc kit-mjc--skel">
      <div className="kit-sk kit-sk--logo" />
      <div className="kit-mjc__b"><div className="kit-sk kit-sk--l1" /><div className="kit-sk kit-sk--l2" /></div>
    </div>
  )
}

/* ---------- 편집 가능한 스킬 칩 + 기술 검색 시트 ---------- */
export function SkillChip({ tech, onRemove }: { tech: string; onRemove?: () => void }) {
  return (
    <span className="kit-schip">
      <TechIcon tech={tech} size={18} />
      {tech}
      {onRemove && <button className="kit-schip__x" onClick={onRemove} aria-label="삭제"><X size={12} /></button>}
    </span>
  )
}

export function TechSearchSheet({
  open, onClose, all, owned, onToggle,
}: {
  open: boolean; onClose: () => void
  all: { tech: string; count: number }[]; owned: string[]; onToggle: (t: string) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((t) => !s || t.tech.toLowerCase().includes(s)).slice(0, 100)
  }, [q, all])
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="kit-picker__hd">기술 추가 <span>{owned.length}개 보유</span></div>
      <div className="kit-picker__search">
        <Search size={17} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="기술 검색 (예: React)" />
      </div>
      <div className="kit-picker__list">
        {filtered.map((t) => {
          const on = owned.includes(t.tech)
          return (
            <button key={t.tech} className={`kit-picker__row${on ? ' on' : ''}`} onClick={() => onToggle(t.tech)}>
              <TechIcon tech={t.tech} size={26} />
              <span className="nm">{t.tech}</span>
              <span className="ct">{t.count.toLocaleString()}</span>
              <span className="act">{on ? <Check size={16} /> : <Plus size={16} />}</span>
            </button>
          )
        })}
        {filtered.length === 0 && <div className="kit-picker__empty">검색 결과가 없어요</div>}
      </div>
    </BottomSheet>
  )
}

export function SectionHeader({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="kit-sec">
      <div className="kit-sec__l">
        <h2 className="kit-sec__t">{title}</h2>
        {hint && <span className="kit-sec__h">{hint}</span>}
      </div>
      {right}
    </div>
  )
}

/* ---------- 5b. 위젯 표시/숨김 설정 — 기어 버튼 + 팝오버 ---------- */
export function WidgetSettingsMenu({ section, items }: { section: WidgetSection; items: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const config = useDashboardConfig()
  const hidden = config.hidden[section]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="kit-wset" ref={rootRef}>
      <button
        type="button"
        className="kit-wset__btn"
        aria-label="위젯 표시 설정"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Settings2 size={16} />
      </button>
      {open && (
        <div className="kit-wset__pop" role="menu">
          <div className="kit-wset__pop-title">위젯 표시</div>
          {items.map((it) => (
            <label key={it.id} className="kit-wset__row">
              <input
                type="checkbox"
                checked={!hidden.includes(it.id)}
                onChange={() => toggleWidget(section, it.id)}
              />
              <span>{it.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 6. 드릴다운 디스클로저 카드 ---------- */
export function DisclosureCard({
  title, summary, children, defaultOpen = false,
}: { title: string; summary?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`kit-disc${open ? ' open' : ''}`}>
      <button className="kit-disc__head" onClick={() => setOpen((o) => !o)}>
        <div className="kit-disc__l">
          <span className="kit-disc__t">{title}</span>
          {summary && !open && <span className="kit-disc__s">{summary}</span>}
        </div>
        <ChevronDown size={18} className="kit-disc__chev" />
      </button>
      <div className="kit-disc__body">
        <div className="kit-disc__inner">{children}</div>
      </div>
    </div>
  )
}

/* ---------- 7. 이력서 히어로 카드 ---------- */
export function ResumeHeroCard({
  title, position, career, coverage, skillCount, onEdit,
}: {
  title: string; position: string; career: string; coverage: number; skillCount?: number; onEdit?: () => void
}) {
  return (
    <div className="kit-rhero">
      <div className="kit-rhero__top">
        <div className="kit-rhero__ring" style={{ background: `conic-gradient(var(--c-accent) 0 ${coverage}%, rgba(255,255,255,0.25) ${coverage}% 100%)` }}>
          <div className="kit-rhero__hole"><b>{coverage}%</b><span>커버리지</span></div>
        </div>
        <div className="kit-rhero__info">
          <div className="kit-rhero__title">{title}</div>
          <div className="kit-rhero__meta">{position} · {career}</div>
          {skillCount != null && <div className="kit-rhero__meta" style={{ marginTop: 2 }}>보유 기술 {skillCount}개</div>}
        </div>
      </div>
      {onEdit && <button className="kit-rhero__edit" onClick={onEdit}>이력서 편집</button>}
    </div>
  )
}

/* ---------- 8. 메뉴 로우 (설정 리스트) ----------
   tint: 데스크톱(macOS 설정 문법)에서 행 아이콘 스쿼클 색으로 쓰는 CSS 변수.
   모바일 CSS는 이 변수를 참조하지 않으므로 모바일 렌더 결과는 불변이다. */
export function MenuRow({
  icon, label, value, onClick, danger, tint,
}: { icon: ReactNode; label: string; value?: string; onClick?: () => void; danger?: boolean; tint?: string }) {
  return (
    <button className={`kit-menu${danger ? ' danger' : ''}`} onClick={onClick}>
      <span className="kit-menu__ic" style={tint ? ({ '--menu-tint': tint } as React.CSSProperties) : undefined}>{icon}</span>
      <span className="kit-menu__lb">{label}</span>
      {value && <span className="kit-menu__v">{value}</span>}
      {!danger && <ChevronRight size={17} className="kit-menu__chev" />}
    </button>
  )
}

/* ---------- 9. 바텀시트 (아래서 스프링 등장) ---------- */
export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!open) { setVisible(false); return }
    setMounted(true)
    // 마운트 직후 곧바로 show 클래스를 주면 브라우저가 "닫힘" 상태를 페인트할 기회가
    // 없어 트랜지션이 아예 생략된다 — 더블 rAF로 한 프레임 쉬고 나서 열어야 애니메이션이 붙는다.
    let id2 = 0
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setVisible(true)) })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [open])
  if (!mounted && !open) return null
  return (
    <div className={`kit-sheet__wrap${visible ? ' show' : ''}`} onTransitionEnd={() => { if (!open) setMounted(false) }}>
      <div className="kit-sheet__ov" onClick={onClose} />
      <div className="kit-sheet">
        <div className="kit-sheet__grip" />
        {children}
      </div>
    </div>
  )
}

/* ---------- 10. 화면 전환 래퍼 (iOS 모션) ---------- */
export function PageTransition({ type = 'tab', keyId, children }: { type?: 'tab' | 'push' | 'fade'; keyId?: string; children: ReactNode }) {
  return <div key={keyId} className={`kit-trans kit-trans--${type}`}>{children}</div>
}

/* ---------- 11. 미니 스코어 도넛 (컴팩트 카드용) ---------- */
export function MiniScore({ pct, size = 46 }: { pct: number; size?: number }) {
  return (
    <div
      className="kit-mini"
      style={{ width: size, height: size, background: `conic-gradient(var(--c-accent) 0 ${pct}%, #e7ecf4 ${pct}% 100%)` }}
    >
      <div className="kit-mini__hole"><b>{pct}</b></div>
    </div>
  )
}

/* ---------- 12. 공고 카드 — 컴팩트 변형 ----------
   전체 카드의 요구기술 막대 → 우측 미니 원형(점수). 긴 이름은 말줄임(scroll 옵션). */
export type CompactJob = {
  company: string; title: string; matchPct: number; region?: string
  careerLabel?: string; source?: string
}
export function JobCardCompact({
  job, logo, scroll, onOpen,
}: { job: CompactJob; logo?: ReactNode; scroll?: boolean; onOpen?: () => void }) {
  return (
    <button className="kit-jc" onClick={onOpen}>
      {logo}
      <div className="kit-jc__body">
        <div className={`kit-jc__title${scroll ? ' scroll' : ''}`}>
          <span>{job.title}</span>
        </div>
        <div className="kit-jc__co">
          <span className="kit-jc__coname">{job.company}</span>
          {job.careerLabel && <span className="kit-jc__tag">{job.careerLabel}</span>}
        </div>
      </div>
      <MiniScore pct={job.matchPct} />
    </button>
  )
}

/* ---------- 카드 모드 토글 (전체 / 컴팩트) ---------- */
export type CardMode = 'full' | 'compact'
export function CardModeToggle({ mode, onChange }: { mode: CardMode; onChange: (m: CardMode) => void }) {
  return (
    <SegmentedControl
      value={mode}
      onChange={(v) => onChange(v as CardMode)}
      options={[{ key: 'full', label: '전체' }, { key: 'compact', label: '컴팩트' }]}
    />
  )
}

/* ---------- 슬라이딩 세그먼트(탭 셀렉터 공통) — toss-details.css의 .td-seg 패턴을
   앱 전역에서 재사용할 수 있도록 일반화. 인디케이터가 스프링으로 미끄러진다. ---------- */
export function SegmentedControl({
  options, value, onChange, size = 'md',
}: { options: { key: string; label: string }[]; value: string; onChange: (key: string) => void; size?: 'md' | 'sm' }) {
  const idx = Math.max(0, options.findIndex((o) => o.key === value))
  const n = options.length
  return (
    <div className={`kit-segctl${size === 'sm' ? ' sm' : ''}`}>
      <div className="kit-segctl__pill" style={{ width: `calc(${100 / n}% - 4px)`, left: `calc(${(100 / n) * idx}% + 2px)` }} />
      {options.map((o) => (
        <button key={o.key} className={value === o.key ? 'on' : ''} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  )
}

/* ---------- 13. 검정 히어로 스탯 카드 (대시보드 커맨드센터) ----------
   macOS 위젯 톤: 숫자 좌하단 강조 + 심플 그래프. value는 이미 렌더링된
   ReactNode(카운트업 등은 호출부에서 useCountUp으로 만들어 넘긴다)라
   숫자가 아닌 콘텐츠도 그대로 받을 수 있다. */
export function HeroStat({
  eyebrow, value, unit, caption, chart, footChips,
}: { eyebrow: string; value: ReactNode; unit?: string; caption?: ReactNode; chart?: ReactNode; footChips?: ReactNode }) {
  return (
    <div className="kit-heroStat">
      <div className="kit-heroStat__top">
        <span className="kit-heroStat__eyebrow">{eyebrow}</span>
        {chart && <div className="kit-heroStat__chart">{chart}</div>}
      </div>
      <div className="kit-heroStat__bottom">
        <div className="kit-heroStat__num">
          {value}{unit && <span>{unit}</span>}
        </div>
        {caption && <div className="kit-heroStat__caption">{caption}</div>}
        {footChips && <div className="kit-heroStat__chips">{footChips}</div>}
      </div>
    </div>
  )
}

/* ---------- 14. stat 타일 (촘촘한 대시보드용 초소형 카드) ---------- */
export function StatTile({
  label, value, unit, delta, spark,
}: { label: string; value: ReactNode; unit?: string; delta?: string; spark?: number[] }) {
  return (
    <div className="kit-statTile">
      <div className="kit-statTile__top">
        <span className="kit-statTile__label">{label}</span>
        {spark && spark.length > 1
          ? <Sparkline data={spark} w={52} h={22} />
          : delta && <span className="kit-statTile__delta">{delta}</span>}
      </div>
      <div className="kit-statTile__num">
        {value}{unit && <span>{unit}</span>}
      </div>
    </div>
  )
}

/* ---------- 15. 프리뷰 배지 (mock 폴백 위젯 표식) ---------- */
export function PreviewBadge() {
  return <span className="kit-previewBadge">preview</span>
}

/* ---------- 유틸: 카운트업 ---------- */
export function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3) // cubic out
      setV(Math.round(target * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, ms])
  return v
}
