import { useState } from 'react'
import { Heart, Bell, Trash2, Bookmark, RefreshCw, RotateCw, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { DemoCard, useReplay } from './_kit'
import './GroupG.css'

/* ===== G. SF Symbols 7 애니메이션 — 카탈로그 #32~#39 =====
   .symbolEffect(...)의 웹 번역. 원샷(bounce/wiggle/magic/draw)은 리플레이로 재생, 나머지는 상시. */

/* 원샷 심볼 타일 — 리플레이 버튼으로 keyframe 재시작 */
function OneShot({ title, desc, cls, icon, tier = 1 }: { title: string; desc: string; cls: string; icon: ReactNode; tier?: 1 | 2 | 3 }) {
  const [k, play] = useReplay()
  return (
    <DemoCard title={title} desc={desc} tier={tier} control={<button className="am-replay" onClick={play} aria-label="다시 재생"><Play size={15} fill="currentColor" /></button>}>
      <div className="am-stage am-stage--light g-stage">
        <span key={k} className={`g-sym ${cls}`}>{icon}</span>
      </div>
    </DemoCard>
  )
}

/* 상시 재생 심볼 타일 */
function Loop({ title, desc, cls, icon }: { title: string; desc: string; cls: string; icon: ReactNode }) {
  return (
    <DemoCard title={title} desc={desc} tier={1}>
      <div className="am-stage am-stage--light g-stage">
        <span className={`g-sym ${cls}`}>{icon}</span>
      </div>
    </DemoCard>
  )
}

/* #37 Variable Color — Wi-Fi 아크가 순차 점등 */
function VariableColor() {
  return (
    <DemoCard title="Variable Color" desc="세그먼트가 순서대로 점등돼 진행/신호를 표현해요. 그룹 패스에 스태거 opacity." tier={2}>
      <div className="am-stage am-stage--light g-stage">
        <svg viewBox="0 0 48 40" width="72" height="60" className="g-wifi" aria-hidden>
          <path className="g-wifi__a" d="M4 14a28 28 0 0140 0" />
          <path className="g-wifi__a" d="M11 21a18 18 0 0126 0" />
          <path className="g-wifi__a" d="M17.5 28a9 9 0 0113 0" />
          <circle className="g-wifi__a" cx="24" cy="34" r="2.4" />
        </svg>
      </div>
    </DemoCard>
  )
}

/* #38 Magic Replace — 관련 심볼끼리 크로스 모프 (근사) */
function MagicReplace() {
  const [on, setOn] = useState(false)
  return (
    <DemoCard
      title="Magic Replace"
      desc="심볼을 관련 심볼로 교체할 때 공유 스트로크는 morph하고 다른 부분만 그려져요. 웹은 크로스페이드+스케일 근사."
      tier={3}
      control={<button className="am-replay" onClick={() => setOn((o) => !o)} aria-label="교체"><RefreshCw size={15} /></button>}
    >
      <div className="am-stage am-stage--light g-stage">
        <span className="g-magic">
          <span className={`g-magic__ic${on ? ' out' : ''}`}><Bell size={34} /></span>
          <span className={`g-magic__ic${on ? '' : ' out'}`}><Bookmark size={34} /></span>
        </span>
      </div>
    </DemoCard>
  )
}

/* #39 Draw-on — 스트로크가 손으로 그리듯 그려짐 */
function DrawOn() {
  const [k, play] = useReplay()
  return (
    <DemoCard title="Draw-on / Variable Draw" desc="스트로크가 필기하듯 순차로 그려져요. Variable Draw는 값에 비례해 채워요. stroke-dashoffset 애니메이션." tier={1}
      control={<button className="am-replay" onClick={play} aria-label="다시 그리기"><Play size={15} fill="currentColor" /></button>}>
      <div className="am-stage am-stage--light g-stage">
        <svg key={k} viewBox="0 0 52 52" width="70" height="70" className="g-draw" aria-hidden>
          <circle cx="26" cy="26" r="22" className="g-draw__ring" />
          <path d="M16 27l7 7 14-16" className="g-draw__check" />
        </svg>
      </div>
    </DemoCard>
  )
}

export default function GroupG() {
  return (
    <section className="am-group" id="am-g">
      <div className="am-group__head">
        <span className="am-group__kicker">G</span>
        <span className="am-group__title">SF Symbols 7</span>
        <span className="am-group__count">8</span>
      </div>
      <div className="am-grid">
        <OneShot title="Bounce" desc="한 번 탄성 있게 커졌다 정착. 알림·좋아요 확인 피드백." cls="g-bounce" icon={<Heart size={34} fill="currentColor" />} />
        <OneShot title="Wiggle" desc="축을 따라 몇 번 흔들리며 감쇠. 주의 환기." cls="g-wiggle" icon={<Bell size={34} />} />
        <Loop title="Breathe" desc="부드럽게 scale·opacity가 숨쉬듯 오가요. 진행 대기." cls="g-breathe" icon={<Bookmark size={34} fill="currentColor" />} />
        <Loop title="Rotate" desc="레이어가 회전. 동기화·로딩." cls="g-rotate" icon={<RotateCw size={34} />} />
        <Loop title="Pulse" desc="레이어 opacity가 오가 진행 중임을 알려요." cls="g-pulse" icon={<Trash2 size={34} />} />
        <VariableColor />
        <MagicReplace />
        <DrawOn />
      </div>
    </section>
  )
}
