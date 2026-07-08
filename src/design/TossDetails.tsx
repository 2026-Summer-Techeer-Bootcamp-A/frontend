import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bell, Search, Settings, Heart, Star, Check, Home, BarChart3, Map as MapIcon, User } from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import { DynamicDock } from '../career/kit'
import '../career/career.css'
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

export default function TossDetails() {
  return (
    <div className="career td-scope" style={{ ...themeVars(THEME), padding: 0 }}>
      <Demo label="1. 스크롤 반응 헤더" note="스크롤하면 아이콘 사라지고 금액·탭이 작아짐">
        <CollapsingHeader />
      </Demo>
      <Demo label="2. 프로스티드 블러 바" note="backdrop-filter blur">
        <FrostedBar />
      </Demo>
      <Demo label="3. 하단 비네팅 페이드" note="아래로 갈수록 어두워짐 · 끝에서 사라짐">
        <BottomFade />
      </Demo>
      <Demo label="4. 슬라이딩 세그먼트" note="인디케이터 스프링 이동">
        <SlidingSegment />
      </Demo>
      <Demo label="5. 오도미터 넘버" note="숫자 릴이 넘어가며 이동 중 모션블러">
        <RollingNumber />
      </Demo>
      <Demo label="6. 프레스 스프링 로우" note="누르면 살짝 눌리는 스프링">
        <PressSpring />
      </Demo>
      <Demo label="7. 스티키 섹션 헤더" note="핀 고정 시 그림자">
        <StickyHeaders />
      </Demo>
      <Demo label="8. 스크롤 진행 인디케이터" note="상단 얇은 바">
        <ScrollProgress />
      </Demo>
      <Demo label="9. 토스트" note="아래서 올라와 자동 소멸">
        <ToastDemo />
      </Demo>
      <Demo label="10. 스태거 등장" note="순차 페이드인">
        <StaggerReveal />
      </Demo>
      <Demo label="11. 다이나믹 독" note="독이 다이나믹 아일랜드처럼 확장되며 리스트 표시">
        <DynamicDockDemo />
      </Demo>
    </div>
  )
}
