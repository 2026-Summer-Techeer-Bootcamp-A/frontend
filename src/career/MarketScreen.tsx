import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, ChevronRight } from 'lucide-react'
import { CareerScreen, ScreenHead, PoolToggle, AsOf, Card, HBars, TrendLines, Heatmap } from './charts'
import { SectionHeader, DisclosureCard, OpportunityQuadrant, PulseCard, type QuadItem, type PulseItem } from './kit'
import market from '../data/marketData.json'
import career from '../data/careerData.json'

type Pool = '국내' | '국외'
const RESUME: string[] = career.resume.skills
const TOP = career.topTechs
const COOC = market.cooccurrence as never as Record<string, { base: number; items: { tech: string; coRate: number }[] }>

export default function MarketScreen() {
  const navigate = useNavigate()
  const [pool, setPool] = useState<Pool>('국내')
  const [sel, setSel] = useState('Python')

  const share = (market.skillShare as never as Record<Pool, {
    asOf: string; N: number; techFiltered: boolean
    items: { tech: string; count: number; share: number; owned: boolean }[]
  }>)[pool]
  const maxShare = share.items[0]?.share || 1
  const bars = share.items.slice(0, 12).map((it) => ({
    label: it.tech, value: it.count, pct: Math.round((it.share / maxShare) * 100), owned: it.owned,
  }))

  const quad: QuadItem[] = TOP.slice(0, 12).map((t) => ({
    tech: t.tech, demand: t.count, owned: RESUME.includes(t.tech), count: t.count,
  }))
  const cooc = COOC[sel]
  const trend = market.trend as unknown as { asOf: string; series: Record<string, number>[] }
  const ind = market.industry as {
    asOf: string; N: number; note: string; industries: string[]; techs: string[]; matrix: number[][]
  }

  const pulse = (market.pulse as { items: PulseItem[] }).items

  return (
    <CareerScreen active="market">
      <ScreenHead title="시장" sub="채용공고 124,237건 기준" />
      <div className="scr-toolbar"><PoolToggle pool={pool} onChange={setPool} /></div>

      {/* 개요 — 시장 펄스 */}
      <PulseCard items={pulse} />

      {/* 내 기술 vs 시장 — 사분면 */}
      <SectionHeader title="내 기술 vs 시장" hint="보유 · 수요" />
      <Card>
        <div className="scr-card__hint" style={{ marginTop: 0 }}>파랑=보유 · 주황=미보유 · 크기=공고수</div>
        <OpportunityQuadrant items={quad} onPick={(t) => navigate(`/tech/${encodeURIComponent(t)}`)} />
        <AsOf asOf={market.asOf} note="상위 12개 기술" />
      </Card>

      {/* 시장 수요 — 점유율 허브 */}
      <SectionHeader title="시장 수요" hint="탭하면 상세" />
      <Card>
        <div className="scr-card__hint" style={{ marginTop: 0 }}>{pool} 공고 요구 비율 · ■보유</div>
        <HBars items={bars} onClick={(i) => setSel(bars[i].label)} />
        <AsOf asOf={share.asOf} n={share.N} note={share.techFiltered ? '기술 직군' : '기술보드'} />
      </Card>

      {/* 드릴다운 — progressive disclosure */}
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

      <DisclosureCard title="연도별 채용 추이" summary="2019~2026 · himalayas 제외">
        <TrendLines
          series={trend.series}
          keys={['hn', 'wanted', 'jumpit']}
          colors={{ hn: '#2f61b8', wanted: '#218a58', jumpit: '#b8892b' }}
          labels={{ hn: 'HN(글로벌)', wanted: '원티드', jumpit: '점핏' }}
        />
        <AsOf asOf={trend.asOf} note="hn·국내만" />
      </DisclosureCard>

      <DisclosureCard title="산업별 요구 스택" summary={ind.note}>
        <Heatmap rows={ind.industries} cols={ind.techs.slice(0, 6)} matrix={ind.matrix.map((r) => r.slice(0, 6))} />
        <AsOf asOf={ind.asOf} n={ind.N} />
      </DisclosureCard>

      <button className="scr-linkbtn" onClick={() => navigate('/cert-gap')} style={{ marginTop: 14 }}>
        <Award size={15} style={{ verticalAlign: -3, marginRight: 6 }} />자격증 갭 보기
        <ChevronRight size={15} style={{ verticalAlign: -3, float: 'right' }} />
      </button>
      <div style={{ height: 18 }} />
    </CareerScreen>
  )
}
