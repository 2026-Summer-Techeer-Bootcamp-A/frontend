import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RESUME_TECH_CHIPS,
  getResumeTechTransitionState,
} from '../src/ppt/viz/resume-tech-transition.ts'

test('승인된 30개 기술과 세 분야 컬러를 제공한다', () => {
  assert.equal(RESUME_TECH_CHIPS.length, 30)
  assert.equal(new Set(RESUME_TECH_CHIPS.map((chip) => chip.name)).size, 30)
  assert.deepEqual(
    new Set(RESUME_TECH_CHIPS.map((chip) => chip.category)),
    new Set(['language', 'platform', 'infra']),
  )
  assert.ok(RESUME_TECH_CHIPS.every((chip) => chip.logo.path.length > 0))
})

test('이력서와 기술 칩은 어떤 프레임에도 함께 보이지 않는다', () => {
  for (let frame = 0; frame <= 600; frame += 1) {
    const state = getResumeTechTransitionState(frame / 600, 960, 540)
    const resumesVisible = state.resumes.some((card) => card.visible && card.alpha > 0)
    const chipsVisible = state.chips.some((chip) => chip.visible && chip.alpha > 0)
    assert.equal(resumesVisible && chipsVisible, false, `frame ${frame}`)
  }
})

test('52~54% 구간은 완전히 빈 전환이다', () => {
  for (const progress of [0.52, 0.53, 0.5399]) {
    const state = getResumeTechTransitionState(progress, 960, 540)
    assert.equal(state.phase, 'gap')
    assert.equal(state.resumes.some((card) => card.visible), false)
    assert.equal(state.chips.some((chip) => chip.visible), false)
  }
})

test('이력서 6장이 쌓인 뒤 위로 이동하며 사라진다', () => {
  const stacked = getResumeTechTransitionState(0.42, 960, 540)
  const exiting = getResumeTechTransitionState(0.48, 960, 540)
  const gone = getResumeTechTransitionState(0.52, 960, 540)

  assert.equal(stacked.resumes.filter((card) => card.visible).length, 6)
  assert.ok(stacked.resumes.every((card) => card.alpha === 1))
  assert.ok(exiting.resumes[5].y < stacked.resumes[5].y)
  assert.ok(exiting.resumes[5].alpha < 1)
  assert.equal(gone.resumes.some((card) => card.visible), false)
})

test('54% 이후 컬러 기술 칩 30개가 순차 낙하한다', () => {
  const start = getResumeTechTransitionState(0.54, 960, 540)
  const middle = getResumeTechTransitionState(0.72, 960, 540)
  const end = getResumeTechTransitionState(0.92, 960, 540)

  assert.equal(start.chips.filter((chip) => chip.visible).length, 0)
  assert.ok(middle.chips.filter((chip) => chip.visible).length > 0)
  assert.ok(middle.chips.filter((chip) => chip.visible).length < 30)
  assert.ok(end.chips.every((chip) => chip.visible && chip.settled && chip.alpha === 1))
  assert.ok(end.chips.every((chip) => chip.labelColor === '#FFFFFF'))
})

test('마지막 0.8초는 동일한 적층 상태를 유지한다', () => {
  assert.deepEqual(
    getResumeTechTransitionState(0.92, 960, 540),
    getResumeTechTransitionState(1, 960, 540),
  )
})

test('동일 입력은 결정적이고 4K 레이아웃은 720p의 3배다', () => {
  const first = getResumeTechTransitionState(0.76, 1280, 720)
  assert.deepEqual(first, getResumeTechTransitionState(0.76, 1280, 720))

  const small = getResumeTechTransitionState(1, 1280, 720)
  const large = getResumeTechTransitionState(1, 3840, 2160)
  assert.ok(Math.abs(large.chips[0].x - small.chips[0].x * 3) < 0.000001)
  assert.ok(Math.abs(large.chips[0].width - small.chips[0].width * 3) < 0.000001)
  assert.ok(Math.abs(large.resumes[5].width - small.resumes[5].width * 3) < 0.000001)
})
