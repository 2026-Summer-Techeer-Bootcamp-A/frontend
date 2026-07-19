import { useEffect, useState, type RefObject } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useCountUp } from '../../../career/kit'
import { usePrefersReducedMotion } from '../../../shared/useMediaQuery'

/** 2c 발표 오토 투어 — 발표 모드를 누르면 히어로 → 내 시장 진단 → 워크플로우 맵 순서로
 * 스포트라이트가 자동으로 이동하며 각 존의 핵심 수치를 캡션으로 보여준다. 기존 위젯 코드는
 * 건드리지 않고(리마운트 없음) 대상 요소의 getBoundingClientRect만 읽어 오버레이를 그 위에
 * 얹는다. 숫자 카운트업은 이 컴포넌트 자체의 캡션 텍스트에서만 재생된다. */
export type TourCaption = {
  title: string
  value: number | null
  unit?: string
  /** 숫자 카운트업 대신 강조할 텍스트(예: 추천 스킬명). value가 null일 때만 쓰인다. */
  textValue?: string
  sub?: string
  emptyText?: string
}
export type TourZone = {
  key: string
  ref: RefObject<HTMLElement | null>
  stepLabel: string
  caption: TourCaption
}

const ZONE_MS = 4000
const SPOT_PAD = 10
const PANEL_WIDTH = 320

function useSpotlightRect(open: boolean, target: HTMLElement | null | undefined) {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!open) return
    let raf = 0
    const onTick = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; bump((n) => n + 1) })
    }
    window.addEventListener('scroll', onTick, true)
    window.addEventListener('resize', onTick)
    return () => {
      window.removeEventListener('scroll', onTick, true)
      window.removeEventListener('resize', onTick)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [open])
  if (!open || !target) return null
  return target.getBoundingClientRect()
}

export function PresentationTour({ open, onClose, zones }: { open: boolean; onClose: () => void; zones: TourZone[] }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const zone = zones[stepIndex] ?? null

  // 발표 모드가 새로 열릴 때마다 처음(히어로)부터 시작한다.
  useEffect(() => { if (open) { setStepIndex(0); setPaused(false) } }, [open])

  // 스텝 전환 시 해당 존이 화면 중앙에 오도록 스크롤한다. zones는 부모 렌더마다 새 배열
  // 인스턴스일 수 있어 의도적으로 stepIndex/open에만 반응시킨다(ref 자체는 안정적).
  useEffect(() => {
    if (!open || !zone?.ref.current) return
    zone.ref.current.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex])

  // 자동 진행 타이머 — 일시정지 중엔 멈추고, 재개하면 그 스텝부터 다시 4초를 센다.
  useEffect(() => {
    if (!open || paused || zones.length <= 1) return
    const id = window.setTimeout(() => setStepIndex((i) => (i + 1) % zones.length), ZONE_MS)
    return () => window.clearTimeout(id)
  }, [open, stepIndex, paused, zones.length])

  // Escape로 종료.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const rect = useSpotlightRect(open, zone?.ref.current)
  const countUpValue = useCountUp(zone?.caption.value ?? 0, 900)

  if (!open || !zone || !rect) return null

  const spotStyle: React.CSSProperties = {
    top: rect.top - SPOT_PAD,
    left: rect.left - SPOT_PAD,
    width: rect.width + SPOT_PAD * 2,
    height: rect.height + SPOT_PAD * 2,
  }
  const spaceBelow = window.innerHeight - rect.bottom
  const placeAbove = spaceBelow < 220 && rect.top > 240
  const centerX = rect.left + rect.width / 2
  const clampedX = Math.min(Math.max(centerX, PANEL_WIDTH / 2 + 16), window.innerWidth - PANEL_WIDTH / 2 - 16)
  const panelStyle: React.CSSProperties = {
    left: clampedX,
    top: placeAbove ? rect.top - SPOT_PAD - 12 : rect.bottom + SPOT_PAD + 12,
    transform: `translate(-50%, ${placeAbove ? '-100%' : '0'})`,
  }
  const shownValue = reducedMotion ? zone.caption.value ?? 0 : countUpValue

  return (
    <div className="dov-tour" onClick={onClose} role="presentation">
      <div className="dov-tour__spot" style={spotStyle} />
      <div className="dov-tour__panel" style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <span className="dov-tour__steplabel">{zone.stepLabel}</span>
        <div key={zone.key} className="dov-tour__caption">
          <div className="dov-tour__ctitle">{zone.caption.title}</div>
          {zone.caption.value != null ? (
            <div className="dov-tour__cnum tnum">{shownValue.toLocaleString()}{zone.caption.unit && <span>{zone.caption.unit}</span>}</div>
          ) : zone.caption.textValue ? (
            <div className="dov-tour__ctext">{zone.caption.textValue}</div>
          ) : (
            <div className="dov-tour__cempty">{zone.caption.emptyText ?? '데이터가 없어요.'}</div>
          )}
          {zone.caption.sub && <div className="dov-tour__csub">{zone.caption.sub}</div>}
        </div>
        <div className="dov-tour__controls">
          <div className="dov-tour__dots">
            {zones.map((z, i) => (
              <button
                key={z.key}
                type="button"
                className={`dov-tour__dot${i === stepIndex ? ' on' : ''}`}
                aria-label={`${z.stepLabel}로 이동`}
                aria-current={i === stepIndex}
                onClick={() => setStepIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="dov-tour__pausebtn"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? '발표 모드 재생' : '발표 모드 일시정지'}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button type="button" className="dov-tour__closebtn" onClick={onClose} aria-label="발표 모드 종료">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
