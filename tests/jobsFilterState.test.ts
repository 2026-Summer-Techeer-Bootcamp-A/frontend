import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeSkillOptions,
  normalizeJobSort,
  parseDeadlineDays,
  toPositionFilterOptions,
} from '../src/desktop/pages/jobsFilterState.ts'

test('기존 deadline=1을 7일로 해석한다', () => {
  assert.equal(parseDeadlineDays(new URLSearchParams('deadline=1')), 7)
})

test('지원하는 마감 기간만 URL에서 읽는다', () => {
  assert.equal(parseDeadlineDays(new URLSearchParams('deadline_days=14')), 14)
  assert.equal(parseDeadlineDays(new URLSearchParams('deadline_days=9')), undefined)
})

test('이력서 없는 사용자의 매칭순을 최신순으로 정규화한다', () => {
  assert.equal(normalizeJobSort('match', false, '국내'), 'latest')
})

test('글로벌의 마감순을 최신순으로 정규화한다', () => {
  assert.equal(normalizeJobSort('deadline', true, '국외'), 'latest')
})

test('선택 기술과 API 기술을 중복 없이 합친다', () => {
  assert.deepEqual(mergeSkillOptions(['Java'], ['Java', 'Spring']), ['Java', 'Spring'])
})

test('직무 선택값은 DB 카테고리명을 변환하지 않고 그대로 사용한다', () => {
  assert.deepEqual(
    toPositionFilterOptions([
      { name: '백엔드', is_tech: true },
      { name: '인프라/DevOps', is_tech: true },
      { name: '기획/PM', is_tech: false },
    ]),
    [
      { value: '백엔드', label: '백엔드' },
      { value: '인프라/DevOps', label: '인프라/DevOps' },
      { value: '기획/PM', label: '기획/PM' },
    ],
  )
})

test('직무 API가 비어 있으면 임의 폴백을 만들지 않는다', () => {
  assert.deepEqual(toPositionFilterOptions([]), [])
})
