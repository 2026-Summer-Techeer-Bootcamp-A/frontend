import assert from 'node:assert/strict'
import test from 'node:test'

import * as conceptAlternativesModule from '../src/career/conceptAlternatives.ts'
import { buildConceptTreemap } from '../src/career/conceptAlternatives.ts'
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

test('트리맵은 API 응답 전과 실패 시 모두 폴백을 즉시 사용한다', () => {
  const resolveConceptAlternativeData = Reflect.get(
    conceptAlternativesModule,
    'resolveConceptAlternativeData',
  )

  assert.equal(typeof resolveConceptAlternativeData, 'function')
  assert.equal(resolveConceptAlternativeData(undefined, payload), payload)
  assert.equal(resolveConceptAlternativeData(null, payload), payload)
})
