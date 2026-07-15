// @ts-nocheck -- Node's built-in test types are not part of the app tsconfig.
import assert from 'node:assert/strict'
import test from 'node:test'
import * as homeApiModule from './homeApi.ts'
import type { PostingTimelineDto } from './homeApi.ts'
import * as bookmarkStoreModule from './bookmarkStore.ts'

const summarizePostingTimeline = (daily: PostingTimelineDto['daily'], days: number) => {
  assert.equal(typeof homeApiModule.summarizePostingTimeline, 'function')
  return homeApiModule.summarizePostingTimeline!(daily, days)
}

const mergePostingTimelines = (timelines: homeApiModule.PostingTimelineDto[]) => {
  assert.equal(typeof homeApiModule.mergePostingTimelines, 'function')
  return homeApiModule.mergePostingTimelines!(timelines)
}

const mergeSkillShares = (shares: homeApiModule.SkillShareDto[], topK: number) => {
  assert.equal(typeof homeApiModule.mergeSkillShares, 'function')
  return homeApiModule.mergeSkillShares!(shares, topK)
}

function timeline(totals: number[]): PostingTimelineDto['daily'] {
  return totals.map((total, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    total,
  }))
}

test('caps only the plotted value when the latest week contains a collection outlier', () => {
  const baseline = Array.from({ length: 100 }, (_, index) => 50 + index)
  const recent = [65, 244, 36, 65, 38, 2717, 1]

  const result = summarizePostingTimeline(timeline([...baseline, ...recent]), 7)

  assert.equal(result.recent.length, 7)
  assert.equal(result.outlierCount, 1)
  assert.equal(result.recent[5].total, 2717)
  assert.equal(result.recent[5].displayTotal, result.p95)
  assert.equal(result.recent[5].isOutlier, true)
})

test('does not mark ordinary variation as an outlier', () => {
  const result = summarizePostingTimeline(timeline([8, 10, 11, 9, 12, 13, 10]), 7)

  assert.equal(result.outlierCount, 0)
  assert.deepEqual(
    result.recent.map(({ total, displayTotal }) => [total, displayTotal]),
    [[8, 8], [10, 10], [11, 11], [9, 9], [12, 12], [13, 13], [10, 10]],
  )
})

test('uses the latest non-zero, non-outlier week for the typical daily count', () => {
  const historical = [...Array.from({ length: 90 }, () => 1), ...Array.from({ length: 10 }, () => 10)]
  const result = summarizePostingTimeline(timeline([...historical, 6, 5, 2, 2, 2, 4, 4]), 7)

  assert.equal(result.median, 4)
})

test('handles empty and all-zero timelines safely', () => {
  assert.deepEqual(summarizePostingTimeline([], 7), {
    recent: [],
    median: 0,
    p95: 0,
    outlierCount: 0,
  })

  const result = summarizePostingTimeline(timeline([0, 0, 0]), 7)
  assert.equal(result.median, 0)
  assert.equal(result.p95, 0)
  assert.equal(result.outlierCount, 0)
  assert.deepEqual(result.recent.map((day) => day.displayTotal), [0, 0, 0])
})

test('merges posting timelines by date', () => {
  const result = mergePostingTimelines([
    {
      daily: [
        { date: '2026-07-09', total: 10, matched: 2 },
        { date: '2026-07-10', total: 20 },
      ],
      as_of: '2026-07-10',
    },
    {
      daily: [
        { date: '2026-07-09', total: 5, matched: 1 },
        { date: '2026-07-11', total: 7, matched: null },
      ],
      as_of: '2026-07-11',
    },
  ])

  assert.deepEqual(result, {
    daily: [
      { date: '2026-07-09', total: 15, matched: 3 },
      { date: '2026-07-10', total: 20 },
      { date: '2026-07-11', total: 7 },
    ],
    as_of: '2026-07-11',
  })
})

test('merges skill counts and recalculates combined share before taking top k', () => {
  const result = mergeSkillShares([
    {
      items: [
        { canonical: 'React', category: 'frontend', posting_count: 30, share: 0.3 },
        { canonical: 'Go', category: 'language', posting_count: 20, share: 0.2 },
      ],
      as_of: '2026-07-10',
      sample_size: 100,
    },
    {
      items: [
        { canonical: 'Kotlin', category: 'language', posting_count: 50, share: 0.25 },
        { canonical: 'React', category: 'frontend', posting_count: 40, share: 0.2 },
        { canonical: 'Go', category: 'language', posting_count: 10, share: 0.05 },
      ],
      as_of: '2026-07-11',
      sample_size: 200,
    },
  ], 2)

  assert.deepEqual(result, {
    items: [
      { canonical: 'React', category: 'frontend', posting_count: 70, share: 0.2333 },
      { canonical: 'Kotlin', category: 'language', posting_count: 50, share: 0.1667 },
    ],
    as_of: '2026-07-11',
    sample_size: 300,
  })
})

test('loads available bookmark details even when one posting request fails', async () => {
  assert.equal(typeof bookmarkStoreModule.loadBookmarkDetails, 'function')

  const result = await bookmarkStoreModule.loadBookmarkDetails!(
    ['domestic-1', 'missing', 'global-2'],
    async (id: string) => {
      if (id === 'missing') throw new Error('not found')
      return { id, title: `posting ${id}` }
    },
  )

  assert.deepEqual(result, [
    { id: 'domestic-1', title: 'posting domestic-1' },
    { id: 'global-2', title: 'posting global-2' },
  ])
})
