// 북극성 항해: 내 스킬 벡터를 49,015건의 의미 군집과 매칭해 방향을 계산한다.
// 좌측은 보유 스킬 8개 칩, 우측은 군집별(백엔드/데이터/프론트/인프라/AI) 점군이다.
// 스킬 벡터 노드에서 각 군집으로 적합도 선이 뻗고 점수가 뜨며, 가장 높은 군집이
// 금빛 북극성으로 승격해 근거와 다음 스텝을 함께 제시한다.

import type { VizRender } from '../types'
import {
  FONT,
  clamp01,
  lerp,
  easeOut,
  easeInOut,
  star,
  chipLabel,
  seededRandom,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common'

const CAPS = [
  '내 스킬을 49,015건과 임베딩 매칭합니다',
  '군집별 적합도를 계산합니다',
  '가장 높은 방향을 근거와 함께 제시합니다',
]

const SKILLS = ['Java', 'Spring', 'React', 'Docker', 'AWS', 'MySQL', 'Python', 'Git']

interface ClusterDef {
  name: string
  col: string
  score: number
}

// 점수 내림차순: 백엔드(idx 0)가 가장 높아 북극성으로 승격한다.
const CLUSTERS: ClusterDef[] = [
  { name: '백엔드', col: '#e879b0', score: 87 },
  { name: '데이터', col: '#4dd0e1', score: 61 },
  { name: '프론트', col: '#ffd166', score: 54 },
  { name: '인프라', col: '#9a7bf5', score: 42 },
  { name: 'AI', col: '#6ea8fe', score: 38 },
]
const TOP_IDX = 0

interface Pt {
  x: number
  y: number
}

function skillChipPositions(w: number, h: number): Pt[] {
  const cols = 2
  const x0 = w * 0.055
  const colGap = w * 0.135
  const y0 = h * 0.22
  const rowGap = h * 0.12
  return SKILLS.map((_, i) => ({
    x: x0 + (i % cols) * colGap,
    y: y0 + Math.floor(i / cols) * rowGap,
  }))
}

function clusterCenters(w: number, h: number): Pt[] {
  const cx = w * 0.75
  const y0 = h * 0.27
  const step = h * 0.145
  return CLUSTERS.map((_, i) => ({ x: cx, y: y0 + i * step }))
}

// 군집 하나를 이루는 작은 점군(결정론적 산포).
function clusterCloud(center: Pt, idx: number, n: number): Pt[] {
  const pts: Pt[] = []
  for (let j = 0; j < n; j++) {
    const ang = seededRandom(idx * 17.3 + j * 3.1 + 1) * Math.PI * 2
    const rad = Math.sqrt(seededRandom(idx * 23.7 + j * 4.9 + 2)) * 20
    pts.push({ x: center.x + Math.cos(ang) * rad, y: center.y + Math.sin(ang) * rad })
  }
  return pts
}

// 군집 순번(top부터)이 등장을 시작하는 시점.
function clusterStart(i: number): number {
  return 0.18 + i * 0.035
}

// 적합도 선 + 점수 숫자가 등장하는 시점(군집 등장 뒤).
function lineStart(i: number): number {
  return 0.42 + i * 0.045
}

export const renderNavNorthstar: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)

  const chipPos = skillChipPositions(w, h)
  const centers = clusterCenters(w, h)
  const marker = { x: w * 0.34, y: h * 0.56 }

  const promoteK = easeOut(clamp01((p - 0.68) / 0.14))
  const routeK = easeInOut(clamp01((p - 0.84) / 0.16))

  // 1. 좌측: "내 스킬 8개" 헤더 + 칩 8개가 순차 등장.
  const headerA = clamp01(p / 0.08)
  if (headerA > 0.01) {
    ctx.save()
    ctx.globalAlpha = headerA
    ctx.font = `700 10px ${FONT}`
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('내 스킬 8개', chipPos[0].x - 34, h * 0.135)
    ctx.restore()
  }
  SKILLS.forEach((skill, i) => {
    const start = 0.03 + i * 0.02
    const a = clamp01((p - start) / 0.12)
    if (a <= 0.01) return
    chipLabel(ctx, skill, chipPos[i].x, chipPos[i].y, '#34d17f', a, 10)
  })

  // 2. 내 스킬 벡터 노드: 칩이 대부분 등장한 뒤 초록 별로 떠오른다.
  const markerA = clamp01((p - 0.14) / 0.1)
  if (markerA > 0.01) {
    const tw = 0.7 + 0.3 * Math.sin(ts / 420)
    star(ctx, marker.x, marker.y, 3.2 * (0.9 + 0.1 * tw), markerA, '#34d17f', 0.4 + 0.3 * tw)
    chipLabel(ctx, '내 스킬 벡터', marker.x, marker.y + 18, '#34d17f', markerA * clamp01((0.62 - p) / 0.1 + 1), 9)
  }

  // 3. 우측: 군집 점군이 카테고리별로 순차 등장, 라벨도 함께.
  CLUSTERS.forEach((cl, i) => {
    const center = centers[i]
    const a = clamp01((p - clusterStart(i)) / 0.14)
    if (a <= 0.01) return
    const dim = promoteK > 0.01 && i !== TOP_IDX ? 1 - 0.45 * promoteK : 1
    const cloud = clusterCloud(center, i, 13)
    cloud.forEach((pt, j) => {
      const tw = 0.7 + 0.3 * Math.sin(ts / 460 + i * 2 + j)
      star(ctx, pt.x, pt.y, 1.1 + 0.5 * tw, a * dim * (0.55 + 0.35 * tw), cl.col, 0.15 + 0.2 * tw)
    })
    ctx.save()
    ctx.globalAlpha = a * dim
    ctx.font = `700 9.5px ${FONT}`
    ctx.fillStyle = cl.col
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(cl.name, center.x + 30, center.y + 3)
    ctx.restore()
  })

  // 4. 적합도 선 + 점수: 스킬 벡터에서 각 군집으로 뻗어 점수 숫자를 띄운다.
  CLUSTERS.forEach((cl, i) => {
    const center = centers[i]
    const k = easeInOut(clamp01((p - lineStart(i)) / 0.16))
    if (k <= 0.01) return
    const isTop = i === TOP_IDX
    const dim = promoteK > 0.01 && !isTop ? 1 - 0.45 * promoteK : 1
    const lineCol = isTop && promoteK > 0.01 ? '255,224,150' : hexToRgbStr(cl.col)
    ctx.save()
    ctx.globalAlpha = 0.5 * k * dim
    ctx.strokeStyle = `rgba(${lineCol},0.8)`
    ctx.lineWidth = isTop && promoteK > 0.3 ? 1.8 : 1.1
    ctx.beginPath()
    ctx.moveTo(marker.x, marker.y)
    ctx.lineTo(lerp(marker.x, center.x, k), lerp(marker.y, center.y, k))
    ctx.stroke()
    ctx.restore()

    if (k > 0.65) {
      const labelA = clamp01((k - 0.65) / 0.35) * dim
      const midX = lerp(marker.x, center.x, 0.62)
      const midY = lerp(marker.y, center.y, 0.62)
      const scoreCol = isTop && promoteK > 0.01 ? '#ffe7a8' : cl.col
      chipLabel(ctx, `${cl.score}`, midX, midY, scoreCol, labelA, 10)
    }
  })

  // 5. 북극성 승격: 최고 점수 군집이 금빛으로 물들고 방향 라벨 + 근거 한 줄이 뜬다.
  if (promoteK > 0.01) {
    const top = centers[TOP_IDX]
    const bloom = easeOut(promoteK)
    const pulse = 0.85 + 0.15 * Math.sin(ts / 300)
    const glowR = (16 + 30 * bloom) * pulse
    ctx.save()
    const g = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, glowR)
    g.addColorStop(0, `rgba(255,224,150,${0.42 * bloom})`)
    g.addColorStop(1, 'rgba(255,224,150,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(top.x, top.y, glowR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    star(ctx, top.x, top.y, 2.4 + 3 * bloom, 0.5 + 0.5 * bloom, '#ffe7a8', 0.5 + 0.4 * pulse)

    const textA = clamp01((p - 0.74) / 0.1)
    if (textA > 0.01) {
      ctx.save()
      ctx.globalAlpha = textA
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.font = `800 11px ${FONT}`
      ctx.fillStyle = '#ffe7a8'
      ctx.fillText('당신의 방향 · 백엔드 · 적합 87%', top.x, top.y - 34)
      ctx.font = `500 8.5px ${FONT}`
      ctx.fillStyle = 'rgba(230,230,234,0.85)'
      ctx.fillText('React 보유 + Spring 수요 상위 8% · 근거 공고 312건', top.x, top.y - 21)
      ctx.restore()
    }
  }

  // 6. 항로: 내 스킬 벡터에서 북극성(백엔드)으로 항로가 열리고, 다음 스텝을 표기한다.
  if (routeK > 0.01) {
    const top = centers[TOP_IDX]
    const ctrl = { x: (marker.x + top.x) / 2, y: marker.y - 26 }
    const bezierPt = (t: number): Pt => {
      const u = 1 - t
      return {
        x: u * u * marker.x + 2 * u * t * ctrl.x + t * t * top.x,
        y: u * u * marker.y + 2 * u * t * ctrl.y + t * t * top.y,
      }
    }
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = 'rgba(255,231,168,0.75)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    const steps = 20
    ctx.moveTo(marker.x, marker.y)
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * routeK
      const pt = bezierPt(t)
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.stroke()
    ctx.restore()

    const shipPt = bezierPt(routeK)
    const aheadPt = bezierPt(Math.min(1, routeK + 0.02))
    const heading = Math.atan2(aheadPt.y - shipPt.y, aheadPt.x - shipPt.x)
    ctx.save()
    ctx.translate(shipPt.x, shipPt.y)
    ctx.rotate(heading)
    ctx.globalAlpha = 0.95
    ctx.fillStyle = '#34d17f'
    ctx.beginPath()
    ctx.moveTo(6, 0)
    ctx.lineTo(-4, -3.4)
    ctx.lineTo(-4, 3.4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    const stepA = clamp01((p - 0.9) / 0.1)
    if (stepA > 0.01) {
      const nextPt = bezierPt(0.5)
      chipLabel(ctx, '다음 스텝: Kubernetes', nextPt.x, nextPt.y - 14, '#ffe7a8', stepA, 9)
    }
  }

  const stageIdx = p < 0.35 ? 0 : p < 0.68 ? 1 : 2
  drawTopLabel(ctx, '북극성 항해', '내 스킬로 방향을 계산하다')
  drawCaption(ctx, h, CAPS[stageIdx])
}

function hexToRgbStr(hex: string): string {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `${r},${g},${b}`
}
