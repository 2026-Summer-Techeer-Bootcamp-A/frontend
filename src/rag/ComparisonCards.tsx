import type { PostingPostingPayload, ResumeMarketPayload, ResumePostingPayload, SplitDiffPayload, ToolResult, ToolResultKind } from './chatContract'
import ResumeMarketCard from './viz/ResumeMarketCard'
import { SplitDiff } from './viz/SplitDiff'
import { postingPostingToSplitDiff, resumePostingToSplitDiff } from './viz/comparisonAdapter'

// 결과 카드 시스템(스펙 4장) — turn.results 중 비교 5종(resume_posting/posting_posting/
// resume_market/resume_posting_llm/posting_posting_llm) kind만 골라 전용 카드로 렌더하는
// 디스패처. 나머지(graph/list/stat/…)는 손대지 않고 AssistantVisualizer가 그대로 담당한다
// (kind로 분업, 회귀 없음).
const COMPARE_KINDS = new Set<ToolResultKind>(['resume_posting', 'posting_posting', 'resume_market', 'resume_posting_llm', 'posting_posting_llm'])

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
      // 태그 기반 간이 비교도 SplitDiff로 흡수한다(항상 같은 비교 UI를 쓴다는 요구사항).
      return <SplitDiff payload={resumePostingToSplitDiff(c)} />
    }
    case 'posting_posting': {
      const c = result.compare as PostingPostingPayload
      if (!Array.isArray(c.shared) || !Array.isArray(c.onlyA) || !Array.isArray(c.onlyB)) {
        return <CompareError />
      }
      // 태그 기반 간이 비교도 SplitDiff로 흡수한다(항상 같은 비교 UI를 쓴다는 요구사항).
      return <SplitDiff payload={postingPostingToSplitDiff(c)} />
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
    case 'resume_posting_llm':
    case 'posting_posting_llm': {
      const c = result.compare as SplitDiffPayload
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
