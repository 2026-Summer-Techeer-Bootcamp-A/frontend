import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Check, MapPin, SlidersHorizontal, ArrowUpRight,
  Home, Heart, User, Bell, X, MoreHorizontal,
  User2, ChevronRight, Inbox, Clock, Info, AlertTriangle, CheckCircle2,
  Shield, CreditCard, Globe, Minus, Plus, Copy, Trash2, ChevronDown, Star,
  UploadCloud, Save, Edit3,
  Navigation, Send, MessageSquare, ThumbsUp, ThumbsDown,
  TrendingUp, Target,
} from 'lucide-react'
import { palette, typography, radius, spacing, elevation, motion } from './tokens'
import KitShowcase from './KitShowcase'
import TossDetails from './TossDetails'
import './design-system.css'

const NAV = [
  { id: 'guide', label: 'Do & Don\'t' },
  { id: 'kit', label: '커리어 위젯 킷 ★' },
  { id: 'toss', label: '기타 디테일 ✨' },
  { id: 'colors', label: '컬러' },
  { id: 'typography', label: '타이포그래피' },
  { id: 'tokens', label: '라운드·스페이싱·엘리베이션' },
  { id: 'motion', label: '애니메이션·모션' },
  { id: 'buttons', label: '버튼' },
  { id: 'inputs', label: '인풋·컨트롤' },
  { id: 'forms', label: '폼 요소' },
  { id: 'chips', label: '칩·배지' },
  { id: 'data', label: '데이터 시각화' },
  { id: 'datadisplay', label: '데이터 표시' },
  { id: 'feedback', label: '피드백·상태' },
  { id: 'nav', label: '내비게이션' },
  { id: 'cards', label: '카드 조합' },
  { id: 'map', label: '지도' },
  { id: 'stats', label: '통계·차트' },
  { id: 'insights', label: '인사이트·AI' },
]

function ScaleBar({ label, sub, entries }: { label: string; sub: string; entries: [string, string][] }) {
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
function ActivityRings() {
  const rings = [
    { r: 50, pct: 73, color: '#2f61b8' },
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

function Sparkline() {
  return (
    <svg viewBox="0 0 70 24" width="70" height="24">
      <polyline
        points="0,20 10,15 20,18 30,8 40,12 50,4 60,10 70,2"
        fill="none" stroke="#2f61b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

/** 미니 라인·에어리어 차트 — 액센트 단색, 그라디언트 없음 */
function LineChart({ series }: { series: { color: string; pts: number[] }[] }) {
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
function Donut({ segs, mid, sub }: { segs: { v: number; c: string }[]; mid: string; sub: string }) {
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
function Gauge({ pct, label }: { pct: number; label: string }) {
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
function AppleSlider({ defaultPct = 50, format, wide }: { defaultPct?: number; format?: (p: number) => string; wide?: boolean }) {
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

export default function DesignSystem() {
  return (
    <div className="ds">
      <div className="ds__shell">
        <aside className="ds__side">
          <div className="ds__brand">
            <span className="dot" /> Career DS
          </div>
          <Link to="/gallery" className="ds__back">← 갤러리로</Link>
          <nav className="ds__nav">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}>{n.label}</a>
            ))}
            <Link to="/design-system/apple" style={{ marginTop: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              Like Apple
            </Link>
            <Link to="/design-system/icons">아이콘 세트</Link>
          </nav>
        </aside>

        <main className="ds__main">
          <div className="ds__hero">
            <span className="ds__eyebrow">Career · Design System</span>
            <h1>디자인 시스템</h1>
            <p>
              액센트는 <b>슬레이트 블루</b>(#2f61b8), 뉴트럴은 이미지 팔레트를 쿨 톤으로 하모나이즈했어요.
              폰트는 Pretendard. 아래 토큰과 컴포넌트가 커리어 앱 전체의 정본이에요.
            </p>
          </div>

          {/* ---------- Do & Don't (서브페이지로 분리) ---------- */}
          <section className="ds-sec" id="guide">
            <Link
              to="/design-system/guide"
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, #1c1d21, #2f4a7c)',
                borderRadius: 20,
                padding: '28px 30px',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, opacity: 0.75, textTransform: 'uppercase' }}>
                51개 항목 · 12개 카테고리
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.6px', margin: '8px 0 6px' }}>
                Do &amp; Don&apos;t 가이드 →
              </h2>
              <p style={{ fontSize: 13.5, opacity: 0.85, lineHeight: 1.6, maxWidth: 640 }}>
                바이브 코딩 AI 도구(v0·Bolt·Lovable)와 AI 디자인 생성기가 뽑아내는 SaaS 룩을 반면교사 삼되,
                장식을 걷어낸다고 깊이·재질까지 지운 부트스트랩식 과교정도 함께 경계해요.
              </p>
            </Link>
          </section>

          {/* ---------- 컬러 ---------- */}
          <section className="ds-sec" id="colors">
            <div className="ds-sec__head">
              <h2>컬러 팔레트</h2>
              <span className="ds-sub">호버하면 hex가 보여요</span>
            </div>
            <div className="ds-card">
              <ScaleBar label="Accent · 슬레이트 블루" sub="주요 액션 · 데이터 강조" entries={Object.entries(palette.accent)} />
              <ScaleBar label="Neutral · 쿨 그레이" sub="배경 · 텍스트 · 보더" entries={Object.entries(palette.neutral)} />
              <div className="scale">
                <div className="scale__label">
                  <span style={{ color: 'var(--ink)' }}>Semantic · 의미색</span>
                  <span>상태 · 피드백</span>
                </div>
                <div className="semantic-row">
                  <div className="semantic-tile" style={{ background: palette.semantic.successBg, color: palette.semantic.success }}>
                    <div className="name">Success</div>
                    <div className="hex">{palette.semantic.success}</div>
                  </div>
                  <div className="semantic-tile" style={{ background: palette.semantic.warningBg, color: palette.semantic.warning }}>
                    <div className="name">Warning</div>
                    <div className="hex">{palette.semantic.warning}</div>
                  </div>
                  <div className="semantic-tile" style={{ background: palette.semantic.dangerBg, color: palette.semantic.danger }}>
                    <div className="name">Danger</div>
                    <div className="hex">{palette.semantic.danger}</div>
                  </div>
                  <div className="semantic-tile" style={{ background: palette.semantic.infoBg, color: palette.semantic.info }}>
                    <div className="name">Info</div>
                    <div className="hex">{palette.semantic.info}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 타이포 ---------- */}
          <section className="ds-sec" id="typography">
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

          {/* ---------- 토큰 ---------- */}
          <section className="ds-sec" id="tokens">
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

          {/* ---------- 애니메이션 · 모션 ---------- */}
          <section className="ds-sec" id="motion">
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

          {/* ---------- 버튼 ---------- */}
          <section className="ds-sec" id="buttons">
            <div className="ds-sec__head">
              <h2>버튼</h2>
              <span className="ds-sub">iOS 5종 스타일 — Filled·Tinted·Gray·Plain·Bordered</span>
            </div>
            <div className="ds-card">
              <div className="demo-label">Variant</div>
              <div className="demo">
                <button className="btn btn--primary">지원하기</button>
                <button className="btn btn--secondary">저장</button>
                <button className="btn btn--gray">건너뛰기</button>
                <button className="btn btn--plain">취소</button>
                <button className="btn btn--ghost">더보기</button>
                <button className="btn btn--ink">Ink</button>
                <button className="btn btn--danger">삭제</button>
                <button className="btn btn--primary" disabled>비활성</button>
              </div>
              <div className="demo-label" style={{ marginTop: 6 }}>Size · Icon</div>
              <div className="demo">
                <button className="btn btn--primary btn--sm">Small</button>
                <button className="btn btn--primary">Medium</button>
                <button className="btn btn--primary btn--lg">Large</button>
                <button className="btn btn--ghost btn--icon"><X size={18} /></button>
                <button className="btn btn--primary btn--icon"><ArrowUpRight size={18} /></button>
              </div>
              <div className="demo">
                <button className="btn btn--secondary">전체보기 <ChevronRight size={15} /></button>
              </div>
            </div>
          </section>

          {/* ---------- 인풋 · 컨트롤 ---------- */}
          <section className="ds-sec" id="inputs">
            <div className="ds-sec__head">
              <h2>인풋 · 컨트롤</h2>
            </div>
            <div className="ds-card">
              <div className="demo-label">인풋 · 필터</div>
              <div className="demo">
                <label className="ds-input"><Search size={17} /><input placeholder="검색어를 입력하세요" /></label>
                <button className="btn btn--ghost"><SlidersHorizontal size={16} /> 필터</button>
              </div>
              <div className="demo-label">세그먼트</div>
              <div className="demo">
                <span className="ds-seg">
                  <button className="on">국내 채용공고</button>
                  <button>해외 채용공고</button>
                </span>
                <span className="ds-seg">
                  <button className="on">최적순</button>
                  <button>최신순</button>
                  <button>마감순</button>
                </span>
              </div>
              <div className="demo-label">체크 · 라디오 · 스위치</div>
              <div className="demo">
                <span className="ds-check"><span className="box"><Check size={13} strokeWidth={3} /></span> 경력직 채용 보지 않기</span>
                <span className="ds-check off"><span className="box" /> 신입 채용 보지 않기</span>
                <span className="ds-check ds-radio"><span className="dot" /> 최적순</span>
                <span className="ds-check ds-radio off"><span className="dot" /> 최신순</span>
                <span className="ds-switch on" />
                <span className="ds-switch" />
              </div>
              <div className="demo-label">스테퍼 · 슬라이더</div>
              <div className="demo">
                <div className="ios-stepper">
                  <button><Minus size={15} /></button>
                  <span className="val">3</span>
                  <button><Plus size={15} /></button>
                </div>
                <AppleSlider defaultPct={62} />
              </div>
            </div>
          </section>

          {/* ---------- 폼 요소 ---------- */}
          <section className="ds-sec" id="forms">
            <div className="ds-sec__head"><h2>폼 요소</h2></div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">텍스트 필드 (기본 · 에러 · 헬퍼)</div>
                <div className="field-group">
                  <label>이메일</label>
                  <input className="ds-input-plain" placeholder="you@example.com" />
                  <span className="helper">가입 시 사용한 이메일이에요</span>
                </div>
                <div className="field-group" style={{ marginTop: 16 }}>
                  <label>비밀번호</label>
                  <input className="ds-input-plain err" placeholder="8자 이상" />
                  <span className="helper error">비밀번호는 8자 이상이어야 해요</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">텍스트에어리어 · 셀렉트</div>
                <div className="field-group">
                  <label>자기소개</label>
                  <textarea placeholder="간단한 소개를 입력하세요" />
                </div>
                <div className="field-group" style={{ marginTop: 16 }}>
                  <label>경력</label>
                  <span className="ds-select"><span>3~5년</span><ChevronDown size={16} /></span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">태그 인풋 · 드롭존</div>
                <div className="ds-tag-input">
                  <span className="token-chip">React <span className="x"><X size={11} /></span></span>
                  <span className="token-chip">TypeScript <span className="x"><X size={11} /></span></span>
                  <span className="type">기술 추가...</span>
                </div>
                <div className="ds-dropzone" style={{ marginTop: 14 }}>
                  <UploadCloud size={22} style={{ margin: '0 auto 8px', display: 'block' }} />
                  이력서 파일을 끌어다 놓으세요
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">체크박스 그룹</div>
                <div className="ds-choice-group">
                  <span className="ds-check"><span className="box"><Check size={13} strokeWidth={3} /></span> 정규직</span>
                  <span className="ds-check off"><span className="box" /> 계약직</span>
                  <span className="ds-check off"><span className="box" /> 인턴</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">라디오 그룹</div>
                <div className="ds-choice-group">
                  <span className="ds-check ds-radio"><span className="dot" /> 최적순</span>
                  <span className="ds-check ds-radio off"><span className="dot" /> 최신순</span>
                  <span className="ds-check ds-radio off"><span className="dot" /> 마감순</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">별점 (인터랙티브)</div>
                <div className="ds-rating">
                  {[1, 2, 3, 4].map((i) => <Star key={i} size={22} fill="#2f61b8" color="#2f61b8" />)}
                  <Star size={22} color="#cdd2db" />
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 칩 · 배지 (재설계) ---------- */}
          <section className="ds-sec" id="chips">
            <div className="ds-sec__head">
              <h2>칩 · 배지</h2>
              <span className="ds-sub">캡슐=인터랙티브 전용(필터·토큰·카운터), 사각=밀집 라벨(스킬·상태)</span>
            </div>
            <div className="ds-grid ds-grid--2">
              <div className="ds-card">
                <div className="demo-label">필터 칩 (캡슐 · 탭 가능)</div>
                <div className="demo">
                  <span className="filter-chip on">전체</span>
                  <span className="filter-chip">국내</span>
                  <span className="filter-chip">해외</span>
                  <span className="filter-chip">신입</span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>토큰 칩 (제거 가능)</div>
                <div className="demo">
                  <span className="token-chip">React <span className="x"><X size={11} /></span></span>
                  <span className="token-chip">서울 <span className="x"><X size={11} /></span></span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>카운터 배지 (원형 · 알림 전용)</div>
                <div className="demo">
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <button className="btn btn--ghost btn--icon"><Bell size={18} /></button>
                    <span className="counter-badge" style={{ position: 'absolute', top: -4, right: -4 }}>3</span>
                  </span>
                  <span className="counter-badge">12</span>
                  <span className="counter-badge neutral">99+</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">스킬 칩 (사각 · 밀집 라벨)</div>
                <div className="demo">
                  <span className="chip chip--held">React</span>
                  <span className="chip chip--held">TypeScript</span>
                  <span className="chip chip--gap">Kubernetes</span>
                  <span className="chip chip--neutral">Full Time</span>
                  <span className="chip chip--outline">Remote</span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>상태 배지 (사각)</div>
                <div className="demo">
                  <span className="badge badge--success">모집중 394</span>
                  <span className="badge badge--warn">곧 마감 69</span>
                  <span className="badge badge--career">경력 4~10년</span>
                  <span className="badge badge--info">신규</span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>계층형 아이콘 배지 (SF Symbols hierarchical)</div>
                <div className="demo">
                  <span className="hier-badge"><Clock size={13} /> ~7/31 마감 D-24</span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 데이터 시각화 ---------- */}
          <section className="ds-sec" id="data">
            <div className="ds-sec__head">
              <h2>데이터 시각화</h2>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">커버리지 링 · 매칭 바</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', minHeight: 'auto' }}>
                  <div className="demo">
                    <div className="ds-ring"><b>73%</b></div>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 7, fontWeight: 600 }}>매칭 50%</div>
                      <div className="ds-bar"><i style={{ width: '50%' }} /></div>
                    </div>
                  </div>
                </div>
                <div className="demo-label">탭</div>
                <div className="demo">
                  <span className="ds-tabs">
                    <span className="on">상세 설명</span>
                    <span>회사</span>
                  </span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">통계 카드</div>
                <div className="demo" style={{ gap: 12 }}>
                  <div className="ds-stat" style={{ flex: 1 }}>
                    <div className="n">394</div>
                    <div className="l">모집중 공고</div>
                    <div className="delta">▲ 12 오늘</div>
                  </div>
                  <div className="ds-stat" style={{ flex: 1 }}>
                    <div className="n">73%</div>
                    <div className="l">커버리지</div>
                  </div>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>진행 스텝</div>
                <div className="demo">
                  <div className="ds-stepper">
                    <span className="seg on" /><span className="seg on" /><span className="seg on" /><span className="seg" />
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">동심원 활동 링</div>
                <div className="ds-demo-stage" style={{ minHeight: 116 }}>
                  <ActivityRings />
                </div>
                <div className="demo-label">스파크라인</div>
                <div className="sparkline-wrap">
                  <div>
                    <div className="num">2,486</div>
                    <div className="lbl">이번 달 신규 지원자</div>
                  </div>
                  <Sparkline />
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 데이터 표시 ---------- */}
          <section className="ds-sec" id="datadisplay">
            <div className="ds-sec__head"><h2>데이터 표시</h2></div>
            <div className="ds-grid ds-grid--2">
              <div className="ds-card">
                <div className="demo-label">테이블 (우측정렬 · tabular-nums)</div>
                <table className="ds-table">
                  <thead><tr><th>회사</th><th>매칭</th><th className="num">급여</th></tr></thead>
                  <tbody>
                    <tr><td>엑스소프트</td><td>50%</td><td className="num">4,000만~1억</td></tr>
                    <tr><td>세이프에이아이</td><td>44%</td><td className="num">3,000만~1억</td></tr>
                    <tr><td>매드업</td><td>20%</td><td className="num">1,000만~5,000만</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="ds-card">
                <div className="demo-label">브레드크럼 · 페이지네이션</div>
                <div className="demo">
                  <span className="ds-breadcrumb">채용공고 <ChevronRight size={14} /> 국내 <ChevronRight size={14} /> <b>엑스소프트</b></span>
                </div>
                <div className="demo" style={{ marginTop: 18 }}>
                  <span className="ds-pagination">
                    <button>‹</button>
                    <button className="on">1</button>
                    <button>2</button>
                    <button>3</button>
                    <button>›</button>
                  </span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">툴팁</div>
                <div className="ds-demo-stage">
                  <span className="ds-tooltip-demo">
                    <button className="btn btn--ghost btn--icon"><Info size={18} /></button>
                    <span className="ds-tooltip">현재 시점 기준 수치예요</span>
                  </span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">아코디언</div>
                <div className="ds-accordion">
                  <div className="head on">지원 자격이 어떻게 되나요? <ChevronDown size={16} /></div>
                  <div className="body">경력 4~10년, React/TypeScript 경험자를 우대해요.</div>
                  <div className="head">복지 혜택은 무엇인가요?</div>
                  <div className="head">면접은 몇 차까지 진행되나요?</div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 피드백 · 상태 ---------- */}
          <section className="ds-sec" id="feedback">
            <div className="ds-sec__head">
              <h2>피드백 · 상태</h2>
              <span className="ds-sub">토스트 · 얼럿 · 배너 · 스켈레톤 · 빈 상태</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">토스트</div>
                <div className="ds-demo-stage">
                  <div className="ds-toast">
                    <span className="ic"><Check size={14} /></span>
                    지원서가 저장됐어요
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">얼럿</div>
                <div className="ds-demo-stage">
                  <div className="app-alert">
                    <div className="app-alert__icon"><AlertTriangle size={18} /></div>
                    <div className="app-alert__title">지원을 취소할까요?</div>
                    <div className="app-alert__msg">저장된 초안은 유지돼요.</div>
                    <div className="app-alert__actions">
                      <button className="btn btn--gray">취소</button>
                      <button className="btn btn--primary">확인</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">인라인 배너</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div className="ios-banner info"><Info size={15} /> 이력서를 등록하면 매칭도가 더 정확해져요.</div>
                  <div className="ios-banner warn"><AlertTriangle size={15} /> 69건이 일주일 내 마감돼요.</div>
                  <div className="ios-banner success"><CheckCircle2 size={15} /> 지원 완료</div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">스켈레톤 로딩</div>
                <div className="ds-demo-stage" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                    <div className="ds-skel" style={{ width: 44, height: 44, borderRadius: 12 }} />
                    <div style={{ flex: 1 }}>
                      <div className="ds-skel" style={{ height: 14, width: '70%', marginBottom: 8 }} />
                      <div className="ds-skel" style={{ height: 12, width: '45%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">빈 상태</div>
                <div className="ds-demo-stage">
                  <div className="ds-empty">
                    <div className="glyph"><Inbox size={24} /></div>
                    <h4>조건에 맞는 공고가 없어요</h4>
                    <p>필터를 조정해보세요</p>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">모달 (얼럿 폼 · 위험 색상으로 구분)</div>
                <div className="ds-demo-stage">
                  <div className="app-alert app-alert--danger">
                    <div className="app-alert__icon"><Trash2 size={18} /></div>
                    <div className="app-alert__title">이력서를 삭제할까요?</div>
                    <div className="app-alert__msg">삭제하면 되돌릴 수 없어요. 저장된 지원 내역도 함께 사라져요.</div>
                    <div className="app-alert__actions">
                      <button className="btn btn--gray">취소</button>
                      <button className="btn btn--danger">삭제</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">토스트 스택</div>
                <div className="ds-demo-stage">
                  <div className="ds-toast-stack">
                    <div className="ds-toast"><span className="ic"><Check size={14} /></span>지원서가 저장됐어요</div>
                    <div className="ds-toast"><span className="ic"><Save size={14} /></span>초안이 자동저장됐어요</div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">프로그레스바 (확정 · 불확정)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', gap: 14 }}>
                  <div className="ds-progress"><i style={{ width: '68%' }} /></div>
                  <div className="ds-progress-indet" />
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 내비게이션 ---------- */}
          <section className="ds-sec" id="nav">
            <div className="ds-sec__head">
              <h2>내비게이션</h2>
              <span className="ds-sub">드롭다운 · 그룹 리스트 · 독바 · 바텀시트 · 하단 탭바</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">컨텍스트 메뉴 (세그먼트 헤더 · 단축키 · Like Apple 흡수)</div>
                <div className="ds-demo-stage">
                  <div className="ds-menu" style={{ width: 236 }}>
                    <div className="ds-menu__seg">
                      <button><Save size={13} /> 저장</button>
                      <button><Edit3 size={13} /> 수정</button>
                      <button className="destructive"><Trash2 size={13} /> 삭제</button>
                    </div>
                    <div className="item"><Copy size={15} /> 복사하기 <span className="kbd">⌘C</span></div>
                    <div className="item disabled"><Edit3 size={15} /> 수정하기</div>
                    <div className="item destructive">
                      <Trash2 size={15} /> 삭제하기<span className="sub">되돌릴 수 없어요</span>
                    </div>
                    <div className="sep" />
                    <div className="section-title">더보기</div>
                    <div className="item"><Bell size={15} /> 알림 켜기 <ChevronRight size={15} className="chev" /></div>
                    <div className="item"><User2 size={15} /> 프로필 <ChevronRight size={15} className="chev" /></div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">그룹 리스트 (동심원 코너 실적용: 16 → 8)</div>
                <div className="ds-demo-stage" style={{ alignItems: 'stretch' }}>
                  <div className="grouped-list">
                    <div className="row">
                      <span className="icon" style={{ background: '#2f61b8' }}><Bell size={15} /></span>
                      <span className="label">알림</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                    <div className="row">
                      <span className="icon" style={{ background: '#5f7a2e' }}><Shield size={15} /></span>
                      <span className="label">개인정보</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                    <div className="row">
                      <span className="icon" style={{ background: '#ac5623' }}><CreditCard size={15} /></span>
                      <span className="label">결제 수단</span>
                      <span className="value">2개</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                    <div className="row">
                      <span className="icon" style={{ background: '#5b5e66' }}><Globe size={15} /></span>
                      <span className="label">언어</span>
                      <span className="value">한국어</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">플로팅 독바</div>
                <div className="ds-demo-stage">
                  <div className="dock-bar">
                    <span className="it on"><Home size={19} /></span>
                    <span className="it"><Search size={19} /></span>
                    <span className="it"><Heart size={19} /></span>
                    <span className="it"><User size={19} /></span>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">바텀시트</div>
                <div className="ds-demo-stage" style={{ alignItems: 'flex-end' }}>
                  <div className="ds-sheet-mini">
                    <div className="grip" />
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>정렬 · 필터</div>
                    <div className="ds-check ds-radio" style={{ marginBottom: 8 }}><span className="dot" /> 최적순</div>
                    <div className="ds-check ds-radio off"><span className="dot" /> 최신순</div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">하단 탭바</div>
                <div className="ds-demo-stage">
                  <div className="ds-bottomnav">
                    <span className="it on"><Home size={19} /></span>
                    <span className="it"><Search size={19} /></span>
                    <span className="it"><Heart size={19} /></span>
                    <span className="it"><User size={19} /></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 카드 조합 ---------- */}
          <section className="ds-sec" id="cards">
            <div className="ds-sec__head">
              <h2>카드 조합</h2>
              <span className="ds-sub">실제 컴포넌트가 모여 이루는 화면 단위</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">아바타 그룹</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', minHeight: 100 }}>
                  <div className="ds-avatar-group">
                    <div className="ds-avatar" style={{ background: 'linear-gradient(135deg,#6d7f95,#455568)' }}>K</div>
                    <div className="ds-avatar" style={{ background: 'linear-gradient(135deg,#c9a58c,#9a745a)' }}>R</div>
                    <div className="ds-avatar" style={{ background: 'linear-gradient(135deg,#8a7461,#5c4a3b)' }}>M</div>
                    <div className="ds-avatar" style={{ background: 'var(--accent-100)', color: 'var(--accent-700)' }}>+5</div>
                  </div>
                  <div className="ds-demo-caption">김·이·박 외 5명이 이 공고에 지원했어요</div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button className="btn btn--ghost btn--icon"><MoreHorizontal size={18} /></button>
                  <button className="btn btn--ghost btn--icon" style={{ marginLeft: 8 }}><X size={18} /></button>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">필터 + 토큰 칩 조합</div>
                <div className="demo" style={{ marginBottom: 14 }}>
                  <span className="filter-chip on">전체</span>
                  <span className="filter-chip">국내</span>
                  <span className="filter-chip">해외</span>
                </div>
                <label className="ds-input" style={{ width: '100%', marginBottom: 10 }}>
                  <Search size={17} /><input placeholder="React, 서울..." />
                </label>
                <div className="demo">
                  <span className="token-chip">React <span className="x"><X size={11} /></span></span>
                  <span className="token-chip">서울 <span className="x"><X size={11} /></span></span>
                </div>
              </div>

              <div className="ds-card">
                <div className="ds-jobcard" style={{ maxWidth: '100%', boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-100)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>엑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>B2B솔루션 WEB/JAVA 개발자</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        엑스소프트 <span className="badge badge--career" style={{ marginLeft: 4 }}>경력 4~10년</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ margin: '12px 0 4px', fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>요구 10개 중 5개 보유</span>
                    <b style={{ color: 'var(--accent)' }}>50% 매칭</b>
                  </div>
                  <div className="ds-bar" style={{ width: '100%' }}><i style={{ width: '50%' }} /></div>
                  <div style={{ marginTop: 10 }}>
                    <span className="chip chip--held">CSS</span>
                    <span className="chip chip--held" style={{ marginLeft: 6 }}>JavaScript</span>
                    <span className="chip chip--gap" style={{ marginLeft: 6 }}>Java</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={14} /> 서울</span>
                    <span className="hier-badge"><Clock size={12} /> ~7/31 D-24</span>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">컴팩트 리스트 로우</div>
                <div className="combo-list-row">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-100)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>세</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>Back-end Engineer</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>세이프에이아이 · 서울</div>
                  </div>
                  <span className="badge badge--success">44%</span>
                </div>
                <div className="combo-list-row">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-100)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>매</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>DevOps Engineer</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>매드업 · 서울</div>
                  </div>
                  <span className="badge badge--career">20%</span>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">회사 프로필 카드</div>
                <div className="combo-company-card">
                  <div className="logo" style={{ background: 'var(--accent-100)', color: 'var(--accent-700)' }}>엑</div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>엑스소프트</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>IT · 컨텐츠 · 2004년 창립</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                    <span className="chip chip--neutral">채용중 3</span>
                    <span className="badge badge--success">모집중</span>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">설정 리스트 (토글 로우)</div>
                <div className="combo-settings-row">
                  <Bell size={17} color="var(--muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>새 공고 알림</span>
                  <span className="ds-switch on" />
                </div>
                <div className="combo-settings-row">
                  <Shield size={17} color="var(--muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>비공개 프로필</span>
                  <span className="ds-switch" />
                </div>
                <div className="combo-settings-row">
                  <Globe size={17} color="var(--muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>해외 공고 포함</span>
                  <span className="ds-switch on" />
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">Hero 위젯 축소판</div>
                <div style={{ background: 'var(--bg)', borderRadius: 18, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ds-ring" style={{ width: 56, height: 56 }}>
                      <b style={{ fontSize: 13 }}>73%</b>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>요구스택 커버리지</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>13/20 기술 보유</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <span className="badge badge--success">모집중 394</span>
                    <span className="badge badge--warn">곧 마감 69</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 지도 (F16 · 국내 전용) ---------- */}
          <section className="ds-sec" id="map">
            <div className="ds-sec__head">
              <h2>지도 <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>국내 전용 · 조연(F16)</span></h2>
              <span className="ds-sub">서울 구 단위 · 클러스터 · 핀↔히트맵 · 응답률(F11) — 좌표는 원티드 직접 + 점핏 지오코딩</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card" style={{ gridColumn: 'span 2' }}>
                <div className="demo-label">지도 + 클러스터 (서울 구 단위)</div>
                <div className="mx-map">
                  <div className="mx-search"><Search size={15} /> 지역·지하철역·회사 검색</div>
                  <div className="mx-controls">
                    <button><Plus size={17} /></button>
                    <button><Minus size={17} /></button>
                  </div>
                  <button className="mx-locate"><Navigation size={17} /></button>
                  <div className="mx-cluster lg" style={{ left: '40%', top: '52%' }}>1,842</div>
                  <div className="mx-namepill" style={{ left: '40%', top: '33%' }}>강남구<b>1,842</b></div>
                  <div className="mx-cluster md" style={{ left: '66%', top: '34%' }}>861</div>
                  <div className="mx-cluster md" style={{ left: '22%', top: '38%' }}>642</div>
                  <div className="mx-cluster sm" style={{ left: '72%', top: '64%' }}>447</div>
                  <div className="mx-cluster sm" style={{ left: '30%', top: '72%' }}>388</div>
                  <div className="mx-me" style={{ left: '52%', top: '58%' }} />
                </div>
                <div className="mx-nlabel" style={{ marginTop: 10 }}><MapPin size={12} /> 국내 풀 · 기준일 2026-07-07 · N=7,104</div>
              </div>

              <div className="ds-card">
                <div className="demo-label">Apple 클러스터 마커</div>
                <div className="ds-demo-stage" style={{ background: '#eef1f6', borderRadius: 14, position: 'relative', minHeight: 150 }}>
                  <div className="mx-cluster lg" style={{ left: '28%', top: '42%' }}>1,842</div>
                  <div className="mx-cluster md" style={{ left: '58%', top: '35%' }}>642</div>
                  <div className="mx-cluster sm" style={{ left: '76%', top: '62%' }}>88</div>
                  <span className="mx-pin accent" style={{ left: '44%', top: '76%' }} />
                  <div className="mx-me" style={{ left: '68%', top: '78%' }} />
                </div>
                <div className="ds-demo-caption">구형 셰이딩·화이트 링·펄스 내위치 점 — 값이 클수록 크고 진하게</div>
              </div>

              <div className="ds-card">
                <div className="demo-label">핀 ↔ 히트맵 토글</div>
                <div className="ds-demo-stage">
                  <div className="ds-seg mx-layers">
                    <button className="on"><MapPin size={13} style={{ marginRight: 4, verticalAlign: -2 }} />핀</button>
                    <button>히트맵</button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">구 단위 히트맵 (posting_count)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                  <div className="mx-choro">
                    {([['강남', 1842, 1], ['구로', 861, 0.55], ['마포', 642, 0.42], ['성동', 588, 0.38], ['영등포', 512, 0.34], ['분당', 447, 0.3], ['종로', 388, 0.26], ['용산', 214, 0.16]] as [string, number, number][]).map(([nm, v, o]) => (
                      <div className="d" key={nm} style={{ background: `rgba(47,97,184,${0.1 + o * 0.8})`, color: o > 0.45 ? '#fff' : '#1c1d21' }}>
                        <span className="nm">{nm}</span>
                        <span className="v">{v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mx-legend">
                    <div className="bar" />
                    <div className="ticks"><span>0</span><span>구별 공고 수</span><span>1,842</span></div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">선택 지역 인포 콜아웃</div>
                <div className="ds-demo-stage">
                  <div className="mx-callout">
                    <h5>강남구</h5>
                    <div className="kv"><span>모집중</span><b>1,842건</b></div>
                    <div className="kv"><span>평균 매칭</span><b>61%</b></div>
                    <div className="kv"><span>평균 응답률</span><b>84%</b></div>
                    <div className="kv"><span>곧 마감</span><b>37건</b></div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">선택 지역 공고 시트</div>
                <div className="ds-demo-stage" style={{ alignItems: 'flex-end' }}>
                  <div className="mx-resultsheet">
                    <div className="grip" />
                    <div className="head"><b>강남구 <span className="n">1,842</span>건</b><span className="badge badge--info">매칭순</span></div>
                    <div className="mx-row"><div className="ax-reco" style={{ padding: 0, border: 'none', gap: 8, flex: 1 }}><span style={{ fontWeight: 700 }}>토스 · 백엔드</span></div><span className="mx-resp hi">응답 91%</span><span className="badge badge--deadline">D-7</span></div>
                    <div className="mx-row"><span style={{ flex: 1, fontWeight: 700 }}>당근 · 서버</span><span className="mx-resp mid">응답 63%</span><span className="badge badge--career">매칭 3/5</span></div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">구별 공고 랭킹</div>
                {([['1', '강남구', 100, '1,842'], ['2', '구로·가산', 47, '861'], ['3', '마포', 35, '642'], ['4', '성동(성수)', 32, '588']] as [string, string, number, string][]).map(([no, name, w, v]) => (
                  <div className="mx-rank" key={no}>
                    <span className="no">{no}</span>
                    <span className="name">{name}</span>
                    <span className="v">{v}</span>
                    <div className="track"><i style={{ width: `${w}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="ds-card">
                <div className="demo-label">내 주변 반경 (드래그해 보세요)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <AppleSlider defaultPct={45} format={(p) => `${(1 + (p / 100) * 19).toFixed(1)}km 이내`} />
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">지원 응답률 배지 (F11 · 원티드)</div>
                <div className="ds-demo-stage" style={{ gap: 8 }}>
                  <span className="mx-resp hi">응답 91%</span>
                  <span className="mx-resp mid">응답 63%</span>
                  <span className="mx-resp lo">응답 데이터 없음</span>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">국내 전용 안내 배너</div>
                <div className="ds-demo-stage">
                  <div className="mx-domestic"><Info size={15} style={{ flex: 'none' }} /> 지도는 <b style={{ margin: '0 3px' }}>국내 풀</b>에서만 활성이에요. 글로벌은 국가 레벨만 제공돼요.</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">기준일·모수(N) 라벨 (정직 표기)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                  <span className="mx-nlabel"><MapPin size={12} /> 기준일 2026-07-07 · N=7,104</span>
                  <span className="mx-nlabel"><Info size={12} /> 용산구 <span className="warn">표본 42건 — 참고용</span></span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 통계·차트 ---------- */}
          <section className="ds-sec" id="stats">
            <div className="ds-sec__head">
              <h2>통계·차트</h2>
              <span className="ds-sub">KPI · 추이 · 랭킹 · 도넛 · 게이지 · 히트맵 · 펀넬 — 값의 크기는 색의 진하기로</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">KPI 스탯 타일</div>
                <div className="sx-kpi">
                  <div className="l">이번 달 신규 공고</div>
                  <div className="n">2,486 <span className="sx-delta up"><TrendingUp size={12} /> 12%</span></div>
                  <div style={{ marginTop: 8 }}><Sparkline /></div>
                  <div className="c">최근 30일 · 2026-07-07 기준</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">추이 라인·에어리어</div>
                <LineChart series={[{ color: '#2f61b8', pts: [12, 18, 15, 24, 22, 31, 28, 37] }]} />
                <div className="sx-legend"><span><i style={{ background: '#2f61b8' }} />주간 신규 공고</span></div>
              </div>

              <div className="ds-card">
                <div className="demo-label">멀티 라인 (내 위치 vs 시장)</div>
                <LineChart series={[
                  { color: '#2f61b8', pts: [40, 44, 43, 52, 58, 61, 66, 73] },
                  { color: '#a2a6b0', pts: [50, 51, 52, 53, 55, 56, 57, 58] },
                ]} />
                <div className="sx-legend">
                  <span><i style={{ background: '#2f61b8' }} />내 커버리지</span>
                  <span><i style={{ background: '#a2a6b0' }} />지원자 평균</span>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">세로 막대 (요일별 공고)</div>
                <div className="sx-bars">
                  {[['월', 62, '#5a86cf'], ['화', 88, '#2f61b8'], ['수', 74, '#2f61b8'], ['목', 95, '#21447c'], ['금', 58, '#5a86cf'], ['토', 22, '#cdd2db'], ['일', 15, '#e2e5ec']].map(([d, h, c]) => (
                    <div className="col" key={d as string}>
                      <span className="val">{h as number}</span>
                      <div className="bar" style={{ height: `${h as number}%`, background: c as string }} />
                      <span className="cap">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">수평 랭킹 바 (기술 수요)</div>
                {[['React', 88, '482', '#21447c'], ['TypeScript', 72, '394', '#2f61b8'], ['Python', 61, '331', '#2f61b8'], ['AWS', 44, '241', '#5a86cf'], ['Go', 28, '152', '#8fb0e2']].map(([k, w, v, c]) => (
                  <div className="sx-hbar" key={k as string}>
                    <span className="k">{k}</span>
                    <div className="track"><i style={{ width: `${w}%`, background: c as string }} /></div>
                    <span className="v">{v}</span>
                  </div>
                ))}
              </div>

              <div className="ds-card">
                <div className="demo-label">도넛 (고용 형태 비중)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column' }}>
                  <Donut segs={[{ v: 58, c: '#21447c' }, { v: 26, c: '#2f61b8' }, { v: 16, c: '#8fb0e2' }]} mid="58%" sub="정규직" />
                  <div className="sx-legend" style={{ justifyContent: 'center' }}>
                    <span><i style={{ background: '#21447c' }} />정규직</span>
                    <span><i style={{ background: '#2f61b8' }} />계약직</span>
                    <span><i style={{ background: '#8fb0e2' }} />인턴</span>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">반원 게이지</div>
                <div className="ds-demo-stage"><Gauge pct={73} label="요구스택 커버리지" /></div>
              </div>

              <div className="ds-card">
                <div className="demo-label">스택 바 (보유 vs 갭)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="sx-stack">
                    <i style={{ width: '65%', background: 'var(--accent)' }}>13 보유</i>
                    <i style={{ width: '35%', background: '#c8382d' }}>7 갭</i>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">비교 바 (내 값 vs 평균)</div>
                <div className="sx-compare">
                  <div className="row me"><span className="k">나</span><div className="track"><i style={{ width: '73%' }} /></div><span className="v">73%</span></div>
                  <div className="row avg"><span className="k">평균</span><div className="track"><i style={{ width: '58%' }} /></div><span className="v">58%</span></div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">히트맵 (요일 × 시간대 지원)</div>
                <div className="sx-heat">
                  {[['오전', [10, 30, 55, 80, 60, 20, 8]], ['오후', [40, 70, 90, 100, 85, 35, 12]], ['저녁', [60, 50, 45, 40, 30, 55, 40]]].map(([lab, vals]) => (
                    <div className="hrow" key={lab as string}>
                      <span className="hlabel">{lab}</span>
                      {(vals as number[]).map((v, i) => (
                        <div className="cell" key={i} style={{ background: `rgba(47,97,184,${0.08 + (v / 100) * 0.82})` }} />
                      ))}
                    </div>
                  ))}
                  <div className="cols">{['월', '화', '수', '목', '금', '토', '일'].map((d) => <span key={d}>{d}</span>)}</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">펀넬 (지원 → 합격)</div>
                <div className="sx-funnel">
                  {[['지원', '1,204', 100, '#21447c'], ['서류 통과', '486', 78, '#2f61b8'], ['면접', '152', 54, '#5a86cf'], ['합격', '38', 32, '#8fb0e2']].map(([s, v, w, c]) => (
                    <div className="step" key={s as string} style={{ width: `${w}%`, background: c as string }}>
                      <span>{s}</span><span className="v">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">기간 세그먼트 + 데이터 테이블</div>
                <div className="ds-seg" style={{ marginBottom: 14 }}>
                  <button>7일</button><button className="on">30일</button><button>전체</button>
                </div>
                <table className="ds-table">
                  <thead><tr><th>기술</th><th className="num">공고</th><th className="num">추이</th></tr></thead>
                  <tbody>
                    <tr><td>React</td><td className="num">482</td><td className="num" style={{ color: '#1c7a4d', fontWeight: 700 }}>+8%</td></tr>
                    <tr><td>TypeScript</td><td className="num">394</td><td className="num" style={{ color: '#1c7a4d', fontWeight: 700 }}>+5%</td></tr>
                    <tr><td>jQuery</td><td className="num">57</td><td className="num" style={{ color: '#b5342a', fontWeight: 700 }}>-12%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ---------- 인사이트·AI ---------- */}
          <section className="ds-sec" id="insights">
            <div className="ds-sec__head">
              <h2>인사이트·AI</h2>
              <span className="ds-sub">챗봇·인사이트·추천 — 보라·핑크·Sparkles 없이 나머지 화면과 한 몸, 근거를 항상 노출</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">어시스턴트 헤더 + 채팅 스레드</div>
                <div className="ax-head" style={{ marginBottom: 14 }}>
                  <div className="ax-avatar"><MessageSquare size={17} /></div>
                  <div><div className="nm">커리어 어시스턴트</div><div className="st">데이터 기반 응답 · 공고 12,480건</div></div>
                </div>
                <div className="ax-thread">
                  <div className="ax-msg me">React 개발자 시장, 지금 어때요?</div>
                  <div className="ax-msg bot">최근 30일 React 공고는 482건으로 8% 늘었어요. 보유 기술 기준 커버리지는 73%예요.</div>
                  <div className="ax-typing"><i /><i /><i /></div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">컴포저 입력 + 전송</div>
                <div className="ds-demo-stage">
                  <div className="ax-composer">
                    <input placeholder="채용 시장에 대해 물어보세요" />
                    <button className="ax-send"><Send size={16} /></button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">추천 프롬프트 칩</div>
                <div className="ds-demo-stage" style={{ alignItems: 'stretch' }}>
                  <div className="ax-suggests">
                    <button className="ax-chip">내 갭 분석해줘</button>
                    <button className="ax-chip">연봉 높은 지역은?</button>
                    <button className="ax-chip">다음에 배울 기술</button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">AI 인사이트 카드 (근거 포함)</div>
                <div className="ax-insight">
                  <span className="badge-ai"><Target size={11} /> 데이터 인사이트</span>
                  <h4>TypeScript를 더하면 매칭 공고가 41% 늘어요</h4>
                  <p>현재 조건에서 요구되지만 미보유한 기술 1순위예요. 서울권 공고 기준 가장 큰 갭이에요.</p>
                  <div className="ax-cite"><Info size={12} /> 근거: 공고 394건 · 2026-07-07 기준</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">요약 (TL;DR)</div>
                <ul className="ax-summary">
                  <li><span className="dot" />React·TS 보유로 상위 <b>27%</b> 커버리지</li>
                  <li><span className="dot" />가장 큰 갭은 <b>클라우드(AWS)</b> 계열</li>
                  <li><span className="dot" />판교·강남에 적합 공고 <b>213건</b> 집중</li>
                </ul>
              </div>

              <div className="ds-card">
                <div className="demo-label">갭 분석 (다음에 배울 것)</div>
                <div className="ax-gap"><span className="no">1</span><span className="k">TypeScript</span><span className="meta">+394건</span></div>
                <div className="ax-gap"><span className="no">2</span><span className="k">AWS</span><span className="meta">+241건</span></div>
                <div className="ax-gap"><span className="no">3</span><span className="k">Docker</span><span className="meta">+188건</span></div>
              </div>

              <div className="ds-card">
                <div className="demo-label">추천 공고 + 이유</div>
                <div className="ax-reco">
                  <div className="logo">토</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">프론트엔드 엔지니어</div>
                    <div className="co">토스 · 강남</div>
                    <div className="why">추천 이유: 보유한 React·TypeScript가 요구 스택의 82%를 커버해요</div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">신뢰도 (허수 % 대신 근거 건수)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                  <div className="ax-confidence">
                    <span className="dots"><i className="on" /><i className="on" /><i className="on" /><i className="on" /><i /></span>
                    근거 <b>342</b>건 기반
                  </div>
                  <div className="ax-confidence">
                    <span className="dots"><i className="on" /><i className="on" /><i /><i /><i /></span>
                    근거 <b>28</b>건 — 참고용
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">후속 질문</div>
                <button className="ax-followup">이 갭을 메우는 로드맵 보여줘 <ChevronRight size={15} className="chev" /></button>
                <button className="ax-followup">TypeScript 공고만 필터링 <ChevronRight size={15} className="chev" /></button>
              </div>

              <div className="ds-card">
                <div className="demo-label">응답 피드백</div>
                <div className="ds-demo-stage">
                  <div className="ax-feedback">
                    이 답변이 도움됐나요?
                    <button className="on"><ThumbsUp size={15} /></button>
                    <button><ThumbsDown size={15} /></button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">AI 배지 · 인용 라인</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                  <span className="badge-ai" style={{ margin: 0 }}><Target size={11} /> AI 추천</span>
                  <div className="ax-cite" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <Info size={12} /> 출처: 채용공고 342건 분석 · SQL 집계
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ds-sec" id="kit">
            <div className="ds-sec__head">
              <h2>커리어 위젯 킷 <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>화면 조립용 신규 컴포넌트</span></h2>
              <p>홈·시장·마이·지도 재설계에 쓰는 위계형 위젯. Apple 톤 + 슬레이트블루, 과장식 없음.</p>
            </div>
            <KitShowcase />
          </section>

          <section className="ds-sec" id="toss">
            <div className="ds-sec__head">
              <h2>기타 디테일 <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>마이크로 인터랙션 10</span></h2>
              <p>블러·비네팅·스크롤 반응 헤더·오도미터 등 세밀한 디테일. 박스를 스크롤하거나 탭·버튼을 눌러보세요.</p>
            </div>
            <TossDetails />
          </section>
        </main>
      </div>
    </div>
  )
}
