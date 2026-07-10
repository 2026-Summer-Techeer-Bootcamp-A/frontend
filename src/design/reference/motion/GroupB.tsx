import { useState } from 'react'
import { Plus, Search, Bell, Star, Wifi } from 'lucide-react'
import { DemoCard, Seg, usePointerTilt } from './_kit'
import './GroupB.css'

/* ===== B. Liquid Glass 머티리얼 코어 모션 — 카탈로그 #7~#17 =====
   유리는 뒤를 굴절·반사하고, 빛을 휘게(lensing) 하며, 기울기에 specular가 반응하고,
   터치에 젤처럼 flex하며 이웃 유리로 빛이 번진다. 웹은 backdrop-filter+그라디언트+스프링으로 근사. */

/* #7 Specular 하이라이트 스윕 — 포인터(=기기 기울기) 위치로 하이라이트가 이동 */
function Specular() {
  const { ref, tilt, onPointerMove, reset } = usePointerTilt()
  return (
    <DemoCard
      title="Specular 하이라이트 (틸트)"
      desc="유리 표면의 밝은 반사 줄기가 광원(=기기 기울기) 위치를 따라 움직여요. 데스크톱은 포인터로 대체."
      tier={2}
    >
      <div className="am-stage am-stage--photo b-spec-stage" ref={ref} onPointerMove={onPointerMove} onPointerLeave={reset}>
        <div className="b-spec" style={{ '--tx': tilt.x, '--ty': tilt.y } as React.CSSProperties}>
          <span className="b-spec__label">Liquid Glass</span>
        </div>
        <span className="am-stage__hint">위에서 마우스를 움직여요</span>
      </div>
    </DemoCard>
  )
}

/* #8 렌징/굴절 — 유리 너머 콘텐츠가 가장자리에서 휘어 보임 (근사) */
function Lensing() {
  return (
    <DemoCard
      title="렌징 / 굴절"
      desc="유리 너머 콘텐츠가 가장자리에서 확대·왜곡돼요. 진짜 렌징은 네이티브 전용 — 여기선 backdrop-blur + 엣지 왜곡으로 근사."
      tier={3}
    >
      <div className="am-stage am-stage--light b-lens-stage">
        <div className="b-lens__bg">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i}>맞춤 공고 · 점수 92 · 오늘 마감 · 신입 가능 · 재택</span>
          ))}
        </div>
        <div className="b-lens__glass">
          <span>toolbar</span>
        </div>
      </div>
    </DemoCard>
  )
}

/* #9 엣지 광-이동 (잠금해제) — 실루엣을 따라 빛이 한 바퀴 돌고 정착 */
function EdgeLight() {
  const [k, setK] = useState(0)
  return (
    <DemoCard
      title="엣지 광-이동 (잠금해제)"
      desc="깨어날 때 각 유리의 실루엣을 따라 빛이 한 바퀴 훑어 형태를 정의하고 정착해요. conic-gradient를 @property로 1회 회전."
      tier={2}
      control={<button className="am-mini-btn" onClick={() => setK((v) => v + 1)}>해제</button>}
    >
      <div className="am-stage am-stage--dark b-edge-stage">
        <div className="b-edge" key={k}>
          <span>16:04</span>
        </div>
      </div>
    </DemoCard>
  )
}

/* #10 젤/젤리 프레스 워블 — 터치다운 스쿼시 + 손끝에서 내부 발광 */
function GelPress() {
  const [glow, setGlow] = useState<{ x: number; y: number } | null>(null)
  const [down, setDown] = useState(false)
  const set = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    setGlow({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }
  return (
    <DemoCard
      title="젤 프레스 워블"
      desc="누르면 유리가 스쿼시되고 손끝 지점에서 내부 발광이 번져요. 릴리즈 시 젤리처럼 살짝 오버슈트."
      tier={2}
    >
      <div className="am-stage am-stage--light b-gel-stage">
        <button
          className={`b-gel${down ? ' down' : ''}`}
          style={glow ? ({ '--gx': `${glow.x}%`, '--gy': `${glow.y}%` } as React.CSSProperties) : undefined}
          onPointerDown={(e) => { setDown(true); set(e) }}
          onPointerMove={(e) => down && set(e)}
          onPointerUp={() => setDown(false)}
          onPointerLeave={() => setDown(false)}
        >
          눌러보세요
        </button>
      </div>
    </DemoCard>
  )
}

/* #11 글로우 전파 — 눌린 유리의 빛이 인접 유리로 반사 */
function GlowSpread() {
  const [active, setActive] = useState<number | null>(null)
  const icons = [<Plus size={18} />, <Star size={18} />, <Bell size={18} />, <Search size={18} />]
  return (
    <DemoCard
      title="글로우 이웃 전파"
      desc="한 유리 컨트롤을 누르면 그 발광이 옆 유리에도 옅게 반사돼요. Control Center·툴바 클러스터의 감."
      tier={2}
    >
      <div className="am-stage am-stage--dark b-glow-stage">
        <div className="b-glow">
          {icons.map((ic, i) => (
            <button
              key={i}
              className={`b-glow__cell${active === i ? ' on' : active !== null && Math.abs(active - i) === 1 ? ' near' : ''}`}
              onPointerDown={() => setActive(i)}
              onPointerUp={() => setActive(null)}
              onPointerLeave={() => setActive(null)}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #12 적응형 틴트 매핑 — 뒤 배경 밝기에 따라 유리 색이 매핑 (근사) */
function Tint() {
  return (
    <DemoCard
      title="적응형 틴트"
      desc="유리 색이 뒤로 지나가는 콘텐츠 밝기에 매핑돼 실제 색유리처럼 톤이 바뀌어요. CSS는 luminance 샘플 불가 — blend로 근사."
      tier={3}
    >
      <div className="am-stage b-tint-stage">
        <div className="b-tint__bg" />
        <div className="b-tint__chip">Aa</div>
      </div>
    </DemoCard>
  )
}

/* #13 머터리얼라이즈 — 불투명 페이드가 아니라 blur+채도+scale로 "응결" */
function Materialize() {
  const [on, setOn] = useState(false)
  return (
    <DemoCard
      title="머터리얼라이즈 (응결)"
      desc="메뉴·팝오버가 단순 투명도 페이드가 아니라 blur·채도·scale을 함께 램프하며 존재로 응결돼요."
      tier={2}
      control={<Seg value={on ? 'on' : 'off'} onChange={(v) => setOn(v === 'on')} options={[{ v: 'off', label: '숨김' }, { v: 'on', label: '표시' }]} />}
    >
      <div className="am-stage am-stage--photo b-mat-stage">
        <div className={`b-mat${on ? ' on' : ''}`}>
          <span>복사</span><span>공유</span><span>즐겨찾기</span>
        </div>
      </div>
    </DemoCard>
  )
}

/* #14 적응형 그림자 — 스크롤에 따라 그림자 농도 램프 */
function AdaptiveShadow() {
  const [p, setP] = useState(0)
  return (
    <DemoCard
      title="적응형 그림자 (스크롤)"
      desc="플로팅 유리바 아래로 콘텐츠가 지나가면 텍스트 위에선 그림자가 짙어지고 빈 영역에선 옅어져요."
      tier={2}
    >
      <div className="am-stage am-stage--light b-shadow-stage">
        <div className={`b-shadow__bar${p > 6 ? ' lifted' : ''}`}>제목</div>
        <div className="b-shadow__scroll" onScroll={(e) => setP(e.currentTarget.scrollTop)}>
          {Array.from({ length: 14 }, (_, i) => (
            <p key={i}>{i % 3 === 0 ? '■■■■■■  본문 텍스트 라인' : '　　　　　'}</p>
          ))}
        </div>
      </div>
    </DemoCard>
  )
}

/* #15 스케일 시 시크닝 — 커질수록 더 두꺼운 유리(깊은 그림자·강한 렌징) */
function Thicken() {
  const [big, setBig] = useState(false)
  return (
    <DemoCard
      title="확대 시 두꺼워짐"
      desc="컨트롤이 메뉴로 커지면 더 두꺼운 유리처럼 그림자가 깊어지고 렌징·광 산란이 강해져요."
      tier={2}
      control={<Seg value={big ? 'b' : 's'} onChange={(v) => setBig(v === 'b')} options={[{ v: 's', label: '버튼' }, { v: 'b', label: '메뉴' }]} />}
    >
      <div className="am-stage am-stage--photo b-thick-stage">
        <div className={`b-thick${big ? ' big' : ''}`}>
          <span className="b-thick__row">옵션</span>
          <span className="b-thick__row">더보기</span>
          <span className="b-thick__row">설정</span>
        </div>
      </div>
    </DemoCard>
  )
}

/* #16 GlassEffectContainer 근접 병합 (metaball) */
function Merge() {
  const [merged, setMerged] = useState(false)
  return (
    <DemoCard
      title="근접 병합 (metaball)"
      desc="두 유리가 spacing 임계 안으로 들어오면 겹치지 않고 하나의 연속 유리로 뭉치고, 멀어지면 갈라져요."
      tier={1}
      control={<Seg value={merged ? 'm' : 's'} onChange={(v) => setMerged(v === 'm')} options={[{ v: 's', label: '분리' }, { v: 'm', label: '병합' }]} />}
    >
      <div className="am-stage am-stage--light b-goo-stage">
        <div className={`b-goo${merged ? ' merged' : ''}`}>
          <span className="b-goo__blob" />
          <span className="b-goo__blob" />
          <span className="b-goo__blob mid" />
        </div>
        <svg width="0" height="0" aria-hidden>
          <filter id="b-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </svg>
      </div>
    </DemoCard>
  )
}

/* #17 glassEffectID shared-element 모프 — 버튼이 패널로 직접 흘러 들어감 */
function SharedMorph() {
  const [open, setOpen] = useState(false)
  return (
    <DemoCard
      title="Shared-element 모프"
      desc="버튼이 사라졌다 나타나는 게 아니라, 소스 유리가 목적지 패널로 형태 그대로 늘어나 흘러 들어가요. (matched geometry)"
      tier={1}
    >
      <div className="am-stage am-stage--photo b-morph-stage">
        <button className={`b-morph${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)}>
          <span className="b-morph__btn"><Wifi size={16} /> 연결</span>
          <span className="b-morph__panel">
            <b>Wi-Fi</b>
            <span>Techeer_5G · 연결됨</span>
            <span>Techeer_Guest</span>
            <span>eduroam</span>
          </span>
        </button>
      </div>
    </DemoCard>
  )
}

export default function GroupB() {
  return (
    <section className="am-group" id="am-b">
      <div className="am-group__head">
        <span className="am-group__kicker">B</span>
        <span className="am-group__title">Liquid Glass 코어</span>
        <span className="am-group__count">11</span>
      </div>
      <div className="am-grid">
        <Specular />
        <Lensing />
        <EdgeLight />
        <GelPress />
        <GlowSpread />
        <Tint />
        <Materialize />
        <AdaptiveShadow />
        <Thicken />
        <Merge />
        <SharedMorph />
      </div>
    </section>
  )
}
