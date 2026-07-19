// 태그 기반 비교 payload(resume_posting/posting_posting)를 SplitDiffPayload 모양으로
// 변환하는 순수 함수 모음. 사용자 요구: "이력서·공고 비교는 항상 SplitDiff UI를 쓴다" —
// LLM 원문 판정이 안 되는 공고도 태그 비교 결과를 SplitDiff 카드에 흡수시켜 UI를 통일한다.
// 원천 타입: ./chatContract (수정하지 않음, import만 한다).
import type {
  PostingPostingPayload,
  RequirementVerdict,
  ResumePostingPayload,
  SplitDiffPayload,
  SplitDiffRequirement,
} from '../chatContract'

function makeRequirement(id: string, text: string, verdict: RequirementVerdict, nextStep: string): SplitDiffRequirement {
  return {
    id,
    text,
    source_quote: '',
    verdict,
    quote: '',
    rationale: '',
    next_step: nextStep,
  }
}

// resume_posting(태그 기반 이력서 vs 공고) → SplitDiffPayload.
// base는 공고(요구 기준), target은 이력서(판정 대상)로 맞춘다 — resume_posting_llm과 방향 일치.
export function resumePostingToSplitDiff(c: ResumePostingPayload): SplitDiffPayload {
  const matched = Array.isArray(c.matched_skills) ? c.matched_skills : []
  const missing = Array.isArray(c.missing_skills) ? c.missing_skills : []

  const requirements: SplitDiffRequirement[] = []
  let seq = 1
  for (const skill of matched) {
    requirements.push(makeRequirement(`R${seq}`, skill, 'met', ''))
    seq += 1
  }
  for (const skill of missing) {
    requirements.push(makeRequirement(`R${seq}`, skill, 'gap', '이 기술을 이력서에 추가하거나 학습해 보완하세요'))
    seq += 1
  }

  return {
    base_role: '공고',
    base_title: c.posting_title ?? '',
    target_role: '내 이력서',
    target_title: c.resume_title ?? '',
    score: c.coverage_pct ?? 0,
    counts: { met: matched.length, partial: 0, gap: missing.length },
    summary: '보유 기술 태그를 기준으로 한 간이 비교예요. 왼쪽에서 이력서를 분석하면 공고 원문 기반 정밀 판정으로 바뀌어요.',
    requirements,
    degraded: true,
  }
}

// posting_posting(태그 기반 공고 vs 공고) → SplitDiffPayload.
// base는 A 공고(요구 기준), target은 B 공고(판정 대상)로 맞춘다. onlyB(B만 요구)는 A 기준
// 비교에서 표현할 자리가 없어 생략한다.
export function postingPostingToSplitDiff(c: PostingPostingPayload): SplitDiffPayload {
  const shared = Array.isArray(c.shared) ? c.shared : []
  const onlyA = Array.isArray(c.onlyA) ? c.onlyA : []

  const requirements: SplitDiffRequirement[] = []
  let seq = 1
  for (const skill of shared) {
    requirements.push(makeRequirement(`R${seq}`, skill, 'met', ''))
    seq += 1
  }
  for (const skill of onlyA) {
    requirements.push(makeRequirement(`R${seq}`, skill, 'gap', ''))
    seq += 1
  }

  const total = shared.length + onlyA.length
  const score = total === 0 ? 0 : Math.round((shared.length / total) * 100)

  return {
    base_role: c.postingA ?? '',
    base_title: '',
    target_role: c.postingB ?? '',
    target_title: '',
    score,
    counts: { met: shared.length, partial: 0, gap: onlyA.length },
    summary: 'A 공고 기준 요구 기술을 B 공고와 대조한 간이 비교예요.',
    requirements,
    degraded: true,
  }
}
