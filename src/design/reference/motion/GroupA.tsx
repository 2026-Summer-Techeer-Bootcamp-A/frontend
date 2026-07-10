import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipForward, Phone, Navigation, MessageCircle } from 'lucide-react'
import { DemoCard, Seg } from './_kit'
import './GroupA.css'

/* ===== A. 다이나믹 아일랜드 (플래그십) — 카탈로그 #1~#6 =====
   검은 알약(하드웨어 컷아웃)이 연속 라운드(squircle)를 유지한 채 폭·높이가 스프링 morph.
   핵심 물성: (a) 앨범아트는 크로스페이드가 아니라 shared-element로 위치·크기가 흐름,
   (b) 배경은 순수 검정이라 "구멍이 늘어나는" 감, (c) 스프링은 살짝 오버슈트 후 정착. */

type DIState = 'minimal' | 'compact' | 'expanded'

/* #1 Compact ↔ Expanded 모프 — 앨범아트 shared-element */
function DIExpand() {
  const [state, setState] = useState<DIState>('compact')
  const [playing, setPlaying] = useState(true)
  return (
    <DemoCard
      title="확장 모프 (Live Activity)"
      desc="알약을 탭하면 확장. 앨범아트가 사라졌다 나타나는 게 아니라 작은 위치에서 큰 위치로 흘러가며(shared-element) 커져요."
      tier={1}
      control={
        <Seg
          value={state}
          onChange={setState}
          label="아일랜드 상태"
          options={[
            { v: 'minimal', label: '최소' },
            { v: 'compact', label: '알약' },
            { v: 'expanded', label: '확장' },
          ]}
        />
      }
    >
      <div className="di-stage am-stage am-stage--dark">
        <button
          className={`di di--${state}`}
          onClick={() => setState((s) => (s === 'expanded' ? 'compact' : 'expanded'))}
          aria-label="다이나믹 아일랜드 토글"
        >
          {/* shared-element: 상태별 위치/크기만 바뀌는 단일 아트 */}
          <span className="di__art" />

          {/* compact 전용: 우측 이퀄라이저 */}
          <span className="di__eq" aria-hidden>
            <i /><i /><i /><i />
          </span>

          {/* expanded 전용: 메타 + 컨트롤 */}
          <span className="di__exp">
            <span className="di__meta">
              <span className="di__track">Weightless</span>
              <span className="di__artist">Marconi Union</span>
              <span className="di__track-bar"><i /></span>
            </span>
            <span className="di__ctrls">
              <span
                className="di__play"
                onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p) }}
                role="button"
                aria-label={playing ? '일시정지' : '재생'}
              >
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </span>
              <SkipForward size={17} fill="currentColor" />
            </span>
          </span>
        </button>
      </div>
    </DemoCard>
  )
}

/* #2 Compact ↔ Minimal 스플릿/병합 (metaball + 스냅 오버슈트) */
function DISplit() {
  const [split, setSplit] = useState(false)
  return (
    <DemoCard
      title="스플릿 / 병합 (멀티 액티비티)"
      desc="두 번째 액티비티가 붙으면 알약에서 점이 젤처럼 목을 늘리다 스냅하며 분리, 끝나면 다시 흡수돼요."
      tier={3}
      control={
        <Seg
          value={split ? 'split' : 'one'}
          onChange={(v) => setSplit(v === 'split')}
          options={[{ v: 'one', label: '단일' }, { v: 'split', label: '분리' }]}
        />
      }
    >
      <div className="am-stage am-stage--dark di-split-stage">
        <div className={`di-goo${split ? ' on' : ''}`}>
          <span className="di-goo__main" />
          <span className="di-goo__dot">
            <MessageCircle size={15} />
          </span>
        </div>
        <svg width="0" height="0" aria-hidden>
          <filter id="a-di-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -11" />
          </filter>
        </svg>
      </div>
    </DemoCard>
  )
}

/* #3 Minimal 점 → Compact 확대 (scale 스프링 + 지연 페이드인) */
function DIMinimal() {
  const [open, setOpen] = useState(false)
  return (
    <DemoCard
      title="최소 점 → 알약 승격"
      desc="작은 점을 탭하면 스프링 scale로 부풀며 알약이 되고, 글리프가 80ms 지연으로 페이드인해요."
      tier={1}
      control={
        <Seg
          value={open ? 'c' : 'm'}
          onChange={(v) => setOpen(v === 'c')}
          options={[{ v: 'm', label: '점' }, { v: 'c', label: '알약' }]}
        />
      }
    >
      <div className="am-stage am-stage--dark di-min-stage">
        <button
          className={`di-min${open ? ' on' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="최소 점 토글"
        >
          <span className="di-min__glyph"><Phone size={15} fill="currentColor" /></span>
          <span className="di-min__glyph di-min__glyph--txt">통화 02:14</span>
        </button>
      </div>
    </DemoCard>
  )
}

/* #4 Incoming — 종류별 실제 콘텐츠 (타이머 링 / 통화 파형 / 길안내 화살표) */
type Kind = 'timer' | 'call' | 'nav'
function DIIncoming() {
  const order: Kind[] = ['timer', 'call', 'nav']
  const [idx, setIdx] = useState(-1)
  const kind = idx >= 0 ? order[idx % order.length] : null
  return (
    <DemoCard
      title="인커밍 — 카메라에서 벌어짐"
      desc="타이머·통화·길안내가 시작되면 알약이 카메라에서 좌우로 넓어지고, 종류별로 다른 콘텐츠가 튀어 들어와요."
      tier={1}
      control={<button className="am-mini-btn" onClick={() => setIdx((p) => p + 1)}>다음 이벤트</button>}
    >
      <div className="am-stage am-stage--dark di-in-stage">
        {kind && (
          <div className={`di-in di-in--${kind}`} key={idx}>
            {kind === 'timer' && (
              <>
                <span className="di-in__ic timer">
                  <svg viewBox="0 0 36 36" width="24" height="24" aria-hidden>
                    <circle cx="18" cy="18" r="15" className="di-in__ring-bg" />
                    <circle cx="18" cy="18" r="15" className="di-in__ring" />
                  </svg>
                </span>
                <span className="di-in__label">타이머</span>
                <span className="di-in__val">04:59</span>
              </>
            )}
            {kind === 'call' && (
              <>
                <span className="di-in__ic call"><Phone size={15} fill="currentColor" /></span>
                <span className="di-in__label">통화 중</span>
                <span className="di-in__eq" aria-hidden><i /><i /><i /><i /></span>
              </>
            )}
            {kind === 'nav' && (
              <>
                <span className="di-in__ic nav"><Navigation size={14} fill="currentColor" /></span>
                <span className="di-in__label">우회전</span>
                <span className="di-in__val">120m</span>
              </>
            )}
          </div>
        )}
      </div>
    </DemoCard>
  )
}

/* #5 Live Activity in-place — 방향성 숫자 롤 + 득점 플래시 */
function DILive() {
  const [score, setScore] = useState({ h: 2, a: 1 })
  const [flash, setFlash] = useState<'h' | 'a' | null>(null)
  const goal = () => {
    setScore((s) => {
      if (s.h + s.a >= 6) return { h: 0, a: 0 }
      const home = Math.random() > 0.5
      setFlash(home ? 'h' : 'a')
      return home ? { ...s, h: s.h + 1 } : { ...s, a: s.a + 1 }
    })
  }
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(t)
  }, [flash])
  return (
    <DemoCard
      title="라이브 업데이트 (in-place)"
      desc="점수가 바뀌면 크기 변화 없이 숫자만 오도미터처럼 굴러요. 득점한 팀 숫자가 잠깐 강조돼요."
      tier={1}
      control={<button className="am-mini-btn" onClick={goal}>득점</button>}
    >
      <div className="am-stage am-stage--dark di-live-stage">
        <div className="di-live">
          <span className={`di-live__team${flash === 'h' ? ' flash' : ''}`}>HOM</span>
          <Roll value={score.h} flash={flash === 'h'} />
          <span className="di-live__sep">:</span>
          <Roll value={score.a} flash={flash === 'a'} />
          <span className={`di-live__team${flash === 'a' ? ' flash' : ''}`}>AWY</span>
        </div>
      </div>
    </DemoCard>
  )
}

/* 세로 숫자 롤 — 스택된 0~9를 translateY로 밀어 바뀐 자리만 굴린다. */
function Roll({ value, flash }: { value: number; flash?: boolean }) {
  return (
    <span className={`roll${flash ? ' flash' : ''}`} aria-label={String(value)}>
      <span className="roll__col" style={{ transform: `translateY(${-value * 10}%)` }}>
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  )
}

/* #6 Expanded 프레스 블룸 — 버튼 개별 flex (손끝만 반응) + 카드 미세 스쿼시 */
function DIBloom() {
  const [pressed, setPressed] = useState<string | null>(null)
  const btns = [
    { id: 'pause', label: '일시정지' },
    { id: 'cancel', label: '취소' },
  ]
  return (
    <DemoCard
      title="프레스 블룸 + 눌림"
      desc="확장 카드의 버튼을 누르면 그 버튼만 손끝에서 flex하고, 카드 전체는 아주 미세하게 스쿼시돼요. 햅틱 동기 감."
      tier={1}
    >
      <div className="am-stage am-stage--dark di-bloom-stage">
        <div className={`di-bloom${pressed ? ' active' : ''}`}>
          <span className="di-bloom__row">
            <span className="di-bloom__art" />
            <span className="di-bloom__meta">
              <b>타이머</b>
              <span>04:20 남음</span>
            </span>
          </span>
          <span className="di-bloom__btns">
            {btns.map((b) => (
              <button
                key={b.id}
                className={`di-bloom__btn${pressed === b.id ? ' down' : ''}`}
                onPointerDown={() => setPressed(b.id)}
                onPointerUp={() => setPressed(null)}
                onPointerLeave={() => setPressed(null)}
              >
                {b.label}
              </button>
            ))}
          </span>
        </div>
      </div>
    </DemoCard>
  )
}

export default function GroupA() {
  return (
    <section className="am-group" id="am-a">
      <div className="am-group__head">
        <span className="am-group__kicker">A</span>
        <span className="am-group__title">다이나믹 아일랜드</span>
        <span className="am-group__count">6</span>
      </div>
      <div className="am-grid">
        <DIExpand />
        <DISplit />
        <DIMinimal />
        <DIIncoming />
        <DILive />
        <DIBloom />
      </div>
    </section>
  )
}

/* 주기 틱 훅 — 이벤트 데모의 자동 반복용(현재 미사용, 향후 확장) */
export function useTick(active: boolean, ms: number, fn: () => void) {
  const saved = useRef(fn)
  saved.current = fn
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => saved.current(), ms)
    return () => clearInterval(id)
  }, [active, ms])
}
