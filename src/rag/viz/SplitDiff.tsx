import { useId, useState } from 'react'
import type { RequirementVerdict, SplitDiffPayload, SplitDiffRequirement } from '../chatContract'
import './SplitDiff.css'

// 커리어 적합도 Split Diff(K7) — 태그 교집합이 아니라 기준 문서/판정 대상 문서 원문을 LLM으로
// 대조해 요구사항별 met/partial/gap을 판정한 결과를 좌(기준 원문 인용)/우(판정 대상 근거 또는
// 보완 액션)로 보여준다. kind가 resume_posting_llm(이력서 vs 공고)이든 posting_posting_llm(공고
// vs 공고)이든 이 컴포넌트 하나로 렌더한다 — kind로 분기하지 않고 payload의 base_role/target_role
// 필드만 보고 그린다(범용성 유지).
//
// 시안 원천: /tmp/.../scratchpad/career-diff-redesign-v2.html(01번 확장 스플릿 다이어그램, 확정).
// diff 마커(+/~/−)와 pair bar, ai-banner, score-strip 레이아웃을 이 시안에서 가져오되, 색은
// 하드코딩하지 않고 기존 테마 캐스케이드 토큰(var(--c-*), src/design/tokens.ts)에 fallback
// 리터럴을 붙이는 기존 컨벤션(resume-insight.css, rag-console.css)을 그대로 따른다.

export interface SplitDiffProps {
  payload: SplitDiffPayload
}

const VERDICT_LABEL: Record<RequirementVerdict, string> = {
  met: '충족',
  partial: '부분 · 전이가능',
  gap: '공백',
}

// 인라인 배지(vpill)용 짧은 라벨 — 노트 카드의 VERDICT_LABEL과 달리 한 줄에 붙는 배지라 더
// 짧게 줄인다("부분 · 전이가능"은 인라인에서 너무 길다).
const VERDICT_PILL_LABEL: Record<RequirementVerdict, string> = {
  met: '충족',
  partial: '부분',
  gap: '공백',
}

// diff 라인 마커 — met은 추가(+), partial은 걸침(~), gap은 빠짐(−).
const VERDICT_MARK: Record<RequirementVerdict, string> = {
  met: '+',
  partial: '~',
  gap: '−',
}

// 요구사항 레이아웃 토글 — 가로 넓은 상세 카드형(detail)과 인라인 배지형(inline) 중 선택.
// WorkflowMap.tsx의 techeer_workflow_view와 같은 패턴(localStorage가 정본, 마운트 시 1회만 읽고
// 이후엔 토글 버튼으로만 바뀐다)을 따른다. 예전엔 'margin'(좌우 2열 여백 주석형)이었는데, 라이브
// 피드백으로 폭 좁은 노트 컬럼을 버리고 전체 폭 카드로 바꾸면서 값 이름도 바꿨다 — 옛 저장값
// 'margin'은 이제 모르는 값이라 기본값(detail)으로 자연히 폴백된다(마이그레이션 코드 불필요).
type SplitDiffLayout = 'detail' | 'inline'
const LAYOUT_STORAGE_KEY = 'techeer_splitdiff_layout'

function readStoredLayout(): SplitDiffLayout {
  try {
    return localStorage.getItem(LAYOUT_STORAGE_KEY) === 'inline' ? 'inline' : 'detail'
  } catch {
    return 'detail'
  }
}

// 형광펜을 그을 텍스트 — source_quote가 있으면 그걸, 없으면 요구사항 짧은 제목(text)을 쓴다.
// 둘 다 동시에 보여주지 않는다(한 항목당 한 줄만, 깔끔함 우선).
function highlightText(req: SplitDiffRequirement): string {
  return req.source_quote || req.text
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

// 역할 뒤에 제목을 붙이되, 제목이 빈 문자열이면(예: 이력서는 별도 title이 없음) 생략한다.
function roleLabel(role: string, title: string): string {
  return title ? `${role} · ${title}` : role
}

export function SplitDiff({ payload }: SplitDiffProps) {
  const { base_role, base_title, target_role, target_title, score, counts, summary, requirements, degraded } = payload
  const total = counts.met + counts.partial + counts.gap
  const roundedScore = Math.round(clampPct(score))
  const [layout, setLayoutState] = useState<SplitDiffLayout>(readStoredLayout)

  const setLayout = (next: SplitDiffLayout) => {
    setLayoutState(next)
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next)
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등)해도 레이아웃 전환 자체는 계속 동작해야 한다.
    }
  }

  // 가중 도넛 — met은 온전한 비중, partial은 절반 비중만 채워 "충족 4 + 부분 1×0.5 + 공백 1×0"의
  // 가중 점수를 시각적으로 그대로 옮긴다(스코어%와 도넛 채움 비율이 항상 일치하는 정직한 도넛).
  const size = 96
  const radius = size / 2
  const strokeWidth = 10
  const r = radius - strokeWidth / 2 - 1
  const circumference = 2 * Math.PI * r
  const metFrac = total > 0 ? counts.met / total : 0
  const partialFrac = total > 0 ? (counts.partial / total) * 0.5 : 0
  const metLen = circumference * metFrac
  const partialLen = circumference * partialFrac

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

        <div className="rv__sd-toggle" role="group" aria-label="요구사항 레이아웃 전환">
          <button
            type="button"
            aria-pressed={layout === 'detail'}
            onClick={() => setLayout('detail')}
          >
            상세
          </button>
          <button
            type="button"
            aria-pressed={layout === 'inline'}
            onClick={() => setLayout('inline')}
          >
            간단
          </button>
        </div>
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

      <div className="rv__sd-score">
        <div className="rv__sd-donut">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={`가중 적합도 ${roundedScore}퍼센트, 충족 ${counts.met} 부분 ${counts.partial} 공백 ${counts.gap}`}
          >
            <circle
              cx={radius} cy={radius} r={r} fill="none"
              stroke="color-mix(in srgb, var(--c-gap, #e0453a) 12%, transparent)"
              strokeWidth={strokeWidth}
            />
            {metLen > 0 && (
              <circle
                cx={radius} cy={radius} r={r} fill="none"
                stroke="var(--c-met, #1f7a63)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${metLen} ${circumference}`}
                transform={`rotate(-90 ${radius} ${radius})`}
              />
            )}
            {partialLen > 0 && (
              <circle
                cx={radius} cy={radius} r={r} fill="none"
                stroke="var(--c-partial, #8a6d3b)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${partialLen} ${circumference}`}
                strokeDashoffset={-metLen}
                transform={`rotate(-90 ${radius} ${radius})`}
              />
            )}
            <text x={radius} y={radius - 2} textAnchor="middle" dominantBaseline="middle" className="rv__ring-num">
              {roundedScore}%
            </text>
            <text x={radius} y={radius + 14} textAnchor="middle" dominantBaseline="middle" className="rv__ring-sub">
              가중 적합도
            </text>
          </svg>
        </div>
        <div className="rv__sd-score-meta">
          <div className="rv__sd-score-head">
            <span className="t">{total}개 요구 중 {counts.met}개 충족</span>
          </div>
          <p className="rv__sd-formula">
            <span className="met">충족 {counts.met}</span> · <span className="par">부분 {counts.partial}</span> · <span className="gap">공백 {counts.gap}</span>
          </p>
          <p className="rv__sd-note">LLM이 원문을 읽고 요구마다 매긴 가중 추정치예요. 정확한 매칭 개수는 아니에요.</p>
          <div className="rv__sd-legend">
            <span><i className="met" />충족 1점</span>
            <span><i className="partial" />부분 0.5점</span>
            <span><i className="gap" />공백 0점</span>
          </div>
        </div>
      </div>

      {layout === 'detail' ? (
        <SplitDiffDetailLayout requirements={requirements} targetRole={target_role} />
      ) : (
        <SplitDiffInlineLayout requirements={requirements} targetRole={target_role} />
      )}
    </div>
  )
}

// 형광펜 강조 span — 두 레이아웃이 공유한다. verdict 색은 색각 대응을 위해 항상 옆/아래에 글자
// 라벨이 같이 붙으므로(노트의 verdict 라벨, 인라인의 vpill), 여기 자체는 색으로만 표시해도 된다.
function SplitDiffHighlight({ req }: { req: SplitDiffRequirement }) {
  return <span className={`rv__sd-hl rv__sd-hl--${req.verdict}`}>{highlightText(req)}</span>
}

// 판정 대상 문서(target)의 원문 근거(quote)를 다시 살리는 자리 — quote가 있을 때만 작은
// 인용 표식을 두고, 마우스 호버뿐 아니라 키보드 포커스로도 전문을 볼 수 있게 한다. 네이티브
// title 속성만으론 포커스 시 안 뜨므로, aria-describedby로 이어진 CSS 툴팁(role="tooltip")을
// 직접 만든다. 트리거는 실제 button(탭 가능)이라 마우스 없이도 Tab만으로 도달·확인된다.
function QuoteCue({ quote, targetRole }: { quote: string; targetRole: string }) {
  const tooltipId = useId()
  if (!quote) return null
  return (
    <span className="rv__sd-quotecue">
      <button type="button" className="rv__sd-quotecue-btn" aria-describedby={tooltipId} aria-label={`${targetRole} 원문 근거 보기`}>
        <span aria-hidden="true">”</span>
      </button>
      <span role="tooltip" id={tooltipId} className="rv__sd-quotecue-tip">
        <span className="rv__sd-quotecue-tip-role">{targetRole} 원문</span>
        <span className="rv__sd-quotecue-tip-text">{quote}</span>
      </span>
    </span>
  )
}

// 상세 카드형 — 요구사항마다 (a) 공고 문구를 형광펜으로 그은 줄, (b) 그 바로 아래 전체 폭을 쓰는
// 상세 카드를 세로로 쌓는다. 좌우 2열 + 좁은 노트 컬럼 구조는 버렸다(화면이 넓어도 노트가 좁다는
// 피드백). 카드 안에서 quote(판정 대상 원문)를 직접 인용하므로 여기선 QuoteCue 툴팁을 쓰지 않는다
// (같은 정보를 두 번 보여주는 중복이라서). 판정 구분은 뱃지 + 옅은 배경 틴트로만 하고, 어디에도
// 왼쪽 컬러 테두리(레일)를 두지 않는다 — "AI 클리셰"라는 라이브 피드백으로 명시적으로 제거됨.
function SplitDiffDetailLayout({ requirements, targetRole }: { requirements: SplitDiffRequirement[]; targetRole: string }) {
  return (
    <div className="rv__sd-detail">
      {requirements.map((req) => (
        <div key={req.id} className="rv__sd-detail-item">
          <p className="rv__sd-detail-line">
            <SplitDiffHighlight req={req} />
          </p>
          <SplitDiffDetailCard req={req} targetRole={targetRole} />
        </div>
      ))}
    </div>
  )
}

function SplitDiffDetailCard({ req, targetRole }: { req: SplitDiffRequirement; targetRole: string }) {
  const { verdict, quote, rationale, next_step } = req
  return (
    <div className={`rv__sd-detailcard rv__sd-detailcard--${verdict}`}>
      <span className={`rv__sd-vbadge rv__sd-vbadge--${verdict}`}>{VERDICT_LABEL[verdict]}</span>

      <div className="rv__sd-detailcard-quote">
        <span className="rv__sd-detailcard-quote-label">{targetRole} 원문</span>
        {quote ? (
          <blockquote className="rv__sd-detailcard-quote-text">{quote}</blockquote>
        ) : (
          <p className="rv__sd-detailcard-quote-missing">{targetRole}에서 근거를 찾지 못했어요</p>
        )}
      </div>

      {rationale && (
        <p className="rv__sd-detailcard-rationale">
          <span className="k">판정 근거</span>
          <span>{rationale}</span>
        </p>
      )}

      {next_step && (
        <div className="rv__sd-detailcard-next">
          <span className="tag">보완점</span>
          <span className="step">{next_step}</span>
        </div>
      )}
    </div>
  )
}

// 시안 3 · 인라인 배지형 — 형광펜 그은 문구 바로 뒤에 verdict pill을 붙인다. 기본은 한 줄이고,
// gap/partial 항목만 정보 손실 방지를 위해 보조 줄로 next_step을 보여준다(met은 보조 줄 없음).
function SplitDiffInlineLayout({ requirements, targetRole }: { requirements: SplitDiffRequirement[]; targetRole: string }) {
  return (
    <ul className="rv__sd-inline">
      {requirements.map((req) => (
        <li key={req.id}>
          <div className="rv__sd-inline-row">
            <SplitDiffHighlight req={req} />
            <span className={`rv__sd-vpill rv__sd-vpill--${req.verdict}`}>
              {VERDICT_MARK[req.verdict]} {VERDICT_PILL_LABEL[req.verdict]}
            </span>
            <QuoteCue quote={req.quote} targetRole={targetRole} />
          </div>
          {req.verdict !== 'met' && req.next_step && (
            <p className="rv__sd-inline-sub">{req.next_step}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

export default SplitDiff
