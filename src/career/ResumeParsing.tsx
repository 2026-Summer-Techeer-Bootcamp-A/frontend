/**
 * ResumeParsing.tsx
 *
 * Concept A 실시간 이력서 LLM 파싱 오버레이.
 *
 * - 왼쪽: 원문 텍스트. PII(이름·연락처)는 blur→strikethrough→완전 마스킹 3단 이펙트.
 *         탐지된 기술 키워드는 순간적으로 반전 하이라이트.
 * - 오른쪽: 기술 칩·자격증·메모 문장이 SSE 이벤트 수신 순서대로 팝인.
 * - 하단 상태 바: 현재 탐지 중인 항목 문구 실시간 표시.
 *
 * Props:
 *   file     — 업로드된 PDF File 객체
 *   onDone   — 파싱 완료 시 ParsedResult 전달 콜백 (폼 자동 입력에 사용)
 *   onCancel — 취소 버튼
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import './ResumeParsing.css'

/* ── Types ─────────────────────────────────────────────────────── */
export interface ParsedResult {
  skills: string[]
  certs: string[]
  position: string
  careerYears: number | null
  level?: string
  regions?: string[]
  sectorInterests?: string[]
  memoSentences: string[]
  rawText: string
}

interface PiiSpan {
  type: string
  value: string
  masked: string
  state: 'detected' | 'redacted'
}

interface SkillSpan {
  canonical: string
  evidence: string
  active: boolean
}

/* ── SSE event parsing ─────────────────────────────────────────── */
const API_BASE = '/api/v1/resume'

/* ── Helpers ───────────────────────────────────────────────────── */
const PHASE_MSGS: Record<string, string> = {
  start:          '원문 텍스트 추출 완료…',
  pii_detected:   '개인정보 감지 중…',
  meta_detected:  '직무·경력 연차 분석 중…',
  skill_detected: '기술 스택 탐지 중…',
  cert_detected:  '자격증 인식 중…',
  memo_sentence:  '어필 포인트 추출 중…',
  complete:       '분석 완료!',
  error:          '오류 발생',
}

/** 원문 텍스트를 PII 스팬과 일반 텍스트 세그먼트로 분할한다. */
function buildTextSegments(
  text: string,
  piiList: PiiSpan[],
  skillList: SkillSpan[],
): Array<{ kind: 'text'; content: string } | { kind: 'pii'; span: PiiSpan } | { kind: 'skill'; span: SkillSpan }> {
  // 교체할 모든 범위를 offset 순으로 수집
  type Range = { start: number; end: number; data: PiiSpan | SkillSpan; kind: 'pii' | 'skill' }
  const ranges: Range[] = []

  for (const span of piiList) {
    let idx = 0
    while (true) {
      const pos = text.indexOf(span.value, idx)
      if (pos === -1) break
      ranges.push({ start: pos, end: pos + span.value.length, data: span, kind: 'pii' })
      idx = pos + span.value.length
    }
  }

  for (const span of skillList) {
    if (!span.evidence) continue
    const pos = text.indexOf(span.canonical)
    if (pos !== -1) {
      // 겹침 제거: 이미 PII가 차지한 범위와 안 겹치는 경우만
      const overlap = ranges.some((r) => pos < r.end && pos + span.canonical.length > r.start)
      if (!overlap) {
        ranges.push({ start: pos, end: pos + span.canonical.length, data: span, kind: 'skill' })
      }
    }
  }

  // 정렬 후 세그먼트 구성
  ranges.sort((a, b) => a.start - b.start)
  // 겹치는 항목 제거 (greedy)
  const clean: Range[] = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start >= cursor) {
      clean.push(r)
      cursor = r.end
    }
  }

  const segments: ReturnType<typeof buildTextSegments> = []
  let pos = 0
  for (const r of clean) {
    if (r.start > pos) segments.push({ kind: 'text', content: text.slice(pos, r.start) })
    if (r.kind === 'pii') segments.push({ kind: 'pii', span: r.data as PiiSpan })
    else segments.push({ kind: 'skill', span: r.data as SkillSpan })
    pos = r.end
  }
  if (pos < text.length) segments.push({ kind: 'text', content: text.slice(pos) })
  return segments
}

/* ── Main Component ────────────────────────────────────────────── */
export default function ResumeParsing({
  file,
  onDone,
  onCancel,
}: {
  file: File
  onDone: (result: ParsedResult) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<string>('start')
  const [progress, setProgress] = useState(0)
  const [rawText, setRawText] = useState('')
  const [piiList, setPiiList] = useState<PiiSpan[]>([])
  const [skillList, setSkillList] = useState<SkillSpan[]>([])
  const [certs, setCerts] = useState<string[]>([])
  const [memoSentences, setMemoSentences] = useState<string[]>([])
  const [position, setPosition] = useState('')
  const [careerYears, setCareerYears] = useState<number | null>(null)
  const [level, setLevel] = useState<string>('')
  const [regions, setRegions] = useState<string[]>([])
  const [sectorInterests, setSectorInterests] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const accumulatedRef = useRef<ParsedResult>({
    skills: [],
    certs: [],
    position: '',
    careerYears: null,
    level: '',
    regions: [],
    sectorInterests: [],
    memoSentences: [],
    rawText: '',
  })
  const [closing, setClosing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeSkill, setActiveSkill] = useState<string>('')
  const sourceRef = useRef<HTMLDivElement>(null)

  // 스켈레톤 수 (초기 3개, 탐지될수록 줄어듦)
  const [skillSkeletons, setSkillSkeletons] = useState(3)
  const [certSkeletons, setCertSkeletons] = useState(1)
  const [memoSkeletons, setMemoSkeletons] = useState(2)

  // 누적 카운터 (상태 바 표시용)
  const skillCount = skillList.length
  const certCount = certs.length

  useEffect(() => {
    const ctrl = new AbortController()
    const form = new FormData()
    form.append('file', file)

    let totalSteps = 0
    let stepsDone = 0

    const estimateTotal = (data: { skills?: unknown[]; certs?: unknown[]; memo_sentences?: unknown[] }) => {
      const s = (data.skills?.length ?? 5)
      const c = (data.certs?.length ?? 1)
      const m = (data.memo_sentences?.length ?? 2)
      totalSteps = 2 + s + c + m // meta + pii + items
    }

    const advance = (weight = 1) => {
      stepsDone += weight
      if (totalSteps > 0) {
        setProgress(Math.min(95, Math.round((stepsDone / totalSteps) * 95)))
      }
    }

    ;(async () => {
      try {
        const resp = await fetch(`${API_BASE}/parse-stream`, {
          method: 'POST',
          body: form,
          signal: ctrl.signal,
        })
        if (!resp.ok || !resp.body) {
          setErrorMsg('서버 연결에 실패했어요.')
          return
        }
        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue
            let evt: Record<string, unknown>
            try { evt = JSON.parse(raw) } catch { continue }

            const type = evt.type as string
            setPhase(type)

            switch (type) {
              case 'start': {
                const rt = (evt.raw_text as string) || (evt.preview_text as string) || ''
                setRawText(rt)
                accumulatedRef.current.rawText = rt
                // 총 예상치 모름, 후에 complete에서 실제 데이터로 재계산
                totalSteps = 20
                break
              }

              case 'pii_detected': {
                const val = evt.value as string
                const masked = evt.masked as string
                setPiiList((prev) => {
                  if (prev.some(p => p.value === val)) return prev
                  return [...prev, { type: evt.type_ as string ?? evt.type as string, value: val, masked, state: 'detected' }]
                })
                // 0.5s 후 완전 마스킹
                setTimeout(() => {
                  setPiiList((prev) =>
                    prev.map(p => p.value === val ? { ...p, state: 'redacted' } : p)
                  )
                }, 500)
                advance()
                break
              }

              case 'meta_detected':
                setPosition(evt.position as string ?? '')
                setCareerYears(evt.career_years as number | null)
                setLevel(evt.level as string ?? '')
                setRegions(evt.regions as string[] ?? [])
                setSectorInterests(evt.sector_interests as string[] ?? [])
                accumulatedRef.current.position = evt.position as string ?? ''
                accumulatedRef.current.careerYears = evt.career_years as number | null
                accumulatedRef.current.level = evt.level as string ?? ''
                accumulatedRef.current.regions = evt.regions as string[] ?? []
                accumulatedRef.current.sectorInterests = evt.sector_interests as string[] ?? []
                advance()
                break

              case 'skill_detected': {
                const canonical = evt.canonical as string
                const evidence = evt.evidence as string ?? ''
                setActiveSkill(canonical)
                if (!accumulatedRef.current.skills.includes(canonical)) {
                  accumulatedRef.current.skills.push(canonical)
                }
                setSkillList((prev) => {
                  if (prev.some(s => s.canonical === canonical)) return prev
                  return [...prev, { canonical, evidence, active: true }]
                })
                setSkillSkeletons((n) => Math.max(0, n - 1))
                // 1.2s 후 active 해제
                setTimeout(() => {
                  setSkillList((prev) =>
                    prev.map(s => s.canonical === canonical ? { ...s, active: false } : s)
                  )
                  setActiveSkill('')
                }, 1200)
                advance()
                // 원문 스크롤
                if (sourceRef.current) {
                  sourceRef.current.scrollTop = sourceRef.current.scrollHeight * 0.3
                }
                break
              }

              case 'cert_detected': {
                const name = evt.name as string
                if (!accumulatedRef.current.certs.includes(name)) {
                  accumulatedRef.current.certs.push(name)
                }
                setCerts((prev) => prev.includes(name) ? prev : [...prev, name])
                setCertSkeletons((n) => Math.max(0, n - 1))
                advance()
                break
              }

              case 'memo_sentence': {
                const text = evt.text as string
                accumulatedRef.current.memoSentences.push(text)
                setMemoSentences((prev) => [...prev, text])
                setMemoSkeletons((n) => Math.max(0, n - 1))
                advance()
                break
              }

              case 'complete': {
                const fd = evt.full_data as Record<string, unknown>
                estimateTotal(fd)
                setProgress(100)
                setDone(true)
                setSkillSkeletons(0)
                setCertSkeletons(0)
                setMemoSkeletons(0)
                const rt = (evt.raw_text as string) ?? rawText
                setRawText(rt)
                accumulatedRef.current.rawText = rt
                // 2s 유지 후 페이드 아웃 시작, 애니메이션이 끝나면 onDone 호출
                setTimeout(() => {
                  setClosing(true)
                  setTimeout(() => {
                    onDone(accumulatedRef.current)
                  }, 380)
                }, 2000)
                break
              }

              case 'error':
                setErrorMsg(evt.message as string ?? '알 수 없는 오류')
                setSkillSkeletons(0)
                setCertSkeletons(0)
                setMemoSkeletons(0)
                break
            }
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setErrorMsg(e instanceof Error ? e.message : '연결 오류')
        }
      }
    })()

    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // 원문이 짧게 잘려서 온 경우 대비: preview 텍스트를 이용
  const displayText = rawText || '이력서 텍스트를 추출 중이에요…'
  const segments = buildTextSegments(displayText, piiList, skillList)

  return (
    <div className={`rp-backdrop ${closing ? 'rp-backdrop--closing' : ''}`} onClick={onCancel}>
      <div className={`rp-overlay ${closing ? 'rp-overlay--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
      {/* ── 헤더 ── */}
      <div className="rp-header">
        {done
          ? <div className="rp-done-badge"><CheckCircle2 size={13} /> 분석 완료</div>
          : <div className="rp-header__pulse" />
        }
        <span className="rp-header__title">
          {done ? '이력서 분석 완료' : '이력서 분석 및 개인정보 제거중'}
        </span>
        <span className="rp-header__sub">
          {done
            ? `기술 ${skillCount}개 · 자격증 ${certCount}개`
            : PHASE_MSGS[phase] ?? phase}
        </span>
        <button
          onClick={onCancel}
          style={{ display: 'flex', color: 'var(--c-muted)', padding: 4, marginLeft: 4 }}
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── 진행 바 ── */}
      <div className="rp-progress">
        <div className="rp-progress__fill" style={{ width: `${progress}%` }} />
      </div>

      {/* ── 본문 2패널 ── */}
      <div className="rp-body">

        {/* 왼쪽: 원문 + PII/기술 하이라이트 */}
        <div className="rp-source" ref={sourceRef}>
          <div className="rp-source__label">이력서 원문</div>
          <div className="rp-source__text">
            {segments.map((seg, i) => {
              if (seg.kind === 'text') {
                return <span key={i}>{seg.content}</span>
              }
              if (seg.kind === 'pii') {
                const state = seg.span.state
                return (
                  <span
                    key={i}
                    className={`rp-pii ${state === 'detected' ? 'rp-pii--detected' : 'rp-pii--redacted'}`}
                    title={state === 'redacted' ? '개인정보 보호됨' : undefined}
                  >
                    {state === 'redacted' ? seg.span.masked : seg.span.value}
                  </span>
                )
              }
              // skill
              const isActive = (seg.span as SkillSpan).active
              return (
                <span
                  key={i}
                  className={`rp-skill-hl ${isActive ? 'rp-skill-hl--active' : ''}`}
                >
                  {(seg.span as SkillSpan).canonical}
                </span>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 탐지 패널 */}
        <div className="rp-panel">

          {/* 포지션 & 연차 & 레벨 */}
          <div className="rp-panel__section">
            <div className="rp-panel__label">직무·경력 (자동)</div>
            <div className="rp-panel__chips">
              {position && <span className="rp-chip">{position}</span>}
              {careerYears !== null && <span className="rp-chip">{careerYears}년</span>}
              {level && <span className="rp-chip">{level}</span>}
            </div>
          </div>

          {/* 선호 지역 */}
          {regions.length > 0 && (
            <div className="rp-panel__section">
              <div className="rp-panel__label">지역</div>
              <div className="rp-panel__chips">
                {regions.map((r) => <span key={r} className="rp-chip">{r}</span>)}
              </div>
            </div>
          )}

          {/* 관심 분야 */}
          {sectorInterests.length > 0 && (
            <div className="rp-panel__section">
              <div className="rp-panel__label">관심 분야</div>
              <div className="rp-panel__chips">
                {sectorInterests.map((s) => <span key={s} className="rp-chip">{s}</span>)}
              </div>
            </div>
          )}

          {/* 기술 스택 */}
          <div className="rp-panel__section">
            <div className="rp-panel__label">
              기술 스택 {skillCount > 0 && <span style={{ color: 'var(--c-ink)' }}>{skillCount}</span>}
            </div>
            <div className="rp-panel__chips">
              {skillList.map((s) => (
                <span
                  key={s.canonical}
                  className="rp-chip"
                  style={s.active ? {
                    background: 'var(--c-ink)',
                    color: '#fff',
                    borderColor: 'transparent',
                  } : undefined}
                  title={s.evidence || undefined}
                >
                  {s.canonical}
                </span>
              ))}
              {Array.from({ length: skillSkeletons }).map((_, i) => (
                <span key={`sk-${i}`} className={`rp-chip rp-chip--skeleton ${i === 0 ? 'w-lg' : i === 1 ? 'w-md' : 'w-sm'}`} />
              ))}
            </div>
          </div>

          {/* 자격증 */}
          <div className="rp-panel__section">
            <div className="rp-panel__label">
              자격증 {certCount > 0 && <span style={{ color: 'var(--c-met)' }}>{certCount}</span>}
            </div>
            <div className="rp-panel__chips">
              {certs.map((c) => (
                <span key={c} className="rp-chip rp-chip--cert">{c}</span>
              ))}
              {Array.from({ length: certSkeletons }).map((_, i) => (
                <span key={`ck-${i}`} className="rp-chip rp-chip--skeleton w-lg" />
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div className="rp-panel__section rp-panel__section--memo">
            <div className="rp-panel__label">메모 (자동)</div>
            {memoSentences.map((s, i) => (
              <div key={i} className="rp-memo-sentence">{s}</div>
            ))}
            {Array.from({ length: memoSkeletons }).map((_, i) => (
              <div key={`ms-${i}`} className="rp-memo-sentence--skeleton" />
            ))}
          </div>
        </div>
      </div>

      {/* ── 하단 상태 바 ── */}
      <div className="rp-statusbar">
        <span className="rp-statusbar__msg">
          {errorMsg
            ? `⚠ ${errorMsg}`
            : done
              ? '폼을 자동으로 채우는 중이에요…'
              : activeSkill
                ? `"${activeSkill}" 감지됨`
                : PHASE_MSGS[phase] ?? '분석 중…'}
        </span>
        {!done && !errorMsg && (
          <span className="rp-statusbar__count">
            {skillCount}개 · {progress}%
          </span>
        )}
      </div>
      </div>
    </div>
  )
}
