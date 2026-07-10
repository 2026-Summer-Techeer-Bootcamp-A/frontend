import { useState } from 'react'
import { ChevronLeft, Copy, Share2, Star, Trash2 } from 'lucide-react'
import { DemoCard } from './_kit'
import './GroupE.css'

/* ===== E. 내비게이션 — 카탈로그 #25~#27 =====
   썸네일이 전체로 줌, 유리 툴바 푸시/팝, 컨텍스트 메뉴는 소스 지점에서 피어남. */

/* #25 줌 트랜지션 — 셀이 프레임 그대로 전체로 확장 */
function ZoomTransition() {
  const [open, setOpen] = useState<number | null>(null)
  const colors = ['#ff8a5b', '#5b8cff', '#43c9a0', '#b07bff']
  return (
    <DemoCard
      title="줌 트랜지션"
      desc="탭한 썸네일이 소스 rect에서 전체 화면으로 프레임을 morph하며 날아가요. 다시 탭하면 역재생."
      tier={1}
    >
      <div className="am-stage am-stage--light e-zoom-stage">
        <div className="e-zoom__grid">
          {colors.map((c, i) => (
            <button
              key={i}
              className={`e-zoom__cell${open === i ? ' open' : ''}`}
              style={{ background: c }}
              onClick={() => setOpen((o) => (o === i ? null : i))}
            >
              <span className="e-zoom__title">{open === i ? '상세 보기' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #26 푸시 / 팝 (유리 툴바 + 패럴럭스) */
function PushPop() {
  const [depth, setDepth] = useState(0)
  return (
    <DemoCard
      title="푸시 / 팝 + 유리 툴바"
      desc="가로 푸시/팝. 나가는 화면은 패럴럭스로 살짝만 밀리고, 뒤로 버튼은 플로팅 유리예요."
      tier={1}
    >
      <div className="am-stage am-stage--light e-push-stage">
        <div className={`e-push__view e-push__view--a${depth ? ' out' : ''}`}>
          <div className="e-push__list">
            {['맞춤 공고', '채용 시장', '지도'].map((t) => (
              <button key={t} className="e-push__item" onClick={() => setDepth(1)}>{t} ›</button>
            ))}
          </div>
        </div>
        <div className={`e-push__view e-push__view--b${depth ? ' in' : ''}`}>
          <button className="e-push__back" onClick={() => setDepth(0)}><ChevronLeft size={18} /> 뒤로</button>
          <div className="e-push__detail">상세 화면</div>
        </div>
      </div>
    </DemoCard>
  )
}

/* #27 컨텍스트 메뉴 블룸 — 소스 지점 transform-origin에서 스프링 scale */
function ContextBloom() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const items = [
    { icon: <Copy size={15} />, label: '복사' },
    { icon: <Share2 size={15} />, label: '공유' },
    { icon: <Star size={15} />, label: '즐겨찾기' },
    { icon: <Trash2 size={15} />, label: '삭제', danger: true },
  ]
  return (
    <DemoCard
      title="컨텍스트 메뉴 블룸"
      desc="길게 누른(우클릭한) 지점을 transform-origin으로 메뉴가 스프링 scale로 피어나요. 뒤 배경은 살짝 dim·blur."
      tier={2}
    >
      <div
        className={`am-stage am-stage--photo e-ctx-stage${menu ? ' dim' : ''}`}
        onContextMenu={(e) => {
          e.preventDefault()
          const r = e.currentTarget.getBoundingClientRect()
          setMenu({ x: e.clientX - r.left, y: e.clientY - r.top })
        }}
        onClick={() => setMenu(null)}
      >
        <div className="e-ctx__target">우클릭 해보세요</div>
        {menu && (
          <div
            className="e-ctx__menu"
            style={{ left: menu.x, top: menu.y, transformOrigin: 'top left' }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((it) => (
              <button key={it.label} className={`e-ctx__item${it.danger ? ' danger' : ''}`} onClick={() => setMenu(null)}>
                {it.icon}<span>{it.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </DemoCard>
  )
}

export default function GroupE() {
  return (
    <section className="am-group" id="am-e">
      <div className="am-group__head">
        <span className="am-group__kicker">E</span>
        <span className="am-group__title">내비게이션</span>
        <span className="am-group__count">3</span>
      </div>
      <div className="am-grid">
        <ZoomTransition />
        <PushPop />
        <ContextBloom />
      </div>
    </section>
  )
}
