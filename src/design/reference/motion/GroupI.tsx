import { useState } from 'react'
import { Wifi, Bluetooth, Plane, Moon, Sun, Music } from 'lucide-react'
import { DemoCard, Seg } from './_kit'
import './GroupI.css'

/* ===== I. 시스템 표면 — 카탈로그 #47~#50 ===== */

/* #47 잠금화면 적응형 시계 — 가변 폰트 웨이트 + 피사체 오클루전 */
function AdaptiveClock() {
  const [full, setFull] = useState(true)
  return (
    <DemoCard title="적응형 시계 (깊이)" desc="시간이 사진 피사체 뒤로 흐르고(깊이 합성), SF 숫자가 여백에 맞춰 웨이트·폭을 동적으로 조절해요." tier={3}
      control={<Seg value={full ? 'f' : 'l'} onChange={(v) => setFull(v === 'f')} options={[{ v: 'l', label: '가늘게' }, { v: 'f', label: '굵게' }]} />}>
      <div className="am-stage am-stage--photo i-clock-stage">
        <div className={`i-clock${full ? ' full' : ''}`}>9:41</div>
        <div className="i-clock__subject" />
      </div>
    </DemoCard>
  )
}

/* #48 Control Center 유리 */
function ControlCenter() {
  const [open, setOpen] = useState(false)
  const tiles = [<Wifi size={20} />, <Bluetooth size={20} />, <Plane size={20} />, <Moon size={20} />, <Sun size={20} />, <Music size={20} />]
  return (
    <DemoCard title="Control Center 유리" desc="모듈이 유리 타일로 렌더, 열면 배경이 blur·dim되고 타일이 스태거 스프링으로 등장해요." tier={2}
      control={<Seg value={open ? 'o' : 'c'} onChange={(v) => setOpen(v === 'o')} options={[{ v: 'c', label: '닫힘' }, { v: 'o', label: '열림' }]} />}>
      <div className={`am-stage am-stage--photo i-cc-stage${open ? ' open' : ''}`}>
        <div className="i-cc__grid">
          {tiles.map((t, i) => (
            <div key={i} className="i-cc__tile" style={{ '--i': i } as React.CSSProperties}>{t}</div>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #49 알림/배너 유리 슬라이드 */
function Notification() {
  const [show, setShow] = useState(true)
  return (
    <DemoCard title="알림 유리 슬라이드" desc="알림이 플로팅 유리로 내려와 벽지를 굴절하고, 위로 밀거나 탭하면 스프링으로 사라져요." tier={1}
      control={<button className="am-mini-btn" onClick={() => setShow((s) => !s)}>{show ? '숨기기' : '표시'}</button>}>
      <div className="am-stage am-stage--photo i-noti-stage">
        <div className={`i-noti${show ? ' on' : ''}`} onClick={() => setShow(false)}>
          <span className="i-noti__ic"><Music size={18} /></span>
          <span className="i-noti__meta"><b>새 매칭 공고</b><span>백엔드 신입 · 점수 94</span></span>
        </div>
      </div>
    </DemoCard>
  )
}

/* #50 키보드 유리 */
function Keyboard() {
  const rows = ['ㅂㅈㄷㄱㅅ', 'ㅁㄴㅇㄹ', 'ㅋㅌㅊㅍ']
  return (
    <DemoCard title="키보드 유리" desc="키보드가 반투명 유리 스타일을 채택하고, 키는 누를 때 살짝 flex해요." tier={2}>
      <div className="am-stage am-stage--photo i-kb-stage">
        <div className="i-kb">
          {rows.map((r, ri) => (
            <div key={ri} className="i-kb__row">
              {r.split('').map((k) => <button key={k} className="i-kb__key">{k}</button>)}
            </div>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

export default function GroupI() {
  return (
    <section className="am-group" id="am-i">
      <div className="am-group__head">
        <span className="am-group__kicker">I</span>
        <span className="am-group__title">시스템 표면</span>
        <span className="am-group__count">4</span>
      </div>
      <div className="am-grid">
        <AdaptiveClock />
        <ControlCenter />
        <Notification />
        <Keyboard />
      </div>
    </section>
  )
}
