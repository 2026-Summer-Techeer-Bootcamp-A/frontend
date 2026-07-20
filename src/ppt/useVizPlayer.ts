// PPT Visual Maker 스테이지용 rAF 플레이어 훅.
// 매 프레임 p(0..1 정규화 시간)를 진행시키고 viz.render(ctx,w,h,p,ts)를 호출한다.
// DPR 스케일 처리, 배속, seek, prefers-reduced-motion, 언마운트 정리까지 담당한다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { VizDef } from './types'

interface UseVizPlayerOptions {
  speed: number
}

interface UseVizPlayerResult {
  playing: boolean
  toggle: () => void
  seek: (p: number) => void
  progress: number
}

// URL의 t(0..1) 쿼리 파라미터를 읽는다. 검증용 프레임 고정 전용이며 프로덕션
// 흐름에는 영향이 없다(파라미터가 없으면 null을 반환하고 기존 rAF 루프가 그대로 돈다).
function readFrameParam(): number | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('t')
  if (raw === null) return null
  const val = Number(raw)
  if (Number.isNaN(val)) return null
  return Math.max(0, Math.min(1, val))
}

export function useVizPlayer(
  canvasRef: RefObject<HTMLCanvasElement>,
  viz: VizDef,
  options: UseVizPlayerOptions,
): UseVizPlayerResult {
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const frameParam = useMemo(readFrameParam, [])

  const pRef = useRef(0)
  const playingRef = useRef(playing)
  const speedRef = useRef(options.speed)
  const vizRef = useRef(viz)

  playingRef.current = playing
  speedRef.current = options.speed
  vizRef.current = viz

  const drawFrame = useCallback(
    (p: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const cssW = rect.width || canvas.clientWidth || 1
      const cssH = rect.height || canvas.clientHeight || 1
      const targetW = Math.max(1, Math.round(cssW * dpr))
      const targetH = Math.max(1, Math.round(cssH * dpr))
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const ts = p * vizRef.current.period
      vizRef.current.render(ctx, cssW, cssH, p, ts)
    },
    [canvasRef],
  )

  // 선택된 시각화가 바뀌면 처음부터 다시 시작한다(단, t 고정 시에는 그 프레임으로).
  useEffect(() => {
    const start = frameParam ?? 0
    pRef.current = start
    setProgress(start)
    drawFrame(start)
  }, [viz, drawFrame, frameParam])

  useEffect(() => {
    // t가 지정된 경우 검증용으로 해당 프레임 1회만 그리고 rAF 루프를 돌리지 않는다.
    if (frameParam !== null) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      pRef.current = 0.9
      setProgress(0.9)
      drawFrame(0.9)
      return
    }

    let raf = 0
    let lastTs: number | null = null

    function step(ts: number) {
      if (lastTs === null) lastTs = ts
      const dt = ts - lastTs
      lastTs = ts
      if (playingRef.current) {
        const period = vizRef.current.period
        let p = pRef.current + (dt * speedRef.current) / period
        p = p % 1
        if (p < 0) p += 1
        pRef.current = p
        setProgress(p)
        drawFrame(p)
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [drawFrame, frameParam])

  const toggle = useCallback(() => {
    setPlaying((prev) => !prev)
  }, [])

  const seek = useCallback(
    (p: number) => {
      const clamped = Math.max(0, Math.min(1, p))
      pRef.current = clamped
      setProgress(clamped)
      drawFrame(clamped)
    },
    [drawFrame],
  )

  return { playing, toggle, seek, progress }
}
