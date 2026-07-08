import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search, Settings, Heart, Star, Check, Home, BarChart3, Map as MapIcon, User } from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import { DynamicDock } from '../career/kit'
import '../career/career.css'
import './design-system.css'
import './toss-details.css'

function Demo({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <div className="td-demo">
      <div className="td-demo__lb">{label}{note && <span> · {note}</span>}</div>
      <div className="td-demo__stage">{children}</div>
    </div>
  )
}

/* 1. 스크롤 반응 헤더 — 스크롤 시 아이콘 사라지고 제목·탭이 작아짐 */
function CollapsingHeader() {
  const [st, setSt] = useState(0)
  const p = Math.min(1, st / 66)
  const tabs = ['보유', '관심', '내역']
  const [tab, setTab] = useState(0)
  return (
    <div className="td-box" onScroll={(e) => setSt(e.currentTarget.scrollTop)}>
      <div className="td-chead" style={{ boxShadow: p > 0.5 ? '0 4px 14px -8px rgba(20,30,60,.4)' : 'none' }}>
        <div className="td-chead__row" style={{ opacity: 1 - p, height: `${(1 - p) * 30}px`, marginBottom: `${(1 - p) * 8}px` }}>
          <span>내 포트폴리오</span>
          <span className="td-chead__ics"><Search size={17} /><Bell size={17} /><Settings size={17} /></span>
        </div>
        <div className="td-chead__title" style={{ fontSize: `${26 - 9 * p}px` }}>
          ₩ <span>{(12480000).toLocaleString()}</span>
        </div>
        <div className="td-chead__tabs" style={{ transform: `scale(${1 - 0.16 * p})`, transformOrigin: 'left center', marginTop: `${10 - 4 * p}px` }}>
          {tabs.map((tb, i) => (
            <button key={tb} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{tb}</button>
          ))}
        </div>
      </div>
      <div className="td-chead__body">
        {Array.from({ length: 10 }, (_, i) => (
          <div className="td-listrow" key={i}><span className="td-dot" /> 종목 {i + 1}<b>+{(i * 3 + 2)}%</b></div>
        ))}
      </div>
    </div>
  )
}

/* 2. 프로스티드 블러 바 (backdrop blur) */
function FrostedBar() {
  return (
    <div className="td-box td-frost">
      <div className="td-frost__grad" />
      <div className="td-frost__bar">🔍 프로스티드 헤더 · backdrop-blur</div>
      <div className="td-frost__body">
        {Array.from({ length: 10 }, (_, i) => <div className="td-listrow" key={i}>블러 뒤 콘텐츠 {i + 1}</div>)}
      </div>
    </div>
  )
}

/* 3. 하단 비네팅 페이드 (아래로 갈수록 어두워짐 · 끝에서 사라짐) */
function BottomFade() {
  const [end, setEnd] = useState(false)
  return (
    <div className="td-fadewrap">
      <div className="td-box" onScroll={(e) => {
        const el = e.currentTarget
        setEnd(el.scrollHeight - el.scrollTop - el.clientHeight < 6)
      }}>
        <div style={{ padding: 4 }}>
          {Array.from({ length: 12 }, (_, i) => <div className="td-listrow" key={i}>리스트 항목 {i + 1}</div>)}
        </div>
      </div>
      <div className={`td-fade${end ? ' hide' : ''}`} />
    </div>
  )
}

/* 4. 슬라이딩 세그먼트 (인디케이터 스프링 이동) */
function SlidingSegment() {
  const opts = ['일', '주', '월', '년']
  const [i, setI] = useState(1)
  return (
    <div className="td-seg">
      <div className="td-seg__pill" style={{ width: `calc(${100 / opts.length}% - 6px)`, left: `calc(${(100 / opts.length) * i}% + 3px)` }} />
      {opts.map((o, idx) => (
        <button key={o} className={i === idx ? 'on' : ''} onClick={() => setI(idx)}>{o}</button>
      ))}
    </div>
  )
}

/* 5. 오도미터 (숫자 릴이 넘어가며 이동 중 모션블러) */
function OdReel({ d }: { d: number }) {
  const [blur, setBlur] = useState(false)
  const prev = useRef(d)
  useEffect(() => {
    if (prev.current !== d) {
      setBlur(true)
      prev.current = d
      const t = window.setTimeout(() => setBlur(false), 420)
      return () => window.clearTimeout(t)
    }
  }, [d])
  return (
    <span className={`od-reel${blur ? ' rolling' : ''}`}>
      <span className="od-col" style={{ transform: `translateY(${-d}em)` }}>
        {Array.from({ length: 10 }, (_, i) => <span className="od-cell" key={i}>{i}</span>)}
      </span>
    </span>
  )
}
function RollingNumber() {
  const [v, setV] = useState(73)
  const s = String(v)
  return (
    <div className="td-roll">
      <b className="od">
        {s.split('').map((ch, i) => <OdReel key={s.length - i} d={Number(ch)} />)}
        <span>점</span>
      </b>
      <div className="td-roll__btns">
        <button onClick={() => setV((x) => Math.max(0, x - 12))}>−12</button>
        <button onClick={() => setV((x) => x + 37)}>+37</button>
      </div>
    </div>
  )
}

/* 6. 프레스 스프링 로우 */
function PressSpring() {
  return (
    <div className="td-press-list">
      {['이체하기', '결제내역', '카드관리'].map((l, i) => (
        <button className="td-press" key={l}>
          <span className="td-press__ic">{[<Heart size={16} key="h" />, <Star size={16} key="s" />, <Check size={16} key="c" />][i]}</span>
          {l}
        </button>
      ))}
    </div>
  )
}

/* 7. 스티키 섹션 헤더 (핀 고정 시 그림자) */
function StickyHeaders() {
  return (
    <div className="td-box">
      {['최근', '이번 주', '지난 달'].map((s) => (
        <div key={s}>
          <div className="td-sticky">{s}</div>
          {Array.from({ length: 4 }, (_, i) => <div className="td-listrow" key={i}>{s} · 항목 {i + 1}</div>)}
        </div>
      ))}
    </div>
  )
}

/* 8. 스크롤 진행 인디케이터 */
function ScrollProgress() {
  const [p, setP] = useState(0)
  return (
    <div className="td-progwrap">
      <div className="td-prog"><i style={{ width: `${p}%` }} /></div>
      <div className="td-box" onScroll={(e) => {
        const el = e.currentTarget
        setP((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
      }}>
        {Array.from({ length: 14 }, (_, i) => <div className="td-listrow" key={i}>스크롤 {i + 1}</div>)}
      </div>
    </div>
  )
}

/* 9. 토스트 (아래서 올라와 자동 소멸) */
function ToastDemo() {
  const [show, setShow] = useState(false)
  const tid = useRef<number>(0)
  const fire = () => {
    setShow(true)
    window.clearTimeout(tid.current)
    tid.current = window.setTimeout(() => setShow(false), 2200)
  }
  return (
    <div className="td-toastwrap">
      <button className="td-btn" onClick={fire}>토스트 띄우기</button>
      <div className={`td-toast${show ? ' show' : ''}`}><Check size={15} /> 복사되었어요</div>
    </div>
  )
}

/* 10. 스태거 등장 (순차 페이드인) */
function StaggerReveal() {
  const [k, setK] = useState(0)
  return (
    <div className="td-stagwrap">
      <button className="td-btn" onClick={() => setK((x) => x + 1)}>다시 재생</button>
      <div className="td-stag" key={k}>
        {['자산', '수익률', '배당', '리포트', '알림'].map((s, i) => (
          <div className="td-stag__item" style={{ animationDelay: `${i * 70}ms` }} key={s}>{s}</div>
        ))}
      </div>
    </div>
  )
}

/* 11. 다이나믹 독 — 하단 독이 다이나믹 아일랜드처럼 확장되며 리스트를 보여줌 */
function DynamicDockDemo() {
  const [expanded, setExpanded] = useState(false)
  const companies = [
    { name: '카카오헬스케어', pct: 82 },
    { name: '뤼튼테크놀로지스', pct: 74 },
    { name: '보이저엑스', pct: 61 },
  ]
  return (
    <div className="td-dockwrap">
      <button className="td-btn" onClick={() => setExpanded((v) => !v)}>
        {expanded ? '독 접기' : '지도 클러스터 탭 시뮬레이션'}
      </button>
      <div className="td-dockstage">
        <DynamicDock
          expanded={expanded}
          collapsed={
            <>
              <span className="td-dockicon on"><Home size={20} /></span>
              <span className="td-dockicon"><BarChart3 size={20} /></span>
              <span className="td-dockicon"><MapIcon size={20} /></span>
              <span className="td-dockicon"><User size={20} /></span>
            </>
          }
        >
          <div className="td-dock__hd">강남구 · {companies.length}개 공고</div>
          <div className="td-dock__list">
            {companies.map((c) => (
              <button key={c.name} className="td-dock__row" onClick={() => setExpanded(false)}>
                <span className="nm">{c.name}</span>
                <span className="mt">{c.pct}%</span>
              </button>
            ))}
          </div>
        </DynamicDock>
      </div>
    </div>
  )
}

/* 12. 스크롤 방향 감지 탭바 — 아래로 스크롤하면 숨고, 위로 스크롤하면 다시 나타남 */
function ScrollHideTabbar() {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  return (
    <div
      className="td-box"
      onScroll={(e) => {
        const y = e.currentTarget.scrollTop
        if (y > lastY.current + 4) setHidden(true)
        else if (y < lastY.current - 4) setHidden(false)
        lastY.current = y
      }}
    >
      <div style={{ padding: 4 }}>
        {Array.from({ length: 16 }, (_, i) => <div className="td-listrow" key={i}>스크롤 항목 {i + 1}</div>)}
      </div>
      <div className={`td-hidebar${hidden ? ' hide' : ''}`}>
        <span className="td-dockicon on"><Home size={18} /></span>
        <span className="td-dockicon"><BarChart3 size={18} /></span>
        <span className="td-dockicon"><MapIcon size={18} /></span>
        <span className="td-dockicon"><User size={18} /></span>
      </div>
    </div>
  )
}

/* 13. 셰어드 엘리먼트 모프 전환 — 탭한 로우가 그 자리에서 그대로 확대되며 상세로 이어짐(FLIP) */
function SharedElementMorph() {
  const [open, setOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const row = rowRef.current
    const stage = stageRef.current
    const detail = detailRef.current
    if (!stage || !detail) return
    const stageRect = stage.getBoundingClientRect()
    const fromRect = row ? row.getBoundingClientRect() : stageRect
    const scaleX = fromRect.width / stageRect.width
    const scaleY = fromRect.height / stageRect.height
    const tx = fromRect.left - stageRect.left
    const ty = fromRect.top - stageRect.top
    detail.style.transition = 'none'
    detail.style.transformOrigin = 'top left'
    detail.style.transform = `translate(${tx}px, ${ty}px) scale(${scaleX}, ${scaleY})`
    detail.style.opacity = '0.5'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        detail.style.transition = 'transform .34s cubic-bezier(.22,1,.36,1), opacity .2s ease'
        detail.style.transform = 'translate(0px, 0px) scale(1, 1)'
        detail.style.opacity = '1'
      })
    })
  }, [open])

  return (
    <div className="td-box td-morph" ref={stageRef}>
      {!open && (
        <div className="td-morph__row" ref={rowRef} onClick={() => setOpen(true)}>
          <span className="td-dot" /> 카카오헬스케어 · 탭해서 상세보기
        </div>
      )}
      {open && (
        <div className="td-morph__detail" ref={detailRef}>
          <div className="td-morph__hd">카카오헬스케어</div>
          <p>백엔드 엔지니어 · 매칭 82% · 탭한 자리에서 그대로 확대돼요</p>
          <button className="td-btn" onClick={() => setOpen(false)}>닫기</button>
        </div>
      )}
    </div>
  )
}

/* 14. 러버밴드 오버스크롤 — 끝에서 더 스크롤하면 살짝 저항 후 탄성 복귀 */
function RubberBandOverscroll() {
  const [pull, setPull] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const tid = useRef<number>(0)
  const bounce = (dir: number) => {
    window.clearTimeout(tid.current)
    setPull(dir * 14)
    tid.current = window.setTimeout(() => setPull(0), 160)
  }
  return (
    <div
      className="td-box td-rubber"
      ref={ref}
      onWheel={(e) => {
        const el = ref.current
        if (!el) return
        const atTop = el.scrollTop <= 0
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 1
        if (atTop && e.deltaY < 0) bounce(1)
        else if (atBottom && e.deltaY > 0) bounce(-1)
      }}
    >
      <div style={{ transform: `translateY(${pull}px)`, transition: pull === 0 ? 'transform .22s cubic-bezier(.34,1.4,.64,1)' : 'none' }}>
        {Array.from({ length: 12 }, (_, i) => <div className="td-listrow" key={i}>탄성 리스트 {i + 1}</div>)}
      </div>
    </div>
  )
}

/* 15. FLIP 리스트 재정렬 — 순서가 바뀌어도 순간이동 없이 이웃 항목이 밀려남 */
function FlipListReorder() {
  const [items, setItems] = useState(['자산', '수익률', '배당', '리포트', '알림'])
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const prevRects = useRef<Record<string, DOMRect>>({})

  const shuffle = () => {
    const rects: Record<string, DOMRect> = {}
    items.forEach((it) => {
      const el = refs.current[it]
      if (el) rects[it] = el.getBoundingClientRect()
    })
    prevRects.current = rects
    setItems((arr) => {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    })
  }

  useEffect(() => {
    items.forEach((it) => {
      const el = refs.current[it]
      const prev = prevRects.current[it]
      if (!el || !prev) return
      const next = el.getBoundingClientRect()
      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (dx || dy) {
        el.style.transition = 'none'
        el.style.transform = `translate(${dx}px, ${dy}px)`
        requestAnimationFrame(() => {
          el.style.transition = 'transform .32s cubic-bezier(.22,1,.36,1)'
          el.style.transform = 'translate(0px, 0px)'
        })
      }
    })
  }, [items])

  return (
    <div className="td-flipwrap">
      <button className="td-btn" onClick={shuffle}>순서 섞기</button>
      <div className="td-flip">
        {items.map((it) => (
          <div key={it} ref={(el) => { refs.current[it] = el }} className="td-flip__item">{it}</div>
        ))}
      </div>
    </div>
  )
}

/* 16. 스와이프 액션 — 좌측으로 밀면 삭제 버튼이 드러남 */
function SwipeAction() {
  const [dx, setDx] = useState(0)
  const dragging = useRef(false)
  const start = useRef(0)
  return (
    <div className="td-swiperow">
      <button className="td-swiperow__action" onClick={() => setDx(0)}>삭제</button>
      <div
        className="td-swiperow__front"
        style={{ transform: `translateX(${dx}px)`, transition: dragging.current ? 'none' : 'transform .22s cubic-bezier(.4,0,.2,1)' }}
        onPointerDown={(e) => { dragging.current = true; start.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }}
        onPointerMove={(e) => { if (!dragging.current) return; setDx(Math.min(0, Math.max(-72, e.clientX - start.current))) }}
        onPointerUp={() => { dragging.current = false; setDx((d) => (d < -36 ? -72 : 0)) }}
      >
        저장한 공고 · 좌측으로 드래그해 보세요
      </div>
    </div>
  )
}

/* 17. 당겨서 새로고침 — 당긴 만큼 저항, 문턱 넘으면 새로고침 */
function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const dragging = useRef(false)
  const start = useRef(0)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      className="td-ptr"
      ref={ref}
      onPointerDown={(e) => { if (ref.current && ref.current.scrollTop <= 0 && !refreshing) { dragging.current = true; start.current = e.clientY } }}
      onPointerMove={(e) => { if (!dragging.current) return; setPull(Math.max(0, Math.min(64, e.clientY - start.current))) }}
      onPointerUp={() => {
        if (!dragging.current) return
        dragging.current = false
        setPull((p) => {
          if (p > 44) {
            setRefreshing(true)
            window.setTimeout(() => { setRefreshing(false); setPull(0) }, 900)
            return 44
          }
          return 0
        })
      }}
    >
      <div className="td-ptr__indicator" style={{ height: pull, opacity: Math.min(1, pull / 44) }}>
        {refreshing ? '새로고침 중…' : pull > 44 ? '놓으면 새로고침' : '아래로 당겨보세요'}
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: dragging.current ? 'none' : 'transform .22s ease-out' }}>
        {Array.from({ length: 8 }, (_, i) => <div className="td-listrow" key={i}>피드 {i + 1}</div>)}
      </div>
    </div>
  )
}

/* 18. 증감 색상 플래시 — 오르면 초록, 내리면 빨강으로 잠깐 반짝 */
function NumberFlashDelta() {
  const [v, setV] = useState(128400)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const tid = useRef<number>(0)
  const change = (d: number) => {
    setV((x) => x + d)
    setFlash(d > 0 ? 'up' : 'down')
    window.clearTimeout(tid.current)
    tid.current = window.setTimeout(() => setFlash(null), 320)
  }
  return (
    <div className="td-flashwrap">
      <div className={`td-flashnum${flash ? ` ${flash}` : ''}`}>₩{v.toLocaleString()}</div>
      <div className="td-roll__btns">
        <button onClick={() => change(-2400)}>−2,400</button>
        <button onClick={() => change(5100)}>+5,100</button>
      </div>
    </div>
  )
}

/* 19. 체크마크 드로잉 — 획을 그리듯 완료 표시가 그려짐 */
function CheckmarkDraw() {
  const [k, setK] = useState(0)
  return (
    <div className="td-checkwrap">
      <button className="td-btn" onClick={() => setK((x) => x + 1)}>완료 처리</button>
      <svg key={k} viewBox="0 0 52 52" width="52" height="52">
        <circle cx="26" cy="26" r="24" fill="none" stroke="#218a58" strokeWidth="3" className="td-check__circle" />
        <path d="M14 27 L22 35 L38 18" fill="none" stroke="#218a58" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="td-check__mark" />
      </svg>
    </div>
  )
}

/* 20. 절제된 컨페티 — 아주 작게, 짧게(0.65s)만 */
function ConfettiSubtle() {
  const [burst, setBurst] = useState<{ id: number; dx: number; dy: number; rot: number; color: string }[] | null>(null)
  const fire = () => {
    const colors = ['#2f61b8', '#5a86cf', '#a2a6b0', '#218a58']
    setBurst(Array.from({ length: 10 }, (_, i) => ({
      id: i,
      dx: (Math.random() - 0.5) * 90,
      dy: -40 - Math.random() * 40,
      rot: (Math.random() - 0.5) * 180,
      color: colors[i % colors.length],
    })))
    window.setTimeout(() => setBurst(null), 700)
  }
  return (
    <div className="td-confettiwrap">
      <button className="td-btn" onClick={fire}>목표 달성 시뮬레이션</button>
      <div className="td-confetti__stage">
        {burst && burst.map((b) => (
          <span
            key={b.id}
            className="td-confetti__bit"
            style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, '--rot': `${b.rot}deg`, background: b.color } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

type TossItem = { id: string; category: string; label: string; note?: string; Comp: () => JSX.Element }

const CATEGORIES = ['스크롤·내비게이션', '리스트·카드', '숫자·데이터', '완료·피드백'] as const

const TOSS_ITEMS: TossItem[] = [
  { id: 'scroll-header', category: '스크롤·내비게이션', label: '스크롤 반응 헤더', note: '스크롤하면 아이콘 사라지고 금액·탭이 작아짐', Comp: CollapsingHeader },
  { id: 'frosted-bar', category: '스크롤·내비게이션', label: '프로스티드 블러 바', note: 'backdrop-filter blur', Comp: FrostedBar },
  { id: 'bottom-fade', category: '스크롤·내비게이션', label: '하단 비네팅 페이드', note: '아래로 갈수록 어두워짐 · 끝에서 사라짐', Comp: BottomFade },
  { id: 'sticky-header', category: '스크롤·내비게이션', label: '스티키 섹션 헤더', note: '핀 고정 시 그림자', Comp: StickyHeaders },
  { id: 'scroll-progress', category: '스크롤·내비게이션', label: '스크롤 진행 인디케이터', note: '상단 얇은 바', Comp: ScrollProgress },
  { id: 'hide-tabbar', category: '스크롤·내비게이션', label: '스크롤 방향 감지 탭바', note: '아래로 스크롤=숨김 · 위로=노출', Comp: ScrollHideTabbar },
  { id: 'shared-morph', category: '스크롤·내비게이션', label: '셰어드 엘리먼트 모프 전환', note: '탭한 자리에서 그대로 확대(FLIP)', Comp: SharedElementMorph },
  { id: 'rubber-band', category: '스크롤·내비게이션', label: '러버밴드 오버스크롤', note: '끝에서 당기면 살짝 저항 후 복귀', Comp: RubberBandOverscroll },

  { id: 'sliding-segment', category: '리스트·카드', label: '슬라이딩 세그먼트', note: '인디케이터 스프링 이동', Comp: SlidingSegment },
  { id: 'press-spring', category: '리스트·카드', label: '프레스 스프링 로우', note: '누르면 살짝 눌리는 스프링', Comp: PressSpring },
  { id: 'dynamic-dock', category: '리스트·카드', label: '다이나믹 독', note: '독이 다이나믹 아일랜드처럼 확장되며 리스트 표시', Comp: DynamicDockDemo },
  { id: 'flip-reorder', category: '리스트·카드', label: 'FLIP 리스트 재정렬', note: '순서가 바뀌어도 순간이동 없이 밀림', Comp: FlipListReorder },
  { id: 'swipe-action', category: '리스트·카드', label: '스와이프 액션', note: '좌측으로 밀면 삭제 버튼 노출', Comp: SwipeAction },
  { id: 'pull-refresh', category: '리스트·카드', label: '당겨서 새로고침', note: '당긴 만큼 저항, 문턱 넘으면 새로고침', Comp: PullToRefresh },

  { id: 'odometer', category: '숫자·데이터', label: '오도미터 넘버', note: '숫자 릴이 넘어가며 이동 중 모션블러', Comp: RollingNumber },
  { id: 'number-flash', category: '숫자·데이터', label: '증감 색상 플래시', note: '오르면 초록, 내리면 빨강으로 잠깐 반짝', Comp: NumberFlashDelta },

  { id: 'toast', category: '완료·피드백', label: '토스트', note: '아래서 올라와 자동 소멸', Comp: ToastDemo },
  { id: 'stagger', category: '완료·피드백', label: '스태거 등장', note: '순차 페이드인', Comp: StaggerReveal },
  { id: 'checkmark-draw', category: '완료·피드백', label: '체크마크 드로잉', note: '획을 그리듯 완료 표시', Comp: CheckmarkDraw },
  { id: 'confetti', category: '완료·피드백', label: '절제된 컨페티', note: '아주 작게, 0.65초만', Comp: ConfettiSubtle },
]

export default function TossDetails() {
  const [active, setActive] = useState<string>('전체')
  const list = useMemo(
    () => (active === '전체' ? TOSS_ITEMS : TOSS_ITEMS.filter((i) => i.category === active)),
    [active],
  )

  return (
    <div className="ds">
      <div className="ds__shell">
        <aside className="ds__side">
          <div className="ds__brand">
            <span className="dot" /> Career DS
          </div>
          <Link to="/design-system" className="ds__back">← 디자인 시스템으로</Link>
          <nav className="ds__nav">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActive('전체') }}
              style={active === '전체' ? { background: 'var(--accent-50)', color: 'var(--accent-700)' } : undefined}
            >
              전체 ({TOSS_ITEMS.length})
            </a>
            {CATEGORIES.map((c) => (
              <a
                key={c}
                href="#"
                onClick={(e) => { e.preventDefault(); setActive(c) }}
                style={active === c ? { background: 'var(--accent-50)', color: 'var(--accent-700)' } : undefined}
              >
                {c} ({TOSS_ITEMS.filter((i) => i.category === c).length})
              </a>
            ))}
          </nav>
        </aside>

        <main className="ds__main">
          <div className="ds__hero guide__head">
            <span className="ds__eyebrow">Career · Design System</span>
            <h1>기타 디테일</h1>
            <p>
              토스·뱅크샐러드류 폴리시드 앱에서 반복적으로 관찰되는 미세 인터랙션 모음이에요.
              장식이 아니라 <b>상태 전달</b>을 위한 모션만 남겼고, 과한 것(컨페티 등)은 절제된 버전으로만 넣었어요.
            </p>
            <div className="guide__count" style={{ marginTop: 10 }}>
              총 {TOSS_ITEMS.length}개 항목 · {CATEGORIES.length}개 카테고리
            </div>
          </div>

          <div className="guide__filters">
            <button className={active === '전체' ? 'on' : ''} onClick={() => setActive('전체')}>
              전체 {TOSS_ITEMS.length}
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} className={active === c ? 'on' : ''} onClick={() => setActive(c)}>
                {c} {TOSS_ITEMS.filter((i) => i.category === c).length}
              </button>
            ))}
          </div>

          <div className="td-scope" style={themeVars(THEME)}>
            {list.map((item) => (
              <Demo key={item.id} label={item.label} note={item.note}>
                <item.Comp />
              </Demo>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
