import { useState } from 'react'
import type { RequirementKind, RequirementVerdict, SplitDiffPayload, SplitDiffRequirement } from '../chatContract'
import './SplitDiff.css'

// 커리어 적합도 Split Diff(K7, 확정 레이아웃) — 기준 문서/판정 대상 문서 원문을 LLM으로 대조해
// 요구사항별 met/partial/gap을 판정한 결과를, 위에서 아래로 (1) 상태 보드 (2) 원문 대조 하이라이트
// (3) 액션 체크리스트 3단으로 고정 배치한다. kind가 resume_posting_llm(이력서 vs 공고)이든
// posting_posting_llm(공고 vs 공고)이든 이 컴포넌트 하나로 렌더한다 — kind로 분기하지 않고
// payload의 base_role/target_role 필드만 보고 그린다(범용성 유지).
//
// 이전 버전(가중 도넛 + 상세/간단 토글)은 라이브 피드백에 따라 걷어냈다. 퍼센트 적합도 수치는
// 화면 어디에도 없다 — 요구 무게는 자격요건/우대요건 뱃지로만 표시하고, 판정 상태는 색(충족
// 초록/부분 앰버/공백 빨강)으로만 표시한다. 팔레트는 근흑 모노크롬 + 그린 액센트(#1f9d57, 이
// 컴포넌트 로컬 변수 --sd-accent) — 상태색과 액센트색은 서로 다른 토큰이라 섞이지 않는다.

export interface SplitDiffProps {
  payload: SplitDiffPayload
}

const VERDICT_LABEL: Record<RequirementVerdict, string> = {
  met: '충족',
  partial: '부분',
  gap: '공백',
}

const KIND_LABEL: Record<RequirementKind, string> = {
  must: '자격요건',
  preferred: '우대요건',
}

// requirement_kind가 없는 요구사항은 자격요건으로 기본 처리한다(스펙 결정: 값이 없다고 UI가
// 빈칸을 보여주거나 데이터를 지어내지 않는다 — 백엔드가 아직 섹션 출처를 안 보내는 동안의
// 정직한 기본값이다).
function requirementKindOf(req: SplitDiffRequirement): RequirementKind {
  return req.requirement_kind === 'preferred' ? 'preferred' : 'must'
}

// 형광펜을 그을 텍스트 — source_quote가 있으면 그걸, 없으면 요구사항 짧은 제목(text)을 쓴다.
function highlightText(req: SplitDiffRequirement): string {
  return req.source_quote || req.text
}

// 역할 뒤에 제목을 붙이되, 제목이 빈 문자열이면(예: 이력서는 별도 title이 없음) 생략한다.
function roleLabel(role: string, title: string): string {
  return title ? `${role} · ${title}` : role
}

export function SplitDiff({ payload }: SplitDiffProps) {
  const { base_role, base_title, target_role, target_title, summary, requirements, degraded } = payload

  return (
    <div className="rv__splitdiff">
      <div className="rv__sd-pairbar">
        <span className="rv__sd-paircip rv__sd-paircip--base">
          <span className="role">기준</span>
          {roleLabel(base_role, base_title)}
        </span>
        <span className="rv__sd-pairarrow" aria-hidden="true">→</span>
        <span className="rv__sd-paircip">
          <span className="role">판정</span>
          {roleLabel(target_role, target_title)}
        </span>
      </div>

      <div className="rv__sd-summary">
        <span className="rv__sd-badge"><span className="dot" />AI 판단</span>
        <div>
          <p className="rv__sd-summary-text">{summary}</p>
          {degraded && (
            <span className="rv__sd-degraded">{target_role} 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요.</span>
          )}
        </div>
      </div>

      <StatusBoard requirements={requirements} />
      <EvidenceCompare requirements={requirements} baseRole={base_role} targetRole={target_role} />
      <ActionChecklist requirements={requirements} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1. 상태 보드 — 충족/부분/공백 3열. 각 칩은 요구사항 한 줄 + 자격요건/우대요건 뱃지만 얹는다.
// 퍼센트는 어디에도 없다. 열 헤더 점(dot)과 칩 왼쪽 여백 색으로만 상태를 구분한다.
// ---------------------------------------------------------------------------

const BOARD_COLUMNS: { verdict: RequirementVerdict; label: string }[] = [
  { verdict: 'met', label: '충족' },
  { verdict: 'partial', label: '부분' },
  { verdict: 'gap', label: '공백' },
]

function StatusBoard({ requirements }: { requirements: SplitDiffRequirement[] }) {
  const groups: Record<RequirementVerdict, SplitDiffRequirement[]> = { met: [], partial: [], gap: [] }
  for (const req of requirements) groups[req.verdict].push(req)

  return (
    <section className="rv__sd-section" aria-label="요구사항 상태 보드">
      <h4 className="rv__sd-section-title">상태 보드</h4>
      <div className="rv__sd-board">
        {BOARD_COLUMNS.map(({ verdict, label }) => (
          <div key={verdict} className={`rv__sd-col rv__sd-col--${verdict}`}>
            <div className="rv__sd-col-head">
              <span className="rv__sd-col-dot" aria-hidden="true" />
              <span className="rv__sd-col-label">{label}</span>
              <span className="rv__sd-col-count">{groups[verdict].length}</span>
            </div>
            {groups[verdict].length === 0 ? (
              <p className="rv__sd-col-empty">해당 항목 없음</p>
            ) : (
              <ul className="rv__sd-col-list">
                {groups[verdict].map((req) => (
                  <li key={req.id} className="rv__sd-chip">
                    <span className="rv__sd-chip-text">{req.text}</span>
                    <RequirementKindBadge kind={requirementKindOf(req)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function RequirementKindBadge({ kind }: { kind: RequirementKind }) {
  return <span className={`rv__sd-kind rv__sd-kind--${kind}`}>{KIND_LABEL[kind]}</span>
}

// ---------------------------------------------------------------------------
// 2. 원문 대조 하이라이트 — 공고 원문 구절(왼쪽)과 판정 대상 근거 구절(오른쪽)을 verdict 색으로
// 맞춰 나란히 보여준다. 근거(quote)가 없는 항목은 섞어 넣지 않고 "근거 없음"으로 따로 모아
// 솔직하게 보여준다 — 있는 척하지 않는다.
// ---------------------------------------------------------------------------

function EvidenceCompare({
  requirements,
  baseRole,
  targetRole,
}: {
  requirements: SplitDiffRequirement[]
  baseRole: string
  targetRole: string
}) {
  const withEvidence = requirements.filter((req) => req.quote)
  const noEvidence = requirements.filter((req) => !req.quote)

  return (
    <section className="rv__sd-section" aria-label="원문 대조">
      <h4 className="rv__sd-section-title">원문 대조</h4>
      <div className="rv__sd-evidence">
        {withEvidence.length === 0 ? (
          <p className="rv__sd-evidence-empty">원문끼리 대조할 항목이 없어요.</p>
        ) : (
          <>
            <div className="rv__sd-evidence-head" aria-hidden="true">
              <span>{baseRole} 원문</span>
              <span>{targetRole} 근거</span>
            </div>
            <ul className="rv__sd-evidence-list">
              {withEvidence.map((req) => (
                <li key={req.id} className="rv__sd-evidence-row">
                  <span className={`rv__sd-hl rv__sd-hl--${req.verdict}`}>{highlightText(req)}</span>
                  <span className="rv__sd-evidence-arrow" aria-hidden="true">↔</span>
                  <span className={`rv__sd-hl rv__sd-hl--${req.verdict}`}>{req.quote}</span>
                  <span className="rv__sd-evidence-vlabel">{VERDICT_LABEL[req.verdict]}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {noEvidence.length > 0 && (
          <div className="rv__sd-noevidence">
            <p className="rv__sd-noevidence-label">근거 없음</p>
            <ul>
              {noEvidence.map((req) => (
                <li key={req.id}>
                  <span className="rv__sd-noevidence-text">{highlightText(req)}</span>
                  <span className="rv__sd-noevidence-note">{targetRole}에서 근거를 찾지 못했어요</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 3. 액션 체크리스트 — next_step이 있는 항목(부분·공백 위주)만 행동으로 나열한다. 자격요건을
// 먼저, 우대요건을 뒤로 정렬한다(같은 등급 안에서는 원래 순서를 지킨다 — Array.sort는 안정 정렬).
// 체크박스는 로컬 진척 표시용이라 컴포넌트 상태로만 관리한다.
// ---------------------------------------------------------------------------

function kindOrder(kind: RequirementKind): number {
  return kind === 'preferred' ? 1 : 0
}

function ActionChecklist({ requirements }: { requirements: SplitDiffRequirement[] }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const actionable = requirements
    .filter((req) => req.next_step)
    .slice()
    .sort((a, b) => kindOrder(requirementKindOf(a)) - kindOrder(requirementKindOf(b)))

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="rv__sd-section" aria-label="액션 체크리스트">
      <h4 className="rv__sd-section-title">액션 체크리스트</h4>
      {actionable.length === 0 ? (
        <p className="rv__sd-checklist-empty">지금 더 준비할 액션이 없어요.</p>
      ) : (
        <ul className="rv__sd-checklist">
          {actionable.map((req) => {
            const inputId = `sd-action-${req.id}`
            const isChecked = checked.has(req.id)
            return (
              <li key={req.id} className="rv__sd-checklist-item">
                <label className="rv__sd-checklist-row" htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(req.id)}
                  />
                  <span className={`rv__sd-checklist-text${isChecked ? ' is-done' : ''}`}>{req.next_step}</span>
                  <RequirementKindBadge kind={requirementKindOf(req)} />
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default SplitDiff
