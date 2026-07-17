export type CoverageScoreInput = {
  coverage_score: number
  score?: number
}

/** 대시보드와 마이페이지가 동일한 API 점수를 표시하도록 선택 규칙을 한곳에 둔다. */
export function selectDisplayedCoverage(
  data: CoverageScoreInput,
  scoreVersion: string | undefined,
): number {
  const value = scoreVersion === 'weighted-v1' && data.score != null
    ? data.score
    : data.coverage_score

  return Math.round(value)
}
