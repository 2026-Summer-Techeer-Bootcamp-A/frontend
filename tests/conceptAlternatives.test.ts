import assert from 'node:assert/strict'
import test from 'node:test'

import { buildConceptHeatmap, buildConceptTreemap } from '../src/career/conceptAlternatives.ts'
import type { SankeyPayload } from '../src/career/conceptSankey.ts'

const payload: SankeyPayload = {
  nodes: [
    { name: 'MSA·분산', kind: 'concept' },
    { name: '데이터 파이프라인', kind: 'concept' },
    { name: 'AWS', kind: 'tech' },
    { name: 'Kafka', kind: 'tech' },
    { name: 'Python', kind: 'tech' },
  ],
  links: [
    { source: 'MSA·분산', target: 'AWS', value: 40 },
    { source: 'MSA·분산', target: 'Kafka', value: 20 },
    { source: '데이터 파이프라인', target: 'Kafka', value: 50 },
    { source: '데이터 파이프라인', target: 'Python', value: 30 },
  ],
}

test('히트맵 기술 축을 전체 공동출현 합계 내림차순으로 만든다', () => {
  const result = buildConceptHeatmap(payload)

  assert.deepEqual(result.concepts, ['MSA·분산', '데이터 파이프라인'])
  assert.deepEqual(result.techs, ['Kafka', 'AWS', 'Python'])
  assert.equal(result.maxValue, 50)
})

test('연결이 없는 조합을 0으로 포함한 개념×기술 행렬을 만든다', () => {
  const result = buildConceptHeatmap(payload)

  assert.deepEqual(result.cells, [
    [0, 0, 20],
    [1, 0, 40],
    [2, 0, 0],
    [0, 1, 50],
    [1, 1, 0],
    [2, 1, 30],
  ])
})

test('트리맵을 개념 부모와 공동출현 기술 자식 구조로 만든다', () => {
  const result = buildConceptTreemap(payload)

  assert.deepEqual(result, [
    {
      name: 'MSA·분산',
      value: 60,
      children: [
        { name: 'AWS', value: 40 },
        { name: 'Kafka', value: 20 },
      ],
    },
    {
      name: '데이터 파이프라인',
      value: 80,
      children: [
        { name: 'Kafka', value: 50 },
        { name: 'Python', value: 30 },
      ],
    },
  ])
})
