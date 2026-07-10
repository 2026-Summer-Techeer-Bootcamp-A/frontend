import { useRef, useState } from 'react'
import { Share } from 'lucide-react'
import { DemoCard, Seg } from './_kit'
import './GroupD.css'

/* ===== D. 시트 / 모달 — 카탈로그 #22~#24 =====
   시트가 소스 버튼에서 자라나고, 디텐트에 따라 유리 불투명도·코너가 변하며, 드래그는 러버밴드. */

/* #22 소스 버튼에서 시트 morph */
function SheetMorph() {
  const [open, setOpen] = useState(false)
  return (
    <DemoCard
      title="소스에서 시트 morph"
      desc="시트가 무(無)에서 올라오는 게 아니라, 자신을 띄운 버튼에서 직접 자라나요(matched geometry)."
      tier={1}
    >
      <div className="am-stage am-stage--light d-morph-stage">
        <div className={`d-morph${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)}>
          <span className="d-morph__btn"><Share size={16} /> 공유</span>
          <span className="d-morph__sheet">
            <span className="d-morph__grip" />
            <b>공유 대상</b>
            <span className="d-morph__row">에어드롭</span>
            <span className="d-morph__row">메시지</span>
            <span className="d-morph__row">링크 복사</span>
          </span>
        </div>
      </div>
    </DemoCard>
  )
}

/* #23 디텐트 — medium은 반투명·코너 내포, large는 불투명·엣지 앵커 */
function Detents() {
  const [d, setD] = useState<'medium' | 'large'>('medium')
  return (
    <DemoCard
      title="디텐트 유리 전환"
      desc="medium에선 반투명 유리에 코너가 안쪽으로 말려 화면 라운드에 nest, large로 끌면 불투명해지며 엣지에 앵커돼요."
      tier={2}
      control={<Seg value={d} onChange={setD} options={[{ v: 'medium', label: 'medium' }, { v: 'large', label: 'large' }]} />}
    >
      <div className="am-stage am-stage--photo d-detent-stage">
        <div className={`d-detent d-detent--${d}`}>
          <span className="d-detent__grip" />
          <b>세부 정보</b>
          <p>디텐트를 large로 올리면 유리가 서서히 불투명해지고 코너가 펴져요.</p>
        </div>
      </div>
    </DemoCard>
  )
}

/* #24 러버밴드 드래그 / 스프링 디스미스 */
function RubberBand() {
  const [y, setY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef(0)
  const onDown = (e: React.PointerEvent) => {
    setDragging(true)
    start.current = e.clientY - y
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return
    let dy = e.clientY - start.current
    if (dy < 0) dy = dy * 0.28 // 위로는 러버밴드 저항
    setY(dy)
  }
  const onUp = () => {
    setDragging(false)
    setY((cur) => (cur > 90 ? 260 : 0)) // 충분히 내리면 스프링으로 사라짐, 아니면 스냅백
    setTimeout(() => setY(0), 420)
  }
  return (
    <DemoCard
      title="러버밴드 드래그"
      desc="위로는 점근 저항(러버밴드), 아래로 충분히 끌면 스프링으로 튕겨 사라졌다 스냅백해요. 속도 인지 스프링의 감."
      tier={2}
    >
      <div className="am-stage am-stage--photo d-rubber-stage">
        <div
          className={`d-rubber${dragging ? ' drag' : ''}`}
          style={{ transform: `translateY(${y}px)` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="d-rubber__grip" />
          <b>끌어보세요</b>
          <span className="d-rubber__hint">아래로 끌면 사라져요</span>
        </div>
      </div>
    </DemoCard>
  )
}

export default function GroupD() {
  return (
    <section className="am-group" id="am-d">
      <div className="am-group__head">
        <span className="am-group__kicker">D</span>
        <span className="am-group__title">시트 / 모달</span>
        <span className="am-group__count">3</span>
      </div>
      <div className="am-grid">
        <SheetMorph />
        <Detents />
        <RubberBand />
      </div>
    </section>
  )
}
