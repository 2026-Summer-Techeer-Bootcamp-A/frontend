import { motion } from '../tokens'

export default function MotionSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>애니메이션 · 모션</h2>
              <span className="ds-sub">Apple HIG 준용 — 물리적으로 그럴듯한 감속, 장식적 바운스 금지</span>
            </div>
            <div className="ds-card">
              <div className="demo-label">Easing</div>
              {Object.entries(motion.easing).map(([k, v]) => (
                <div className="motion-row" key={k}>
                  <span className="name">{k}</span>
                  <div className="motion-track">
                    <span className="motion-dot" style={{ animationTimingFunction: v }} />
                  </div>
                  <span className="spec">{v}</span>
                </div>
              ))}
              <div className="demo-label" style={{ marginTop: 24 }}>Duration</div>
              <div className="demo">
                {Object.entries(motion.duration).map(([k, v]) => (
                  <span key={k} className="badge badge--info">{k} · {v}ms</span>
                ))}
              </div>
              <div className="demo-label" style={{ marginTop: 24 }}>규칙</div>
              <ul className="motion-rules">
                {motion.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
    </section>
  )
}
