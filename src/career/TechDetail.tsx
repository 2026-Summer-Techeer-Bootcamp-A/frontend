import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChartColumn } from 'lucide-react'
import { SubScreen, Card, AsOf, HBars, Sparkline } from './charts'
import market from '../data/marketData.json'
import career from '../data/careerData.json'
import { recruitmentApi, type CompanyBySkillDto } from './recruitmentApi'

const RESUME: string[] = career.resume.skills

export default function TechDetail() {
  const { name = '' } = useParams<{ name: string }>()
  const tech = decodeURIComponent(name)
  const owned = RESUME.includes(tech)
  const [companyData, setCompanyData] = useState<CompanyBySkillDto | null>(null)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companyError, setCompanyError] = useState('')

  useEffect(() => {
    let cancelled = false
    setCompanyLoading(true); setCompanyError('')
    recruitmentApi.companiesBySkill(tech, 'domestic')
      .then((result) => { if (!cancelled) setCompanyData(result) })
      .catch((reason) => { if (!cancelled) setCompanyError(reason instanceof Error ? reason.message : '회사 데이터를 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setCompanyLoading(false) })
    return () => { cancelled = true }
  }, [tech])

  const detail = (market.techDetail as never as Record<string, {
    byCareer: { band: string; count: number }[]; spark: { y: string; n: number }[]
  }>)[tech]
  const cooc = (market.cooccurrence as never as Record<string, {
    base: number; items: { tech: string; coRate: number; coCount: number }[]
  }>)[tech]
  const comp = companyData ? {
    splitDate: companyData.split_date,
    present: companyData.present.map((item) => ({ company: item.company, count: item.posting_count })),
    past: companyData.past.map((item) => ({ company: item.company, count: item.posting_count })),
    domesticNote: companyData.domestic_note ?? '',
  } : null

  // 점유율(국내/국외)
  const shareOf = (pool: '국내' | '국외') => {
    const items = (market.skillShare as never as Record<string, { items: { tech: string; share: number; count: number }[] }>)[pool].items
    return items.find((i) => i.tech === tech)
  }
  const dom = shareOf('국내')
  const glob = shareOf('국외')

  const careerBars = detail
    ? (() => {
        const max = Math.max(...detail.byCareer.map((b) => b.count), 1)
        return detail.byCareer.map((b) => ({ label: b.band, value: b.count, pct: Math.round((b.count / max) * 100), owned: false }))
      })()
    : []

  const coocBars = cooc
    ? cooc.items.map((c) => ({ label: c.tech, value: c.coRate, pct: c.coRate, owned: RESUME.includes(c.tech) }))
    : []

  return (
    <SubScreen title={tech} desktopBack>
      {/* 요약 */}
      <Card>
        <div className="scr-card__title">
          <span>{tech}{owned && <span className="scr-owned" style={{ marginLeft: 6 }}>보유</span>}</span>
          {detail && <Sparkline data={detail.spark.map((s) => s.n)} w={90} h={30} />}
        </div>
        <div className="scr-card__hint">시장 요구 점유율</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-accent)', fontVariantNumeric: 'tabular-nums' }}>{dom ? `${dom.share}%` : '—'}</div><div style={{ fontSize: 11, color: 'var(--c-muted)' }}>국내</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{glob ? `${glob.share}%` : '—'}</div><div style={{ fontSize: 11, color: 'var(--c-muted)' }}>글로벌</div></div>
        </div>
        <AsOf asOf={market.asOf} />
      </Card>

      {/* 연차별 요구 */}
      {careerBars.length > 0 && (
        <Card>
          <div className="scr-card__title">연차별 요구 (국내)</div>
          <HBars items={careerBars} unit="건" />
        </Card>
      )}

      {/* 함께 요구되는 기술 */}
      {coocBars.length > 0 && (
        <Card>
          <div className="scr-card__title">함께 요구되는 기술</div>
          <div className="scr-card__hint">{tech} 요구 공고 {cooc.base.toLocaleString()}건 중 동시 등장</div>
          <div className="scr-cooc">
            {coocBars.map((c) => (
              <div className="scr-cooc__row" key={c.label}>
                <span className="k">{c.label}{c.owned && <span className="scr-owned" style={{ marginLeft: 5 }}>보유</span>}</span>
                <span className="tr"><i style={{ width: `${c.pct}%` }} /></span>
                <span className="p">{c.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 과거 vs 현재 기업 */}
      {companyLoading && <Card><div className="scr-card__hint">회사 데이터를 불러오는 중입니다.</div></Card>}
      {companyError && <Card><div className="scr-card__hint" role="alert">{companyError}</div></Card>}
      {comp && (
        <Card>
          <div className="scr-card__title">이 기술을 원한 기업</div>
          <div className="scr-card__hint">{comp.splitDate} 기준 · {comp.domesticNote}</div>
          <div className="scr-twocol">
            <div>
              <div className="scr-colhead">과거</div>
              {comp.past.length ? comp.past.map((c) => (
                <div className="scr-coitem" key={c.company}><span className="n">{c.company}</span><span className="c">{c.count}</span></div>
              )) : <div className="scr-coitem"><span className="n" style={{ color: 'var(--c-muted)' }}>표본 없음</span></div>}
            </div>
            <div>
              <div className="scr-colhead">현재</div>
              {comp.present.length ? comp.present.map((c) => (
                <div className="scr-coitem" key={c.company}><span className="n">{c.company}</span><span className="c">{c.count}</span></div>
              )) : <div className="scr-coitem"><span className="n" style={{ color: 'var(--c-muted)' }}>표본 없음</span></div>}
            </div>
          </div>
        </Card>
      )}

      {!detail && !cooc && !comp && (
        <div className="crd-empty">
          <ChartColumn size={24} />
          <p>이 기술의 상세 집계는 데모 데이터에 포함되지 않았어요. 점유율만 표시해요.</p>
        </div>
      )}
      <div style={{ height: 20 }} />
    </SubScreen>
  )
}
