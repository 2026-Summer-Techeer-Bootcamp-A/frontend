// 지식 그래프: 기술 노드가 별처럼 나타나 관계선으로 이어지는 별자리.
// gallery의 c-graph IIFE를 순수 함수로 이식했다.

import type { VizRender } from '../types'
import { FONT, clamp01, easeOut, star, drawBackground, drawTopLabel, drawCaption } from './common'

const LABELS = ['Java', 'Spring', 'JPA', 'MySQL', 'Redis', 'AWS', 'Docker', 'K8s', 'React', 'TS']
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [1, 5],
  [5, 6],
  [6, 7],
  [8, 9],
  [0, 3],
  [5, 7],
  [8, 1],
]

interface Node {
  x: number
  y: number
  l: string
  app: number
}

interface Edge {
  a: number
  b: number
  app: number
}

function buildGraph(w: number, h: number): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = LABELS.map((l, i) => {
    const ang = (i / LABELS.length) * Math.PI * 2 + 0.5
    const rad = Math.min(w, h) * (0.2 + (0.13 * ((i * 3) % 3)) / 2)
    return {
      x: w / 2 + Math.cos(ang) * rad * (0.95 + 0.25 * Math.sin(i)),
      y: h / 2 + Math.sin(ang) * rad,
      l,
      app: i * 0.075,
    }
  })
  const edges: Edge[] = EDGES.map(([a, b]) => ({ a, b, app: 0.25 + Math.max(a, b) * 0.06 }))
  return { nodes, edges }
}

export const renderGraph: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const { nodes, edges } = buildGraph(w, h)

  edges.forEach((e) => {
    const k = easeOut(clamp01((p - e.app) / 0.14))
    if (k <= 0) return
    const a = nodes[e.a]
    const b = nodes[e.b]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)
    ctx.strokeStyle = `rgba(255,255,255,${0.14 * k})`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  })

  nodes.forEach((n, i) => {
    const k = clamp01((p - n.app) / 0.1)
    if (k <= 0) return
    const tw = 0.7 + 0.3 * Math.sin(ts / 450 + i * 1.3)
    star(ctx, n.x, n.y, 2.2 * k * (0.85 + 0.15 * tw), (0.7 + 0.3 * tw) * k, '#ffffff', (0.3 + 0.5 * tw) * k)
    ctx.save()
    ctx.globalAlpha = k * 0.72
    ctx.fillStyle = 'rgba(244,244,245,0.75)'
    ctx.font = `600 9px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(n.l, n.x + 8, n.y + 3)
    ctx.restore()
  })

  drawTopLabel(ctx, '지식 그래프', '기술 관계망')
  drawCaption(ctx, h, '반짝이는 별이 별자리가 됩니다')
}
