import { useState } from 'react'
import { Home, Compass, Bell, User, Search, X } from 'lucide-react'
import { DemoCard } from './_kit'
import './GroupC.css'

/* ===== C. 탭 바 — 카탈로그 #18~#21 =====
   플로팅 유리 탭바가 스크롤에 따라 축소/확장하고, 검색탭은 필드로 morph. */

/* #18+#19 스크롤 방향에 따라 축소/확장 */
function TabShrink() {
  const [min, setMin] = useState(false)
  const [last, setLast] = useState(0)
  return (
    <DemoCard
      title="스크롤 축소 / 확장"
      desc="아래로 스크롤하면 탭바가 알약으로 좁아지고 라벨이 사라져요(#18). 위로 올리면 유동적으로 다시 펴져요(#19)."
      tier={1}
    >
      <div className="am-stage am-stage--light c-shrink-stage">
        <div
          className="c-scroll"
          onScroll={(e) => {
            const y = e.currentTarget.scrollTop
            setMin(y > last && y > 12)
            setLast(y)
          }}
        >
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="c-row" />
          ))}
        </div>
        <div className={`c-tabbar${min ? ' min' : ''}`}>
          {[{ Ic: Home, label: '홈' }, { Ic: Compass, label: '탐색' }, { Ic: Bell, label: '알림' }, { Ic: User, label: '마이' }].map(
            ({ Ic, label }, i) => (
              <button key={i} className={`c-tab${i === 0 ? ' on' : ''}`}>
                <Ic size={19} />
                <span>{label}</span>
              </button>
            ),
          )}
        </div>
      </div>
    </DemoCard>
  )
}

/* #20 검색 탭 morph — 원형 버튼이 검색 필드로, 나머지 탭은 접힘 */
function SearchMorph() {
  const [open, setOpen] = useState(false)
  return (
    <DemoCard
      title="검색 탭 morph"
      desc="분리된 원형 검색 버튼을 누르면 하단 검색 필드로 늘어나고, 나머지 탭은 한 버튼으로 접혀요."
      tier={1}
    >
      <div className="am-stage am-stage--light c-search-stage">
        <div className={`c-search${open ? ' open' : ''}`}>
          <div className="c-search__tabs">
            {[Home, Compass, User].map((Ic, i) => (
              <button key={i} className={i === 0 ? 'on' : ''}><Ic size={18} /></button>
            ))}
          </div>
          <button className="c-search__field" onClick={() => setOpen((o) => !o)}>
            <Search size={17} />
            <span className="c-search__ph">검색</span>
            <span className="c-search__x" onClick={(e) => { e.stopPropagation(); setOpen(false) }}><X size={15} /></span>
          </button>
        </div>
      </div>
    </DemoCard>
  )
}

/* #21 플로팅 유리 탭바 굴절 */
function FloatingRefract() {
  return (
    <DemoCard
      title="플로팅 유리 굴절"
      desc="탭바가 콘텐츠 위에 떠서 아래로 지나가는 것을 굴절·틴트하고, 적응형 그림자를 드리워요(#14 결합)."
      tier={2}
    >
      <div className="am-stage am-stage--photo c-float-stage">
        <div className="c-float__bg">
          {Array.from({ length: 8 }, (_, i) => <span key={i} />)}
        </div>
        <div className="c-float__bar">
          {[Home, Compass, Search, Bell].map((Ic, i) => (
            <button key={i} className={i === 0 ? 'on' : ''}><Ic size={18} /></button>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

export default function GroupC() {
  return (
    <section className="am-group" id="am-c">
      <div className="am-group__head">
        <span className="am-group__kicker">C</span>
        <span className="am-group__title">탭 바</span>
        <span className="am-group__count">4</span>
      </div>
      <div className="am-grid">
        <TabShrink />
        <SearchMorph />
        <FloatingRefract />
      </div>
    </section>
  )
}
