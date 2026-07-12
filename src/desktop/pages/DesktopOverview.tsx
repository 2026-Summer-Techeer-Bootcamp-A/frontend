import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react'
import { ActivityRings, RingLegend, JobCardCompact, SectionHeader, useCountUp, type RingMetric } from '../../career/kit'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { useAuth } from '../../career/authStore'
import data from '../../data/careerData.json'
import './DesktopOverview.css'

const asOf = data.meta.asOf
const TOTAL = data.meta.totalPostings

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

/** 데스크톱 대시보드 — 모바일 단일컬럼과 완전히 다른 메인+사이드 멀티컬럼 커맨드센터. */
export default function DesktopOverview() {
  const navigate = useNavigate()
  const { activeResume } = useResumesState()
  const { user } = useAuth()
  const skills = activeResume?.skills ?? []

  const postings = useMemo(() => getDynamicPostings(skills), [skills])
  const domestic = useMemo(() => postings.filter((p) => p.pool === '국내'), [postings])

  const coverage = activeResume?.coveragePct ?? calculateCoverage(skills, '국내')
  const applicable = domestic.filter((p) => p.matchPct >= 50).length
  const applicablePct = domestic.length ? Math.round((applicable / domestic.length) * 100) : 0

  const topJobs = useMemo(() => [...postings].sort((a, b) => b.matchPct - a.matchPct).slice(0, 6), [postings])

  const deadlines = useMemo(() => {
    return domestic
      .map((p) => ({ p, dd: ddayInfo((p as { closeDate?: string }).closeDate ?? '', asOf) }))
      .filter((x): x is { p: typeof domestic[number]; dd: { d: number; label: string } } => !!x.dd)
      .sort((a, b) => a.dd.d - b.dd.d)
      .slice(0, 5)
  }, [domestic])

  const topGap = useMemo(() => {
    const count = new Map<string, number>()
    domestic.forEach((p) => p.gap.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [domestic])

  const rings: RingMetric[] = [
    { key: 'cov', label: '기술 보유율', pct: coverage, color: 'var(--c-accent)' },
    { key: 'app', label: '지원 가능', pct: applicablePct, color: '#218a58' },
  ]
  const covNum = useCountUp(coverage)

  return (
    <div className="dov">
      <header className="dov__head">
        <h1 className="dov__title">안녕하세요, {user?.nickname ?? '리버'}님</h1>
        <div className="dov__asof">기준일 {asOf} · 공고 {TOTAL.toLocaleString()}건</div>
      </header>

      <div className="dov__body">
        <div className="dov__main">
          {/* 점수화 요약 — 최상단 위계 */}
          <section className="dov__card dov__score">
            <div className="dov__score-l">
              <span className="dov__card-eyebrow">내 커리어 점수</span>
              <div className="dov__score-num">{covNum}<span>%</span></div>
              <p className="dov__score-desc">
                국내 공고 <b>{domestic.length.toLocaleString()}건</b> 중 <b>{applicable.toLocaleString()}건</b>에 지원 가능해요.
              </p>
              <div className="dov__score-chips">
                <span className="dov__stat"><b>{coverage}%</b> 기술 보유율</span>
                <span className="dov__stat"><b>{applicablePct}%</b> 지원 가능 비율</span>
              </div>
            </div>
            <div className="dov__score-r">
              <ActivityRings metrics={rings} size={150} />
              <RingLegend metrics={rings} />
            </div>
          </section>

          {/* 맞춤 공고 Top */}
          <section className="dov__card">
            <SectionHeader title="맞춤 공고 Top" hint={`${topJobs.length}건`} right={
              <button className="dov__more" onClick={() => navigate('/jobs')}>전체 보기 <ArrowUpRight size={15} /></button>
            } />
            <div className="dov__jobs">
              {topJobs.map((p) => (
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

        <aside className="dov__aside">
          {/* 오늘 브리핑 */}
          <section className="dov__card">
            <span className="dov__card-eyebrow"><Sparkles size={14} /> 오늘 브리핑</span>
            <ul className="dov__brief">
              <li><b>{deadlines.length}건</b>이 곧 마감돼요</li>
              <li>지원 가능 공고 <b>{applicable.toLocaleString()}건</b> · 커버리지 <b>{coverage}%</b></li>
              {topGap[0] && <li>가장 자주 요구되는 미보유 기술: <b>{topGap[0][0]}</b></li>}
            </ul>
          </section>

          {/* 마감 임박 */}
          <section className="dov__card">
            <span className="dov__card-eyebrow"><Clock size={14} /> 마감 임박</span>
            <div className="dov__dl">
              {deadlines.length === 0 && <div className="dov__empty">임박한 마감이 없어요.</div>}
              {deadlines.map(({ p, dd }) => {
                return (
                  <button key={p.id} className="dov__dl-row" onClick={() => navigate(`/job/${encodeURIComponent(p.id)}`)}>
                    <CompanyLogo logo={p.logo} name={p.company} size={30} radius={9} />
                    <span className="dov__dl-body">
                      <span className="dov__dl-co">{p.company}</span>
                      <span className="dov__dl-ti">{p.title}</span>
                    </span>
                    <span className={`dov__dday${dd.d <= 3 ? ' urgent' : ''}`}>D-{dd.d}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 기술 갭 */}
          <section className="dov__card">
            <span className="dov__card-eyebrow"><TrendingUp size={14} /> 자주 요구되는 미보유 기술</span>
            <div className="dov__gap">
              {topGap.map(([tech, n]) => (
                <button key={tech} className="dov__gap-chip" onClick={() => navigate(`/tech/${encodeURIComponent(tech)}`)}>
                  {tech}<span>{n}</span>
                </button>
              ))}
              {topGap.length === 0 && <div className="dov__empty">갭 데이터가 없어요.</div>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
