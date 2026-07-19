import type { Confidence, SplitDiffPayload, ToolResult } from './chatContract'

// 4d 후속 질문 체인 — final 프레임 직후 구조화된 응답(비교 판정, 공고 목록, 그 외 랭킹/통계)을
// 보고 휴리스틱으로 후속 질문 3개를 만든다. 배지에는 항상 방금 답변에서 나온 실제 수치를
// 인용해 "왜 이걸 물어보라는지"가 칩 자체에서 드러나게 한다.

export interface FollowUp {
  badge: string
  question: string
}

function isSplitDiffCompare(r: ToolResult): r is ToolResult & { compare: SplitDiffPayload } {
  return (r.kind === 'resume_posting_llm' || r.kind === 'posting_posting_llm') && !!r.compare && 'counts' in r.compare
}

function compareFollowUps(payload: SplitDiffPayload): FollowUp[] {
  const score = Math.round(Math.max(0, Math.min(100, payload.score)))
  const { met, partial, gap } = payload.counts
  const gapReq = payload.requirements.find((r) => r.verdict === 'gap')
  const partialReq = payload.requirements.find((r) => r.verdict === 'partial')

  const candidates: FollowUp[] = []
  if (gapReq) candidates.push({ badge: `공백 ${gap}건`, question: `${gapReq.text}을(를) 배우면 적합도가 얼마나 오르나요?` })
  candidates.push({ badge: `적합 ${score}%`, question: '이 정도 적합도면 지금 지원해도 승산이 있을까요?' })
  if (partialReq) candidates.push({ badge: `부분 ${partial}건`, question: `${partialReq.text} 경험을 이력서에 어떻게 녹여야 할까요?` })
  candidates.push({ badge: `충족 ${met}건`, question: '충족한 부분을 이력서에서 더 강조하려면 어떻게 써야 할까요?' })
  return candidates.slice(0, 3)
}

function postingListFollowUps(n: number): FollowUp[] {
  return [
    { badge: `공고 ${n}건`, question: '이 중 신입도 지원 가능한 곳은 어디야?' },
    { badge: `공고 ${n}건`, question: '적합도가 가장 높은 순서로 정리해줘' },
    { badge: `공고 ${n}건`, question: '이 중 원격 근무 가능한 곳 있어?' },
  ]
}

function genericFollowUps(n: number): FollowUp[] {
  const badge = n > 0 ? `표본 ${n}건` : '표본 기반'
  return [
    { badge, question: '이 결과를 내 이력서 기준으로 다시 봐줘' },
    { badge, question: '관련 기술을 더 자세히 알려줘' },
    { badge, question: '최근 흐름은 어떻게 바뀌고 있어?' },
  ]
}

export function buildFollowUps(confidence: Confidence, results: ToolResult[]): FollowUp[] {
  const compare = results.find(isSplitDiffCompare)
  if (compare) return compareFollowUps(compare.compare as SplitDiffPayload)

  const postingList = results.find((r) => r.kind === 'posting_list' && r.items.length > 0)
  if (postingList) return postingListFollowUps(postingList.items.length)

  return genericFollowUps(confidence.n)
}
