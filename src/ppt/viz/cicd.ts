// CI/CD 파이프라인: 커밋 토큰이 체크아웃 · 빌드 · 테스트 · 이미지 · 배포
// 5스테이지를 좌에서 우로 통과한다. 각 스테이지를 지날 때 초록 체크와
// 소요 시간이 붙고, 마지막 배포 스테이지에서 main 자동 배포 성공을 보여준다.

import type { VizRender } from '../types'
import { FONT, clamp01, easeInOut, lerp, roundRect, star, drawBackground, drawTopLabel, drawCaption, palette } from './common'

interface Stage {
  name: string
  time: string
}

const STAGES: Stage[] = [
  { name: '체크아웃', time: '4s' },
  { name: '빌드', time: '58s' },
  { name: '테스트', time: '1m 22s' },
  { name: '이미지', time: '41s' },
  { name: '배포', time: '19s' },
]

const CAPS = ['커밋이 파이프라인에 들어갑니다', '빌드 테스트 이미지 배포를 통과합니다', 'main에 자동 배포됩니다']

const PIPE_START = 0.06
const PIPE_END = 0.84
const STEP = (PIPE_END - PIPE_START) / STAGES.length

type StageState = 'pending' | 'active' | 'done'

function stageState(i: number, p: number): StageState {
  const start = PIPE_START + i * STEP
  const doneAt = start + STEP * 0.72
  if (p < start) return 'pending'
  if (p < doneAt) return 'active'
  return 'done'
}

function stageCenters(w: number): number[] {
  return STAGES.map((_, i) => w * (0.13 + i * 0.185))
}

export const renderCicd: VizRender = (ctx, w, h, p, ts) => {
  drawBackground(ctx, w, h)

  const centers = stageCenters(w)
  const boxW = w * 0.15
  const boxTop = h * 0.3
  const boxH = h * 0.32
  const railY = boxTop - 16

  // 맥락 라벨.
  const ctxA = clamp01(p / 0.08)
  if (ctxA > 0.01) {
    ctx.save()
    ctx.globalAlpha = ctxA
    ctx.font = `700 10px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(154,154,162,0.85)'
    ctx.fillText('GitHub Actions · main 브랜치', w / 2, h * 0.14)
    ctx.restore()
  }

  // 레일: 커밋 토큰이 지나가는 얇은 선.
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(centers[0], railY)
  ctx.lineTo(centers[STAGES.length - 1], railY)
  ctx.stroke()
  ctx.restore()

  // 커밋 토큰: easeInOut 아크로 흐르며 은은히 부력을 준다.
  const travelT = easeInOut(clamp01((p - PIPE_START) / (PIPE_END - PIPE_START)))
  const tokenX = lerp(centers[0], centers[STAGES.length - 1], travelT)
  const bob = Math.sin(ts / 260) * 1.6
  if (p >= 0.01 && p < PIPE_END + 0.05) {
    const tokenA = clamp01(p / 0.04) * (1 - clamp01((p - (PIPE_END + 0.02)) / 0.05))
    if (tokenA > 0.01) {
      star(ctx, tokenX, railY + bob, 3, tokenA, '#f4f4f5', 0.5)
      ctx.save()
      ctx.globalAlpha = tokenA * 0.85
      ctx.font = `600 8px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = 'rgba(200,200,206,0.85)'
      ctx.fillText('commit a3f1c9', tokenX, railY - 10 + bob)
      ctx.restore()
    }
  }

  STAGES.forEach((stage, i) => {
    const state = stageState(i, p)
    const cx = centers[i]
    const x = cx - boxW / 2
    const boxA = clamp01((p - (PIPE_START + i * STEP - 0.03)) / 0.08)
    if (boxA <= 0.01) return

    let bd = 'rgba(255,255,255,0.14)'
    let bg = 'rgba(255,255,255,0.03)'
    if (state === 'active') {
      bd = 'rgba(255,255,255,0.4)'
      bg = 'rgba(255,255,255,0.06)'
    } else if (state === 'done') {
      bd = 'rgba(52,209,127,0.5)'
      bg = palette.goodBg
    }

    ctx.save()
    ctx.globalAlpha = boxA
    if (state === 'active') {
      const pulse = 0.4 + 0.3 * Math.sin(ts / 220)
      ctx.shadowColor = 'rgba(255,255,255,0.5)'
      ctx.shadowBlur = 10 * pulse
    }
    ctx.fillStyle = bg
    roundRect(ctx, x, boxTop, boxW, boxH, 9)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = bd
    ctx.lineWidth = state === 'done' ? 1.4 : 1
    roundRect(ctx, x, boxTop, boxW, boxH, 9)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 10.5px ${FONT}`
    ctx.fillStyle = state === 'pending' ? 'rgba(180,180,186,0.6)' : 'rgba(244,244,245,0.95)'
    ctx.fillText(stage.name, cx, boxTop + 16)

    // 상태 아이콘: 대기(빈 원) · 진행(회전하는 반원) · 완료(체크 두 선분).
    const iy = boxTop + boxH / 2
    const irad = Math.min(9, boxH * 0.16)
    ctx.strokeStyle = state === 'done' ? palette.good : 'rgba(200,200,206,0.5)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(cx, iy, irad, 0, Math.PI * 2)
    ctx.stroke()
    if (state === 'active') {
      const spin = (ts / 500) % (Math.PI * 2)
      ctx.strokeStyle = '#f4f4f5'
      ctx.beginPath()
      ctx.arc(cx, iy, irad, spin, spin + Math.PI * 0.6)
      ctx.stroke()
    } else if (state === 'done') {
      ctx.strokeStyle = palette.good
      ctx.beginPath()
      ctx.moveTo(cx - irad * 0.5, iy)
      ctx.lineTo(cx - irad * 0.1, iy + irad * 0.4)
      ctx.lineTo(cx + irad * 0.55, iy - irad * 0.45)
      ctx.stroke()
    }

    // 소요 시간: 완료된 스테이지에만 표시.
    const timeA = clamp01((p - (PIPE_START + i * STEP + STEP * 0.5)) / 0.1)
    if (timeA > 0.01) {
      ctx.save()
      ctx.globalAlpha = boxA * timeA
      ctx.font = `600 9px ${FONT}`
      ctx.fillStyle = 'rgba(154,154,162,0.9)'
      ctx.fillText(stage.time, cx, boxTop + boxH - 12)
      ctx.restore()
    }
    ctx.restore()
  })

  // 배포 성공 배지: 마지막 스테이지 통과 직후.
  const successA = clamp01((p - (PIPE_END + 0.02)) / 0.1)
  if (successA > 0.01) {
    const bw = Math.min(w * 0.42, 260)
    const bh = h * 0.14
    const bx = w / 2 - bw / 2
    const by = h * 0.72
    const pulse = 0.85 + 0.15 * Math.sin(ts / 300)
    ctx.save()
    ctx.globalAlpha = successA
    const g = ctx.createRadialGradient(w / 2, by + bh / 2, 0, w / 2, by + bh / 2, bw * 0.6 * pulse)
    g.addColorStop(0, 'rgba(52,209,127,0.18)')
    g.addColorStop(1, 'rgba(52,209,127,0)')
    ctx.fillStyle = g
    ctx.fillRect(bx - 30, by - 20, bw + 60, bh + 40)
    ctx.fillStyle = 'rgba(52,209,127,0.1)'
    roundRect(ctx, bx, by, bw, bh, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(52,209,127,0.5)'
    ctx.lineWidth = 1.2
    roundRect(ctx, bx, by, bw, bh, 10)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = palette.good
    ctx.font = `800 13px ${FONT}`
    ctx.fillText('배포 성공 · main', w / 2, by + bh / 2)
    ctx.restore()
  }

  const stageIdx = p < PIPE_START + STEP ? 0 : p < PIPE_END ? 1 : 2
  drawTopLabel(ctx, 'CI/CD 파이프라인', '커밋에서 배포까지')
  drawCaption(ctx, h, CAPS[stageIdx])
}
