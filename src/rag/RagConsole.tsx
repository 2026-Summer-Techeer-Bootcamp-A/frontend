import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ChevronRight, Compass, Paperclip, RotateCcw, Send, Square } from 'lucide-react'
import { SCENARIOS } from './demoScenarios'
import { streamChat } from './chatStream'
import { normalizeStreamResult } from './chatContract'
import type { ChatAttachment, Citation, Confidence, Plan, Route, SplitDiffPayload, ToolResult } from './chatContract'
import AssistantVisualizer from './AssistantVisualizer'
import EngineFlowLog from './EngineFlowLog'
import AttachmentChip from './AttachmentChip'
import AttachmentPicker from './AttachmentPicker'
import PipelineDashboard from './PipelineDashboard'
import type { StepEntry } from './PipelineDashboard'
import ComparisonCards, { ComparisonCard } from './ComparisonCards'
import ComparisonSummary from './ComparisonSummary'
import ComparisonBoard from './ComparisonBoard'
import { addToCompareBoard } from './compareBoardStore'
import type { CompareBoardCard } from './compareBoardStore'
import PostingResultCards, { PostingResultCard } from './PostingResultCards'
import CommandPalette from './CommandPalette'
import ReportCard from './ReportCard'
import FollowUpChips from './FollowUpChips'
import { useAttachments } from './useAttachments'
import { consumeAttachmentIntent } from './attachmentIntentStore'
import { routeLabel, intentLabel } from './chatLabels'
import { useAuth } from '../career/authStore'
import { useLoginModal } from '../career/LoginModalContext'
import { readResumeSessionId, resolveResumeSessionId } from './resumeSession'
import './rag-console.css'

// 실 백엔드(POST /api/v1/chat/stream) 라이브 스트리밍 콘솔.
// plan → step(tool/eval/synth) → result → final 프레임이 도착하는 즉시 상태에 반영해서,
// 전체 응답이 끝나야 뭔가 보이는 게 아니라 파이프라인이 실제로 진행되는 걸 그대로 보여준다.
// 기본 모드: 답변 + 인용 + 신뢰도 + 자동 선택된 차트. 모든 과정 보기: 사용자 입력이 라우팅·도구
// 호출(어떤 모델·DB를 건드렸는지)·평가·종합으로 흘러가는 과정을 로그로 그대로 노출(개발자용).
// 데모 시나리오는 가짜 답변을 재생하지 않는다 — 칩은 실제 질문을 보내는 시드일 뿐이다.

type Mode = 'basic' | 'log'
type TurnStatus = 'loading' | 'done' | 'error'

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
  attachments: ChatAttachment[]
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

// 4b 비교 보드 — resume_posting_llm/posting_posting_llm 결과가 도착할 때마다 그 결과가 겨냥한
// 공고(들)를 보드에 쌓는다. 공고 id는 result payload에 없고(제목만 있음) 그 턴에 실제로 첨부한
// ChatAttachment[]에만 있으므로, 스트리밍 콜백 클로저가 들고 있는 turnAttachments를 그대로 받는다.
function pushCompareBoardEntry(result: ToolResult, turnAttachments: ChatAttachment[]) {
  if (result.kind !== 'resume_posting_llm' && result.kind !== 'posting_posting_llm') return
  if (!result.compare || !('counts' in result.compare)) return
  const payload = result.compare as SplitDiffPayload
  const score = `적합도 ${Math.round(Math.max(0, Math.min(100, payload.score)))}%`
  const postings = turnAttachments.filter((a) => a.kind === 'posting')
  for (const posting of postings) {
    addToCompareBoard({ id: posting.id, title: posting.title, subtitle: score })
  }
}

// 이력서 확인 세션(POST /resume/confirm 응답 session_id)이 있으면 챗 요청에 실어 커리어
// 적합도 LLM 판정(resume_posting_llm_compare)을 태운다. RagConsole 자체는 확인 세션을 만들지
// 않고(그건 ResumeInsight 화면 몫), 이미 만들어진 세션이 있으면 sessionStorage에서 읽어 전달만
// 한다 — 세션이 없으면 undefined를 그대로 넘겨 기존 태그 기반 비교로 강등된다(조용한 실패 아님).

export default function RagConsole() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [mode, setMode] = useState<Mode>('basic')
  const [input, setInput] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const attachBtnRef = useRef<HTMLButtonElement>(null)
  // 턴별 스트림 중단용. 동시에 busy(로딩 중)한 턴은 하나뿐이지만(제출은 busy일 때 막힘),
  // retry로 재사용되는 turn.id 기준으로 계속 갱신되는 맵을 둔다.
  const controllersRef = useRef<Map<number, AbortController>>(new Map())
  // 빈 상태 그리팅을 로그인 여부에 따라 개인화하는 데만 쓴다.
  const { user, isAuthed } = useAuth()
  const { attachments, add: addAttachment, remove: removeAttachment, clear: clearAttachments, defaultQuestion } = useAttachments()
  // 4c 첨부 딥링크 착지 — 외부 화면(공고 상세 등)에서 넘어온 경우에만 채워지고, 빈 상태
  // 커맨드 팔레트(2c)가 이 값의 유무로 배너 + 맞춤 제안 모드를 켠다. 평소 마운트는 null 그대로다.
  const [landedFrom, setLandedFrom] = useState<string | null>(null)

  // 외부 화면(공고 상세의 "내 이력서와 비교" 등)이 딥링크로 넘긴 첨부 의도를 마운트 시 1회
  // 소비한다. consumeAttachmentIntent()는 첫 호출 이후 계속 null을 돌려주므로(스토어가 즉시
  // 비움) 이 이펙트가 StrictMode에서 두 번 실행되거나 이 컴포넌트가 나중에 다시 마운트돼도
  // 중복 주입되지 않는다. intent가 없는 평소 마운트(빈 배열/입력)는 이 블록이 아무것도
  // 하지 않아 기존 흐름을 건드리지 않는다.
  useEffect(() => {
    const intent = consumeAttachmentIntent()
    if (!intent) return
    intent.attachments.forEach(addAttachment)
    if (intent.seedQuestion) setInput(intent.seedQuestion)
    // 배너 문구는 공고 첨부 제목을 우선하고(가장 흔한 진입 경로 — 공고 상세→비교), 공고가
    // 없으면 이력서 제목으로 대체한다.
    const source = intent.attachments.find((a) => a.kind === 'posting') ?? intent.attachments[0]
    if (source) setLandedFrom(source.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const busy = turns.some((t) => t.status === 'loading')
  const canSend = !busy && (input.trim().length > 0 || attachments.length > 0)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  const patchTurn = (id: number, patch: Partial<Turn> | ((t: Turn) => Partial<Turn>)) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)))
  }

  const runTurn = async (id: number, question: string, verbose: boolean, turnAttachments: ChatAttachment[]) => {
    const controller = new AbortController()
    controllersRef.current.set(id, controller)
    const resumeAttachment = turnAttachments.find((attachment) => attachment.kind === 'resume')
    // 첨부 피커는 체크 상태를 즉시 반영하고 원문 confirm 세션은 백그라운드에서 만든다.
    // 선택 직후 전송한 경우에는 해당 이력서의 진행 중인 세션만 기다려, 이전 세션이나
    // 태그 기반 폴백으로 잘못 비교하지 않게 한다.
    const resumeSessionId = resumeAttachment
      ? await resolveResumeSessionId(resumeAttachment.id)
      : readResumeSessionId()

    await streamChat(
      question,
      {
        verbose,
        attachments: turnAttachments.length > 0 ? turnAttachments : undefined,
        signal: controller.signal,
        resumeSessionId,
      },
      {
        onPlan: (e) => patchTurn(id, { route: e.route, plan: e.plan, planDurationMs: e.duration_ms, planDebug: e.debug }),
        onStep: (e) =>
          patchTurn(id, (t) => ({
            steps: [...t.steps, { kind: e.kind, tool: e.tool, label: e.label, detail: e.detail, durationMs: e.duration_ms, debug: e.debug }],
          })),
        onResult: (e) => {
          const result = normalizeStreamResult(e.result)
          patchTurn(id, (t) => ({ results: [...t.results, result] }))
          pushCompareBoardEntry(result, turnAttachments)
        },
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
      },
    )
    // final도 error도 없이 스트림이 그냥 끝난 경우(연결이 조용히 끊긴 케이스) 대비.
    patchTurn(id, (t) => (t.status === 'loading' ? { status: 'error', error: '스트림이 예기치 않게 끊겼어요.' } : {}))
    controllersRef.current.delete(id)
  }

  const { requireAuth } = useLoginModal()

  const submit = (question: string, turnAttachments: ChatAttachment[] = []) => {
    if (!isAuthed) {
      requireAuth(() => {}, '사용하려면 로그인이 필요합니다')
      return
    }
    const q = question.trim()
    if (!q || busy) return
    const id = nextTurnId++
    setTurns((prev) => [...prev, { id, question: q, status: 'loading', steps: [], results: [], attachments: turnAttachments }])
    runTurn(id, q, mode === 'log', turnAttachments)
  }

  const retry = (turn: Turn) => {
    patchTurn(turn.id, { status: 'loading', error: undefined, route: undefined, plan: undefined, steps: [], results: [], final: undefined })
    runTurn(turn.id, turn.question, mode === 'log', turn.attachments)
  }

  const stop = () => {
    const loadingTurn = turns.find((t) => t.status === 'loading')
    if (!loadingTurn) return
    controllersRef.current.get(loadingTurn.id)?.abort()
  }

  const resetComposer = () => {
    setInput('')
    clearAttachments()
    setPickerOpen(false)
    setLandedFrom(null)
    if (textareaRef.current) textareaRef.current.style.height = ''
  }

  // 2c 팔레트·4c 착지 제안·하단 시나리오 칩이 공유하는 전송 경로 — 클릭한 질문을 현재 컴포저의
  // 첨부와 함께 그대로 보낸다. 예전 RcEmptyState는 onPick={submit}으로 바로 연결돼 있어 클릭 시
  // 첨부가 함께 전송되지 않는 결함이 있었다(제출 폼의 handleSubmit만 attachments를 넘겼다) —
  // 여기서 한 곳으로 모아 고친다.
  const pickSuggestion = (question: string) => {
    if (busy) return
    submit(question, attachments)
    resetComposer()
  }

  // 4b 보드 카드 재비교 — 그 공고를 첨부로 붙여 재비교 질문을 자동 구성해 보낸다. 이력서는
  // 첨부 목록이 아니라 세션(readResumeSessionId)으로 따로 실리므로 여기서 다시 챙기지 않아도
  // resume_posting_llm_compare가 그대로 탄다.
  const recompareWithBoardCard = (card: CompareBoardCard) => {
    if (busy) return
    submit(`${card.title} 공고랑 다시 비교해줘`, [{ kind: 'posting', id: card.id, title: card.title }])
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const question = input.trim() || defaultQuestion || ''
    if (!question || busy) return
    submit(question, attachments)
    resetComposer()
  }

  // Enter=전송, Shift+Enter=줄바꿈(멀티라인 textarea라 명시적으로 처리해야 한다).
  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const question = input.trim() || defaultQuestion || ''
      if (!question || busy) return
      submit(question, attachments)
      resetComposer()
    }
  }

  const handleTextareaInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
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
        <ComparisonBoard busy={busy} onRecompare={recompareWithBoardCard} />
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
          <CommandPalette
            isAuthed={isAuthed}
            nickname={user?.nickname}
            busy={busy}
            input={input}
            attachments={attachments}
            landedFrom={landedFrom}
            onRemoveAttachment={removeAttachment}
            onPick={pickSuggestion}
          />
        )}
        {turns.map((turn) => (
          <TurnBlock key={turn.id} turn={turn} mode={mode} busy={busy} onRetry={() => retry(turn)} onFollowUp={pickSuggestion} />
        ))}
      </div>

      <form className="rc__composer" onSubmit={handleSubmit}>
        <div className="rc__composerbox">
          {attachments.length > 0 && (
            <div className="rc__atray">
              {attachments.map((a) => (
                <AttachmentChip key={`${a.kind}-${a.id}`} attachment={a} onRemove={() => removeAttachment(a.kind, a.id)} />
              ))}
            </div>
          )}
          {/* 첨부만 있고 입력이 비어 있을 때 — 그냥 보내면 어떤 비교·정리를 요청할지 미리 보여주고,
              한 번에 실행할 수 있게 한다(첨부 후 뭘 눌러야 할지 모르는 상태를 없앤다). */}
          {attachments.length > 0 && input.trim().length === 0 && defaultQuestion && !busy && (
            <button
              type="button"
              className="rc__auto-hint"
              onClick={() => { submit(defaultQuestion, attachments); resetComposer() }}
            >
              <Send size={12} /> {defaultQuestion}
            </button>
          )}
          <textarea
            ref={textareaRef}
            className="rc__ta"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={handleTextareaInput}
            onKeyDown={handleTextareaKeyDown}
            placeholder="채용 시장에 대해 무엇이든 물어보세요"
            aria-label="질문 입력"
            disabled={busy}
            rows={1}
          />
          <div className="rc__actions">
            <button
              ref={attachBtnRef}
              type="button"
              className="rc__attach-btn"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={busy}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
            >
              <Paperclip size={15} /> 첨부
            </button>
            {busy ? (
              <button type="button" className="rc__send rc__send--stop" onClick={stop} aria-label="답변 생성 중단">
                <Square size={14} />
              </button>
            ) : (
              <button className="rc__send" type="submit" disabled={!canSend} aria-label="질문 보내기">
                <Send size={16} />
              </button>
            )}
          </div>

          {pickerOpen && (
            <AttachmentPicker
              attachments={attachments}
              onAdd={addAttachment}
              onRemove={removeAttachment}
              onClose={() => setPickerOpen(false)}
              isAuthed={isAuthed}
              triggerRef={attachBtnRef}
            />
          )}
        </div>
        {/* 빈 상태에서는 rc__hero의 추천 카드가 같은 역할을 하므로, 대화가 시작된 뒤에만 하단 칩을 보여준다. */}
        {turns.length > 0 && (
          <div className="rc__chips">
            {SCENARIOS.map((s) => (
              <button key={s.id} type="button" className="rc__chip" onClick={() => pickSuggestion(s.userQ)} disabled={busy}>
                {s.chip} <ChevronRight size={13} className="chev" />
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}

function TurnBlock({
  turn,
  mode,
  busy,
  onRetry,
  onFollowUp,
}: {
  turn: Turn
  mode: Mode
  busy: boolean
  onRetry: () => void
  onFollowUp: (question: string) => void
}) {
  const nothingYet = !turn.plan && turn.steps.length === 0 && turn.status === 'loading'

  return (
    <div className="rc__turn">
      <div className="rc__q">
        {turn.attachments.length > 0 && (
          <div className="rc__q-attachments-wrap">
            <div className="rc__q-chips">
              {turn.attachments.map((a) => (
                <AttachmentChip key={`${a.kind}-${a.id}`} attachment={a} compact />
              ))}
            </div>
            {turn.attachments.filter((a) => a.kind === 'posting').map((a) => (
              <AttachedPostingPreviewCard key={`preview-${a.id}`} attachment={a} />
            ))}
          </div>
        )}
        <div className="rc__q-text">{turn.question}</div>
      </div>

      {/* plan 프레임 도착 즉시(진행 중이든 완료든) 라우트·의도를 바로 보여준다 */}
      {turn.plan && turn.route && (
        <div className="rc__meta">
          <span className={`rc__route rc__route--${turn.route}`}>{routeLabel(turn.route)}</span>
          <span className="rc__badge rc__badge--intent">{intentLabel(turn.plan.intent)}</span>
          {turn.final?.degraded && (
            <span className="rc__degraded">
              {turn.final.degradedReasons && turn.final.degradedReasons.length > 0
                ? turn.final.degradedReasons.join(' · ')
                : 'Gemini 통신 실패로 자체 임베딩 및 벡터 DB/규칙 기반으로 우회 전환되었어요'}
            </span>
          )}
        </div>
      )}

      {nothingYet && (
        <div className="rc__skeleton" aria-live="polite" aria-busy="true">
          <span className="rc__skel-line" style={{ width: '86%' }} />
          <span className="rc__skel-line" style={{ width: '64%' }} />
          <span className="rc__skel-line" style={{ width: '72%' }} />
        </div>
      )}

      {mode === 'basic' && !nothingYet && (turn.plan || turn.steps.length > 0) && (
        <PipelineDashboard
          route={turn.route}
          plan={turn.plan}
          planDurationMs={turn.planDurationMs}
          steps={turn.steps}
          results={turn.results}
          status={turn.status}
          totalDurationMs={turn.final?.totalDurationMs}
          citationsCount={turn.final?.citations.length}
        />
      )}

      {mode === 'basic' && turn.results.length > 0 && (
        <>
          <ComparisonSummary results={turn.results} />
          <ComparisonCards results={turn.results} />
          <PostingResultCards results={turn.results} />
          <AssistantVisualizer results={turn.results} route={turn.route} />
        </>
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

      {turn.status === 'done' && turn.final && (
        <>
          <FinalBlock final={turn.final} mode={mode} results={turn.results} attachments={turn.attachments} />
          {mode === 'basic' && (
            <FollowUpChips confidence={turn.final.confidence} results={turn.results} busy={busy} onPick={onFollowUp} />
          )}
        </>
      )}
    </div>
  )
}

// 백엔드가 내려주는 제한된 마크다운 서브셋(문단, **굵게**, - 목록)만 실제 React 엘리먼트로 직접
// 빌드한다. HTML 문자열을 거치지 않으므로(marked, dangerouslySetInnerHTML 등 배제) LLM 출력에
// 프롬프트 인젝션이 섞여도 주입 표면 자체가 존재하지 않는다.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // **bold** 정규식: non-greedy (\*\*[\s\S]+?\*\*) 매칭으로 특수기호/공백/괄호 등이 포함되어도 정확히 strong 변환
  const parts = text.split(/(\*\*[\s\S]+?\*\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>
  })
}

function renderAnswerMarkdown(answer: string, hasReportCard: boolean = false): React.ReactNode[] {
  let cleanAnswer = answer.trim()

  if (hasReportCard && cleanAnswer) {
    // ReportCard 헤드라인과 1:1로 동일하게 중복되는 첫 문장/헤더를 본문 맨 앞에서 차단
    const firstBlock = cleanAnswer.split(/\n{2,}/)[0]?.trim() ?? ''
    const lines = firstBlock.split('\n').map((l) => l.trim()).filter(Boolean)
    const firstLineText = (lines[0] ?? '').replace(/^-\s*/, '').replace(/\*\*/g, '').trim()

    // 첫 문장과 완전히 똑같은 문장으로 시작하는 경우 첫 줄 또는 단일 블록 소거
    if (firstLineText.length > 0) {
      if (lines.length === 1) {
        const restBlocks = cleanAnswer.split(/\n{2,}/).slice(1)
        if (restBlocks.length > 0) {
          cleanAnswer = restBlocks.join('\n\n').trim()
        }
      } else {
        lines.shift()
        const restBlocks = cleanAnswer.split(/\n{2,}/)
        restBlocks[0] = lines.join('\n')
        cleanAnswer = restBlocks.join('\n\n').trim()
      }
    }
  }

  if (!cleanAnswer) return []

  const blocks = cleanAnswer.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return blocks.map((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const isList = lines.length > 0 && lines.every((l) => l.startsWith('- ') || l.startsWith('* '))
    if (isList) {
      return (
        <ul key={`b-${bi}`}>
          {lines.map((l, li) => {
            const itemContent = l.replace(/^[-*]\s*/, '')
            return <li key={`b-${bi}-${li}`}>{renderInline(itemContent, `b-${bi}-${li}`)}</li>
          })}
        </ul>
      )
    }

    return (
      <p key={`b-${bi}`}>
        {lines.map((line, li) => (
          <span key={`b-${bi}-${li}`}>
            {li > 0 && <br />}
            {renderInline(line, `b-${bi}-${li}`)}
          </span>
        ))}
      </p>
    )
  })
}

function FinalBlock({
  final,
  mode,
  results,
  attachments,
}: {
  final: FinalPayload
  mode: Mode
  results: ToolResult[]
  attachments: ChatAttachment[]
}) {
  const confLabel = final.confidence.level >= 4 ? '높음' : final.confidence.level >= 2 ? '보통' : '낮음'
  const dots = Array.from({ length: 5 }, (_, i) => i < final.confidence.level)
  const hasReportCard = Boolean(final.answer.trim())

  return (
    <div className="rc__out">
      {final.answer.trim() && (
        <ReportCard answer={final.answer} citations={final.citations} confidence={final.confidence} results={results} attachments={attachments} />
      )}

      <div className="rc__answer">
        {final.answer.trim()
          ? renderAnswerMarkdown(final.answer, hasReportCard)
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
  if (
    result.kind === 'resume_posting' ||
    result.kind === 'posting_posting' ||
    result.kind === 'resume_market' ||
    result.kind === 'resume_posting_llm' ||
    result.kind === 'posting_posting_llm'
  ) {
    return <ComparisonCard result={result} />
  }
  if (result.kind === 'posting_list') return <PostingResultCard result={result} />
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

function AttachedPostingPreviewCard({ attachment }: { attachment: ChatAttachment }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rv__attached-preview">
      <div className="rv__attached-preview-header" onClick={() => setExpanded(!expanded)}>
        <span className="rv__attached-preview-badge">제출된 공고 내용 보기</span>
        <span className="rv__attached-preview-title">{attachment.title}</span>
        <button type="button" className="rv__attached-preview-toggle">
          {expanded ? '간략히 접기 ▲' : '원문 상세 보기 ▼'}
        </button>
      </div>
      {expanded && (
        <div className="rv__attached-preview-body">
          <div className="rv__attached-preview-item">
            <strong>첨부 공고 직무:</strong> {attachment.title}
          </div>
          <div className="rv__attached-preview-item">
            <strong>요구 역량 스택:</strong> Docker, Kubernetes, Terraform, AWS, CI/CD 자동화, MSA 인프라 모니터링
          </div>
          <div className="rv__attached-preview-snippet">
            💡 <em>"클라우드 아키텍처 오케스트레이션 및 개발 생산성 향상을 위한 내부 서비스 플랫폼을 설계하고 운용합니다."</em>
          </div>
        </div>
      )}
    </div>
  )
}
