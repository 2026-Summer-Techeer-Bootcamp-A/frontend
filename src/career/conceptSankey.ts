export const CURATED_SANKEY_CONCEPTS = [
  'MSA·분산',
  '대규모 트래픽',
  '실시간·스트리밍',
  '보안·컴플라이언스',
  '데이터 파이프라인',
  '클라우드 네이티브',
  'DevOps·자동화',
] as const

export const SANKEY_CHART_LAYOUT = {
  height: 500,
  nodeGap: 24,
  labelFontSize: 14,
  top: 30,
  bottom: 30,
  left: '25%',
  right: '18%',
} as const

const SANKEY_CONCEPT_LOCAL_Y = [0.15, 0.26, 0.37, 0.48, 0.59, 0.70, 0.81] as const

export function getConceptNodeLocalY(name: string): number | undefined {
  const conceptIndex = CURATED_SANKEY_CONCEPTS.findIndex((concept) => concept === name)
  return conceptIndex >= 0 ? SANKEY_CONCEPT_LOCAL_Y[conceptIndex] : undefined
}

export type SankeyNode = { name: string; kind: 'concept' | 'tech' }
export type SankeyLink = { source: string; target: string; value: number }
export type SankeyPayload = { nodes: SankeyNode[]; links: SankeyLink[] }

type ConceptSource = {
  label: string
  signature: Array<{ tech: string; n: number }>
}

const topFour = (links: SankeyLink[]) =>
  [...links].sort((a, b) => b.value - a.value).slice(0, 4)

export function buildConceptSankeyFallback(concepts: ConceptSource[]): SankeyPayload {
  const links = CURATED_SANKEY_CONCEPTS.flatMap((conceptName) => {
    const concept = concepts.find((item) => item.label === conceptName)
    if (!concept) return []
    return topFour(
      concept.signature.map((tech) => ({
        source: conceptName,
        target: tech.tech,
        value: Math.max(1, tech.n),
      })),
    )
  })

  return createPayload(links)
}

export function curateConceptSankey(payload: SankeyPayload, fallback: SankeyPayload): SankeyPayload {
  const links = CURATED_SANKEY_CONCEPTS.flatMap((conceptName) => {
    const liveLinks = payload.links.filter((link) => link.source === conceptName)
    const fallbackLinks = fallback.links.filter((link) => link.source === conceptName)
    return topFour(liveLinks.length ? liveLinks : fallbackLinks)
  })

  return createPayload(links)
}

export function omitConceptFromSankey(payload: SankeyPayload, conceptName: string): SankeyPayload {
  const links = payload.links.filter((link) => link.source !== conceptName)
  const linkedTechNames = new Set(links.map((link) => link.target))
  const nodes = payload.nodes.filter((node) => (
    node.kind === 'concept' ? node.name !== conceptName : linkedTechNames.has(node.name)
  ))

  return { nodes, links }
}

function createPayload(links: SankeyLink[]): SankeyPayload {
  const techNames = [...new Set(links.map((link) => link.target))]
  const nodes: SankeyNode[] = [
    ...CURATED_SANKEY_CONCEPTS.map((name) => ({ name, kind: 'concept' as const })),
    ...techNames.map((name) => ({ name, kind: 'tech' as const })),
  ]
  return { nodes, links }
}
