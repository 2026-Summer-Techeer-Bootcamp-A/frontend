import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Calendar, SlidersHorizontal, Check } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import CareerTabBar from './CareerTabBar'
import { PageTransition, StatHero, SectionHeader, JobCardCompact, CardModeToggle, ActivityRings, RingLegend, ResumeEmptyCard, SwipePager, matchGrad, type CardMode, type RingMetric } from './kit'
import { DeadlineMatchWidget, RoadmapTeaserWidget, TrendAlertWidget, CompanyFitWidget, ResponseRateWidget, CompanyMatchWidget, type DeadlinePosting } from './homeWidgets'
import { THEME, themeVars } from './themes'
import data from '../data/careerData.json'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from './state'
import './career.css'

type Pool = '국내' | '국외'
type Sort = 'latest' | 'match' | 'deadline' | 'tier'

const TIER_RANK: Record<string, number> = { 대기업: 0, 중견: 1, 중소: 2 }
const tierRank = (t: string | null) => (t && t in TIER_RANK ? TIER_RANK[t] : 3)

const AS_OF = data.meta.asOf
const MARKET: Record<string, { open: number; soon: number }> = data.meta.market

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  if (max && max !== min) return `경력 ${min}~${max}년`
  return `경력 ${min}년+`
}

export function JobCard({ p, mySkills, onOpen }: { p: any; mySkills: string[]; onOpen: () => void }) {
  const held = p.techs.filter((x: string) => mySkills.includes(x)).slice(0, 3)
  const gap = p.gap.slice(0, 2)
  const dd = ddayInfo(p.closeDate, AS_OF)
  return (
    <div className="cr-card" onClick={onOpen}>
      <div className="cr-card__top">
        <CompanyLogo logo={p.logo} name={p.company} size={44} radius={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cr-card__role">{p.title}</div>
          <div className="cr-card__co">
            <span className="cr-card__coname">{p.company}</span>
            {p.tier && <span className={`cr-tier ${p.tier === '대기업' ? 't1' : p.tier === '중견' ? 't2' : 't3'}`}>{p.tier}</span>}
            <span className="cr-tag exp">{careerLabel(p.careerMin, p.careerMax)}</span>
          </div>
        </div>
      </div>
      <div className="cr-match">
        <div className="cr-match__lbl">
          <span>요구 {p.matchTotal}개 중 {p.matchHeld}개 보유</span>
          <b>{p.matchPct}% 매칭</b>
        </div>
        <div className="cr-track">
          <i style={{ width: `${p.matchPct}%`, background: matchGrad(p.matchPct) }} />
        </div>
      </div>
      <div className="cr-chips">
        {held.map((s: string) => (
          <span key={s} className="cr-chip held">{s}</span>
        ))}
        {gap.map((s: string) => (
          <span key={s} className="cr-chip gap">{s}</span>
        ))}
      </div>
      <div className="cr-card__foot">
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <MapPin size={14} /> <span className="cr-ellip">{p.region || 'Remote'}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none' }}>
          <Calendar size={14} /> {p.postDate}
          {dd && <span className="cr-dday">{dd.label} D-{dd.d}</span>}
        </span>
      </div>
    </div>
  )
}

export function JobCardGeneric({ p, onOpen }: { p: (typeof data.postings)[number]; onOpen: () => void }) {
  const dd = ddayInfo(p.closeDate, AS_OF)
  return (
    <div className="cr-card" onClick={onOpen}>
      <div className="cr-card__top">
        <CompanyLogo logo={p.logo} name={p.company} size={44} radius={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cr-card__role">{p.title}</div>
          <div className="cr-card__co">
            <span className="cr-card__coname">{p.company}</span>
            {p.tier && <span className={`cr-tier ${p.tier === '대기업' ? 't1' : p.tier === '중견' ? 't2' : 't3'}`}>{p.tier}</span>}
            <span className="cr-tag exp">{careerLabel(p.careerMin, p.careerMax)}</span>
          </div>
        </div>
      </div>
      <div className="cr-card__foot">
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <MapPin size={14} /> <span className="cr-ellip">{p.region || 'Remote'}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none' }}>
          <Calendar size={14} /> {p.postDate}
          {dd && <span className="cr-dday">{dd.label} D-{dd.d}</span>}
        </span>
      </div>
    </div>
  )
}

const SORTS: { key: Sort; label: string }[] = [
  { key: 'match', label: '최적순 (매칭도)' },
  { key: 'tier', label: '기업 규모순 (대기업 우선)' },
  { key: 'latest', label: '최신순' },
  { key: 'deadline', label: '마감순' },
]

export default function CareerDashboard() {
  const t = THEME
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emptyParam = searchParams.get('empty') === 'true'

  const { resumes, activeResume } = useResumesState()
  const hasResume = !emptyParam && resumes.length > 0

  const activeSkills = useMemo(() => hasResume ? activeResume.skills : [], [hasResume, activeResume])

  const [pool, setPool] = useState<Pool>('국내')
  const [sort, setSort] = useState<Sort>('match')
  const [hideExp, setHideExp] = useState(false)
  const [visible, setVisible] = useState(3)
  const [filterOpen, setFilterOpen] = useState(false)
  const [cardMode, setCardMode] = useState<CardMode>('full')

  // Dynamic calculations based on active resume skills
  const dynamicPostings = useMemo(() => getDynamicPostings(activeSkills), [activeSkills])
  const poolPostings = useMemo(() => dynamicPostings.filter((p) => p.pool === pool), [dynamicPostings, pool])

  const totalPostings = poolPostings.length
  const reachedPostings = poolPostings.filter((p) => p.matchPct >= 50).length
  const reachRate = totalPostings ? Math.round((reachedPostings / totalPostings) * 100) : 0
  const coveragePct = calculateCoverage(activeSkills, pool)

  const RINGS: RingMetric[] = [
    { key: 'cov', label: '커버리지', pct: coveragePct, color: 'var(--c-accent)' },
    { key: 'reach', label: '도달률', pct: reachRate, color: 'var(--accent-700)', note: `${reachedPostings}개 공고` },
  ]

  const list = useMemo(() => {
    let arr = poolPostings
    if (hideExp) arr = arr.filter((p) => !p.careerMin)
    arr = [...arr].sort((a, b) => {
      if (sort === 'match') return b.matchPct - a.matchPct
      if (sort === 'deadline') return (a.closeDate || '9999').localeCompare(b.closeDate || '9999')
      if (sort === 'tier') return tierRank(a.tier) - tierRank(b.tier) || b.matchPct - a.matchPct
      return (b.postDate || '').localeCompare(a.postDate || '')
    })
    return arr
  }, [poolPostings, sort, hideExp])

  const genericList = useMemo(
    () => [...data.postings.filter((p) => p.pool === pool)].sort((a, b) => (b.postDate || '').localeCompare(a.postDate || '')),
    [pool],
  )

  const mk = MARKET[pool]

  // 상단 위젯존: 마감임박×매칭 위젯용 데이터(이력서 없으면 매칭 필터 없이 전체 기준)
  const deadlineItems = useMemo(() => {
    const base = hasResume ? poolPostings.filter((p) => p.matchPct >= 50) : poolPostings
    const out: DeadlinePosting[] = []
    for (const p of base) {
      const dd = ddayInfo(p.closeDate, AS_OF)
      if (dd && dd.d <= 7) out.push({ company: p.company, title: p.title, matchPct: hasResume ? p.matchPct : undefined, dday: dd.d })
    }
    out.sort((a, b) => a.dday - b.dday)
    return out
  }, [poolPostings, hasResume])

  const widgetPages = useMemo(() => [
    { key: 'deadline', node: <DeadlineMatchWidget items={deadlineItems} count={deadlineItems.length} hasResume={hasResume} onOpen={() => navigate('/jobs')} /> },
    { key: 'roadmap', node: <RoadmapTeaserWidget skills={activeSkills} onOpen={() => navigate('/market')} /> },
    { key: 'trend', node: <TrendAlertWidget skills={activeSkills} onOpen={() => navigate('/market')} /> },
    { key: 'archetype', node: <CompanyFitWidget skills={activeSkills} onOpen={() => navigate('/market')} /> },
    { key: 'response', node: <ResponseRateWidget onOpen={() => navigate('/market')} /> },
    { key: 'company', node: <CompanyMatchWidget skills={activeSkills} onOpen={() => navigate('/market')} /> },
  ], [deadlineItems, hasResume, activeSkills, navigate])

  return (
    <div className="stage" style={{ background: t.stageBg }}>
      <PhoneFrame stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
        <div className="career" style={themeVars(t)}>
          <PageTransition type="fade">
            {/* Greeting */}
            <div className="cr-greet-line">좋은 아침이에요 👋 <b>리버</b>님</div>

            {/* 상단 위젯존(~40%): 히어로(또는 이력서 유도) + 위젯 캐러셀 6종 — 이력서 없어도 잠그지 않고
                일반 시장 지표 모드로 그대로 보여준다(각 위젯이 skills=[]일 때 일반 모드로 전환) */}
            {hasResume ? (
              <StatHero
                value={coveragePct} title="시장 커버리지"
                rings={<ActivityRings metrics={RINGS} />}
                legend={<RingLegend metrics={RINGS} />}
              />
            ) : (
              <ResumeEmptyCard totalPostings={data.meta.totalPostings} onSubmit={() => navigate('/resume/submit')} />
            )}

            <div className="cr-widgetzone">
              <SwipePager pages={widgetPages} />
            </div>

            {/* 공고 현황 2열 컴팩트 */}
            <div className="cr-minstat" style={{ marginBottom: 14 }}>
              <div><b>{mk.open.toLocaleString()}</b><span>전체 공고</span></div>
              <div><b className="warn">{mk.soon.toLocaleString()}</b><span>곧 마감</span></div>
            </div>

            {/* 맞춤 공고 / 채용 공고 */}
            <SectionHeader title={hasResume ? '맞춤 공고' : '채용 공고'} />
            <div className="cr-secbar" style={{ margin: '0 0 14px' }}>
              <div className="cr-pooltoggle cr-pooltoggle--slim">
                {(['국내', '국외'] as Pool[]).map((pv) => (
                  <button key={pv} className={pool === pv ? 'on' : ''} onClick={() => { setPool(pv); setVisible(3) }}>
                    {pv === '국내' ? '국내' : '글로벌'}
                  </button>
                ))}
              </div>
              <button className="cr-morebtn" onClick={() => navigate('/jobs')}>더 보기 ›</button>
              {hasResume && (
                <button className="cr-filterbtn" onClick={() => setFilterOpen(true)}>
                  <SlidersHorizontal size={16} /> 필터
                </button>
              )}
            </div>

            {!hasResume ? (
              genericList.length === 0 ? (
                <div className="cr-empty">공고가 없어요.</div>
              ) : (
                genericList.slice(0, visible).map((p) => (
                  <JobCardGeneric key={p.id} p={p} onOpen={() => navigate(`/job/${data.postings.indexOf(p)}`)} />
                ))
              )
            ) : list.length === 0 ? (
              <div className="cr-empty">신입 가능(경력 무관) 공고가 이 조건엔 없어요.</div>
            ) : cardMode === 'compact' ? (
              list.slice(0, visible).map((p) => (
                <JobCardCompact
                  key={p.id}
                  job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                  logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                  onOpen={() => navigate(`/job/${data.postings.indexOf(p)}`)}
                />
              ))
            ) : (
              list.slice(0, visible).map((p) => (
                <JobCard key={p.id} p={p} mySkills={activeSkills} onOpen={() => navigate(`/job/${data.postings.indexOf(p)}`)} />
              ))
            )}
          </PageTransition>

          <CareerTabBar active="home" />

          {/* 필터 바텀시트 */}
          {filterOpen && (
            <>
              <div className="cr-sheet__ov" onClick={() => setFilterOpen(false)} />
              <div className="cr-sheet">
                <div className="cr-sheet__grip" />
                <h3>정렬 · 필터</h3>
                <div className="cr-sheet__label">카드 모드</div>
                <div style={{ display: 'flex' }}><CardModeToggle mode={cardMode} onChange={setCardMode} /></div>
                <div className="cr-sheet__label">정렬</div>
                {SORTS.map((s) => (
                  <button key={s.key} className={`cr-radio ${sort === s.key ? 'on' : ''}`} onClick={() => setSort(s.key)}>
                    <span className="dot" /> {s.label}
                  </button>
                ))}
                <div className="cr-sheet__label">필터</div>
                <button className={`cr-check ${hideExp ? 'on' : ''}`} onClick={() => { setHideExp((v) => !v); setVisible(3) }}>
                  <span className="box">{hideExp && <Check size={14} strokeWidth={3} />}</span>
                  경력직 채용 보지 않기 <span style={{ color: 'var(--c-muted)', fontSize: 12 }}>(신입)</span>
                </button>
                <button className="cr-sheet__apply" onClick={() => setFilterOpen(false)}>적용하기</button>
              </div>
            </>
          )}
        </div>
      </PhoneFrame>
    </div>
  )
}
