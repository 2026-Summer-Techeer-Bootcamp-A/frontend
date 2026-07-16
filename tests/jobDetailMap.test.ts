import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePostingMapPin, resolvePostingPin } from '../src/career/jobDetailMap.ts'

test('uses detail coordinates first regardless of posting pool label', () => {
  assert.deepEqual(
    resolvePostingPin('12', { lat: 37.5, lng: 127.0 }, { lat: 37.4, lng: 126.9 }),
    { id: '12', lat: 37.5, lng: 127.0 },
  )
})

test('falls back to live and bundled map coordinates in order', () => {
  assert.deepEqual(
    resolvePostingPin('12', { lat: null, lng: null }, { lat: 37.4, lng: 126.9 }),
    { id: '12', lat: 37.4, lng: 126.9 },
  )
  assert.deepEqual(
    resolvePostingPin('12', null, null, { lat: 37.3, lng: 126.8 }),
    { id: '12', lat: 37.3, lng: 126.8 },
  )
})

test('rejects incomplete or non-finite coordinates', () => {
  assert.equal(resolvePostingPin('12', { lat: 37.5, lng: null }), undefined)
  assert.equal(resolvePostingPin('12', { lat: Number.NaN, lng: 127.0 }), undefined)
  assert.equal(resolvePostingPin('12', { lat: Number.POSITIVE_INFINITY, lng: 127.0 }), undefined)
})

test('uses a known Korean region center when coordinates are missing', () => {
  assert.deepEqual(
    resolvePostingMapPin('82', '서울 역삼동', { lat: null, lng: null }, null),
    { id: '82', lat: 37.5007, lng: 127.0365 },
  )
})

test('replaces implausible domestic coordinates with the matching region center', () => {
  assert.deepEqual(
    resolvePostingMapPin('82', '서울 역삼동', null, { lat: -40, lng: -120 }),
    { id: '82', lat: 37.5007, lng: 127.0365 },
  )
})

test('keeps valid Korean coordinates more precise than a region center', () => {
  assert.deepEqual(
    resolvePostingMapPin('82', '서울 역삼동', { lat: 37.501, lng: 127.039 }),
    { id: '82', lat: 37.501, lng: 127.039 },
  )
})
