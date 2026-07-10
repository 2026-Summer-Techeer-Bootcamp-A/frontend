import { useState } from 'react'
import { Folder, Compass, Mail, Music, Camera, Settings, PanelLeft, Plus } from 'lucide-react'
import { DemoCard, Seg } from './_kit'
import './GroupJ.css'

/* ===== J. macOS Tahoe 26 — 카탈로그 #51~#54 ===== */

/* #51 플로팅 독 굴절 + 매그니파이 */
function Dock() {
  const [hover, setHover] = useState<number | null>(null)
  const icons = [<Folder size={26} />, <Compass size={26} />, <Mail size={26} />, <Music size={26} />, <Camera size={26} />, <Settings size={26} />]
  const scale = (i: number) => {
    if (hover === null) return 1
    const d = Math.abs(hover - i)
    return d === 0 ? 1.5 : d === 1 ? 1.25 : d === 2 ? 1.08 : 1
  }
  return (
    <DemoCard title="플로팅 독 굴절" desc="독이 데스크톱 위에 떠 벽지를 굴절하고, 호버하면 아이콘이 이웃까지 매그니파이돼요(macOS 클래식+유리)." tier={2}>
      <div className="am-stage am-stage--photo j-dock-stage">
        <div className="j-dock" onPointerLeave={() => setHover(null)}>
          {icons.map((ic, i) => (
            <button key={i} className="j-dock__ic" style={{ transform: `scale(${scale(i)}) translateY(${scale(i) > 1.1 ? -8 : 0}px)` }} onPointerEnter={() => setHover(i)}>
              {ic}
            </button>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #52 사이드바 벽지 반사 + 오토리사이즈 */
function Sidebar() {
  const [wide, setWide] = useState(false)
  return (
    <DemoCard title="사이드바 반사 + 오토리사이즈" desc="사이드바가 벽지를 은은히 반사(위치감)하고, 콘텐츠에 맞춰 폭을 부드럽게 조절해요." tier={2}
      control={<button className="am-mini-btn" onClick={() => setWide((w) => !w)}><PanelLeft size={14} /></button>}>
      <div className="am-stage am-stage--photo j-side-stage">
        <div className="j-side__win">
          <aside className={`j-side__bar${wide ? ' wide' : ''}`}>
            <span className="j-side__item on"><Folder size={15} /> {wide && <em>프로젝트</em>}</span>
            <span className="j-side__item"><Mail size={15} /> {wide && <em>받은편지함</em>}</span>
            <span className="j-side__item"><Music size={15} /> {wide && <em>라이브러리</em>}</span>
          </aside>
          <div className="j-side__content" />
        </div>
      </div>
    </DemoCard>
  )
}

/* #53 투명 메뉴바 */
function MenuBar() {
  return (
    <DemoCard title="투명 메뉴바" desc="메뉴바가 완전히 투명해져 콘텐츠가 비쳐 보이고, 화면이 더 커 보여요." tier={1}>
      <div className="am-stage am-stage--photo j-menu-stage">
        <div className="j-menu__bar">
          <span></span><span>파일</span><span>편집</span><span>보기</span><span className="j-menu__sp" /><span>100%</span>
        </div>
        <div className="j-menu__wall">
          {Array.from({ length: 3 }, (_, i) => <span key={i} />)}
        </div>
      </div>
    </DemoCard>
  )
}

/* #54 윈도/툴바 morph */
function ToolbarMorph() {
  const [more, setMore] = useState(false)
  return (
    <DemoCard title="윈도/툴바 morph" desc="둥근 유리 툴바가 콘텐츠에 맞춰 크기를 morph하고, 옵션이 늘면 컨트롤이 동적으로 재배치돼요." tier={2}
      control={<Seg value={more ? 'm' : 's'} onChange={(v) => setMore(v === 'm')} options={[{ v: 's', label: '기본' }, { v: 'm', label: '확장' }]} />}>
      <div className="am-stage am-stage--photo j-tool-stage">
        <div className={`j-tool${more ? ' more' : ''}`}>
          <span className="j-tool__btn"><Compass size={16} /></span>
          <span className="j-tool__btn"><Mail size={16} /></span>
          <span className="j-tool__extra"><Camera size={16} /></span>
          <span className="j-tool__extra"><Settings size={16} /></span>
          <span className="j-tool__btn j-tool__add"><Plus size={16} /></span>
        </div>
      </div>
    </DemoCard>
  )
}

export default function GroupJ() {
  return (
    <section className="am-group" id="am-j">
      <div className="am-group__head">
        <span className="am-group__kicker">J</span>
        <span className="am-group__title">macOS Tahoe 26</span>
        <span className="am-group__count">4</span>
      </div>
      <div className="am-grid">
        <Dock />
        <Sidebar />
        <MenuBar />
        <ToolbarMorph />
      </div>
    </section>
  )
}
