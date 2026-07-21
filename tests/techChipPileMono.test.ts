import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MONO_CHIP_STYLES,
  WHITE_MONO_STAGE_COLOR,
  renderTechChipPileMono,
  techChipPileMonoViz,
} from '../src/ppt/viz/tech-chip-pile-mono.ts'
import { TECH_CHIPS, getTechChipPileStates } from '../src/ppt/viz/tech-chip-pile.ts'

test('16개 칩에 흰색 5개, 회색 6개, 짙은 회색 5개를 분산한다', () => {
  assert.equal(MONO_CHIP_STYLES.length, 16)
  assert.deepEqual(
    MONO_CHIP_STYLES.reduce<Record<string, number>>((counts, style) => {
      counts[style.tone] = (counts[style.tone] ?? 0) + 1
      return counts
    }, {}),
    { light: 5, dark: 5, mid: 6 },
  )
})

test('기존 검은 배경 대신 고정된 화이트 스테이지를 사용한다', () => {
  assert.equal(WHITE_MONO_STAGE_COLOR, '#F7F7F5')

  const source = readFileSync(
    new URL('../src/ppt/viz/tech-chip-pile-mono.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(source, /drawBackground/)
  assert.doesNotMatch(source, /drawTopLabel|drawCaption/)
})

test('모노 버전도 기존 16개 칩의 낙하·적층 상태를 사용한다', () => {
  assert.equal(TECH_CHIPS.length, 16)

  const atStart = getTechChipPileStates(0.04, 960, 540)
  const atMiddle = getTechChipPileStates(0.45, 960, 540)
  const atEnd = getTechChipPileStates(1, 960, 540)

  assert.equal(atStart.filter((chip) => chip.visible).length, 0)
  assert.ok(atMiddle.some((chip) => chip.visible && !chip.settled))
  assert.ok(atEnd.every((chip) => chip.visible && chip.settled))
  assert.equal(new Set(atEnd.map((chip) => chip.row)).size, 4)
})

test('독립된 8초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(techChipPileMonoViz.id, 'tech-chip-pile-mono')
  assert.equal(techChipPileMonoViz.title, '기술 칩 낙하 · 모노')
  assert.equal(techChipPileMonoViz.category, 'feature')
  assert.equal(techChipPileMonoViz.period, 8000)
  assert.equal(techChipPileMonoViz.render, renderTechChipPileMono)
})

test('시각화 목록에 모노 버전이 컬러 버전과 별도로 등록된다', () => {
  const registrySource = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')

  assert.match(registrySource, /techChipPileViz/)
  assert.match(registrySource, /techChipPileMonoViz/)
})
