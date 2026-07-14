import assert from 'node:assert/strict'
import test from 'node:test'

import { jobsApi } from '../src/career/api.ts'

test('기술 사전은 표준 /api/v1/skills 경로로 조회한다', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''

  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({ skills: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await jobsApi.skills('spring', 20)
    assert.equal(requestedUrl, '/api/v1/skills?q=spring&limit=20')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('직무 목록은 현재 채용 풀을 포함해 조회한다', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''

  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({ categories: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await jobsApi.categories('domestic')
    assert.equal(requestedUrl, '/api/v1/job-categories?pool=domestic')
  } finally {
    globalThis.fetch = originalFetch
  }
})
