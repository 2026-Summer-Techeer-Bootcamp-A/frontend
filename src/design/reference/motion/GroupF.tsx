import { useState } from 'react'
import { Camera, Music, MessageCircle, Map, Minus } from 'lucide-react'
import { DemoCard, Seg, usePointerTilt } from './_kit'
import './GroupF.css'

/* ===== F. 앱 아이콘 — 카탈로그 #28~#31 =====
   아이콘이 멀티 레이어 Liquid Glass로 렌더되고, 기울기에 specular·패럴럭스, 편집 모드에 지글. */

/* #28 Clear/틴트/다크 유리 렌더 */
function IconModes() {
  const [mode, setMode] = useState<'default' | 'dark' | 'clear' | 'tinted'>('default')
  return (
    <DemoCard
      title="아이콘 외형 모드"
      desc="홈 화면 외형(기본·다크·클리어·틴트)에 따라 아이콘이 멀티 레이어 유리로 다르게 렌더돼요."
      tier={2}
      control={
        <Seg
          value={mode}
          onChange={setMode}
          options={[{ v: 'default', label: '기본' }, { v: 'dark', label: '다크' }, { v: 'clear', label: '클리어' }, { v: 'tinted', label: '틴트' }]}
        />
      }
    >
      <div className={`am-stage f-modes-stage f-mode--${mode}`}>
        <div className="f-icon"><Camera size={30} /></div>
      </div>
    </DemoCard>
  )
}

/* #29 틸트 패럴럭스 + specular (자이로 → 포인터) */
function TiltParallax() {
  const { ref, tilt, onPointerMove, reset } = usePointerTilt()
  const dx = (tilt.x - 0.5) * 2
  const dy = (tilt.y - 0.5) * 2
  return (
    <DemoCard
      title="틸트 패럴럭스 + specular"
      desc="기기를 기울이면 specular 하이라이트와 유리 레이어 깊이 패럴럭스가 실시간 이동해요. 데스크톱은 포인터로."
      tier={2}
    >
      <div className="am-stage f-tilt-stage" ref={ref} onPointerMove={onPointerMove} onPointerLeave={reset}>
        <div className="f-tilt" style={{ '--dx': dx, '--dy': dy } as React.CSSProperties}>
          <span className="f-tilt__l1" />
          <span className="f-tilt__l2"><Music size={26} /></span>
          <span className="f-tilt__spec" />
        </div>
      </div>
    </DemoCard>
  )
}

/* #30 지글(편집) 모드 + 유리 삭제 배지 */
function Jiggle() {
  const [edit, setEdit] = useState(true)
  const icons = [<Camera size={24} />, <Music size={24} />, <MessageCircle size={24} />, <Map size={24} />]
  return (
    <DemoCard
      title="지글 편집 모드"
      desc="빈 곳을 길게 누르면 아이콘이 계속 흔들려요(각 아이콘 위상 오프셋). 삭제(마이너스) 배지는 유리로 렌더."
      tier={1}
      control={<Seg value={edit ? 'on' : 'off'} onChange={(v) => setEdit(v === 'on')} options={[{ v: 'off', label: '정지' }, { v: 'on', label: '편집' }]} />}
    >
      <div className="am-stage am-stage--light f-jiggle-stage">
        <div className={`f-jiggle${edit ? ' on' : ''}`}>
          {icons.map((ic, i) => (
            <div key={i} className="f-jiggle__icon" style={{ '--i': i } as React.CSSProperties}>
              <div className="f-icon f-icon--sm">{ic}</div>
              <span className="f-jiggle__badge"><Minus size={12} strokeWidth={3} /></span>
            </div>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #31 아이콘 프레스 → 앱 런치 줌 */
function LaunchMorph() {
  const [open, setOpen] = useState(false)
  return (
    <DemoCard
      title="프레스 → 런치 줌"
      desc="탭하면 아이콘이 살짝 눌렸다가(유리 flex) 자신의 프레임에서 전체 화면으로 zoom open, 닫으면 아이콘으로 복귀."
      tier={1}
    >
      <div className="am-stage am-stage--light f-launch-stage">
        <button className={`f-launch${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)}>
          <span className="f-launch__icon f-icon"><MessageCircle size={28} /></span>
          <span className="f-launch__app">
            <span className="f-launch__bar" />
            <span className="f-launch__body">앱 화면 — 탭하면 닫힘</span>
          </span>
        </button>
      </div>
    </DemoCard>
  )
}

export default function GroupF() {
  return (
    <section className="am-group" id="am-f">
      <div className="am-group__head">
        <span className="am-group__kicker">F</span>
        <span className="am-group__title">앱 아이콘</span>
        <span className="am-group__count">4</span>
      </div>
      <div className="am-grid">
        <IconModes />
        <TiltParallax />
        <Jiggle />
        <LaunchMorph />
      </div>
    </section>
  )
}
