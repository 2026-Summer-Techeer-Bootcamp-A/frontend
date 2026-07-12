import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowUpRight, Sparkles, TrendingUp, FileText } from 'lucide-react'
import {
  ActivityRings, useCountUp, JobCardCompact, SectionHeader, CoverageHistogram,
  HeroStat, StatTile, PreviewBadge, WidgetSettingsMenu, type RingMetric,
} from '../../career/kit'
import { IndustryFitRadar, TechChainRoadmap } from '../../career/insights'
import { HBars } from '../../career/charts'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { useAuth } from '../../career/authStore'
import { useWidgetData } from '../../career/useWidgetData'
import { useDashboardConfig, isWidgetHidden, getWidgetSize } from '../../career/dashboardConfig'
import { DASHBOARD_WIDGETS } from '../../career/widgetCatalog'
import { useBookmarks } from '../../career/bookmarkStore'
import { useRecentViews } from '../../career/viewHistoryStore'
import data from '../../data/careerData.json'
import marketData from '../../data/marketData.json'
import './DesktopOverview.css'
import '../../career/widgetGrid.css'

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

/** 매치율 분포 미니 바 — HeroStat B의 chart 슬롯용 초경량 인라인 그래프. */
function MatchDistroBars({ postings }: { postings: { matchPct: number }[] }) {
  const bins = [0, 0, 0, 0, 0]
  postings.forEach((p) => { bins[Math.min(4, Math.floor(p.matchPct / 20))]++ })
  const max = Math.max(...bins, 1)
  return (
    <div className="dov__distro">
      {bins.map((v, i) => (
        <i key={i} className={i >= 3 ? 'on' : ''} style={{ height: `${10 + (v / max) * 34}px` }} />
      ))}
    </div>
  )
}

/** 데스크톱 대시보드 — 검정 히어로 2 + stat 타일 4 + 개인화 위젯 다수의 촘촘한 커맨드센터.
 * 시장 페이지(DesktopMarket)와 동일한 통일 위젯그리드(.wgrid/.wcell)로 리사이즈를 지원한다. */
export default function DesktopOverview() {
  const navigate = useNavigate()
  useDashboardConfig() // 위젯 표시/숨김·크기 변경 시 리렌더 트리거
  const { resumes, activeResume } = useResumesState()
  const { user } = useAuth()
  const hasResume = resumes.length > 0 && !!activeResume
  const skills = activeResume?.skills ?? []

  const postings = useMemo(() => getDynamicPostings(skills), [skills])
  const domestic = useMemo(() => postings.filter((p) => p.pool === '국내'), [postings])

  const coverage = activeResume?.coveragePct ?? calculateCoverage(skills, '국내')
  const applicable = domestic.filter((p) => p.matchPct >= 50).length
  const applicablePct = domestic.length ? Math.round((applicable / domestic.length) * 100) : 0

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

  // 하이브리드 데이터 훅 — 이번 Phase는 전부 fetchLive=null(mock)로 넘기되,
  // 위젯별 훅 경계는 그대로 마련해 향후 라이브 엔드포인트 연결 시 이 지점만 바꾸면 된다.
  const scoreData = useWidgetData(null, { coverage, applicable, domesticTotal: domestic.length })
  const applicableData = useWidgetData(null, { applicable, applicablePct })
  const statsData = useWidgetData(null, { coverage, applicablePct, deadlineSoonCount, recentCount })
  const jobsData = useWidgetData(null, topJobs)
  const deadlinesData = useWidgetData(null, deadlines)
  const gapData = useWidgetData(null, topGap)

  const previewA = !hasResume && scoreData.source === 'mock'
  const previewB = !hasResume && applicableData.source === 'mock'

  const rings: RingMetric[] = [
    { key: 'cov', label: '기술 보유율', pct: coverage, color: '#fff' },
    { key: 'app', label: '지원 가능', pct: applicablePct, color: '#1f9d57' },
  ]
  const covNum = useCountUp(scoreData.value.coverage)
  const applicableNum = useCountUp(applicableData.value.applicable)

  // 개인화 위젯 3종(북마크 · 최근 조회 · 스킬 모멘텀)
  const bookmarkIds = useBookmarks()
  const bookmarkedPostings = useMemo(
    () => bookmarkIds.map((id) => postings.find((p) => p.id === id)).filter((p): p is typeof postings[number] => !!p),
    [bookmarkIds, postings],
  )

  const recentViewsSize = getWidgetSize('dashboard', 'recent-views', DASHBOARD_WIDGETS.find((w) => w.id === 'recent-views')!.defaultSize)
  const recentViewIds = useRecentViews(recentViewsSize === '2x1' ? 5 : 3)
  const recentViewPostings = useMemo(
    () => recentViewIds.map((id) => postings.find((p) => p.id === id)).filter((p): p is typeof postings[number] => !!p),
    [recentViewIds, postings],
  )

  const domesticShare = marketData.skillShare['국내'] as { items: { tech: string; count: number; share: number; owned: boolean }[] }
  const skillMomentum = useMemo(
    () => domesticShare.items.filter((i) => skills.includes(i.tech)).sort((a, b) => b.share - a.share).slice(0, 6),
    [skills],
  )
  const maxMomentumShare = Math.max(...skillMomentum.map((i) => i.share), 1)

  // 위젯 리사이즈 헬퍼 — 시장 페이지(DesktopMarket)와 동일 패턴.
  const wsize = (id: string) => {
    const item = DASHBOARD_WIDGETS.find((w) => w.id === id)!
    return getWidgetSize('dashboard', id, item.defaultSize)
  }

  const topJobsSize = wsize('top-jobs')
  const topJobsVisible = jobsData.value.slice(0, topJobsSize === '2x2' ? 6 : 3)

  const deadlinesSize = wsize('deadlines')
  const deadlinesLimit = deadlinesSize === '2x2' ? 8 : deadlinesSize === '2x1' ? 5 : 3
  const deadlinesVisible = deadlinesData.value.slice(0, deadlinesLimit)

  const briefSize = wsize('brief')
  const briefLines: ReactNode[] = [
    <li key="dl"><b>{deadlineSoonCount}건</b>이 곧 마감돼요</li>,
    <li key="app">지원 가능 공고 <b>{applicable.toLocaleString()}건</b> · 커버리지 <b>{coverage}%</b></li>,
    topGap[0] && <li key="gap">가장 자주 요구되는 미보유 기술: <b>{topGap[0][0]}</b></li>,
  ].filter(Boolean) as ReactNode[]
  const briefVisible = briefSize === '1x1' ? briefLines.slice(0, 2) : briefLines

  const gapSize = wsize('gap-chips')
  const gapVisible = gapData.value.slice(0, gapSize === '2x1' ? 8 : 5)

  const bookmarksSize = wsize('bookmarks')
  const bookmarksLimit = bookmarksSize === '2x2' ? 6 : bookmarksSize === '2x1' ? 3 : 1
  const bookmarksVisible = bookmarkedPostings.slice(0, bookmarksLimit)

  return (
    <div className="dov">
      <header className="dov__head">
        <h1 className="dov__title">안녕하세요, {user?.nickname ?? '리버'}님</h1>
        <div className="dov__head-r">
          <div className="dov__asof">기준일 {asOf} · 공고 {TOTAL.toLocaleString()}건</div>
          <WidgetSettingsMenu section="dashboard" items={DASHBOARD_WIDGETS} />
        </div>
      </header>

      {!hasResume && (
        <section className="dov__cta">
          <div>
            <div className="dov__cta-text"><FileText size={15} /> 이력서를 등록하면 진짜 내 점수를 볼 수 있어요</div>
            <div className="dov__cta-sub">지금은 예시(preview) 데이터를 보여드리고 있어요</div>
          </div>
          <button className="dov__cta-btn" onClick={() => navigate('/resume/submit')}>이력서 등록/분석</button>
        </section>
      )}

      <div className="wgrid dov__grid">
        {/* 히어로 2종 — 검정 위젯(HeroStat이 자체 배경을 가지므로 dcard 없이 wcell만) */}
        {!isWidgetHidden('dashboard', 'hero-score') && (
          <section className={`wcell wcell--${wsize('hero-score')}`}>
            <HeroStat
              eyebrow="내 커리어 점수"
              value={covNum}
              unit="%"
              chart={<ActivityRings metrics={rings} size={72} trackColor="rgba(255,255,255,.14)" />}
              caption={<>국내 공고 <b>{scoreData.value.domesticTotal.toLocaleString()}건</b> 중 <b>{scoreData.value.applicable.toLocaleString()}건</b> 지원 가능</>}
              footChips={previewA && <PreviewBadge />}
            />
          </section>
        )}
        {!isWidgetHidden('dashboard', 'hero-applicable') && (
          <section className={`wcell wcell--${wsize('hero-applicable')}`}>
            <HeroStat
              eyebrow="지원 가능 공고"
              value={applicableNum}
              unit="건"
              chart={<MatchDistroBars postings={domestic} />}
              caption={<>전체 국내 공고 대비 <b>{applicableData.value.applicablePct}%</b></>}
              footChips={previewB && <PreviewBadge />}
            />
          </section>
        )}

        {/* stat 타일 4종 — StatTile이 자체 카드 스타일을 가지므로 dcard 없이 wcell--1x1만 */}
        {!isWidgetHidden('dashboard', 'stat-coverage') && (
          <div className="wcell wcell--1x1">
            <StatTile label="기술 보유율" value={statsData.value.coverage} unit="%" />
          </div>
        )}
        {!isWidgetHidden('dashboard', 'stat-applicable-pct') && (
          <div className="wcell wcell--1x1">
            <StatTile label="지원 가능 비율" value={statsData.value.applicablePct} unit="%" />
          </div>
        )}
        {!isWidgetHidden('dashboard', 'stat-deadline') && (
          <div className="wcell wcell--1x1">
            <StatTile label="마감 임박(7일 내)" value={statsData.value.deadlineSoonCount} unit="건" />
          </div>
        )}
        {!isWidgetHidden('dashboard', 'stat-recent') && (
          <div className="wcell wcell--1x1">
            <StatTile label="신규 공고" value={statsData.value.recentCount} unit="건" />
          </div>
        )}

        {/* 맞춤 공고 Top */}
        {!isWidgetHidden('dashboard', 'top-jobs') && (
          <section className={`dcard wcell wcell--${topJobsSize}`}>
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
        )}

        {/* 북마크한 공고 */}
        {!isWidgetHidden('dashboard', 'bookmarks') && (
          <section className={`dcard wcell wcell--${bookmarksSize}`}>
            <SectionHeader title="북마크한 공고" hint={`${bookmarkedPostings.length}건`} right={
              <button className="dov__more" onClick={() => navigate('/jobs')}>전체 보기 <ArrowUpRight size={15} /></button>
            } />
            {bookmarksVisible.length === 0 ? (
              <div className="dov__empty">북마크한 공고가 없어요. 공고 상세에서 북마크해보세요.</div>
            ) : (
              <div className="dov__jobs">
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
        )}

        {/* 최근 본 공고 */}
        {!isWidgetHidden('dashboard', 'recent-views') && (
          <section className={`dcard wcell wcell--${recentViewsSize}`}>
            <SectionHeader title="최근 본 공고" hint={`${recentViewPostings.length}건`} />
            {recentViewPostings.length === 0 ? (
              <div className="dov__empty">최근 본 공고가 없어요.</div>
            ) : (
              <div className="dov__jobs">
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
        )}

        {/* 커버리지 분포 */}
        {!isWidgetHidden('dashboard', 'coverage-histogram') && (
          <section className={`dcard wcell wcell--${wsize('coverage-histogram')}`}>
            <SectionHeader title="커버리지 분포" hint="내 백분위" right={!hasResume && <PreviewBadge />} />
            <CoverageHistogram
              postings={domestic.map((p) => ({ techs: p.techs, held: p.matchHeld, total: p.matchTotal }))}
              mySkills={skills}
              gap={topGap.map(([tech, count]) => ({ tech, count }))}
              poolLabel="국내"
            />
          </section>
        )}

        {/* 오늘 브리핑 */}
        {!isWidgetHidden('dashboard', 'brief') && (
          <section className={`dcard wcell wcell--${briefSize}`}>
            <span className="dov__card-eyebrow"><Sparkles size={14} /> 오늘 브리핑</span>
            <ul className="dov__brief">{briefVisible}</ul>
          </section>
        )}

        {/* 마감 임박 */}
        {!isWidgetHidden('dashboard', 'deadlines') && (
          <section className={`dcard wcell wcell--${deadlinesSize}`}>
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
        )}

        {/* 기술 갭 */}
        {!isWidgetHidden('dashboard', 'gap-chips') && (
          <section className={`dcard wcell wcell--${gapSize}`}>
            <span className="dov__card-eyebrow"><TrendingUp size={14} /> 자주 요구되는 미보유 기술</span>
            <div className="dov__gap">
              {gapVisible.map(([tech, n]) => (
                <button key={tech} className="dov__gap-chip" onClick={() => navigate(`/tech/${encodeURIComponent(tech)}`)}>
                  {tech}<span>{n}</span>
                </button>
              ))}
              {gapVisible.length === 0 && <div className="dov__empty">갭 데이터가 없어요.</div>}
            </div>
          </section>
        )}

        {/* 내 스킬 시장 모멘텀 */}
        {!isWidgetHidden('dashboard', 'skill-momentum') && (
          <section className={`dcard wcell wcell--${wsize('skill-momentum')}`}>
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
        )}

        {/* 업종 적합도 */}
        {!isWidgetHidden('dashboard', 'industry-fit') && (
          <section className={`dcard wcell wcell--${wsize('industry-fit')}`}>
            <SectionHeader title="업종 적합도" right={!hasResume && <PreviewBadge />} />
            <div className="dov__aside-chart"><IndustryFitRadar skills={skills} /></div>
          </section>
        )}

        {/* 추천 로드맵 */}
        {!isWidgetHidden('dashboard', 'roadmap') && (
          <section className={`dcard wcell wcell--${wsize('roadmap')}`}>
            <SectionHeader title="추천 로드맵" right={!hasResume && <PreviewBadge />} />
            <div className="dov__aside-chart"><TechChainRoadmap skills={skills} /></div>
          </section>
        )}
      </div>
    </div>
  )
}
