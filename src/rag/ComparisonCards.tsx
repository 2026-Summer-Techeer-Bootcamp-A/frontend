import type { PostingPostingPayload, ResumeMarketPayload, ResumePostingLlmPayload, ResumePostingPayload, ToolResult, ToolResultKind } from './chatContract'
import SkillDiff from './viz/SkillDiff'
import PostingDiff from './viz/PostingDiff'
import ResumeMarketCard from './viz/ResumeMarketCard'
import CoverageRing from './viz/CoverageRing'
import { SplitDiff } from './viz/SplitDiff'

// 결과 카드 시스템(스펙 4장) — turn.results 중 비교 4종(resume_posting/posting_posting/
// resume_market/resume_posting_llm) kind만 골라 전용 카드로 렌더하는 디스패처. 나머지(graph/list/
// stat/…)는 손대지 않고 AssistantVisualizer가 그대로 담당한다(kind로 분업, 회귀 없음).
const COMPARE_KINDS = new Set<ToolResultKind>(['resume_posting', 'posting_posting', 'resume_market', 'resume_posting_llm'])

export function isCompareResult(result: ToolResult): boolean {
  return COMPARE_KINDS.has(result.kind) && result.compare != null
}

interface ComparisonCardsProps {
  results: ToolResult[]
}

// 기본 모드에서 쓰는 배열 디스패처 — AssistantVisualizer 앞에 삽입된다(스펙 4.2).
export default function ComparisonCards({ results }: ComparisonCardsProps) {
  const compareResults = results.filter(isCompareResult)
  if (compareResults.length === 0) return null

  return (
    <div className="rv__comparecards">
      {compareResults.map((r, i) => (
        <ComparisonCard key={`${r.kind}-${i}`} result={r} />
      ))}
    </div>
  )
}

// "모든 과정 보기(log)" 모드의 ToolResultCard가 개별 result 하나를 렌더할 때도 같은 카드를 쓴다.
export function ComparisonCard({ result }: { result: ToolResult }) {
  if (!isCompareResult(result)) return null

  switch (result.kind) {
    case 'resume_posting': {
      const c = result.compare as ResumePostingPayload
      if (!Array.isArray(c.matched_skills) || !Array.isArray(c.missing_skills)) {
        return <CompareError />
      }
      return (
        <div className="rc__viz-box rv__comparecard">
          <div className="rc__viz-header">
            <span className="rc__viz-title">{c.resume_title} ↔ {c.posting_title}</span>
          </div>
          <div className="rv__rp-body">
            <CoverageRing
              score={c.coverage_pct}
              ownedCount={c.matched_skills.length}
              totalCount={c.matched_skills.length + c.missing_skills.length}
              size={112}
            />
            <SkillDiff matched={c.matched_skills} missing={c.missing_skills} extra={c.extra_skills} />
          </div>
        </div>
      )
    }
    case 'posting_posting': {
      const c = result.compare as PostingPostingPayload
      if (!Array.isArray(c.shared) || !Array.isArray(c.onlyA) || !Array.isArray(c.onlyB)) {
        return <CompareError />
      }
      return (
        <div className="rc__viz-box rv__comparecard">
          <div className="rc__viz-header">
            <span className="rc__viz-title">{c.postingA} ↔ {c.postingB}</span>
          </div>
          <PostingDiff shared={c.shared} onlyA={c.onlyA} onlyB={c.onlyB} labelA={`${c.postingA}만`} labelB={`${c.postingB}만`} />
          <div className="rv__pd-summary">
            공통 {c.shared.length}개 · {c.postingA} 고유 {c.onlyA.length} · {c.postingB} 고유 {c.onlyB.length}
          </div>
        </div>
      )
    }
    case 'resume_market': {
      const c = result.compare as ResumeMarketPayload
      if (!Array.isArray(c.radar) || !Array.isArray(c.gap_top5)) {
        return <CompareError />
      }
      return (
        <div className="rc__viz-box rv__comparecard">
          <div className="rc__viz-header">
            <span className="rc__viz-title">내 이력서 ↔ 시장</span>
          </div>
          <ResumeMarketCard payload={c} />
        </div>
      )
    }
    case 'resume_posting_llm': {
      const c = result.compare as ResumePostingLlmPayload
      if (!Array.isArray(c.requirements) || !c.counts) {
        return <CompareError />
      }
      return <SplitDiff payload={c} />
    }
    default:
      return null
  }
}

// 비교 payload가 예상 필드를 갖추지 못한 방어적 케이스(스펙 3.e 에러 상태) — 크래시 대신 안내.
function CompareError() {
  return (
    <div className="rc__error">
      <span className="rc__error-text">비교할 데이터가 부족해요.</span>
    </div>
  )
}
