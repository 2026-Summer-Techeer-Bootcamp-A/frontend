import assert from 'node:assert/strict'
import test from 'node:test'

import {
  beginResumeSessionSeed,
  resolveResumeSessionId,
} from '../src/rag/resumeSession.ts'

test('이력서 원문 세션 생성이 끝난 뒤 해당 세션 ID를 채팅 요청에 제공한다', async () => {
  let finishSeed: (sessionId: string) => void = () => {}
  const seed = new Promise<string>((resolve) => {
    finishSeed = resolve
  })

  beginResumeSessionSeed(17, seed)

  let resolved = false
  const sessionIdPromise = resolveResumeSessionId(17).then((sessionId) => {
    resolved = true
    return sessionId
  })

  await Promise.resolve()
  assert.equal(resolved, false)

  finishSeed('resume-session-17')

  assert.equal(await sessionIdPromise, 'resume-session-17')
})

test('이력서 원문 세션 생성이 실패하면 다른 세션 ID를 잘못 재사용하지 않는다', async () => {
  beginResumeSessionSeed(18, Promise.reject(new Error('confirm failed')))

  assert.equal(await resolveResumeSessionId(18), undefined)
})
