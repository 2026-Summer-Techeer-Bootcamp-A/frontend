import assert from 'node:assert/strict'
import test from 'node:test'

import { DEBUG_KEY_LABELS, formatDebugValue } from '../src/rag/engineDebugFormat.ts'

test('formatDebugValue는 배열을 대괄호로 감싸 콤마로 이어붙인다', () => {
  assert.equal(formatDebugValue([0.024827, -0.015291, 0.089421]), '[0.024827, -0.015291, 0.089421]')
})

test('formatDebugValue는 객체를 JSON 문자열로 만든다', () => {
  assert.equal(formatDebugValue({ pool: 'domestic', limit: 8 }), '{"pool":"domestic","limit":8}')
})

test('formatDebugValue는 null과 undefined를 em dash로 표시한다', () => {
  assert.equal(formatDebugValue(null), '—')
  assert.equal(formatDebugValue(undefined), '—')
})

test('formatDebugValue는 문자열·숫자를 그대로 문자열화한다', () => {
  assert.equal(formatDebugValue('SELECT 1'), 'SELECT 1')
  assert.equal(formatDebugValue(1024), '1024')
})

test('DEBUG_KEY_LABELS는 백엔드 debug 키를 한국어 라벨로 매핑한다', () => {
  assert.equal(DEBUG_KEY_LABELS.embedding_preview, '쿼리 벡터 프리뷰 (앞 8차원)')
  assert.equal(DEBUG_KEY_LABELS.sql, '실행 SQL')
})
