import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MARKET_GLYPHS,
  getServiceTitleRevealFrame,
  renderServiceTitleReveal,
  serviceTitleRevealViz,
} from '../src/ppt/viz/service-title-reveal.ts'
import { getTechChipPileStates } from '../src/ppt/viz/tech-chip-pile.ts'

test('첫 프레임은 기술 더미 질문의 마지막 더미와 동일하다', () => {
  const frame = getServiceTitleRevealFrame(0, 960, 540)
  const pile = getTechChipPileStates(1, 960, 540)

  assert.equal(frame.chips.length, 16)
  assert.deepEqual(
    frame.chips.map(({ name, x, y, width, height, rotation, alpha }) => ({
      name, x, y, width, height, rotation, alpha,
    })),
    pile.map(({ name, x, y, width, height, rotation, alpha }) => ({
      name, x, y, width, height, rotation, alpha,
    })),
  )
  assert.equal(frame.floorAlpha, 1)
  assert.equal(frame.brandAlpha, 0)
})

test('24개 시장 요소가 고정된 순서와 좌표를 가진다', () => {
  assert.equal(MARKET_GLYPHS.length, 24)
  assert.deepEqual(MARKET_GLYPHS[0], { x: 646, y: 126, width: 42, kind: 'dot', delay: 0 })
  assert.deepEqual(MARKET_GLYPHS[23], { x: 844, y: 396, width: 34, kind: 'card', delay: 782 })
})

test('더미가 이력서로 압축되고 시장 데이터가 나타난다', () => {
  const frame = getServiceTitleRevealFrame(0.28, 960, 540)

  assert.ok(frame.resumeAlpha > 0)
  assert.ok(frame.resumeProgress > 0)
  assert.ok(frame.chips.some((chip) => chip.compressProgress > 0))
  assert.ok(frame.market.some((glyph) => glyph.alpha > 0))
})

test('중간에는 좌우 입자가 중앙으로 이동하고 심볼이 조립된다', () => {
  const frame = getServiceTitleRevealFrame(0.6, 960, 540)

  assert.ok(frame.particles.some((particle) => particle.alpha > 0 && particle.progress > 0))
  assert.ok(frame.markProgress > 0)
})

test('마지막에는 심볼과 서비스 타이틀만 남는다', () => {
  const frame = getServiceTitleRevealFrame(1, 960, 540)

  assert.ok(frame.chips.every((chip) => chip.alpha === 0))
  assert.equal(frame.resumeAlpha, 0)
  assert.ok(frame.market.every((glyph) => glyph.alpha === 0))
  assert.equal(frame.markProgress, 1)
  assert.equal(frame.brandAlpha, 1)
  assert.equal(frame.taglineAlpha, 1)
})

test('동일 입력은 동일하고 2배 해상도에서 좌표와 크기도 2배다', () => {
  const small = getServiceTitleRevealFrame(0.5, 960, 540)
  assert.deepEqual(small, getServiceTitleRevealFrame(0.5, 960, 540))

  const large = getServiceTitleRevealFrame(0.5, 1920, 1080)
  assert.ok(Math.abs(large.chips[0].x - small.chips[0].x * 2) < 0.000001)
  assert.ok(Math.abs(large.market[0].width - small.market[0].width * 2) < 0.000001)
})

test('독립된 7초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(serviceTitleRevealViz.id, 'service-title-reveal')
  assert.equal(serviceTitleRevealViz.title, 'Career Fit 타이틀')
  assert.equal(serviceTitleRevealViz.category, 'feature')
  assert.equal(serviceTitleRevealViz.period, 7000)
  assert.equal(serviceTitleRevealViz.render, renderServiceTitleReveal)
})

test('기술 더미 질문 바로 다음에 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')

  assert.match(source, /techPileQuestionViz,\s*serviceTitleRevealViz,/)
})
