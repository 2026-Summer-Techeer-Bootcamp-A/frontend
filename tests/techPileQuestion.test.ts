import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getTechPileQuestionFrame,
  renderTechPileQuestion,
  techPileQuestionViz,
} from '../src/ppt/viz/tech-pile-question.ts'
import { getTechChipPileStates } from '../src/ppt/viz/tech-chip-pile.ts'

test('모든 시점에 16개 칩이 같은 최종 적층 상태로 고정된다', () => {
  const start = getTechPileQuestionFrame(0, 960, 540)
  const end = getTechPileQuestionFrame(1, 960, 540)

  assert.equal(start.chips.length, 16)
  assert.ok(start.chips.every((chip) => chip.visible && chip.settled))
  assert.deepEqual(start.chips, end.chips)
  assert.deepEqual(start.chips, getTechChipPileStates(1, 960, 540))
})

test('낙하 장면과 같은 화이트 스테이지를 사용한다', () => {
  const source = readFileSync(new URL('../src/ppt/viz/tech-pile-question.ts', import.meta.url), 'utf8')

  assert.match(source, /WHITE_MONO_STAGE_COLOR/)
  assert.doesNotMatch(source, /drawBackground/)
})

test('질문이 페이드인하고 유지된 뒤 페이드아웃한다', () => {
  assert.equal(getTechPileQuestionFrame(0, 960, 540).questionAlpha, 0)
  assert.ok(getTechPileQuestionFrame(0.06, 960, 540).questionAlpha > 0)
  assert.equal(getTechPileQuestionFrame(0.4, 960, 540).questionAlpha, 1)
  assert.ok(getTechPileQuestionFrame(0.82, 960, 540).questionAlpha < 1)
  assert.equal(getTechPileQuestionFrame(0.94, 960, 540).questionAlpha, 0)
})

test('독립된 5초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(techPileQuestionViz.id, 'tech-pile-question')
  assert.equal(techPileQuestionViz.title, '기술 더미 질문')
  assert.equal(techPileQuestionViz.category, 'feature')
  assert.equal(techPileQuestionViz.period, 5000)
  assert.equal(techPileQuestionViz.render, renderTechPileQuestion)
})

test('시각화 목록에 별도 항목으로 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /techPileQuestionViz/)
})
