// 문제 인식: 수많은 이력서가 모이고, 글귀에서 기술이 뽑혀 나와, 밤하늘의 별처럼
// 정돈 없이 흩어진다. solution.ts(해결 워크플로우)의 시작 상태와 별 배치를
// 공유해서 두 시각화가 하나의 이야기처럼 이어지게 했다(공유 데이터는 common.ts의
// FLAGSHIP_TECHS · scatterPosition).

import type { VizRender } from '../types'
import {
  FONT,
  FLAGSHIP_TECHS,
  NOISE_STAR_COUNT,
  clamp01,
  lerp,
  easeOut,
  easeInOut,
  star,
  roundRect,
  seededRandom,
  scatterPosition,
  noiseStarPosition,
  drawBackground,
  drawTopLabel,
  drawCaption,
} from './common'

const CAPS = [
  '수많은 이력서가 쌓입니다',
  '글귀에서 기술을 뽑아냅니다',
  '하지만 정돈 없이 흩어져 있습니다',
  '수천 개 공고도, 내 이력서도 이렇게 흩어져 있습니다',
]

const CARD_W = 84
const CARD_H = 112
const ROW_H = 15
const ROW_TOP = 30
const TECH_ROWS = [1, 3] as const

interface ResumeCard {
  cx: number
  cy: number
  rot: number
  fromX: number
  fromY: number
  fromRot: number
  delay: number
  techIdx: [number, number]
  lineW: number[]
}

function buildResumes(w: number, h: number): ResumeCard[] {
  const stackX = w * 0.5
  const stackY = h * 0.5
  const cards: ResumeCard[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.4
    const dist = Math.max(w, h) * 0.85
    const dx = (i - 2.5) * 6
    const dy = ((i % 3) - 1) * 5
    cards.push({
      cx: stackX + dx,
      cy: stackY + dy,
      rot: (i - 2.5) * 3.2,
      fromX: stackX + Math.cos(angle) * dist,
      fromY: stackY + Math.sin(angle) * dist,
      fromRot: i % 2 === 0 ? -46 : 46,
      delay: i * 0.02,
      techIdx: [i * 2, i * 2 + 1],
      lineW: [0.78, 0.6, 0.9, 0.5, 0.68].map((f, j) => clamp01(f + (seededRandom(i * 9 + j) - 0.5) * 0.1)),
    })
  }
  return cards
}

// 토큰이 이력서에서 떠오르기 시작하는 시점. 균일한 메트로놈 스태거는 작위적으로
// 보이므로 seed 기반 지터를 더해 유기적으로 흩어지게 한다.
function tokenDelay(idx: number): number {
  return 0.26 + idx * 0.013 + seededRandom(idx * 3 + 1) * 0.05
}

// 이력서 글귀의 초록 단어가 사라지는 시점: 별이 태어나 떠오르기 시작하면 곧 비운다.
function tokenPopEnd(idx: number): number {
  return tokenDelay(idx) + 0.04
}

// 토큰 한 개가 origin에서 최종 산포 위치까지 한 번에 부드럽게 흐르는 전체 시간(비율).
const TOKEN_JOURNEY = 0.42

function resumeStackAlpha(p: number, arrivalK: number): number {
  if (p < 0.28) return arrivalK
  if (p < 0.55) return lerp(1, 0.12, clamp01((p - 0.28) / 0.27))
  if (p < 0.72) return lerp(0.12, 0, clamp01((p - 0.55) / 0.17))
  return 0
}

function drawResume(ctx: CanvasRenderingContext2D, card: ResumeCard, p: number, alpha: number): void {
  const k = easeOut(clamp01((p - card.delay) / 0.16))
  if (alpha <= 0.01 || k <= 0.01) return
  const cx = lerp(card.fromX, card.cx, k)
  const cy = lerp(card.fromY, card.cy, k)
  const rot = (lerp(card.fromRot, card.rot, k) * Math.PI) / 180
  const x0 = -CARD_W / 2
  const y0 = -CARD_H / 2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha * k

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 9
  ctx.shadowOffsetY = 3
  ctx.fillStyle = '#efece4'
  roundRect(ctx, x0, y0, CARD_W, CARD_H, 4)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'
  ctx.lineWidth = 1
  roundRect(ctx, x0, y0, CARD_W, CARD_H, 4)
  ctx.stroke()

  ctx.fillStyle = 'rgba(40,40,40,0.28)'
  ctx.beginPath()
  ctx.arc(x0 + 14, y0 + 14, 4, 0, Math.PI * 2)
  ctx.fill()

  for (let row = 0; row < 5; row++) {
    const ly = y0 + ROW_TOP + row * ROW_H
    const rowSlot = TECH_ROWS.indexOf(row as 1 | 3)
    const tokenIdx = rowSlot >= 0 ? card.techIdx[rowSlot] : -1
    if (tokenIdx === -1) {
      ctx.fillStyle = 'rgba(40,40,40,0.22)'
      ctx.fillRect(x0 + 12, ly, (CARD_W - 24) * card.lineW[row], 3)
      continue
    }
    const dly = tokenDelay(tokenIdx)
    const pend = tokenPopEnd(tokenIdx)
    if (p >= pend) continue // 이미 별로 떠났다: 빈 줄로 남긴다.
    const hi = clamp01((p - (dly - 0.06)) / 0.06)
    if (hi <= 0.05) {
      ctx.fillStyle = 'rgba(40,40,40,0.22)'
      ctx.fillRect(x0 + 12, ly, (CARD_W - 24) * card.lineW[row], 3)
    } else {
      ctx.save()
      ctx.globalAlpha = alpha * k * Math.min(1, hi * 1.6)
      ctx.fillStyle = '#1f8a53'
      ctx.font = `700 9px ${FONT}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(FLAGSHIP_TECHS[tokenIdx].name, x0 + 12, ly + 1.5)
      ctx.restore()
    }
  }
  ctx.restore()
}

// row===1의 로컬 중심 y, row===3의 로컬 중심 y (카드 중심 기준, 회전은 무시한 근사치).
function tokenOriginLocalY(row: 1 | 3): number {
  return -CARD_H / 2 + ROW_TOP + row * ROW_H + 1.5
}

function tokenOrigin(idx: number, cards: ResumeCard[]): { x: number; y: number } {
  const cardIdx = Math.floor(idx / 2)
  const card = cards[cardIdx]
  const row: 1 | 3 = idx % 2 === 0 ? 1 : 3
  return { x: card.cx - CARD_W / 2 + 12, y: card.cy + tokenOriginLocalY(row) }
}

// origin과 final 사이의 제어점: 살짝 위로 솟았다가 내려앉는 완만한 포물선을 만든다.
// 별이 이력서에서 공중으로 떠올랐다가 제자리에 자리잡는 느낌을 준다.
function arcControl(origin: { x: number; y: number }, final: { x: number; y: number }, idx: number): { x: number; y: number } {
  const midX = (origin.x + final.x) / 2 + (seededRandom(idx * 5 + 2) - 0.5) * 46
  const topY = Math.min(origin.y, final.y)
  const rise = 54 + seededRandom(idx * 7 + 4) * 46
  return { x: midX, y: topY - rise }
}

export const renderProblem: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)
  const cards = buildResumes(w, h)

  cards.forEach((card) => {
    const arrivalK = easeOut(clamp01((p - card.delay) / 0.16))
    drawResume(ctx, card, p, resumeStackAlpha(p, arrivalK))
  })

  // 무질서·과부하 느낌을 더하는 배경 먼지 별: 라벨 없이 은은하게, 흩어짐 단계부터
  // 나타나 마지막 프레임(p=1)까지 풀 알파를 유지한다(solution.ts 시작과 이어지도록).
  const noiseA = clamp01((p - 0.32) / 0.16)
  if (noiseA > 0.01) {
    for (let i = 0; i < NOISE_STAR_COUNT; i++) {
      const pos = noiseStarPosition(i, w, h)
      const tw = 0.6 + 0.4 * Math.sin(ts / 620 + i * 2.1)
      star(ctx, pos.x, pos.y, 0.9 + 0.4 * tw, noiseA * (0.28 + 0.22 * tw), '#f4f4f5', 0.1 + 0.15 * tw)
    }
  }

  // 추출된 기술 별 토큰: 이력서 글귀에서 태어나, 하나의 완만한 포물선을 따라
  // 밤하늘의 제자리로 부드럽게 흘러가 자리잡는다(단일 easeInOut 아크, 속도 불연속 없음).
  FLAGSHIP_TECHS.forEach((tech, idx) => {
    const dly = tokenDelay(idx)
    if (p < dly) return
    const origin = tokenOrigin(idx, cards)
    const final = scatterPosition(idx, w, h)
    const ctrl = arcControl(origin, final, idx)

    const journey = clamp01((p - dly) / TOKEN_JOURNEY)
    const k = easeInOut(journey)
    const u = 1 - k
    let x = u * u * origin.x + 2 * u * k * ctrl.x + k * k * final.x
    let y = u * u * origin.y + 2 * u * k * ctrl.y + k * k * final.y

    // 은은한 부력: 떠오를수록 약하게 흔들리다가, 마지막 구간(p 0.9~1.0)에서 완전히
    // 멈춰 정확히 scatterPosition에 정착한다. 이 정지 상태가 해결 워크플로우의 첫
    // 프레임과 완벽히 일치하는 이음매가 된다.
    const endStill = 1 - clamp01((p - 0.9) / 0.1)
    const buoy = (0.35 + 0.65 * journey) * endStill
    x += Math.sin(ts / 1400 + idx * 1.3) * 2.4 * buoy
    y += Math.cos(ts / 1700 + idx * 0.9) * 2.0 * buoy

    // 추출 순간을 또렷하게: 초록 하이라이트가 별로 떨어져 나오는 짧은 연결선을
    // 여정 초반에만 살짝 보여준다(금세 사라져 "떨어져 나옴"이 느껴지게 한다).
    const tetherA = (1 - clamp01(journey / 0.14)) * clamp01(journey / 0.03)
    if (tetherA > 0.01) {
      ctx.save()
      ctx.globalAlpha = tetherA * 0.55
      ctx.strokeStyle = '#1f8a53'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(origin.x, origin.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.restore()
    }

    const birth = easeOut(clamp01(journey / 0.16))
    const tw = 0.7 + 0.3 * Math.sin(ts / 380 + idx * 1.7)
    const spike = 0.12 + (0.18 + 0.5 * tw) * k
    const rad = lerp(2.6, 1.9 + 0.6 * tw, k)
    star(ctx, x, y, rad, birth * (0.9 - 0.15 * k + 0.25 * tw * k), '#f4f4f5', spike)

    // 라벨은 별이 제자리에 자리잡은 뒤 은은하게 떠오른다.
    const settleP = dly + TOKEN_JOURNEY
    const labelA = clamp01((p - settleP) / 0.08)
    if (labelA > 0.02) {
      ctx.save()
      ctx.globalAlpha = 0.68 * labelA
      ctx.fillStyle = 'rgba(244,244,245,0.75)'
      ctx.font = `600 8.5px ${FONT}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(tech.name, x + 6, y + 3)
      ctx.restore()
    }
  })

  const ci = p < 0.28 ? 0 : p < 0.58 ? 1 : p < 0.86 ? 2 : 3
  drawTopLabel(ctx, '문제 인식', '이력서 속에 흩어진 기술')
  drawCaption(ctx, h, CAPS[ci])
}
