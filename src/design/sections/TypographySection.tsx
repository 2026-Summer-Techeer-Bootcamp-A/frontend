import { typography } from '../tokens'

export default function TypographySection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>타이포그래피</h2>
              <span className="ds-sub">Pretendard · 8단계 스케일 · 5단계 두께</span>
            </div>
            <div className="ds-grid ds-grid--2">
              <div className="ds-card">
                {typography.scale.map((t) => (
                  <div className="type-row" key={t.name}>
                    <span style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: t.ls, lineHeight: t.lh }}>
                      {t.name}
                    </span>
                    <span className="spec">{t.size}/{t.weight}/{t.ls}</span>
                  </div>
                ))}
              </div>
              <div className="ds-card">
                <div className="demo-label" style={{ marginBottom: 14 }}>두께 (Weight)</div>
                <div className="weight-row">
                  {typography.weights.map((w) => (
                    <div key={w.w}>
                      <span style={{ fontSize: 26, fontWeight: w.w, color: 'var(--ink)' }}>Aa 가나다</span>
                      <span>{w.name} · {w.w}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 8 }}>실사용 예시</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.8px' }}>73% 요구스택 커버리지</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>상위 20개 중 13개 기술 보유 · 현재 시점</div>
                </div>
              </div>
            </div>
    </section>
  )
}
