import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RESUME_TECH_CHIPS,
  getResumeTechTransitionState,
  renderResumeTechTransition,
  resumeTechTransitionViz,
} from '../src/ppt/viz/resume-tech-transition.ts'

test('기술 30개와 개념 13개를 중복 없이 혼합한다', () => {
  const technologies = RESUME_TECH_CHIPS.filter((chip) => chip.kind === 'technology')
  const concepts = RESUME_TECH_CHIPS.filter((chip) => chip.kind === 'concept')
  const expectedConcepts = new Set([
    '대규모 트래픽 처리',
    'MSA',
    '보안',
    '분산 시스템',
    '고가용성',
    '성능 최적화',
    '실시간 처리',
    '데이터 파이프라인',
    '장애 대응',
    '모니터링·관측성',
    'API 설계',
    '클라우드 아키텍처',
    '테스트 자동화',
  ])

  assert.equal(RESUME_TECH_CHIPS.length, 43)
  assert.equal(new Set(RESUME_TECH_CHIPS.map((chip) => chip.name)).size, 43)
  assert.equal(technologies.length, 30)
  assert.equal(concepts.length, 13)
  assert.deepEqual(new Set(concepts.map((chip) => chip.name)), expectedConcepts)
  assert.deepEqual(
    new Set(technologies.map((chip) => chip.category)),
    new Set(['language', 'platform', 'infra']),
  )
  assert.ok(technologies.every((chip) => chip.logo?.path.length))
  assert.ok(concepts.every((chip) => chip.category === 'concept' && chip.symbol))

  const conceptIndices = concepts.map((concept) => RESUME_TECH_CHIPS.indexOf(concept))
  assert.ok(conceptIndices[0] < 5)
  assert.ok(conceptIndices.at(-1)! > 39)
  assert.ok(conceptIndices.slice(1).every((index, position) => index - conceptIndices[position] <= 4))
})

test('최종 더미는 열 정렬 없이 결정적인 불규칙 슬롯을 사용한다', () => {
  const rowCounts = new Map<number, number>()
  RESUME_TECH_CHIPS.forEach((chip) => rowCounts.set(chip.row, (rowCounts.get(chip.row) ?? 0) + 1))

  assert.deepEqual([...rowCounts.values()], [7, 7, 6, 6, 5, 5, 4, 3])
  assert.ok(new Set(RESUME_TECH_CHIPS.map((chip) => chip.finalOffsetX)).size >= 38)
  assert.ok(new Set(RESUME_TECH_CHIPS.map((chip) => chip.finalOffsetY)).size >= 7)
  assert.ok(new Set(RESUME_TECH_CHIPS.map((chip) => chip.finalRotation)).size >= 20)
})

test('층 경계는 약하게 흐트러지되 회전은 5도 안쪽으로 절제한다', () => {
  const rowSpreads = [...new Set(RESUME_TECH_CHIPS.map((chip) => chip.row))].map((row) => {
    const offsets = RESUME_TECH_CHIPS.filter((chip) => chip.row === row).map((chip) => chip.finalOffsetY)
    return Math.max(...offsets) - Math.min(...offsets)
  })
  const maxRotation = Math.max(...RESUME_TECH_CHIPS.map((chip) => Math.abs(chip.finalRotation)))

  assert.ok(rowSpreads.every((spread) => spread >= 8))
  assert.ok(maxRotation >= 0.075)
  assert.ok(maxRotation <= 0.087)
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

test('54% 이후 컬러 칩 43개가 순차 낙하한다', () => {
  const start = getResumeTechTransitionState(0.54, 960, 540)
  const middle = getResumeTechTransitionState(0.72, 960, 540)
  const end = getResumeTechTransitionState(0.93, 960, 540)

  assert.equal(start.chips.filter((chip) => chip.visible).length, 0)
  assert.ok(middle.chips.filter((chip) => chip.visible).length > 0)
  assert.ok(middle.chips.filter((chip) => chip.visible).length < 43)
  assert.ok(end.chips.every((chip) => chip.visible && chip.settled && chip.alpha === 1))
  assert.ok(end.chips.every((chip) => chip.labelColor === '#FFFFFF'))
})

test('마지막 0.7초는 동일한 적층 상태를 유지한다', () => {
  assert.deepEqual(
    getResumeTechTransitionState(0.93, 960, 540),
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

test('독립된 11초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(resumeTechTransitionViz.id, 'resume-tech-transition')
  assert.equal(resumeTechTransitionViz.title, '이력서에서 기술 스택으로')
  assert.equal(resumeTechTransitionViz.category, 'feature')
  assert.equal(resumeTechTransitionViz.period, 11000)
  assert.equal(resumeTechTransitionViz.render, renderResumeTechTransition)
})
