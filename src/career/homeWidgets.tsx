import { type ReactNode, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { TechIcon } from './kit'
import { computeTechChain } from './insights'
import market from '../data/marketData.json'
import career from '../data/careerData.json'
import nRaw from '../data/pearl/n.json'
import y4Raw from '../data/pearl/y4.json'
import sRaw from '../data/pearl/s.json'
import kRaw from '../data/pearl/k.json'

/* ============================================================
   홈 위젯 캐러셀 — 히어로 아래 스와이프 카드 6종.
   전부 "데이터 2~3개 조합" 원칙: 이력서 없을 땐 개인화 필터를 빼고
   같은 카드 슬롯에 일반 시장 지표를 보여준다(Phase 5, 폐기 아님).
   ============================================================ */

function WidgetCard({ label, onOpen, children }: { label: string; onOpen?: () => void; children: ReactNode }) {
  const Tag = onOpen ? 'button' : 'div'
  return (
    <Tag className="kit-wcard" onClick={onOpen}>
      <div className="kit-wcard__label">
        {label}
        {onOpen && <ChevronRight size={14} className="kit-wcard__chev" />}
      </div>
      <div className="kit-wcard__body">{children}</div>
    </Tag>
  )
}


/* ---------- 1c. 마감 캘린더 스트립 ----------
   이번 주(월~일) 요일별로 북마크·매칭 50%+ 공고의 마감을 점으로 찍고, 오늘 위치를 강조한다.
   데이터는 CareerDashboard가 이미 계산해둔 poolPostings/savedKeys를 그대로 재사용하고(새 API
   없음), 마감 정보가 없는 날은 점을 비운다. 호출부에서 candidates가 비면 위젯 자체를
   렌더링하지 않아 빈 밴드가 뜨는 걸 막는다. */
export type WeekDay = { iso: string; dow: string; dn: number; isToday: boolean; dotCount: number }
export type WeekDeadlineJob = { id: string; company: string; title: string; matchPct?: number; dday: number; dowLabel: string }

export function DeadlineCalendarStrip({
  days, jobs, onOpen,
}: { days: WeekDay[]; jobs: WeekDeadlineJob[]; onOpen: (id: string) => void }) {
  return (
    <div className="kit-cal">
      <div className="kit-cal__eyebrow">이번 주 마감</div>
      <div className="kit-cal__strip">
        {days.map((d) => (
          <div key={d.iso} className={`kit-cal__day${d.isToday ? ' today' : d.dotCount ? ' has' : ''}`}>
            <div className="kit-cal__dow">{d.isToday ? '오늘' : d.dow}</div>
            <div className="kit-cal__dn">{d.dn}</div>
            <div className="kit-cal__dots">
              {Array.from({ length: Math.min(d.dotCount, 3) }).map((_, i) => <i key={i} />)}
            </div>
          </div>
        ))}
      </div>
      {jobs.length > 0 && (
        <div className="kit-cal__jobs">
          {jobs.map((j) => (
            <button key={j.id} type="button" className="kit-cal__job" onClick={() => onOpen(j.id)}>
              <span className="kit-cal__jt">
                {j.title}
                <small>{j.company} · {j.dowLabel} 마감{j.matchPct != null ? ` · 매칭 ${j.matchPct}%` : ''}</small>
              </span>
              <span className="kit-cal__jd">D-{j.dday}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 1. 마감임박 × 매칭도 ---------- */
export type DeadlinePosting = { id: string; company: string; title: string; matchPct?: number; dday: number }
export function DeadlineMatchWidget({
  items, count, hasResume, onOpen,
}: { items: DeadlinePosting[]; count: number; hasResume: boolean; onOpen?: () => void }) {
  const top = items[0]
  return (
    <WidgetCard label={hasResume ? '마감임박 · 매칭 50%+' : '마감임박 공고'} onOpen={onOpen}>
      {top ? (
        <>
          <div className="kit-wcard__num">{count}<span>건</span></div>
          <div className="kit-wcard__sub">
            <b>{top.company}</b> {top.title} · D-{top.dday}
            {hasResume && top.matchPct != null && <> · 매칭 {top.matchPct}%</>}
          </div>
        </>
      ) : (
        <div className="kit-wcard__sub">7일 내 마감 공고가 없어요</div>
      )}
    </WidgetCard>
  )
}

/* ---------- 2. 다음 배울 기술 로드맵 ---------- */
type NEdgeN = { a: string; b: string; n: number; strength: number }
const N_DATA = nRaw as unknown as { data: { edges: NEdgeN[] } }
/* 반드시 "보유 기술과 실제로 함께 쓰이는" 기술만 보여준다 — 시장 전체에서 인기 있다는
   이유만으로 무관한 기술(예: 프론트엔드 보유자에게 뜬금없는 백엔드 유행)을 보여주면 안 된다는
   피드백 반영. computeTechChain은 이미 보유 기술 중 하나와 실측 co-occurrence가 있는 경우만
   반환하므로, 보유 기술이 있는데도 연결이 없으면(chain.length===0) 무관한 인기 조합으로
   대체하지 않고 정직하게 "데이터 부족"으로 표시한다. 이력서가 아예 없을 때만 시장 전체
   통계(가치중립적 사실)를 보여준다. */
export function RoadmapTeaserWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const steps = useMemo(() => {
    if (skills.length) {
      const chain = computeTechChain(skills, 2)
      return chain.map((c) => ({
        from: c.from, to: c.to,
        evidence: `${c.from} 요구 공고의 ${Math.round(c.strength * 100)}%가 ${c.to}도 함께 요구 · ${c.n.toLocaleString()}건`,
      }))
    }
    return [...N_DATA.data.edges]
      .sort((a, b) => b.n - a.n)
      .slice(0, 2)
      .map((e) => ({ from: e.a, to: e.b, evidence: `가장 많이 함께 요구되는 기술 조합 · ${e.n.toLocaleString()}건` }))
  }, [skills])
  return (
    <WidgetCard label={skills.length ? '다음 배울 기술' : '가장 많이 함께 쓰이는 기술 조합'} onOpen={onOpen}>
      {steps.length ? steps.map((s, i) => (
        <div className="kit-wcard__step" key={s.to}>
          <span className="kit-wcard__stepnum">{i + 1}</span>
          <div style={{ minWidth: 0 }}>
            <div className="kit-wcard__chain">
              <TechIcon tech={s.from} size={20} /> <ChevronRight size={12} /> <b>{s.to}</b>
            </div>
            <div className="kit-wcard__sub">{s.evidence}</div>
          </div>
        </div>
      )) : (
        <div className="kit-wcard__sub">
          {skills.length ? '보유 기술과 강하게 연결된 다음 기술 데이터가 부족해요' : '데이터가 부족해요'}
        </div>
      )}
    </WidgetCard>
  )
}

/* ---------- 3. 트렌드 전파 알림(글로벌) ---------- */
type Y4Edge = { leader: string; follower: string; lag: number; corr: number }
const Y4_DATA = y4Raw as unknown as { data: { edges: Y4Edge[] } }
export function TrendAlertWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const pick = useMemo(() => {
    const owned = new Set(skills)
    const pool = skills.length ? Y4_DATA.data.edges.filter((e) => !owned.has(e.follower)) : Y4_DATA.data.edges
    return [...pool].sort((a, b) => b.corr - a.corr)[0]
  }, [skills])
  return (
    <WidgetCard label="다음에 뜰 기술 · 글로벌" onOpen={onOpen}>
      {pick ? (
        <>
          <div className="kit-wcard__chain">
            <TechIcon tech={pick.leader} size={24} /> <ChevronRight size={14} /> <b>{pick.follower}</b>
          </div>
          <div className="kit-wcard__sub">{pick.leader} 뜨고 {pick.lag}달 뒤 상승 · 교차상관 r={pick.corr}</div>
        </>
      ) : <div className="kit-wcard__sub">데이터가 부족해요</div>}
    </WidgetCard>
  )
}

/* ---------- 4. 대기업 인기 기술 갭 ----------
   "적합도"라는 애매한 지표 대신 훨씬 직설적인 걸로 교체 — 다들 대기업을 노리니까, 실제 대기업
   공고 원본에서 가장 많이 요구되는데 아직 안 배운 기술 3~4개를 그대로 보여준다. 해석 여지 없는
   원본 집계라 "적합도" 같은 애매한 점수화보다 훨씬 실행 가능하다. */
const BIGCO_POSTINGS = career.postings.filter((p) => p.tier === '대기업')
export function BigCoGapWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const ranked = useMemo(() => {
    const owned = new Set(skills)
    const tally = new Map<string, number>()
    BIGCO_POSTINGS.forEach((p) => p.techs.forEach((t) => {
      if (!owned.has(t)) tally.set(t, (tally.get(t) ?? 0) + 1)
    }))
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [skills])
  return (
    <WidgetCard label={skills.length ? '대기업에서 많이 쓰지만 안 배운 기술' : '대기업에서 많이 쓰는 기술'} onOpen={onOpen}>
      <div className="kit-wcard__sub">대기업 공고 {BIGCO_POSTINGS.length}건 기준</div>
      {ranked.length ? (
        <div className="kit-wcard__gaprow">
          {ranked.map(([tech, count]) => (
            <span key={tech} className="kit-wcard__gapchip">
              <TechIcon tech={tech} size={16} /> {tech} <em>{count}건</em>
            </span>
          ))}
        </div>
      ) : (
        <div className="kit-wcard__sub">대기업 공고에 나오는 기술은 이미 다 보유하고 있어요</div>
      )}
    </WidgetCard>
  )
}

/* ---------- 5. 응답률 상위 회사 (전 사용자 공통·정직 표기) ---------- */
type SExample = { company: string; level: string; rate: number }
const S_DATA = sRaw as unknown as { pool: string; sample_size: number; data: { median_rate: number; examples: SExample[] } }
export function ResponseRateWidget({ onOpen }: { onOpen?: () => void }) {
  const top = useMemo(
    () => S_DATA.data.examples.filter((e) => e.level === 'very_high').sort((a, b) => b.rate - a.rate).slice(0, 3),
    [],
  )
  return (
    <WidgetCard label="응답 잘 오는 회사 · 국내" onOpen={onOpen}>
      {top.map((c) => (
        <div key={c.company} className="kit-wcard__row">
          <span>{c.company}</span><b>{c.rate}%</b>
        </div>
      ))}
      <div className="kit-wcard__sub">중위 응답률 {S_DATA.data.median_rate}% · 원티드 전용 표본 {S_DATA.sample_size.toLocaleString()}건</div>
    </WidgetCard>
  )
}

/* ---------- 6. 나와 닮은 회사 ---------- */
const CBS = market.companyBySkill as Record<string, { present: { company: string; count: number }[] }>
const CBS_KEYS = Object.keys(CBS)
export function CompanyMatchWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const info = useMemo(() => {
    const owned = skills.filter((s) => CBS_KEYS.includes(s))
    const personal = owned.length > 0
    const keys = personal ? owned : CBS_KEYS
    const tally = new Map<string, number>()
    keys.forEach((k) => {
      CBS[k]?.present.forEach((p) => tally.set(p.company, (tally.get(p.company) ?? 0) + p.count))
    })
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1])
    return { personal, keys, top: ranked[0] }
  }, [skills])
  if (!info.top) return null
  return (
    <WidgetCard label={info.personal ? '내 기술을 원하는 회사' : '요즘 활발히 채용 중인 회사'} onOpen={onOpen}>
      <div className="kit-wcard__num" style={{ fontSize: 24 }}>{info.top[0]}</div>
      <div className="kit-wcard__sub">
        {info.personal ? `보유 기술 ${info.keys.join(', ')} 기준 최근 채용 ${info.top[1]}건` : `${info.keys.join(', ')} 등 인기 기술 기준 최근 채용 ${info.top[1]}건`}
      </div>
    </WidgetCard>
  )
}

/* ---------- 7. 내 기술 트렌드 온도 ----------
   HN 언급량 6개월 추이 기준 아키타입(스테디셀러/뜨는 중/식는 중/하입 온리) 분류.
   29개 기술만 커버하는 좁은 데이터셋이라, 보유 기술 중 하나도 안 걸리면 "온도 없음"을
   정직하게 밝히고 시장 예시로 대체한다(과대표시 금지 원칙). */
type KBadge = { tech: string; types: string[] }
const K_DATA = kRaw as unknown as { data: { groups: Record<string, KBadge[]> } }
const K_META: Record<string, { icon: string; label: string }> = {
  steady: { icon: '🪨', label: '스테디셀러' },
  rising: { icon: '📈', label: '뜨는 중' },
  hype_only: { icon: '🔥', label: '화제성만 높음' },
  falling: { icon: '📉', label: '식는 중' },
}
const K_ORDER = ['steady', 'rising', 'hype_only', 'falling']
const TECH_TYPES = new Map<string, string[]>()
Object.values(K_DATA.data.groups).forEach((arr) => arr.forEach((b) => { if (!TECH_TYPES.has(b.tech)) TECH_TYPES.set(b.tech, b.types) }))

export function TechTemperatureWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const info = useMemo(() => {
    const owned = skills.filter((s) => TECH_TYPES.has(s))
    const byType: Record<string, string[]> = {}
    owned.forEach((s) => TECH_TYPES.get(s)!.forEach((t) => { (byType[t] ??= []).push(s) }))
    return { owned, byType, hasSignal: owned.length > 0 }
  }, [skills])

  if (!info.hasSignal) {
    const example = K_ORDER.map((g) => ({ g, techs: (K_DATA.data.groups[g] ?? []).slice(0, 2).map((b) => b.tech) }))
    return (
      <WidgetCard label="기술 트렌드 온도 · 시장 예시" onOpen={onOpen}>
        <div className="kit-wcard__sub">
          {skills.length ? '보유 기술 중 최근 6개월 개발자 커뮤니티 트렌드 데이터가 있는 항목이 없어요' : '이력서를 등록하면 내 기술 기준으로 바뀌어요'}
        </div>
        <div className="kit-wcard__temprow">
          {example.map(({ g, techs }) => (
            <span key={g} className="kit-wcard__tempchip">{K_META[g].icon} {K_META[g].label} <em>{techs.join(', ')}</em></span>
          ))}
        </div>
      </WidgetCard>
    )
  }
  return (
    <WidgetCard label="내 기술 트렌드 온도" onOpen={onOpen}>
      <div className="kit-wcard__sub">보유 기술 {skills.length}개 중 {info.owned.length}개에 최근 6개월 개발자 커뮤니티 언급 추이 데이터가 있어요</div>
      <div className="kit-wcard__temprow">
        {K_ORDER.filter((g) => info.byType[g]?.length).map((g) => (
          <span key={g} className="kit-wcard__tempchip">
            {K_META[g].icon} {K_META[g].label} {info.byType[g].length}개 <em>{info.byType[g].join(', ')}</em>
          </span>
        ))}
      </div>
    </WidgetCard>
  )
}
