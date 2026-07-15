import type { SankeyPayload } from './conceptSankey'

export type ConceptHeatmap = {
  concepts: string[]
  techs: string[]
  cells: Array<[number, number, number]>
  maxValue: number
}

export type ConceptTreemapNode = {
  name: string
  value: number
  children: Array<{ name: string; value: number }>
}

export function buildConceptHeatmap(payload: SankeyPayload): ConceptHeatmap {
  const concepts = payload.nodes
    .filter((node) => node.kind === 'concept')
    .map((node) => node.name)

  const totals = new Map<string, number>()
  const values = new Map<string, number>()
  for (const link of payload.links) {
    totals.set(link.target, (totals.get(link.target) ?? 0) + link.value)
    values.set(`${link.source}\u0000${link.target}`, link.value)
  }

  const techs = [...totals.keys()].sort((a, b) => {
    const difference = (totals.get(b) ?? 0) - (totals.get(a) ?? 0)
    return difference || a.localeCompare(b)
  })
  const cells: Array<[number, number, number]> = []

  concepts.forEach((concept, conceptIndex) => {
    techs.forEach((tech, techIndex) => {
      cells.push([techIndex, conceptIndex, values.get(`${concept}\u0000${tech}`) ?? 0])
    })
  })

  return {
    concepts,
    techs,
    cells,
    maxValue: Math.max(0, ...payload.links.map((link) => link.value)),
  }
}

export function buildConceptTreemap(payload: SankeyPayload): ConceptTreemapNode[] {
  return payload.nodes
    .filter((node) => node.kind === 'concept')
    .map((concept) => {
      const children = payload.links
        .filter((link) => link.source === concept.name)
        .map((link) => ({ name: link.target, value: link.value }))

      return {
        name: concept.name,
        value: children.reduce((sum, child) => sum + child.value, 0),
        children,
      }
    })
    .filter((concept) => concept.children.length > 0)
}
