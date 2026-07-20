import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Award, Check, Lock, Plus, Star, Target, X } from 'lucide-react'
import { loadRoadmapTrack, ROADMAP_TRACK_LIST, DEFAULT_ROADMAP_TRACK_ID } from '../../data/roadmaps/registry'
import type { RoadmapNode } from '../../data/roadmaps/types'
import { buildRoadmapOverlay, TIER_LABEL, TIER_ORDER, type DifficultyTier, type NodeStatus } from './roadmapOverlay'
import { dashboardApi } from '../api'
import type { RoadmapNodeContentResponse } from '../api'
import { getAuthToken } from '../authStore'
import { SegmentedControl } from '../kit'
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

// 메달리온 상태별 접근성 라벨. 이제 좌측 컬러 바 대신 원형 메달리온(색+글리프)으로
// 상태를 표현하는데, 이 시각 정보를 스크린 리더에도 그대로 전달하려고 aria-label에
// 덧붙인다. milestone(마일스톤/도전과제)은 owned를 대체하는 특별 상태라 따로 둔다.
const STATUS_ARIA_LABEL: Record<NodeStatus | 'milestone', string> = {
  owned: '보유함',
  unlockable: '해금 가능',
  locked: '잠김',
  milestone: '핵심 업적 달성',
}

// 난이도 티어 색 — 근본 팔레트(near-black + 그린 #1f9d57)는 그대로 두고, 난이도순
// 뷰에서만 메달리온의 그라데이션/링 색을 이 팔레트로 은은하게 갈아 끼운다(카드
// 테두리나 좌측 바가 아니라 메달리온 내부 색 하나만 바뀌므로 상태 링(box-shadow)과
// 겹쳐도 서로 덮어쓰지 않는다). 입문은 기존 그린 그대로, 고급으로 갈수록 붉은
// 계열로 옮겨간다.
const TIER_ACCENT: Record<DifficultyTier, { light: string; solid: string; ring: string; glow: string }> = {
  intro: { light: '#3fc47e', solid: '#178a49', ring: 'rgba(31, 157, 87, 0.14)', glow: 'rgba(31, 157, 87, 0.3)' },
  basic: { light: '#8fbf5e', solid: '#5c8a37', ring: 'rgba(92, 138, 55, 0.14)', glow: 'rgba(92, 138, 55, 0.3)' },
  intermediate: { light: '#dba646', solid: '#b9791f', ring: 'rgba(185, 121, 31, 0.14)', glow: 'rgba(185, 121, 31, 0.3)' },
  advanced: { light: '#d1705a', solid: '#b3492f', ring: 'rgba(179, 73, 47, 0.14)', glow: 'rgba(179, 73, 47, 0.3)' },
}

type RoadmapViewMode = 'recommended' | 'difficulty'

// 노드 상세 도크 — roadmap.sh가 노드 클릭 시 자료를 펼치는 UX를 따라 한다. 콘텐츠는
// RAG 엔드포인트(dashboardApi.roadmapNodeContent)에서 받아오되, 클릭 즉시는 그 노드의
// 정적 note로 채운 폴백을 먼저 보여주고 응답이 오면 교체한다 — 요청이 느리거나
// 실패해도(엔드포인트 미배선 포함) 화면은 항상 뭔가를 보여주고 절대 크래시하지
// 않는다(콘솔에만 폴백 사유를 남긴다).
function buildFallbackNodeContent(node: RoadmapNode): RoadmapNodeContentResponse {
  return { why: node.note, summary: '', resources: [], project: '', citations: [] }
}

type DockState = {
  node: RoadmapNode
  status: NodeStatus
  content: RoadmapNodeContentResponse
  loading: boolean
}

// 학습함 체크 — 트랙/세션을 넘나들며 남는 소소한 진행 표시라 localStorage에 직접
// 둔다(다른 스토어 파일을 새로 만들 범위가 아니라 이 파일 안에 인라인).
const STUDIED_STORAGE_KEY = 'techeer_roadmap_studied_nodes'

function readStudiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STUDIED_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeStudiedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STUDIED_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // 프라이빗 모드 등으로 저장이 막혀도 학습함 표시는 부가 기능이라 조용히 넘어간다.
  }
}

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

  // 뷰 모드 — 추천순(기본, 섹션 마일스톤)과 난이도순(prereqDepth 티어 마일스톤).
  // 백본 데이터와 노드 콘텐츠는 완전히 같고, 이 상태는 오직 "노드를 어떤 마일스톤
  // 아래로 묶어 어떤 순서로 늘어놓을지"만 바꾼다.
  const [viewMode, setViewMode] = useState<RoadmapViewMode>('recommended')

  const nodesByTier = useMemo(() => {
    const map = new Map<DifficultyTier, RoadmapNode[]>()
    TIER_ORDER.forEach((t) => map.set(t, []))
    track.nodes.forEach((node) => {
      const tier = overlay.difficultyById.get(node.id)?.tier ?? 'intro'
      map.get(tier)!.push(node)
    })
    map.forEach((list) => list.sort((a, b) => {
      const da = overlay.difficultyById.get(a.id)?.depth ?? 0
      const db = overlay.difficultyById.get(b.id)?.depth ?? 0
      if (da !== db) return da - db
      return a.order - b.order
    }))
    return map
  }, [track, overlay])

  const tierProgress = useMemo(() => {
    const map = new Map<DifficultyTier, { owned: number; total: number }>()
    TIER_ORDER.forEach((t) => map.set(t, { owned: 0, total: 0 }))
    track.nodes.forEach((node) => {
      const tier = overlay.difficultyById.get(node.id)?.tier ?? 'intro'
      const entry = map.get(tier)!
      entry.total += 1
      if (overlay.statusById.get(node.id) === 'owned') entry.owned += 1
    })
    return map
  }, [track, overlay])

  // 노드 상세 도크 상태 — 클릭한 노드, 그 노드의 콘텐츠(처음엔 정적 note 폴백, 응답
  // 도착 시 교체), 로딩 여부. fetchSeqRef로 노드를 빠르게 갈아타도 낡은 응답이 최신
  // 도크를 덮어쓰지 않게 막는다.
  const [dock, setDock] = useState<DockState | null>(null)
  const fetchSeqRef = useRef(0)
  const isMountedRef = useRef(true)
  useEffect(() => {
    // main.tsx가 React.StrictMode라 dev에서 이 effect가 mount -> cleanup -> mount로
    // 두 번 실행된다. 이펙트 본문에서 true로 되돌리지 않으면 첫 cleanup이 내린 false가
    // 영원히 남아 이후 모든 openNodeDock의 .then/.catch가 isMountedRef 가드에 막혀
    // setDock(loading:false)를 못 적용한다 — 폴백 콘텐츠는 뜨는데 로딩 표시만 안
    // 걷히던 버그의 원인이었다.
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const [studiedIds, setStudiedIds] = useState<Set<string>>(() => readStudiedIds())
  const toggleStudied = (id: string) => {
    setStudiedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writeStudiedIds(next)
      return next
    })
  }

  const closeDock = () => setDock(null)

  const openNodeDock = (node: RoadmapNode, status: NodeStatus) => {
    const seq = ++fetchSeqRef.current
    setDock({ node, status, content: buildFallbackNodeContent(node), loading: true })

    // 이 요청이 여전히 "최신"인지(컴포넌트가 살아있고, 그 사이 다른 노드를 클릭해
    // fetchSeqRef가 앞서가지 않았는지) — 성공/실패 두 경로와 finally가 모두 이 한
    // 기준으로만 판단해 판정이 갈리지 않게 한다.
    const isStale = () => !isMountedRef.current || fetchSeqRef.current !== seq

    dashboardApi
      .roadmapNodeContent(
        { node_id: node.id, node_label: node.label, node_type: node.type, section: node.section },
        getAuthToken(),
      )
      .then((res) => {
        if (isStale()) return
        setDock({ node, status, content: res, loading: false })
      })
      .catch((err) => {
        // 엔드포인트가 아직 없거나 요청이 404/에러로 실패해도 데모가 끊기면 안 된다 —
        // 이미 화면에 떠 있는 정적 note 폴백 콘텐츠는 그대로 둔다. 로딩 표시를 내리는
        // 건 아래 finally가 성공/실패 구분 없이 맡는다(여기서 따로 내리면 실패 경로를
        // 빠뜨리기 쉽다).
        console.info('[roadmap] 노드 콘텐츠 요청 실패, 정적 note로 대신 보여줘요', err)
      })
      .finally(() => {
        // 성공/실패 어느 쪽이든 이 요청이 최신이면 로딩 표시는 반드시 걷는다 — 실패
        // 경로에서만 빠뜨리면 폴백은 뜬 채로 ".rmv-dock__loading"이 영원히 안 사라지는
        // 버그가 된다.
        if (isStale()) return
        setDock((prev) => (prev && prev.node.id === node.id ? { ...prev, loading: false } : prev))
      })
  }

  const handleNodeActivate = (node: RoadmapNode, status: NodeStatus) => {
    if (dock?.node.id === node.id) {
      closeDock()
      return
    }
    openNodeDock(node, status)
  }

  const handleNodeKeyDown = (node: RoadmapNode, status: NodeStatus) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleNodeActivate(node, status)
    }
  }

  // 노드 카드 — 추천순/난이도순 두 뷰가 완전히 같은 카드를 재사용한다(다른 건 어떤
  // 마일스톤 아래 어떤 순서로 놓이는지, 그리고 난이도 뱃지 노출 여부뿐). 메달리온이
  // 상태(보유/해금가능/잠김/마일스톤)를 원형 색+글리프로 표현하고, 타입은 라벨 아래
  // 뮤트 텍스트 태그로만 조용히 드러낸다 — 좌측 컬러 바는 완전히 없앴다.
  const renderNodeCard = (node: RoadmapNode, showDifficulty: boolean) => {
    const status = overlay.statusById.get(node.id) ?? 'locked'
    const highlighted = overlay.highlightedIds.has(node.id)
    const isMilestone = overlay.milestoneEligibleIds.has(node.id) && status === 'owned'
    const medallionState: NodeStatus | 'milestone' = isMilestone ? 'milestone' : status
    const difficulty = overlay.difficultyById.get(node.id)

    const tierVars = showDifficulty && difficulty && (medallionState === 'owned' || medallionState === 'unlockable')
      ? ({
          '--tier-light': TIER_ACCENT[difficulty.tier].light,
          '--tier-solid': TIER_ACCENT[difficulty.tier].solid,
          '--tier-ring': TIER_ACCENT[difficulty.tier].ring,
          '--tier-glow': TIER_ACCENT[difficulty.tier].glow,
        } as CSSProperties)
      : undefined

    return (
      <div key={node.id} className="rmv-branch">
        <div
          className={`rmv-node rmv-marker--${node.marker} rmv-status--${status}${isMilestone ? ' rmv-node--milestone' : ''}${highlighted ? ' rmv-highlighted' : ''}${dock?.node.id === node.id ? ' rmv-node--active' : ''}`}
          title={node.note}
          role="button"
          tabIndex={0}
          aria-pressed={dock?.node.id === node.id}
          aria-label={`${node.label}, ${STATUS_ARIA_LABEL[medallionState]}`}
          onClick={() => handleNodeActivate(node, status)}
          onKeyDown={handleNodeKeyDown(node, status)}
        >
          <div className={`rmv-medallion rmv-medallion--${medallionState}`} style={tierVars} aria-hidden="true">
            {medallionState === 'milestone' && <Star size={14} fill="#fff" />}
            {medallionState === 'owned' && <Check size={14} />}
            {medallionState === 'unlockable' && <Plus size={14} />}
            {medallionState === 'locked' && <Lock size={13} />}
          </div>
          <div className="rmv-node__body">
            <span className="rmv-node__label">{node.label}</span>
            <div className="rmv-node__meta">
              <span className={`rmv-node__typetag rmv-node__typetag--${node.type}`}>
                {node.type === 'cert' ? <Award size={9} /> : null}
                {TYPE_LABEL[node.type]}
              </span>
              {node.marker !== 'recommended' && (
                <span className="rmv-node__markerbadge">{MARKER_LABEL[node.marker]}</span>
              )}
              {highlighted && (
                <span className="rmv-node__targetbadge"><Target size={9} />목표</span>
              )}
              {showDifficulty && difficulty && (
                <>
                  <span className={`rmv-node__tierbadge rmv-node__tierbadge--${difficulty.tier}`}>{TIER_LABEL[difficulty.tier]}</span>
                  <span className="rmv-node__prereqbadge">선행 {difficulty.prereqCount}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleTrackChange = (id: string) => {
    setActiveTrackId(id)
    closeDock()
  }

  useEffect(() => {
    if (!dock) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDock() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dock])

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
              onClick={() => handleTrackChange(t.id)}
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

      <div className="rmv-viewswitch">
        <SegmentedControl
          size="sm"
          value={viewMode}
          onChange={(v) => setViewMode(v as RoadmapViewMode)}
          options={[{ key: 'recommended', label: '추천순' }, { key: 'difficulty', label: '난이도순' }]}
        />
      </div>

      <div className="rmv-canvasrow" style={{ height }}>
      <div
        ref={pan.ref}
        className={`rmv-canvas${pan.isPanning ? ' is-panning' : ''}${dock ? ' rmv-canvas--withdock' : ''}`}
        onMouseDown={pan.onMouseDown}
        onMouseMove={pan.onMouseMove}
        onMouseUp={pan.onMouseUp}
        onMouseLeave={pan.onMouseLeave}
      >
        {viewMode === 'recommended' ? (
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
                    {nodes.map((node) => renderNodeCard(node, false))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rmv-spine">
            {TIER_ORDER.map((tier, i) => {
              const nodes = nodesByTier.get(tier) ?? []
              const progress = tierProgress.get(tier)
              const achieved = !!progress && progress.total > 0 && progress.owned === progress.total
              return (
                <div key={tier} className="rmv-section">
                  <div className={`rmv-milestone rmv-tier-milestone--${tier}${achieved ? ' is-achieved' : ''}`}>
                    <span className="rmv-milestone__index">{i + 1}</span>
                    <span className="rmv-milestone__title">{TIER_LABEL[tier]}</span>
                    {progress && <span className="rmv-milestone__count">{progress.owned}/{progress.total}</span>}
                    <Star className="rmv-milestone__star" size={13} fill={achieved ? '#1f9d57' : 'none'} />
                  </div>
                  <div className="rmv-branches">
                    {nodes.map((node) => renderNodeCard(node, true))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {dock && (
        <div className="rmv-dock" role="dialog" aria-label={`${dock.node.label} 학습 콘텐츠`}>
          <div className="rmv-dock__head">
            <div className="rmv-dock__headtext">
              <span className={`rmv-node__typebadge rmv-type--${dock.node.type}`}>
                {dock.node.type === 'cert' ? <Award size={9} /> : null}
                {TYPE_LABEL[dock.node.type]}
              </span>
              <h3 className="rmv-dock__title">{dock.node.label}</h3>
            </div>
            <button type="button" className="rmv-dock__close" onClick={closeDock} aria-label="도크 닫기">
              <X size={15} />
            </button>
          </div>

          <label className="rmv-dock__studied">
            <input
              type="checkbox"
              checked={studiedIds.has(dock.node.id)}
              onChange={() => toggleStudied(dock.node.id)}
            />
            학습함
          </label>

          {dock.loading && <div className="rmv-dock__loading">학습 콘텐츠를 불러오는 중이에요…</div>}

          <div className="rmv-dock__body">
            {dock.content.why && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">왜 배우나</h4>
                <p className="rmv-dock__text">{dock.content.why}</p>
              </section>
            )}
            {dock.content.summary && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">개념 요약</h4>
                <p className="rmv-dock__text">{dock.content.summary}</p>
              </section>
            )}
            {dock.content.resources.length > 0 && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">리소스</h4>
                <div className="rmv-dock__chips">
                  {dock.content.resources.map((r, i) => (
                    <span key={`${r.label}-${i}`} className="rmv-dock__chip rmv-dock__chip--resource">
                      {r.label}
                      <i className="rmv-dock__chipkind">{r.kind}</i>
                    </span>
                  ))}
                </div>
              </section>
            )}
            {dock.content.project && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">미니 프로젝트</h4>
                <p className="rmv-dock__text">{dock.content.project}</p>
              </section>
            )}
            {dock.content.citations.length > 0 && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">근거</h4>
                <div className="rmv-dock__chips">
                  {dock.content.citations.map((c, i) => (
                    <span key={i} className="rmv-dock__chip rmv-dock__chip--citation">{c}</span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
