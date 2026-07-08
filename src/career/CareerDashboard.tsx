import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Calendar, SlidersHorizontal, Check } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import CareerTabBar from './CareerTabBar'
import { PageTransition, StatHero, CoverageHistogram, PulseCard, SwipePager, SectionHeader, JobCardCompact, CardModeToggle, ActivityRings, RingLegend, ResumeEmptyCard, matchGrad, type CardMode, type PulseItem, type RingMetric } from './kit'
import { IndustryFitRadar, TechChainRoadmap } from './insights'
import { THEME, themeVars } from './themes'
import data from '../data/careerData.json'
import market from '../data/marketData.json'
import './career.css'

type Pool = '국내' | '국외'
type Sort = 'latest' | 'match' | 'deadline' | 'tier'

const TIER_RANK: Record<string, number> = { 대기업: 0, 중견: 1, 중소: 2 }
const tierRank = (t: string | null) => (t && t in TIER_RANK ? TIER_RANK[t] : 3)

const RESUME: string[] = data.resume.skills
const AS_OF = data.meta.asOf
const MARKET: Record<string, { open: number; soon: number }> = data.meta.market

const YEARLY = market.techYearly as { years: string[]; series: { tech: string; shares: number[]; delta: number; owned: boolean }[] }
const PULSE_BASE = (market.pulse as { items: PulseItem[] }).items
const PULSE_BASE_TECHS = new Set(PULSE_BASE.map((it) => it.tech))
const YEARLY_DECLINE = [...YEARLY.series]
  .filter((r) => !r.owned && r.delta < 0 && !PULSE_BASE_TECHS.has(r.tech))
  .sort((a, b) => a.delta - b.delta)[0]
const PULSE: PulseItem[] = [
  ...PULSE_BASE,
  ...(YEARLY_DECLINE ? [{
    tech: YEARLY_DECLINE.tech,
    text: <>{YEARLY_DECLINE.tech} · 국내 수요 감소</>,
    evidence: `국내 점유율 ${YEARLY.years[0]} ${YEARLY_DECLINE.shares[0]}% → ${YEARLY.years[YEARLY.years.length - 1]} ${YEARLY_DECLINE.shares[YEARLY_DECLINE.shares.length - 1]}%`,
  }] : []),
]

// "배우면" 칩 = 국내 채용시장 기준 미보유 상위 5 (Java·Spring·C++·Kubernetes·Next.js …)
const WHATIF = (market.skillShare as never as Record<string, { items: { tech: string; count: number; owned: boolean }[] }>)['국내']
  .items.filter((i) => !i.owned).slice(0, 5).map((i) => ({ tech: i.tech, count: i.count }))

// 운동 링 2지표: 기술 커버리지 · 조건(매칭 50%+) 만족 공고 도달률
const DOM_POSTINGS = data.postings.filter((p) => p.pool === '국내')
const REACH_LIST = DOM_POSTINGS.filter((p) => p.matchPct >= 50)
const REACH_PCT = Math.round((REACH_LIST.length / DOM_POSTINGS.length) * 100)

function ddayInfo(close: string) {
  if (!close) return null
  const d = Math.round((new Date(close).getTime() - new Date(AS_OF).getTime()) / 86400000)
  if (d < 0) return null
  const [, m, dd] = close.split('-')
  return { d, label: `~${Number(m)}/${Number(dd)}` }
}

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  if (max && max !== min) return `경력 ${min}~${max}년`
  return `경력 ${min}년+`
}

export function JobCard({ p, onOpen }: { p: (typeof data.postings)[number]; onOpen: () => void }) {
  const held = p.techs.filter((x) => RESUME.includes(x)).slice(0, 3)
  const gap = p.gap.slice(0, 2)
  const dd = ddayInfo(p.closeDate)
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
        {held.map((s) => (
          <span key={s} className="cr-chip held">{s}</span>
        ))}
        {gap.map((s) => (
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
  const dd = ddayInfo(p.closeDate)
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
  const hasResume = !searchParams.get('empty')
  const [pool, setPool] = useState<Pool>('국내')
  const [sort, setSort] = useState<Sort>('match')
  const [hideExp, setHideExp] = useState(false)
  const [visible, setVisible] = useState(5)
  const [filterOpen, setFilterOpen] = useState(false)
  const [cardMode, setCardMode] = useState<CardMode>('full')

  const list = useMemo(() => {
    let arr = data.postings.filter((p) => p.pool === pool)
    if (hideExp) arr = arr.filter((p) => !p.careerMin)
    arr = [...arr].sort((a, b) => {
      if (sort === 'match') return b.matchPct - a.matchPct
      if (sort === 'deadline') return (a.closeDate || '9999').localeCompare(b.closeDate || '9999')
      if (sort === 'tier') return tierRank(a.tier) - tierRank(b.tier) || b.matchPct - a.matchPct
      return (b.postDate || '').localeCompare(a.postDate || '')
    })
    return arr
  }, [pool, sort, hideExp])

  const genericList = useMemo(
    () => [...data.postings.filter((p) => p.pool === pool)].sort((a, b) => (b.postDate || '').localeCompare(a.postDate || '')),
    [pool],
  )

  const cov = data.resume.coveragePct
  const RINGS: RingMetric[] = [
    { key: 'cov', label: '커버리지', pct: cov, color: 'var(--c-accent)' },
    { key: 'reach', label: '도달률', pct: REACH_PCT, color: 'var(--accent-700)', note: `${REACH_LIST.length}개 공고` },
  ]
  const mk = MARKET[pool]
  const histJobs = useMemo(
    () => data.postings.filter((p) => p.pool === pool).map((p) => ({ techs: p.techs, held: p.matchHeld, total: p.matchTotal })),
    [pool],
  )

  return (
    <div className="stage" style={{ background: t.stageBg }}>
      <PhoneFrame stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
        <div className="career" style={themeVars(t)}>
          <PageTransition type="fade">
            {/* 1막 — 히어로: 포지셔닝 점수 */}
            <div className="cr-greet-line">좋은 아침이에요 👋 <b>리버</b>님</div>
            <div className={hasResume ? undefined : 'cr-lockwrap'}>
              <div className={hasResume ? undefined : 'cr-lockwrap__blur'} aria-hidden={hasResume ? undefined : true}>
                <StatHero
                  value={cov} title="시장 커버리지"
                  rings={<ActivityRings metrics={RINGS} />}
                  legend={<RingLegend metrics={RINGS} />}
                />

                {/* 2막 — 포지셔닝 인사이트 (스와이프 5페이지) */}
                <div className="cr-widget" style={{ marginTop: 12, padding: '16px', marginBottom: 14 }}>
                  <SwipePager pages={[
                    {
                      key: 'cov',
                      node: (
                        <>
                          <div className="scr-card__title" style={{ marginBottom: 6 }}>매칭 분포</div>
                          <CoverageHistogram
                            postings={histJobs} mySkills={RESUME} gap={WHATIF}
                            poolLabel={pool === '국내' ? '국내' : '글로벌'}
                          />
                        </>
                      ),
                    },
                    {
                      key: 'pulse',
                      node: (
                        <>
                          <div className="scr-card__title" style={{ marginBottom: 6 }}>요즘의 시장 <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 500 }}>국내 데이터 근거</span></div>
                          <PulseCard items={PULSE} />
                        </>
                      ),
                    },
                    {
                      key: 'radar',
                      node: (
                        <>
                          <div className="scr-card__title" style={{ marginBottom: 6 }}>업종 적합도 <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 500 }}>보유 기술 기준 실측</span></div>
                          <IndustryFitRadar />
                        </>
                      ),
                    },
                    {
                      key: 'roadmap',
                      node: (
                        <>
                          <div className="scr-card__title" style={{ marginBottom: 6 }}>다음 스텝 로드맵 <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 500 }}>내 스택과 강하게 얽힌 순</span></div>
                          <TechChainRoadmap />
                        </>
                      ),
                    },
                  ]} />
                </div>

                {/* 공고 현황 2열 컴팩트 */}
                <div className="cr-minstat">
                  <div><b>{mk.open.toLocaleString()}</b><span>전체 공고</span></div>
                  <div><b className="warn">{mk.soon.toLocaleString()}</b><span>곧 마감</span></div>
                </div>
              </div>
              {!hasResume && (
                <div className="cr-lockwrap__cta">
                  <ResumeEmptyCard totalPostings={data.meta.totalPostings} onSubmit={() => navigate('/resume/submit')} />
                </div>
              )}
            </div>

            {/* 맞춤 공고 / 채용 공고 */}
            <SectionHeader title={hasResume ? '맞춤 공고' : '채용 공고'} />
            <div className="cr-secbar" style={{ margin: '0 0 14px' }}>
              <div className="cr-pooltoggle cr-pooltoggle--slim">
                {(['국내', '국외'] as Pool[]).map((pv) => (
                  <button key={pv} className={pool === pv ? 'on' : ''} onClick={() => { setPool(pv); setVisible(5) }}>
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
                <JobCard key={p.id} p={p} onOpen={() => navigate(`/job/${data.postings.indexOf(p)}`)} />
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
                <button className={`cr-check ${hideExp ? 'on' : ''}`} onClick={() => { setHideExp((v) => !v); setVisible(5) }}>
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
