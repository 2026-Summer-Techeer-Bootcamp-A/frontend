import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import CareerTabBar, { type CareerTab } from './CareerTabBar'
import { PageTransition, SegmentedControl } from './kit'
import { THEME, themeVars } from './themes'
import { useIsDesktop } from '../shared/useMediaQuery'
import DesktopShell from '../desktop/DesktopShell'
import './career.css'
import './screens.css'

/* ============ 공용 셸 ============ */

/** 탭 화면 셸: PhoneFrame + .career + 하단 탭바. */
export function CareerScreen({ active, children }: { active: CareerTab; children: ReactNode }) {
  const t = THEME
  const loc = useLocation()
  return (
    <div className="stage stage--app">
      <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
        <div className="career" style={themeVars(t)}>
          <PageTransition type="tab" keyId={loc.pathname}>{children}</PageTransition>
          <CareerTabBar active={active} />
        </div>
      </PhoneFrame>
    </div>
  )
}

/** 하위(푸시) 화면 셸: 뒤로가기 헤더 + 스크롤 바디. */
export function SubScreen({ title, children }: { title: string; children: ReactNode }) {
  const t = THEME
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  if (isDesktop) {
    return (
      <DesktopShell>
        <div className="dsub">
          <button className="dsub__back" onClick={() => navigate(-1)}>
            <ChevronLeft size={17} /> 뒤로
          </button>
          <h1 className="dsub__title">{title}</h1>
          <div className="dsub__content">{children}</div>
        </div>
      </DesktopShell>
    )
  }
  return (
    <div className="stage stage--app">
      <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="dark">
        <div className="crd" style={themeVars(t)}>
          <div className="crd__head">
            <span className="crd__back" onClick={() => navigate(-1)}>
              <ChevronLeft size={24} />
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, margin: '0 auto' }}>{title}</span>
            <span style={{ width: 24 }} />
          </div>
          <PageTransition type="push">{children}</PageTransition>
        </div>
      </PhoneFrame>
    </div>
  )
}

/* ============ 공통 파츠 ============ */

export function ScreenHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="scr-head">
      <h1 className="scr-title">{title}</h1>
      {sub && <div className="scr-sub">{sub}</div>}
    </div>
  )
}

export function PoolToggle({ pool, onChange }: { pool: string; onChange: (p: '국내' | '국외') => void }) {
  return (
    <SegmentedControl
      value={pool}
      onChange={(v) => onChange(v as '국내' | '국외')}
      options={[{ key: '국내', label: '국내' }, { key: '국외', label: '글로벌' }]}
    />
  )
}

export function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="cr-seg">
      {options.map((o) => (
        <button key={o.key} className={value === o.key ? 'on' : ''} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 기준일 + 모수(N) 정직 표기 캡션. */
export function AsOf({ asOf, n, note }: { asOf: string; n?: number; note?: string }) {
  return (
    <div className="scr-asof">
      기준일 {asOf}
      {n != null && <> · N = {n.toLocaleString()}</>}
      {note && <> · {note}</>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`scr-card ${className}`}>{children}</div>
}

/* ============ 차트 프리미티브 ============ */

/** 반원 게이지 (커버리지 점수). */
export function Gauge({ pct, label }: { pct: number; label?: string }) {
  const r = 52
  const cx = 60
  const cy = 60
  const a = Math.PI * (1 - pct / 100)
  const x = cx + r * Math.cos(a)
  const y = cy - r * Math.sin(a)
  return (
    <svg viewBox="0 0 120 72" className="scr-gauge" role="img" aria-label={`${pct}%`}>
      <path d={`M8 60 A52 52 0 0 1 112 60`} fill="none" stroke="#e9edf4" strokeWidth="12" strokeLinecap="round" />
      <path
        d={`M8 60 A52 52 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
        fill="none" stroke="var(--c-accent)" strokeWidth="12" strokeLinecap="round"
      />
      <text x="60" y="52" textAnchor="middle" className="scr-gauge__val">{pct}%</text>
      {label && <text x="60" y="68" textAnchor="middle" className="scr-gauge__lbl">{label}</text>}
    </svg>
  )
}

/** 도넛 링 (conic-gradient). */
export function Donut({ pct, size = 84, children }: { pct: number; size?: number; children?: ReactNode }) {
  return (
    <div
      className="scr-donut"
      style={{ width: size, height: size, background: `conic-gradient(var(--c-accent) 0 ${pct}%, #e9edf4 ${pct}% 100%)` }}
    >
      <div className="scr-donut__hole">{children ?? <b>{pct}%</b>}</div>
    </div>
  )
}

export type BarItem = { label: string; value: number; pct: number; owned?: boolean; sub?: string }

/** 가로 막대 리스트. owned = accent, 아니면 뉴트럴. */
export function HBars({ items, onClick, unit = '' }: { items: BarItem[]; onClick?: (i: number) => void; unit?: string }) {
  return (
    <div className="scr-bars">
      {items.map((it, i) => (
        <div className={`scr-bar${onClick ? ' clickable' : ''}`} key={it.label} onClick={() => onClick?.(i)}>
          <div className="scr-bar__k">
            {it.label}
            {it.owned && <span className="scr-owned">보유</span>}
          </div>
          <div className="scr-bar__tr">
            <i style={{ width: `${it.pct}%`, background: it.owned ? 'var(--c-accent)' : '#c9d0dc' }} />
          </div>
          <div className="scr-bar__v">{it.value.toLocaleString()}{unit}</div>
        </div>
      ))}
    </div>
  )
}

/** 미니 스파크라인. */
export function Sparkline({ data, w = 88, h = 30 }: { data: number[]; w?: number; h?: number }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * (w - 4) + 2
    const y = h - 3 - ((v - min) / (max - min || 1)) * (h - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} className="scr-spark">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 멀티라인 추이 (연도 x, 소스별). */
export function TrendLines({
  series, keys, colors, labels,
}: {
  series: Record<string, number>[]
  keys: string[]
  colors: Record<string, string>
  labels: Record<string, string>
}) {
  const w = 300
  const h = 150
  const pad = { l: 8, r: 8, t: 12, b: 22 }
  const xs = series.map((_, i) => pad.l + (i / (series.length - 1 || 1)) * (w - pad.l - pad.r))
  const allVals = series.flatMap((s) => keys.map((k) => s[k] || 0))
  const max = Math.max(...allVals, 1)
  const yOf = (v: number) => h - pad.b - (v / max) * (h - pad.t - pad.b)
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="scr-trend">
        {keys.map((k) => (
          <polyline
            key={k}
            points={series.map((s, i) => `${xs[i].toFixed(1)},${yOf(s[k] || 0).toFixed(1)}`).join(' ')}
            fill="none" stroke={colors[k]} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          />
        ))}
        {series.map((s, i) => (
          <text key={i} x={xs[i]} y={h - 6} textAnchor="middle" className="scr-trend__x">
            {String(s.period).slice(2)}
          </text>
        ))}
      </svg>
      <div className="scr-legend">
        {keys.map((k) => (
          <span key={k}><i style={{ background: colors[k] }} />{labels[k]}</span>
        ))}
      </div>
    </div>
  )
}

/** 산업 × 기술 히트맵 (값 = 진하기). */
export function Heatmap({
  rows, cols, matrix,
}: { rows: string[]; cols: string[]; matrix: number[][] }) {
  const max = Math.max(...matrix.flat(), 1)
  return (
    <div className="scr-heat" style={{ gridTemplateColumns: `72px repeat(${cols.length}, 1fr)` }}>
      <div className="scr-heat__corner" />
      {cols.map((c) => <div key={c} className="scr-heat__col">{c}</div>)}
      {rows.map((r, ri) => (
        <div className="scr-heat__row" key={r} style={{ display: 'contents' }}>
          <div className="scr-heat__rlbl">{r}</div>
          {cols.map((c, ci) => {
            const v = matrix[ri][ci]
            return (
              <div key={c} className="scr-heat__cell" style={{ background: `rgba(47,97,184,${(v / max).toFixed(2)})` }}>
                <span style={{ color: v / max > 0.5 ? '#fff' : 'var(--c-muted)' }}>{v}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
