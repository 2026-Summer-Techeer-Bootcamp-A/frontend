import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Sparkles, FileText, Info } from 'lucide-react'
import {
  ActivityRings, useCountUp, SectionHeader, CoverageHistogram,
  PreviewBadge, WidgetSettingsMenu, type RingMetric,
} from '../../career/kit'
import { IndustryFitRadar } from '../../career/insights'
import { HBars } from '../../career/charts'
import { LatestJobsTimeline, LearningPathWidget, SkillUnlockWidget } from '../../career/wowWidgets'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { getAuthToken, useAuth } from '../../career/authStore'
import {
  dashboardApi, jobsApi, type DistributionData, type PivotData, type PostingCard,
} from '../../career/api'
import { useWidgetData } from '../../career/useWidgetData'
import { useDashboardConfig, isWidgetHidden, getWidgetSize } from '../../career/dashboardConfig'
import { DASHBOARD_WIDGETS } from '../../career/widgetCatalog'
import { useBookmarks } from '../../career/bookmarkStore'
import data from '../../data/careerData.json'
import './DesktopOverview.css'

const asOf = data.meta.asOf
const TOTAL = data.meta.totalPostings
const RECENT_DAYS = 90
const DEADLINE_SOON_DAYS = 7

/** asOf 기준 며칠 전에 올라온 공고인지. 날짜가 없거나 미래면 null. */
function daysSince(dateStr: string, ref: string) {
  if (!dateStr) return null
  const d = Math.round((new Date(ref).getTime() - new Date(dateStr).getTime()) / 86400000)
  return d >= 0 ? d : null
}

/** 공용 Tooltip 컴포넌트가 없어 네이티브 hover 패널로 가볍게 구현한 정보 아이콘.
 * title 속성도 함께 달아 스크린리더·기본 브라우저 툴팁으로도 내용이 전달되게 한다. */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="dov__info-tip" tabIndex={0} title={text}>
      <Info size={13} />
      <span className="dov__info-tip-panel">{text}</span>
    </span>
  )
}

function DashboardSkeleton({ label = '데이터를 불러오는 중이에요.' }: { label?: string }) {
  return (
    <div className="dov__skeleton" role="status" aria-live="polite">
      <span className="dov__skeleton-line dov__skeleton-line--short" />
      <span className="dov__skeleton-block" />
      <span className="dov__skeleton-line" />
      <span className="dov__sr-only">{label}</span>
    </div>
  )
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
        <InfoTip text={`기준 = 보유 기술 매칭률 ${data.threshold}% 이상`} />
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

/** 데스크톱 대시보드 — 검정 히어로 카드 1개(좌: 커리어 점수, 우: KPI 2x2) + 라벨 섹션 2개(내 시장 진단 ·
 * 무엇을 배울까)로 구성한 위계형 커맨드센터. 공고 목록은 우측 레일의 최신 공고 타임라인 탭으로 통합됐다. */
export default function DesktopOverview() {
  const navigate = useNavigate()
  useDashboardConfig() // 위젯 표시/숨김·크기 변경 시 리렌더 트리거
  const { resumes, activeResume, loading: resumesLoading } = useResumesState()
  const { user } = useAuth()
  // 이력서는 백엔드(resumeApi)에서 불러온다 — 예전 로컬 저장 시절의 잔재인
  // localStorage('techeer_resumes') 체크를 남겨두면 그 키가 절대 안 써져 항상 false가
  // 되어 이력서를 등록해도 대시보드가 미등록으로 취급하는 버그가 있었다.
  const hasResume = resumes.length > 0 && !!activeResume
  const skills = activeResume?.skills ?? []
  const token = getAuthToken()
  const identity = useMemo(() => {
    const resumeId = Number(activeResume?.id)
    return Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null
  }, [activeResume?.id, token, user?.id])
  const dashboardRefreshKey = identity ? `${identity.resumeId}:${skills.join('|')}` : 'preview'

  const postings = useMemo(() => getDynamicPostings(skills), [skills])
  const domestic = useMemo(() => postings.filter((p) => p.pool === '국내'), [postings])

  const coverage = activeResume?.coveragePct ?? calculateCoverage(skills, '국내')
  const applicable = domestic.filter((p) => p.matchPct >= 50).length

  const deadlineInfos = useMemo(() => {
    return domestic
      .map((p) => ({ p, dd: ddayInfo((p as { closeDate?: string }).closeDate ?? '', asOf) }))
      .filter((x): x is { p: typeof domestic[number]; dd: { d: number; label: string } } => !!x.dd)
  }, [domestic])
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
    identity ? () => dashboardApi.coverage(identity) : null,
    { coverage_score: coverage, top_skills: [] },
    dashboardRefreshKey,
  )
  const countData = useWidgetData(
    identity ? () => dashboardApi.applicableCount(identity) : null,
    { total: applicable },
    dashboardRefreshKey,
  )
  const distributionData = useWidgetData<DistributionData | null>(
    identity ? () => dashboardApi.distribution(identity) : null,
    null,
    dashboardRefreshKey,
  )
  const pivotData = useWidgetData<PivotData | null>(identity ? () => dashboardApi.pivot(identity) : null, null, dashboardRefreshKey)
  const [matchedJobs, setMatchedJobs] = useState<PostingCard[]>([])
  const [matchedJobsLoading, setMatchedJobsLoading] = useState(false)
  const [matchedJobsError, setMatchedJobsError] = useState(false)

  useEffect(() => {
    if (!identity) {
      setMatchedJobs([])
      setMatchedJobsLoading(false)
      setMatchedJobsError(false)
      return
    }

    let cancelled = false
    setMatchedJobs([])
    setMatchedJobsLoading(true)
    setMatchedJobsError(false)
    jobsApi.list({
      pool: 'domestic',
      sort: 'match',
      min_match: 50,
      resume_id: identity.resumeId,
      page: 1,
      page_size: 3,
    }, identity.token)
      .then((result) => {
        if (!cancelled) setMatchedJobs(result.items)
      })
      .catch(() => {
        if (!cancelled) {
          setMatchedJobs([])
          setMatchedJobsError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setMatchedJobsLoading(false)
      })

    return () => { cancelled = true }
  }, [identity, dashboardRefreshKey])

  const matchedJobChart = useMemo(() => (matchedJobs ?? []).map((job) => {
    const requiredCount = job.skills.length
    const matchPct = requiredCount > 0
      ? Math.round(((job.matched_count ?? 0) / requiredCount) * 100)
      : 0
    return {
      label: `${job.company ?? '회사명 미상'} · ${job.title}`,
      value: matchPct,
      pct: matchPct,
      owned: true,
    }
  }), [matchedJobs])
  const shownCoverage = Math.round(coverageData.value.coverage_score)
  const shownApplicable = countData.value.total
  const shownTotal = distributionData.value?.total ?? domestic.length
  const shownApplicablePct = shownTotal ? Math.round((shownApplicable / shownTotal) * 100) : 0
  const resumePending = !!token && resumesLoading
  const heroDataPending = hasResume && [coverageData, countData, distributionData]
    .some((widget) => widget.source !== 'live' && !widget.error)
  const heroDataError = hasResume && [coverageData, countData, distributionData].some((widget) => !!widget.error)
  const scoreData = {
    value: { coverage: shownCoverage, applicable: shownApplicable, domesticTotal: shownTotal },
    source: coverageData.source,
  }
  const statsData = { value: { recentCount } }

  const rings: RingMetric[] = [
    { key: 'cov', label: '기술 보유율', pct: shownCoverage, color: '#fff' },
    { key: 'app', label: '지원 가능', pct: shownApplicablePct, color: '#1f9d57' },
  ]
  const covNum = useCountUp(scoreData.value.coverage)
  const applicableNum = useCountUp(shownApplicable)

  const bookmarkIds = useBookmarks()

  // 위젯 리사이즈 헬퍼 — 시장 페이지(DesktopMarket)와 동일 패턴.
  const wsize = (id: string) => {
    const item = DASHBOARD_WIDGETS.find((w) => w.id === id)!
    return getWidgetSize('dashboard', id, item.defaultSize)
  }

  const briefSize = wsize('brief')
  const briefLines: ReactNode[] = [
    <li key="dl"><b>{deadlineSoonCount}건</b>이 곧 마감돼요</li>,
    hasResume && (heroDataPending
      ? <li key="app-loading" className="dov__brief-loading">맞춤 지표를 불러오는 중이에요.</li>
      : heroDataError
        ? <li key="app-error">맞춤 지표를 불러오지 못했어요.</li>
        : <li key="app">지원 가능 공고 <b>{shownApplicable.toLocaleString()}건</b> · 커버리지 <b>{shownCoverage}%</b></li>),
    hasResume && topGap[0] && <li key="gap">가장 자주 요구되는 미보유 기술: <b>{topGap[0][0]}</b></li>,
  ].filter(Boolean) as ReactNode[]
  const briefVisible = briefSize === '1x1' ? briefLines.slice(0, 2) : briefLines

  // 라벨 섹션 표시 여부 — 섹션 내 위젯이 전부 숨겨지면 섹션 헤더째로 렌더하지 않는다.
  const secMarketVisible = !isWidgetHidden('dashboard', 'industry-fit')
    || !isWidgetHidden('dashboard', 'coverage-histogram')
    || !isWidgetHidden('dashboard', 'skill-momentum')
  const secLearnVisible = !isWidgetHidden('dashboard', 'learning-path') || !isWidgetHidden('dashboard', 'skill-unlock')

  const heroScoreVisible = !isWidgetHidden('dashboard', 'hero-score')
  const kpiTiles = (
    [
      !isWidgetHidden('dashboard', 'hero-applicable') && {
        id: 'hero-applicable', label: '지원 가능 공고', value: hasResume ? applicableNum : '—', unit: hasResume ? '건' : undefined,
      },
      !isWidgetHidden('dashboard', 'deadlines') && { id: 'deadlines', label: '마감 임박', value: deadlineSoonCount, unit: '건' },
      !isWidgetHidden('dashboard', 'stat-recent') && { id: 'stat-recent', label: '최근 3개월 신규 공고', value: statsData.value.recentCount, unit: '건' },
      !isWidgetHidden('dashboard', 'bookmarks') && { id: 'bookmarks', label: '북마크', value: bookmarkIds.length, unit: '건' },
    ] as const
  ).filter((tile): tile is Exclude<typeof tile, false> => !!tile)
  const heroCardVisible = heroScoreVisible || kpiTiles.length > 0

  return (
    <div className="dov">
      <header className="dov__head">
        <h1 className="dov__title">{user?.nickname ? `안녕하세요, ${user.nickname}님` : '로그인하고 나만의 커리어 인사이트를 확인해보세요'}</h1>
        <div className="dov__head-r">
          <div className="dov__asof">기준일 {asOf} · 공고 {TOTAL.toLocaleString()}건</div>
          <WidgetSettingsMenu section="dashboard" items={DASHBOARD_WIDGETS} />
        </div>
      </header>

      <div className="dov__layout">
        <div className="dov__insights">
          {/* Zone 1 — 히어로존: 검정 카드 1개, 좌(커리어 점수) · 우(KPI 2x2) 2열. above-fold. */}
          {heroCardVisible && (
            <div
              className="dov__hero-card"
              style={{ gridTemplateColumns: heroScoreVisible && kpiTiles.length > 0 ? 'minmax(260px, 1fr) minmax(300px, 1fr)' : '1fr' }}
            >
              {heroScoreVisible && (
                <div className="dov__hero-left">
                  {resumePending || heroDataPending ? (
                    <DashboardSkeleton label="커리어 점수를 불러오는 중이에요." />
                  ) : hasResume && heroDataError ? (
                    <div className="dov__hero-load-error" role="alert">커리어 점수를 불러오지 못했어요.<br />잠시 후 다시 시도해 주세요.</div>
                  ) : hasResume ? (
                    <>
                      <div className="dov__hero-top">
                        <span className="dov__hero-eyebrow">내 커리어 점수</span>
                        <div className="dov__hero-chart"><ActivityRings metrics={rings} size={84} trackColor="rgba(255,255,255,.14)" /></div>
                      </div>
                      <div className="dov__hero-bottom">
                        <div className="dov__hero-num">{covNum}<span>%</span></div>
                        <div className="dov__hero-caption">
                          국내 공고 <b>{scoreData.value.domesticTotal.toLocaleString()}건</b> · 지원 가능 <b>{scoreData.value.applicable.toLocaleString()}건</b>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="dov__hero-empty">
                      <span className="dov__hero-eyebrow">내 커리어 점수</span>
                      <span className="dov__hero-empty-icon"><FileText size={22} /></span>
                      <strong className="dov__hero-empty-title">이력서를 등록하면 내 커리어 점수를 확인할 수 있어요.</strong>
                      <span className="dov__hero-empty-sub">이력서 등록 전에는 아래 분석 위젯에 예시 데이터를 보여드려요.</span>
                      <button
                        className="dov__cta-btn"
                        style={{ marginTop: 4, background: '#fff', color: '#111' }}
                        onClick={() => navigate('/resume/submit')}
                      >
                        이력서 등록하기
                      </button>
                    </div>
                  )}
                </div>
              )}

              {kpiTiles.length > 0 && (
                <div className="dov__hero-right">
                  {kpiTiles.map((tile) => (
                    <div key={tile.id} className="dov__hero-stat">
                      <span className="dov__hero-stat-label">
                        {tile.label}
                        {tile.id === 'hero-applicable' && (
                          <InfoTip text="마감되지 않았고 보유 기술 매칭률 50% 이상인 공고예요. 경력 연차나 필수/우대 조건은 아직 반영되지 않았어요." />
                        )}
                      </span>
                      {tile.id === 'hero-applicable' && (resumePending || heroDataPending) ? (
                        <span className="dov__hero-stat-skeleton" role="status"><span className="dov__sr-only">지원 가능 공고를 불러오는 중이에요.</span></span>
                      ) : tile.id === 'hero-applicable' && heroDataError ? (
                        <span className="dov__hero-stat-error">불러오기 실패</span>
                      ) : (
                        <span className="dov__hero-stat-num">{tile.value}{tile.unit && <span>{tile.unit}</span>}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Zone 2 — 내 시장 진단: 업종 적합도 · 커버리지 분포 · 지금 지원할 만한 공고 */}
          {secMarketVisible && (
            <section className="dov__sec">
              <h2 className="dov__sec-title">내 시장 진단</h2>
              <div className="dov__sec-grid dov__sec-grid--3">
                {!isWidgetHidden('dashboard', 'industry-fit') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="업종 적합도" right={!hasResume && <PreviewBadge />} />
                      <div className="dov__aside-chart">
                        {hasResume && pivotData.source !== 'live' && !pivotData.error ? (
                          <DashboardSkeleton label="업종 적합도를 불러오는 중이에요." />
                        ) : hasResume && pivotData.error ? (
                          <div className="dov__empty" role="alert">업종 적합도를 불러오지 못했어요.</div>
                        ) : pivotData.source === 'live' && pivotData.value ? (
                          <LiveIndustryRadar data={pivotData.value} />
                        ) : (
                          <IndustryFitRadar skills={skills} />
                        )}
                      </div>
                    </section>
                  </div>
                )}
                {!isWidgetHidden('dashboard', 'coverage-histogram') && (
                  <div className="dov__card-item">
                    <section className="dcard">
                      <SectionHeader title="커버리지 분포" hint="내 백분위" right={!hasResume && <PreviewBadge />} />
                      {hasResume && distributionData.source !== 'live' && !distributionData.error ? (
                        <DashboardSkeleton label="커버리지 분포를 불러오는 중이에요." />
                      ) : hasResume && distributionData.error ? (
                        <div className="dov__empty" role="alert">커버리지 분포를 불러오지 못했어요.</div>
                      ) : distributionData.source === 'live' && distributionData.value ? (
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
                    <section className="dcard" aria-busy={matchedJobsLoading}>
                      <SectionHeader title="지금 지원할 만한 공고" hint="내 기술 50%+ · 국내" />
                      {matchedJobsLoading ? (
                        <DashboardSkeleton label="지원할 만한 공고를 불러오는 중이에요." />
                      ) : matchedJobsError ? (
                        <div className="dov__empty" role="alert">공고를 불러오지 못했어요.</div>
                      ) : matchedJobs.length > 0 ? (
                        <div className="dov__matched-jobs">
                          <HBars
                            items={matchedJobChart}
                            unit="%"
                            onClick={(index) => navigate(`/job/${matchedJobs[index].id}`)}
                          />
                        </div>
                      ) : <div className="dov__empty">조건에 맞는 공고가 없어요.</div>}
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
        </div>

        <aside className="dov__rail">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
            {!isWidgetHidden('dashboard', 'brief') && (
              <section className="dcard" style={{ flex: 'none' }}>
                <span className="dov__card-eyebrow"><Sparkles size={14} /> 오늘 브리핑</span>
                <ul className="dov__brief">{briefVisible}</ul>
              </section>
            )}
            {!isWidgetHidden('dashboard', 'latest-timeline') && (
              <div style={{ flex: 1, minHeight: 0 }}>
                <LatestJobsTimeline size="2x2" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
