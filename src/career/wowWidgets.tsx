import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Check } from 'lucide-react'
import { AsOf } from './charts'
import { SectionHeader, useCountUp, MiniScore, PreviewBadge } from './kit'
import { FONT, tooltipStyle } from '../pages/widgets/base'
import type { WidgetSize } from './dashboardConfig'
import { useResumesState } from './state'
import { getAuthToken } from './authStore'
import { dashboardApi, jobsApi, type PostingCard, type UnlockData, type ApiPool } from './api'
import { useWidgetData } from './useWidgetData'
import CompanyLogo from './CompanyLogo'
import { useBookmarks } from './bookmarkStore'
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
import marketDataRaw from '../data/marketData.json'
import './wowWidgets.css'

/** 국내/글로벌/전체 풀 셀렉터(v8 시장 탭) — DesktopMarket과 이 파일의 신규 위젯이 공유하는
 * 삼중 상태. 'all'은 점유율을 합산하지 않고 국내·글로벌을 병렬로 보여준다(설계 스펙 §4-1). */
export type PoolChoice = 'domestic' | 'global' | 'all'
function poolToApi(pool: PoolChoice, fallback: ApiPool = 'domestic'): ApiPool {
  return pool === 'global' ? 'global' : pool === 'domestic' ? 'domestic' : fallback
}

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
  const skills = useMemo(() => activeResume?.skills ?? [], [activeResume?.skills])
  const bookmarkIds = useBookmarks()
  const [activeTab, setActiveTab] = useState<'latest' | 'matched' | 'deadline' | 'bookmarks'>('latest')
  const [apiPostings, setApiPostings] = useState<PostingCard[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const identity = Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null
  const timelineRefreshKey = identity ? `${resumeId}:${skills.join('|')}` : 'preview'
  const timeline = useWidgetData(
    identity ? () => dashboardApi.timeline(identity) : null,
    { daily: FEED_DAILY, as_of: FEED._meta.asOf },
    timelineRefreshKey,
  )
  const daily = timeline.value.daily.map((item) => ({ ...item, matched: item.matched ?? 0 }))
  const maxTotal = Math.max(...daily.map((d) => d.total), 1)
  const listCount = size === '2x2' ? 14 : size === '2x1' ? 3 : 0
  const matchedTotal = daily.reduce((sum, item) => sum + item.matched, 0)
  const matchedCount = useCountUp(size === '1x1' ? matchedTotal : 0)
  const bookmarkKey = bookmarkIds.join(',')
  const tabs = [
    { key: 'latest', label: '최신' },
    { key: 'matched', label: '맞춤' },
    { key: 'deadline', label: '마감 임박' },
    { key: 'bookmarks', label: '북마크' },
  ] as const

  useEffect(() => {
    if (listCount === 0) return
    if (activeTab === 'matched' && !identity) {
      setApiPostings([])
      setJobsError('이력서를 등록하면 맞춤 공고를 확인할 수 있어요.')
      setJobsLoading(false)
      return
    }
    if (activeTab === 'bookmarks' && bookmarkIds.length === 0) {
      setApiPostings([])
      setJobsError(null)
      setJobsLoading(false)
      return
    }
    let cancelled = false
    setJobsLoading(true)
    setJobsError(null)
    setApiPostings([])

    const load = async () => {
      if (activeTab === 'bookmarks') {
        const responses = await Promise.allSettled(
          bookmarkIds.slice(0, listCount).map((id) => jobsApi.detail(id)),
        )
        return responses.flatMap((response) => response.status === 'fulfilled' ? [response.value] : [])
      }

      const result = await jobsApi.list({
        pool: 'domestic',
        sort: activeTab === 'matched' ? 'match' : activeTab === 'deadline' ? 'deadline' : 'latest',
        deadline_within_days: activeTab === 'deadline' ? 7 : undefined,
        match_only: activeTab === 'matched' ? true : undefined,
        resume_id: activeTab === 'matched' ? resumeId : undefined,
        page: 1,
        page_size: listCount,
      }, token)
      return result.items
    }

    load()
      .then((items) => { if (!cancelled) setApiPostings(items) })
      .catch(() => {
        if (!cancelled) {
          setApiPostings([])
          setJobsError('공고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
        }
      })
      .finally(() => { if (!cancelled) setJobsLoading(false) })

    return () => { cancelled = true }
  }, [activeTab, bookmarkKey, listCount, resumeId, token])

  const listLabel = activeTab === 'latest' ? '국내 최신 공고'
    : activeTab === 'matched' ? '내 이력서 맞춤 공고'
      : activeTab === 'deadline' ? '7일 안에 마감되는 공고'
        : '북마크한 공고'

  return (
    <div className="dcard wow-card">
      <SectionHeader
        title="최신 공고 타임라인"
        hint="내 매칭 강조"
        right={size !== '1x1' && timeline.source !== 'live' ? <PreviewBadge /> : undefined}
      />
      {size !== '1x1' && (
        <div
          className="wow-seg"
          style={{ width: '100%', justifyContent: 'flex-start', marginTop: 8, marginBottom: 4 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`wow-seg__btn${activeTab === tab.key ? ' on' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
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
            {timeline.source === 'live' ? (
              <p className="wow-headline">
                최근 36일 <b>{matchedTotal.toLocaleString()}</b>건이 내 기술과 겹쳐요 · 차트는 유지하고 목록만 골라보세요
              </p>
            ) : (
              <p className="wow-headline">이력서를 등록하면 내 기술과 매칭된 공고를 확인할 수 있어요</p>
            )}
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
                <p className="wow-joblist__label">{listLabel} · {apiPostings.length}건</p>
                <div className="wow-joblist">
                  {jobsLoading && <div className="dov__empty">공고를 불러오는 중이에요.</div>}
                  {!jobsLoading && jobsError && <div className="dov__empty">{jobsError}</div>}
                  {!jobsLoading && !jobsError && apiPostings.length === 0 && (
                    <div className="dov__empty">
                      {activeTab === 'bookmarks' ? '북마크한 공고가 없어요.' : '조건에 맞는 공고가 없어요.'}
                    </div>
                  )}
                  {!jobsLoading && !jobsError && apiPostings.map((p) => {
                    const held = p.skills.filter((tech) => skills.includes(tech))
                    const remaining = p.skills.filter((tech) => !skills.includes(tech))
                    const orderedSkills = [...held, ...remaining]
                    const shownSkills = orderedSkills.slice(0, 3)
                    const skillsExtra = orderedSkills.length - shownSkills.length
                    const matchPct = p.skills.length
                      ? Math.min(100, Math.round(((p.matched_count ?? held.length) / p.skills.length) * 100))
                      : 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="wow-joblist__row"
                        onClick={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                      >
                        <div className="wow-joblist__top">
                          <CompanyLogo logo={p.logo_url ?? undefined} name={p.company ?? '회사명 미등록'} size={34} radius={9} />
                          <div className="wow-joblist__main">
                            <div className="wow-joblist__meta">
                              <span className="wow-joblist__co">{p.company ?? '회사명 미등록'}</span>
                              <span className="wow-joblist__date">{p.post_date?.slice(5) ?? '상시채용'}</span>
                            </div>
                            <span className="wow-joblist__title">
                              <span className="wow-joblist__title-text">{p.title}</span>
                              {matchPct >= 80 && <span className="wow-jobbadge">추천</span>}
                            </span>
                            {shownSkills.length > 0 && (
                              <div className="wow-joblist__chips">
                                {shownSkills.map((tech) => (
                                  <span
                                    key={tech}
                                    className={`wow-chip ${skills.includes(tech) ? 'wow-chip--held' : 'wow-chip--gap'}`}
                                  >
                                    {tech}
                                  </span>
                                ))}
                                {skillsExtra > 0 && <span className="wow-chip wow-chip--gap wow-chip--more">+{skillsExtra}</span>}
                              </div>
                            )}
                          </div>
                          {activeTab === 'matched' && <MiniScore pct={matchPct} size={40} />}
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
  const roadmapRefreshKey = identity ? `${resumeId}:${activeResume?.skills.join('|') ?? ''}` : 'preview'
  const mockData = {
    start_matched: Y1.data.start_matched, total: Y1.data.total,
    steps: Y1.data.steps.map((step) => ({ ...step, canonical: step.tech })),
    as_of: Y1.as_of, sample_size: Y1.sample_size,
  }
  const roadmap = useWidgetData(
    identity ? () => dashboardApi.roadmap(identity) : null,
    mockData,
    roadmapRefreshKey,
  )
  const D = roadmap.value.steps.length ? roadmap.value : mockData
  const stepCount = size === '2x2' ? D.steps.length : 3
  const steps = D.steps.slice(0, stepCount)
  const last = D.steps[D.steps.length - 1]

  return (
    <div className="dcard wow-card">
      <SectionHeader title="학습 로드맵" hint="최적 순서" right={roadmap.source !== 'live' ? <PreviewBadge /> : undefined} />
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
        <SectionHeader title="한계 해금" right={!liveData ? <PreviewBadge /> : undefined} />
        <div className="wow-body"><div className="dov__empty">추천할 기술 데이터가 없어요.</div></div>
        <AsOf asOf={liveData?.as_of ?? MATCH._meta.asOf} n={roleData.n} />
      </div>
    )
  }

  if (size === '1x1') {
    return (
      <div className="dcard wow-card">
        <SectionHeader title="한계 해금" right={!liveData ? <PreviewBadge /> : undefined} />
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {!liveData && <PreviewBadge />}
            <div className="wow-seg">
              {MATCH._meta.roles.map((r) => (
                <button key={r.key} type="button" className={`wow-seg__btn${role === r.key ? ' on' : ''}`} onClick={() => setRole(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
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
  const [selectedTech, setSelectedTech] = useState(A.data.pearls[0]?.tech ?? A.data.series[0]?.tech ?? '')
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
  const selected = series.find((item) => item.tech === selectedTech) ?? pearls[0] ?? series[0]

  useEffect(() => {
    if (selected && selected.tech !== selectedTech) setSelectedTech(selected.tech)
  }, [selected, selectedTech])

  const option = useMemo(() => ({
    animationDuration: 600, animationEasing: 'cubicOut',
    grid: { left: 52, right: 28, top: 30, bottom: 44 },
    tooltip: {
      ...tooltipStyle,
      confine: true,
      enterable: true,
      extraCssText: 'max-width:260px;white-space:normal;line-height:1.55;',
      formatter: (p: { data: { raw: AItem } }) => {
        const d = p.data.raw
        return `<b>${d.tech}</b>${d.owned ? ' <span style="color:#0b0b0c">· 보유</span>' : ''}<br/>그래프 좌표 · 관심 ${d.i_pct}% / 수요 ${d.d_pct}%<br/>관심 하위 ${d.i_pct}% · 수요 상위 ${100 - d.d_pct}%<br/>HN 언급률 ${d.i_now}% · 채용 수요 비중 ${d.d_now}%`
      },
    },
    xAxis: {
      type: 'value', name: '관심 백분위 →', min: -20, max: 120, interval: 20, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: (value: number) => value >= 0 && value <= 100 ? `${value}%` : '' },
    },
    yAxis: {
      type: 'value', name: '수요 백분위 →', min: -20, max: 120, interval: 20, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: (value: number) => value >= 0 && value <= 100 ? `${value}%` : '' },
    },
    series: [{
      type: 'scatter',
      clip: true,
      data: series.map((d) => ({
        value: [d.i_pct, d.d_pct], raw: d,
        symbolSize: Math.min(34, 7 + Math.log(d.n + 1) * 2.35),
        itemStyle: {
          color: d.cat === '진주' ? '#d9822b' : '#c9c9cf',
          borderColor: d.tech === selectedTech ? '#0b0b0c' : d.owned ? '#52525b' : 'transparent',
          borderWidth: d.tech === selectedTech ? 3 : d.owned ? 2 : 0,
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
  }), [selectedTech, series])

  const chartEvents = useMemo(() => ({
    click: (params: { data?: { raw?: AItem } }) => {
      if (params.data?.raw) setSelectedTech(params.data.raw.tech)
    },
  }), [])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="Hype vs Hire" hint="관심 × 수요" />
      <div className="wow-body">
        <span className="wow-scope">글로벌·HN 기준</span>
        <p className="wow-headline">개발자가 많이 이야기하는 기술과 회사가 많이 찾는 기술은 다를 수 있어요. <b>원을 누르면 실제 그래프 좌표와 해석</b>을 확인할 수 있습니다.</p>
        <div className="wow-scatter-stack">
          <ReactECharts
            option={option}
            onEvents={chartEvents}
            style={{ height: size === '1x1' ? 210 : size === '2x1' ? 280 : 340 }}
            notMerge
          />
          {selected && (
            <div className="wow-scatter-detail" aria-live="polite">
              <div className="wow-scatter-detail__head">
                <span className="wow-scatter-detail__tech">{selected.tech}</span>
                <span className="wow-scatter-detail__summary">관심 하위 {selected.i_pct}% · 수요 상위 {100 - selected.d_pct}%</span>
              </div>
              <div className="wow-scatter-detail__metrics">
                <span><small>관심 좌표</small><b>{selected.i_pct}%</b></span>
                <span><small>수요 좌표</small><b>{selected.d_pct}%</b></span>
                <span><small>HN 언급률</small><b>{selected.i_now}%</b></span>
                <span><small>채용 수요 비중</small><b>{selected.d_now}%</b></span>
              </div>
            </div>
          )}
          {size === '2x2' && pearls.length > 1 && (
            <div className="wow-pearls" aria-label="기회 기술 빠른 선택">
              {pearls.map((p) => (
                <button key={p.tech} type="button" className={`wow-pearls__row${selected?.tech === p.tech ? ' on' : ''}`} onClick={() => setSelectedTech(p.tech)}>
                  <span className="wow-pearls__tech">{p.tech}</span>
                  <span className="wow-pearls__sub">수요 상위 {100 - p.d_pct}% · 관심 하위 {p.i_pct}%</span>
                </button>
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

/* ============================================================================================
   v8 시장 탭 재구성(2026-07-14) — 신규 위젯 12종
   실데이터 실사(§1) 기준. 라이브 엔드포인트가 있는 것(연도별 추이·공동출현)은 marketApi를
   그대로 쓰고, 신규 엔드포인트(group-share·concept-tech·skill-count-dist·global-domestic-lag)는
   아직 백엔드 미배선이라 useWidgetData 하이브리드로 실패 시 목 데이터로 폴백한다.
   ============================================================================================ */

const MKT = marketDataRaw as {
  techYearly: { asOf: string; source: string; N: number; years: string[]; series: { tech: string; shares: number[]; delta: number }[] }
  cooccurrence: Record<string, { base: number; items: { tech: string; coRate: number; coCount: number }[] }>
}

/* ────────────────────────────────────────────────────────────────
   ① 판도 카드(프론트/백/DB) — group-share 목 데이터
   현재 점유율(share)은 §1 실측치(그룹 union 기준 대략치) 그대로. 연도 추이(yearly)는
   백엔드 group-share가 아직 없어 방향성만 맞춘 추정값 — 카드/모달에 "추정" 고지.
   ──────────────────────────────────────────────────────────────── */
export type GroupKey = 'frontend_fw' | 'backend_fw' | 'database' | 'programming_language'
type GroupShareItem = { tech: string; share: number; yearly: number[]; trend: 'up' | 'down' }
type GroupShareGroup = { key: GroupKey; label: string; union: number; asOf: string; items: GroupShareItem[] }

const GROUP_SHARE_YEARS = ['2023', '2024', '2025', '2026']

function gsItem(tech: string, yearly: number[]): GroupShareItem {
  return { tech, share: yearly[yearly.length - 1], yearly, trend: yearly[yearly.length - 1] >= yearly[0] ? 'up' : 'down' }
}

const GROUP_SHARE_MOCK: Record<GroupKey, GroupShareGroup> = {
  frontend_fw: {
    key: 'frontend_fw', label: '프론트 프레임워크', union: 8036, asOf: '2026-07-14',
    items: [
      gsItem('React', [72.4, 74.6, 76.1, 77.0]),
      gsItem('Vue', [39.8, 37.2, 35.0, 33.5]),
      gsItem('Next.js', [9.5, 14.8, 19.0, 22.6]),
      gsItem('Angular', [15.6, 13.9, 12.3, 11.2]),
      gsItem('Svelte', [0.2, 0.4, 0.6, 0.9]),
    ],
  },
  backend_fw: {
    key: 'backend_fw', label: '백엔드 프레임워크', union: 14250, asOf: '2026-07-14',
    items: [
      gsItem('Spring', [55.2, 52.4, 50.0, 48.1]),
      gsItem('Node.js', [24.8, 27.3, 29.5, 31.3]),
      gsItem('.NET', [19.0, 17.2, 15.4, 13.9]),
      gsItem('Django', [6.0, 6.5, 6.9, 7.3]),
      gsItem('NestJS', [1.2, 3.0, 4.9, 6.5]),
    ],
  },
  database: {
    key: 'database', label: '데이터베이스', union: 9684, asOf: '2026-07-14',
    items: [
      gsItem('MySQL', [58.6, 57.8, 57.1, 56.5]),
      gsItem('Oracle', [35.0, 31.8, 28.9, 26.7]),
      gsItem('PostgreSQL', [9.8, 14.2, 18.1, 22.0]),
      gsItem('Redis', [12.0, 14.6, 16.8, 18.7]),
      gsItem('MariaDB', [18.5, 17.4, 16.5, 15.8]),
    ],
  },
  programming_language: {
    key: 'programming_language', label: '프로그래밍 언어', union: 18420, asOf: '2026-07-14',
    items: [
      gsItem('Java', [45.8, 43.6, 41.4, 39.8]),
      gsItem('Python', [28.1, 31.5, 35.7, 38.9]),
      gsItem('JavaScript', [35.2, 34.9, 34.5, 34.1]),
      gsItem('TypeScript', [16.4, 21.8, 27.2, 31.6]),
      gsItem('Kotlin', [8.1, 9.7, 11.3, 12.8]),
    ],
  },
}

function groupShareModalOption(group: GroupShareGroup) {
  const colors = ['#1f9d57', '#c8382d', '#5b78d1', '#a1a1aa', '#d9822b']
  return {
    animationDuration: 600, animationEasing: 'cubicOut',
    grid: { left: 8, right: 60, top: 16, bottom: 26, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { seriesName: string }) => {
        const item = group.items.find((i) => i.tech === p.seriesName)!
        return `<b>${item.tech}</b><br/>${GROUP_SHARE_YEARS.map((y, i) => `${y} <b>${item.yearly[i]}%</b>`).join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: GROUP_SHARE_YEARS,
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 10.5, fontWeight: 700 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: group.items.map((item, i) => ({
      name: item.tech, type: 'line', data: item.yearly, smooth: 0.15,
      symbol: 'circle', symbolSize: i === 0 ? 6 : 4,
      lineStyle: { color: colors[i % colors.length], width: i === 0 ? 2.6 : 1.4, opacity: i === 0 ? 1 : 0.7 },
      itemStyle: { color: colors[i % colors.length], borderColor: '#fff', borderWidth: 1 },
      endLabel: { show: true, formatter: item.tech, color: colors[i % colors.length], fontFamily: FONT, fontSize: 9.5, fontWeight: 700, distance: 5 },
    })),
  }
}

/** 판도 카드 — 1~3위 + 그룹내 점유% 요약. 클릭하면 전체 순위 + 증감 화살표 + 연도별
 * 점유율 추이(멀티라인) 모달을 연다(스펙 §4-2). 라이브 group-share가 아직 없어 domestic은
 * §1 실측 목, global은 (표본에 프레임워크 항목이 없어) 값을 지어내는 대신 "준비 중"으로
 * 정직하게 비워둔다 — marketApi.groupShare 연동 시 이 컴포넌트 변경 없이 자동으로 채워진다. */
export function GroupShareCard({ group, pool }: { group: GroupKey; pool: PoolChoice }) {
  const navigate = useNavigate()
  const mock = GROUP_SHARE_MOCK[group]
  const [open, setOpen] = useState(false)
  const [domesticLive, setDomesticLive] = useState<GroupShareGroup | null>(null)
  const [globalLive, setGlobalLive] = useState<GroupShareGroup | null>(null)

  useEffect(() => {
    if (group === 'programming_language') return
    let cancelled = false
    marketApi.groupShare({ group, pool: 'domestic' }).then((r) => {
      if (cancelled || !r.items.length) return
      setDomesticLive({
        key: group, label: mock.label, union: r.union_count, asOf: r.as_of,
        items: r.items.map((it) => gsItem(it.canonical, [it.share, it.share, it.share, it.share])),
      })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [group, mock.label])

  useEffect(() => {
    if (pool === 'domestic') { setGlobalLive(null); return }
    if (group === 'programming_language') { setGlobalLive(null); return }
    let cancelled = false
    marketApi.groupShare({ group, pool: 'global' }).then((r) => {
      if (cancelled || !r.items.length) return
      setGlobalLive({
        key: group, label: mock.label, union: r.union_count, asOf: r.as_of,
        items: r.items.map((it) => gsItem(it.canonical, [it.share, it.share, it.share, it.share])),
      })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [group, pool, mock.label])

  const showGlobal = pool !== 'domestic'
  const globalReady = !!globalLive
  const domesticData = domesticLive ?? mock
  const top3 = domesticData.items.slice(0, 3)
  const modalData = pool === 'global' && globalLive ? globalLive : domesticData

  return (
    <>
      <button type="button" className="mktgs" onClick={() => setOpen(true)}>
        <div className="mktgs__head">
          <span className="mktgs__t">{mock.label}</span>
          <span className="mktgs__open">전체 ⊕</span>
        </div>
        <div className="mktgs__list">
          {top3.map((it, i) => (
            <div key={it.tech} className="mktgs__row">
              <span className="mktgs__rank">{i + 1}</span>
              <span className="mktgs__tech">{it.tech}</span>
              <span className={`mktgs__share${i === 0 ? ' lead' : ''}`}>{it.share}%</span>
            </div>
          ))}
        </div>
        {showGlobal && (
          <div className="mktgs__globalnote">
            {globalReady ? `글로벌 1위 · ${globalLive!.items[0].tech}` : '글로벌 판도 준비 중'}
          </div>
        )}
        <span className="mktgs__cta">클릭 → 전체 순위 · 연도 추이</span>
      </button>
      {open && (
        <div className="mktmodal__backdrop" onClick={() => setOpen(false)}>
          <div className="mktmodal__card" role="dialog" aria-modal="true" aria-label={`${mock.label} 전체 순위`} onClick={(e) => e.stopPropagation()}>
            <div className="mktmodal__head">
              <b>{mock.label}</b>
              <button type="button" className="mktmodal__close" onClick={() => setOpen(false)} aria-label="닫기">✕</button>
            </div>
            <div className="mktmodal__body">
              <div className="mktmodal__ranklist">
                {modalData.items.map((it, i) => (
                  <button key={it.tech} type="button" className="mktmodal__rankrow" onClick={() => navigate(`/tech/${encodeURIComponent(it.tech)}`)}>
                    <span className="mktmodal__rank">{i + 1}</span>
                    <span className="mktmodal__tech">{it.tech}</span>
                    <span className="mktmodal__share">{it.share}%</span>
                    <span className={`mktmodal__trend ${it.trend}`}>{it.trend === 'up' ? '↗' : '↘'}</span>
                  </button>
                ))}
              </div>
              <div className="mktmodal__chart">
                <div className="mktmodal__chart-t">기술별 연도 점유율 추이 {pool === 'global' && globalReady ? '' : '(추정)'}</div>
                <ReactECharts option={groupShareModalOption(modalData)} style={{ height: 200 }} notMerge />
              </div>
            </div>
            <div className="mktmodal__foot">
              그룹 union 기준 대략치 · {modalData.union.toLocaleString()}건 · 기준일 {modalData.asOf}
              {group === 'database' && <> · PostgreSQL은 3위지만 성장세는 1위예요.</>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────
   ①-a 연도별 수요 레이스 — 언어 점유율 추이 + 추월 강조(Python↗ vs Java↘)
   라이브: marketApi.yearlyTrend(pool). 목: marketData.techYearly(국내 jumpit 단일소스).
   ──────────────────────────────────────────────────────────────── */
type YearlySeriesItem = { canonical: string; shares: number[]; delta: number }
type YearlyPayload = { years: string[]; series: YearlySeriesItem[] }

const YEARLY_MOCK: YearlyPayload = {
  years: MKT.techYearly.years,
  series: MKT.techYearly.series.map((r) => ({ canonical: r.tech, shares: r.shares, delta: r.delta })),
}

function pickRaceLines(payload: YearlyPayload, limit = 3): YearlySeriesItem[] {
  const forced = ['Python', 'Java'].map((t) => payload.series.find((s) => s.canonical === t)).filter((s): s is YearlySeriesItem => !!s)
  const rest = [...payload.series]
    .filter((s) => !forced.includes(s))
    .sort((a, b) => (b.shares[b.shares.length - 1] ?? 0) - (a.shares[a.shares.length - 1] ?? 0))
  return [...forced, ...rest].slice(0, limit)
}

/** Python이 Java를 추월하는 해(첫 역전 연도)를 찾는다 — 없으면 -1. */
function findCrossoverIndex(payload: YearlyPayload): number {
  const py = payload.series.find((s) => s.canonical === 'Python')
  const jv = payload.series.find((s) => s.canonical === 'Java')
  if (!py || !jv) return -1
  for (let i = 1; i < payload.years.length; i += 1) {
    if (jv.shares[i - 1] >= py.shares[i - 1] && py.shares[i] > jv.shares[i]) return i
  }
  return -1
}

export function DemandRaceChart({ pool }: { pool: PoolChoice }) {
  const [domestic, setDomestic] = useState<YearlyPayload | null>(null)
  const [global, setGlobalData] = useState<YearlyPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    marketApi.yearlyTrend('domestic').then((r) => {
      if (!cancelled && r.series.length) setDomestic({ years: r.years.map(String), series: r.series })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (pool === 'domestic') { setGlobalData(null); return }
    let cancelled = false
    marketApi.yearlyTrend('global').then((r) => {
      if (!cancelled && r.series.length) setGlobalData({ years: r.years.map(String), series: r.series })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [pool])

  const dom = domestic ?? YEARLY_MOCK
  const domLines = useMemo(() => pickRaceLines(dom), [dom])
  const globalLines = useMemo(() => (pool !== 'domestic' && global ? pickRaceLines(global) : []), [pool, global])
  const crossoverIdx = useMemo(() => findCrossoverIndex(dom), [dom])
  const colors = ['#1f9d57', '#c8382d', '#5b78d1']

  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 8, right: 64, top: 20, bottom: 26, containLabel: true },
    tooltip: {
      ...tooltipStyle, trigger: 'axis',
      formatter: (params: { seriesName: string; axisValue: string; value: number }[]) =>
        `${params[0]?.axisValue}<br/>${params.map((p) => `${p.seriesName} <b>${p.value}%</b>`).join('<br/>')}`,
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: dom.years,
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: [
      ...domLines.map((s, i) => ({
        name: s.canonical, type: 'line', data: s.shares, smooth: 0.15,
        symbol: 'circle', symbolSize: 6,
        lineStyle: { color: colors[i % colors.length], width: 2.8 },
        itemStyle: { color: colors[i % colors.length], borderColor: '#fff', borderWidth: 1.2 },
        endLabel: { show: true, formatter: s.canonical, color: colors[i % colors.length], fontFamily: FONT, fontSize: 10.5, fontWeight: 700, distance: 6 },
        markPoint: (i < 2 && crossoverIdx > 0) ? {
          silent: true, symbol: 'circle', symbolSize: 1,
          data: [{ coord: [dom.years[crossoverIdx], s.shares[crossoverIdx]] }],
          label: { show: i === 0, formatter: '추월', position: 'top', color: '#166534', fontFamily: FONT, fontSize: 10, fontWeight: 800 },
        } : undefined,
        z: 5,
      })),
      ...globalLines.map((s, i) => ({
        name: `${s.canonical}(글로벌)`, type: 'line', data: s.shares, smooth: 0.15,
        symbol: 'circle', symbolSize: 4,
        lineStyle: { color: colors[i % colors.length], width: 1.4, type: 'dashed', opacity: 0.65 },
        itemStyle: { color: colors[i % colors.length], borderColor: '#fff', borderWidth: 1, opacity: 0.65 },
        z: 2,
      })),
    ],
  }), [dom, domLines, globalLines, crossoverIdx])

  return (
    <ReactECharts option={option} style={{ height: 250 }} notMerge />
  )
}

/* ────────────────────────────────────────────────────────────────
   ②-a 수요 × 성장률 버블 산점도 — "기회/포화" 판단 카피 없이 좌표만 제공(스펙 요구).
   x=최근 연도 점유율(수요 프록시) · y=Δ(성장률) · size=x. yearlyTrend 재사용, 신규 목 없음.
   ──────────────────────────────────────────────────────────────── */
export function DemandGrowthScatter({ pool, size = '2x2' }: { pool: PoolChoice; size?: WidgetSize }) {
  const [domestic, setDomestic] = useState<YearlyPayload | null>(null)
  const [global, setGlobalData] = useState<YearlyPayload | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.yearlyTrend('domestic').then((r) => { if (!cancelled && r.series.length) setDomestic({ years: r.years.map(String), series: r.series }) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (pool === 'domestic') { setGlobalData(null); return }
    let cancelled = false
    marketApi.yearlyTrend('global').then((r) => { if (!cancelled && r.series.length) setGlobalData({ years: r.years.map(String), series: r.series }) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [pool])

  const dom = domestic ?? YEARLY_MOCK
  const toPoints = (payload: YearlyPayload, tag: 'domestic' | 'global') => payload.series.map((s) => ({
    tech: s.canonical, x: s.shares[s.shares.length - 1] ?? 0, y: s.delta, tag,
  }))
  const domPoints = useMemo(() => toPoints(dom, 'domestic'), [dom])
  const globalPoints = useMemo(() => (global ? toPoints(global, 'global') : []), [global])
  const points = pool === 'domestic' ? domPoints : pool === 'global' ? (globalPoints.length ? globalPoints : domPoints) : [...domPoints, ...globalPoints]
  const maxX = Math.max(...points.map((p) => p.x), 1)

  // P0-2 — 축 여백·사분면 기준선용 통계치. 중앙값 기준으로 사분면을 나눠 "고수요/저수요 ×
  // 고성장/저성장" 4개 영역에 중립적 라벨만 붙인다(추천/판단 카피 금지, 스펙 원칙).
  const median = (arr: number[]) => {
    if (!arr.length) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }
  const medianX = useMemo(() => median(points.map((p) => p.x)), [points])
  const medianY = useMemo(() => median(points.map((p) => p.y)), [points])
  const xMax = useMemo(() => Math.max(maxX * 1.18, maxX + 2), [maxX])
  const rawMinY = Math.min(...points.map((p) => p.y), 0)
  const rawMaxY = Math.max(...points.map((p) => p.y), 0)
  const yPad = Math.max((rawMaxY - rawMinY) * 0.16, 2)
  const yMin = useMemo(() => Math.floor(rawMinY - yPad), [rawMinY, yPad])
  const yMax = useMemo(() => Math.ceil(rawMaxY + yPad), [rawMaxY, yPad])

  // 상시 라벨은 "주목 지점"만 — 최고 수요 상위3 ∪ 최고 성장 상위3(중복 제거). 나머지는
  // labelLayout으로 겹치면 자동 이동시키되, 기본은 숨기고 hover(emphasis) 시에만 노출.
  const highlightSet = useMemo(() => {
    const key = (p: typeof points[number]) => p.tech + p.tag
    const byDemand = [...points].sort((a, b) => b.x - a.x).slice(0, 3).map(key)
    const byGrowth = [...points].sort((a, b) => b.y - a.y).slice(0, 3).map(key)
    return new Set([...byDemand, ...byGrowth])
  }, [points])

  const option = useMemo(() => ({
    animationDuration: 600, animationEasing: 'cubicOut',
    grid: { left: 50, right: 34, top: 32, bottom: 42 },
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { data: { raw: typeof points[number] } }) => {
        const d = p.data.raw
        return `<b>${d.tech}</b>${d.tag === 'global' ? ' · 글로벌' : ''}<br/>현재 수요(점유율) ${d.x}% · 성장률 ${d.y > 0 ? '+' : ''}${d.y}%p`
      },
    },
    xAxis: {
      type: 'value', name: '현재 수요(점유율) →', min: 0, max: xMax, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
    },
    yAxis: {
      type: 'value', name: '성장률(Δ) →', min: yMin, max: yMax, nameTextStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { lineStyle: { color: '#e6e9ef' } },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%p' },
    },
    series: [{
      type: 'scatter',
      labelLayout: { moveOverlap: 'shiftY' },
      markLine: {
        silent: true, symbol: 'none', animation: false,
        lineStyle: { color: '#dcdfe6', type: 'dashed', width: 1 }, label: { show: false },
        data: [{ xAxis: medianX }, { yAxis: medianY }],
      },
      markArea: {
        silent: true,
        itemStyle: { color: 'transparent' },
        label: { formatter: '{b}', color: '#b4b7c0', fontFamily: FONT, fontSize: 10, fontWeight: 700 },
        data: [
          [{ name: '고수요 · 고성장', xAxis: medianX, yAxis: medianY, label: { position: 'insideTopRight' } }, { xAxis: xMax, yAxis: yMax }],
          [{ name: '저수요 · 고성장', xAxis: 0, yAxis: medianY, label: { position: 'insideTopLeft' } }, { xAxis: medianX, yAxis: yMax }],
          [{ name: '고수요 · 저성장', xAxis: medianX, yAxis: yMin, label: { position: 'insideBottomRight' } }, { xAxis: xMax, yAxis: medianY }],
          [{ name: '저수요 · 저성장', xAxis: 0, yAxis: yMin, label: { position: 'insideBottomLeft' } }, { xAxis: medianX, yAxis: medianY }],
        ],
      },
      data: points.map((d) => {
        const isHighlight = highlightSet.has(d.tech + d.tag)
        return {
          value: [d.x, d.y], raw: d,
          symbolSize: Math.min(30, 9 + Math.sqrt(d.x / maxX) * 20),
          itemStyle: { color: d.tag === 'global' ? '#d9822b' : '#5b78d1', opacity: 0.6 },
          label: { show: isHighlight, formatter: d.tech, position: 'top', color: '#43454c', fontFamily: FONT, fontSize: 9.5, fontWeight: 700 },
          emphasis: { label: { show: true } },
        }
      }),
    }],
  }), [points, maxX, xMax, yMin, yMax, medianX, medianY, highlightSet])

  return <ReactECharts option={option} style={{ height: size === '2x1' ? 200 : 300 }} notMerge />
}

/* ────────────────────────────────────────────────────────────────
   ②-b 동반 요구 스킬 — cooccurrence 재활용(라이브 시도 → 실패 시 marketData.cooccurrence 목).
   ──────────────────────────────────────────────────────────────── */
const COOC_ANCHORS = Object.keys(MKT.cooccurrence)

export function CooccurrenceBarWidget({ pool, headerRight }: { pool: PoolChoice; headerRight?: ReactNode }) {
  const [anchor, setAnchor] = useState(COOC_ANCHORS[0])
  const mockItems = (MKT.cooccurrence[anchor]?.items ?? []).slice(0, 4).map((i) => ({ tech: i.tech, coRate: i.coRate }))
  const [live, setLive] = useState<{ tech: string; coRate: number }[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setLive(null)
    marketApi.cooccurrence({ pool: poolToApi(pool), skill: anchor, top_k: 10 }).then((r) => {
      if (cancelled) return
      const items = r.links
        .filter((l) => l.source === anchor || l.target === anchor)
        .map((l) => ({ tech: l.source === anchor ? l.target : l.source, coRate: l.co_rate }))
        .sort((a, b) => b.coRate - a.coRate)
        .slice(0, 4)
      if (items.length) setLive(items)
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [anchor, pool])

  const items = live ?? mockItems
  const maxRate = Math.max(...items.map((i) => i.coRate), 1)

  const option = useMemo(() => ({
    animationDuration: 500, animationEasing: 'cubicOut',
    grid: { left: 84, right: 40, top: 6, bottom: 6, containLabel: true },
    tooltip: { ...tooltipStyle, trigger: 'item', formatter: (p: { name: string; value: number }) => `<b>${p.name}</b><br/>${anchor}와 함께 요구되는 공고 ${p.value}%` },
    xAxis: { type: 'value', max: Math.max(100, maxRate), show: false },
    yAxis: {
      type: 'category', data: items.map((i) => i.tech).reverse(),
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 11.5, fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: 'bar', barWidth: 14,
      data: [...items].reverse().map((i) => ({
        value: i.coRate,
        itemStyle: { color: '#5b78d1', borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', formatter: `${i.coRate}%`, color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
      })),
    }],
  }), [items, maxRate, anchor])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="동반 요구 스킬" hint="함께 등장하는 비율" right={headerRight} />
      <div className="wow-seg wow-seg--scroll" style={{ marginBottom: 6 }}>
        {COOC_ANCHORS.map((a) => (
          <button key={a} type="button" className={`wow-seg__btn${a === anchor ? ' on' : ''}`} onClick={() => setAnchor(a)}>{a}</button>
        ))}
      </div>
      <div className="wow-body">
        <p className="wow-takeaway-inline"><b>{anchor}</b>가 등장하는 공고에 <b>{items[0]?.tech}</b>가 <b>{items[0]?.coRate}%</b> 함께 나와요.</p>
        <ReactECharts option={option} style={{ height: 140 }} notMerge />
      </div>
      <AsOf asOf={MKT.techYearly.asOf} note={live ? undefined : `목 데이터 · ${anchor} 기준`} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   ②-c/d 공고당 요구 스킬 — skill-count-dist 신규 엔드포인트(§5) 목 폴백.
   §1 실측: 평균 4.3개 · 중앙값 4개. 히스토그램 형태는 실측치가 없어 정규분포 근사(라벨 고지).
   ──────────────────────────────────────────────────────────────── */
type SkillCountPayload = { avg: number; median: number; sample_size: number; as_of: string; histogram: { k: number; pct: number }[] }
const SKILL_COUNT_MOCK: SkillCountPayload = {
  avg: 4.3, median: 4, sample_size: 442768, as_of: '2026-07-14',
  histogram: [
    { k: 1, pct: 6 }, { k: 2, pct: 12 }, { k: 3, pct: 19 }, { k: 4, pct: 23 },
    { k: 5, pct: 18 }, { k: 6, pct: 11 }, { k: 7, pct: 6 }, { k: 8, pct: 3 }, { k: 9, pct: 2 },
  ],
}

function useSkillCountDist(): { value: SkillCountPayload; isLive: boolean } {
  const [live, setLive] = useState<SkillCountPayload | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.skillCountDist({ pool: 'domestic' }).then((r) => {
      if (cancelled || !r.histogram.length) return
      const total = r.histogram.reduce((sum, h) => sum + h.count, 0) || 1
      setLive({
        avg: r.avg, median: r.median, sample_size: r.sample_size, as_of: r.as_of,
        histogram: r.histogram.map((h) => ({ k: h.k, pct: Math.round((h.count / total) * 1000) / 10 })),
      })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  return { value: live ?? SKILL_COUNT_MOCK, isLive: !!live }
}

export function SkillCountStatWidget() {
  const { value: d, isLive } = useSkillCountDist()
  return (
    <div className="dcard wow-card">
      <SectionHeader title="공고당 요구 스킬" hint="국내" />
      <div className="wow-body">
        <div className="wow-skillcount">
          <span className="wow-skillcount__num">{d.avg}<small>개</small></span>
        </div>
        <p className="wow-takeaway-inline">중앙값 <b>{d.median}개</b> · 핵심 스킬 5개면 대다수 공고에 등장해요.</p>
      </div>
      <AsOf asOf={d.as_of} n={d.sample_size} note={isLive ? undefined : '실측(§1 DB 실사) · 국내 기준'} />
    </div>
  )
}

export function SkillCountHistogramWidget() {
  const { value: d, isLive } = useSkillCountDist()
  const maxPct = Math.max(...d.histogram.map((h) => h.pct), 1)
  const option = useMemo(() => ({
    animationDuration: 500, animationEasing: 'cubicOut',
    grid: { left: 6, right: 6, top: 6, bottom: 20 },
    tooltip: { ...tooltipStyle, trigger: 'item', formatter: (p: { name: string; value: number }) => `요구 스킬 ${p.name}개 · 공고의 ${p.value}%` },
    xAxis: {
      type: 'category', data: d.histogram.map((h) => `${h.k}`),
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
    },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'bar', barWidth: '68%',
      data: d.histogram.map((h) => ({
        value: h.pct,
        itemStyle: { color: h.k === d.median ? '#1f9d57' : '#5b78d1', opacity: h.k === d.median ? 1 : 0.55 + 0.25 * (h.pct / maxPct) },
      })),
    }],
  }), [d, maxPct])
  return (
    <div className="dcard wow-card">
      <SectionHeader title="요구 스킬 개수 분포" hint="국내" />
      <div className="wow-body">
        <ReactECharts option={option} style={{ height: 110 }} notMerge />
      </div>
      <AsOf asOf={d.as_of} n={d.sample_size} note={isLive ? undefined : '분포 형태는 근사(§1 평균·중앙값 실측 기반)'} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   ③-b 개념 → 기술 Sankey — conceptReal.json(posting_concept 실측, 19.6만행)을 그대로 재사용.
   신규 concept-tech 엔드포인트가 붙기 전까지는 이 실측 목이 사실상 라이브 수준의 정확도.
   ──────────────────────────────────────────────────────────────── */
const CONCEPT_FOR_SANKEY = (conceptRaw as unknown as { concepts: ConceptItem[] }).concepts
type SankeyNode = { name: string; kind: 'concept' | 'tech' }
type SankeyLink = { source: string; target: string; value: number }
type SankeyPayload = { nodes: SankeyNode[]; links: SankeyLink[] }

function buildConceptSankeyMock(): SankeyPayload {
  const top = [...CONCEPT_FOR_SANKEY].sort((a, b) => b.demand - a.demand).slice(0, 5)
  const conceptNames = new Set<string>()
  const techNames = new Set<string>()
  const links: SankeyLink[] = []
  top.forEach((c) => {
    conceptNames.add(c.label)
    c.signature.slice(0, 4).forEach((t) => {
      techNames.add(t.tech)
      links.push({ source: c.label, target: t.tech, value: Math.max(1, t.n) })
    })
  })
  const nodes: SankeyNode[] = [
    ...[...conceptNames].map((name) => ({ name, kind: 'concept' as const })),
    ...[...techNames].map((name) => ({ name, kind: 'tech' as const })),
  ]
  return { nodes, links }
}
const CONCEPT_SANKEY_MOCK = buildConceptSankeyMock()

// 개념 노드 구분용 저채도 팔레트(모노톤 계열에 어울리는 뮤트 톤 — 원색/쨍한 색 금지).
// 개념마다 하나씩 배정하고, 그 개념에서 나가는 링크는 같은 색을 낮은 opacity로 물려받아
// 흐름의 출처를 색으로 추적하게 한다. 기술 노드는 중립 회색으로 둬서 "색 있는 축"을 개념 쪽에 둔다.
const SANKEY_CONCEPT_RGB: Array<[number, number, number]> = [
  [107, 124, 156], // 뮤트 슬레이트 블루
  [127, 156, 134], // 뮤트 세이지 그린
  [165, 138, 111], // 뮤트 웜 토프
  [154, 129, 153], // 뮤트 모브
  [111, 149, 153], // 뮤트 틸
]
const SANKEY_TECH_COLOR = '#aab0bb' // 중립 회색(기술 노드)
const sankeyRgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
const sankeyRgba = (c: [number, number, number], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`

// P0-1 — 노드 과밀 완화: 라이브·목 데이터 어느 쪽이든 "상위 개념 5개 × 개념당 상위 기술 4개"로
// 균일하게 슬라이스한다(목은 이미 이 기준으로 생성되어 사실상 no-op, 라이브는 방어적 캡).
function sliceSankeyPayload(payload: SankeyPayload, topConcepts = 5, topTechsPerConcept = 4): SankeyPayload {
  const concepts = payload.nodes.filter((n) => n.kind === 'concept')
  const totals = new Map<string, number>()
  payload.links.forEach((l) => totals.set(l.source, (totals.get(l.source) ?? 0) + l.value))
  const keepConcepts = [...concepts]
    .sort((a, b) => (totals.get(b.name) ?? 0) - (totals.get(a.name) ?? 0))
    .slice(0, topConcepts)
    .map((c) => c.name)
  const keptLinks: SankeyLink[] = []
  keepConcepts.forEach((name) => {
    const top = payload.links.filter((l) => l.source === name).sort((a, b) => b.value - a.value).slice(0, topTechsPerConcept)
    keptLinks.push(...top)
  })
  const techNames = new Set(keptLinks.map((l) => l.target))
  const nodes: SankeyNode[] = [
    ...keepConcepts.map((name) => ({ name, kind: 'concept' as const })),
    ...[...techNames].map((name) => ({ name, kind: 'tech' as const })),
  ]
  return { nodes, links: keptLinks }
}

export function ConceptTechSankeyWidget({ pool }: { pool: PoolChoice }) {
  const [live, setLive] = useState<SankeyPayload | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.conceptTech({ pool: poolToApi(pool), top_concepts: 5, top_techs: 4 }).then((r) => {
      if (cancelled || !r.links.length) return
      const nodes: SankeyNode[] = r.nodes.map((n) => ({ name: n.name, kind: n.type === 'tech' ? 'tech' : 'concept' }))
      setLive({ nodes, links: r.links })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [pool])
  const raw = live ?? CONCEPT_SANKEY_MOCK
  const data = useMemo(() => sliceSankeyPayload(raw), [raw])

  // 개념 노드 순서대로 저채도 색을 배정 — 노드 색 + 링크 tint 색의 단일 출처.
  const conceptColor = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    data.nodes.filter((n) => n.kind === 'concept').forEach((n, i) => {
      map.set(n.name, SANKEY_CONCEPT_RGB[i % SANKEY_CONCEPT_RGB.length])
    })
    return map
  }, [data])

  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    tooltip: {
      ...tooltipStyle, trigger: 'item',
      formatter: (p: { dataType: string; name: string; data: { source?: string; target?: string; value?: number } }) => {
        if (p.dataType === 'edge') return `<b>${p.data.source}</b> → <b>${p.data.target}</b><br/>공고 ${p.data.value?.toLocaleString()}건`
        return `<b>${p.name}</b>`
      },
    },
    series: [{
      type: 'sankey', layout: 'none', nodeGap: 18, nodeWidth: 14,
      left: '15%', right: '18%', top: 14, bottom: 14,
      emphasis: { focus: 'adjacency' },
      data: data.nodes.map((n) => {
        const c = conceptColor.get(n.name)
        return {
          name: n.name,
          itemStyle: { color: n.kind === 'concept' && c ? sankeyRgb(c) : SANKEY_TECH_COLOR, borderColor: '#fff' },
          label: {
            fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#43454c',
            position: n.kind === 'concept' ? 'left' : 'right',
          },
        }
      }),
      // 링크는 출발 개념의 색을 낮은 opacity로 tint — 어느 흐름이 어느 개념에서 나왔는지 색으로 추적.
      links: data.links.map((l) => {
        const c = conceptColor.get(l.source)
        return { ...l, lineStyle: { color: c ? sankeyRgba(c, 0.4) : 'rgba(170, 176, 187, 0.35)' } }
      }),
      lineStyle: { curveness: 0.5 },
    }],
  }), [data, conceptColor])

  return <ReactECharts option={option} style={{ height: 420 }} notMerge />
}

/* ────────────────────────────────────────────────────────────────
   ⑤-a 국내 시차 타임라인 — "해외에서 뜬 기술이 국내 채용에 오기까지".
   신규 global-domestic-lag 엔드포인트 목(§5, 근사·범위로 고지). pool≠domestic일 때만 렌더된다.
   ──────────────────────────────────────────────────────────────── */
type LagSeries = { tech: string; globalYears: string[]; globalShares: number[]; domesticYears: string[]; domesticShares: number[]; lagLabel: string }
const GLOBAL_LAG_MOCK: LagSeries = {
  tech: 'FastAPI',
  globalYears: ['2020', '2021', '2022', '2023', '2024'],
  globalShares: [1.0, 3.2, 6.5, 9.8, 12.4],
  domesticYears: ['2022', '2023', '2024', '2025'],
  domesticShares: [0.2, 1.1, 1.7, 4.3],
  lagLabel: '약 1~2년',
}

export function GlobalDomesticLagWidget() {
  const data = useWidgetData(() => marketApi.globalDomesticLag().then((r) => {
    const top = r.items[0]
    if (!top) throw new Error('empty')
    return {
      tech: top.canonical,
      globalYears: top.global_series.map((p) => String(p.year)),
      globalShares: top.global_series.map((p) => p.share),
      domesticYears: top.domestic_series.map((p) => String(p.year)),
      domesticShares: top.domestic_series.map((p) => p.share),
      lagLabel: top.lag_years === 0 ? '거의 동시' : `약 ${top.lag_years}년`,
    } as LagSeries
  }), GLOBAL_LAG_MOCK)
  const d = data.value

  const allYears = useMemo(() => [...new Set([...d.globalYears, ...d.domesticYears])].sort(), [d])
  const option = useMemo(() => ({
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 8, right: 12, top: 20, bottom: 26, containLabel: true },
    tooltip: { ...tooltipStyle, trigger: 'axis' },
    xAxis: {
      type: 'category', boundaryGap: false, data: allYears,
      axisLine: { lineStyle: { color: '#e6e9ef' } }, axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
    },
    yAxis: {
      type: 'value', axisLabel: { color: '#7c7f88', fontFamily: FONT, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef1f6' } }, axisLine: { show: false },
    },
    series: [
      {
        name: `${d.tech}(글로벌)`, type: 'line', smooth: 0.2, symbol: 'circle', symbolSize: 6,
        data: allYears.map((y) => { const idx = d.globalYears.indexOf(y); return idx >= 0 ? d.globalShares[idx] : null }),
        connectNulls: true,
        lineStyle: { color: '#5b78d1', width: 2.6 }, itemStyle: { color: '#5b78d1', borderColor: '#fff', borderWidth: 1.2 },
        endLabel: { show: true, formatter: '글로벌 선행', color: '#3730a3', fontFamily: FONT, fontSize: 10, fontWeight: 700 },
      },
      {
        name: `${d.tech}(국내)`, type: 'line', smooth: 0.2, symbol: 'circle', symbolSize: 6,
        data: allYears.map((y) => { const idx = d.domesticYears.indexOf(y); return idx >= 0 ? d.domesticShares[idx] : null }),
        connectNulls: true,
        lineStyle: { color: '#1f9d57', width: 2.6 }, itemStyle: { color: '#1f9d57', borderColor: '#fff', borderWidth: 1.2 },
        endLabel: { show: true, formatter: '국내 후행', color: '#166534', fontFamily: FONT, fontSize: 10, fontWeight: 700 },
      },
    ],
  }), [d, allYears])

  return (
    <div className="dcard wow-card">
      <SectionHeader title="국내 시차 타임라인" hint="해외 선행 → 국내 후행" />
      <div className="wow-body">
        <p className="wow-headline">
          <b>{d.tech}</b>는 해외에서 뜬 뒤 국내 채용까지 <b>{d.lagLabel}</b> 걸렸어요 — 미리 준비할 단서.
        </p>
        <ReactECharts option={option} style={{ height: 210 }} notMerge />
      </div>
      <AsOf asOf="2026-07-14" note={data.source === 'live' ? undefined : '근사치 · 표본·정렬 한계로 범위로만 제공(§5)'} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   상단 검정 풀폭 변화 스트립 — 카운트 아닌 방향/판도만(스펙 §2). marketData.techYearly +
   GROUP_SHARE_MOCK(판도 선두)에서 파생. 국내 단일소스 기준(잼핏) — 풀 셀렉터 비반응.
   ──────────────────────────────────────────────────────────────── */
export function MarketChangeStrip() {
  const topDelta = useMemo(() => [...YEARLY_MOCK.series].sort((a, b) => b.delta - a.delta)[0], [])
  const py = YEARLY_MOCK.series.find((s) => s.canonical === 'Python')
  const jv = YEARLY_MOCK.series.find((s) => s.canonical === 'Java')
  const overtaken = !!(py && jv && py.shares[py.shares.length - 1] > jv.shares[jv.shares.length - 1])
  const risingFromZero = useMemo(() => (
    [...YEARLY_MOCK.series].filter((s) => s.shares[0] < 1 && s.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3)
  ), [])
  const leaders = [GROUP_SHARE_MOCK.frontend_fw.items[0], GROUP_SHARE_MOCK.backend_fw.items[0], GROUP_SHARE_MOCK.database.items[0]]

  return (
    <div className="mktstrip">
      <div className="mktstrip__hero">
        <span className="mktstrip__icon">⭐</span>
        <div>
          <div className="mktstrip__lbl">올해의 스킬</div>
          <div className="mktstrip__v">{topDelta.canonical} <span className="mktstrip__up">↗ +{topDelta.delta.toFixed(1)}%p</span></div>
        </div>
      </div>
      <div className="mktstrip__cells">
        <div className="mktstrip__cell">
          <div className="mktstrip__lbl">언어 판도</div>
          <div className="mktstrip__v2">{overtaken ? <><span className="mktstrip__up">↗</span> Python, Java 추월</> : 'Python 급부상 중'}</div>
        </div>
        <div className="mktstrip__cell">
          <div className="mktstrip__lbl">급부상 (무→상위)</div>
          <div className="mktstrip__v2"><span className="mktstrip__up">↗</span> {risingFromZero.map((r) => r.canonical).join(' · ')}</div>
        </div>
        <div className="mktstrip__cell">
          <div className="mktstrip__lbl">판도 선두</div>
          <div className="mktstrip__v2">{leaders.map((l) => l.tech).join(' · ')}</div>
        </div>
      </div>
    </div>
  )
}
