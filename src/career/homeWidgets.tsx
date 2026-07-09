import { type ReactNode, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { TechIcon } from './kit'
import { computeTechChain, computeTierAffinity, computeGenerationAffinity, computeIndustryFit, computeTierTopTechs, computeGenerationTopTechs } from './insights'
import { C, tooltipStyle } from '../pages/widgets/base'
import market from '../data/marketData.json'
import nRaw from '../data/pearl/n.json'
import y4Raw from '../data/pearl/y4.json'
import sRaw from '../data/pearl/s.json'

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

/* 3분류 구성비를 한눈에 — 도넛(비중) + 범례(정확한 수치)를 나란히.
   막대 3줄을 눈으로 비교하는 것보다 면적으로 비교하는 편이 더 빠르다. */
const DONUT_SHADES = [C.accent700, C.accent, C.accent300]
function MiniDonut({ title, items, examples }: { title: string; items: { label: string; pct: number }[]; examples?: string[] }) {
  const option = useMemo(() => ({
    tooltip: { ...tooltipStyle, formatter: (p: { name: string; value: number }) => `${p.name} ${p.value}%` },
    series: [{
      type: 'pie', radius: ['58%', '86%'], avoidLabelOverlap: false,
      label: { show: false }, labelLine: { show: false }, silent: false,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      data: items.map((it, i) => ({ name: it.label, value: it.pct, itemStyle: { color: DONUT_SHADES[i % DONUT_SHADES.length] } })),
    }],
  }), [items])
  const top = [...items].sort((a, b) => b.pct - a.pct)[0]
  return (
    <div className="kit-wcard__donutblock">
      <div className="kit-wcard__barlabel">{title}</div>
      <div className="kit-wcard__donutrow">
        <div className="kit-wcard__donutwrap">
          <ReactECharts option={option} style={{ width: 62, height: 62 }} opts={{ renderer: 'svg' }} />
          <div className="kit-wcard__donutcenter"><b>{top.pct}%</b></div>
        </div>
        <div className="kit-wcard__donutlegend">
          {items.map((it, i) => (
            <div key={it.label} className="row">
              <i style={{ background: DONUT_SHADES[i % DONUT_SHADES.length] }} />
              <span>{it.label}</span>
              <b>{it.pct}%</b>
            </div>
          ))}
        </div>
      </div>
      {examples && examples.length > 0 && (
        <div className="kit-wcard__exwrap">
          <div className="kit-wcard__exlabel"><b>{top.label}</b>에서 많이 쓰는 기술</div>
          <div className="kit-wcard__exrow">
          {examples.map((t) => (
            <span key={t} className="kit-wcard__exchip"><TechIcon tech={t} size={14} />{t}</span>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- 1. 마감임박 × 매칭도 ---------- */
export type DeadlinePosting = { company: string; title: string; matchPct?: number; dday: number }
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
export function RoadmapTeaserWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const steps = useMemo(() => {
    if (skills.length) {
      const chain = computeTechChain(skills, 2)
      if (chain.length) {
        return chain.map((c) => ({
          from: c.from, to: c.to,
          evidence: `${c.from} 보유자의 ${Math.round(c.strength * 100)}%가 함께 요구 · ${c.n.toLocaleString()}건`,
        }))
      }
    }
    return [...N_DATA.data.edges]
      .sort((a, b) => b.n - a.n)
      .slice(0, 2)
      .map((e) => ({ from: e.a, to: e.b, evidence: `가장 많이 함께 요구되는 기술 조합 · ${e.n.toLocaleString()}건` }))
  }, [skills])
  return (
    <WidgetCard label={skills.length ? '다음 배울 기술 · 추천순' : '가장 인기있는 기술 조합'} onOpen={onOpen}>
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
      )) : <div className="kit-wcard__sub">데이터가 부족해요</div>}
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

/* ---------- 4. 내 기술을 원하는 곳 (기업 규모 × 설립 세대 — 2개 실측 축, 도넛 2개) ----------
   "나와 어울리는 회사/아키타입" 같은 "찾음·매칭" 표현은 은연중에 "대기업=좋은 것"같은
   가치판단을 얹기 쉬워서 피드백으로 교체. 대신 "이 기술을 요구하는 공고 비율이 얼마인가"라는
   가치중립적 수요 통계만 보여준다. 3줄 막대 대신 도넛(면적 비교)+범례(정확한 수치)로 한눈에. */
const GEN_SHORT = ['레거시', '성장기', '신생']
export function CompanyFitWidget({ skills, onOpen }: { skills: string[]; onOpen?: () => void }) {
  const tierFit = useMemo(() => computeTierAffinity(skills), [skills])
  const genFit = useMemo(() => computeGenerationAffinity(skills), [skills])
  const indFit = useMemo(() => computeIndustryFit(skills), [skills])
  const bestInd = useMemo(() => [...indFit].sort((a, b) => b.pct - a.pct)[0], [indFit])
  const genItems = useMemo(() => GEN_SHORT.map((label, i) => ({ label, pct: genFit[i] })), [genFit])
  const bestTierName = useMemo(() => [...tierFit].sort((a, b) => b.pct - a.pct)[0].tier, [tierFit])
  const bestGenIdx = useMemo(() => genFit.indexOf(Math.max(...genFit)), [genFit])
  const tierExamples = useMemo(() => computeTierTopTechs(bestTierName, skills), [bestTierName, skills])
  const genExamples = useMemo(() => computeGenerationTopTechs(bestGenIdx, skills), [bestGenIdx, skills])
  return (
    <WidgetCard label={skills.length ? '내 기술을 요구하는 공고 비율' : '시장 전체 공고 비율'} onOpen={onOpen}>
      <div className="kit-wcard__sub">
        {skills.length
          ? <>업종별로는 <b>{bestInd.name}</b> 공고에서 이 기술 조합이 가장 많이 나와요 ({bestInd.pct}%)</>
          : '보유 기술을 등록하면 업종별 요구 비율도 계산돼요'}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <MiniDonut title="기업 규모별" items={tierFit.map((t) => ({ label: t.tier, pct: t.pct }))} examples={tierExamples} />
        <MiniDonut title="설립 연도별" items={genItems} examples={genExamples} />
      </div>
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
