import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PlayCircle, Square } from 'lucide-react'

/* ============================================================
   데모 모드 — 화면 녹화용 오토플레이. 탭마다 따로 영상을 찍을 것이므로
   다른 탭으로 이동하지 않고, 켠 그 탭(홈/시장/지도)의 시나리오만
   반복 재생한다 — 스크롤·카드 펼침·클러스터 탭 같은 동작.
   차트·숫자 애니메이션은 화면 진입 시 이미 자동 재생되므로
   (useCountUp, ArcGauge, ActivityRings 등) 여기서는 그 탭의
   스크롤/클릭 루프만 조율하면 된다.
   ============================================================ */

function scrollStage(y: number) {
  // 실제 스크롤 컨테이너는 .career가 아니라 PhoneFrame 내부의 .screen-scroll이다 —
  // .career는 overflow:visible이라 scrollTo를 호출해도 아무 일도 일어나지 않았다.
  document.querySelector('.screen-scroll')?.scrollTo({ top: y, behavior: 'smooth' })
}
function clickSel(sel: string) {
  document.querySelector<HTMLElement>(sel)?.click()
}

type Step = { hold: number; actions: { at: number; run: () => void }[] }

const SCRIPT: Record<string, Step> = {
  '/': {
    hold: 7200,
    actions: [
      { at: 1100, run: () => scrollStage(240) },
      { at: 2700, run: () => scrollStage(560) },
      { at: 4300, run: () => scrollStage(900) },
      { at: 5900, run: () => scrollStage(0) },
    ],
  },
  '/market': {
    hold: 9000,
    actions: [
      { at: 900, run: () => scrollStage(280) },
      { at: 2200, run: () => scrollStage(620) },
      { at: 3400, run: () => clickSel('.kit-disc__head') },
      { at: 5200, run: () => scrollStage(980) },
      { at: 6600, run: () => scrollStage(1400) },
    ],
  },
  '/map': {
    // 카메라 이동은 recenter 한 번만(전체보기+클러스터 확대까지 겹치면 애니메이션이
    // 서로 끊겨 보였음) — 그 뒤로는 클릭만으로 5~6초 안에 회사 2개+메뉴 → 1개 상세를 보여준다.
    hold: 6000,
    actions: [
      { at: 300, run: () => clickSel('.lfab.primary') },
      { at: 1500, run: () => clickSel('.lclus, .lpincard--multi') },
      { at: 3000, run: () => clickSel('.lctxmenu__back') },
      { at: 3600, run: () => clickSel('.lpincard--single') },
      { at: 5400, run: () => clickSel('.kit-sheet__ov') },
    ],
  },
}

export default function DemoMode() {
  const [on, setOn] = useState(false)
  const location = useLocation()
  const timers = useRef<number[]>([])

  useEffect(() => {
    const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
    if (!on) { clear(); return }
    const s = SCRIPT[location.pathname]
    if (!s) { clear(); return }
    const playOnce = () => {
      s.actions.forEach((a) => { timers.current.push(window.setTimeout(a.run, a.at)) })
      timers.current.push(window.setTimeout(playOnce, s.hold))
    }
    timers.current.push(window.setTimeout(playOnce, 150))
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, location.pathname])

  const hasScript = !!SCRIPT[location.pathname]
  if (!hasScript) return null

  return (
    <button className={`demo-mode-fab${on ? ' on' : ''}`} onClick={() => setOn((v) => !v)}>
      {on ? <Square size={15} /> : <PlayCircle size={15} />}
      {on ? '데모 재생 중' : '데모 모드'}
    </button>
  )
}
