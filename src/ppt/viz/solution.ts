// 해결 워크플로우: 흩어진 별 → 별자리 → 카테고리 모임 → 선후 관계를 따진 학습
// 순서 카드. problem.ts(문제 인식)가 남긴 산포 위치(scatterPosition)에서 시작해
// 이야기를 이어받는다. 데이터는 common.ts의 FLAGSHIP_TECHS(언어/백엔드/데이터/
// 인프라/프론트, own=보유 여부, pre=선행 기술)를 그대로 쓰고, 카드 컬럼(depth)은
// pre 체인에서 computeDepths로 자동 계산한다(손으로 매긴 depth는 화살표가
// 역방향으로 휘거나 컬럼을 건너뛰는 버그가 있어 제거했다).

import type { VizRender } from '../types'
import type { FlagshipCategory } from './common'
import {
  FONT,
  FLAGSHIP_TECHS,
  NOISE_STAR_COUNT,
  computeDepths,
  clamp01,
  lerp,
  easeOut,
  easeInOut,
  star,
  roundRect,
  scatterPosition,
  noiseStarPosition,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common'

const CAPS = [
  '흩어진 기술들',
  '별들을 이어 별자리를 만듭니다',
  '종류별로 모읍니다',
  '선후 관계를 따져 배우는 순서 워크플로우가 됩니다',
]

const CAT_ORDER: FlagshipCategory[] = ['언어', '백엔드', '데이터', '인프라', '프론트']

// 전체 period(vizRegistry.ts의 solution-workflow 항목, 16500ms)를 기준으로 절대
// ms 타이밍을 정의한 뒤 p(0~1)로 환산한다. 0~8680ms(카테고리 클러스터 도착)까지는
// 기존 14000ms 타임라인과 절대 ms가 완전히 같다. 8680~11180ms에 클러스터 홀드
// 구간을 새로 끼워 넣어 카테고리별로 모인 모습을 실제로 멈춰서 보여주고,
// 11180ms부터는 기존 흐름(카드 이동 2240ms + 카드 최종 상태 3080ms)을 그대로
// 이어간다. period를 바꿀 때는 이 상수들도 함께 다시 계산해야 한다.
const PERIOD_MS = 16500
const T_EDGE_RISE = 2520 / PERIOD_MS // 별자리 선이 그려지기 시작하는 시점
const T_SCATTER_END = 5600 / PERIOD_MS // 산개 상태가 끝나고 클러스터로 이동을 시작하는 시점
const T_DRIFT_OFF = 7280 / PERIOD_MS // 부력 드리프트가 꺼지는 시점
const T_CLUSTER_ARRIVE = 8680 / PERIOD_MS // 클러스터에 도착하는 시점(홀드 시작)
const T_HOLD_END = 11180 / PERIOD_MS // 홀드가 끝나고 카드 이동을 시작하는 시점
const T_CARD_ARRIVE = 13420 / PERIOD_MS // 카드 그리드에 도착하는 시점(카드 최종 상태 시작)

const T_DRIFT_ON = 1120 / PERIOD_MS
const DRIFT_DECAY_W = 2800 / PERIOD_MS
const CLUSTER_MOVE_W = T_CLUSTER_ARRIVE - T_SCATTER_END
const CARD_MOVE_W = T_CARD_ARRIVE - T_HOLD_END
const CARD_STAGGER = 500 / PERIOD_MS // 카드 depth별 등장 지연
const CARD_DURATION = 1300 / PERIOD_MS // 카드 한 장이 나타나는 데 걸리는 시간(depth=3도 p=1 전에 완성)

const EDGE_STAGGER = 280 / PERIOD_MS
const EDGE_RISE_W = 1400 / PERIOD_MS
const T_EDGE_FALL = 7840 / PERIOD_MS
const EDGE_FALL_W = 1120 / PERIOD_MS

const T_STAR_LABEL_FADE = 7000 / PERIOD_MS
const STAR_LABEL_FADE_W = 1680 / PERIOD_MS

const T_CLUSTER_LABEL_IN = 6160 / PERIOD_MS
const CLUSTER_LABEL_IN_W = 1680 / PERIOD_MS

const T_AXIS = 12300 / PERIOD_MS
const AXIS_W = 2100 / PERIOD_MS

// FLAGSHIP_TECHS[i]의 카드 컬럼(선후 관계 깊이). 인덱스가 그대로 대응한다.
const DEPTHS = computeDepths(FLAGSHIP_TECHS)

const AXIS = ['지금', '다음', '이후', '도전']

interface Pt {
  x: number
  y: number
}

interface CardSlot extends Pt {
  w: number
  h: number
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

// 별자리 단계에서 잇는 선: 선행 관계 + 같은 카테고리(선행이 없는 언어 4종)의 체인.
function buildEdges(): [number, number][] {
  const byName = new Map(FLAGSHIP_TECHS.map((t, i) => [t.name, i]))
  const edges: [number, number][] = []
  FLAGSHIP_TECHS.forEach((t, i) => {
    if (t.pre) {
      const j = byName.get(t.pre)
      if (j !== undefined) edges.push([j, i])
    }
  })
  const langIdx = FLAGSHIP_TECHS.map((t, i) => (t.cat === '언어' ? i : -1)).filter((i) => i >= 0)
  for (let k = 0; k < langIdx.length - 1; k++) edges.push([langIdx[k], langIdx[k + 1]])
  return edges
}

const EDGES = buildEdges()

function buildClusters(w: number, h: number): { centers: Pt[]; positions: Pt[] } {
  const centers = CAT_ORDER.map((_, i) => ({ x: w * (0.12 + i * 0.19), y: h * 0.5 }))
  const positions: Pt[] = new Array(FLAGSHIP_TECHS.length)
  CAT_ORDER.forEach((cat, ci) => {
    const members = FLAGSHIP_TECHS.map((t, idx) => ({ t, idx })).filter((m) => m.t.cat === cat)
    const center = centers[ci]
    members.forEach((m, j) => {
      if (members.length === 1) {
        positions[m.idx] = { ...center }
        return
      }
      const ang = (j / members.length) * Math.PI * 2 - Math.PI / 2
      positions[m.idx] = { x: center.x + Math.cos(ang) * 15, y: center.y + Math.sin(ang) * 15 }
    })
  })
  return { centers, positions }
}

interface Grid {
  slots: Map<number, CardSlot>
  marginX: number
  colW: number
  cardW: number
  rowBottom: number
}

function buildGrid(w: number, h: number): Grid {
  const cols = 4
  const marginX = w * 0.03
  const availW = w * 0.94
  const colW = availW / cols
  const cardW = colW - 16
  const rowTop = h * 0.16
  const rowBottom = h * 0.82
  const availH = rowBottom - rowTop
  const rowGap = 10
  const byDepth: number[][] = [[], [], [], []]
  FLAGSHIP_TECHS.forEach((_, idx) => byDepth[DEPTHS[idx]].push(idx))
  const slots = new Map<number, CardSlot>()
  // cardH는 컬럼마다 자기 자신의 row 수 기준으로 독립 계산한다(공유 maxRows를
  // 쓰면 항목이 많은 한 컬럼 때문에 전 컬럼의 카드가 다같이 눌린다).
  byDepth.forEach((idxs, depth) => {
    if (idxs.length === 0) return
    const cardH = (availH - (idxs.length - 1) * rowGap) / idxs.length
    const totalH = idxs.length * cardH + (idxs.length - 1) * rowGap
    const startY = rowTop + (availH - totalH) / 2
    const x = marginX + depth * colW + 8
    idxs.forEach((idx, row) => {
      slots.set(idx, { x, y: startY + row * (cardH + rowGap), w: cardW, h: cardH })
    })
  })
  return { slots, marginX, colW, cardW, rowBottom }
}

function cardKOf(depth: number, p: number): number {
  if (p < T_CARD_ARRIVE) return 0
  return easeInOut(clamp01((p - T_CARD_ARRIVE - depth * CARD_STAGGER) / CARD_DURATION))
}

function positionOf(idx: number, p: number, w: number, h: number, clusters: Pt[], grid: Grid, ts: number): Pt {
  const scatterP = scatterPosition(idx, w, h)
  // 부력 드리프트: 첫 프레임(p=0)에서는 0이라 정확히 scatterPosition에 놓여, 문제
  // 인식의 정지된 끝 프레임과 완벽히 일치한다. 서서히 떠오르다가 카테고리로
  // 정렬되기 시작하면 사라져 카드 배치는 정확히 고정된다.
  const driftK = clamp01(p / T_DRIFT_ON) * clamp01((T_DRIFT_OFF - p) / DRIFT_DECAY_W)
  const dx = Math.sin(ts / 1500 + idx * 1.3) * 2.6 * driftK
  const dy = Math.cos(ts / 1800 + idx * 0.8) * 2.2 * driftK
  if (p < T_SCATTER_END) return { x: scatterP.x + dx, y: scatterP.y + dy }
  const cluster = clusters[idx]
  if (p < T_CLUSTER_ARRIVE) {
    const q = lerpPt(scatterP, cluster, easeInOut(clamp01((p - T_SCATTER_END) / CLUSTER_MOVE_W)))
    return { x: q.x + dx, y: q.y + dy }
  }
  // 홀드: 클러스터에 도착한 뒤 카드 이동을 시작하기 전까지 위치를 완전히 멈춰서
  // 카테고리별로 모인 모습을 실제로 보여준다(추가 이동 없음).
  if (p < T_HOLD_END) return cluster
  const slot = grid.slots.get(idx)!
  const cardCenter = { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 }
  if (p < T_CARD_ARRIVE) return lerpPt(cluster, cardCenter, easeInOut(clamp01((p - T_HOLD_END) / CARD_MOVE_W)))
  return cardCenter
}

// 카드 색 문법: 5색 무지개 대신 보유(own) 대 미보유 2톤. 카테고리는 색 없이
// 약한 회색 텍스트 라벨로만 구분한다.
function drawWorkflowCard(
  ctx: CanvasRenderingContext2D,
  slot: CardSlot,
  tech: (typeof FLAGSHIP_TECHS)[number],
  alpha: number,
): void {
  if (alpha <= 0.02) return
  // 항목이 많은 컬럼(예: 선행 없는 언어 5종)은 buildGrid가 배정하는 slot.h가
  // 여전히 작다. 카테고리 라벨과 기술명이 겹치지 않도록 카드가 낮을 때는 라벨을
  // 위로 더 붙이고 폰트를 살짝 줄인다.
  const compact = slot.h < 60
  const labelFs = compact ? 7 : 8
  const nameFs = compact ? 10.5 : 12
  const hintFs = compact ? 6.5 : 7.5
  const labelY = slot.y + (compact ? 10 : 16)
  const nameY = slot.y + slot.h / 2 + (compact ? 2 : 3)
  const hintY = slot.y + slot.h - (compact ? 7 : 12)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = tech.own ? '#2f2f31' : '#322d28'
  roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 9)
  ctx.fill()
  ctx.strokeStyle = tech.own ? 'rgba(244,244,245,0.26)' : 'rgba(226,147,63,0.8)'
  ctx.lineWidth = tech.own ? 1 : 1.2
  roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 9)
  ctx.stroke()

  ctx.textBaseline = 'middle'
  if (tech.own) {
    ctx.fillStyle = '#f4f4f5'
    ctx.beginPath()
    ctx.arc(slot.x + 14, labelY, 2.5, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.strokeStyle = '#e2933f'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(slot.x + 14, labelY, 2.5, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.font = `600 ${labelFs}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillStyle = '#6f6f78'
  ctx.fillText(tech.cat, slot.x + 22, labelY)

  ctx.font = `800 ${nameFs}px ${FONT}`
  ctx.fillStyle = tech.own ? '#f4f4f5' : 'rgba(232,232,236,0.9)'
  ctx.fillText(tech.name, slot.x + 14, nameY)

  ctx.font = `500 ${hintFs}px ${FONT}`
  ctx.fillStyle = 'rgba(154,154,162,0.85)'
  const preText = tech.pre ? `선행: ${tech.pre}` : '선행 없음'
  ctx.fillText(`${preText} · ${tech.hint}`, slot.x + 14, hintY)
  ctx.restore()
}

// 화살표(커넥터): 흐르는 베지어 대신 다이어그램 stub 스타일. 제어점을 끝점 근처로
// 당겨(STUB=14px) 카드 사이를 짧게 잇고, 색은 카테고리색이 아닌 고정 회색 하나만 쓴다.
function drawArrow(ctx: CanvasRenderingContext2D, from: CardSlot, to: CardSlot, alpha: number): void {
  if (alpha <= 0.02) return
  const x1 = from.x + from.w
  const y1 = from.y + from.h / 2
  const x2 = to.x
  const y2 = to.y + to.h / 2
  const STUB = 14
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = 'rgba(154,154,162,0.55)'
  ctx.lineWidth = 1.0
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo(x1 + STUB, y1, x2 - STUB, y2, x2, y2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(154,154,162,0.8)'
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - 5, y2 - 2.5)
  ctx.lineTo(x2 - 5, y2 + 2.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export const renderSolution: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)

  // 배경 먼지 별: problem.ts(문제 인식) 마지막 프레임과 같은 시드 위치·스타일로
  // 이어받아 p=0에서 풀 알파로 시작했다가 별자리 선이 그려지기 전(0.15)에 사라진다.
  const noiseA = 1 - clamp01(p / 0.15)
  if (noiseA > 0.01) {
    for (let i = 0; i < NOISE_STAR_COUNT; i++) {
      const npos = noiseStarPosition(i, w, h)
      const tw = 0.6 + 0.4 * Math.sin(ts / 620 + i * 2.1)
      star(ctx, npos.x, npos.y, 0.9 + 0.4 * tw, noiseA * (0.28 + 0.22 * tw), '#f4f4f5', 0.1 + 0.15 * tw)
    }
  }

  const { centers, positions: clusters } = buildClusters(w, h)
  const grid = buildGrid(w, h)

  const pos = FLAGSHIP_TECHS.map((_, idx) => positionOf(idx, p, w, h, clusters, grid, ts))

  // 별자리: 선행/동족 관계를 얇은 선으로 잇는다. 카드 단계로 넘어가기 전에 사라진다.
  EDGES.forEach(([a, b], e) => {
    const rise = easeOut(clamp01((p - T_EDGE_RISE - e * EDGE_STAGGER) / EDGE_RISE_W))
    const fall = 1 - clamp01((p - T_EDGE_FALL) / EDGE_FALL_W)
    const k = rise * clamp01(fall)
    if (k <= 0.01) return
    ctx.save()
    ctx.globalAlpha = 0.16 * k
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pos[a].x, pos[a].y)
    ctx.lineTo(pos[b].x, pos[b].y)
    ctx.stroke()
    ctx.restore()
  })

  FLAGSHIP_TECHS.forEach((tech, idx) => {
    const cardK = cardKOf(DEPTHS[idx], p)
    const starA = 1 - cardK
    if (starA > 0.02) {
      // 문제 인식의 정착 별과 같은 반짝임/크기/스파이크 공식을 써서 이음매를 맞춘다.
      const tw = 0.7 + 0.3 * Math.sin(ts / 380 + idx * 1.7)
      // p<0.2(별자리를 잇기 전)에는 모든 별이 흰색으로, 문제 인식 끝(전부 흰색)과
      // 완벽히 이어진다. 그 뒤부터 보유(own) 여부로 흰색/주황이 갈린다.
      const col = p < 0.2 || tech.own ? '#f4f4f5' : '#e2933f'
      star(ctx, pos[idx].x, pos[idx].y, 1.9 + 0.6 * tw, starA * (0.75 + 0.25 * tw), col, 0.3 + 0.5 * tw)

      // 흩어짐~별자리 구간의 기술 라벨. 첫 프레임에서 문제 인식 끝의 라벨과 일치하고,
      // 카드가 형성되기 시작하면 사라진다.
      const labelA = starA * (1 - clamp01((p - T_STAR_LABEL_FADE) / STAR_LABEL_FADE_W))
      if (labelA > 0.02) {
        ctx.save()
        ctx.globalAlpha = 0.68 * labelA
        ctx.fillStyle = 'rgba(244,244,245,0.75)'
        ctx.font = `600 8.5px ${FONT}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(tech.name, pos[idx].x + 6, pos[idx].y + 3)
        ctx.restore()
      }
    }
    if (cardK > 0.02) {
      drawWorkflowCard(ctx, grid.slots.get(idx)!, tech, cardK)
    }
  })

  FLAGSHIP_TECHS.forEach((tech, idx) => {
    if (!tech.pre) return
    const preIdx = FLAGSHIP_TECHS.findIndex((t) => t.name === tech.pre)
    if (preIdx < 0) return
    const k0 = cardKOf(DEPTHS[preIdx], p)
    const k1 = cardKOf(DEPTHS[idx], p)
    const arrowA = clamp01((Math.min(k0, k1) - 0.3) / 0.5)
    if (arrowA > 0.02) {
      drawArrow(ctx, grid.slots.get(preIdx)!, grid.slots.get(idx)!, arrowA)
    }
  })

  // 카테고리 라벨: 클러스터로 모이며 나타나 도착 후 홀드 구간 내내 온전히
  // 유지되고, 카드 이동이 시작되는 시점(T_HOLD_END)부터 사라지기 시작한다.
  const clusterLabelK =
    clamp01((p - T_CLUSTER_LABEL_IN) / CLUSTER_LABEL_IN_W) * (1 - clamp01((p - T_HOLD_END) / CARD_MOVE_W))
  if (clusterLabelK > 0.02) {
    ctx.save()
    ctx.globalAlpha = clusterLabelK
    ctx.font = `700 9px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#9a9aa2'
    centers.forEach((c, ci) => {
      ctx.fillText(CAT_ORDER[ci], c.x, c.y + 34)
    })
    ctx.restore()
  }

  const axisA = clamp01((p - T_AXIS) / AXIS_W)
  if (axisA > 0.02) {
    ctx.save()
    ctx.globalAlpha = axisA
    ctx.font = `700 9px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(154,154,162,0.85)'
    AXIS.forEach((label, depth) => {
      const cx = grid.marginX + depth * grid.colW + 8 + grid.cardW / 2
      ctx.fillText(label, cx, grid.rowBottom + 22)
    })
    ctx.restore()
  }

  // 캡션 2('종류별로 모읍니다')는 클러스터 이동부터 홀드 구간 끝까지 유지되고,
  // 카드 이동이 시작되는 시점(T_HOLD_END)에 캡션 3으로 바뀐다.
  const stageIdx = p < T_EDGE_RISE ? 0 : p < T_SCATTER_END ? 1 : p < T_HOLD_END ? 2 : 3
  drawTopLabel(ctx, '해결 워크플로우', '배우는 순서로 정리')
  drawCaption(ctx, h, CAPS[stageIdx])
}
