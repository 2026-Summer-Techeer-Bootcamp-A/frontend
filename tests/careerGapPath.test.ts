import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  GAP_PATH_NODES,
  getCareerGapPathFrame,
  renderCareerGapPath,
  careerGapPathViz,
} from '../src/ppt/viz/career-gap-path.ts'

test('경로는 보유 기술 2개와 부족 기술 3개로 구성된다', () => {
  assert.deepEqual(
    GAP_PATH_NODES.map(({ name, status }) => ({ name, status })),
    [
      { name: 'Java', status: 'owned' },
      { name: 'Spring', status: 'owned' },
      { name: 'Docker', status: 'missing' },
      { name: 'Kubernetes', status: 'missing' },
      { name: 'AWS', status: 'missing' },
    ],
  )
})

test('시작에는 현재 이력서와 목표 직무만 나타난다', () => {
  const frame = getCareerGapPathFrame(0, 960, 540)

  assert.equal(frame.resumeAlpha, 1)
  assert.equal(frame.targetAlpha, 1)
  assert.ok(frame.nodes.every((node) => node.alpha === 0))
  assert.ok(frame.segments.every((segment) => segment.progress === 0))
  assert.equal(frame.questionAlpha, 0)
})

test('보유 기술 구간은 연결되지만 첫 부족 기술 앞에서 흐름이 멈춘다', () => {
  const frame = getCareerGapPathFrame(0.58, 960, 540)
  const owned = frame.nodes.filter((node) => node.status === 'owned')
  const missing = frame.nodes.filter((node) => node.status === 'missing')

  assert.ok(owned.every((node) => node.alpha === 1 && node.fillProgress === 1))
  assert.ok(missing.every((node) => node.alpha > 0 && node.fillProgress === 0))
  assert.equal(frame.segments[0].progress, 1)
  assert.equal(frame.segments[1].progress, 1)
  assert.equal(frame.segments[2].progress, 0)
  assert.ok(frame.stopPulse > 0)
})

test('마지막에는 부족 구간과 질문이 함께 남는다', () => {
  const frame = getCareerGapPathFrame(1, 960, 540)

  assert.ok(frame.nodes.every((node) => node.alpha === 1))
  assert.ok(frame.nodes.filter((node) => node.status === 'missing').every((node) => node.gapAlpha === 1))
  assert.equal(frame.questionAlpha, 1)
})

test('동일 입력은 동일하고 2배 해상도에서 좌표와 크기도 2배다', () => {
  const small = getCareerGapPathFrame(0.5, 960, 540)
  assert.deepEqual(small, getCareerGapPathFrame(0.5, 960, 540))

  const large = getCareerGapPathFrame(0.5, 1920, 1080)
  assert.ok(Math.abs(large.nodes[0].x - small.nodes[0].x * 2) < 0.000001)
  assert.ok(Math.abs(large.nodes[0].radius - small.nodes[0].radius * 2) < 0.000001)
})

test('독립된 7.5초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(careerGapPathViz.id, 'career-gap-path')
  assert.equal(careerGapPathViz.title, '목표 기술 격차')
  assert.equal(careerGapPathViz.category, 'feature')
  assert.equal(careerGapPathViz.period, 7500)
  assert.equal(careerGapPathViz.render, renderCareerGapPath)
})

test('기술 더미 질문과 서비스 타이틀 사이에 별도 항목으로 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /techPileQuestionViz,\s*careerGapPathViz,\s*serviceTitleRevealViz,/)
})
