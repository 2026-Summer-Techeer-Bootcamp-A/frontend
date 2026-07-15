import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CONCEPT_CHART_MODES,
  DEFAULT_CONCEPT_CHART_MODE,
  getConceptChartCopy,
} from '../src/career/conceptChartMode.ts'

test('개념 기술 차트의 기본 모드는 Sankey다', () => {
  assert.equal(DEFAULT_CONCEPT_CHART_MODE, 'sankey')
})

test('토글은 Sankey와 Treemap 두 모드만 제공한다', () => {
  assert.deepEqual(CONCEPT_CHART_MODES, [
    { value: 'sankey', label: 'Sankey' },
    { value: 'treemap', label: 'Treemap' },
  ])
})

test('선택한 모드에 맞는 제목과 설명을 제공한다', () => {
  assert.deepEqual(getConceptChartCopy('sankey'), {
    title: '개념 → 기술 Sankey',
    hint: 'posting_concept 실측',
    takeaway: '"이 개념을 하려면 어떤 기술" — 개념이 요구하는 스택 흐름.',
  })
  assert.deepEqual(getConceptChartCopy('treemap'), {
    title: '개념 → 기술 Treemap',
    hint: 'ECharts treemap · posting_concept 실측',
    takeaway: '큰 영역은 개념, 내부 사각형은 기술 — 면적이 클수록 함께 등장한 공고가 많아요.',
  })
})
