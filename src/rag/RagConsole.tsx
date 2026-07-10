import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Compass, Send, Terminal } from 'lucide-react'
import { SCENARIOS } from './demoScenarios'
import VizChart from './VizChart'
import './rag-console.css'

// Gemini / Claude Code / Codex 느낌 — 프롬프트를 받고 생각 → 쿼리 → 답변으로 부드럽게 흐른다.
// 라벨 붙은 파이프라인 단계나 순회 서브그래프를 노출하지 않는다. 과정은 담담한 사고 문장으로 흘리고,
// 근거는 시나리오별 정적 차트 하나로 조용히 붙인다.

export default function RagConsole() {
  const [idx, setIdx] = useState(0)
  const [ti, setTi] = useState(0)        // 드러난 사고 문장 수
  const [queried, setQueried] = useState(false)
  const [segIdx, setSegIdx] = useState(0)
  const [runId, setRunId] = useState(0)
  const timers = useRef<number[]>([])

  const scn = SCENARIOS[idx]
  const thinkingDone = ti >= scn.thinking.length
  const answering = queried
  const done = queried && segIdx >= scn.answer.length

  const play = (i: number) => { setIdx(i); setRunId((n) => n + 1) }

  useEffect(() => {
    setTi(0); setQueried(false); setSegIdx(0)
    timers.current.forEach(clearTimeout)
    timers.current = []
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  // 생각: 사고 문장이 하나씩 부드럽게 떠오른다 → 다 뜨면 쿼리로
  useEffect(() => {
    if (ti < scn.thinking.length) {
      const t = window.setTimeout(() => setTi((n) => n + 1), 780)
      timers.current.push(t); return () => clearTimeout(t)
    }
    if (!queried) {
      const t = window.setTimeout(() => setQueried(true), 640)
      timers.current.push(t); return () => clearTimeout(t)
    }
  }, [ti, queried, scn.thinking.length])

  // 답변: 세그먼트가 왼쪽부터 페이드로 나타난다(타이핑 아님)
  useEffect(() => {
    if (!answering || segIdx >= scn.answer.length) return
    const t = window.setTimeout(() => setSegIdx((n) => n + 1), 760)
    timers.current.push(t); return () => clearTimeout(t)
  }, [answering, segIdx, scn.answer.length])

  const status = done ? '완료' : answering ? '답변 작성 중' : thinkingDone ? '조회하는 중' : '생각하는 중'
  const level = scn.n >= 500 ? 5 : scn.n >= 200 ? 4 : scn.n >= 50 ? 3 : 2
  const dots = Array.from({ length: 5 }, (_, i) => i < level)

  return (
    <div className="rc">
      <div className="rc__head">
        <span className="rc__avatar"><Compass size={15} /></span>
        <div>
          <div className="rc__nm">커리어 어시스턴트</div>
          <div className={`rc__st${done ? '' : ' rc__st--live'}`}>{status}</div>
        </div>
      </div>

      <div className="rc__body">
        <div className="rc__q">{scn.userQ}</div>

        {/* 생각 — 부드럽게 떠오르는 사고 문장들 */}
        <div className="rc__think">
          {scn.thinking.slice(0, ti).map((step, i) => {
            const active = !thinkingDone && i === ti - 1
            return (
              <div className={`rc__think-line${active ? ' is-active' : ''}`} key={i}>
                <span className="rc__think-dot" />
                <span className="rc__think-text">{step.text}</span>
                <span className="rc__think-res">{step.result}</span>
              </div>
            )
          })}
        </div>

        {/* 쿼리 — 실제로 도는 조회 한 줄 (어떤 도구로 라우팅됐는지 함께) */}
        {queried && (
          <div className="rc__query">
            <Terminal size={12} />
            <span className={`rc__route rc__route--${scn.route}`}>{scn.route}</span>
            <code>{scn.query}</code>
          </div>
        )}

        {/* 답변 + 시각화 */}
        {answering && (
          <div className="rc__out">
            <div className="rc__viz">
              <div className="rc__viz-cap">{scn.vizLabel}</div>
              <VizChart viz={scn.viz} />
            </div>

            <div className="rc__answer">
              {scn.answer.map((seg, i) => {
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

            {done && (
              <div className="rc__foot">
                <span className="rc__dots">{dots.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</span>
                근거 <b>{scn.n.toLocaleString()}</b>건 기반
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rc__composer">
        <div className="rc__input">
          <input readOnly value={scn.userQ} />
          <button className="rc__send" onClick={() => play(idx)} aria-label="다시 실행"><Send size={16} /></button>
        </div>
        <div className="rc__chips">
          {SCENARIOS.map((s, i) => (
            <button key={s.id} className={`rc__chip${i === idx ? ' active' : ''}`} onClick={() => play(i)}>
              {s.chip} <ChevronRight size={13} className="chev" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
