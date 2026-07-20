import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Award, Check, Lock, Star, Target } from 'lucide-react'
import { loadRoadmapTrack, ROADMAP_TRACK_LIST, DEFAULT_ROADMAP_TRACK_ID } from '../../data/roadmaps/registry'
import type { RoadmapNode } from '../../data/roadmaps/types'
import { buildRoadmapOverlay } from './roadmapOverlay'
import './roadmapView.css'

// 로드맵 백본 뷰 — roadmap.sh 스타일로 섹션을 중앙 척추의 마일스톤으로, 그 섹션에
// 속한 노드들을 마일스톤 아래 가지로 펼친다. 이 백본(RoadmapTrack)은 사람이
// 큐레이션한 정본 JSON이라 로그인·북마크·목표 선택 여부와 무관하게 항상 전부
// 그려진다 — ownedSkills/targetSkills 등은 그 위에 얹는 오버레이(색·배지)일 뿐,
// 백본 자체의 존재 여부를 결정하지 않는다(이게 게스트에서 빈 화면이 뜨던 예전
// WorkflowMap의 문제를 푸는 핵심 설계 결정이다).
//
// 엣지(화살표)를 그리는 workflowLayout.ts의 결정적 좌표 계산과 달리, 이 뷰는
// roadmap.sh처럼 섹션 마일스톤 -> 점선 커넥터 -> 가지 노드만 있고 노드 사이 개별
// 화살표는 없다. 그래서 DOM 측정도, 외부 레이아웃 엔진도 필요 없는 순수 CSS
// flex/grid 레이아웃으로 충분하다 — 카드 높이가 내용에 따라 자유롭게 늘어나도(노트가
// 길어도) 깨지지 않는다는 게 WorkflowStages의 픽셀 추정 방식보다 이 트리에 더 잘
// 맞는다.
const TYPE_LABEL: Record<RoadmapNode['type'], string> = { skill: '기술', concept: '개념', cert: '자격증' }
const MARKER_LABEL: Record<RoadmapNode['marker'], string> = { recommended: '추천', alternative: '대안', optional: '선택' }

const PAN_DRAG_THRESHOLD = 4
function usePanScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number; dragging: boolean } | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  const onMouseDown = (e: ReactMouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select, [role="button"]')) return
    const el = ref.current
    if (!el) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, dragging: false }
  }
  const onMouseMove = (e: ReactMouseEvent) => {
    const state = dragRef.current
    const el = ref.current
    if (!state || !el) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    if (!state.dragging) {
      if (Math.hypot(dx, dy) < PAN_DRAG_THRESHOLD) return
      state.dragging = true
      setIsPanning(true)
    }
    el.scrollLeft = state.scrollLeft - dx
    el.scrollTop = state.scrollTop - dy
  }
  const endPan = () => {
    dragRef.current = null
    setIsPanning(false)
  }

  return { ref, isPanning, onMouseDown, onMouseMove, onMouseUp: endPan, onMouseLeave: endPan }
}

export function RoadmapView({
  ownedSkills,
  ownedCerts,
  targetSkills = [],
  targetConcepts = [],
  height,
  trackId,
}: {
  ownedSkills: string[]
  ownedCerts: string[]
  targetSkills?: string[]
  targetConcepts?: string[]
  height: number
  trackId?: string
}) {
  const [activeTrackId, setActiveTrackId] = useState(trackId ?? DEFAULT_ROADMAP_TRACK_ID)
  const track = useMemo(() => loadRoadmapTrack(activeTrackId), [activeTrackId])
  const overlay = useMemo(
    () => buildRoadmapOverlay(track, ownedSkills, ownedCerts, targetSkills, targetConcepts),
    [track, ownedSkills, ownedCerts, targetSkills, targetConcepts],
  )
  const pan = usePanScroll<HTMLDivElement>()
  const usingGuestFallback = ownedSkills.length === 0

  const nodesBySection = useMemo(() => {
    const map = new Map<string, RoadmapNode[]>()
    track.nodes.forEach((n) => {
      if (!map.has(n.section)) map.set(n.section, [])
      map.get(n.section)!.push(n)
    })
    map.forEach((list) => list.sort((a, b) => a.order - b.order))
    return map
  }, [track])

  const sortedSections = useMemo(() => [...track.sections].sort((a, b) => a.order - b.order), [track])

  return (
    <div className="rmv-root">
      {ROADMAP_TRACK_LIST.length > 1 && (
        <div className="rmv-tracks" role="tablist" aria-label="로드맵 직군 선택">
          {ROADMAP_TRACK_LIST.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === activeTrackId}
              className={`rmv-tracks__btn${t.id === activeTrackId ? ' is-active' : ''}`}
              onClick={() => setActiveTrackId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="rmv-progress">
        <div className="rmv-progress__head">
          <span className="rmv-progress__label">{track.label} 로드맵 진척</span>
          <span className="rmv-progress__count">{overlay.progress.owned}/{overlay.progress.total}</span>
        </div>
        <div className="rmv-progress__bar">
          <div className="rmv-progress__fill" style={{ width: `${overlay.progress.pct}%` }} />
        </div>
        {usingGuestFallback && (
          <span className="rmv-progress__guest">이력서를 등록하지 않아 예시 보유 기술 기준으로 보여주고 있어요</span>
        )}
      </div>

      <div
        ref={pan.ref}
        className={`rmv-canvas${pan.isPanning ? ' is-panning' : ''}`}
        style={{ height }}
        onMouseDown={pan.onMouseDown}
        onMouseMove={pan.onMouseMove}
        onMouseUp={pan.onMouseUp}
        onMouseLeave={pan.onMouseLeave}
      >
        <div className="rmv-spine">
          {sortedSections.map((section) => {
            const nodes = nodesBySection.get(section.id) ?? []
            const progress = overlay.sectionProgress.get(section.id)
            return (
              <div key={section.id} className="rmv-section">
                <div className={`rmv-milestone${progress?.achieved ? ' is-achieved' : ''}`}>
                  <span className="rmv-milestone__index">{section.order}</span>
                  <span className="rmv-milestone__title">{section.title}</span>
                  {progress && <span className="rmv-milestone__count">{progress.owned}/{progress.total}</span>}
                  <Star className="rmv-milestone__star" size={13} fill={progress?.achieved ? '#1f9d57' : 'none'} />
                </div>
                <div className="rmv-branches">
                  {nodes.map((node) => {
                    const status = overlay.statusById.get(node.id) ?? 'locked'
                    const highlighted = overlay.highlightedIds.has(node.id)
                    return (
                      <div key={node.id} className="rmv-branch">
                        <div
                          className={`rmv-node rmv-type--${node.type} rmv-marker--${node.marker} rmv-status--${status}${highlighted ? ' rmv-highlighted' : ''}`}
                          title={node.note}
                        >
                          <div className="rmv-node__head">
                            <span className="rmv-node__label">{node.label}</span>
                            {status === 'owned' && <Check className="rmv-node__statusicon" size={12} />}
                            {status === 'locked' && <Lock className="rmv-node__statusicon" size={11} />}
                          </div>
                          <div className="rmv-node__meta">
                            <span className={`rmv-node__typebadge rmv-type--${node.type}`}>
                              {node.type === 'cert' ? <Award size={9} /> : null}
                              {TYPE_LABEL[node.type]}
                            </span>
                            {node.marker !== 'recommended' && (
                              <span className="rmv-node__markerbadge">{MARKER_LABEL[node.marker]}</span>
                            )}
                            {highlighted && (
                              <span className="rmv-node__targetbadge"><Target size={9} />목표</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
