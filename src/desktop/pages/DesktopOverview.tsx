import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Clock, ArrowUpRight, Sparkles, FileText } from 'lucide-react'
import {
  ActivityRings, useCountUp, JobCardCompact, SectionHeader, CoverageHistogram,
  HeroStat, StatTile, PreviewBadge, WidgetSettingsMenu, type RingMetric,
} from '../../career/kit'
import { IndustryFitRadar } from '../../career/insights'
import { HBars } from '../../career/charts'
import { LatestJobsTimeline, LearningPathWidget, SkillUnlockWidget } from '../../career/wowWidgets'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { getAuthToken, useAuth } from '../../career/authStore'
import {
  dashboardApi, type DistributionData, type PivotData,
} from '../../career/api'
import { useWidgetData } from '../../career/useWidgetData'
import { useDashboardConfig, isWidgetHidden, getWidgetSize } from '../../career/dashboardConfig'
import { DASHBOARD_WIDGETS } from '../../career/widgetCatalog'
import { useBookmarks } from '../../career/bookmarkStore'
import { useRecentViews } from '../../career/viewHistoryStore'
import data from '../../data/careerData.json'
import marketData from '../../data/marketData.json'
import './DesktopOverview.css'

const asOf = data.meta.asOf
const TOTAL = data.meta.totalPostings
const RECENT_DAYS = 3
const DEADLINE_SOON_DAYS = 7

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

/** asOf 기준 며칠 전에 올라온 공고인지. 날짜가 없거나 미래면 null. */
function daysSince(dateStr: string, ref: string) {
  if (!dateStr) return null
  const d = Math.round((new Date(ref).getTime() - new Date(dateStr).getTime()) / 86400000)
  return d >= 0 ? d : null
}

function LiveIndustryRadar({ data }: { data: PivotData }) {
  const targets = data.targets.slice(0, 6)
  const best = targets[0]
  const worst = targets[targets.length - 1]
  const option = useMemo(() => ({
    radar: {
      indicator: targets.map((item) => ({ name: item.name, max: 100 })),
      shape: 'polygon', radius: '68%', splitNumber: 4,
      axisName: { color: '#43454c', fontSize: 11, fontWeight: 700 },
      splitLine: { lineStyle: { color: '#e6e9ef' } },
      splitArea: { areaStyle: { color: ['#fbfcfe', '#f4f7fb'] } },
      axisLine: { lineStyle: { color: '#e2e5ec' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: targets.map((item) => item.coverage),
        areaStyle: { color: 'rgba(11,11,12,.22)' },
        lineStyle: { color: '#0b0b0c', width: 2.5 },
        itemStyle: { color: '#0b0b0c' },
      }],
    }],
  }), [targets])

  if (!best || !worst) return <div className="dov__empty">업종 적합도 데이터가 없어요.</div>
  return (
    <div>
      <ReactECharts option={option} style={{ height: 232 }} notMerge />
      <div className="ins-radar__cap">
        가장 잘 맞는 업종은 <b>{best.name}</b>({best.coverage}%) · 가장 낮은 업종은{' '}
        <b>{worst.name}</b>({worst.coverage}%)
        {worst.missing[0] && <> — <b>{worst.missing[0].canonical}</b>을 보완해보세요</>}
      </div>
    </div>
  )
}

function LiveCoverageHistogram({ data }: { data: DistributionData }) {
  const max = Math.max(...data.histogram.map((bin) => bin.count), 1)
  return (
    <div className="kit-hist">
      <div className="kit-hist__headline">
        국내 공고 {data.total.toLocaleString()}건 중 <b>{data.matched.toLocaleString()}건</b>이 기준을 넘어요
        <div className="kit-hist__sample">내 백분위 {data.my_percentile}%</div>
      </div>
      <div className="kit-hist__chart">
        <div className="kit-hist__thr" style={{ left: `${data.threshold}%` }} />
        <div className="kit-hist__thr" style={{ left: `${data.coverage_score}%`, borderColor: '#0b0b0c' }} />
        {data.histogram.map((bin) => (
          <div key={bin.range_start} className="kit-hist__col">
            <i className={bin.range_start >= data.threshold ? 'on' : ''} style={{ height: `${(bin.count / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="kit-hist__axis"><span>0%</span><span className="thr">문턱 {data.threshold}%</span><span>100%</span></div>
    </div>
  )
}

/** 데스크톱 대시보드 — 히어로 1개(커리어 점수) + KPI stat 4개 + 라벨 섹션 3개(내 시장 진단 ·
 * 무엇을 배울까 · 내 공고)로 구성한 위계형 커맨드센터. 좌측 인사이트 존은 [히어로존] +
 * [라벨 섹션들]로 나뉘며, 섹션 내부는 CSS grid로 카드 높이를 통일한다(우측 레일은 유지). */
export default function DesktopOverview() {
  const navigate = useNavigate()
  useDashboardConfig() // 위젯 표시/숨김·크기 변경 시 리렌더 트리거
  const { resumes, activeResume } = useResumesState()
  const { user } = useAuth()
  const hasResume = localStorage.getItem('techeer_resumes') !== null && resumes.length > 0 && !!activeResume
  const skills = activeResume?.skills ?? []
  const identity = useMemo(() => {
    const resumeId = Number(activeResume?.id)
    const token = getAuthToken()
    return Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null
  }, [activeResume?.id])

  const postings = useMemo(() => getDynamicPostings(skills), [skills])
  const domestic = useMemo(() => postings.filter((p) => p.pool === '국내'), [postings])

  const coverage = activeResume?.coveragePct ?? calculateCoverage(skills, '국내')
  const applicable = domestic.filter((p) => p.matchPct >= 50).length

  const topJobs = useMemo(() => [...postings].sort((a, b) => b.matchPct - a.matchPct).slice(0, 6), [postings])

  const deadlineInfos = useMemo(() => {
    return domestic
      .map((p) => ({ p, dd: ddayInfo((p as { closeDate?: string }).closeDate ?? '', asOf) }))
      .filter((x): x is { p: typeof domestic[number]; dd: { d: number; label: string } } => !!x.dd)
  }, [domestic])
  const deadlines = useMemo(() => [...deadlineInfos].sort((a, b) => a.dd.d - b.dd.d).slice(0, 8), [deadlineInfos])
  const deadlineSoonCount = useMemo(() => deadlineInfos.filter((x) => x.dd.d <= DEADLINE_SOON_DAYS).length, [deadlineInfos])

  const recentCount = useMemo(() => {
    return domestic.filter((p) => {
      const d = daysSince((p as { postDate?: string }).postDate ?? '', asOf)
      return d != null && d <= RECENT_DAYS
    }).length
  }, [domestic])

  const topGap = useMemo(() => {
    const count = new Map<string, number>()
    domestic.forEach((p) => p.gap.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [domestic])

  const coverageData = useWidgetData(
    identity ? () => dashboardApi.coverage(identity, activeResume?.position) : null,
    { coverage_score: coverage, top_skills: [] },
  )
  const countData = useWidgetData(
    identity ? () => dashboardApi.applicableCount(identity, activeResume?.position) : null,
    { total: applicable },
  )
  const distributionData = useWidgetData<DistributionData | null>(
    identity ? () => dashboardApi.distribution(identity, activeResume?.position) : null,
    null,
  )
  const pivotData = useWidgetData<PivotData | null>(identity ? () => dashboardApi.pivot(identity) : null, null)
  const shareData = useWidgetData(identity ? () => dashboardApi.skillShare() : null, { items: [] })
  const shownCoverage = Math.round(coverageData.value.coverage_score)
  const shownApplicable = countData.value.total
  const shownTotal = distributionData.value?.total ?? domestic.length
  const shownApplicablePct = shownTotal ? Math.round((shownApplicable / shownTotal) * 100) : 0
  const scoreData = {
    value: { coverage: shownCoverage, applicable: shownApplicable, domesticTotal: shownTotal },
    source: coverageData.source,
  }
  const statsData = { value: { recentCount } }
  const jobsData = useWidgetData(null, topJobs)
  const deadlinesData = useWidgetData(null, deadlines)

  const rings: RingMetric[] = [
    { key: 'cov', label: '기술 보유율', pct: shownCoverage, color: '#fff' },
    { key: 'app', label: '지원 가능', pct: shownApplicablePct, color: '#1f9d57' },
  ]
  const covNum = useCountUp(scoreData.value.coverage)
  const applicableNum = useCountUp(shownApplicable)

  // 개인화 위젯 3종(북마크 · 최근 조회 · 스킬 모멘텀)
  const bookmarkIds = useBookmarks()
  const bookmarkedPostings = useMemo(
    () => bookmarkIds.map((id) => postings.find((p) => p.id === id)).filter((p): p is typeof postings[number] => !!p),
    [bookmarkIds, postings],
  )

  const recentViewsSize = getWidgetSize('dashboard', 'recent-views', DASHBOARD_WIDGETS.find((w) => w.id === 'recent-views')!.defaultSize)
  const recentViewIds = useRecentViews(recentViewsSize === '2x1' || recentViewsSize === '1x2' ? 5 : 3)
  const recentViewPostings = useMemo(
    () => recentViewIds.map((id) => postings.find((p) => p.id === id)).filter((p): p is typeof postings[number] => !!p),
    [recentViewIds, postings],
  )

  const domesticShare = marketData.skillShare['국내'] as { items: { tech: string; count: number; share: number; owned: boolean }[] }
  const skillMomentum = useMemo(() => {
    const live = shareData.source === 'live'
      ? shareData.value.items.map((item) => ({ tech: item.canonical, share: item.share * 100 }))
      : null
    return (live ?? domesticShare.items)
      .filter((item) => skills.includes(item.tech))
      .sort((a, b) => b.share - a.share)
      .slice(0, 6)
  }, [shareData.source, shareData.value, skills])
  const maxMomentumShare = Math.max(...skillMomentum.map((i) => i.share), 1)

  // 위젯 리사이즈 헬퍼 — 시장 페이지(DesktopMarket)와 동일 패턴.
  const wsize = (id: string) => {
    const item = DASHBOARD_WIDGETS.find((w) => w.id === id)!
    return getWidgetSize('dashboard', id, item.defaultSize)
  }

  const topJobsSize = wsize('top-jobs')
  const topJobsVisible = jobsData.value.slice(0, topJobsSize === '2x2' ? 6 : 3)

  const deadlinesSize = wsize('deadlines')
  const deadlinesLimit = deadlinesSize === '2x2' ? 8 : deadlinesSize === '2x1' || deadlinesSize === '1x2' ? 5 : 3
  const deadlinesVisible = deadlinesData.value.slice(0, deadlinesLimit)

  const briefSize = wsize('brief')
  const briefLines: ReactNode[] = [
    <li key="dl"><b>{deadlineSoonCount}건</b>이 곧 마감돼요</li>,
    hasResume && <li key="app">지원 가능 공고 <b>{shownApplicable.toLocaleString()}건</b> · 커버리지 <b>{shownCoverage}%</b></li>,
    hasResume && topGap[0] && <li key="gap">가장 자주 요구되는 미보유 기술: <b>{topGap[0][0]}</b></li>,
  ].filter(Boolean) as ReactNode[]
  const briefVisible = briefSize === '1x1' ? briefLines.slice(0, 2) : briefLines

  const bookmarksSize = wsize('bookmarks')
  const bookmarksLimit = bookmarksSize === '2x2' ? 6 : bookmarksSize === '2x1' ? 3 : bookmarksSize === '1x2' ? 3 : 1
  const bookmarksVisible = bookmarkedPostings.slice(0, bookmarksLimit)

  // 라벨 섹션 표시 여부 — 섹션 내 위젯이 전부 숨겨지면 섹션 헤더째로 렌더하지 않는다.
  const secMarketVisible = !isWidgetHidden('dashboard', 'industry-fit')
    || !isWidgetHidden('dashboard', 'coverage-histogram')
    || !isWidgetHidden('dashboard', 'skill-momentum')
  const secLearnVisible = !isWidgetHidden('dashboard', 'learning-path') || !isWidgetHidden('dashboard', 'skill-unlock')
  const secJobsVisible = !isWidgetHidden('dashboard', 'top-jobs')
    || !isWidgetHidden('dashboard', 'brief')
    || !isWidgetHidden('dashboard', 'deadlines')
    || !isWidgetHidden('dashboard', 'bookmarks')
    || !isWidgetHidden('dashboard', 'recent-views')

  return (
    <div className="dov">
      <header className="dov__head">
        <h1 className="dov__title">안녕하세요, {user?.nickname ?? '리버'}님</h1>
        <div className="dov__head-r">
          <div className="dov__asof">기준일 {asOf} · 공고 {TOTAL.toLocaleString()}건</div>
          <WidgetSettingsMenu section="dashboard" items={DASHBOARD_WIDGETS} />
        </div>
      </header>

      <div className="dov__layout">
        <div className="dov__insights">
          {/* Zone 1 — 히어로존: 히어로 1개(커리어 점수) + KPI stat 4개. above-fold. */}
          <div className="dov__hero-zone">
            {!isWidgetHidden('dashboard', 'hero-score') && (
              <div className="dov__hero-cell">
                {hasResume ? (
                  <HeroStat
                    eyebrow="내 커리어 점수"
                    value={covNum}
                    unit="%"
                    chart={<ActivityRings metrics={rings} size={84} trackColor="rgba(255,255,255,.14)" />}
                    caption={<>국내 공고 <b>{scoreData.value.domesticTotal.toLocaleString()}건</b> 중 <b>{scoreData.value.applicable.toLocaleString()}건</b> 지원 가능</>}
                  />
                ) : (
                  <section
                    className="kit-heroStat"
                    style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}
                  >
                    <span style={{ position: 'absolute', top: 28, left: 30, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.56)' }}>
                      내 커리어 점수
                    </span>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,.1)' }}>
                      <FileText size={22} />
                    </span>
                    <strong style={{ fontSize: 18, lineHeight: 1.45 }}>이력서를 등록하면 내 커리어 점수를 확인할 수 있어요.</strong>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.62)' }}>이력서 등록 전에는 아래 분석 위젯에 예시 데이터를 보여드려요.</span>
                    <button
                      className="dov__cta-btn"
                      style={{ marginTop: 4, background: '#fff', color: '#111' }}
                      onClick={() => navigate('/resume/submit')}
                    >
                      이력서 등록하기
                    </button>
                  </section>
                )}
              </div>
            )}

            <div className="dov__kpis">
              {!isWidgetHidden('dashboard', 'hero-applicable') && (
                <StatTile label="지원 가능 공고" value={hasResume ? applicableNum : '—'} unit={hasResume ? '건' : undefined} />
              )}
              {!isWidgetHidden('dashboard', 'deadlines') && (
                <StatTile label="마감 임박" value={deadlineSoonCount} unit="건" />
              )}
              {!isWidgetHidden('dashboard', 'stat-recent') && (
                <StatTile label="신규 공고" value={statsData.value.recentCount} unit="건" />
              )}
              {!isWidgetHidden('dashboard', 'bookmarks') && (
                <StatTile label="북마크" value={bookmarkIds.length} unit="건" />
              )}
            </div>
          </div>

          {/* Zone 2 — 내 시장 진단: 업종 적합도 · 커버리지 분포 · 내 스킬 시장 모멘텀 */}
          {secMarketVisible && (
            <section className="dov__sec">
              <h2 className="dov__sec-title">내 시장 진단</h2>
              <p className="dov__sec-hint">내 스킬이 시장에서 어디쯤인지</p>
              <div className="dov__sec-grid dov__sec-grid--3">
                {!isWidgetHidden('dashboard', 'industry-fit') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="업종 적합도" right={!hasResume && <PreviewBadge />} />
                      <div className="dov__aside-chart">
                        {pivotData.source === 'live' && pivotData.value
                          ? <LiveIndustryRadar data={pivotData.value} />
                          : <IndustryFitRadar skills={skills} />}
                      </div>
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'coverage-histogram') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="커버리지 분포" hint="내 백분위" right={!hasResume && <PreviewBadge />} />
                      {distributionData.source === 'live' && distributionData.value ? (
                        <LiveCoverageHistogram data={distributionData.value} />
                      ) : (
                        <CoverageHistogram
                          postings={domestic.map((p) => ({ techs: p.techs, held: p.matchHeld, total: p.matchTotal }))}
                          mySkills={skills}
                          gap={topGap.map(([tech, count]) => ({ tech, count }))}
                          poolLabel="국내"
                        />
                      )}
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'skill-momentum') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="내 스킬 시장 모멘텀" hint="국내 · 점유율" right={!hasResume && <PreviewBadge />} />
                      {skills.length === 0 ? (
                        <div className="dov__empty">이력서를 등록하면 내 스킬의 시장 모멘텀을 봐요.</div>
                      ) : skillMomentum.length === 0 ? (
                        <div className="dov__empty">시장 데이터에서 일치하는 보유 기술이 없어요.</div>
                      ) : (
                        <HBars
                          items={skillMomentum.map((i) => ({ label: i.tech, value: i.share, pct: (i.share / maxMomentumShare) * 100, owned: true }))}
                          unit="%"
                        />
                      )}
                    </section>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Zone 2b — 무엇을 배울까: 학습 로드맵 · 한계 해금 */}
          {secLearnVisible && (
            <section className="dov__sec">
              <h2 className="dov__sec-title">무엇을 배울까</h2>
              <p className="dov__sec-hint">점수를 올리는 다음 스텝</p>
              <div className="dov__sec-grid dov__sec-grid--2">
                {!isWidgetHidden('dashboard', 'learning-path') && (
                  <div className="dov__card-item">
                    <LearningPathWidget size={wsize('learning-path')} />
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'skill-unlock') && (
                  <div className="dov__card-item">
                    <SkillUnlockWidget size={wsize('skill-unlock')} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Zone 3 — 내 공고: 맞춤 공고 Top(조금 크게) · 오늘 브리핑 · 마감 임박 · 북마크 · 최근 본 공고 */}
          {secJobsVisible && (
            <section className="dov__sec">
              <h2 className="dov__sec-title">내 공고</h2>
              <p className="dov__sec-hint">지금 챙겨야 할 공고들</p>
              <div className="dov__sec-grid dov__sec-grid--3">
                {!isWidgetHidden('dashboard', 'top-jobs') && (
                  <div className="dov__card-item dov__card-item--wide">
                    <section className="dcard">
                      <SectionHeader title="맞춤 공고 Top" hint={`${topJobsVisible.length}건`} right={
                        <div className="dov__hdright">
                          {!hasResume && jobsData.source === 'mock' && <PreviewBadge />}
                          <button className="dov__more" onClick={() => navigate('/jobs')}>전체 보기 <ArrowUpRight size={15} /></button>
                        </div>
                      } />
                      <div className="dov__jobs">
                        {topJobsVisible.map((p) => (
                          <JobCardCompact
                            key={p.id}
                            job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                            logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                            onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                          />
                        ))}
                      </div>
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'brief') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <span className="dov__card-eyebrow"><Sparkles size={14} /> 오늘 브리핑</span>
                      <ul className="dov__brief">{briefVisible}</ul>
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'deadlines') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <span className="dov__card-eyebrow"><Clock size={14} /> 마감 임박</span>
                      <div className="dov__dl">
                        {deadlinesVisible.length === 0 && <div className="dov__empty">임박한 마감이 없어요.</div>}
                        {deadlinesVisible.map(({ p, dd }) => (
                          <button key={p.id} className="dov__dl-row" onClick={() => navigate(`/job/${encodeURIComponent(p.id)}`)}>
                            <CompanyLogo logo={p.logo} name={p.company} size={30} radius={9} />
                            <span className="dov__dl-body">
                              <span className="dov__dl-co">{p.company}</span>
                              <span className="dov__dl-ti">{p.title}</span>
                            </span>
                            <span className={`dov__dday${dd.d <= 3 ? ' urgent' : ''}`}>D-{dd.d}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'bookmarks') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="북마크한 공고" hint={`${bookmarkedPostings.length}건`} right={
                        <button className="dov__more" onClick={() => navigate('/jobs')}>전체 보기 <ArrowUpRight size={15} /></button>
                      } />
                      {bookmarksVisible.length === 0 ? (
                        <div className="dov__empty">북마크한 공고가 없어요. 공고 상세에서 북마크해보세요.</div>
                      ) : (
                        <div className="dov__jobs" style={{ gridTemplateColumns: '1fr' }}>
                          {bookmarksVisible.map((p) => (
                            <JobCardCompact
                              key={p.id}
                              job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                              logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                              onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'recent-views') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="최근 본 공고" hint={`${recentViewPostings.length}건`} />
                      {recentViewPostings.length === 0 ? (
                        <div className="dov__empty">최근 본 공고가 없어요.</div>
                      ) : (
                        <div className="dov__jobs" style={{ gridTemplateColumns: '1fr' }}>
                          {recentViewPostings.map((p) => (
                            <JobCardCompact
                              key={p.id}
                              job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                              logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                              onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="dov__rail">
          {/* 최신 공고 타임라인 — 레일에서는 항상 세로로 길게(2x2) */}
          {!isWidgetHidden('dashboard', 'latest-timeline') && <LatestJobsTimeline size="2x2" />}
        </aside>
      </div>
    </div>
  )
}
