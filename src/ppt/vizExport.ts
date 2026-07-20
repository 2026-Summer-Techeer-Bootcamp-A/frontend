// PPT Visual Maker mp4 내보내기.
// WebCodecs VideoEncoder + mp4-muxer로 60fps H.264 mp4를 결정론적 프레임 렌더로 인코딩한다.
// ffmpeg.wasm은 쓰지 않는다. WebCodecs 미지원 브라우저에서는 명확한 에러를 던진다(조용한 실패 금지).

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { ExportOptions, VizDef } from './types'
import { drawBackground, setChromeVisible } from './viz/common'

export class UnsupportedExportError extends Error {}

export interface ExportResult {
  blob: Blob
  filename: string
}

function isWebCodecsSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.VideoEncoder !== 'undefined' && typeof window.VideoFrame !== 'undefined'
}

function resolutionLabel(height: number): string {
  if (height <= 720) return '720p'
  if (height <= 1080) return '1080p'
  return '4k'
}

export async function exportViz(
  viz: VizDef,
  opts: ExportOptions,
  onProgress?: (ratio: number) => void,
): Promise<ExportResult> {
  if (!isWebCodecsSupported()) {
    throw new UnsupportedExportError('이 브라우저는 mp4 내보내기를 지원하지 않는다. 크롬을 사용한다.')
  }

  const durationMs = viz.period / opts.speed
  const totalFrames = Math.max(1, Math.round((opts.fps * durationMs) / 1000))

  const canvas = document.createElement('canvas')
  canvas.width = opts.width
  canvas.height = opts.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('오프스크린 canvas 2d 컨텍스트를 생성할 수 없다.')
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: opts.width,
      height: opts.height,
      frameRate: opts.fps,
    },
    fastStart: 'in-memory',
  })

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      // VideoEncoder의 비동기 인코딩 에러를 조용히 삼키지 않는다.
      throw e
    },
  })

  // mp4에는 좌상단 제목 라벨/좌하단 캡션을 굽지 않는다. 다음 프리뷰 재생에는
  // 영향이 없도록 함수가 끝나면(성공이든 실패든) 반드시 원상 복구한다.
  setChromeVisible(false)
  try {
    try {
      encoder.configure({
        codec: 'avc1.640028',
        width: opts.width,
        height: opts.height,
        framerate: opts.fps,
        bitrate: 8_000_000,
      })
    } catch {
      throw new UnsupportedExportError('이 브라우저의 H.264 인코더 설정을 지원하지 않는다. 크롬을 사용한다.')
    }

    const frameDurationUs = 1_000_000 / opts.fps

    for (let i = 0; i < totalFrames; i++) {
      const p = i / totalFrames
      const ts = p * viz.period
      drawBackground(ctx, opts.width, opts.height)
      viz.render(ctx, opts.width, opts.height, p, ts)

      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(i * frameDurationUs),
        duration: Math.round(frameDurationUs),
      })
      encoder.encode(frame, { keyFrame: i % 60 === 0 })
      frame.close()

      onProgress?.(i / totalFrames)

      // 인코더 큐가 과도하게 쌓이면 이벤트 루프에 양보해 메모리 사용을 억제한다.
      if (encoder.encodeQueueSize > 8) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
    }

    await encoder.flush()
    encoder.close()
    muxer.finalize()

    const target = muxer.target as ArrayBufferTarget
    const blob = new Blob([target.buffer], { type: 'video/mp4' })
    onProgress?.(1)

    const resLabel = resolutionLabel(opts.height)
    const filename = `${viz.id}-${opts.speed}x-${resLabel}.mp4`
    return { blob, filename }
  } finally {
    setChromeVisible(true)
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
