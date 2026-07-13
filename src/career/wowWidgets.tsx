import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Check } from 'lucide-react'
import { AsOf } from './charts'
import { SectionHeader, useCountUp, MiniScore } from './kit'
import { FONT, tooltipStyle } from '../pages/widgets/base'
import type { WidgetSize } from './dashboardConfig'
import { useResumesState, getDynamicPostings } from './state'
import { getAuthToken } from './authStore'
import { dashboardApi, type UnlockData } from './api'
import { useWidgetData } from './useWidgetData'
import CompanyLogo from './CompanyLogo'
import { marketApi } from './api'
import feedRaw from '../data/feedData.json'
import y1Raw from '../data/pearl/y1.json'
import matchRaw from '../data/matchData.json'
import aRaw from '../data/pearl/a.json'
import competencyRaw from '../data/competencyData.json'
import sRaw from '../data/pearl/s.json'
import conceptRaw from '../data/conceptReal.json'
import conceptChronicleRaw from '../data/conceptData.json'
import lRaw from '../data/pearl/l.json'
import oRaw from '../data/pearl/o.json'
import uRaw from '../data/pearl/u.json'
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
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const identity = Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null
  const timeline = useWidgetData(
    identity ? () => dashboardApi.timeline(identity) : null,
    { daily: FEED_DAILY, as_of: FEED._meta.asOf },
  )
  const daily = timeline.value.daily.map((item) => ({ ...item, matched: item.matched ?? 0 }))
  // 하단 리스트는 careerData 기반(getDynamicPostings)으로 만든다 — feedData의 id는
  // 상세 페이지(careerData) id와 달라 클릭해도 /job/{id}로 갈 수 없기 때문.
  // 상단 36일 일별 차트는 계속 feedData를 쓴다(시계열 소스는 그대로 유지).
  const rankedPostings = useMemo(
    () => getDynamicPostings(skills).filter((p) => p.pool === '국내').sort((a, b) => b.matchPct - a.matchPct),
    [skills],
  )
  const maxTotal = Math.max(...daily.map((d) => d.total), 1)
  const listCount = size === '2x2' ? 14 : size === '2x1' ? 3 : 0
  const matchedTotal = daily.reduce((sum, item) => sum + item.matched, 0)
  const matchedCount = useCountUp(size === '1x1' ? matchedTotal : 0)

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
              {daily.map((d) => (
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
              최근 36일 <b>{matchedTotal.toLocaleString()}</b>건이 내 기술과 겹쳐요 · 매일 뜨는 공고를 내 기술로 필터링
            </p>
            <div className="wow-timeline">
              {daily.map((d, i) => (
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
                          <CompanyLogo logo={p.logo} name={p.company} size={34} radius={9} />
                          <div className="wow-joblist__main">
                            <div className="wow-joblist__meta">
                              <span className="wow-joblist__co">{p.company} · {p.tier}</span>
                              <span className="wow-joblist__date">{p.postDate.slice(5)}</span>
                            </div>
                            <span className="wow-joblist__title">
                              <span className="wow-joblist__title-text">{p.title}</span>
                              {p.matchPct >= 80 && <span className="wow-jobbadge">추천</span>}
                            </span>
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
      <AsOf asOf={timeline.value.as_of} n={daily.reduce((sum, item) => sum + item.total, 0)} />
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
  const { activeResume } = useResumesState()
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const identity = Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null
  const mockData = {
    start_matched: Y1.data.start_matched, total: Y1.data.total,
    steps: Y1.data.steps.map((step) => ({ ...step, canonical: step.tech })),
    as_of: Y1.as_of, sample_size: Y1.sample_size,
  }
  const roadmap = useWidgetData(
    identity ? () => dashboardApi.roadmap(identity, activeResume?.position) : null,
    mockData,
  )
  const D = roadmap.value.steps.length ? roadmap.value : mockData
  const stepCount = size === '2x2' ? D.steps.length : 3
  const steps = D.steps.slice(0, stepCount)
  const last = D.steps[D.steps.length - 1]

  return (
    <div className="dcard wow-card">
      <SectionHeader title="학습 로드맵" hint="최적 순서" />
      <div className="wow-body">
        <p className="wow-headline">
          이 순서로 배우면 기술 연결 공고가 <b>{D.start_matched.toLocaleString()}→{last.matched_after.toLocaleString()}</b>건
        </p>
        <div className="wow-steps">
          {steps.map((s) => (
            <div key={s.step} className="wow-steps__row">
              <span className="wow-steps__badge">{s.step}</span>
              <div className="wow-steps__body">
                <div className="wow-steps__t"><b>{s.canonical}</b><span className="wow-steps__cat">{s.category}</span></div>
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
      <AsOf asOf={D.as_of} n={D.sample_size} />
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
  const { activeResume } = useResumesState()
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const [liveData, setLiveData] = useState<UnlockData | null>(null)

  useEffect(() => {
    if (!Number.isInteger(resumeId) || resumeId <= 0 || !token) {
      setLiveData(null)
      return
    }
    let cancelled = false
    setLiveData(null)
    dashboardApi.unlock({ resumeId, token }, role === 'all' ? undefined : role)
      .then((data) => { if (!cancelled && data.candidates.length) setLiveData(data) })
      .catch(() => { if (!cancelled) setLiveData(null) })
    return () => { cancelled = true }
  }, [resumeId, role, token])

  const roleData: UnlockRole = liveData ? {
    n: liveData.sample_size,
    funnel: liveData.funnel,
    applyPct: liveData.sample_size ? Number((liveData.funnel.apply / liveData.sample_size * 100).toFixed(1)) : 0,
    coverageNow: 0,
    candidates: liveData.candidates.map((candidate) => ({
      tech: candidate.canonical,
      reqCount: candidate.req_count,
      reqPct: liveData.sample_size ? Number((candidate.req_count / liveData.sample_size * 100).toFixed(1)) : 0,
      marginalApply: candidate.marginal_apply,
      newApplyPct: 0,
    })),
  } : (MATCH.byRole[role] ?? MATCH.byRole.all)
  const candidates = useMemo(() => [...roleData.candidates].sort((a, b) => b.marginalApply - a.marginalApply).slice(0, 5), [roleData])
  const top = candidates[0]
  const maxMarginal = Math.max(...candidates.map((c) => c.marginalApply), 1)
  const funnelTotal = roleData.funnel.apply + roleData.funnel.near1 + roleData.funnel.near2_3 + roleData.funnel.far || 1

  if (!top) {
    return (
      <div className="dcard wow-card">
        <SectionHeader title="한계 해금" />
        <div className="wow-body"><div className="dov__empty">추천할 기술 데이터가 없어요.</div></div>
        <AsOf asOf={liveData?.as_of ?? MATCH._meta.asOf} n={roleData.n} />
      </div>
    )
  }

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
        <AsOf asOf={liveData?.as_of ?? MATCH._meta.asOf} n={roleData.n} />
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
      <AsOf asOf={liveData?.as_of ?? MATCH._meta.asOf} n={roleData.n} />
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
  const [live, setLive] = useState<AData | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.skillShare({ pool: 'global', top_k: 10 }).then(async (share) => {
      const responses = await Promise.allSettled(share.items.map((item) => marketApi.hypeVsHire(item.canonical)))
      const latest = responses.flatMap((response) => response.status === 'fulfilled' && response.value.quarters.length ? [{ tech: response.value.skill, point: response.value.quarters[response.value.quarters.length - 1]!, n: response.value.sample_size }] : [])
      if (cancelled || latest.length < 2) return
      const interests = [...latest].sort((a, b) => a.point.interest_value - b.point.interest_value)
      const demands = [...latest].sort((a, b) => a.point.posting_count - b.point.posting_count)
      const rows = latest.map((item): AItem => {
        const iPct = Math.round((interests.findIndex((row) => row.tech === item.tech) / (latest.length - 1)) * 100)
        const dPct = Math.round((demands.findIndex((row) => row.tech === item.tech) / (latest.length - 1)) * 100)
        return { tech: item.tech, i_pct: iPct, d_pct: dPct, i_now: item.point.interest_value, d_now: item.point.posting_count, n: item.n, owned: false, cat: iPct < 50 && dPct >= 50 ? '진주' : '일반' }
      })
      setLive({ series: rows, pearls: rows.filter((row) => row.cat === '진주').sort((a, b) => b.d_pct - a.d_pct).slice(0, 5) })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const series = live?.series ?? A.data.series
  const pearls = live?.pearls.length ? live.pearls : A.data.pearls

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

export function CompetencyWidget({ size = '2x1', headerRight }: { size?: WidgetSize; headerRight?: ReactNode }) {
  const rows = useMemo(() => [...COMP.competency].sort((a, b) => b.anyPct - a.anyPct), [])
  const shown = size === '2x2' ? rows : rows.slice(0, 8)
  const top = rows[0]

  return (
    <div className="dcard wow-card">
      <SectionHeader title="회사가 진짜 원하는 역량" right={headerRight} />
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

export function ResponseRateWidget({ size = '2x1', headerRight }: { size?: WidgetSize; headerRight?: ReactNode }) {
  const [live, setLive] = useState<SData | null>(null)
  const D = live ?? S.data
  useEffect(() => {
    let cancelled = false
    marketApi.responseRate('domestic').then((result) => {
      if (cancelled || !result.companies.length) return
      setLive({
        median_rate: result.median_rate,
        levels: result.levels,
        examples: result.companies.map((company) => ({ company: company.company, level: '', rate: company.rate, matched: [], matched_n: company.n })),
      })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const maxLevelN = Math.max(...D.levels.map((l) => l.n), 1)
  const examples = useMemo(() => [...D.examples].sort((a, b) => b.rate - a.rate), [D.examples])
  const fortyTwoDot = examples.find((e) => e.company.includes('포티투닷'))

  return (
    <div className="dcard wow-card">
      <SectionHeader title="응답 잘 오는 회사" hint="국내·원티드" right={headerRight} />
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

export function ConceptSignalWidget({ size = '2x1', headerRight }: { size?: WidgetSize; headerRight?: ReactNode }) {
  const [key, setKey] = useState(CONCEPT_SORTED[0].key)
  const active = CONCEPT_SORTED.find((c) => c.key === key) ?? CONCEPT_SORTED[0]
  const sig = active.signature.slice(0, 6)
  const maxRate = Math.max(...sig.map((t) => t.rate), 1)

  return (
    <div className="dcard wow-card">
      <SectionHeader
        title="개념 → 기술 시그니처" hint={CONCEPT._meta.simulated ? undefined : '실측'}
        right={headerRight}
      />
      <div className="wow-seg wow-seg--scroll wow-concept-tabs">
        {CONCEPT_SORTED.map((c) => (
          <button key={c.key} type="button" className={`wow-seg__btn${c.key === key ? ' on' : ''}`} onClick={() => setKey(c.key)}>
            {c.label}
          </button>
        ))}
      </div>
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

/* ============================================================
   위젯 8 — TrendChronicleWidget (시장) · conceptData.json
   기술 트렌드 연대기 — 무엇을 만드는가의 축, 2020→2026
   ============================================================ */
type ChronicleMeta = { simulated: boolean; note: string; asOf: string; years: number[]; N: number }
type ChronicleConcept = { key: string; label: string; color: string; demand: number; delta: number; me: number; yearly: number[] }
const CHRONICLE = conceptChronicleRaw as unknown as { _meta: ChronicleMeta; concepts: ChronicleConcept[] }
const CHRONICLE_KEYS = ['ai', 'scale', 'msa', 'realtime']
const CHRONICLE_CONCEPTS = CHRONICLE_KEYS
  .map((k) => CHRONICLE.concepts.find((c) => c.key === k))
  .filter((c): c is ChronicleConcept => !!c)

export function TrendChronicleWidget({ size = '2x2', headerRight }: { size?: WidgetSize; headerRight?: ReactNode }) {
  const [live, setLive] = useState<{ years: number[]; concepts: ChronicleConcept[]; asOf: string; n: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.yearlyTrend('domestic').then((result) => {
      if (cancelled || !result.years.length || !result.series.length) return
      const colors = ['#1f9d57', '#5b78d1', '#d9822b', '#8b5cf6']
      setLive({
        years: result.years,
        concepts: [...result.series].sort((a, b) => b.delta - a.delta).slice(0, 4).map((item, index) => ({ key: item.canonical, label: item.canonical, color: colors[index], demand: item.shares[item.shares.length - 1] ?? 0, delta: item.delta, me: 0, yearly: item.shares })),
        asOf: result.as_of,
        n: result.sample_size,
      })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const years = live?.years ?? CHRONICLE._meta.years
  const concepts = live?.concepts ?? CHRONICLE_CONCEPTS
  const ai = concepts[0]!
  const startPct = ai.yearly[0]
  const endPct = ai.yearly[ai.yearly.length - 1]
  const yearsSinceInflection = years[years.length - 1] - 2023

  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 10, right: 74, top: 16, bottom: 26, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'axis',
      formatter: (params: { seriesName: string; axisValue: string; value: number }[]) =>
        `${params[0]?.axisValue}<br/>${params.map((p) => `${p.seriesName} <b>${p.value}%</b>`).join('<br/>')}`,
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: years.map(String),
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10.5, fontWeight: 600 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: concepts.map((c, index) => {
      const isAi = index === 0
      const col = isAi ? '#1f9d57' : '#a1a1aa'
      return {
        name: c.label, type: 'line', data: c.yearly, smooth: 0.2,
        symbol: 'circle', symbolSize: isAi ? 6 : 4,
        lineStyle: { color: col, width: isAi ? 2.6 : 1.3, opacity: isAi ? 1 : 0.6 },
        itemStyle: { color: col, borderColor: '#fff', borderWidth: 1 },
        endLabel: { show: true, formatter: c.label, color: col, fontFamily: FONT, fontSize: 10, fontWeight: 700, distance: 6 },
        z: isAi ? 5 : 2,
        markLine: !isAi ? undefined : {
          silent: true, symbol: 'none', animation: false,
          label: { fontFamily: FONT, fontSize: 9, fontWeight: 700 },
          data: [
            { xAxis: '2020', lineStyle: { color: '#c9c9cf', type: 'dashed', width: 1 }, label: { formatter: '코로나·원격근무 확산', color: '#8f8f97', position: 'insideStartTop' } },
            { xAxis: '2023', lineStyle: { color: '#1f9d57', type: 'dashed', width: 1 }, label: { formatter: 'AI 변곡점', color: '#1f9d57', position: 'insideEndTop' } },
          ],
        },
      }
    }),
  }), [years, concepts])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="기술 트렌드 연대기" hint="무엇을 만드는가의 축 · 2020→2026" right={headerRight} />
      <div className="wow-body">
        <p className="wow-headline">
          <b>AI·LLM</b>은 2023 변곡점 후 {yearsSinceInflection}년 만에 <b>{startPct}%→{endPct}%</b> 폭발.
        </p>
        <ReactECharts option={option} style={{ height: size === '2x1' ? 170 : 240 }} notMerge />
      </div>
      <AsOf asOf={live?.asOf ?? CHRONICLE._meta.asOf} n={live?.n ?? CHRONICLE._meta.N} note={live ? undefined : 'API 연결 실패 시 기존 프리뷰 데이터'} />
    </div>
  )
}

/* ============================================================
   위젯 9 — GithubChronicleWidget (시장) · pearl/l.json
   GitHub 스타 순위 변천사 — 오픈소스 15년, 무엇이 무엇을 추월했나 (글로벌 전용)
   ============================================================ */
type GhPoint = { year: number; rank: number; stars: number }
type GhLine = { tech: string; points: GhPoint[]; owned: boolean }
type GhEvent = { year: number; over: string; under: string; over_stars: number; under_stars: number }
type GhData = { years: number[]; lines: GhLine[]; events: GhEvent[] }
const GH = lRaw as unknown as { as_of: string; pool: string; sample_size: number; sample_note: string; data: GhData }
const GH_TOP_LINES = [...GH.data.lines]
  .sort((a, b) => (a.points[a.points.length - 1]?.rank ?? 99) - (b.points[b.points.length - 1]?.rank ?? 99))
  .slice(0, 8)

function ghRankSeries(line: GhLine): (number | null)[] {
  const byYear = new Map(line.points.map((p) => [p.year, p.rank]))
  return GH.data.years.map((y) => byYear.get(y) ?? null)
}

export function GithubChronicleWidget({ size = '2x2' }: { size?: WidgetSize }) {
  const [live, setLive] = useState<GhData | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.githubChronicle().then((result) => {
      if (cancelled || !result.lines.length) return
      setLive({ years: result.years, lines: result.lines.map((line) => ({ tech: line.tech, points: line.points, owned: false })), events: GH.data.events })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const ghData = live ?? GH.data
  const topLines = live ? [...ghData.lines].sort((a, b) => (a.points[a.points.length - 1]?.rank ?? 99) - (b.points[b.points.length - 1]?.rank ?? 99)).slice(0, 8) : GH_TOP_LINES
  const firstEvent = ghData.events[0]
  const shownEvents = ghData.events.slice(0, size === '2x2' ? 6 : 3)

  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 10, right: 70, top: 16, bottom: 26, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { seriesName: string; axisValue: string }) => {
        const line = topLines.find((l) => l.tech === p.seriesName)
        const point = line?.points.find((pt) => String(pt.year) === p.axisValue)
        if (!line || !point) return p.seriesName
        return `<b>${line.tech}</b>${line.owned ? ' <span style="color:#1f9d57">· 보유</span>' : ''}<br/>${point.year} · 순위 ${point.rank}위 · 스타 ${point.stars.toLocaleString()}`
      },
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: ghData.years.map(String),
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 9.5, fontWeight: 600, interval: 1 },
    },
    yAxis: {
      type: 'value', inverse: true, min: 1,
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}위' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: topLines.map((line) => {
      const col = line.owned ? '#1f9d57' : '#c9c9cf'
      return {
        name: line.tech, type: 'line', data: live ? ghData.years.map((year) => line.points.find((point) => point.year === year)?.rank ?? null) : ghRankSeries(line), connectNulls: true, smooth: 0.15,
        symbol: 'circle', symbolSize: line.owned ? 6 : 4,
        lineStyle: { color: col, width: line.owned ? 2.4 : 1.2, opacity: line.owned ? 1 : 0.6 },
        itemStyle: { color: col, borderColor: '#fff', borderWidth: 1 },
        endLabel: { show: true, formatter: line.tech, color: line.owned ? '#1f9d57' : '#8f8f97', fontFamily: FONT, fontSize: 9, fontWeight: 700, distance: 6 },
        z: line.owned ? 5 : 2,
      }
    }),
  }), [ghData, topLines])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="GitHub 스타 순위 변천사" hint="오픈소스 15년 · 무엇이 무엇을 추월했나" />
      <div className="wow-body">
        <span className="wow-scope">글로벌 기준</span>
        <p className="wow-headline">
          <b>{firstEvent.over}</b>가 <b>{firstEvent.under}</b>를 추월 ({firstEvent.year})
        </p>
        <ReactECharts option={option} style={{ height: size === '2x1' ? 160 : 220 }} notMerge />
        <p className="wow-joblist__label">추월 사건</p>
        <div className="wow-companies">
          {shownEvents.map((e) => (
            <div key={`${e.year}-${e.over}-${e.under}`} className="wow-companies__row">
              <span className="wow-companies__name">{e.over} → {e.under}</span>
              <span className="wow-companies__rate">추월</span>
              <span className="wow-companies__chip">{e.year}</span>
            </div>
          ))}
        </div>
      </div>
      <AsOf asOf={GH.as_of} n={GH.sample_size} note={GH.sample_note} />
    </div>
  )
}

/* ============================================================
   위젯 10 — GlobalDomesticGapWidget (시장) · pearl/o.json
   글로벌 vs 국내, 뭐가 다른가 (글로벌+국내 비교)
   ============================================================ */
type GapRow = { tech: string; category: string; global_pct: number; domestic_pct: number; diff: number; g_n: number; d_n: number }
type GapData = { global_favored: GapRow[]; domestic_favored: GapRow[]; g_total: number; d_total: number }
const GAP = oRaw as unknown as { as_of: string; pool: string; sample_size: number; sample_note: string; data: GapData }

export function GlobalDomesticGapWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const [live, setLive] = useState<GapData | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.globalDomesticGap().then((result) => {
      if (cancelled || (!result.domestic_favored.length && !result.global_favored.length)) return
      const map = (row: (typeof result.domestic_favored)[number]): GapRow => ({ tech: row.canonical, category: row.category, global_pct: row.global_pct, domestic_pct: row.domestic_pct, diff: row.diff, g_n: 0, d_n: 0 })
      setLive({ domestic_favored: result.domestic_favored.map(map), global_favored: result.global_favored.map(map), g_total: 0, d_total: 0 })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const gapData = live ?? GAP.data
  const perSide = size === '2x2' ? 6 : 4
  const domesticTop = gapData.domestic_favored.slice(0, perSide)
  const globalTop = gapData.global_favored.slice(0, perSide)
  const combined = useMemo(() => [...domesticTop, ...globalTop].sort((a, b) => a.diff - b.diff), [domesticTop, globalTop])
  const maxAbs = Math.max(...combined.map((d) => Math.abs(d.diff)), 1)
  const topDomestic = gapData.domestic_favored[0]

  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 92, right: 54, top: 10, bottom: 10, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { name: string; value: number }) => {
        const row = combined.find((d) => d.tech === p.name)
        if (!row) return p.name
        return `<b>${row.tech}</b><br/>글로벌 ${row.global_pct}% · 국내 ${row.domestic_pct}%<br/>차이 ${row.diff > 0 ? '+' : ''}${row.diff.toFixed(1)}%p`
      },
    },
    xAxis: {
      type: 'value', min: -maxAbs * 1.15, max: maxAbs * 1.15,
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: (v: number) => `${Math.abs(v)}` },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    yAxis: {
      type: 'category', data: combined.map((d) => d.tech),
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
    },
    series: [{
      type: 'bar', barWidth: 12,
      data: combined.map((d) => ({
        value: Number(d.diff.toFixed(1)),
        itemStyle: { color: d.diff < 0 ? '#1f9d57' : '#c9c9cf' },
        label: {
          show: true, position: d.diff < 0 ? 'left' : 'right',
          formatter: `${d.diff > 0 ? '+' : ''}${d.diff.toFixed(1)}%p`,
          color: d.diff < 0 ? '#1f9d57' : '#8f8f97', fontFamily: FONT, fontSize: 10, fontWeight: 700,
        },
      })),
      markLine: {
        silent: true, symbol: 'none', animation: false,
        lineStyle: { color: '#d4d4d8', type: 'solid', width: 1 }, label: { show: false },
        data: [{ xAxis: 0 }],
      },
    }],
  }), [combined, maxAbs])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="글로벌 vs 국내, 뭐가 다른가" hint="같은 기술도 시장마다 수요가 달라요" />
      <div className="wow-body">
        <span className="wow-scope">글로벌+국내 비교</span>
        <p className="wow-headline">
          <b>{topDomestic.tech}</b>는 국내가 <b>+{Math.abs(topDomestic.diff).toFixed(1)}%p</b> 더 원해요 — 해외 취업 노린다면 참고.
        </p>
        <ReactECharts option={option} style={{ height: Math.max(180, combined.length * 20) }} notMerge />
        <div className="wow-legend2">
          <span><i style={{ background: '#1f9d57' }} /> 국내가 더 원함</span>
          <span><i style={{ background: '#c9c9cf' }} /> 글로벌이 더 원함</span>
        </div>
      </div>
      <AsOf asOf={GAP.as_of} n={GAP.sample_size} note={GAP.sample_note} />
    </div>
  )
}

/* ============================================================
   위젯 11 — GithubTopicsWidget (시장) · pearl/u.json
   오픈소스 관심 vs 채용 수요 (글로벌 전용, HN과 독립 신호)
   ============================================================ */
type TopicItem = {
  tech: string; category: string; repo_reach: number; reach_pct: number; job_demand_pct: number
  owned: boolean; reach_pctl: number; demand_pctl: number
}
type TopicsData = { items: TopicItem[]; opportunities: TopicItem[] }
const TOPICS = uRaw as unknown as { as_of: string; pool: string; sample_size: number; sample_note: string; data: TopicsData }
const TOPICS_OPP_SET = new Set(TOPICS.data.opportunities.map((o) => o.tech))

export function GithubTopicsWidget({ size = '2x1' }: { size?: WidgetSize }) {
  const [live, setLive] = useState<TopicsData | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.githubTopics().then((result) => {
      if (cancelled || !result.items.length) return
      const items = result.items.filter((item) => item.job_demand_pct != null).map((item) => ({ tech: item.canonical, category: item.category, repo_reach: item.repo_reach, reach_pct: item.reach_pct, job_demand_pct: item.job_demand_pct ?? 0, owned: item.owned ?? false, reach_pctl: item.reach_pct, demand_pctl: Math.max(0, 100 - (item.job_demand_pct ?? 0)) }))
      const opportunities = [...items].sort((a, b) => (b.job_demand_pct - b.reach_pct) - (a.job_demand_pct - a.reach_pct)).slice(0, 5)
      setLive({ items, opportunities })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const topicData = live ?? TOPICS.data
  const items = topicData.items
  const opp = topicData.opportunities
  const opportunitySet = live ? new Set(opp.map((item) => item.tech)) : TOPICS_OPP_SET
  const top = opp[0]

  const option = useMemo(() => ({
    animationDuration: 600, animationEasing: 'cubicOut',
    grid: { left: 46, right: 20, top: 20, bottom: 34 },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { data: { raw: TopicItem } }) => {
        const d = p.data.raw
        return `<b>${d.tech}</b>${d.owned ? ' <span style="color:#1f9d57">· 보유</span>' : ''}<br/>OSS 관심 ${d.reach_pct}% (백분위 ${d.reach_pctl}) · 채용수요 ${d.job_demand_pct}% (상위 ${100 - d.demand_pctl}%ile)`
      },
    },
    xAxis: {
      type: 'value', name: 'OSS 관심 →', min: 0, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
    },
    yAxis: {
      type: 'value', name: '채용수요 →', min: 0, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
    },
    series: [{
      type: 'scatter',
      data: items.map((d) => ({
        value: [d.reach_pct, d.job_demand_pct], raw: d,
        symbolSize: 6 + Math.sqrt(d.repo_reach) * 1.3,
        itemStyle: {
          color: opportunitySet.has(d.tech) ? '#d9822b' : '#c9c9cf',
          borderColor: d.owned ? '#1f9d57' : 'transparent',
          borderWidth: d.owned ? 2 : 0,
          opacity: opportunitySet.has(d.tech) ? 0.95 : 0.65,
        },
      })),
    }],
  }), [items, opportunitySet])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="오픈소스 관심 vs 채용 수요" hint="GitHub에서 뜨는 것과 회사가 뽑는 것 (HN과 독립 신호)" />
      <div className="wow-body">
        <span className="wow-scope">글로벌 기준</span>
        <p className="wow-headline">
          <b>{top.tech}</b>는 오픈소스 관심 하위권(백분위 {top.reach_pctl})인데 채용수요는 상위 {100 - top.demand_pctl}%ile — 저평가된 실무 기술.
        </p>
        <div className={size === '2x2' ? 'wow-scatter-split' : undefined}>
          <ReactECharts option={option} style={{ height: size === '1x1' ? 160 : 210 }} notMerge />
          {size === '2x2' && (
            <div className="wow-pearls">
              <div className="wow-pearls__title">저평가 기회 (앰버)</div>
              {opp.map((o) => (
                <div key={o.tech} className="wow-pearls__row">
                  <span className="wow-pearls__tech">{o.tech}</span>
                  <span className="wow-pearls__sub">관심 백분위 {o.reach_pctl} · 수요 상위 {100 - o.demand_pctl}%ile</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <AsOf asOf={TOPICS.as_of} n={TOPICS.sample_size} note={TOPICS.sample_note} />
    </div>
  )
}
