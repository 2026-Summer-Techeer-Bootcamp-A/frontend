// 데이터 수집 규모: 국내 채용 공고를 4개 소스에서 모아 7,104건에서
// 49,015건으로 늘린 실측을 보여준다. 소스 칩에서 입자가 흘러들며 중앙
// 카운터가 롤업되고, 하단 막대가 그만큼 채워진다.

import type { VizRender } from '../types'
import { FONT, clamp01, easeOut, lerp, roundRect, star, seededRandom, drawBackground, drawTopLabel, drawCaption, palette } from './common'

const START_COUNT = 7104
const END_COUNT = 49015

interface Source {
  name: string
  count: number
  col: string
}

// 소스별 기여치(예시 배분): 합은 실측 최종치 49,015와 정확히 일치한다.
const SOURCES: Source[] = [
  { name: '잡코리아', count: 18500, col: '#6ea8fe' },
  { name: '사람인', count: 14200, col: '#e879b0' },
  { name: '원티드', count: 9800, col: '#4dd0e1' },
  { name: '점핏', count: 6515, col: '#ffd166' },
]

const CAPS = ['4개 소스에서 채용 공고를 수집합니다', '중복을 정리해 49,015건으로 통합합니다']

const CHIP_IN_END = 0.12
const FLOW_START = 0.12
const FLOW_END = 0.78
const NUM_PARTICLES_PER_SOURCE = 10

interface Pt {
  x: number
  y: number
}

function sourcePositions(w: number, h: number): Pt[] {
  const y = h * 0.2
  return SOURCES.map((_, i) => ({ x: w * (0.16 + i * 0.23), y }))
}

export const renderDataScale: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)

  const center = { x: w / 2, y: h * 0.56 }
  const srcPos = sourcePositions(w, h)

  // 맥락 라벨.
  const ctxA = clamp01(p / 0.08)
  if (ctxA > 0.01) {
    ctx.save()
    ctx.globalAlpha = ctxA
    ctx.font = `700 10px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(154,154,162,0.85)'
    ctx.fillText('국내 채용 공고 · 4개 소스 통합', w / 2, h * 0.1)
    ctx.restore()
  }

  // 소스 칩.
  const chipA = clamp01(p / CHIP_IN_END)
  SOURCES.forEach((s, i) => {
    if (chipA <= 0.01) return
    const pos = srcPos[i]
    ctx.save()
    ctx.globalAlpha = chipA
    const cw = 78
    const ch = 26
    ctx.fillStyle = 'rgba(255,255,255,0.055)'
    roundRect(ctx, pos.x - cw / 2, pos.y - ch / 2, cw, ch, 8)
    ctx.fill()
    ctx.strokeStyle = s.col
    ctx.globalAlpha = chipA * 0.55
    ctx.lineWidth = 1.2
    roundRect(ctx, pos.x - cw / 2, pos.y - ch / 2, cw, ch, 8)
    ctx.stroke()
    ctx.globalAlpha = chipA
    ctx.fillStyle = 'rgba(244,244,245,0.95)'
    ctx.font = `700 10px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.name, pos.x, pos.y + 0.5)
    ctx.restore()

    // 소스별 기여 건수: 흐름이 어느 정도 진행된 뒤 칩 아래 표시.
    const countA = clamp01((p - FLOW_START - 0.2 - i * 0.03) / 0.14)
    if (countA > 0.01) {
      ctx.save()
      ctx.globalAlpha = countA
      ctx.font = `600 9px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = s.col
      ctx.fillText(`${s.count.toLocaleString('en-US')}건`, pos.x, pos.y + ch / 2 + 16)
      ctx.restore()
    }
  })

  // 입자 흐름: 각 소스에서 중앙 카운터로 흘러드는 작은 점들.
  const flowK = clamp01((p - FLOW_START) / (FLOW_END - FLOW_START))
  if (flowK > 0.01) {
    SOURCES.forEach((s, si) => {
      const pos = srcPos[si]
      for (let j = 0; j < NUM_PARTICLES_PER_SOURCE; j++) {
        const seed = si * 41.7 + j * 7.13
        const stagger = seededRandom(seed) * 0.75
        const loopT = ((p - FLOW_START) / (FLOW_END - FLOW_START) + stagger) % 1
        if (p < FLOW_START || p > FLOW_END) continue
        const arc = seededRandom(seed + 2.3) * 0.5 - 0.25
        const midX = (pos.x + center.x) / 2 + arc * 40
        const midY = (pos.y + center.y) / 2 - 18
        const x = (1 - loopT) * (1 - loopT) * pos.x + 2 * (1 - loopT) * loopT * midX + loopT * loopT * center.x
        const y = (1 - loopT) * (1 - loopT) * pos.y + 2 * (1 - loopT) * loopT * midY + loopT * loopT * center.y
        const fade = Math.sin(Math.PI * loopT)
        star(ctx, x, y, 1.3, 0.75 * fade, s.col)
      }
    })
  }

  // 중앙 카운터 롤업.
  const rollK = easeOut(clamp01((p - FLOW_START) / (FLOW_END - FLOW_START)))
  const displayCount = Math.round(lerp(START_COUNT, END_COUNT, rollK))
  const pulse = 0.9 + 0.1 * Math.sin(ts / 260)
  ctx.save()
  const glowR = 62 * (0.85 + 0.15 * rollK) * pulse
  const g = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, glowR)
  g.addColorStop(0, `rgba(52,209,127,${0.16 + 0.1 * rollK})`)
  g.addColorStop(1, 'rgba(52,209,127,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(center.x, center.y, glowR, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = palette.ink
  ctx.font = `800 ${Math.round(h * 0.13)}px ${FONT}`
  ctx.fillText(displayCount.toLocaleString('en-US'), center.x, center.y)
  ctx.fillStyle = 'rgba(154,154,162,0.9)'
  ctx.font = `600 10px ${FONT}`
  ctx.fillText('누적 채용 공고', center.x, center.y + h * 0.11)
  ctx.restore()

  // 하단 진행 막대: 카운터 진행률과 함께 채워진다.
  const barX = w * 0.14
  const barW = w * 0.72
  const barY = h * 0.82
  const barH = Math.max(10, h * 0.045)
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, barX, barY, barW, barH, barH / 2)
  ctx.fill()
  const fillRatio = displayCount / END_COUNT
  ctx.fillStyle = palette.good
  roundRect(ctx, barX, barY, barW * fillRatio, barH, barH / 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 9px ${FONT}`
  ctx.fillStyle = 'rgba(154,154,162,0.75)'
  ctx.fillText(`${START_COUNT.toLocaleString('en-US')}건`, barX, barY - 6)
  ctx.textAlign = 'right'
  ctx.fillText(`${END_COUNT.toLocaleString('en-US')}건`, barX + barW, barY - 6)
  ctx.restore()

  const stageIdx = p < 0.5 ? 0 : 1
  drawTopLabel(ctx, '데이터 수집 규모', '4개 소스 통합')
  drawCaption(ctx, h, CAPS[stageIdx])
}
