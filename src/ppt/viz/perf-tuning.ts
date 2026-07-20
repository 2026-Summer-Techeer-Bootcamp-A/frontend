// 성능 튜닝: 헬스체크 응답 지연을 27.3초에서 6.1밀리초로 줄인 실측.
// 원인은 스레드풀 40에서 120으로 확장, 그리고 캐싱 도입. 게이지가 급락하는
// 애니메이션으로 튜닝 전/후 낙차를 보여준다.

import type { VizRender } from '../types'
import { FONT, clamp01, easeOut, lerp, roundRect, drawBackground, drawTopLabel, drawCaption, palette } from './common'

// 색 언어에 없는 "위험/느림" 상태 전용 색. 튜닝 전 숫자에만 쓴다.
const DANGER = '#ef4444'

const CAPS = ['요청이 스레드풀에 막혀 27.3초가 걸렸습니다', '풀을 키우고 캐싱을 넣어 6.1ms로 줄였습니다']

const NUM_IN_END = 0.16
const ARROW_START = 0.2
const ARROW_END = 0.36
const CAUSE_START = 0.38
const GAUGE_DROP_START = 0.5
const GAUGE_DROP_END = 0.84
const AFTER_NUM_START = 0.78

export const renderPerfTuning: VizRender = (ctx, w, h, p, _ts) => {
  drawBackground(ctx, w, h)

  const leftX = w * 0.24
  const rightX = w * 0.76
  const numY = h * 0.3

  // 좌: 튜닝 전.
  const beforeA = clamp01(p / NUM_IN_END)
  if (beforeA > 0.01) {
    ctx.save()
    ctx.globalAlpha = beforeA
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = DANGER
    ctx.font = `800 ${Math.round(h * 0.15)}px ${FONT}`
    ctx.fillText('27.3s', leftX, numY)
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.font = `600 10px ${FONT}`
    ctx.fillText('튜닝 전 · 헬스체크 응답', leftX, numY + h * 0.11)
    ctx.restore()
  }

  // 화살표(도형으로 직접 그린다, 텍스트 화살표 사용하지 않음).
  const arrowK = easeOut(clamp01((p - ARROW_START) / (ARROW_END - ARROW_START)))
  if (arrowK > 0.01) {
    const ax0 = leftX + w * 0.1
    const ax1 = rightX - w * 0.1
    const ay = numY
    const axEnd = lerp(ax0, ax1, arrowK)
    ctx.save()
    ctx.globalAlpha = Math.min(1, arrowK * 1.4)
    ctx.strokeStyle = 'rgba(230,230,234,0.5)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(ax0, ay)
    ctx.lineTo(axEnd, ay)
    ctx.stroke()
    if (arrowK > 0.9) {
      ctx.fillStyle = 'rgba(230,230,234,0.7)'
      ctx.beginPath()
      ctx.moveTo(ax1, ay)
      ctx.lineTo(ax1 - 8, ay - 5)
      ctx.lineTo(ax1 - 8, ay + 5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // 우: 튜닝 후. 게이지가 다 떨어진 직후 팝업.
  const afterA = clamp01((p - AFTER_NUM_START) / 0.14)
  if (afterA > 0.01) {
    const scale = 0.85 + 0.15 * easeOut(afterA)
    ctx.save()
    ctx.globalAlpha = afterA
    ctx.translate(rightX, numY)
    ctx.scale(scale, scale)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = palette.good
    ctx.font = `800 ${Math.round(h * 0.15)}px ${FONT}`
    ctx.fillText('6.1ms', 0, 0)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = afterA
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(154,154,162,0.9)'
    ctx.font = `600 10px ${FONT}`
    ctx.fillText('튜닝 후 · 헬스체크 응답', rightX, numY + h * 0.11)
    ctx.restore()
  }

  // 원인 라벨.
  const causeA = clamp01((p - CAUSE_START) / 0.1)
  if (causeA > 0.01) {
    ctx.save()
    ctx.globalAlpha = causeA
    ctx.font = `600 10.5px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(230,230,234,0.85)'
    ctx.fillText('스레드풀 40에서 120 · 캐싱 도입', w / 2, h * 0.53)
    ctx.restore()
  }

  // 게이지: 튜닝 전(꽉 찬 빨강)에서 튜닝 후(작은 초록 조각)로 급락.
  const gaugeX = w * 0.15
  const gaugeW = w * 0.7
  const gaugeY = h * 0.62
  const gaugeH = Math.max(16, h * 0.07)
  const dropK = easeOut(clamp01((p - GAUGE_DROP_START) / (GAUGE_DROP_END - GAUGE_DROP_START)))
  const fillRatio = lerp(0.97, 0.035, dropK)
  const fillCol = dropK < 0.5 ? DANGER : palette.good

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  roundRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, gaugeH / 2)
  ctx.fill()
  ctx.fillStyle = fillCol
  ctx.globalAlpha = 0.9
  roundRect(ctx, gaugeX, gaugeY, gaugeW * fillRatio, gaugeH, gaugeH / 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.font = `600 9px ${FONT}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(154,154,162,0.8)'
  ctx.textAlign = 'left'
  ctx.fillText('27.3s', gaugeX, gaugeY - 8)
  ctx.textAlign = 'right'
  ctx.fillText('6.1ms', gaugeX + gaugeW, gaugeY - 8)
  ctx.restore()

  const stageIdx = p < 0.5 ? 0 : 1
  drawTopLabel(ctx, '성능 튜닝', '27.3초에서 6.1밀리초로')
  drawCaption(ctx, h, CAPS[stageIdx])
}
