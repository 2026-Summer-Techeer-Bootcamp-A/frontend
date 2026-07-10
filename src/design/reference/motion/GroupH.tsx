import { useRef, useState } from 'react'
import { RefreshCw, Check, Minus, Plus, Play } from 'lucide-react'
import { DemoCard, Seg, useReplay } from './_kit'
import './GroupH.css'

/* ===== H. 컨트롤 & 피드백 — 카탈로그 #40~#46 ===== */

/* #40 스크롤 엣지 디졸브 */
function ScrollEdge() {
  return (
    <DemoCard title="스크롤 엣지 디졸브" desc="플로팅 유리바 아래로 지나가는 콘텐츠가 blur+fade로 배경에 녹아, 위 타이틀 가독성을 지켜요." tier={2}>
      <div className="am-stage am-stage--light h-edge-stage">
        <div className="h-edge__bar">오늘의 공고</div>
        <div className="h-edge__mask" />
        <div className="h-edge__scroll">
          {Array.from({ length: 12 }, (_, i) => <div key={i} className="h-edge__row">공고 #{i + 1}</div>)}
        </div>
      </div>
    </DemoCard>
  )
}

/* #41 토글 스프링 */
function Toggle() {
  const [on, setOn] = useState(true)
  return (
    <DemoCard title="토글 스프링" desc="썸이 스프링으로 미끄러지며 살짝 오버슈트, 트랙 색이 크로스페이드돼요." tier={1}>
      <div className="am-stage am-stage--light h-center">
        <button className={`h-toggle${on ? ' on' : ''}`} onClick={() => setOn((o) => !o)} role="switch" aria-checked={on}>
          <span className="h-toggle__thumb" />
        </button>
      </div>
    </DemoCard>
  )
}

/* #42 슬라이더 물리 */
function Slider() {
  const [v, setV] = useState(40)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const set = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setV(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))))
  }
  return (
    <DemoCard title="슬라이더 물리" desc="썸이 손끝을 1:1 추적하고, 놓으면 가장 가까운 스냅(0/25/50/75/100)으로 스프링돼요." tier={2}>
      <div className="am-stage am-stage--light h-center">
        <div
          className="h-slider" ref={ref}
          onPointerDown={(e) => { drag.current = true; set(e.clientX); (e.target as HTMLElement).setPointerCapture(e.pointerId) }}
          onPointerMove={(e) => drag.current && set(e.clientX)}
          onPointerUp={() => { drag.current = false; setV((x) => Math.round(x / 25) * 25) }}
        >
          <span className="h-slider__fill" style={{ width: `${v}%` }} />
          <span className="h-slider__thumb" style={{ left: `${v}%` }} />
        </div>
      </div>
    </DemoCard>
  )
}

/* #43 스프링 체크마크 */
function Checkmark() {
  const [k, play] = useReplay()
  return (
    <DemoCard title="스프링 체크마크" desc="성공 시 체크가 그려지며 컨테이너가 바운스. SF Symbol bounce와 자주 결합." tier={1}
      control={<button className="am-replay" onClick={play} aria-label="다시 재생"><Play size={15} fill="currentColor" /></button>}>
      <div className="am-stage am-stage--light h-center">
        <span key={k} className="h-check">
          <svg viewBox="0 0 44 44" width="52" height="52" aria-hidden>
            <path d="M13 23l6 6 12-14" className="h-check__path" />
          </svg>
        </span>
      </div>
    </DemoCard>
  )
}

/* #44 당겨서 새로고침 */
function PullRefresh() {
  const [y, setY] = useState(0)
  const [loading, setLoading] = useState(false)
  const start = useRef<number | null>(null)
  return (
    <DemoCard title="당겨서 새로고침" desc="오버스크롤로 인디케이터가 러버밴드로 늘어나고, 놓으면 스핀 후 스프링백해요." tier={2}>
      <div className="am-stage am-stage--light h-pull-stage">
        <div className="h-pull__ind" style={{ opacity: Math.min(1, y / 40) }}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} style={{ transform: `rotate(${y * 3}deg)` }} />
        </div>
        <div
          className="h-pull__content" style={{ transform: `translateY(${loading ? 44 : y}px)` }}
          onPointerDown={(e) => { start.current = e.clientY }}
          onPointerMove={(e) => { if (start.current !== null && !loading) setY(Math.max(0, (e.clientY - start.current) * 0.42)) }}
          onPointerUp={() => {
            start.current = null
            if (y > 40) { setLoading(true); setY(0); setTimeout(() => setLoading(false), 1200) } else setY(0)
          }}
        >
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-pull__row">아이템 {i + 1}</div>)}
        </div>
      </div>
    </DemoCard>
  )
}

/* #45 숫자 롤 */
function NumericRoll() {
  const [n, setN] = useState(128)
  return (
    <DemoCard title="숫자 텍스트 롤" desc="바뀐 자리만 오도미터처럼 세로로 굴러요(.contentTransition(.numericText))." tier={1}
      control={
        <div className="h-num-ctl">
          <button onClick={() => setN((x) => Math.max(0, x - 7))}><Minus size={14} /></button>
          <button onClick={() => setN((x) => x + 7)}><Plus size={14} /></button>
        </div>
      }>
      <div className="am-stage am-stage--light h-center">
        <div className="h-num">
          {String(n).padStart(4, '0').split('').map((d, i) => (
            <span className="h-num__slot" key={i}>
              <span className="h-num__col" style={{ transform: `translateY(${-Number(d) * 10}%)` }}>
                {Array.from({ length: 10 }, (_, x) => <span key={x}>{x}</span>)}
              </span>
            </span>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #46 버튼 프레스 시 유리로 리프트 */
function LiftGlass() {
  const [mode, setMode] = useState<'flat' | 'auto'>('auto')
  const [down, setDown] = useState(false)
  return (
    <DemoCard title="프레스 시 유리로 리프트" desc="평평한 컨트롤이 터치 순간 유리 상태로 떠올라(투명도+하이라이트) 상호작용하고, 놓으면 평면 복귀." tier={2}
      control={<Seg value={mode} onChange={setMode} options={[{ v: 'flat', label: '평면' }, { v: 'auto', label: '리프트' }]} />}>
      <div className="am-stage am-stage--photo h-center">
        <button
          className={`h-lift${down && mode === 'auto' ? ' up' : ''}`}
          onPointerDown={() => setDown(true)} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}
        >
          <Check size={16} /> 지원하기
        </button>
      </div>
    </DemoCard>
  )
}

export default function GroupH() {
  return (
    <section className="am-group" id="am-h">
      <div className="am-group__head">
        <span className="am-group__kicker">H</span>
        <span className="am-group__title">컨트롤 & 피드백</span>
        <span className="am-group__count">7</span>
      </div>
      <div className="am-grid">
        <ScrollEdge />
        <Toggle />
        <Slider />
        <Checkmark />
        <PullRefresh />
        <NumericRoll />
        <LiftGlass />
      </div>
    </section>
  )
}
