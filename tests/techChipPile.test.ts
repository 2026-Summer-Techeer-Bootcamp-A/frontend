import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TECH_CHIPS,
  getTechChipPileStates,
  renderTechChipPile,
  techChipPileViz,
} from '../src/ppt/viz/tech-chip-pile.ts'

test('첫 0.4초는 모든 기술 칩이 화면 위에 대기한다', () => {
  assert.equal(getTechChipPileStates(0.04, 960, 540).filter((chip) => chip.visible).length, 0)
})

test('16개 기술 칩이 세 카테고리 색상을 사용한다', () => {
  assert.equal(TECH_CHIPS.length, 16)
  assert.deepEqual(new Set(TECH_CHIPS.map((chip) => chip.color)), new Set(['#6EA8FE', '#34D17F', '#E2933F']))
})

test('중간 프레임에는 일부 칩만 순차 낙하한다', () => {
  const visible = getTechChipPileStates(0.45, 960, 540).filter((chip) => chip.visible).length
  assert.ok(visible > 0 && visible < 16)
})

test('마지막 1초는 4단 적층 상태를 유지한다', () => {
  const atSeven = getTechChipPileStates(7 / 8, 960, 540)
  const atEnd = getTechChipPileStates(1, 960, 540)

  assert.deepEqual(atSeven, atEnd)
  assert.equal(new Set(atEnd.map((chip) => chip.row)).size, 4)
  assert.ok(atEnd.every((chip) => chip.visible && chip.settled && chip.alpha === 1))
})

test('동일 입력은 동일하고 해상도는 3배로 비례한다', () => {
  const middle = getTechChipPileStates(0.63, 1280, 720)
  assert.deepEqual(middle, getTechChipPileStates(0.63, 1280, 720))

  const small = getTechChipPileStates(1, 1280, 720)
  const large = getTechChipPileStates(1, 3840, 2160)
  assert.ok(Math.abs(large[0].x - small[0].x * 3) < 0.000001)
  assert.ok(Math.abs(large[0].width - small[0].width * 3) < 0.000001)
})

test('독립된 8초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(techChipPileViz.id, 'tech-chip-pile')
  assert.equal(techChipPileViz.category, 'feature')
  assert.equal(techChipPileViz.period, 8000)
  assert.equal(techChipPileViz.render, renderTechChipPile)
})
