import assert from 'node:assert/strict'
import test from 'node:test'

import * as conceptSankeyModule from '../src/career/conceptSankey.ts'
import {
  CURATED_SANKEY_CONCEPTS,
  buildConceptSankeyFallback,
  curateConceptSankey,
  omitConceptFromSankey,
  type SankeyPayload,
} from '../src/career/conceptSankey.ts'

const fallback: SankeyPayload = {
  nodes: [
    ...CURATED_SANKEY_CONCEPTS.map((name) => ({ name, kind: 'concept' as const })),
    { name: 'AWS', kind: 'tech' },
    { name: 'Kubernetes', kind: 'tech' },
    { name: 'Java', kind: 'tech' },
    { name: 'Spring', kind: 'tech' },
    { name: 'Docker', kind: 'tech' },
    { name: 'Python', kind: 'tech' },
    { name: 'SQL', kind: 'tech' },
    { name: 'Kafka', kind: 'tech' },
    { name: 'Git', kind: 'tech' },
  ],
  links: [
    { source: 'MSA·분산', target: 'AWS', value: 57 },
    { source: '대규모 트래픽', target: 'Kubernetes', value: 32 },
    { source: '보안·컴플라이언스', target: 'AWS', value: 38 },
    { source: '보안·컴플라이언스', target: 'Python', value: 36 },
    { source: '보안·컴플라이언스', target: 'Kubernetes', value: 25 },
    { source: '보안·컴플라이언스', target: 'Docker', value: 25 },
    { source: '데이터 파이프라인', target: 'SQL', value: 29 },
    { source: 'DevOps·자동화', target: 'Git', value: 36 },
  ],
}

test('승인된 일곱 개념을 지정 순서로 선택한다', () => {
  const live: SankeyPayload = {
    nodes: [
      { name: 'AI·LLM', kind: 'concept' },
      { name: 'MSA·분산', kind: 'concept' },
      { name: 'AWS', kind: 'tech' },
    ],
    links: [
      { source: 'AI·LLM', target: 'AWS', value: 100 },
      { source: 'MSA·분산', target: 'AWS', value: 10 },
    ],
  }

  const result = curateConceptSankey(live, fallback)

  assert.deepEqual([...CURATED_SANKEY_CONCEPTS], [
    'MSA·분산',
    '대규모 트래픽',
    '실시간·스트리밍',
    '보안·컴플라이언스',
    '데이터 파이프라인',
    '클라우드 네이티브',
    'DevOps·자동화',
  ])
  assert.deepEqual(
    result.nodes.filter((node) => node.kind === 'concept').map((node) => node.name),
    [...CURATED_SANKEY_CONCEPTS],
  )
  assert.equal(result.links.some((link) => link.source === 'AI·LLM'), false)
})

test('새 개념도 conceptReal 형식의 실측 폴백에 포함한다', () => {
  const result = buildConceptSankeyFallback([
    {
      label: '실시간·스트리밍',
      signature: [{ tech: 'Kafka', n: 146 }],
    },
    {
      label: '클라우드 네이티브',
      signature: [{ tech: 'Kubernetes', n: 295 }],
    },
  ])

  assert.deepEqual(result.links, [
    { source: '실시간·스트리밍', target: 'Kafka', value: 146 },
    { source: '클라우드 네이티브', target: 'Kubernetes', value: 295 },
  ])
})

test('일곱 개념 Sankey 배치 값을 중앙 정렬용으로 고정한다', () => {
  assert.deepEqual(Reflect.get(conceptSankeyModule, 'SANKEY_CHART_LAYOUT'), {
    height: 500,
    nodeGap: 24,
    labelFontSize: 14,
    top: 30,
    bottom: 30,
    left: '25%',
    right: '18%',
  })
})

test('일곱 개념을 중앙 범위에 균등 배치하고 기술 위치는 고정하지 않는다', () => {
  const getConceptNodeLocalY = Reflect.get(conceptSankeyModule, 'getConceptNodeLocalY')

  assert.equal(typeof getConceptNodeLocalY, 'function')
  assert.deepEqual(
    CURATED_SANKEY_CONCEPTS.map((name) => getConceptNodeLocalY(name)),
    [0.15, 0.26, 0.37, 0.48, 0.59, 0.70, 0.81],
  )
  assert.equal(getConceptNodeLocalY('Kafka'), undefined)
})

test('개념별 공동출현 값이 큰 기술 네 개만 남긴다', () => {
  const live: SankeyPayload = {
    nodes: [
      { name: 'MSA·분산', kind: 'concept' },
      ...['AWS', 'Kubernetes', 'Java', 'Spring', 'Docker'].map((name) => ({ name, kind: 'tech' as const })),
    ],
    links: [
      { source: 'MSA·분산', target: 'Docker', value: 40 },
      { source: 'MSA·분산', target: 'Spring', value: 43 },
      { source: 'MSA·분산', target: 'Java', value: 48 },
      { source: 'MSA·분산', target: 'Kubernetes', value: 49 },
      { source: 'MSA·분산', target: 'AWS', value: 57 },
    ],
  }

  const result = curateConceptSankey(live, fallback)
  const msaTargets = result.links
    .filter((link) => link.source === 'MSA·분산')
    .map((link) => link.target)

  assert.deepEqual(msaTargets, ['AWS', 'Kubernetes', 'Java', 'Spring'])
})

test('라이브 응답에서 빠진 개념은 실측 폴백으로 보충한다', () => {
  const result = curateConceptSankey({ nodes: [], links: [] }, fallback)

  assert.deepEqual(
    result.links
      .filter((link) => link.source === '보안·컴플라이언스')
      .map((link) => link.target),
    ['AWS', 'Python', 'Kubernetes', 'Docker'],
  )
})

test('conceptReal 형식에서 고정 개념과 실측 n을 페이로드로 만든다', () => {
  const result = buildConceptSankeyFallback([
    {
      label: '보안·컴플라이언스',
      signature: [
        { tech: 'AWS', n: 100 },
        { tech: 'Python', n: 90 },
      ],
    },
    {
      label: 'AI·LLM',
      signature: [{ tech: 'PyTorch', n: 200 }],
    },
  ])

  assert.deepEqual(result.links, [
    { source: '보안·컴플라이언스', target: 'AWS', value: 100 },
    { source: '보안·컴플라이언스', target: 'Python', value: 90 },
  ])
})

test('특정 개념을 Sankey에서 제외하면 전용 기술 고아 노드도 함께 제거한다', () => {
  const payload: SankeyPayload = {
    nodes: [
      { name: 'MSA·분산', kind: 'concept' },
      { name: '클라우드 네이티브', kind: 'concept' },
      { name: 'Kafka', kind: 'tech' },
      { name: 'Kubernetes', kind: 'tech' },
    ],
    links: [
      { source: 'MSA·분산', target: 'Kafka', value: 160 },
      { source: '클라우드 네이티브', target: 'Kubernetes', value: 295 },
    ],
  }

  assert.deepEqual(omitConceptFromSankey(payload, '클라우드 네이티브'), {
    nodes: [
      { name: 'MSA·분산', kind: 'concept' },
      { name: 'Kafka', kind: 'tech' },
    ],
    links: [{ source: 'MSA·분산', target: 'Kafka', value: 160 }],
  })
})
