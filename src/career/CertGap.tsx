import { SubScreen, Card, AsOf, HBars } from './charts'
import market from '../data/marketData.json'

type Cert = { name: string; count: number; share: number; owned: boolean }

export default function CertGap() {
  const cg = market.certGap as { asOf: string; N: number; required: Cert[]; ownedCerts: string[]; ownedCount: number }
  const bars = cg.required.map((c) => ({ label: c.name, value: c.count, pct: c.share, owned: c.owned, sub: '' }))

  return (
    <SubScreen title="자격증 갭">
      {/* 내 보유 */}
      <Card>
        <div className="scr-card__title">내 보유 자격증 <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 500 }}>{cg.ownedCount}개</span></div>
        <div className="scr-skillbox">
          {cg.ownedCerts.length
            ? cg.ownedCerts.map((c) => <span key={c} className="cr-chip held">{c}</span>)
            : <span style={{ fontSize: 13, color: 'var(--c-muted)' }}>등록된 자격증이 없어요</span>}
        </div>
      </Card>

      {/* 시장 요구 랭킹 */}
      <Card>
        <div className="scr-card__title">시장 요구 자격증</div>
        <div className="scr-card__hint">채용공고에서 요구된 자격증 순위 · ■보유</div>
        <HBars items={bars} unit="건" />
        <AsOf asOf={cg.asOf} n={cg.N} note="자격증 언급 공고 기준 · 저표본 직무는 제외" />
      </Card>
      <div style={{ height: 20 }} />
    </SubScreen>
  )
}
