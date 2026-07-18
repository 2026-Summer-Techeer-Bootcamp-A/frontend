import type { ResumePostingLlmPayload, ResumePostingLlmRequirement } from '../chatContract'
import './SplitDiff.css'

// 커리어 적합도 Split Diff(K7) — 태그 교집합이 아니라 이력서/공고 원문을 LLM으로 대조해 요구사항별
// met/partial/gap을 판정한 결과를 좌(공고 원문 인용)/우(이력서 근거 또는 보완 액션)로 보여준다.
// 시안 원천: /tmp/.../scratchpad/career-diff-B-refined.html(시안 B, 확정). 색은 하드코딩하지 않고
// 기존 테마 캐스케이드 토큰(var(--c-*), src/career/themes.ts)에 fallback 리터럴을 붙이는 기존
// 컨벤션(resume-insight.css, rag-console.css)을 그대로 따른다.

export interface SplitDiffProps {
  payload: ResumePostingLlmPayload
}

const VERDICT_LABEL: Record<ResumePostingLlmRequirement['verdict'], string> = {
  met: '충족',
  partial: '부분 · 전이가능',
  gap: '공백',
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

export function SplitDiff({ payload }: SplitDiffProps) {
  const { posting_title, score, counts, summary, requirements, degraded } = payload
  const total = counts.met + counts.partial + counts.gap
  const roundedScore = Math.round(clampPct(score))

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
      <div className="rv__sd-summary">
        <span className="rv__sd-badge"><span className="dot" />AI 판단</span>
        <div>
          <p className="rv__sd-summary-text">{summary}</p>
          {degraded && (
            <span className="rv__sd-degraded">이력서 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요.</span>
          )}
        </div>
      </div>

      <span className="rv__sd-postingchip">공고 · {posting_title}</span>

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
        </div>
      </div>

      <div className="rv__sd-colhead">
        <span>공고가 원하는 것 · 원문 인용</span>
        <span />
        <span className="right">내 이력서가 제공하는 것 · 판정</span>
      </div>

      <div className="rv__sd-rows">
        {requirements.map((req) => (
          <SplitDiffRow key={req.id} req={req} />
        ))}
      </div>

      <div className="rv__sd-foot">
        <span><i className="met" /> 충족 (1점)</span>
        <span><i className="partial" /> 부분 · 전이가능 (0.5점)</span>
        <span><i className="gap" /> 공백 (0점)</span>
      </div>
    </div>
  )
}

function SplitDiffRow({ req }: { req: ResumePostingLlmRequirement }) {
  const { id, text, source_quote, verdict, resume_quote, rationale, next_step } = req
  const evClass = verdict === 'met' ? 'rv__sd-side--met' : verdict === 'partial' ? 'rv__sd-side--partial' : 'rv__sd-side--gap'
  const rowClass = verdict === 'met' ? 'rv__sd-row--met' : verdict === 'partial' ? 'rv__sd-row--partial' : 'rv__sd-row--gap'

  return (
    <div className={`rv__sd-row ${rowClass}`}>
      <div className="rv__sd-side rv__sd-side--req">
        <div className="rv__sd-req-top">
          <span className="rv__sd-idx">{id}</span>
          <span className="rv__sd-req-title">{text}</span>
        </div>
        {source_quote && (
          <p className="rv__sd-quote">
            <span className="rv__sd-quote-text">{source_quote}</span>
            <span className="rv__sd-prov">공고 원문</span>
          </p>
        )}
      </div>

      <div className="rv__sd-rail">
        <span className="rv__sd-node" />
      </div>

      <div className={`rv__sd-side ${evClass}`}>
        <div className="rv__sd-ev-top">
          <span className="rv__sd-verdict">{VERDICT_LABEL[verdict]}</span>
        </div>

        {resume_quote && (
          <p className="rv__sd-quote">
            <span className="rv__sd-quote-text">{resume_quote}</span>
            <span className="rv__sd-prov">이력서 원문</span>
          </p>
        )}

        {verdict === 'gap' && !resume_quote && (
          <p className="rv__sd-gapmiss">이력서에서 근거를 찾지 못했어요</p>
        )}

        {rationale && (
          <p className="rv__sd-rationale">
            <span className="k">판정 근거</span>
            <span>{rationale}</span>
          </p>
        )}

        {next_step && (
          <div className="rv__sd-next">
            <span className="tag">보완 한 걸음</span>
            <span className="step">{next_step}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default SplitDiff
