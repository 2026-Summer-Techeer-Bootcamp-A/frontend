import { useRef, useState } from 'react'

export function ScaleBar({ label, sub, entries }: { label: string; sub: string; entries: [string, string][] }) {
  return (
    <div className="scale">
      <div className="scale__label">
        <span style={{ color: 'var(--ink)' }}>{label}</span>
        <span>{sub}</span>
      </div>
      <div className="scale__bar">
        {entries.map(([k, hex]) => {
          const light = ['50', '100', '200', '300'].includes(k) || hex === '#ffffff'
          return (
            <div key={k} className="scale__step" style={{ background: hex }}>
              <b style={{ color: light ? '#1c1d21' : '#fff' }}>{k}</b>
              <span className="hex" style={{ color: light ? '#1c1d21' : '#fff' }}>{hex}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 동심원 활동 링 3겹 — 커버리지/지원현황/마감임박을 한 데이터 오브젝트로 */
export function ActivityRings() {
  const rings = [
    { r: 50, pct: 73, color: '#0b0b0c' },
    { r: 38, pct: 55, color: '#5a86cf' },
    { r: 26, pct: 40, color: '#a2a6b0' },
  ]
  return (
    <div className="rings">
      <svg viewBox="0 0 120 120" width="116" height="116">
        {rings.map((r) => {
          const c = 2 * Math.PI * r.r
          return (
            <g key={r.r}>
              <circle cx="60" cy="60" r={r.r} fill="none" stroke="#eceef3" strokeWidth="9" />
              <circle
                cx="60" cy="60" r={r.r} fill="none" stroke={r.color} strokeWidth="9"
                strokeLinecap="round" strokeDasharray={`${(c * r.pct) / 100} ${c}`}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Sparkline() {
  return (
    <svg viewBox="0 0 70 24" width="70" height="24">
      <polyline
        points="0,20 10,15 20,18 30,8 40,12 50,4 60,10 70,2"
        fill="none" stroke="#0b0b0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

/** 미니 라인·에어리어 차트 — 액센트 단색, 그라디언트 없음 */
export function LineChart({ series }: { series: { color: string; pts: number[] }[] }) {
  const W = 260, H = 96, P = 6
  const max = Math.max(...series.flatMap((s) => s.pts)) * 1.1 || 1
  const x = (i: number, n: number) => P + (i * (W - P * 2)) / (n - 1)
  const y = (v: number) => H - P - (v / max) * (H - P * 2)
  return (
    <div className="sx-chart">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <g className="grid">
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line key={g} x1={P} x2={W - P} y1={H - P - g * (H - P * 2)} y2={H - P - g * (H - P * 2)} />
          ))}
        </g>
        {series.map((s, si) => {
          const line = s.pts.map((v, i) => `${x(i, s.pts.length)},${y(v)}`).join(' ')
          const area = `${P},${H - P} ${line} ${W - P},${H - P}`
          return (
            <g key={si}>
              {si === 0 && <polygon points={area} fill={s.color} opacity={0.08} />}
              <polyline points={line} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** 도넛 — 액센트 순차 셰이드 세그먼트 */
export function Donut({ segs, mid, sub }: { segs: { v: number; c: string }[]; mid: string; sub: string }) {
  const total = segs.reduce((a, s) => a + s.v, 0)
  let acc = 0
  const stops = segs.map((s) => {
    const from = (acc / total) * 100
    acc += s.v
    const to = (acc / total) * 100
    return `${s.c} ${from}% ${to}%`
  })
  return (
    <div className="sx-donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
      <div className="mid"><b>{mid}</b><span>{sub}</span></div>
    </div>
  )
}

/** 반원 게이지 */
export function Gauge({ pct, label }: { pct: number; label: string }) {
  const r = 66, c = Math.PI * r
  return (
    <div className="sx-gauge">
      <svg viewBox="0 0 160 90" width="100%">
        <path d={`M14 82 A ${r} ${r} 0 0 1 146 82`} fill="none" stroke="#eceef3" strokeWidth={13} strokeLinecap="round" />
        <path
          d={`M14 82 A ${r} ${r} 0 0 1 146 82`} fill="none" stroke="var(--accent)" strokeWidth={13}
          strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`}
        />
      </svg>
      <div className="lbl"><b>{pct}%</b><span>{label}</span></div>
    </div>
  )
}

/** 애플식 슬라이더 — 드래그하는 동안 원형 썸이 가로로 살짝 늘어나고(스트레치),
    세로로 살짝 눌린 뒤 놓으면 스프링으로 원형 복귀. 트랙도 살짝 두꺼워진다. */
export function AppleSlider({ defaultPct = 50, format, wide }: { defaultPct?: number; format?: (p: number) => string; wide?: boolean }) {
  const [pct, setPct] = useState(defaultPct)
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fromX = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))
    setPct(Math.round(p))
  }
  const down = (e: React.PointerEvent) => {
    setDrag(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    fromX(e.clientX)
  }
  const move = (e: React.PointerEvent) => { if (drag) fromX(e.clientX) }
  const up = () => setDrag(false)
  const slider = (
    <div
      className={`ios-slider${drag ? ' dragging' : ''}${wide ? ' ios-slider--wide' : ''}`}
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="track">
        <span className="fill" style={{ width: `${pct}%` }} />
        <span className="thumb" style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
  if (!format) return slider
  return (
    <div className="mx-radius">
      {slider}
      <span className="val">{format(pct)}</span>
    </div>
  )
}

