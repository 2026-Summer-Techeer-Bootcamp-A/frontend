import type { SankeyPayload } from './conceptSankey'

export function resolveConceptAlternativeData(
  response: SankeyPayload | null | undefined,
  fallback: SankeyPayload,
): SankeyPayload | null {
  if (response === undefined) return fallback
  if (response === null) return fallback
  return response
}

export type ConceptTreemapNode = {
  name: string
  value: number
  children: Array<{ name: string; value: number }>
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
