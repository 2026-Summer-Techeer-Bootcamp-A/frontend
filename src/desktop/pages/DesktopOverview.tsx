import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowUpRight, Sparkles, TrendingUp, FileText } from 'lucide-react'
import {
  ActivityRings, useCountUp, JobCardCompact, SectionHeader, CoverageHistogram,
  HeroStat, StatTile, PreviewBadge, type RingMetric,
} from '../../career/kit'
import { IndustryFitRadar, TechChainRoadmap } from '../../career/insights'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { useAuth } from '../../career/authStore'
import { useWidgetData } from '../../career/useWidgetData'
import data from '../../data/careerData.json'
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

/** 데스크톱 대시보드 — 검정 히어로 2 + stat 타일 4 + 개인화 위젯 다수의 촘촘한 커맨드센터. */
export default function DesktopOverview() {
  const navigate = useNavigate()
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
  const deadlines = useMemo(() => [...deadlineInfos].sort((a, b) => a.dd.d - b.dd.d).slice(0, 5), [deadlineInfos])
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

  return (
    <div className="dov">
      <header className="dov__head">
        <h1 className="dov__title">안녕하세요, {user?.nickname ?? '리버'}님</h1>
        <div className="dov__asof">기준일 {asOf} · 공고 {TOTAL.toLocaleString()}건</div>
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

      <div className="dov__body">
        <div className="dov__main">
          {/* 히어로 행 — 검정 위젯 2개 */}
          <div className="dov__heroRow">
            <HeroStat
              eyebrow="내 커리어 점수"
              value={covNum}
              unit="%"
              chart={<ActivityRings metrics={rings} size={72} trackColor="rgba(255,255,255,.14)" />}
              caption={<>국내 공고 <b>{scoreData.value.domesticTotal.toLocaleString()}건</b> 중 <b>{scoreData.value.applicable.toLocaleString()}건</b> 지원 가능</>}
              footChips={previewA && <PreviewBadge />}
            />
            <HeroStat
              eyebrow="지원 가능 공고"
              value={applicableNum}
              unit="건"
              chart={<MatchDistroBars postings={domestic} />}
              caption={<>전체 국내 공고 대비 <b>{applicableData.value.applicablePct}%</b></>}
              footChips={previewB && <PreviewBadge />}
            />
          </div>

          {/* stat 타일 4종 */}
          <div className="dov__statRow">
            <StatTile label="기술 보유율" value={statsData.value.coverage} unit="%" />
            <StatTile label="지원 가능 비율" value={statsData.value.applicablePct} unit="%" />
            <StatTile label="마감 임박(7일 내)" value={statsData.value.deadlineSoonCount} unit="건" />
            <StatTile label="신규 공고" value={statsData.value.recentCount} unit="건" />
          </div>

          {/* 맞춤 공고 Top */}
          <section className="dov__card">
            <SectionHeader title="맞춤 공고 Top" hint={`${jobsData.value.length}건`} right={
              <div className="dov__hdright">
                {!hasResume && jobsData.source === 'mock' && <PreviewBadge />}
                <button className="dov__more" onClick={() => navigate('/jobs')}>전체 보기 <ArrowUpRight size={15} /></button>
              </div>
            } />
            <div className="dov__jobs">
              {jobsData.value.map((p) => (
                <JobCardCompact
                  key={p.id}
                  job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                  logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                  onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                />
              ))}
            </div>
          </section>

          {/* 커버리지 분포 */}
          <section className="dov__card">
            <SectionHeader title="커버리지 분포" hint="내 백분위" right={!hasResume && <PreviewBadge />} />
            <CoverageHistogram
              postings={domestic.map((p) => ({ techs: p.techs, held: p.matchHeld, total: p.matchTotal }))}
              mySkills={skills}
              gap={topGap.map(([tech, count]) => ({ tech, count }))}
              poolLabel="국내"
            />
          </section>
        </div>

        <aside className="dov__aside">
          {/* 오늘 브리핑 */}
          <section className="dov__card">
            <span className="dov__card-eyebrow"><Sparkles size={14} /> 오늘 브리핑</span>
            <ul className="dov__brief">
              <li><b>{deadlinesData.value.length}건</b>이 곧 마감돼요</li>
              <li>지원 가능 공고 <b>{applicable.toLocaleString()}건</b> · 커버리지 <b>{coverage}%</b></li>
              {topGap[0] && <li>가장 자주 요구되는 미보유 기술: <b>{topGap[0][0]}</b></li>}
            </ul>
          </section>

          {/* 마감 임박 */}
          <section className="dov__card">
            <span className="dov__card-eyebrow"><Clock size={14} /> 마감 임박</span>
            <div className="dov__dl">
              {deadlinesData.value.length === 0 && <div className="dov__empty">임박한 마감이 없어요.</div>}
              {deadlinesData.value.map(({ p, dd }) => (
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

          {/* 기술 갭 */}
          <section className="dov__card">
            <span className="dov__card-eyebrow"><TrendingUp size={14} /> 자주 요구되는 미보유 기술</span>
            <div className="dov__gap">
              {gapData.value.map(([tech, n]) => (
                <button key={tech} className="dov__gap-chip" onClick={() => navigate(`/tech/${encodeURIComponent(tech)}`)}>
                  {tech}<span>{n}</span>
                </button>
              ))}
              {gapData.value.length === 0 && <div className="dov__empty">갭 데이터가 없어요.</div>}
            </div>
          </section>

          {/* 업종 적합도 */}
          <section className="dov__card">
            <SectionHeader title="업종 적합도" right={!hasResume && <PreviewBadge />} />
            <div className="dov__aside-chart"><IndustryFitRadar skills={skills} /></div>
          </section>

          {/* 추천 로드맵 */}
          <section className="dov__card">
            <SectionHeader title="추천 로드맵" right={!hasResume && <PreviewBadge />} />
            <div className="dov__aside-chart"><TechChainRoadmap skills={skills} /></div>
          </section>
        </aside>
      </div>
    </div>
  )
}
