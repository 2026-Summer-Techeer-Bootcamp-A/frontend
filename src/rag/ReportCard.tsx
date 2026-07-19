import { Bookmark, BookmarkCheck } from 'lucide-react'
import type { ChatAttachment, Citation, Confidence, SplitDiffPayload, ToolResult } from './chatContract'
import { isBookmarked, toggleBookmark, useBookmarks } from '../career/bookmarkStore'

// 3a 리포트 카드 — FinalBlock 상단에 얹는 요약 헤드라인 + SplitDiff 미니 스트립 + 다음 액션.
// 카드 왼쪽 세로 액센트 보더는 쓰지 않는다(AI 클리셰 지적으로 SplitDiff.css에서도 이미 제거된
// 디테일, 같은 이유로 여기서도 배제) — 대신 배경 틴트(rc__report)와 스코어 배지 색으로 상태를
// 구분한다. 커리어 적합도(resume_posting_llm) 결과가 있을 때만 스코어·스트립·북마크 CTA를
// 채우고, 그 외 응답 유형은 헤드라인 한 줄만 보여준다(스펙 3.a: "데이터가 없는 응답 유형이면
// 헤드라인만").

interface ReportCardProps {
  answer: string
  citations: Citation[]
  confidence: Confidence
  results: ToolResult[]
  attachments: ChatAttachment[]
}

// 백엔드 제한 마크다운(문단 \n\n, - 목록)에서 첫 문장만 뽑아 헤드라인으로 쓴다. 마침표·물음표·
// 느낌표·한국어 종결(~요.) 중 가장 먼저 나오는 경계에서 자른다 — 못 찾으면 앞부분을 자른다.
function extractHeadline(answer: string): string {
  const firstBlock = answer.split(/\n{2,}/)[0]?.trim() ?? ''
  const firstLine = firstBlock.split('\n')[0]?.replace(/^-\s*/, '').trim() ?? ''
  if (!firstLine) return '답변을 확인해 보세요'
  const match = firstLine.match(/^.{4,120}?[.!?](?:\s|$)/)
  const sentence = match ? match[0].trim() : firstLine
  return sentence.length > 110 ? `${sentence.slice(0, 108)}…` : sentence
}

function isSplitDiffCompare(r: ToolResult): r is ToolResult & { compare: SplitDiffPayload } {
  return (r.kind === 'resume_posting_llm' || r.kind === 'posting_posting_llm') && !!r.compare && 'counts' in r.compare
}

export default function ReportCard({ answer, results, attachments }: ReportCardProps) {
  useBookmarks() // 북마크 변경 시 CTA 상태(저장됨/북마크)가 다시 렌더되도록 구독
  const compareResult = results.find(isSplitDiffCompare)

  if (!compareResult) {
    return (
      <div className="rc__report">
        <div className="rc__report-head">
          <div className="rc__report-headline">{extractHeadline(answer)}</div>
        </div>
      </div>
    )
  }

  const payload = compareResult.compare as SplitDiffPayload
  const score = Math.round(Math.max(0, Math.min(100, payload.score)))
  const { met, partial, gap } = payload.counts

  // 북마크 대상은 이력서 vs 공고 비교(resume_posting_llm)에서만 명확하다 — posting_posting_llm은
  // 공고가 둘이라 "그 공고"가 어느 쪽인지 모호해 CTA를 생략한다.
  const postingAttachment =
    compareResult.kind === 'resume_posting_llm' ? attachments.find((a) => a.kind === 'posting') : undefined
  const postingId = postingAttachment ? String(postingAttachment.id) : null
  const bookmarked = postingId !== null && isBookmarked(postingId)

  return (
    <div className="rc__report">
      <div className="rc__report-head">
        <div className="rc__report-score">
          <div className="rc__report-score-v">{score}%</div>
          <div className="rc__report-score-l">적합도</div>
        </div>
        <div className="rc__report-headline">{payload.summary || extractHeadline(answer)}</div>
      </div>

      <div className="rc__report-strip">
        <span className="rc__report-pill rc__report-pill--met">충족 {met}</span>
        <span className="rc__report-pill rc__report-pill--partial">부분 {partial}</span>
        <span className="rc__report-pill rc__report-pill--gap">공백 {gap}</span>
      </div>

      {postingId !== null && (
        <button
          type="button"
          className="rc__report-cta"
          aria-pressed={bookmarked}
          onClick={() => toggleBookmark(postingId)}
        >
          {bookmarked ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
          {bookmarked ? '북마크됨' : '해당 공고 북마크에 추가'}
        </button>
      )}
    </div>
  )
}
