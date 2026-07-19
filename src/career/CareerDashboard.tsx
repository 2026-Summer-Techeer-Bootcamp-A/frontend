import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Calendar, SlidersHorizontal, Check, Settings, Briefcase, Clock, TrendingUp, ChevronRight } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import CareerTabBar from './CareerTabBar'
import { PageTransition, StatHero, SectionHeader, JobCardCompact, CardModeToggle, ActivityRings, RingLegend, ResumeEmptyCard, SegmentedControl, BottomSheet, matchGrad, type CardMode, type RingMetric } from './kit'
import { RoadmapTeaserWidget, BigCoGapWidget, TechTemperatureWidget, DeadlineCalendarStrip, type DeadlinePosting, type WeekDay, type WeekDeadlineJob } from './homeWidgets'
import { ApplyCardStack, type ApplyCardJob } from './ApplyCardStack'
import { THEME, themeVars } from './themes'
import data from '../data/careerData.json'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo, useHeroMode, useSavedJobs, jobKey, HERO_MODES, type HeroMode } from './state'
import { useAuth } from './authStore'
import './career.css'

const HERO_MODE_LABEL: Record<HeroMode, string> = {
  briefing: '브리핑', default: '기본', nextstep: '빠른 다음 스텝', roadmap: '다음 배울 기술', fit: '대기업 인기 기술 갭', temp: '기술 트렌드 온도',
}

/* 위젯 선택 시트용 미니 미리보기 — 실데이터 렌더링은 무겁고 지저분해서, 레이아웃 실루엣만
   보여주는 CSS 목업으로 대체(iOS 알림 설정의 Lock Screen/Notification Center 카드 참고). */
const HERO_PREVIEW: Record<HeroMode, ReactNode> = {
  briefing: (
    <div className="cr-hpv cr-hpv--briefing">
      <span className="hpv-row"><i className="hpv-dot" /><i className="hpv-bar" /></span>
      <span className="hpv-row"><i className="hpv-dot" /><i className="hpv-bar short" /></span>
    </div>
  ),
  default: (
    <div className="cr-hpv cr-hpv--rings">
      <span className="hpv-ring outer" /><span className="hpv-ring inner" />
    </div>
  ),
  nextstep: (
    <div className="cr-hpv cr-hpv--stat">
      <span className="hpv-num" /><span className="hpv-track"><i /></span>
    </div>
  ),
  roadmap: (
    <div className="cr-hpv cr-hpv--chain">
      <span className="hpv-chip" /><span className="hpv-arrow" /><span className="hpv-chip alt" />
    </div>
  ),
  fit: (
    <div className="cr-hpv cr-hpv--gap">
      <span className="hpv-gapchip" /><span className="hpv-gapchip short" /><span className="hpv-gapchip shorter" />
    </div>
  ),
  temp: (
    <div className="cr-hpv cr-hpv--temp">
      <span className="hpv-pill" /><span className="hpv-pill" /><span className="hpv-pill short" />
    </div>
  ),
}

/* ---------- 홈 히어로 변형 — 빠른 다음 스텝(평균 충족률 + 가장 근접한 미보유 기술) ----------
   "추천" 대신, 이미 매칭도가 높은 공고들 기준으로 "이 기술을 보유하면 몇 건에서 매칭이 오르는지"
   라는 객관적 사실만 제시 — 학습 여부 판단은 사용자 몫으로 남긴다. */
function NextStepHero({
  avgFitPct, topGap,
}: { avgFitPct: number; topGap: { tech: string; count: number; nearBased: boolean } | null }) {
  return (
    <div className="kit-jobsum">
      <div className="kit-jobsum__label">빠른 다음 스텝</div>
      <div className="kit-jobsum__statrow">
        <div className="kit-jobsum__statbare">
          <b>{avgFitPct}%</b>
          <span>평균 매칭률</span>
        </div>
        <div
          className="kit-jobsum__ring"
          style={{ background: `conic-gradient(var(--c-accent) 0 ${avgFitPct}%, var(--accent-100) ${avgFitPct}% 100%)` }}
        />
      </div>
      <div className="kit-jobsum__pick">
        {topGap
          ? <><b>{topGap.tech}</b> 보유 시 {topGap.nearBased ? '지원 가능한 공고' : '전체 공고'} 중 {topGap.count}건에서 매칭이 올라가요</>
          : '지금 필요한 기술은 이미 다 보유하고 있어요'}
      </div>
    </div>
  )
}

/* ---------- 홈 히어로 커스텀 변형 1 — 브리핑(오늘 할 일 + 마감임박 통합, 중복 제거) ---------- */
function BriefingHero({
  newCount, newTechHint, savedSoon, topPick, reachedCount, onOpenNew, onOpenDeadline,
}: {
  newCount: number; newTechHint: string; savedSoon: { company: string; dday: number } | null
  topPick: DeadlinePosting | null; reachedCount: number
  onOpenNew: () => void; onOpenDeadline: () => void
}) {
  // 마감일(closeDate)이 비어있는 공고가 많아 "마감임박"은 자주 비어있다 — 둘 다 없을 때도
  // 최소 2개는 보이도록, 항상 계산 가능한 "지원 가능 공고 수"를 마지막 안전망으로 둔다.
  const items = [
    { key: 'new', icon: <Briefcase size={17} />, title: `새 맞춤 공고 ${newCount}개 확인`, sub: newTechHint, onOpen: onOpenNew },
    ...(savedSoon
      ? [{ key: 'saved', icon: <Clock size={17} />, title: `저장한 공고 D-${savedSoon.dday} 확인`, sub: '마감 전 지원 여부 결정', onOpen: onOpenDeadline }]
      : topPick
      ? [{ key: 'pick', icon: <Clock size={17} />, title: `가장 급한 마감 공고 D-${topPick.dday} 확인`, sub: `${topPick.company} · ${topPick.title}`, onOpen: onOpenDeadline }]
      : reachedCount > 0
      ? [{ key: 'reach', icon: <TrendingUp size={17} />, title: `지원 가능한 공고 ${reachedCount}개 확인`, sub: '기술 매칭 50%+ · 경력 조건도 맞는 공고', onOpen: onOpenNew }]
      : []),
  ]
  const [done, setDone] = useState<Set<string>>(new Set())
  const toggle = (k: string) => setDone((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const pct = items.length ? Math.round((done.size / items.length) * 100) : 0
  return (
    <div className="kit-todo">
      <div className="kit-todo__label">오늘 브리핑</div>
      <div className="kit-todo__sub">{items.length ? '5분이면 오늘 확인 끝나요' : '오늘은 새로 확인할 소식이 없어요'}</div>
      {items.length > 0 && (
        <div className="kit-todo__card">
          {items.map((it) => (
            <div className="kit-todo__row" key={it.key}>
              <button className={`kit-todo__check${done.has(it.key) ? ' on' : ''}`} onClick={() => toggle(it.key)} aria-label="완료 체크">
                {done.has(it.key) && <Check size={12} strokeWidth={3} />}
              </button>
              <span className="kit-todo__ic">{it.icon}</span>
              <button className="kit-todo__body" onClick={it.onOpen}>
                <span className="t">{it.title}</span>
                <span className="s">{it.sub}</span>
              </button>
              <ChevronRight size={16} className="kit-todo__chev" />
            </div>
          ))}
          <div className="kit-todo__foot">
            <span>{done.size}/{items.length} 완료</span>
            <span className="kit-todo__bar"><i style={{ width: `${pct}%` }} /></span>
          </div>
        </div>
      )}
    </div>
  )
}

type Pool = '국내' | '국외'
type Sort = 'latest' | 'match' | 'deadline' | 'tier'

const TIER_RANK: Record<string, number> = { 대기업: 0, 중견: 1, 중소: 2 }
const tierRank = (t: string | null) => (t && t in TIER_RANK ? TIER_RANK[t] : 3)

const AS_OF = data.meta.asOf
const MARKET: Record<string, { open: number; soon: number }> = data.meta.market

// 1c 마감 캘린더 스트립용 이번 주(월~일) 요일 메타. AS_OF는 데이터 스냅샷 고정값이라 모듈
// 스코프에서 한 번만 계산하면 된다. 로컬 타임존에 따라 날짜가 밀리는 걸 막기 위해 UTC
// 에폭 연산만 쓴다(new Date(asOf).getDay() 같은 로컬 getter는 쓰지 않음).
const WEEK_DOW = ['월', '화', '수', '목', '금', '토', '일']
const WEEK_DAY_META: { iso: string; dow: string; dn: number; isToday: boolean }[] = (() => {
  const [y, m, d] = AS_OF.split('-').map(Number)
  const asOfUTC = Date.UTC(y, m - 1, d)
  const asOfDow = new Date(asOfUTC).getUTCDay() // 0=일 ~ 6=토
  const mondayOffsetDays = asOfDow === 0 ? -6 : 1 - asOfDow
  const mondayUTC = asOfUTC + mondayOffsetDays * 86400000
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(mondayUTC + i * 86400000)
    const iso = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
    return { iso, dow: WEEK_DOW[i], dn: t.getUTCDate(), isToday: iso === AS_OF }
  })
})()

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
  const { user } = useAuth()
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
  // "지원 가능"의 기준: 기술 매칭 50%+ 만으로는 비현실적이다(요구 기술 2개 중 1개만 맞아도
  // 통과되고, 10~19년차 시니어 공고까지 포함됨). 공고의 최소 경력(careerMin)이 내 이력서
  // 경력 상한(careerMax)을 넘지 않는 경우만 실제로 지원 가능한 공고로 센다.
  const myCareerMax = hasResume ? activeResume.careerMax : null
  const isReachable = (p: (typeof poolPostings)[number]) =>
    p.matchPct >= 50 && (!p.careerMin || (myCareerMax != null && p.careerMin <= myCareerMax))
  const reachedPostings = poolPostings.filter(isReachable).length
  const reachRate = totalPostings ? Math.round((reachedPostings / totalPostings) * 100) : 0
  const coveragePct = calculateCoverage(activeSkills, pool)

  // 홈 상단 히어로 커스텀(오늘 할 일 / 기본 / 요약) — 설정은 로컬 저장, 백엔드 미연동 항목은
  // 정직하게 명시(예: "진단 업데이트"는 실제 변경 이력 추적이 없어 대표 예시로만 노출)
  const { mode: heroMode, setMode: setHeroMode } = useHeroMode()
  const [heroSheetOpen, setHeroSheetOpen] = useState(false)
  const { savedKeys } = useSavedJobs()

  const latestPostDate = useMemo(() => poolPostings.reduce((m, p) => (p.postDate > m ? p.postDate : m), ''), [poolPostings])
  const newPostings = useMemo(
    () => poolPostings.filter((p) => p.postDate === latestPostDate && p.matchPct >= 50),
    [poolPostings, latestPostDate],
  )
  const newTechHint = useMemo(() => {
    const techCount: Record<string, number> = {}
    newPostings.forEach((p) => p.techs.filter((x) => activeSkills.includes(x)).forEach((x) => { techCount[x] = (techCount[x] ?? 0) + 1 }))
    const top = Object.entries(techCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t)
    return top.length ? `${top.join(' · ')} 일치 공고 포함` : '보유 기술 일치 공고 포함'
  }, [newPostings, activeSkills])
  const savedSoon = useMemo(() => {
    const cands = poolPostings
      .filter((p) => savedKeys.has(jobKey(p)))
      .map((p) => ({ p, dd: ddayInfo(p.closeDate, AS_OF) }))
      .filter((x) => x.dd)
      .sort((a, b) => a.dd!.d - b.dd!.d)
    const first = cands[0]
    if (!first) return null
    return { company: first.p.company, dday: first.dd!.d, id: first.p.id, onOpen: () => navigate(`/job/${encodeURIComponent(first.p.id)}`) }
  }, [poolPostings, savedKeys, navigate])
  const avgFitPct = useMemo(() => (poolPostings.length ? Math.round(poolPostings.reduce((s, p) => s + p.matchPct, 0) / poolPostings.length) : 0), [poolPostings])

  // 빠른 다음 스텝: 이미 매칭 50%+인 공고들(근접 공고) 기준으로 가장 많이 빠진 기술 1개를 찾는다.
  // "시장에서 인기있는 기술"이 아니라 "내가 이미 근접한 공고에서 빠진 기술"이라 무관한 추천이 안 나온다.
  const topGap = useMemo(() => {
    const near = poolPostings.filter((p) => isReachable(p) && p.gap.length)
    const nearBased = near.length > 0
    const basePool = nearBased ? near : poolPostings.filter((p) => p.gap.length)
    if (!basePool.length) return null
    const tally: Record<string, number> = {}
    basePool.forEach((p) => p.gap.forEach((g: string) => { tally[g] = (tally[g] ?? 0) + 1 }))
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1])
    if (!ranked.length) return null
    return { tech: ranked[0][0], count: ranked[0][1], nearBased }
  }, [poolPostings, myCareerMax])

  const RINGS: RingMetric[] = [
    { key: 'cov', label: '기술 보유율', pct: coveragePct, color: 'var(--c-accent)' },
    { key: 'reach', label: '지원 가능 비율', pct: reachRate, color: 'var(--accent-700)', note: `${reachedPostings}개 공고` },
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
      if (dd && dd.d <= 7) out.push({ id: p.id, company: p.company, title: p.title, matchPct: hasResume ? p.matchPct : undefined, dday: dd.d })
    }
    out.sort((a, b) => a.dday - b.dday)
    return out
  }, [poolPostings, hasResume])

  // 1c 마감 캘린더 스트립: 이번 주(월~일) 안에 마감이 있는 북마크·매칭 50%+ 공고만 후보로 삼는다
  // (deadlineItems와 같은 기준). 과거 요일(오늘 이전)은 ddayInfo가 null을 돌려줘 자연히 빠진다.
  const weekCandidates = useMemo(() => {
    const isoSet = new Set(WEEK_DAY_META.map((w) => w.iso))
    const base = hasResume ? poolPostings.filter((p) => savedKeys.has(jobKey(p)) || p.matchPct >= 50) : poolPostings
    return base.flatMap((p) => {
      if (!p.closeDate || !isoSet.has(p.closeDate)) return []
      const dd = ddayInfo(p.closeDate, AS_OF)
      return dd ? [{ p, dd }] : []
    })
  }, [poolPostings, hasResume, savedKeys])

  const weekDays: WeekDay[] = useMemo(
    () => WEEK_DAY_META.map((w) => ({ ...w, dotCount: weekCandidates.filter((x) => x.p.closeDate === w.iso).length })),
    [weekCandidates],
  )

  const weekJobs: WeekDeadlineJob[] = useMemo(
    () => [...weekCandidates]
      .sort((a, b) => a.dd.d - b.dd.d)
      .slice(0, 2)
      .map((x) => {
        const dowIdx = WEEK_DAY_META.findIndex((w) => w.iso === x.p.closeDate)
        return {
          id: x.p.id, company: x.p.company, title: x.p.title,
          matchPct: hasResume ? x.p.matchPct : undefined,
          dday: x.dd.d,
          dowLabel: `${WEEK_DOW[dowIdx]}요일`,
        }
      }),
    [weekCandidates, hasResume],
  )

  // 3a 지원 가능 공고 카드: 매칭 50%+ 이면서 내 경력 상한을 넘지 않는(isReachable) 공고 중
  // 매칭 높은 순 3건 — 데스크톱 대시보드가 API에서 min_match=50 · page_size=3으로 받아오는
  // 것과 같은 기준을 정적 데이터에 적용한다. 이력서 없는 게스트는 매칭 자체가 의미 없어 숨긴다.
  const applyCards: ApplyCardJob[] = useMemo(() => {
    if (!hasResume) return []
    return [...poolPostings]
      .filter(isReachable)
      .sort((a, b) => b.matchPct - a.matchPct)
      .slice(0, 3)
      .map((p) => ({
        id: p.id, company: p.company, title: p.title, matchPct: p.matchPct,
        gapSkill: p.gap[0] ?? null,
        dday: p.closeDate ? ddayInfo(p.closeDate, AS_OF) : null,
      }))
  }, [poolPostings, hasResume, myCareerMax])

  return (
    <div className="stage stage--app">
      <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
        <div className="career" style={themeVars(t)}>
          <PageTransition type="fade">
            {/* Greeting — 설정 버튼은 히어로 카드 위가 아니라 이 짧은 인사말 줄 옆 여백에 띄운다.
                카드 위에 얹으면 카드 폭을 줄여야 해서 아래 미니스탯/공고 카드들과 폭이 안 맞았음. */}
            <div style={{ position: 'relative' }}>
              {hasResume && (
                <button className="cr-herosettings" onClick={() => setHeroSheetOpen(true)} aria-label="홈 상단 커스텀">
                  <Settings size={15} />
                </button>
              )}
              <div className="cr-greet-line">좋은 아침이에요 👋 <b>{user?.nickname ?? '리버'}</b>님</div>
            </div>

            {/* 상단 위젯존(~40%): 히어로(또는 이력서 유도) + 위젯 캐러셀 6종 — 이력서 없어도 잠그지 않고
                일반 시장 지표 모드로 그대로 보여준다(각 위젯이 skills=[]일 때 일반 모드로 전환) */}
            <div>
              {!hasResume ? (
                <ResumeEmptyCard totalPostings={data.meta.totalPostings} onSubmit={() => navigate('/resume/submit')} />
              ) : heroMode === 'briefing' ? (
                <BriefingHero
                  newCount={newPostings.length}
                  newTechHint={newTechHint}
                  savedSoon={savedSoon}
                  topPick={deadlineItems[0] ?? null}
                  reachedCount={reachedPostings}
                  onOpenNew={() => navigate('/jobs')}
                  onOpenDeadline={() => {
                    if (savedSoon) navigate(`/job/${encodeURIComponent(savedSoon.id)}`)
                    else if (deadlineItems[0]) navigate(`/job/${encodeURIComponent(deadlineItems[0].id)}`)
                  }}
                />
              ) : heroMode === 'nextstep' ? (
                <NextStepHero avgFitPct={avgFitPct} topGap={topGap} />
              ) : heroMode === 'roadmap' ? (
                <RoadmapTeaserWidget skills={activeSkills} onOpen={() => navigate('/market')} />
              ) : heroMode === 'fit' ? (
                <BigCoGapWidget skills={activeSkills} onOpen={() => navigate('/market')} />
              ) : heroMode === 'temp' ? (
                <TechTemperatureWidget skills={activeSkills} onOpen={() => navigate('/market')} />
              ) : (
                <StatHero
                  value={coveragePct} title="기술 보유율"
                  rings={<ActivityRings metrics={RINGS} />}
                  legend={<RingLegend metrics={RINGS} />}
                />
              )}
            </div>

            <BottomSheet open={heroSheetOpen} onClose={() => setHeroSheetOpen(false)}>
              <div className="cr-sheet__label" style={{ marginTop: 0 }}>홈 상단 커스텀</div>
              <div className="cr-heropick">
                {HERO_MODES.map((m) => (
                  <button key={m} className={`cr-heropick__cell ${heroMode === m ? 'on' : ''}`} onClick={() => { setHeroMode(m); setHeroSheetOpen(false) }}>
                    <div className="cr-heropick__phone">
                      {HERO_PREVIEW[m]}
                      {heroMode === m && <span className="cr-heropick__check"><Check size={11} strokeWidth={3} /></span>}
                    </div>
                    <span className="cr-heropick__label">{HERO_MODE_LABEL[m]}</span>
                  </button>
                ))}
              </div>
            </BottomSheet>

            {/* 히어로 아래 얇은 밴드: 이번 주 마감 캘린더 — 마감 공고가 하나도 없으면 숨겨서
                빈 밴드가 뜨지 않게 한다 */}
            {weekCandidates.length > 0 && (
              <DeadlineCalendarStrip
                days={weekDays}
                jobs={weekJobs}
                onOpen={(id) => navigate(`/job/${encodeURIComponent(id)}`)}
              />
            )}

            {/* 공고 현황 2열 컴팩트 */}
            <div className="cr-minstat" style={{ marginBottom: 14 }}>
              <div><b>{mk.open.toLocaleString()}</b><span>전체 공고</span></div>
              <div><b className="warn">{mk.soon.toLocaleString()}</b><span>곧 마감</span></div>
            </div>

            {/* 바로 지원 후보(3a) — 맞춤 공고 리스트보다 위에서, 매칭 높은 공고 소수만 카드로 */}
            {applyCards.length > 0 && (
              <>
                <SectionHeader title="바로 지원 후보" />
                <ApplyCardStack cards={applyCards} onOpen={(id) => navigate(`/job/${encodeURIComponent(id)}`)} />
              </>
            )}

            {/* 맞춤 공고 / 채용 공고 */}
            <SectionHeader title={hasResume ? '맞춤 공고' : '채용 공고'} />
            <div className="cr-secbar" style={{ margin: '0 0 14px' }}>
              <SegmentedControl
                size="sm"
                value={pool}
                onChange={(v) => { setPool(v as Pool); setVisible(3) }}
                options={[{ key: '국내', label: '국내' }, { key: '국외', label: '글로벌' }]}
              />
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
                  <JobCardGeneric key={p.id} p={p} onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)} />
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
                  onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                />
              ))
            ) : (
              list.slice(0, visible).map((p) => (
                <JobCard key={p.id} p={p} mySkills={activeSkills} onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)} />
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
