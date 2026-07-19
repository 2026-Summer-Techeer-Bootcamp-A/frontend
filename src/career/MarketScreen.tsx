import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Award, ChevronRight, UploadCloud } from 'lucide-react'
import { CareerScreen, ScreenHead, PoolToggle, AsOf, Card } from './charts'
import {
  SectionHeader, DisclosureCard, OpportunityQuadrant,
  ResumeHeroCard, ActivityRings, RingLegend, CoverageHistogram,
  type QuadItem
} from './kit'
import { IndustryFitRadar, TechChainRoadmap, TechDemandHeatStrip } from './insights'
import { TrendTabStage } from './TrendTabStage'
import { useResumesState, getDynamicPostings, calculateCoverage } from './state'
import market from '../data/marketData.json'
import career from '../data/careerData.json'

type Pool = '국내' | '국외'
const COOC = market.cooccurrence as never as Record<string, { base: number; items: { tech: string; coRate: number }[] }>

export default function MarketScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emptyParam = searchParams.get('empty') === 'true'

  const { resumes, activeResume } = useResumesState()
  const hasResume = !emptyParam && resumes.length > 0

  const [pool, setPool] = useState<Pool>('국내')
  const [sel, setSel] = useState('Python')

  // Dynamic calculation of postings matching the active resume skills
  const activeSkills = useMemo(() => hasResume ? activeResume.skills : [], [hasResume, activeResume])
  const dynamicPostings = useMemo(() => getDynamicPostings(activeSkills), [activeSkills])
  const poolPostings = useMemo(() => dynamicPostings.filter((p) => p.pool === pool), [dynamicPostings, pool])

  const totalPostings = poolPostings.length
  const reachedPostings = poolPostings.filter((p) => p.matchPct >= 50).length
  const reachRate = totalPostings ? Math.round((reachedPostings / totalPostings) * 100) : 0
  const coveragePct = calculateCoverage(activeSkills, pool)

  const RINGS = [
    { key: 'cov', label: '커버리지', pct: coveragePct, color: 'var(--c-accent)' },
    { key: 'reach', label: '도달률', pct: reachRate, color: 'var(--accent-700)', note: `${reachedPostings}개 공고` },
  ]

  const histJobs = useMemo(() => {
    return poolPostings.map((p) => ({ techs: p.techs, held: p.matchHeld, total: p.matchTotal }))
  }, [poolPostings])

  const whatIf = useMemo(() => {
    const p = pool === '국내' ? '국내' : '국외'
    return (market.skillShare as never as Record<string, { items: { tech: string; count: number }[] }>)[p]
      .items.filter((i) => !activeSkills.includes(i.tech))
      .slice(0, 5)
      .map((i) => ({ tech: i.tech, count: i.count }))
  }, [pool, activeSkills])

  const quad: QuadItem[] = career.topTechs.slice(0, 12).map((t) => ({
    tech: t.tech, demand: t.count, owned: activeSkills.includes(t.tech), count: t.count,
  }))
  const cooc = COOC[sel]

  return (
    <CareerScreen active="market">
      <ScreenHead title="시장 · 진단" sub="채용공고 124,237건 기준 분석" />
      <div className="scr-toolbar"><PoolToggle pool={pool} onChange={setPool} /></div>

      {/* 1. 이력서 진단 & 피드백 영역 */}
      {!hasResume ? (
        <Card>
          <div style={{ padding: '12px 8px', textAlign: 'center' }}>
            <UploadCloud size={40} style={{ color: 'var(--c-muted)', marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>이력서를 진단하고 분석 피드백을 받으세요</div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 16 }}>
              이력서를 등록하면 전체 공고 중 내 기술 커버리지와 적합한 산업군 피드백을 계산해 드립니다.
            </div>
            <button
              className="kit-hero__cta"
              style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
              onClick={() => navigate('/resume/submit')}
            >
              이력서 등록/분석하기
            </button>
          </div>
        </Card>
      ) : (
        <>
          <ResumeHeroCard
            title={activeResume.title}
            position={activeResume.position}
            career={
              activeResume.careerMin === null && activeResume.careerMax === null
                ? '경력 무관'
                : `경력 ${activeResume.careerMin ?? 0}~${activeResume.careerMax ?? 0}년`
            }
            coverage={coveragePct}
            skillCount={activeResume.skills.length}
            onEdit={() => navigate('/resume/submit')}
          />

          <SectionHeader title="내 커리어 점수 진단" hint="보유 기술 매칭 분석" />
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <ActivityRings metrics={RINGS} />
              <RingLegend metrics={RINGS} />
            </div>
          </Card>

          <Card>
            <CoverageHistogram
              postings={histJobs}
              mySkills={activeResume.skills}
              gap={whatIf}
              poolLabel={pool === '국내' ? '국내' : '글로벌'}
            />
          </Card>

          <SectionHeader title="업종별 적합도 피드백" hint="내 보유 기술 기준 실측" />
          <Card>
            <IndustryFitRadar skills={activeResume.skills} />
          </Card>

          <SectionHeader title="추천 연쇄 기술 로드맵" hint="내 스택 기반 다음 스텝" />
          <Card>
            <TechChainRoadmap skills={activeResume.skills} />
          </Card>

          <SectionHeader title="내 기술 vs 시장 위치" hint="보유 · 수요 분석" />
          <Card>
            <div className="scr-card__hint" style={{ marginTop: 0 }}>파랑=보유 · 주황=미보유 · 크기=공고수</div>
            <OpportunityQuadrant items={quad} onPick={(t) => navigate(`/tech/${encodeURIComponent(t)}`)} />
            <AsOf asOf={market.asOf} note="상위 12개 기술" />
          </Card>
        </>
      )}

      {/* 2. 시장 기술 현황 및 트렌드 (이력서 유무 불문 표시) */}
      <SectionHeader title="시장 인기 기술" hint="기술별 연도 수요 히트 · 탭하면 동시요구 조회" />
      <Card>
        <TechDemandHeatStrip onSelect={setSel} />
      </Card>

      {/* cooc disclosure (인기 기술 탭 시 동작) */}
      {cooc && (
        <DisclosureCard title={`${sel}와(과) 함께 요구되는 기술`} summary={`${sel} 공고 ${cooc.base.toLocaleString()}건 기준`} defaultOpen>
          <div className="scr-cooc">
            {cooc.items.slice(0, 6).map((c) => (
              <div className="scr-cooc__row" key={c.tech}>
                <span className="k">{c.tech}</span>
                <span className="tr"><i style={{ width: `${c.coRate}%` }} /></span>
                <span className="p">{c.coRate}%</span>
              </div>
            ))}
          </div>
          <button className="kit-linkrow" onClick={() => navigate(`/tech/${encodeURIComponent(sel)}`)}>
            {sel} 기술 상세 <ChevronRight size={15} />
          </button>
        </DisclosureCard>
      )}

      {/* 트렌드 6종 — 탭 스테이지(시안 1a): 선택된 하나만 크게, 나머지는 미니 프리뷰 */}
      <SectionHeader title="시장 트렌드" hint="탭으로 전환 · 나머지는 아래 미리보기" />
      <TrendTabStage skills={activeSkills} />

      <button className="scr-linkbtn" onClick={() => navigate('/cert-gap')} style={{ marginTop: 14 }}>
        <Award size={15} style={{ verticalAlign: -3, marginRight: 6 }} />자격증 갭 보기
        <ChevronRight size={15} style={{ verticalAlign: -3, float: 'right' }} />
      </button>
      <div style={{ height: 18 }} />
    </CareerScreen>
  )
}
