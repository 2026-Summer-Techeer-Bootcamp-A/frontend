import assert from 'node:assert/strict'
import test from 'node:test'

import { selectDisplayedCoverage } from '../src/career/coverageScore.ts'

const coverage = {
  coverage_score: 46.2,
  score: 41.7,
}

test('기본 설정에서는 API 요구빈도 커버리지를 반올림해 표시한다', () => {
  assert.equal(selectDisplayedCoverage(coverage, 'legacy'), 46)
})

test('weighted-v1 설정에서만 보정 점수를 반올림해 표시한다', () => {
  assert.equal(selectDisplayedCoverage(coverage, 'weighted-v1'), 42)
})

test('weighted-v1 응답에 보정 점수가 없으면 기본 커버리지를 사용한다', () => {
  assert.equal(selectDisplayedCoverage({ coverage_score: 46.2 }, 'weighted-v1'), 46)
})
