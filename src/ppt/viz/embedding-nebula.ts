// 임베딩 의미 성운: 의미 없이 흩어진 점군이 BGE-M3 임베딩으로 비슷한 것끼리
// 5개 성운(백엔드/프론트/데이터/인프라/AI)으로 뭉친다. 각 성운은 실제 건수를
// 라벨로 달고, 질문 벡터(금빛)가 가장 가까운 성운에 착지해 그 성운의 top-k
// 근거 공고를 실제 카드로 뽑아낸다.

import type { VizRender } from '../types'
import { FONT, clamp01, lerp, easeInOut, roundRect, star, chipLabel, seededRandom, drawBackground, drawTopLabel, drawCaption } from './common'

const CAPS = [
  'BGE-M3가 49,015건을 의미 유사도로 군집화합니다',
  '질문 벡터가 가장 가까운 성운에 들어갑니다',
  '그 성운의 top-k를 근거로 뽑습니다',
]

const NUM_POINTS = 120

interface Cluster {
  name: string
  col: string
  count: string
}

const CLUSTERS: Cluster[] = [
  { name: '백엔드', col: '#e879b0', count: '12,400건' },
  { name: '프론트', col: '#ffd166', count: '8,100건' },
  { name: '데이터', col: '#4dd0e1', count: '6,700건' },
  { name: '인프라', col: '#9a7bf5', count: '5,200건' },
  { name: 'AI', col: '#6ea8fe', count: '3,900건' },
]

interface Chunk {
  source: string
  category: string
  snippet: string
  score: string
  match: string[]
}

// top-k 근거: 착지한 성운(백엔드) 안에서 실제로 뽑히는 공고 3건.
const CHUNKS: Chunk[] = [
  { source: '원티드', category: '백엔드', snippet: 'React 3년 이상, Node 기반 API 설계 경험', score: '0.93', match: ['React'] },
  { source: '잡코리아', category: '풀스택', snippet: 'TypeScript React SPA 유지보수', score: '0.89', match: ['TypeScript', 'React'] },
  { source: '사람인', category: '서버', snippet: 'REST API, React 연동 협업', score: '0.85', match: ['React'] },
]

function splitHighlight(text: string, tokens: string[]): { t: string; hl: boolean }[] {
  if (tokens.length === 0) return [{ t: text, hl: false }]
  const esc = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(`(${esc})`, 'g')
  return text
    .split(re)
    .filter((s) => s.length > 0)
    .map((s) => ({ t: s, hl: tokens.includes(s) }))
}

function drawChunkCard(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number, chunk: Chunk, a: number): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(30,30,30,0.72)'
  roundRect(ctx, x, y, cw, ch, 8)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,224,150,0.35)'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, cw, ch, 8)
  ctx.stroke()

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = `700 9.5px ${FONT}`
  ctx.fillStyle = 'rgba(244,244,245,0.92)'
  ctx.fillText(`${chunk.source} · ${chunk.category}`, x + 10, y + 13)

  ctx.textAlign = 'right'
  ctx.font = `800 10px ${FONT}`
  ctx.fillStyle = '#ffe7a8'
  ctx.fillText(chunk.score, x + cw - 10, y + 13)

  const segs = splitHighlight(chunk.snippet, chunk.match)
  ctx.textAlign = 'left'
  ctx.font = `500 9.5px ${FONT}`
  let tx = x + 10
  const ty = y + ch - 14
  segs.forEach((s) => {
    ctx.fillStyle = s.hl ? '#34d17f' : 'rgba(180,180,188,0.85)'
    ctx.fillText(s.t, tx, ty)
    tx += ctx.measureText(s.t).width
  })
  ctx.restore()
}

interface Pt {
  x: number
  y: number
}

interface CloudPoint {
  from: Pt
  to: Pt
  clusterIdx: number
  stagger: number
}

function buildClusterCenters(w: number, h: number): Pt[] {
  const cx = w * 0.54
  const cy = h * 0.48
  const rx = Math.min(w, h) * 0.36
  const ry = Math.min(w, h) * 0.3
  return CLUSTERS.map((_, i) => {
    const ang = (i / CLUSTERS.length) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry }
  })
}

function buildPoints(w: number, h: number, centers: Pt[]): CloudPoint[] {
  const marginX = 22
  const marginTop = 40
  const marginBottom = 40
  const pts: CloudPoint[] = []
  for (let i = 0; i < NUM_POINTS; i++) {
    const fx = marginX + seededRandom(i * 2.11 + 1.3) * (w - marginX * 2)
    const fy = marginTop + seededRandom(i * 3.47 + 6.2) * (h - marginTop - marginBottom)
    const clusterIdx = Math.floor(seededRandom(i * 7.71 + 3.9) * CLUSTERS.length) % CLUSTERS.length
    const center = centers[clusterIdx]
    // 군집 내부에 고르게 퍼지도록 sqrt 분포를 사용한 극좌표 오프셋.
    const ang = seededRandom(i * 5.03 + 8.4) * Math.PI * 2
    const rad = Math.sqrt(seededRandom(i * 9.13 + 2.6)) * 42
    const tx = center.x + Math.cos(ang) * rad
    const ty = center.y + Math.sin(ang) * rad
    pts.push({
      from: { x: fx, y: fy },
      to: { x: tx, y: ty },
      clusterIdx,
      stagger: seededRandom(i * 1.73 + 5.5) * 0.08,
    })
  }
  return pts
}

export const renderEmbeddingNebula: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const centers = buildClusterCenters(w, h)
  const pts = buildPoints(w, h, centers)

  const convergeWindowStart = 0.26
  const convergeDur = 0.2

  pts.forEach((pt, i) => {
    const start = convergeWindowStart + pt.stagger
    const k = easeInOut(clamp01((p - start) / convergeDur))
    const x = lerp(pt.from.x, pt.to.x, k)
    const y = lerp(pt.from.y, pt.to.y, k)
    // 아직 흩어진 구간(k<1)에는 부력 드리프트를, 자리잡은 뒤에는 은은한 반짝임만.
    const driftK = 1 - k
    const dx = Math.sin(ts / 1600 + i * 1.1) * 1.8 * driftK
    const dy = Math.cos(ts / 1900 + i * 0.7) * 1.6 * driftK
    const tw = 0.7 + 0.3 * Math.sin(ts / 480 + i * 1.3)
    const col = k > 0.5 ? CLUSTERS[pt.clusterIdx].col : '#f4f4f5'
    const a = (0.4 + 0.35 * tw) * (0.35 + 0.65 * Math.max(k, 0.2))
    star(ctx, x + dx, y + dy, 1.1 + 0.5 * tw, a, col, 0.15 + 0.25 * tw)
  })

  // 성운 라벨: 이름 + 실제 건수. 점들이 대부분 자리잡은 뒤 페이드인.
  const labelA = clamp01((p - 0.48) / 0.1)
  if (labelA > 0.01) {
    ctx.save()
    ctx.globalAlpha = labelA
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    CLUSTERS.forEach((c, i) => {
      ctx.font = `700 10px ${FONT}`
      ctx.fillStyle = c.col
      ctx.fillText(c.name, centers[i].x, centers[i].y - 50)
      ctx.font = `600 8.5px ${FONT}`
      ctx.fillStyle = 'rgba(230,230,234,0.75)'
      ctx.fillText(c.count, centers[i].x, centers[i].y - 38)
    })
    ctx.restore()
  }

  // 질문 벡터: 위쪽에서 들어와 가장 가까운 성운으로 이동한다.
  const enterStart = 0.56
  const enterA = clamp01((p - enterStart) / 0.08)
  if (enterA > 0.01) {
    const start = { x: w * 0.46, y: h * 0.08 }
    let nearest = 0
    let best = Infinity
    centers.forEach((c, i) => {
      const d = Math.hypot(c.x - start.x, c.y - start.y)
      if (d < best) {
        best = d
        nearest = i
      }
    })
    const target = centers[nearest]
    const travel = easeInOut(clamp01((p - enterStart) / 0.18))
    const qx = lerp(start.x, target.x, travel)
    const qy = lerp(start.y, target.y, travel)
    star(ctx, qx, qy, 2.6, enterA, '#ffe7a8', 0.5)
    if (p < enterStart + 0.1) {
      chipLabel(ctx, '질문 벡터', qx, qy - 16, '#ffe7a8', enterA, 9)
    }

    const arriveK = clamp01((p - 0.76) / 0.14)
    if (arriveK > 0.01) {
      const pulse = 0.85 + 0.15 * Math.sin(ts / 280)
      const glowR = (14 + 30 * arriveK) * pulse
      ctx.save()
      const g = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, glowR)
      g.addColorStop(0, `rgba(255,224,150,${0.38 * arriveK})`)
      g.addColorStop(1, 'rgba(255,224,150,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(target.x, target.y, glowR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      chipLabel(ctx, `${CLUSTERS[nearest].name} 성운에서 top-3 근거를 뽑습니다`, target.x, target.y + 62, '#ffe7a8', arriveK, 9)
    }

    // top-k 근거 카드: 착지 후 좌측 하단에 실제 공고 3건으로 등장.
    const cardStart = 0.84
    const cardX = 16
    const cardW = Math.min(w * 0.42, 300)
    const cardTop = h * 0.6
    const cardBottom = h - 30
    const cardGap = 8
    const cardH = Math.max(30, Math.min(46, (cardBottom - cardTop - cardGap * 2) / 3))
    CHUNKS.forEach((chunk, j) => {
      const k = clamp01((p - cardStart - j * 0.045) / 0.14)
      if (k <= 0.01) return
      const cardY = cardTop + j * (cardH + cardGap)
      const slide = (1 - k) * 14
      drawChunkCard(ctx, cardX - slide, cardY, cardW, cardH, chunk, k)
    })
  }

  const stageIdx = p < 0.48 ? 0 : p < 0.76 ? 1 : 2
  drawTopLabel(ctx, '임베딩 의미 성운', '가까운 의미끼리 뭉치다')
  drawCaption(ctx, h, CAPS[stageIdx])
}
