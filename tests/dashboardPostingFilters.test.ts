import assert from 'node:assert/strict'
import test from 'node:test'

import { dashboardRichOnly } from '../src/career/dashboardPostingFilters.ts'

test('설정이 켜지면 일반 타임라인 탭에 rich_only를 전달한다', () => {
  assert.equal(dashboardRichOnly('latest', true), true)
  assert.equal(dashboardRichOnly('matched', true), true)
  assert.equal(dashboardRichOnly('deadline', true), true)
})

test('설정이 꺼졌거나 북마크 탭이면 rich_only를 생략한다', () => {
  assert.equal(dashboardRichOnly('latest', false), undefined)
  assert.equal(dashboardRichOnly('bookmarks', true), undefined)
})
