// PPT Visual Maker 스튜디오 페이지.
// 좌 라이브러리 / 중앙 캔버스 스테이지 / 우 내보내기 패널 3분할 구성.
// 자체 풀스크린 다크 셸이라 앱 공용 레이아웃으로 감싸지 않는다.

import { useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { vizRegistry } from './vizRegistry'
import { useVizPlayer } from './useVizPlayer'
import { exportViz, downloadBlob, UnsupportedExportError } from './vizExport'
import { getStageColor, setStageColor } from './viz/common'
import type { VizDef } from './types'
import './PptVisualMaker.css'

const REQUIRED_IDS = new Set(['rag', 'match'])

const RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
} as const

type ResolutionKey = keyof typeof RESOLUTIONS

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function categoryLabel(category: VizDef['category']): string {
  return category === 'feature' ? '기능 시각화' : '기술 시각화'
}

// 라이브러리 카드용 결정론적 썸네일 바 패턴(장식용, 캔버스 렌더와 무관).
function thumbBars(seed: number): { left: number; top: number; width: number }[] {
  const bars = []
  for (let i = 0; i < 5; i++) {
    const left = 6 + ((seed * 7 + i * 11) % 40)
    const top = 6 + ((seed * 5 + i * 13) % 22)
    const width = 5 + (i % 3) * 4
    bars.push({ left, top, width })
  }
  return bars
}

export default function PptVisualMaker() {
  const [selectedId, setSelectedId] = useState(vizRegistry[0].id)
  const [speed, setSpeed] = useState(1)
  const [resolution, setResolution] = useState<ResolutionKey>('1080p')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportDone, setExportDone] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState(getStageColor())

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const selectedViz = useMemo(
    () => vizRegistry.find((v) => v.id === selectedId) ?? vizRegistry[0],
    [selectedId],
  )

  const { playing, toggle, seek, progress } = useVizPlayer(canvasRef, selectedViz, { speed })

  function handleBgColorChange(hex: string) {
    setStageColor(hex)
    setBgColor(hex)
    // 정지 상태에서는 rAF 루프가 돌지 않으므로 현재 프레임을 즉시 다시 그려
    // 배경색 변경이 바로 캔버스에 반영되게 한다(재생 중이면 다음 프레임에 자동 반영).
    seek(progress)
  }

  const featureVizzes = useMemo(() => vizRegistry.filter((v) => v.category === 'feature'), [])
  const techVizzes = useMemo(() => vizRegistry.filter((v) => v.category === 'tech'), [])

  const totalSec = selectedViz.period / 1000
  const currentSec = progress * totalSec

  function handleSelect(id: string) {
    setSelectedId(id)
    setExportDone(null)
    setExportError(null)
  }

  function handleTrackClick(e: ReactMouseEvent<HTMLDivElement>) {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(ratio)
  }

  async function handleExport() {
    setExporting(true)
    setExportProgress(0)
    setExportError(null)
    setExportDone(null)
    try {
      const { width, height } = RESOLUTIONS[resolution]
      const result = await exportViz(selectedViz, { speed, fps: 60, width, height }, (ratio) => {
        setExportProgress(ratio)
      })
      downloadBlob(result.blob, result.filename)
      setExportDone(result.filename)
    } catch (err) {
      if (err instanceof UnsupportedExportError) {
        setExportError(err.message)
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        setExportError(`내보내기에 실패했다. ${msg}`)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="pv-app">
      <header className="pv-topbar">
        <div className="pv-brand">
          <span className="pv-dot" />
          Career Fit
          <span className="pv-path">
            / <b>PPT Visual Maker</b>
          </span>
        </div>
      </header>

      <div className="pv-body">
        <aside className="pv-rail pv-rail-left">
          <VizLibraryGroup
            label={categoryLabel('feature')}
            items={featureVizzes}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <VizLibraryGroup
            label={categoryLabel('tech')}
            items={techVizzes}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </aside>

        <main className="pv-center">
          <div className="pv-stagewrap">
            <div className="pv-stage">
              <canvas ref={canvasRef} className="pv-canvas" />
            </div>
          </div>

          <div className="pv-transport">
            <button
              className="pv-play"
              onClick={toggle}
              aria-label={playing ? '일시정지' : '재생'}
              type="button"
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="2" y="1" width="3.4" height="12" />
                  <rect x="8.6" y="1" width="3.4" height="12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 1l10 6-10 6z" />
                </svg>
              )}
            </button>
            <div className="pv-timeline">
              <div className="pv-track" ref={trackRef} onClick={handleTrackClick}>
                <div className="pv-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <div className="pv-tcode">
              <span>{formatTime(currentSec)}</span> / {formatTime(totalSec)}
              <span className="pv-speedbadge">{speed.toFixed(2).replace(/\.?0+$/, '') || '1'}x</span>
            </div>
          </div>
        </main>

        <aside className="pv-rail pv-rail-right">
          <div className="pv-rhead">내보내기 설정</div>
          <div className="pv-grp">
            <div className="pv-field-row">
              <label>
                재생 배속 <span className="pv-val">{speed.toFixed(2).replace(/\.?0+$/, '')}x</span>
              </label>
              <input
                className="pv-rng"
                type="range"
                min={0.5}
                max={3}
                step={0.25}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
              <div className="pv-ticks">
                <span>0.5x</span>
                <span>1x</span>
                <span>2x</span>
                <span>3x</span>
              </div>
            </div>
            <div className="pv-field-row">
              <label>프레임레이트</label>
              <div className="pv-lockrow">
                <span className="pv-lk">60 fps 고정</span>
                <span className="pv-lv">잠김</span>
              </div>
            </div>
            <div className="pv-field-row">
              <label>해상도</label>
              <div className="pv-pillset">
                {(Object.keys(RESOLUTIONS) as ResolutionKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={resolution === key ? 'pv-on' : ''}
                    onClick={() => setResolution(key)}
                  >
                    {key === '4k' ? '4K' : key}
                  </button>
                ))}
              </div>
            </div>
            <div className="pv-field-row">
              <label>배경색</label>
              <div className="pv-bgrow">
                <input
                  className="pv-sw"
                  type="color"
                  value={bgColor}
                  onChange={(e) => handleBgColorChange(e.target.value)}
                  aria-label="배경색 선택"
                />
                <span className="pv-hx">
                  {bgColor.toUpperCase()}
                  <small>디자인 시스템 스테이지</small>
                </span>
              </div>
            </div>
          </div>
          <div className="pv-export">
            <button className="pv-exbtn" onClick={handleExport} disabled={exporting} type="button">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <path
                  d="M7.5 1v8m0 0L4.5 6m3 3l3-3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M2 11v2h11v-2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
              {exporting ? '내보내는 중' : 'MP4로 내보내기'}
            </button>
            {exporting && (
              <div className="pv-render">
                <div className="pv-rl">
                  <span className="pv-s">렌더링 · H.264 · 60fps</span>
                  <span className="pv-p">{Math.round(exportProgress * 100)}%</span>
                </div>
                <div className="pv-bar">
                  <i style={{ width: `${Math.max(2, exportProgress * 100)}%` }} />
                </div>
                <div className="pv-est">
                  {RESOLUTIONS[resolution].width}x{RESOLUTIONS[resolution].height} · {speed}x 배속
                </div>
              </div>
            )}
            {exportError && (
              <div className="pv-alert pv-alert-error" role="alert">
                {exportError}
              </div>
            )}
            {exportDone && !exporting && (
              <div className="pv-alert pv-alert-ok" role="status">
                내보내기 완료: {exportDone}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

interface VizLibraryGroupProps {
  label: string
  items: VizDef[]
  selectedId: string
  onSelect: (id: string) => void
}

function VizLibraryGroup({ label, items, selectedId, onSelect }: VizLibraryGroupProps) {
  return (
    <>
      <div className="pv-libhead">
        {label} <span className="pv-n">{items.length}</span>
      </div>
      <div className="pv-lib">
        {items.map((v, i) => (
          <div
            key={v.id}
            className={`pv-vcard${selectedId === v.id ? ' pv-on' : ''}`}
            onClick={() => onSelect(v.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(v.id)
            }}
          >
            <div className="pv-thumb">
              {thumbBars(i + v.id.length).map((bar, j) => (
                <i
                  key={j}
                  style={{ left: bar.left, top: bar.top, width: bar.width, height: 5, opacity: 0.25 + (j % 3) * 0.22 }}
                />
              ))}
            </div>
            <div className="pv-vmeta">
              <div className="pv-t">{v.title}</div>
              <div className="pv-d">{v.subtitle}</div>
            </div>
            {REQUIRED_IDS.has(v.id) && <span className="pv-star">필수</span>}
          </div>
        ))}
      </div>
    </>
  )
}
