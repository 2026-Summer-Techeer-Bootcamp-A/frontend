import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Compass, Send, SlidersHorizontal } from 'lucide-react'
import { SCENARIOS } from './fixtures'
import PipelineRail from './PipelineRail'
import ToolLane from './ToolLane'
import CitationLedger from './CitationLedger'
import './rag-console.css'

export default function RagConsole() {
  const [idx, setIdx] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)   // 사고 트레이스 진행
  const [segIdx, setSegIdx] = useState(0)         // 답변 세그먼트 진행
  const [dissect, setDissect] = useState(false)   // 해부 모드
  const [runId, setRunId] = useState(0)
  const timers = useRef<number[]>([])

  const scn = SCENARIOS[idx]
  const res = scn.response
  const streaming = stepIndex >= res.steps.length
  const done = streaming && segIdx >= res.answer.length
  // 근거 카드는 tool 단계가 드러난 뒤부터 노출하고, 그 뒤로는 memo로 고정돼 다시 안 그려진다.
  const showTools = res.steps.slice(0, stepIndex + 1).some((s) => s.kind === 'tool')

  const play = (i: number) => { setIdx(i); setRunId((n) => n + 1) }

  useEffect(() => {
    setStepIndex(0); setSegIdx(0)
    timers.current.forEach(clearTimeout)
    timers.current = []
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  // 사고 트레이스: 단계가 하나씩 떠오른다
  useEffect(() => {
    if (stepIndex >= res.steps.length) return
    const t = window.setTimeout(() => setStepIndex((n) => n + 1), 560)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [stepIndex, res.steps.length])

  // 답변: 세그먼트가 하나씩 왼쪽부터 페이드로 나타난다(타이핑 아님)
  useEffect(() => {
    if (!streaming) return
    if (segIdx >= res.answer.length) return
    const t = window.setTimeout(() => setSegIdx((n) => n + 1), 720)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [streaming, segIdx, res.answer.length])

  return (
    <div className={`rc${dissect ? ' rc--dissect' : ''}`}>
      <div className="rc__head">
        <div className="rc__id"><span className="rc__avatar"><Compass size={16} /></span>
          <div><div className="rc__nm">커리어 어시스턴트</div>
            <div className="rc__st">{done ? '데이터 기반 응답' : streaming ? '답변 합성 중…' : '파이프라인 실행 중…'}</div></div>
        </div>
        <button className={`rc__mode${dissect ? ' on' : ''}`} onClick={() => setDissect((v) => !v)}>
          <SlidersHorizontal size={14} /> {dissect ? '해부 모드' : '관찰 모드'}
        </button>
      </div>

      <div className="rc__body">
        <div className="rc__q">{scn.userQ}</div>

        {dissect && (
          <pre className="rc__plan">{JSON.stringify(res.plan, null, 2)}</pre>
        )}

        <PipelineRail steps={res.steps} activeIndex={Math.min(stepIndex, res.steps.length - 1)} />

        {showTools && <ToolLane results={res.tool_results} />}

        {streaming && (
          <div className="rc__answer">
            {res.answer.map((seg, i) => {
              if (i > segIdx) return null
              const words = seg.text.split(' ')
              return (
                <p className="rc__seg" key={i}>
                  {words.map((w, wi) => (
                    <span className="rc__w" key={wi} style={{ animationDelay: `${wi * 26}ms` }}>{w}</span>
                  ))}
                  {i < segIdx && <span className="rc__cite"><span className="dot" />{seg.cite}</span>}
                </p>
              )
            })}
          </div>
        )}

        {done && <CitationLedger citations={res.citations} confidence={res.confidence} degraded={res.degraded} />}
      </div>

      <div className="rc__composer">
        <div className="rc__input"><input readOnly value={scn.userQ} />
          <button className="rc__send" onClick={() => play(idx)}><Send size={16} /></button></div>
        <div className="rc__chips">
          {SCENARIOS.map((s, i) => (
            <button key={s.id} className={`rc__chip${i === idx ? ' active' : ''}`} onClick={() => play(i)}>
              {s.chipLabel} <ChevronRight size={13} className="chev" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
