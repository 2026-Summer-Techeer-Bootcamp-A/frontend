import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Award, Check, Flag, Lock, Plus, Star, Target, X } from 'lucide-react'
import { loadRoadmapTrack, ROADMAP_TRACK_LIST, DEFAULT_ROADMAP_TRACK_ID } from '../../data/roadmaps/registry'
import type { RoadmapNode } from '../../data/roadmaps/types'
import {
  buildRoadmapOverlay,
  computeNodeDifficulty,
  mergeBackendDifficulty,
  TIER_LABEL,
  TIER_ORDER,
  type DifficultyTier,
  type NodeDifficulty,
  type NodeStatus,
} from './roadmapOverlay'
import { dashboardApi } from '../api'
import type { RoadmapNodeContentResource, RoadmapNodeContentResponse } from '../api'
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
// 덧붙인다. milestone(주황 깃발)은 "보유"가 아니라 "아직 안 했지만 해야 할 핵심
// 목표"를 뜻하는 상태라 owned와 별개로 둔다 — 그래서 잠김/해금가능 여부도 함께
// 알려줘야 의미가 온전해(getMedallionAriaLabel이 상태를 덧붙인다).
const STATUS_ARIA_LABEL: Record<NodeStatus, string> = {
  owned: '보유함',
  unlockable: '해금 가능',
  locked: '잠김',
}
function getMedallionAriaLabel(status: NodeStatus, isMilestoneGoal: boolean): string {
  if (!isMilestoneGoal) return STATUS_ARIA_LABEL[status]
  return status === 'locked' ? '해야 할 핵심 목표, 잠김' : '해야 할 핵심 목표, 해금 가능'
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
// 정적 note + 타입/섹션 기반으로 채운 폴백을 먼저 보여주고 응답이 오면 교체한다 —
// 요청이 느리거나 실패해도(엔드포인트 미배선 포함, 게스트 프리뷰 포함) 도크가 빈
// 한 줄이 아니라 항상 꽉 찬 내용을 보여주고 절대 크래시하지 않는다(콘솔에만 폴백
// 사유를 남긴다).
//
// 지어낸 과장된 수치나 실제로 확인 안 된 사례는 절대 넣지 않는다 — note와 타입/
// 섹션이라는 이미 정본 데이터에 있는 사실만 조합해 문장을 채운다. 노드마다 label/
// note/section이 다르므로 같은 템플릿이어도 결과 문장은 노드마다 실제로 달라진다.
const TYPE_WHY_TEMPLATE: Record<RoadmapNode['type'], (label: string, sectionTitle: string) => string> = {
  skill: (label, sectionTitle) =>
    `${label} 항목은 ${sectionTitle} 단계에서 실무 코드에 바로 적용하는 기술이다. 채용 공고에서 요구 기술로 자주 명시되는 항목이라, 이 로드맵의 다음 단계로 넘어가기 전에 직접 코드를 짜보며 손에 익혀두는 편이 좋다.`,
  concept: (label, sectionTitle) =>
    `${label} 항목은 ${sectionTitle} 단계에서 짚고 넘어가야 하는 개념이다. 이력서 스킬 항목으로 바로 드러나지는 않지만, 이 단계 이후 실무 기술을 다룰 때 전제로 요구되는 배경 지식이라 개념 자체를 건너뛰면 다음 항목의 이해가 얕아지기 쉽다.`,
  cert: (label, sectionTitle) =>
    `${label} 항목은 ${sectionTitle} 단계에서 실력을 객관적으로 증명하는 자격증이다. 시험 범위가 실무 지식과 겹치는 부분이 많아 이론 정리와 기출 문제 풀이를 함께 진행하면 준비 기간을 줄일 수 있다.`,
}

const TYPE_SUMMARY_TEMPLATE: Record<RoadmapNode['type'], (label: string) => string> = {
  skill: (label) =>
    `${label}의 핵심은 문법 자체보다 어떤 문제를 해결하려고 나온 기술인지를 아는 것이다. 왜 필요한지, 어떤 상황에서 쓰는지를 먼저 이해하면 이후 실습이 훨씬 수월해진다.`,
  concept: (label) =>
    `${label}은 특정 기술이 아니라 여러 기술이 공유하는 사고방식이다. 정의를 외우기보다 이 개념이 등장한 배경과 해결하려는 문제를 이해하는 쪽이 오래 남는다.`,
  cert: (label) =>
    `${label} 시험은 정해진 범위의 지식을 정해진 기준으로 검증한다. 실무 경험이 있어도 시험에서만 다루는 세부 규정이나 절차는 별도로 정리해야 한다.`,
}

const TYPE_RESOURCES_TEMPLATE: Record<RoadmapNode['type'], (label: string) => RoadmapNodeContentResource[]> = {
  skill: (label) => [
    { label: `${label} 공식 문서`, kind: '문서' },
    { label: `${label} 핵심 개념 정리`, kind: '요약' },
    { label: `${label} 실습 튜토리얼`, kind: '튜토리얼' },
  ],
  concept: (label) => [
    { label: `${label} 개념 정리`, kind: '요약' },
    { label: `${label} 도입 사례 분석`, kind: '사례' },
  ],
  cert: (label) => [
    { label: `${label} 시험 가이드`, kind: '가이드' },
    { label: `${label} 기출 문제`, kind: '기출' },
  ],
}

const TYPE_PROJECT_TEMPLATE: Record<RoadmapNode['type'], (label: string, sectionTitle: string) => string> = {
  skill: (label, sectionTitle) => `${sectionTitle} 범위 안에서 ${label}만 사용해 동작하는 작은 예제를 직접 만들어본다.`,
  concept: (label) => `${label} 개념이 실제로 적용된 사례를 하나 골라 어떤 문제를 어떻게 풀었는지 정리해본다.`,
  cert: (label) => `${label} 기출 문제를 일정 분량 풀어보고 자주 틀리는 영역을 따로 정리해본다.`,
}

function buildFallbackNodeContent(node: RoadmapNode, sectionTitle: string): RoadmapNodeContentResponse {
  const note = node.note?.trim()
  const why = [note, TYPE_WHY_TEMPLATE[node.type](node.label, sectionTitle)].filter(Boolean).join(' ')
  return {
    why,
    summary: TYPE_SUMMARY_TEMPLATE[node.type](node.label),
    resources: TYPE_RESOURCES_TEMPLATE[node.type](node.label),
    project: TYPE_PROJECT_TEMPLATE[node.type](node.label, sectionTitle),
    citations: [],
  }
}

// 잠긴 노드 카드에 보여줄 힌트 문구 — 라벨이 많으면 앞 2개만 보이고 나머지는
// 개수로만 뭉뚱그린다(카드 폭이 좁아 다 나열하면 줄바꿈이 지저분해진다). "선행 OO"
// 형태가 이해하기 어렵다는 피드백으로 "OO 달성 필요"로 바꿨다.
const PREREQ_HINT_MAX_LABELS = 2
function formatUnmetPrereqHint(labels: string[]): string {
  if (labels.length <= PREREQ_HINT_MAX_LABELS) return `${labels.join(', ')} 달성 필요`
  const shown = labels.slice(0, PREREQ_HINT_MAX_LABELS).join(', ')
  return `${shown} 외 ${labels.length - PREREQ_HINT_MAX_LABELS}개 달성 필요`
}

type DockState = {
  node: RoadmapNode
  status: NodeStatus
  content: RoadmapNodeContentResponse
  loading: boolean
  // 그 노드의 난이도(백엔드 객관 보정이 도착했으면 그 값, 아니면 선행 깊이 폴백).
  // basis가 있을 때만(난이도순 뷰에서만) 도크에 근거 문장을 보여준다.
  difficulty?: NodeDifficulty
  // 이 노드의 직접 선행 전부(주황 선이 이 노드로 들어오는 쪽) — 도크 "선행" 섹션이
  // met 여부와 무관하게 전부 칩으로 나열한다(met는 칩 스타일만 구분한다).
  prereqs: { id: string; label: string; met: boolean }[]
  // 이 노드를 직접 선행으로 삼는 노드들(주황 선이 이 노드에서 나가는 쪽) — 도크
  // "다음 단계" 섹션이 칩으로 나열한다.
  dependents: { id: string; label: string }[]
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

  // 로드맵 난이도 객관 보정(F-3) — 난이도순 뷰의 티어를 우리 주관(선행 깊이)이 아니라
  // 백엔드가 공고 평균 요구 경력 + 수요로 매긴 티어로 대체한다. 로드맵이 로드되거나
  // 트랙을 바꿀 때마다 트랙 전체 노드를 한 번에 배치로 보낸다 — 난이도순 뷰로 전환할
  // 때 다시 요청하지 않아도 되게 미리 받아 둔다. 게스트(토큰 없음)면 애초에 호출하지
  // 않고 선행 깊이 티어를 그대로 쓴다. 요청 실패/엔드포인트 미배선일 때도 마찬가지로
  // 콘솔에만 로그를 남기고 backendDifficulty는 null로 남아 화면은 항상 선행 깊이
  // 폴백(overlay.difficultyById)으로 정상 표시된다 — 절대 크래시하지 않는다.
  const [backendDifficulty, setBackendDifficulty] = useState<Map<string, NodeDifficulty> | null>(null)
  const difficultySeqRef = useRef(0)
  useEffect(() => {
    let cancelled = false
    setBackendDifficulty(null)
    const token = getAuthToken()
    if (!token) {
      console.info('[roadmap] 게스트 상태라 난이도 객관 보정을 요청하지 않고 선행 깊이 티어로 보여줘요')
      return
    }
    const seq = ++difficultySeqRef.current
    // depth는 이력서 보유 스킬과 무관한 순수 구조 값이라(computeNodeDifficulty는
    // ownedSkills를 보지 않는다) overlay가 아니라 track.nodes에서 직접 계산한다 —
    // 그래야 이 effect가 [track]에만 반응하고, targetSkills/ownedSkills가 바뀔 때마다
    // 불필요하게 재요청을 보내지 않는다.
    const depthDifficulty = computeNodeDifficulty(track.nodes)
    const nodes = track.nodes.map((n) => ({
      node_id: n.id,
      label: n.label,
      type: n.type,
      prereq_depth: depthDifficulty.get(n.id)?.depth ?? 0,
    }))
    dashboardApi
      .roadmapDifficulty({ nodes }, token)
      .then((res) => {
        if (cancelled || difficultySeqRef.current !== seq) return
        setBackendDifficulty(mergeBackendDifficulty(depthDifficulty, res.items))
      })
      .catch((err) => {
        console.info('[roadmap] 난이도 객관 보정 요청 실패, 선행 깊이 기반 티어로 대신 보여줘요', err)
      })
    return () => { cancelled = true }
  }, [track])

  // 난이도순 뷰/뱃지/도크가 실제로 참조하는 맵 — 백엔드 응답이 도착했으면 그 값,
  // 아니면(로딩 중/게스트/실패) overlay의 선행 깊이 폴백을 그대로 쓴다.
  const effectiveDifficultyById = useMemo(
    () => backendDifficulty ?? overlay.difficultyById,
    [backendDifficulty, overlay],
  )

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

  // 섹션 id -> 제목. 도크 폴백 콘텐츠(buildFallbackNodeContent)가 "OO 단계"라는
  // 문맥을 문장에 넣을 때 쓴다.
  const sectionTitleById = useMemo(() => new Map(track.sections.map((s) => [s.id, s.title])), [track])

  // 노드 간 연결 관계 인덱스 — 도크의 "선행"/"다음 단계" 섹션이 그리는 것이 바로
  // 캔버스의 주황 선(prereq 엣지)이 잇는 것들이다. labelById는 id -> 라벨(선행 칩을
  // 만들 때), dependentsById는 "이 노드를 직접 선행으로 삼는 노드들"(엣지가 이
  // 노드에서 나가는 쪽, 즉 "다음 단계")을 모은다.
  const nodeIndex = useMemo(() => {
    const labelById = new Map(track.nodes.map((n) => [n.id, n.label]))
    const dependentsById = new Map<string, { id: string; label: string }[]>()
    track.nodes.forEach((n) => {
      n.prereqs.forEach((prereqId) => {
        const list = dependentsById.get(prereqId) ?? []
        list.push({ id: n.id, label: n.label })
        dependentsById.set(prereqId, list)
      })
    })
    return { labelById, dependentsById }
  }, [track])

  // 뷰 모드 — 추천순(기본, 섹션 마일스톤)과 난이도순(prereqDepth 티어 마일스톤).
  // 백본 데이터와 노드 콘텐츠는 완전히 같고, 이 상태는 오직 "노드를 어떤 마일스톤
  // 아래로 묶어 어떤 순서로 늘어놓을지"만 바꾼다.
  const [viewMode, setViewMode] = useState<RoadmapViewMode>('recommended')

  const nodesByTier = useMemo(() => {
    const map = new Map<DifficultyTier, RoadmapNode[]>()
    TIER_ORDER.forEach((t) => map.set(t, []))
    track.nodes.forEach((node) => {
      const tier = effectiveDifficultyById.get(node.id)?.tier ?? 'intro'
      map.get(tier)!.push(node)
    })
    map.forEach((list) => list.sort((a, b) => {
      const da = effectiveDifficultyById.get(a.id)?.depth ?? 0
      const db = effectiveDifficultyById.get(b.id)?.depth ?? 0
      if (da !== db) return da - db
      return a.order - b.order
    }))
    return map
  }, [track, effectiveDifficultyById])

  const tierProgress = useMemo(() => {
    const map = new Map<DifficultyTier, { owned: number; total: number }>()
    TIER_ORDER.forEach((t) => map.set(t, { owned: 0, total: 0 }))
    track.nodes.forEach((node) => {
      const tier = effectiveDifficultyById.get(node.id)?.tier ?? 'intro'
      const entry = map.get(tier)!
      entry.total += 1
      if (overlay.statusById.get(node.id) === 'owned') entry.owned += 1
    })
    return map
  }, [track, overlay, effectiveDifficultyById])

  // 노드 상세 도크 상태 — 클릭한 노드와 그 노드의 콘텐츠(정적 note 폴백).
  // 백엔드 RAG 요청은 이제 하지 않으므로 로딩 상태가 없다.
  const [dock, setDock] = useState<DockState | null>(null)

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
    // 난이도(백엔드 객관 보정 또는 선행 깊이 폴백)를 도크에도 실어 basis 근거 문장을
    // 함께 보여준다 — effectiveDifficultyById는 이미 두 경우를 알아서 갈라 준다.
    const difficulty = effectiveDifficultyById.get(node.id)
    // 이 노드에 걸린 주황 선 관계 — 선행(들어오는 선)과 다음 단계(나가는 선)를
    // 도크에 그대로 실어 보낸다. nodeIndex는 [track]에만 반응하니 트랙을 바꾸지
    // 않는 한 재계산되지 않는다.
    const prereqs = node.prereqs.map((prereqId) => ({
      id: prereqId,
      label: nodeIndex.labelById.get(prereqId) ?? prereqId,
      met: overlay.statusById.get(prereqId) === 'owned',
    }))
    const dependents = nodeIndex.dependentsById.get(node.id) ?? []
    const sectionTitle = sectionTitleById.get(node.section) ?? node.section
    setDock({ node, status, content: buildFallbackNodeContent(node, sectionTitle), loading: false, difficulty, prereqs, dependents })
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
  // 상태(보유/해금가능/잠김/목표)를 원형 색+글리프로 표현하고, 타입은 라벨 아래
  // 뮤트 텍스트 태그로만 조용히 드러낸다 — 좌측 컬러 바는 완전히 없앴다.
  //
  // 우선순위: owned면 마일스톤 여부와 무관하게 항상 초록 체크다(보유는 보유).
  // 그다음 마일스톤 대상이면서 아직 미보유면(해금가능/잠김 둘 다) 주황 깃발로
  // "내가 해야 할 핵심 목표"를 표시한다 — 예전엔 owned 마일스톤에만 금색 별을
  // 얹었지만, 이미 보유한 걸 별로 강조하는 것보다 아직 안 한 핵심 목표를 짚어주는
  // 쪽이 실제로 다음에 뭘 해야 할지 알려준다는 사용자 피드백으로 바꿨다. 그 외
  // 비마일스톤 노드는 기존대로 해금가능=링+플러스, 잠김=자물쇠.
  const renderNodeCard = (node: RoadmapNode, showDifficulty: boolean) => {
    const status = overlay.statusById.get(node.id) ?? 'locked'
    const highlighted = overlay.highlightedIds.has(node.id)
    const isMilestoneGoal = overlay.milestoneEligibleIds.has(node.id) && status !== 'owned'
    const medallionState: NodeStatus | 'milestone' = isMilestoneGoal ? 'milestone' : status
    const difficulty = effectiveDifficultyById.get(node.id)
    // 잠긴 노드(마일스톤 목표든 아니든)에만 미충족 직접 선행 힌트를 보여준다 —
    // medallionState가 'milestone'으로 바뀌어도 실제 status는 그대로 'locked'라
    // 이 조건은 깃발 노드에도 정확히 걸린다.
    const unmetPrereqs = status === 'locked' ? overlay.unmetPrereqLabelsById.get(node.id) : undefined
    const prereqHint = unmetPrereqs && unmetPrereqs.length > 0 ? formatUnmetPrereqHint(unmetPrereqs) : undefined

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
          ref={(el) => {
            if (el) nodeRefs.current.set(node.id, el)
            else nodeRefs.current.delete(node.id)
          }}
          data-node-id={node.id}
          data-type={node.type}
          className={`rmv-node rmv-node--type-${node.type} rmv-marker--${node.marker} rmv-status--${status}${isMilestoneGoal ? ' rmv-node--milestone' : ''}${highlighted ? ' rmv-highlighted' : ''}${dock?.node.id === node.id ? ' rmv-node--active' : ''}${activeNodeId === node.id ? ' rmv-node--edgesource' : edgeLinkedNodeIds.has(node.id) ? ' rmv-node--edgelinked' : ''}`}
          title={node.note}
          role="button"
          tabIndex={0}
          aria-pressed={dock?.node.id === node.id}
          aria-label={`${node.label}, ${getMedallionAriaLabel(status, isMilestoneGoal)}`}
          onClick={() => handleNodeActivate(node, status)}
          onKeyDown={handleNodeKeyDown(node, status)}
          onMouseEnter={() => { if (!pan.isPanning) setActiveNodeId(node.id) }}
          onMouseLeave={() => setActiveNodeId((cur) => (cur === node.id ? null : cur))}
          onFocus={() => setActiveNodeId(node.id)}
          onBlur={() => setActiveNodeId((cur) => (cur === node.id ? null : cur))}
        >
          <div className={`rmv-medallion rmv-medallion--${medallionState}`} style={tierVars} aria-hidden="true">
            {medallionState === 'milestone' && <Flag size={11} fill="#fff" />}
            {medallionState === 'owned' && <Check size={12} />}
            {medallionState === 'unlockable' && <Plus size={12} />}
            {medallionState === 'locked' && <Lock size={11} />}
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
                  {/* 난이도 객관 근거(basis, "공고 평균 요구 경력 X년, 수요 N건")는
                      카드에 상시 노출하지 않고 이 뱃지의 title 툴팁으로만 옮겼다 —
                      호버해야만 보이는 출처 통계고, 카드 본문은 note(설명)가 대신
                      채운다. */}
                  <span
                    className={`rmv-node__tierbadge rmv-node__tierbadge--${difficulty.tier}`}
                    title={difficulty.basis}
                  >
                    {TIER_LABEL[difficulty.tier]}
                  </span>
                  <span className="rmv-node__prereqbadge">선행 {difficulty.prereqCount}</span>
                </>
              )}
            </div>
            {/* 노드 설명 — 출처 통계(basis) 대신 note 한 줄을 카드 본문에 콤팩트하게
                보여준다. 길어도 카드가 늘어나지 않도록 한 줄 말줄임(CSS)이고, note가
                없는 노드는 아무 것도 렌더하지 않는다. 추천순/난이도순 양쪽에 동일하게
                적용된다(showDifficulty와 무관). */}
            {node.note && <p className="rmv-node__note">{node.note}</p>}
            {/* 잠긴 노드가 왜 잠겼는지 — 직접 선행 중 미충족인 것들의 라벨을 담백하게
                한 줄로 보여준다. 자물쇠/깃발과 같은 회색 계열로 절제한다. */}
            {prereqHint && <p className="rmv-node__prereqhint">{prereqHint}</p>}
          </div>
        </div>
      </div>
    )
  }

  const handleTrackChange = (id: string) => {
    setActiveTrackId(id)
    closeDock()
  }

  // G: 부모(WorkflowMap)가 선택된 목표 공고들로 추론한 trackId를 내려주면, 그 값이
  // 바뀔 때마다 백본 트랙을 그 직군으로 전환한다 — 목표를 바꾸면 로드맵 전체 백본이
  // 그 직군으로 유동적으로 바뀌는 배선이다. activeTrackId를 의존성 배열에 일부러
  // 넣지 않는다 — 아래 rmv-tracks 탭으로 사용자가 다른 트랙을 수동으로 잠깐 둘러볼
  // 수도 있어야 하는데, activeTrackId까지 감시하면 탭을 누르는 순간 이 effect가
  // 다시 걸려 곧바로 trackId로 되돌려버려 탭이 무력화된다. 그래서 "목표(trackId
  // prop)가 실제로 바뀔 때만" 되돌리고, 그 사이 수동 선택은 그대로 존중한다 — 목표가
  // 트랙을 결정하되 탭으로 수동 전환도 가능하다는 절충이다.
  useEffect(() => {
    if (trackId != null && trackId !== activeTrackId) {
      setActiveTrackId(trackId)
      closeDock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])

  useEffect(() => {
    if (!dock) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDock() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dock])

  // 선행 관계 연결선 오버레이 — 노드 카드는 여전히 순수 CSS flex 레이아웃(섹션/티어
  // 마일스톤 아래 가지)으로 배치되지만, 그 카드들 사이의 prereq 관계는 CSS만으로
  // 그릴 수 없어 DOM 측정 기반 SVG 곡선을 그 위에 얹는다. graphRef가 곡선의 좌표
  // 기준(원점)이고, nodeRefs는 각 노드 카드 엘리먼트를 id로 찾기 위한 맵이다 —
  // getBoundingClientRect는 스크롤 여부와 무관하게 뷰포트 좌표를 주므로, 노드 rect와
  // graphRef rect를 같은 시점에 빼면 스크롤 위치와 무관한 콘텐츠 내부 상대 좌표가
  // 나온다(캔버스를 스크롤해도 둘 다 같은 양만큼 움직이므로 차이는 그대로다).
  //
  // 전체 엣지를 늘 그리면 51개 노드/53개 엣지에서도 캔버스가 산만해진다는 피드백을
  // 받아 온디맨드로 바꿨다 — 좌표 계산(recomputePrereqEdges)은 여전히 전체 엣지를
  // 한 번에 계산해 두고(레이아웃이 바뀔 때만 다시 재는 게 맞다), 실제로 SVG에
  // 그리는 건 activeNodeId(마우스 hover 또는 키보드 포커스 중인 노드)와 연결된
  // 엣지만 렌더 시점에 필터링한다. 그래서 기본 상태(activeNodeId === null)에는
  // 캔버스에 선이 하나도 없다.
  const graphRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [prereqEdges, setPrereqEdges] = useState<{ key: string; fromId: string; toId: string; d: string; toOwned: boolean }[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

  const recomputePrereqEdges = useCallback(() => {
    const wrapper = graphRef.current
    if (!wrapper) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const centers = new Map<string, { x: number; y: number }>()
    nodeRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect()
      centers.set(id, {
        x: rect.left + rect.width / 2 - wrapperRect.left,
        y: rect.top + rect.height / 2 - wrapperRect.top,
      })
    })
    const next: { key: string; fromId: string; toId: string; d: string; toOwned: boolean }[] = []
    track.nodes.forEach((node) => {
      const to = centers.get(node.id)
      if (!to) return
      node.prereqs.forEach((prereqId) => {
        const from = centers.get(prereqId)
        if (!from) return
        // 완만한 S자 곡선 — 세로로 흐르는 척추 레이아웃에 맞춰 y축 중간 지점에서
        // 꺾이도록 제어점을 둔다. 가로로도 살짝 벌어지게 해서 직선이 겹치는 걸 줄인다.
        const dx = to.x - from.x
        const dy = to.y - from.y
        const c1x = from.x + dx * 0.25
        const c1y = from.y + dy * 0.5
        const c2x = from.x + dx * 0.75
        const c2y = from.y + dy * 0.5
        next.push({
          key: `${prereqId}->${node.id}`,
          fromId: prereqId,
          toId: node.id,
          d: `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`,
          // 이미 보유 완료된 노드로 향하는 선은 더 옅게 — "이미 지나온 길"이라
          // 지금 당장 필요한 선행 관계보다 시선을 덜 끌어도 된다.
          toOwned: overlay.statusById.get(node.id) === 'owned',
        })
      })
    })
    setPrereqEdges(next)
  }, [track, overlay])

  // 지금 화면에 그릴 엣지 — activeNodeId가 없으면 아예 빈 배열(선 없음). 있으면 그
  // 노드가 양 끝 중 하나로 걸린 엣지만 남긴다(그 노드의 직접 선행 + 그 노드를
  // 선행으로 삼는 직접 의존 노드까지 함께 보여줘 "여기서 어디로 이어지는지"를
  // 양방향으로 알 수 있게 한다).
  const visiblePrereqEdges = useMemo(
    () => (activeNodeId ? prereqEdges.filter((e) => e.fromId === activeNodeId || e.toId === activeNodeId) : []),
    [prereqEdges, activeNodeId],
  )

  // 지금 보이는 엣지에 걸린 노드 id들 — 렌더 시 hover 대상 노드와 그와 연결된
  // 노드에 옅은 강조를 얹기 위한 참조용 집합이다(선 자체 외에 카드에도 살짝
  // 힌트를 줘서 "이게 지금 연결된 노드다"를 더 분명히 한다).
  const edgeLinkedNodeIds = useMemo(() => {
    const set = new Set<string>()
    visiblePrereqEdges.forEach((e) => { set.add(e.fromId); set.add(e.toId) })
    return set
  }, [visiblePrereqEdges])

  // 재계산 트리거 — 뷰 전환(추천순/난이도순), 트랙 변경(track이 바뀌면 recompute
  // 함수 자체가 새로 만들어짐), 도크 열림/닫힘(캔버스 폭이 줄어 카드가 다시
  // 줄바꿈된다), 난이도 객관 보정 도착(난이도순 뷰에서 노드가 티어 사이를 이동할 수
  // 있다) 이후 레이아웃이 확정된 다음 좌표를 다시 잰다.
  useLayoutEffect(() => {
    recomputePrereqEdges()
  }, [recomputePrereqEdges, viewMode, dock, effectiveDifficultyById])

  // 그 외(윈도우 리사이즈, 폰트 로드 등으로 카드 줄바꿈이 바뀌는 경우)를 잡기 위한
  // 안전망 — graphRef 엘리먼트 자체의 크기 변화를 관찰한다(도크로 캔버스 폭이 줄어도
  // graphRef가 그 안에서 폭 100%이므로 이 하나만 관찰하면 충분하다).
  useEffect(() => {
    const wrapper = graphRef.current
    if (!wrapper || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => recomputePrereqEdges())
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [recomputePrereqEdges])

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
        <div className="rmv-graph" ref={graphRef}>
        {/* 선행 관계 오버레이 — 온디맨드: 기본 상태엔 아무 선도 없다가, 노드에
            마우스를 올리거나(hover) 포커스하면 그 노드에 직접 연결된 엣지만 뜬다
            (visiblePrereqEdges가 activeNodeId 기준으로 이미 필터링해 둔다).
            pointer-events:none이라 클릭/포커스는 전부 노드 카드를 그대로 통과한다.
            DOM 순서상 rmv-spine보다 앞서 그려지고(z-index도 명시적으로 낮춰)
            카드/메달리온/텍스트를 절대 가리지 않는다. */}
        <svg className="rmv-graph__edges" aria-hidden="true">
          {visiblePrereqEdges.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              className={`rmv-graph__edge${edge.toOwned ? ' rmv-graph__edge--done' : ''}`}
            />
          ))}
        </svg>
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
                    <Star className="rmv-milestone__star" size={11} fill={progress?.achieved ? '#1f9d57' : 'none'} />
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
                    <Star className="rmv-milestone__star" size={11} fill={achieved ? '#1f9d57' : 'none'} />
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

          <div className="rmv-dock__body">
            {/* 선행/다음 단계 — 캔버스에서 hover해야만 보이는 주황 선(prereq 엣지)이
                잇는 관계를 도크를 열면 텍스트로도 볼 수 있게 한다. 선행은 이 노드로
                들어오는 선(node.prereqs) 전부를 met 여부와 무관하게 나열하고, 칩
                스타일만 충족 여부로 구분한다(met=완료 톤, 미충족=회색 톤 — 카드의
                "달성 필요" 힌트와 같은 톤). 다음 단계는 이 노드에서 나가는 선(이
                노드를 직접 선행으로 삼는 노드들)이다. */}
            {dock.prereqs.length > 0 && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">선행</h4>
                <div className="rmv-dock__chips">
                  {dock.prereqs.map((p) => (
                    <span
                      key={p.id}
                      className={`rmv-dock__chip ${p.met ? 'rmv-dock__chip--met' : 'rmv-dock__chip--prereq'}`}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {dock.dependents.length > 0 && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">다음 단계</h4>
                <div className="rmv-dock__chips">
                  {dock.dependents.map((d) => (
                    <span key={d.id} className="rmv-dock__chip rmv-dock__chip--next">{d.label}</span>
                  ))}
                </div>
              </section>
            )}
            {/* 난이도 근거 — 난이도순 뷰에서 이 노드가 백엔드 객관 보정 응답을 받았을
                때만(basis 존재) 보여준다. 추천순 뷰에서는 난이도 뱃지 자체가 안 보이니
                도크에서도 굳이 노출하지 않는다. */}
            {viewMode === 'difficulty' && dock.difficulty?.basis && (
              <section className="rmv-dock__section">
                <h4 className="rmv-dock__sectiontitle">{TIER_LABEL[dock.difficulty.tier]} 난이도 근거</h4>
                <p className="rmv-dock__text">{dock.difficulty.basis}</p>
              </section>
            )}
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
