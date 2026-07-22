import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, HelpCircle, X, LucideIcon } from 'lucide-react'
import type { RequirementKind, RequirementVerdict, SplitDiffPayload, SplitDiffRequirement } from '../chatContract'
import './SplitDiff.css'

// 커리어 적합도 Split Diff(시안 3, 형광펜 방식) — 채용 공고 요구 구절을 메인 캔버스로 삼아
// 형광펜 색으로 met/partial/gap을 칠하고, 인라인 상태 아이콘으로 색약도 구분 가능하게 하며,
// 구절에 호버·포커스하면 이력서 원문 대조 툴팁을 띄운다. kind가 resume_posting_llm(이력서 vs
// 공고)이든 posting_posting_llm(공고 vs 공고)이든 이 컴포넌트 하나로 렌더한다 — kind로
// 분기하지 않고 payload의 base_role/target_role 필드만 보고 그린다(범용성 유지).
//
// 이전 버전(상태 보드 + 원문 대조 + 액션 체크리스트 3단)은 라이브 피드백에 따라 형광펜 하나로
// 합쳤다. 퍼센트 적합도 수치는 화면 어디에도 없다 — 상단 pill은 met/partial/gap 개수와
// 자격요건/우대요건 개수만 보여준다. 판정 상태는 형광펜 색(준비 초록/애매 앰버/부족 빨강)과
// 인라인 아이콘(체크/물결/엑스) 둘 다로 표시해 색약도 구분 가능하게 한다.
//
// 팔레트: 근흑 모노크롬 + 그린 액센트(#1f9d57, --sd-accent, AI 판단 배지 등 UI 크롬 전용)와
// 상태 전용 색(--sd-met #218a58 / --sd-partial #b8892b / --sd-gap #c8382d)을 분리한다. 상태색은
// 이 컴포넌트 로컬 토큰이다 — career/workflow 화면군이 쓰는 공용 --c-met/--c-partial/--c-gap과
// 값이 다르므로 그 토큰을 건드리지 않고 새 로컬 변수로 둔다.

export interface SplitDiffProps {
  payload: SplitDiffPayload
}

const VERDICT_LABEL: Record<RequirementVerdict, string> = {
  met: '준비',
  partial: '애매',
  gap: '부족',
}

const VERDICT_ICON: Record<RequirementVerdict, LucideIcon> = {
  met: Check,
  partial: HelpCircle,
  gap: X,
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
  const { base_role, base_title, target_role, target_title, summary, requirements, degraded, counts, base_description } = payload

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

      <SummaryPills counts={counts} requirements={requirements} />
      <RequirementCanvas requirements={requirements} targetRole={target_role} description={base_description} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 상단 pill 요약 — 준비/애매/부족 개수 + 자격요건/우대요건 개수. 퍼센트는 없다.
// ---------------------------------------------------------------------------

function SummaryPills({
  counts,
  requirements,
}: {
  counts: { met: number; partial: number; gap: number }
  requirements: SplitDiffRequirement[]
}) {
  const mustCount = requirements.filter((req) => requirementKindOf(req) === 'must').length
  const preferredCount = requirements.length - mustCount

  return (
    <div className="rv__sd-pills" role="group" aria-label="적합도 요약">
      <span className="rv__sd-pill rv__sd-pill--met">{VERDICT_LABEL.met} {counts.met}</span>
      <span className="rv__sd-pill rv__sd-pill--partial">{VERDICT_LABEL.partial} {counts.partial}</span>
      <span className="rv__sd-pill rv__sd-pill--gap">{VERDICT_LABEL.gap} {counts.gap}</span>
      <span className="rv__sd-pill rv__sd-pill--kind">{KIND_LABEL.must} {mustCount}</span>
      <span className="rv__sd-pill rv__sd-pill--kind">{KIND_LABEL.preferred} {preferredCount}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 메인 캔버스 — 공고 요구 구절을 읽기 흐름으로 배치하고 형광펜 색으로 칠한다.
// base_description(공고 원문 전체)이 있고 모든 source_quote를 그 안에서 안정적으로(서로
// 겹치지 않게) 찾을 수 있으면 원문 그대로를 렌더하며 구간을 하이라이트한다. 없거나 매칭이
// 불안정하면 source_quote들을 문단 흐름으로 나열하는 폴백으로 안전하게 내려간다 — 데이터에
// 없는 것을 지어내지 않는다.
// ---------------------------------------------------------------------------

interface DescriptionSegment {
  type: 'text' | 'requirement'
  content: string
  req?: SplitDiffRequirement
}

// description 안에서 각 requirement의 source_quote 위치를 찾아 순서대로 세그먼트화한다.
// 구절을 못 찾거나(인용이 원문과 정확히 일치하지 않음) 두 구절이 겹치면 전체를 폴백으로
// 넘긴다(null 리턴) — 신뢰할 수 없는 부분 매칭을 어설프게 보여주지 않는다.
function buildDescriptionSegments(
  description: string,
  requirements: SplitDiffRequirement[],
): DescriptionSegment[] | null {
  const quoted = requirements.filter((req) => req.source_quote)
  if (quoted.length === 0) return null

  type Match = { start: number; end: number; req: SplitDiffRequirement }
  const matches: Match[] = []
  for (const req of quoted) {
    const start = description.indexOf(req.source_quote)
    if (start === -1) return null
    matches.push({ start, end: start + req.source_quote.length, req })
  }
  matches.sort((a, b) => a.start - b.start)
  for (let i = 1; i < matches.length; i += 1) {
    if (matches[i].start < matches[i - 1].end) return null
  }

  const segments: DescriptionSegment[] = []
  let cursor = 0
  for (const m of matches) {
    if (m.start > cursor) segments.push({ type: 'text', content: description.slice(cursor, m.start) })
    segments.push({ type: 'requirement', content: description.slice(m.start, m.end), req: m.req })
    cursor = m.end
  }
  if (cursor < description.length) segments.push({ type: 'text', content: description.slice(cursor) })
  return segments
}

function RequirementCanvas({
  requirements,
  targetRole,
  description,
}: {
  requirements: SplitDiffRequirement[]
  targetRole: string
  description?: string
}) {
  const segments = description ? buildDescriptionSegments(description, requirements) : null

  return (
    <section className="rv__sd-section" aria-label="공고 요구 구절 하이라이트">
      <h4 className="rv__sd-section-title">공고 원문 하이라이트</h4>
      {segments ? (
        <div className="rv__sd-canvas rv__sd-canvas--full">
          {segments.map((seg, i) =>
            seg.type === 'requirement' && seg.req ? (
              <HighlightUnit key={seg.req.id} text={seg.content} req={seg.req} targetRole={targetRole} />
            ) : (
              <span key={`t-${i}`}>{seg.content}</span>
            ),
          )}
        </div>
      ) : (
        <div className="rv__sd-canvas rv__sd-canvas--fallback">
          {requirements.map((req) => (
            <HighlightUnit key={req.id} text={highlightText(req)} req={req} targetRole={targetRole} />
          ))}
        </div>
      )}
    </section>
  )
}

// 하이라이트 구절 한 단위 — 형광펜 색 + 인라인 상태 아이콘 + 호버/포커스 툴팁.
// 키보드 포커스로도 툴팁이 뜨도록 tabIndex를 주고, 툴팁 콘텐츠는 항상 DOM에 두되(스크린
// 리더가 aria-describedby로 읽을 수 있게) CSS로 시각적으로만 숨겼다가 열렸을 때만 보인다.
//
// 툴팁은 채팅 스크롤 패널(rc__body)이나 상태 갤러리 데모 프레임(ss-demoframe) 같은 조상의
// overflow: hidden/auto에 위쪽이 잘리는 문제가 있었다. position: fixed만으로는(포탈 없이)
// 못 피하는 조상이 실제로 있다 — 어시스턴트 워크스페이스 라우트에서는
// desktop/DesktopShell.css의 `.dshell__content:has(.aw) { overflow: hidden; }`가 콘텐츠
// 카드를 자르고, 페이지 전환 래퍼 career/kit.css의 `.kit-trans--tab`/`--push`가 진입
// 애니메이션(kit-tab-in/kit-push-in, 0.34~0.4s) 동안 transform 값을 유지해 그 시간 동안
// position: fixed의 컨테이닝 블록을 뷰포트가 아니라 자기 자신으로 새로 만든다 — 그 결과
// 뷰포트 좌표로 계산한 fixed 툴팁이 엉뚱한 위치(화면 밖)로 밀려나 아예 안 보였다. 이런
// transform 컨테이닝 블록은 모션이 있는 화면일수록 흔해 예측하기 어려우므로, fixed만으로는
// 근본적으로 못 피한다.
//
// 그래서 툴팁을 React.createPortal로 document.body에 직접 렌더한다 — 모든 조상의
// overflow/stacking/transform 컨테이닝 블록을 완전히 벗어나므로 뷰포트 좌표가 항상
// 정확하다. DOM상 더 이상 형광펜 span의 자식이 아니지만, id/aria-describedby로 접근성
// 연결은 그대로 유지한다(스크린 리더는 DOM 트리 위치가 아니라 id 참조로 연결을 읽는다).
//
// 표시 여부는 CSS :hover/:focus에 맡기지 않고 React 상태(hovering/focused)로 직접 켠다.
// CSS 의사 클래스로 표시를 켜면서 동시에 JS가 mouseenter 시점에 좌표를 다시 재는 구조였을 때,
// 화면에 즉시 뜨는 것(브라우저 :hover 재계산)과 좌표 갱신(React state 커밋)의 타이밍이
// 어긋나 깜빡이거나 잘못된 위치에서 잠깐 보였다 사라지는 문제가 있었다. 이제는 open 상태가
// true로 바뀔 때만 useLayoutEffect로 위치를 계산해 얹으므로, 브라우저가 페인트하기 전에
// "열림 + 정확한 좌표"가 같은 커밋에 반영된다(레이아웃 이펙트는 페인트 전에 동기적으로
// 재실행되므로 중간 상태가 화면에 그려지지 않는다).
function HighlightUnit({
  text,
  req,
  targetRole,
}: {
  text: string
  req: SplitDiffRequirement
  targetRole: string
}) {
  const tooltipId = `sd-tooltip-${req.id}`
  const hlRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pos, setPos] = useState<TooltipPos | null>(null)
  // hover(구절 또는 툴팁 자체) 또는 키보드 포커스, 둘 중 하나만 있어도 열린다(기존 CSS의
  // :hover, :focus, :focus-visible OR 의미를 그대로 유지).
  const isOpen = hovering || focused

  const reposition = useCallback(() => {
    const trigger = hlRef.current
    const tooltip = tooltipRef.current
    if (!trigger || !tooltip) return
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const gap = 8
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    // 위쪽 공간이 툴팁 높이보다 부족하고 아래쪽이 더 넓으면 뒤집어 아래에 띄운다.
    const spaceAbove = triggerRect.top
    const spaceBelow = viewportH - triggerRect.bottom
    const placeBelow = spaceAbove < tooltipRect.height + gap && spaceBelow > spaceAbove
    const top = placeBelow ? triggerRect.bottom + gap : triggerRect.top - tooltipRect.height - gap

    // 가로로는 화면 밖으로 나가지 않게 클램프한다.
    const maxLeft = Math.max(gap, viewportW - tooltipRect.width - gap)
    const left = Math.min(Math.max(triggerRect.left, gap), maxLeft)

    setPos({ top, left })
  }, [])

  // 열릴 때(hover/focus로 isOpen이 true가 된 순간)만, 레이아웃이 확정된 뒤(페인트 전) 좌표를
  // 계산한다 — mouseenter 시점의 숨김 상태 rect를 읽어 오배치되던 레이스를 없앤다.
  useLayoutEffect(() => {
    if (!isOpen) return
    reposition()
  }, [isOpen, reposition])

  // 열려 있는 동안 스크롤·리사이즈가 일어나면(fixed는 트리거를 따라가지 않으므로) 좌표를
  // 다시 계산한다. 닫혀 있을 때는 리스너 자체를 달지 않는다.
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [isOpen, reposition])

  return (
    <span
      ref={hlRef}
      className={`rv__sd-hl rv__sd-hl--${req.verdict}`}
      tabIndex={0}
      aria-describedby={tooltipId}
      data-testid={`sd-hl-${req.id}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {text}
      <span className={`rv__sd-icon rv__sd-icon--${req.verdict}`} aria-hidden="true">
        {(() => {
          const Icon = VERDICT_ICON[req.verdict]
          return <Icon size={10} strokeWidth={3} />
        })()}
      </span>
      <span className="rv__sd-hl-sr">{VERDICT_LABEL[req.verdict]}</span>
      <RequirementTooltip
        req={req}
        targetRole={targetRole}
        tooltipId={tooltipId}
        tooltipRef={tooltipRef}
        pos={pos}
        isOpen={isOpen}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />
    </span>
  )
}

interface TooltipPos {
  top: number
  left: number
}

function RequirementTooltip({
  req,
  targetRole,
  tooltipId,
  tooltipRef,
  pos,
  isOpen,
  onMouseEnter,
  onMouseLeave,
}: {
  req: SplitDiffRequirement
  targetRole: string
  tooltipId: string
  tooltipRef: RefObject<HTMLSpanElement>
  pos: TooltipPos | null
  isOpen: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const kind = requirementKindOf(req)
  // document.body로 포탈한다 — 조상 overflow/transform 컨테이닝 블록을 완전히 벗어나야
  // 뷰포트 좌표(top/left)가 항상 정확하다. id/aria-describedby로 트리거 span과의 접근성
  // 연결은 DOM 트리 위치와 무관하게 유지된다.
  return createPortal(
    <span
      className={`rv__sd-tooltip${isOpen ? ' rv__sd-tooltip--open' : ''}`}
      role="tooltip"
      id={tooltipId}
      ref={tooltipRef}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="rv__sd-tooltip-head">
        <span className={`rv__sd-tooltip-verdict rv__sd-tooltip-verdict--${req.verdict}`}>
          {VERDICT_LABEL[req.verdict]}
        </span>
        <RequirementKindBadge kind={kind} />
      </span>
      <span className="rv__sd-tooltip-text">{req.text}</span>
      <span className="rv__sd-tooltip-row">
        <span className="rv__sd-tooltip-label">{targetRole} 근거</span>
        {req.quote ? (
          <span className="rv__sd-tooltip-quote">{req.quote}</span>
        ) : (
          <span className="rv__sd-tooltip-quote rv__sd-tooltip-quote--missing">
            {targetRole}에서 근거를 찾지 못했어요
          </span>
        )}
      </span>
      {req.next_step && (
        <span className="rv__sd-tooltip-row">
          <span className="rv__sd-tooltip-label">보완</span>
          <span className="rv__sd-tooltip-nextstep">{req.next_step}</span>
        </span>
      )}
    </span>,
    document.body,
  )
}

function RequirementKindBadge({ kind }: { kind: RequirementKind }) {
  return <span className={`rv__sd-kind rv__sd-kind--${kind}`}>{KIND_LABEL[kind]}</span>
}

export default SplitDiff
