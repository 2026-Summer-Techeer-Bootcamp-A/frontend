export type ConceptChartMode = 'sankey' | 'treemap'

export const DEFAULT_CONCEPT_CHART_MODE: ConceptChartMode = 'sankey'

export const CONCEPT_CHART_MODES = [
  { value: 'sankey', label: 'Sankey' },
  { value: 'treemap', label: 'Treemap' },
] as const satisfies ReadonlyArray<{ value: ConceptChartMode; label: string }>

const CONCEPT_CHART_COPY = {
  sankey: {
    title: '개념 → 기술 Sankey',
    hint: 'posting_concept 실측',
    takeaway: '"이 개념을 하려면 어떤 기술" — 개념이 요구하는 스택 흐름.',
  },
  treemap: {
    title: '개념 → 기술 Treemap',
    hint: 'ECharts treemap · posting_concept 실측',
    takeaway: '큰 영역은 개념, 내부 사각형은 기술 — 면적이 클수록 함께 등장한 공고가 많아요.',
  },
} as const satisfies Record<ConceptChartMode, {
  title: string
  hint: string
  takeaway: string
}>

export function getConceptChartCopy(mode: ConceptChartMode) {
  return CONCEPT_CHART_COPY[mode]
}
