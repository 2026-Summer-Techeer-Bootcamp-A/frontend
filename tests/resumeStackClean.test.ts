import test from 'node:test'
import assert from 'node:assert/strict'
import { getResumeStackStates } from '../src/ppt/viz/resume-stack-clean.ts'

test('첫 0.4초는 모든 이력서가 화면 밖에 있다', () => {
  const cards = getResumeStackStates(0.05, 960, 540)
  assert.equal(cards.filter((card) => card.visible).length, 0)
})

test('이력서 6장이 시간차를 두고 순서대로 나타난다', () => {
  const early = getResumeStackStates(0.2, 960, 540)
  const middle = getResumeStackStates(0.5, 960, 540)

  assert.ok(early.filter((card) => card.visible).length >= 1)
  assert.ok(middle.filter((card) => card.visible).length > early.filter((card) => card.visible).length)
})

test('마지막 1초는 중앙의 동일한 정돈 상태를 유지한다', () => {
  const atFive = getResumeStackStates(5 / 6, 960, 540)
  const atEnd = getResumeStackStates(1, 960, 540)

  assert.deepEqual(atFive, atEnd)
  assert.equal(atEnd.length, 6)
  assert.ok(atEnd.every((card) => card.visible && card.alpha === 1))
})

test('레이아웃은 해상도에 비례한다', () => {
  const small = getResumeStackStates(1, 1280, 720)
  const large = getResumeStackStates(1, 3840, 2160)

  assert.ok(Math.abs(large[5].x - small[5].x * 3) < 0.000001)
  assert.ok(Math.abs(large[5].y - small[5].y * 3) < 0.000001)
  assert.ok(Math.abs(large[5].width - small[5].width * 3) < 0.000001)
})
