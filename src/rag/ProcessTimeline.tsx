import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import type { Plan, Route, StreamStepKind } from './chatContract'
import { msLabel, routeLabel } from './chatLabels'

// 접히는 "분석 과정" 타임라인(스펙 2장) — 기본 모드의 옛 LiveSteps(한 줄씩 쌓기, 항상 펼침)를
// 대체한다. 스트리밍 중엔 자동 펼침으로 살아있는 진행을 그대로 보여주고, 끝나면 500ms 뒤 한 줄
// 요약으로 조용히 접힌다. 사용자가 헤더를 눌러 직접 펼치거나 접었다면(수동 토글) 그 선택을 그대로
// 존중해 자동 접힘을 스킵한다 — "물어볼 때만 자세히 보여주는" 태도를 유지하기 위함이다.
// TurnBlock이 턴마다 하나씩 마운트하는 per-turn 컴포넌트라 별도 id 배선이 필요 없다.

export interface StepEntry {
  kind: StreamStepKind
  tool?: string
  label: string
  detail?: string
  durationMs?: number | null
  debug?: Record<string, unknown> | null
}

type TimelineStatus = 'loading' | 'done' | 'error'
type RowState = 'done' | 'active' | 'pending'

interface TimelineRow {
  key: string
  label: string
  meta: string | null
  state: RowState
}

const STEP_FALLBACK_LABEL: Record<StreamStepKind, string> = {
  tool: '도구 조회',
  eval: '근거 충분성 검증',
  synth: '답변 합성',
}

// backend(pipeline.py run_chat_events)는 이벤트를 항상 plan → tool(0개 이상) → eval → synth →
// final 고정 순서로 보낸다. 그래서 아직 도착 전이어도 "다음엔 이게 온다"는 자리를 미리 보여줄 수
// 있다(플레이스홀더 행) — eval이 아직 없으면 그게 다음(active)이고 synth는 그다음(pending), eval은
// 있는데 synth가 없으면 synth가 다음(active). 이미 도착한 스텝은 duration_ms가 이미 채워진 채로
// 오므로(도구 함수가 끝나야 step 프레임을 만든다) 전부 'done'으로 취급해도 안전하다.
function buildRows(
  plan: Plan | undefined,
  route: Route | undefined,
  planDurationMs: number | null | undefined,
  steps: StepEntry[],
  status: TimelineStatus,
): TimelineRow[] {
  const rows: TimelineRow[] = []

  if (plan) {
    rows.push({
      key: 'plan',
      label: '질문 분해',
      meta: [routeLabel(route), msLabel(planDurationMs)].filter(Boolean).join(' · ') || null,
      state: 'done',
    })
  }

  steps.forEach((s, i) => {
    rows.push({
      key: `step-${i}`,
      label: s.label || STEP_FALLBACK_LABEL[s.kind] || '처리 중',
      meta: [s.detail, msLabel(s.durationMs)].filter(Boolean).join(' · ') || null,
      state: 'done',
    })
  })

  if (plan && status === 'loading') {
    const hasEval = steps.some((s) => s.kind === 'eval')
    const hasSynth = steps.some((s) => s.kind === 'synth')
    if (!hasEval) {
      rows.push({ key: 'ph-eval', label: '근거 충분성 검증', meta: '진행 중…', state: 'active' })
      rows.push({ key: 'ph-synth', label: '답변 합성', meta: '대기', state: 'pending' })
    } else if (!hasSynth) {
      rows.push({ key: 'ph-synth', label: '답변 합성', meta: '진행 중…', state: 'active' })
    }
  }

  return rows
}

export interface ProcessTimelineProps {
  route?: Route
  plan?: Plan
  planDurationMs?: number | null
  steps: StepEntry[]
  status: TimelineStatus
  totalDurationMs?: number | null
}

export default function ProcessTimeline({ route, plan, planDurationMs, steps, status, totalDurationMs }: ProcessTimelineProps) {
  const [expanded, setExpanded] = useState(true)
  const userToggledRef = useRef(false)
  const prevStatusRef = useRef<TimelineStatus>(status)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status
    if (prev === status) return

    if (status === 'loading') {
      // 새 스트림 시작(최초 진입 또는 retry) — 수동 토글 기록을 리셋하고 항상 펼친 채로 시작한다.
      userToggledRef.current = false
      setExpanded(true)
      return
    }
    if (status === 'done' && !userToggledRef.current) {
      const timer = setTimeout(() => setExpanded(false), 500)
      return () => clearTimeout(timer)
    }
    if (status === 'error' && !userToggledRef.current) {
      // 에러는 접지 않고 그대로 두어 어디서 멈췄는지 보이게 한다(스펙 2.3).
      setExpanded(true)
    }
  }, [status])

  const rows = useMemo(
    () => buildRows(plan, route, planDurationMs, steps, status),
    [plan, route, planDurationMs, steps, status],
  )

  if (rows.length === 0) return null

  const toggle = () => {
    userToggledRef.current = true
    setExpanded((v) => !v)
  }

  const summary =
    status === 'done'
      ? `분석 과정 · ${rows.length}단계${msLabel(totalDurationMs) ? ` · ${msLabel(totalDurationMs)}` : ''}`
      : status === 'error'
        ? '분석 과정 · 중단됨'
        : '분석 과정 · 진행 중'

  const HeaderIcon = status === 'done' ? Check : status === 'error' ? X : Loader2

  return (
    <div className="rc__timeline" aria-live="polite">
      <button type="button" className="rc__timeline-head" onClick={toggle} aria-expanded={expanded}>
        <span
          className={`rc__timeline-head-icon rc__timeline-head-icon--${status}${status === 'loading' ? ' rc__timeline-spin' : ''}`}
          aria-hidden="true"
        >
          <HeaderIcon size={12} />
        </span>
        <span className="rc__timeline-head-label">{expanded ? '분석 과정' : summary}</span>
        <span className="rc__timeline-toggle">
          {expanded ? '접기' : '펼치기'}
          {expanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
        </span>
      </button>

      {expanded && (
        <div className="rc__timeline-body">
          {rows.map((row) => (
            <div className={`rc__timeline-row rc__timeline-row--${row.state}`} key={row.key}>
              <span className="rc__timeline-label">{row.label}</span>
              {row.meta && <span className="rc__timeline-meta">{row.meta}</span>}
            </div>
          ))}
          {status === 'error' && (
            <div className="rc__timeline-row rc__timeline-row--error">
              <span className="rc__timeline-label">✕ 중단됨</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
