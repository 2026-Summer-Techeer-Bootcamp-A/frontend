import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ChevronRight, Compass, RotateCcw, Send } from 'lucide-react'
import { SCENARIOS } from './demoScenarios'
import { streamChat } from './chatStream'
import { normalizeStreamResult } from './chatContract'
import type { Citation, Confidence, Plan, Route, ToolResult, StreamStepKind } from './chatContract'
import AssistantVisualizer from './AssistantVisualizer'
import EngineFlowLog from './EngineFlowLog'
import { routeLabel, intentLabel } from './chatLabels'
import { useAuth } from '../career/authStore'
import './rag-console.css'

// 실 백엔드(POST /api/v1/chat/stream) 라이브 스트리밍 콘솔.
// plan → step(tool/eval/synth) → result → final 프레임이 도착하는 즉시 상태에 반영해서,
// 전체 응답이 끝나야 뭔가 보이는 게 아니라 파이프라인이 실제로 진행되는 걸 그대로 보여준다.
// 기본 모드: 답변 + 인용 + 신뢰도 + 자동 선택된 차트. 모든 과정 보기: 사용자 입력이 라우팅·도구
// 호출(어떤 모델·DB를 건드렸는지)·평가·종합으로 흘러가는 과정을 로그로 그대로 노출(개발자용).
// 데모 시나리오는 가짜 답변을 재생하지 않는다 — 칩은 실제 질문을 보내는 시드일 뿐이다.

type Mode = 'basic' | 'log'
type TurnStatus = 'loading' | 'done' | 'error'

interface StepEntry {
  kind: StreamStepKind
  tool?: string
  label: string
  detail?: string
  durationMs?: number | null
  debug?: Record<string, unknown> | null
}

interface FinalPayload {
  answer: string
  citations: Citation[]
  confidence: Confidence
  degraded: boolean
  degradedReasons: string[]
  totalDurationMs?: number | null
}

interface Turn {
  id: number
  question: string
  status: TurnStatus
  route?: Route
  plan?: Plan
  planDurationMs?: number | null
  planDebug?: Record<string, unknown> | null
  steps: StepEntry[]
  results: ToolResult[]
  final?: FinalPayload
  error?: string
}

let nextTurnId = 1

export default function RagConsole() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [mode, setMode] = useState<Mode>('basic')
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  // 빈 상태 그리팅을 로그인 여부에 따라 개인화하는 데만 쓴다.
  const { user, isAuthed } = useAuth()

  const busy = turns.some((t) => t.status === 'loading')

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  const patchTurn = (id: number, patch: Partial<Turn> | ((t: Turn) => Partial<Turn>)) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)))
  }

  const runTurn = (id: number, question: string, verbose: boolean) => {
    streamChat(question, undefined, verbose, {
      onPlan: (e) => patchTurn(id, { route: e.route, plan: e.plan, planDurationMs: e.duration_ms, planDebug: e.debug }),
      onStep: (e) =>
        patchTurn(id, (t) => ({
          steps: [...t.steps, { kind: e.kind, tool: e.tool, label: e.label, detail: e.detail, durationMs: e.duration_ms, debug: e.debug }],
        })),
      onResult: (e) => patchTurn(id, (t) => ({ results: [...t.results, normalizeStreamResult(e.result)] })),
      onFinal: (e) =>
        patchTurn(id, {
          status: 'done',
          final: {
            answer: e.answer,
            citations: e.citations,
            confidence: e.confidence,
            degraded: e.degraded,
            degradedReasons: e.degraded_reasons,
            totalDurationMs: e.total_duration_ms,
          },
          error: undefined,
        }),
      onError: (message) => patchTurn(id, { status: 'error', error: message }),
    }).then(() => {
      // final도 error도 없이 스트림이 그냥 끝난 경우(연결이 조용히 끊긴 케이스) 대비.
      patchTurn(id, (t) => (t.status === 'loading' ? { status: 'error', error: '스트림이 예기치 않게 끊겼어요.' } : {}))
    })
  }

  const submit = (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    const id = nextTurnId++
    setTurns((prev) => [...prev, { id, question: q, status: 'loading', steps: [], results: [] }])
    runTurn(id, q, mode === 'log')
  }

  const retry = (turn: Turn) => {
    patchTurn(turn.id, { status: 'loading', error: undefined, route: undefined, plan: undefined, steps: [], results: [], final: undefined })
    runTurn(turn.id, turn.question, mode === 'log')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(input)
    setInput('')
  }

  const status = busy ? '답변 작성 중' : turns.length ? '대기 중' : '질문을 기다리는 중'

  return (
    <div className="rc">
      <div className="rc__head">
        <span className="rc__avatar"><Compass size={15} /></span>
        <div>
          <div className="rc__nm">커리어 어시스턴트</div>
          <div className={`rc__st${busy ? ' rc__st--live' : ''}`}>{status}</div>
        </div>
      </div>

      <div className="rc__toolbar">
        <span className="rc__toolbar-label">대화</span>
        <div className="rc__seg" role="group" aria-label="답변 과정 표시 수준">
          <button type="button" aria-pressed={mode === 'basic'} onClick={() => setMode('basic')}>기본</button>
          <button type="button" aria-pressed={mode === 'log'} onClick={() => setMode('log')}>모든 과정 보기</button>
        </div>
      </div>

      <div className="rc__body" ref={bodyRef}>
        {turns.length === 0 && (
          <RcEmptyState isAuthed={isAuthed} nickname={user?.nickname} busy={busy} onPick={submit} />
        )}
        {turns.map((turn) => (
          <TurnBlock key={turn.id} turn={turn} mode={mode} onRetry={() => retry(turn)} />
        ))}
      </div>

      <form className="rc__composer" onSubmit={handleSubmit}>
        <div className="rc__input">
          <input
            value={input}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="채용 시장에 대해 무엇이든 물어보세요"
            disabled={busy}
          />
          <button className="rc__send" type="submit" disabled={busy || !input.trim()} aria-label="질문 보내기">
            <Send size={16} />
          </button>
        </div>
        {/* 빈 상태에서는 rc__hero의 추천 카드가 같은 역할을 하므로, 대화가 시작된 뒤에만 하단 칩을 보여준다. */}
        {turns.length > 0 && (
          <div className="rc__chips">
            {SCENARIOS.map((s) => (
              <button key={s.id} type="button" className="rc__chip" onClick={() => submit(s.userQ)} disabled={busy}>
                {s.chip} <ChevronRight size={13} className="chev" />
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}

// 빈 상태(첫 화면) 그리팅 + 추천 질문 카드. 로그인 여부에 따라 문구만 갈라지고,
// 카드 문구는 하단 rc__chips와 동일하게 SCENARIOS를 그대로 재사용한다(하드코딩 중복 금지).
interface RcEmptyStateProps {
  isAuthed: boolean
  nickname: string | null | undefined
  busy: boolean
  onPick: (question: string) => void
}

function RcEmptyState({ isAuthed, nickname, busy, onPick }: RcEmptyStateProps) {
  // 로그인 상태면 닉네임(없으면 '리버')으로 개인화하고, 비로그인이면 완전히 중립적인 문구로 대체한다.
  const greeting = isAuthed
    ? `${nickname ?? '리버'}님, 오늘은 뭘 볼까요?`
    : '채용 시장에 대해 무엇이든 물어보세요'

  return (
    <div className="rc__hero">
      <span className="rc__hero-badge"><Compass size={20} /></span>
      <div className="rc__hero-greet">{greeting}</div>
      <div className="rc__hero-sub">채용 시장, 이력서, 기술 트렌드 — 실제 데이터로 답해드려요.</div>
      <div className="rc__suggest">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="rc__suggest-card"
            onClick={() => onPick(s.userQ)}
            disabled={busy}
          >
            <span className="rc__suggest-text">
              <span className="rc__suggest-title">{s.chip}</span>
              <span className="rc__suggest-q">{s.userQ}</span>
            </span>
            <ChevronRight size={14} className="rc__suggest-chev" />
          </button>
        ))}
      </div>
    </div>
  )
}

// 기본 모드에서 보여줄 진행 단계 목록. step.label이 없는 경우(방어적으로만 발생)를 대비한 kind별 대체 문구.
const PHASE_LABEL: Record<StreamStepKind, string> = {
  tool: '도구 조회 중…',
  eval: '근거 검증 중…',
  synth: '답변 작성 중…',
}

// "모든 과정 보기"의 상세 디버그 로그(EngineFlowLog)와 달리, 기본 모드는 도착한 step을 그대로
// 한 줄씩 쌓아 보여준다 — 오래 걸리는 질문일수록 지금 뭘 하고 있는지 텍스트로 계속 보여야 한다.
// 가장 마지막 줄만 진행 중(펄스)으로, 그 앞줄들은 이미 끝난 단계로 옅게 표시한다.
function LiveSteps({ turn }: { turn: Turn }) {
  const rows = turn.steps.map((s) => s.label || PHASE_LABEL[s.kind] || '처리 중…')
  if (rows.length === 0) rows.push(turn.plan ? '도구 조회 중…' : '계획 중…')

  return (
    <div className="rc__think" aria-live="polite">
      {rows.map((label, i) => (
        <div className={`rc__think-line${i === rows.length - 1 ? ' is-active' : ''}`} key={i}>
          <span className="rc__think-dot" />
          <span className="rc__think-text">{label}</span>
        </div>
      ))}
    </div>
  )
}

function TurnBlock({ turn, mode, onRetry }: { turn: Turn; mode: Mode; onRetry: () => void }) {
  const nothingYet = !turn.plan && turn.steps.length === 0 && turn.status === 'loading'

  return (
    <div className="rc__turn">
      <div className="rc__q">{turn.question}</div>

      {/* plan 프레임 도착 즉시(진행 중이든 완료든) 라우트·의도를 바로 보여준다 */}
      {turn.plan && turn.route && (
        <div className="rc__meta">
          <span className={`rc__route rc__route--${turn.route}`}>{routeLabel(turn.route)}</span>
          <span className="rc__badge rc__badge--intent">{intentLabel(turn.plan.intent)}</span>
          {turn.final?.degraded && <span className="rc__degraded">근거가 얕아 규칙 기반으로 보완됐어요</span>}
        </div>
      )}

      {nothingYet && (
        <div className="rc__skeleton" aria-live="polite" aria-busy="true">
          <span className="rc__skel-line" style={{ width: '86%' }} />
          <span className="rc__skel-line" style={{ width: '64%' }} />
          <span className="rc__skel-line" style={{ width: '72%' }} />
        </div>
      )}

      {mode === 'basic' && turn.status === 'loading' && !nothingYet && <LiveSteps turn={turn} />}

      {mode === 'basic' && turn.results.length > 0 && (
        <AssistantVisualizer results={turn.results} route={turn.route} />
      )}

      {mode === 'log' && (turn.plan || turn.steps.length > 0) && (
        <EngineFlowLog
          question={turn.question}
          route={turn.route}
          plan={turn.plan}
          planDurationMs={turn.planDurationMs}
          planDebug={turn.planDebug}
          steps={turn.steps}
          results={turn.results}
          citations={turn.final?.citations}
          confidence={turn.final?.confidence}
          degradedReasons={turn.final?.degradedReasons}
          totalDurationMs={turn.final?.totalDurationMs}
        />
      )}

      {mode === 'log' && turn.results.length > 0 && (
        <div className="rc__ev-group">
          <div className="rc__ev-k">도구 결과</div>
          <div className="rc__tool-results">
            {turn.results.map((r, i) => <ToolResultCard key={i} result={r} />)}
          </div>
        </div>
      )}

      {turn.status === 'error' && (
        <div className="rc__error">
          <span className="rc__error-text">{turn.error ?? '답변을 가져오지 못했어요.'}</span>
          <button type="button" className="rc__retry" onClick={onRetry}>
            <RotateCcw size={13} /> 다시 시도
          </button>
        </div>
      )}

      {turn.status === 'done' && turn.final && <FinalBlock final={turn.final} mode={mode} />}
    </div>
  )
}

// 백엔드가 내려주는 제한된 마크다운 서브셋(문단, **굵게**, - 목록)만 실제 React 엘리먼트로 직접
// 빌드한다. HTML 문자열을 거치지 않으므로(marked, dangerouslySetInnerHTML 등 배제) LLM 출력에
// 프롬프트 인젝션이 섞여도 주입 표면 자체가 존재하지 않는다.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
      : <span key={`${keyPrefix}-${i}`}>{part}</span>
  )
}

function renderAnswerMarkdown(answer: string): React.ReactNode[] {
  const blocks = answer.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return blocks.map((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const isList = lines.length > 0 && lines.every((l) => l.startsWith('- '))
    if (isList) {
      return (
        <ul key={`b-${bi}`}>
          {lines.map((l, li) => <li key={`b-${bi}-${li}`}>{renderInline(l.slice(2), `b-${bi}-${li}`)}</li>)}
        </ul>
      )
    }
    return <p key={`b-${bi}`}>{renderInline(lines.join(' '), `b-${bi}`)}</p>
  })
}

function FinalBlock({ final, mode }: { final: FinalPayload; mode: Mode }) {
  const confLabel = final.confidence.level >= 4 ? '높음' : final.confidence.level >= 2 ? '보통' : '낮음'
  const dots = Array.from({ length: 5 }, (_, i) => i < final.confidence.level)

  return (
    <div className="rc__out">
      <div className="rc__answer">
        {final.answer.trim()
          ? renderAnswerMarkdown(final.answer)
          : <p>답변 내용이 비어 있어요.</p>}
      </div>

      <div className="rc__evidence">
        <div className="rc__ev-head">이 답변의 근거</div>

        <div className="rc__ev-group">
          <div className="rc__ev-k">인용한 근거 ({final.citations.length})</div>
          {final.citations.length === 0 ? (
            <div className="rc__citerow-empty">이번 답변에는 특정 인용이 없어요.</div>
          ) : (
            <div className="rc__citerows">
              {final.citations.map((c, i) => (
                <div className="rc__citerow" key={i}>
                  <span className="rc__citerow-n">[{i + 1}]</span>
                  <span className="rc__citerow-body">
                    <span className="rc__citerow-t">{c.label}</span>
                    <span className="rc__citerow-tag">{c.type} · {c.ref}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rc__ev-group">
          <div className="rc__ev-k">신뢰도</div>
          <div className="rc__conf">
            <span className="rc__dots">{dots.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</span>
            <div className="rc__conf-txt">
              <div className="rc__conf-v">{confLabel}</div>
              <div className="rc__conf-n">{final.confidence.n.toLocaleString()}건 표본 기반</div>
            </div>
          </div>
        </div>

        {mode === 'basic' && (
          <div className="rc__basic-hint">데이터 출처 · 답변 과정은 상단 <b>모든 과정 보기</b>에서 열려요.</div>
        )}
      </div>
    </div>
  )
}

// tool_results는 kind가 다양해도 실제로 채워진 필드(items/value/nodes)를 기준으로 렌더링한다.
// list·trend·compare 모두 items[] 랭크드 로우로, stat은 큰 숫자로, graph는 노드·엣지 요약으로 대체한다.
function ToolResultCard({ result }: { result: ToolResult }) {
  if (result.items.length > 0) return <RankedRows result={result} />
  if (result.kind === 'graph' && (result.nodes.length > 0 || result.edges.length > 0)) return <GraphSummary result={result} />
  if (result.value !== undefined && result.value !== null) return <StatBig result={result} />
  return (
    <div className="rc__tr">
      <div className="rc__tr-label">{result.label}</div>
    </div>
  )
}

// metric 문자열("408건", "22.7%")에서 숫자만 뽑아낸다. 못 찾으면 null.
function parseMetricNumber(metric?: string): number | null {
  if (!metric) return null
  const m = metric.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function RankedRows({ result }: { result: ToolResult }) {
  const pctMax = Math.max(0, ...result.items.map((it) => it.pct ?? 0))
  const metricMax = Math.max(0, ...result.items.map((it) => parseMetricNumber(it.metric) ?? 0))

  // pct가 있으면 pct 기준, 없으면(백엔드가 pct를 못 채운 예외 상황) metric에서 숫자를 뽑아
  // 형제 항목들의 최댓값 대비 비율로 막대 폭을 대신 계산한다 — 막대가 아예 안 보이는 걸 막는 방어선.
  const widthFor = (it: ToolResult['items'][number]) => {
    if (it.pct !== undefined) return pctMax > 0 ? Math.min(100, (it.pct / pctMax) * 100) : 0
    const n = parseMetricNumber(it.metric)
    if (n !== null && metricMax > 0) return Math.min(100, (n / metricMax) * 100)
    return 0
  }

  return (
    <div className="rc__tr">
      <div className="rc__tr-label">{result.label}</div>
      <div className="rc__minichart">
        {result.items.map((it, i) => (
          <div className="rc__mc-row" key={i}>
            <span className="rc__mc-label">{it.name}</span>
            <span className="rc__mc-track">
              <span className="rc__mc-fill" style={{ width: `${widthFor(it)}%` }} />
            </span>
            <span className="rc__mc-val">{it.metric ?? (it.pct !== undefined ? `${it.pct}%` : '')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBig({ result }: { result: ToolResult }) {
  return (
    <div className="rc__tr">
      <div className="rc__tr-label">{result.label}</div>
      <div className="rc__stat">
        <span className="rc__stat-big">{result.value}</span>
        {result.unit && <span className="rc__stat-unit">{result.unit}</span>}
      </div>
    </div>
  )
}

function GraphSummary({ result }: { result: ToolResult }) {
  const nodeLabels = result.nodes
    .map((n) => (typeof n.label === 'string' ? n.label : typeof n.name === 'string' ? n.name : typeof n.id === 'string' ? n.id : null))
    .filter((v): v is string => !!v)
    .slice(0, 8)
  return (
    <div className="rc__tr">
      <div className="rc__tr-label">{result.label}</div>
      <div className="rc__graph-meta">노드 {result.nodes.length}개 · 연결 {result.edges.length}개</div>
      {nodeLabels.length > 0 && (
        <div className="rc__badges">
          {nodeLabels.map((l, i) => <span className="rc__badge" key={i}>{l}</span>)}
        </div>
      )}
    </div>
  )
}
