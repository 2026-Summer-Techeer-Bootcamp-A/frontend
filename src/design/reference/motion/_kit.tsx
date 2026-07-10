import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

/* 애플 모션 쇼케이스 공용 킷.
   54개 데모를 짧고 일관되게 만들기 위한 카드/세그먼트/틸트 프리미티브.
   철학: 장식 X, 물리·촉감 O. 스프링은 DS 토큰과 동일(살짝 오버슈트), 짧게. */

/* 구현 난이도 티어 — 정직성: Tier 3은 웹에선 "근사치"임을 배지로 명시. */
export type Tier = 1 | 2 | 3

export function DemoCard({
  title,
  desc,
  tier,
  control,
  wide,
  children,
}: {
  title: string
  desc: string
  tier?: Tier
  control?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`am-card${wide ? ' am-card--wide' : ''}`}>
      <div className="am-card__head">
        <div>
          <div className="am-card__title">
            {title}
            {tier && (
              <span className={`am-tier am-tier--${tier}`} title={tierNote(tier)}>
                {tier === 3 ? '근사' : `T${tier}`}
              </span>
            )}
          </div>
          <div className="am-card__desc">{desc}</div>
        </div>
        {control}
      </div>
      {children}
    </div>
  )
}

function tierNote(t: Tier) {
  return t === 1
    ? '고충실 재현 가능'
    : t === 2
      ? '시그니처 룩, 재현 가능'
      : '웹에선 근사치 — 진짜 렌징/틴트/패스모프는 네이티브 전용'
}

/* 미니 세그먼트 토글 */
export function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { v: T; label: string }[]
  label?: string
}) {
  return (
    <div className="am-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* 포인터 기반 틸트 — 자이로(deviceorientation)의 데스크톱 대체.
   반환 tilt: 0~1 정규화 좌표(중앙=0.5). specular/패럴럭스 데모에서 공유. */
export function usePointerTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 })
  const onPointerMove = (e: { clientX: number; clientY: number }) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setTilt({
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    })
  }
  const reset = () => setTilt({ x: 0.5, y: 0.5 })
  return { ref, tilt, onPointerMove, reset }
}

/* 한 번 트리거 후 자동 리셋되는 원샷 재생 훅 — SF Symbols 등 "다시 재생" 데모용. */
export function useReplay(ms = 900): [number, () => void] {
  const [key, setKey] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const play = () => {
    setKey((k) => k + 1)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {}, ms)
  }
  return [key, play]
}
