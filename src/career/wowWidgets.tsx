import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Check } from 'lucide-react'
import { AsOf } from './charts'
import { SectionHeader, useCountUp, MiniScore } from './kit'
import { FONT, tooltipStyle } from '../pages/widgets/base'
import type { WidgetSize } from './dashboardConfig'
import { useResumesState, getDynamicPostings } from './state'
import feedRaw from '../data/feedData.json'
import y1Raw from '../data/pearl/y1.json'
import matchRaw from '../data/matchData.json'
import aRaw from '../data/pearl/a.json'
import competencyRaw from '../data/competencyData.json'
import sRaw from '../data/pearl/s.json'
import conceptRaw from '../data/conceptReal.json'
import './wowWidgets.css'

/* ============================================================
   와우포인트 위젯 7종 — 대시보드/시장 그리드(.wcell) 컴팩트 카드.
   각 컴포넌트는 자체 데이터를 import해 완결적으로 동작한다.
   size: '1x1' | '2x1' | '2x2' — 카드가 들어갈 wcell 크기에 맞춰
   정보량을 조절(작으면 핵심만, 크면 상세+차트).
   ============================================================ */

/** 일부 소스 JSON은 [헤더배열, ...데이터] 형태로 내려올 수 있어 방어적으로 벗겨낸다.
 * 첫 원소가 배열(헤더 행)이면 그 뒤부터, 아니면 원본 그대로 사용한다. */
function stripHeaderRow<T>(rows: unknown[]): T[] {
  return (Array.isArray(rows[0]) ? rows.slice(1) : rows) as T[]
}

/* ============================================================
   위젯 1 — LatestJobsTimeline (대시보드) · feedData.json
   최신 공고 타임라인 + 내 매칭 강조
   ============================================================ */
type DailyRow = { date: string; total: number; matched: number }
type FeedMeta = { N: number; asOf: string; myskills: string[]; matchedN: number }
const FEED = feedRaw as unknown as { _meta: FeedMeta; daily: unknown[]; recent: unknown[] }
const FEED_DAILY = stripHeaderRow<DailyRow>(FEED.daily)

export function LatestJobsTimeline({ size = '2x2' }: { size?: WidgetSize }) {
  const navigate = useNavigate()
  const { activeResume } = useResumesState()
  const skills = useMemo(() => activeResume?.skills ?? [], [activeResume])
  // 하단 리스트는 careerData 기반(getDynamicPostings)으로 만든다 — feedData의 id는
  // 상세 페이지(careerData) id와 달라 클릭해도 /job/{id}로 갈 수 없기 때문.
  // 상단 36일 일별 차트는 계속 feedData를 쓴다(시계열 소스는 그대로 유지).
  const rankedPostings = useMemo(
    () => getDynamicPostings(skills).filter((p) => p.pool === '국내').sort((a, b) => b.matchPct - a.matchPct),
    [skills],
  )
  const maxTotal = useMemo(() => Math.max(...FEED_DAILY.map((d) => d.total), 1), [])
  const listCount = size === '2x2' ? 14 : size === '2x1' ? 3 : 0
  const matchedCount = useCountUp(size === '1x1' ? FEED._meta.matchedN : 0)

  return (
    <div className="dcard wow-card">
      <SectionHeader title="최신 공고 타임라인" hint="내 매칭 강조" />
      <div className="wow-body">
        {size === '1x1' ? (
          <>
            <div className="wow-mini">
              <span className="wow-mini__num">{matchedCount.toLocaleString()}</span>
              <span className="wow-mini__lbl">건 내게 맞았어요</span>
            </div>
            <div className="wow-timeline wow-timeline--mini">
              {FEED_DAILY.map((d) => (
                <div key={d.date} className="wow-timeline__col">
                  <div className="wow-timeline__bar" style={{ height: `${(d.total / maxTotal) * 100}%` }}>
                    <i style={{ height: `${d.total ? (d.matched / d.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="wow-headline">
              최근 36일 <b>{FEED._meta.matchedN.toLocaleString()}</b>건이 내게 맞았어요 · 매일 뜨는 공고를 내 기술로 필터링
            </p>
            <div className="wow-timeline">
              {FEED_DAILY.map((d, i) => (
                <div key={d.date} className="wow-timeline__col" title={`${d.date} · 전체 ${d.total} · 매칭 ${d.matched}`}>
                  <div className="wow-timeline__bar" style={{ height: `${(d.total / maxTotal) * 100}%` }}>
                    <i style={{ height: `${d.total ? (d.matched / d.total) * 100 : 0}%` }} />
                  </div>
                  <span className="wow-timeline__lbl">{i % 7 === 0 ? d.date.slice(5) : ''}</span>
                </div>
              ))}
            </div>
            {listCount > 0 && (
              <>
                <p className="wow-joblist__label">국내 최신 공고 · 내 매칭순</p>
                <div className="wow-joblist">
                  {rankedPostings.slice(0, listCount).map((p) => {
                    const held = p.techs.filter((t) => skills.includes(t))
                    const heldShown = held.slice(0, 3)
                    const heldExtra = held.length - heldShown.length
                    const gapShown = p.gap.slice(0, 3)
                    const gapExtra = p.gap.length - gapShown.length
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="wow-joblist__row"
                        onClick={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                      >
                        <div className="wow-joblist__top">
                          <div className="wow-joblist__main">
                            <div className="wow-joblist__meta">
                              <span className="wow-joblist__co">{p.company} · {p.tier}</span>
                              <span className="wow-joblist__date">{p.postDate.slice(5)}</span>
                            </div>
                            <span className="wow-joblist__title">{p.title}</span>
                            {(p.region || p.district) && <span className="wow-joblist__loc">{p.region || p.district}</span>}
                          </div>
                          <MiniScore pct={p.matchPct} size={40} />
                        </div>
                        <div className="wow-joblist__chips">
                          {heldShown.map((t) => <span key={`h-${t}`} className="wow-chip wow-chip--held">{t}</span>)}
                          {heldExtra > 0 && <span className="wow-chip wow-chip--held wow-chip--more">+{heldExtra}</span>}
                          {gapShown.map((t) => <span key={`g-${t}`} className="wow-chip wow-chip--gap">{t}</span>)}
                          {gapExtra > 0 && <span className="wow-chip wow-chip--gap wow-chip--more">+{gapExtra}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <AsOf asOf={FEED._meta.asOf} n={FEED._meta.N} />
    </div>
  )
}

/* ============================================================
   위젯 2 — LearningPathWidget (대시보드) · pearl/y1.json
   학습 로드맵 — 최적 순서
   ============================================================ */
type Y1Step = { step: number; tech: string; category: string; matched_after: number; delta: number; freq_pct: number }
type Y1Data = { start_matched: number; total: number; threshold: number; steps: Y1Step[] }
const Y1 = y1Raw as unknown as { as_of: string; sample_size: number; data: Y1Data }

export function LearningPathWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const D = Y1.data
  const stepCount = size === '2x2' ? D.steps.length : 3
  const steps = D.steps.slice(0, stepCount)
  const last = D.steps[D.steps.length - 1]

  return (
    <div className="dcard wow-card">
      <SectionHeader title="학습 로드맵" hint="최적 순서" />
      <div className="wow-body">
        <p className="wow-headline">
          이 순서로 배우면 지원 가능 공고가 <b>{D.start_matched.toLocaleString()}→{last.matched_after.toLocaleString()}</b>건
        </p>
        <div className="wow-steps">
          {steps.map((s) => (
            <div key={s.step} className="wow-steps__row">
              <span className="wow-steps__badge">{s.step}</span>
              <div className="wow-steps__body">
                <div className="wow-steps__t"><b>{s.tech}</b><span className="wow-steps__cat">{s.category}</span></div>
                <div className="wow-steps__track"><i style={{ width: `${(s.matched_after / D.total) * 100}%` }} /></div>
              </div>
              <span className="wow-steps__delta">+{s.delta.toLocaleString()}건</span>
            </div>
          ))}
        </div>
        {size === '2x2' && (
          <div className="wow-progress">
            <div className="wow-progress__track"><i style={{ width: `${(last.matched_after / D.total) * 100}%` }} /></div>
            <span className="wow-progress__cap">{last.matched_after.toLocaleString()} / {D.total.toLocaleString()}건 도달</span>
          </div>
        )}
      </div>
      <AsOf asOf={Y1.as_of} n={Y1.sample_size} />
    </div>
  )
}

/* ============================================================
   위젯 3 — SkillUnlockWidget (대시보드) · matchData.json
   한계 해금 — 하나만 배우면
   ============================================================ */
type UnlockFunnel = { apply: number; near1: number; near2_3: number; far: number }
type UnlockCandidate = { tech: string; reqCount: number; reqPct: number; marginalApply: number; newApplyPct: number }
type UnlockRole = { n: number; funnel: UnlockFunnel; applyPct: number; coverageNow: number; candidates: UnlockCandidate[] }
type UnlockMeta = { source: string; asOf: string; myTech: string[]; roles: { key: string; label: string; n: number }[]; note: string }
const MATCH = matchRaw as unknown as { _meta: UnlockMeta; byRole: Record<string, UnlockRole> }

export function SkillUnlockWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const [role, setRole] = useState('all')
  const roleData = MATCH.byRole[role] ?? MATCH.byRole.all
  const candidates = useMemo(() => [...roleData.candidates].sort((a, b) => b.marginalApply - a.marginalApply).slice(0, 5), [roleData])
  const top = candidates[0]
  const maxMarginal = Math.max(...candidates.map((c) => c.marginalApply), 1)
  const funnelTotal = roleData.funnel.apply + roleData.funnel.near1 + roleData.funnel.near2_3 + roleData.funnel.far || 1

  if (size === '1x1') {
    return (
      <div className="dcard wow-card">
        <SectionHeader title="한계 해금" />
        <div className="wow-body">
          <div className="wow-unlock-mini">
            <span className="wow-unlock-mini__tech">{top.tech}</span>
            <span className="wow-unlock-mini__delta">+{top.marginalApply}건</span>
          </div>
        </div>
        <AsOf asOf={MATCH._meta.asOf} n={roleData.n} />
      </div>
    )
  }

  return (
    <div className="dcard wow-card">
      <SectionHeader
        title="한계 해금" hint="하나만 배우면"
        right={
          <div className="wow-seg">
            {MATCH._meta.roles.map((r) => (
              <button key={r.key} type="button" className={`wow-seg__btn${role === r.key ? ' on' : ''}`} onClick={() => setRole(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="wow-body">
        <p className="wow-headline"><b>{top.tech}</b> 하나만 배우면 <b>+{top.marginalApply}</b>건 더 지원 가능</p>
        {size === '2x2' && (
          <div className="wow-funnel">
            <div className="wow-funnel__bar">
              <i className="apply" style={{ width: `${(roleData.funnel.apply / funnelTotal) * 100}%` }} />
              <i className="near1" style={{ width: `${(roleData.funnel.near1 / funnelTotal) * 100}%` }} />
              <i className="near23" style={{ width: `${(roleData.funnel.near2_3 / funnelTotal) * 100}%` }} />
              <i className="far" style={{ width: `${(roleData.funnel.far / funnelTotal) * 100}%` }} />
            </div>
            <p className="wow-funnel__cap">
              지금 지원가능 <b>{roleData.funnel.apply}</b>건 · 1개만 더 배우면 <b>{roleData.funnel.near1}</b>건 추가
            </p>
          </div>
        )}
        <div className="wow-unlock-list">
          {candidates.map((c) => (
            <div key={c.tech} className="wow-unlock-row">
              <span className="wow-unlock-row__tech">{c.tech}</span>
              <div className="wow-unlock-row__track"><i style={{ width: `${(c.marginalApply / maxMarginal) * 100}%` }} /></div>
              <span className="wow-unlock-row__val">+{c.marginalApply}건</span>
              <span className="wow-unlock-row__req">요구 {c.reqPct}%</span>
            </div>
          ))}
        </div>
      </div>
      <AsOf asOf={MATCH._meta.asOf} n={roleData.n} />
    </div>
  )
}

/* ============================================================
   위젯 4 — HypeVsHireWidget (시장) · pearl/a.json
   Hype vs Hire — 관심 × 수요 (글로벌 전용)
   ============================================================ */
type AItem = { tech: string; i_pct: number; d_pct: number; i_now: number; d_now: number; n: number; owned: boolean; cat: string }
type AData = { series: AItem[]; pearls: AItem[] }
const A = aRaw as unknown as { as_of: string; sample_size: number; data: AData }

export function HypeVsHireWidget({ size = '2x2' }: { size?: WidgetSize }) {
  const series = A.data.series
  const pearls = A.data.pearls

  const option = useMemo(() => ({
    animationDuration: 600, animationEasing: 'cubicOut',
    grid: { left: 46, right: 20, top: 20, bottom: 34 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: { data: { raw: AItem } }) => {
        const d = p.data.raw
        return `<b>${d.tech}</b>${d.owned ? ' <span style="color:#0b0b0c">· 보유</span>' : ''}<br/>관심 상위 ${100 - d.i_pct}% · 수요 상위 ${100 - d.d_pct}%`
      },
    },
    xAxis: {
      type: 'value', name: '관심 →', min: 0, max: 100, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
    },
    yAxis: {
      type: 'value', name: '수요 →', min: 0, max: 100, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
    },
    series: [{
      type: 'scatter',
      data: series.map((d) => ({
        value: [d.i_pct, d.d_pct], raw: d,
        symbolSize: 6 + Math.log(d.n + 1) * 2.2,
        itemStyle: {
          color: d.cat === '진주' ? '#d9822b' : '#c9c9cf',
          borderColor: d.owned ? '#0b0b0c' : 'transparent',
          borderWidth: d.owned ? 2 : 0,
          opacity: d.cat === '진주' ? 0.92 : 0.72,
        },
      })),
      markLine: {
        silent: true, symbol: 'none', animation: false,
        lineStyle: { color: '#d4d4d8', type: 'dashed', width: 1 },
        label: { show: false },
        data: [{ xAxis: 50 }, { yAxis: 50 }],
      },
    }],
  }), [series])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="Hype vs Hire" hint="관심 × 수요" />
      <div className="wow-body">
        <span className="wow-scope">글로벌·HN 기준</span>
        <p className="wow-headline">개발자가 떠드는 기술 ≠ 회사가 뽑는 기술. <b>좌상단이 숨은 기회</b> — 예: Power BI는 관심 하위 <b>6%</b>인데 수요 상위 <b>24%</b>.</p>
        <div className={size === '2x2' ? 'wow-scatter-split' : undefined}>
          <ReactECharts option={option} style={{ height: size === '1x1' ? 160 : 220 }} notMerge />
          {size === '2x2' && (
            <div className="wow-pearls">
              <div className="wow-pearls__title">기회 사분면</div>
              {pearls.map((p) => (
                <div key={p.tech} className="wow-pearls__row">
                  <span className="wow-pearls__tech">{p.tech}</span>
                  <span className="wow-pearls__sub">수요상위 {100 - p.d_pct}% · 관심하위 {p.i_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <AsOf asOf={A.as_of} n={A.sample_size} />
    </div>
  )
}

/* ============================================================
   위젯 5 — CompetencyWidget (시장) · competencyData.json
   회사가 진짜 원하는 역량
   ============================================================ */
type CompetencyRow = { key: string; any: number; anyPct: number; req: number; reqPct: number; pref: number; prefPct: number; ex: string[] }
type CompetencyMeta = { source: string; N: number; asOf: string; note: string }
const COMP = competencyRaw as unknown as { _meta: CompetencyMeta; competency: CompetencyRow[] }

export function CompetencyWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const rows = useMemo(() => [...COMP.competency].sort((a, b) => b.anyPct - a.anyPct), [])
  const shown = size === '2x2' ? rows : rows.slice(0, 8)
  const top = rows[0]

  return (
    <div className="dcard wow-card">
      <SectionHeader title="회사가 진짜 원하는 역량" />
      <div className="wow-body">
        <p className="wow-headline">
          코딩 실력만으론 부족 — 채용공고 <b>{top.anyPct}%가 '{top.key}'</b>을 대놓고 요구해요.
        </p>
        <div className="wow-comp-list">
          {shown.map((r) => (
            <div key={r.key} className="wow-comp-row" title={size === '2x2' ? r.ex.join(', ') : undefined}>
              <span className="wow-comp-row__key">{r.key}</span>
              <div className="wow-comp-row__track">
                <i className="pref" style={{ width: `${r.prefPct}%` }} />
                <i className="req" style={{ width: `${r.reqPct}%` }} />
              </div>
              <span className="wow-comp-row__pct">{r.anyPct}%</span>
            </div>
          ))}
        </div>
        <div className="wow-legend2">
          <span><i className="req" />필수</span>
          <span><i className="pref" />우대</span>
        </div>
      </div>
      <AsOf asOf={COMP._meta.asOf} n={COMP._meta.N} />
    </div>
  )
}

/* ============================================================
   위젯 6 — ResponseRateWidget (시장) · pearl/s.json
   응답 잘 오는 회사 (국내·원티드 전용)
   ============================================================ */
type SLevel = { level: string; n: number }
type SExample = { company: string; level: string; rate: number; matched: string[]; matched_n: number }
type SData = { levels: SLevel[]; median_rate: number; examples: SExample[] }
const S = sRaw as unknown as { as_of: string; sample_size: number; data: SData }

const LEVEL_LABEL: Record<string, string> = { very_low: '매우낮음', low: '낮음', normal: '보통', high: '높음', very_high: '매우높음' }
const LEVEL_COLOR: Record<string, string> = { very_low: '#e4e4e7', low: '#c9c9cf', normal: '#a1a1aa', high: '#5fb98a', very_high: '#1f9d57' }

export function ResponseRateWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const D = S.data
  const maxLevelN = Math.max(...D.levels.map((l) => l.n), 1)
  const examples = useMemo(() => [...D.examples].sort((a, b) => b.rate - a.rate), [D.examples])
  const fortyTwoDot = examples.find((e) => e.company.includes('포티투닷'))

  return (
    <div className="dcard wow-card">
      <SectionHeader title="응답 잘 오는 회사" hint="국내·원티드" />
      <div className="wow-body">
        <p className="wow-headline">지원하면 진짜 답 올까? <b>중앙값 {Math.round(D.median_rate)}%</b>인데 <b>포티투닷은 {Math.round(fortyTwoDot?.rate ?? 0)}%</b> — 회사마다 천차만별.</p>
        <div className="wow-median">
          <span className="wow-median__num">{D.median_rate}<small>%</small></span>
          <span className="wow-median__lbl">중앙 응답률</span>
        </div>
        <div className="wow-levels">
          {D.levels.map((l) => (
            <div key={l.level} className="wow-levels__col">
              <div className="wow-levels__track"><i style={{ height: `${(l.n / maxLevelN) * 100}%`, background: LEVEL_COLOR[l.level] }} /></div>
              <span>{LEVEL_LABEL[l.level] ?? l.level}</span>
            </div>
          ))}
        </div>
        {size !== '1x1' && (
          <div className="wow-companies">
            {examples.slice(0, 5).map((e) => (
              <div key={e.company} className="wow-companies__row">
                <span className="wow-companies__name">{e.company}</span>
                <span className="wow-companies__rate">{e.rate}%</span>
                <span className="wow-companies__chip">N={e.matched_n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <AsOf asOf={S.as_of} n={S.sample_size} />
    </div>
  )
}

/* ============================================================
   위젯 7 — ConceptSignalWidget (시장) · conceptReal.json
   개념 → 기술 시그니처
   ============================================================ */
type ConceptTech = { tech: string; n: number; rate: number; lift: number; owned: boolean }
type ConceptCoverage = { covPct: number; ownedCount: number; techCount: number; ownedNames: string[] }
type ConceptItem = {
  key: string; label: string; demand: number; n: number
  coverage: ConceptCoverage; techs: ConceptTech[]; signature: ConceptTech[]
}
type ConceptMeta = { simulated: boolean; source: string; N: number; asOf: string }
const CONCEPT = conceptRaw as unknown as { _meta: ConceptMeta; concepts: ConceptItem[] }
const CONCEPT_SORTED = [...CONCEPT.concepts].sort((a, b) => b.demand - a.demand)

export function ConceptSignalWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const [key, setKey] = useState(CONCEPT_SORTED[0].key)
  const active = CONCEPT_SORTED.find((c) => c.key === key) ?? CONCEPT_SORTED[0]
  const sig = active.signature.slice(0, 6)
  const maxRate = Math.max(...sig.map((t) => t.rate), 1)

  return (
    <div className="dcard wow-card">
      <SectionHeader
        title="개념 → 기술 시그니처" hint={CONCEPT._meta.simulated ? undefined : '실측'}
        right={
          <div className="wow-seg wow-seg--scroll">
            {CONCEPT_SORTED.map((c) => (
              <button key={c.key} type="button" className={`wow-seg__btn${c.key === key ? ' on' : ''}`} onClick={() => setKey(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="wow-body">
        <p className="wow-headline">'DevOps 경험 있음'을 증명하려면? <b>GitHub Actions(lift 2.41)</b> 같은 신호 기술이 핵심.</p>
        <div className="wow-concept-top">
          <span className="wow-concept-top__demand">수요 {active.demand}%</span>
          <span className="wow-concept-top__cov">{active.coverage.ownedCount}/{active.coverage.techCount} 보유</span>
        </div>
        <div className="wow-sig-list">
          {sig.map((t) => (
            <div key={t.tech} className="wow-sig-row">
              <span className="wow-sig-row__tech">{t.owned && <Check size={11} className="wow-sig-row__check" />}{t.tech}</span>
              <div className="wow-sig-row__track"><i style={{ width: `${(t.rate / maxRate) * 100}%` }} /></div>
              <span className="wow-sig-row__lift">lift {t.lift}</span>
            </div>
          ))}
        </div>
        {size === '2x2' && (
          <div className="wow-tech-all">
            {active.techs.map((t) => (
              <span key={t.tech} className={`wow-tech-chip${t.owned ? ' owned' : ''}`}>{t.tech}</span>
            ))}
          </div>
        )}
      </div>
      <AsOf asOf={CONCEPT._meta.asOf} n={CONCEPT._meta.N} />
    </div>
  )
}
