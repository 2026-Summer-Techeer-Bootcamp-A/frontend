// 항로 개척: 부족한 스킬을 선후관계와 공고 수요로 정렬해 순서를 정하고, 그
// 순서대로 항로가 열릴 때마다 적합도 게이지가 실제로 오르는 걸 보여준다.
// 62% -> 71% -> 80% -> 89%, 목표 도달 시 적합 공고 건수 변화까지 표기한다.

import type { VizRender } from '../types'
import { FONT, clamp01, lerp, easeOut, easeInOut, star, chipLabel, roundRect, drawBackground, drawTopLabel, drawCaption } from './common'

const CAPS = [
  '부족 스킬을 선후관계와 수요로 정렬합니다',
  '이 순서로 채우면 적합도가 이렇게 오릅니다',
  '목표 적합도 89%에 도달합니다',
]

interface WaypointDef {
  name: string
  evidence: string
  isStart?: boolean
  isGoal?: boolean
}

const WAYPOINTS: WaypointDef[] = [
  { name: '지금', evidence: '', isStart: true },
  { name: 'Docker', evidence: '선행 충족' },
  { name: 'Kubernetes', evidence: '수요 상위 12% · +9%p' },
  { name: 'CI/CD', evidence: '수요 상위 18% · +9%p', isGoal: true },
]

// 항로가 한 구간씩 열릴 때마다 실측 적합도가 이렇게 오른다.
const FIT_STOPS = [62, 71, 80, 89]
const N = WAYPOINTS.length

// 구간 i(직전 노드 -> i번 노드)가 열리는 시간 창. 게이지 상승과 항로 진행이 같은 창을 공유한다.
const SEG_WINDOWS: [number, number][] = [
  [0.16, 0.4],
  [0.4, 0.64],
  [0.64, 0.86],
]

function segK(p: number, i: number): number {
  const [s, e] = SEG_WINDOWS[i - 1]
  return easeInOut(clamp01((p - s) / (e - s)))
}

function currentFit(p: number): number {
  if (p < SEG_WINDOWS[0][0]) return FIT_STOPS[0]
  for (let i = 1; i <= 3; i++) {
    const [s, e] = SEG_WINDOWS[i - 1]
    if (p < e) return lerp(FIT_STOPS[i - 1], FIT_STOPS[i], easeInOut(clamp01((p - s) / (e - s))))
  }
  return FIT_STOPS[3]
}

interface Pt {
  x: number
  y: number
}

function bezier(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

function buildWaypointPositions(w: number, h: number): Pt[] {
  const start = { x: w * 0.09, y: h * 0.82 }
  const goal = { x: w * 0.86, y: h * 0.2 }
  const ctrl = { x: w * 0.56, y: h * 0.24 }
  const pts: Pt[] = []
  for (let i = 0; i < N; i++) {
    pts.push(bezier(start, ctrl, goal, i / (N - 1)))
  }
  return pts
}

function drawGauge(ctx: CanvasRenderingContext2D, w: number, h: number, p: number): void {
  const gx = w * 0.06
  const gy = h * 0.115
  const gw = w * 0.42
  const gh = 7
  const fit = currentFit(p)
  const goalReached = fit >= 88.5
  const fillCol = goalReached ? '#ffe7a8' : '#34d17f'

  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 9px ${FONT}`
  ctx.fillStyle = 'rgba(154,154,162,0.9)'
  ctx.fillText('적합도', gx, gy - 8)

  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, gx, gy, gw, gh, gh / 2)
  ctx.fill()

  const fillW = Math.max(gh, (gw * fit) / 100)
  ctx.fillStyle = fillCol
  roundRect(ctx, gx, gy, fillW, gh, gh / 2)
  ctx.fill()

  // 목표(89%) 지점 눈금.
  const goalX = gx + (gw * 89) / 100
  ctx.strokeStyle = 'rgba(255,231,168,0.6)'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.moveTo(goalX, gy - 3)
  ctx.lineTo(goalX, gy + gh + 3)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = `600 7.5px ${FONT}`
  ctx.fillStyle = 'rgba(255,231,168,0.75)'
  ctx.textAlign = 'center'
  ctx.fillText('목표 89%', goalX, gy + gh + 13)

  ctx.textAlign = 'left'
  ctx.font = `800 13px ${FONT}`
  ctx.fillStyle = fillCol
  ctx.fillText(`${Math.round(fit)}%`, gx + gw + 12, gy + gh)
  ctx.restore()
}

export const renderVoyagePath: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const pts = buildWaypointPositions(w, h)

  drawGauge(ctx, w, h, p)

  const waveK = clamp01((p - 0.86) / 0.14)

  // 항로 선: 구간별로 열린 만큼만 그린다.
  for (let i = 1; i < N; i++) {
    const k = segK(p, i)
    if (k <= 0.01) continue
    const a = pts[i - 1]
    const b = pts[i]
    const mx = a.x + (b.x - a.x) * k
    const my = a.y + (b.y - a.y) * k
    ctx.save()
    const wavePhase = waveK > 0.01 ? 0.15 * Math.sin(ts / 500 + i * 0.9) : 0
    ctx.globalAlpha = (0.42 + wavePhase) * (waveK > 0.01 ? 1 : k)
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    grad.addColorStop(0, 'rgba(52,209,127,0.7)')
    grad.addColorStop(1, 'rgba(255,231,168,0.7)')
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(mx, my)
    ctx.stroke()
    ctx.restore()
  }

  WAYPOINTS.forEach((wp, i) => {
    const pos = pts[i]
    const revealK = wp.isStart ? clamp01(p / 0.14) : wp.isGoal ? segK(p, N - 1) : segK(p, i)
    if (revealK <= 0.01) return

    if (wp.isGoal) {
      const bloom = easeOut(revealK)
      const pulse = 0.85 + 0.15 * Math.sin(ts / 300)
      const glowR = (10 + 26 * bloom) * pulse
      ctx.save()
      const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR)
      g.addColorStop(0, `rgba(255,224,150,${0.45 * bloom})`)
      g.addColorStop(1, 'rgba(255,224,150,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      const finalPulse = waveK > 0.01 ? 0.7 + 0.3 * Math.sin(ts / 260) : 1
      star(ctx, pos.x, pos.y, (2.4 + 3 * bloom) * finalPulse, 0.95 * bloom, '#ffe7a8', 0.5 + 0.4 * pulse)
      chipLabel(ctx, `${wp.name} · 북극성`, pos.x, pos.y - 30, '#ffe7a8', clamp01((revealK - 0.3) / 0.4), 9)
      chipLabel(ctx, wp.evidence, pos.x, pos.y - 16, '#ffe7a8', clamp01((revealK - 0.5) / 0.4), 8.5)

      const doneA = clamp01((p - 0.9) / 0.1)
      if (doneA > 0.01) {
        ctx.save()
        ctx.globalAlpha = doneA
        // 경유 노드(Kubernetes 등)와 겹치지 않도록 항로 전체에서 비어 있는
        // 우측 하단 구석에 고정 배치한다.
        const cw = Math.min(w * 0.5, 300)
        const ch = 44
        const cx = w - cw - 16
        const cy = h - ch - 26
        ctx.fillStyle = 'rgba(255,217,138,0.09)'
        roundRect(ctx, cx, cy, cw, ch, 9)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,217,138,0.45)'
        ctx.lineWidth = 1
        roundRect(ctx, cx, cy, cw, ch, 9)
        ctx.stroke()
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#ffe7a8'
        ctx.font = `800 10.5px ${FONT}`
        ctx.fillText('예상 적합도 89% · 적합 공고 312에서 540건', cx + 10, cy + 18)
        ctx.fillStyle = 'rgba(154,154,162,0.9)'
        ctx.font = `500 8.5px ${FONT}`
        ctx.fillText('Docker → Kubernetes → CI/CD 순서로 채웠습니다', cx + 10, cy + 33)
        ctx.restore()
      }
      return
    }

    const isStart = wp.isStart
    const col = isStart ? '#34d17f' : '#f4f4f5'
    const rad = isStart ? 3.2 : 2.2
    const tw = 0.7 + 0.3 * Math.sin(ts / 420 + i * 1.6)
    star(ctx, pos.x, pos.y, rad * (0.85 + 0.15 * tw), revealK * (0.75 + 0.25 * tw), col, 0.3 + 0.4 * tw)

    const labelAbove = i % 2 === 1
    const nameY = pos.y + (labelAbove ? -22 : 16)
    const evY = pos.y + (labelAbove ? -9 : 30)
    chipLabel(ctx, isStart ? '지금 여기 · 62%' : wp.name, pos.x, nameY, isStart ? '#34d17f' : 'rgba(230,230,234,0.9)', clamp01((revealK - 0.3) / 0.4), 9)
    if (!isStart && wp.evidence) {
      chipLabel(ctx, wp.evidence, pos.x, evY, '#9cc2ff', clamp01((revealK - 0.55) / 0.4), 8)
    }
  })

  const stageIdx = p < 0.16 ? 0 : p < 0.86 ? 1 : 2
  drawTopLabel(ctx, '항로 개척', '적합도가 오르는 순서를 계산하다')
  drawCaption(ctx, h, CAPS[stageIdx])
}
