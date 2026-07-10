import { radius, spacing, elevation } from '../tokens'

export default function TokensSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>라운드 · 스페이싱 · 엘리베이션</h2>
              <span className="ds-sub">형태와 깊이의 기준</span>
            </div>
            <div className="ds-card">
              <div className="demo-label">Radius</div>
              <div className="tok-row">
                {Object.entries(radius).map(([k, v]) => (
                  <div className="tok" key={k}>
                    <div className="box" style={{ borderRadius: v === 999 ? 28 : v }} />
                    {k} · {v === 999 ? 'pill' : `${v}px`}
                  </div>
                ))}
              </div>
              <div className="demo-label" style={{ marginTop: 24 }}>Spacing</div>
              <div className="tok-row" style={{ alignItems: 'flex-end' }}>
                {spacing.map((s) => (
                  <div className="tok" key={s}>
                    <div className="sp" style={{ width: s }} />
                    {s}
                  </div>
                ))}
              </div>
              <div className="demo-label" style={{ marginTop: 24 }}>Elevation</div>
              <div className="elev-row">
                {Object.entries(elevation).map(([k, v]) => (
                  <div key={k}>
                    <div className="elev-card" style={{ boxShadow: v }}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
    </section>
  )
}
