import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DIRECTION_PATHS,
  getServiceTitleDirectionFrame,
  renderServiceTitleDirection,
  serviceTitleDirectionViz,
} from '../src/ppt/viz/service-title-direction.ts'

test('다섯 후보 중 가운데 셋째 경로만 선택된다', () => {
  assert.equal(DIRECTION_PATHS.length, 5)
  assert.deepEqual(
    DIRECTION_PATHS.map((path) => path.selected),
    [false, false, true, false, false],
  )
})

test('시작 구간에는 현재 위치만 나타나고 경로와 브랜드는 보이지 않는다', () => {
  const frame = getServiceTitleDirectionFrame(0.08, 960, 540)

  assert.ok(frame.originAlpha > 0)
  assert.ok(frame.originPulse > 0)
  assert.ok(frame.paths.every((path) => path.drawProgress === 0))
  assert.equal(frame.scan.alpha, 0)
  assert.equal(frame.brandAlpha, 0)
})

test('탐색 구간에는 한 경로 위에서만 탐색 빛이 이동한다', () => {
  const frame = getServiceTitleDirectionFrame(0.36, 960, 540)

  assert.ok(frame.paths.every((path) => path.drawProgress > 0))
  assert.ok(frame.scan.pathIndex >= 0 && frame.scan.pathIndex < 5)
  assert.ok(frame.scan.progress > 0 && frame.scan.progress < 1)
  assert.ok(frame.scan.alpha > 0)
})

test('선택 구간에는 가운데 경로만 선명하고 나머지는 끝부터 사라진다', () => {
  const frame = getServiceTitleDirectionFrame(0.58, 960, 540)
  const selected = frame.paths[2]
  const rejected = frame.paths.filter((path) => !path.selected)

  assert.equal(selected.selectionProgress, 1)
  assert.equal(selected.visibleEnd, 1)
  assert.ok(rejected.every((path) => path.visibleEnd < 1))
  assert.ok(rejected.every((path) => path.alpha < selected.alpha))
})

test('마지막에는 경로와 탐색 빛이 사라지고 브랜드만 남는다', () => {
  const frame = getServiceTitleDirectionFrame(1, 960, 540)

  assert.ok(frame.paths.every((path) => path.alpha === 0))
  assert.equal(frame.originAlpha, 0)
  assert.equal(frame.scan.alpha, 0)
  assert.equal(frame.markProgress, 1)
  assert.equal(frame.brandAlpha, 1)
  assert.equal(frame.taglineAlpha, 1)
})

test('동일 입력은 동일하고 2배 해상도에서 경로 좌표와 심볼도 2배다', () => {
  const small = getServiceTitleDirectionFrame(0.5, 960, 540)
  assert.deepEqual(small, getServiceTitleDirectionFrame(0.5, 960, 540))

  const large = getServiceTitleDirectionFrame(0.5, 1920, 1080)
  assert.ok(Math.abs(large.paths[0].start.x - small.paths[0].start.x * 2) < 0.000001)
  assert.ok(Math.abs(large.paths[0].end.y - small.paths[0].end.y * 2) < 0.000001)
  assert.ok(Math.abs(large.markX - small.markX * 2) < 0.000001)
})

test('독립된 7초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(serviceTitleDirectionViz.id, 'service-title-direction')
  assert.equal(serviceTitleDirectionViz.title, 'Career Fit 타이틀 · 방향')
  assert.equal(serviceTitleDirectionViz.category, 'feature')
  assert.equal(serviceTitleDirectionViz.period, 7000)
  assert.equal(serviceTitleDirectionViz.render, renderServiceTitleDirection)
})

test('기존 서비스 타이틀 바로 다음에 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')

  assert.match(source, /serviceTitleRevealViz,\s*serviceTitleDirectionViz,/)
})
