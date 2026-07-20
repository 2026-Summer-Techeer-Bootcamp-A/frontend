import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Award, Check, List, Maximize2, Milestone, Plus, Sparkles, WandSparkles, Workflow, X } from 'lucide-react'
import { SectionHeader, PreviewBadge } from '../kit'
import { AsOf } from '../charts'
import { useResumesState } from '../state'
import { getAuthToken } from '../authStore'
import { useBookmarks, loadBookmarkDetails, isBookmarked, toggleBookmark } from '../bookmarkStore'
import {
  useSelectedGoalIds, useGoalSelectionTouched, toggleGoalId,
  getSelectedGoalIds, isGoalSelectionTouched, setSelectedGoalIds,
} from '../goalSelectionStore'
import {
  dashboardApi, jobsApi, type Identity, type PostingCard, type PostingDetail, type ScopedRoadmapData,
  type RoadmapEnrichRequest, type RoadmapEnrichResponse, type RoadmapEnrichStep,
} from '../api'
import { useWidgetData } from '../useWidgetData'
import type { WidgetSize } from '../dashboardConfig'
import dreamCompanies from '../../data/dreamCompanies.json'
import { avatarColor, matchPctFor, yearBadgeFor, minPairwiseJaccard, type PostingDetailWithConcepts } from './workflowShared'
import { WorkflowList } from './WorkflowList'
import { WorkflowStages } from './WorkflowStages'
import { RoadmapView } from './RoadmapView'
import './workflowMap.css'

// 데모용: 클릭 한 번으로 유명 기업 공고를 북마크 + 목표 선택까지 채워 넣어 워크플로우
// 맵을 즉석에서 populate한다. 실제 검증된 기업명 목록은 dreamCompanies.json에 있다.
type DreamCompany = { name: string; tier: '대기업' | '중견' }
const DREAM_COMPANIES = dreamCompanies as DreamCompany[]
const RECOMMEND_TARGET_NEW = 8
const RECOMMEND_MAX_COMPANIES = 12
const RECOMMEND_CHUNK_SIZE = 4

// 7: DAG 캔버스 마우스 드래그 패닝 — 빈 캔버스 영역을 눌러 끌면 scrollLeft/scrollTop이
// 그만큼 옮겨진다. 버튼·링크 등 인터랙티브 요소 위에서 누르면 패닝을 시작하지 않아
// 원래 클릭이 그대로 동작한다. 아주 작은 움직임(4px 미만)은 드래그로 치지 않아
// 손떨림으로 인한 스크롤 튐 없이 일반 클릭/호버도 그대로 살아있다. 휠 스크롤은 이
// 훅과 무관하게 브라우저 기본 동작 그대로 유지된다.
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

// A-5: 목표 · 학습 워크플로우 맵 — 북마크한 공고 전부(암묵적 목표) 대신 목표 선택
// 패널에서 "목표로 삼을 것"을 직접 골라야 한다. 시안 1: 예전엔 이 선택 UI가 다이어그램
// 위에 겹치는 플로팅 드로어였는데, 위젯 헤더 바로 아래 상시 노출되는 앵커 바(선택된
// 목표를 매칭률+삭제(X) 칩으로)와 그 옆의 "목표 추가" 팝오버로 옮겼다 — 다이어그램은
// 그 아래 온전히 남고, 목표 추가/삭제는 팝오버 안에서 in place로 끝난다(시안 2: 위젯
// 밖 스크롤 위치를 흔들지 않기 위해 handleToggle이 스크롤 위치를 보존한다). 선택된
// 공고들의 요구 기술과 이력서 보유 기술을 스테이지 뷰(WorkflowStages)로 이어 "무엇을
// 어떤 순서로 배우면 좋은가"를 보여준다. 좌표 계산·엣지 라우팅 등은 전부
// WorkflowStages.tsx(+workflowLayout.ts)로 옮겼다 — 이 파일은 데이터 패칭, 목표 선택,
// 추천 공고 모달, 크게 보기 모달, 뷰(roadmap/stages/list) 토글 같은 위젯 셸만 담당한다.
// list 뷰(WorkflowList)와 workflowShared.ts의 공용 헬퍼(분류·아바타색·매치율 등)는
// 그대로 유지한다 — list 뷰가 여전히 그 헬퍼들을 쓴다.
//
// Phase 1(로드맵 백본 재설계): stages/list는 둘 다 북마크 -> 목표 선택이 있어야만
// 뭔가 그려지는 "장난감"이라, 게스트가 대시보드를 처음 열면 이 위젯이 통째로 빈
// 화면이었다. roadmap 뷰(RoadmapView.tsx)는 사람이 큐레이션한 정본 백본
// (src/data/roadmaps/backend.json)을 북마크·로그인 여부와 무관하게 항상 그리고,
// 목표 선택은 그 위에 강조만 얹는다 — 그래서 roadmap을 새 기본 뷰로 삼았다(view
// state 기본값, VIEW_STORAGE_KEY 파싱 참고). stages/list는 여전히 존재하고 여전히
// 북마크가 있어야 실제 내용이 나온다(canShowGraph 게이트는 그대로).

const MOCK_ROADMAP: ScopedRoadmapData = { start_matched: 0, total: 0, as_of: '', steps: [] }

// F-2: AI 보강 우선순위 라벨 — RoadmapEnrichStep.priority(high/medium/low)를 한글
// 배지 문구로 옮긴다.
const ENRICH_PRIORITY_LABEL: Record<RoadmapEnrichStep['priority'], string> = {
  high: '우선',
  medium: '보통',
  low: '여유',
}

// F-2: 폴백 보강 — 보강 엔드포인트가 아직 없거나(다른 에이전트가 백엔드에 붙이는 중)
// 요청이 실패해도 데모가 끊기면 안 된다는 요구로, 현재 화면에 이미 있는 목표/미보유
// 기술 정보만으로 결정적으로(랜덤 없이) 같은 형태의 응답을 만든다. 실제 LLM 판단이
// 아니라 "그럴듯한 우선순위 순서"일 뿐이라는 걸 명확히 하려고 굳이 화려한 문구를
// 쓰지 않는다 — 실패했다는 사실은 콘솔에만 남기고(WorkflowMap 본문), 화면은 정상
// 보강 뷰와 동일한 컴포넌트로 그대로 렌더된다.
function buildFallbackEnrichment(req: RoadmapEnrichRequest): RoadmapEnrichResponse {
  const company = req.goal_company || '목표 기업'
  const title = req.goal_title || '목표 공고'
  const steps: RoadmapEnrichStep[] = []
  let order = 1

  req.missing_skills.slice(0, 4).forEach((skill, i) => {
    steps.push({
      order: order++,
      label: skill,
      type: 'skill',
      effort: i === 0 ? '1~2주' : '2~4주',
      priority: i === 0 ? 'high' : i < 2 ? 'medium' : 'low',
      reason: `${company} ${title} 공고가 요구하는 기술이에요.`,
      project: `${skill}로 작은 프로젝트를 하나 만들어 포트폴리오에 올려보세요.`,
    })
  })
  req.concepts.slice(0, 2).forEach((concept) => {
    steps.push({
      order: order++,
      label: concept,
      type: 'concept',
      effort: '2~3주',
      priority: 'medium',
      reason: `${title} 직무에서 자주 요구하는 개념이에요.`,
      project: `${concept}을 정리한 글을 써보고 관련 사례를 하나 분석해보세요.`,
    })
  })
  req.certs.slice(0, 2).forEach((cert) => {
    steps.push({
      order: order++,
      label: cert,
      type: 'cert',
      effort: '4~8주',
      priority: 'low',
      reason: '보유하면 서류에서 눈에 띄는 자격증이에요.',
      project: `${cert} 취득 일정을 잡고 준비를 시작해보세요.`,
    })
  })
  if (req.career_required != null && req.career_required > 0 && (req.career_mine ?? 0) < req.career_required) {
    steps.push({
      order: order++,
      label: `경력 ${req.career_required}년+`,
      type: 'career',
      effort: '장기',
      priority: 'medium',
      reason: '이 목표가 요구하는 최소 경력이에요.',
      project: '관련 프로젝트·인턴 경험을 이력서에 꾸준히 쌓아가세요.',
    })
  }

  return {
    headline: `${company} ${title}까지 남은 것`,
    summary: steps.length > 0
      ? `${title} 목표까지 ${steps.length}가지를 준비하면 좋아요. 급한 순서로 정리했어요.`
      : '지금 보유한 기술만으로도 이 목표에 이미 잘 맞고 있어요.',
    quick_win: steps[0] ? `${steps[0].label}부터 시작해보세요` : '보유 기술을 하나씩 늘려가 보세요',
    steps,
  }
}

// 2단계: stages/list 보기 선택 저장 키 — dashboardConfig.ts의 STORAGE_KEY_DASHBOARD_CONFIG와
// 같은 techeer_ 프리픽스 네이밍을 따른다.
const VIEW_STORAGE_KEY = 'techeer_workflow_view'

// 4: 위젯 캔버스 영역의 고정 높이 — 목표 미선택/로딩/AI 보강 렌더 등 어떤 상태에서도
// 이 값을 그대로 쓴다(예전엔 각 상태 분기가 제각각 maxHeight를 걸어서, 내용이 짧은
// 상태로 전환될 때마다 위젯 전체 높이가 확 무너져 보였다). 값 자체는 기존에 stage/list
// pane이 쓰던 maxHeight(2x2=720, 그 외=260)를 그대로 가져온 것이라 화면상 크기는
// 바뀌지 않는다 — 내용이 이보다 크면 pane 안에서만 스크롤로 흡수한다.
function canvasHeightFor(size: WidgetSize): number {
  return size === '2x2' ? 720 : 260
}

export function WorkflowMap({ size = '2x2' }: { size?: WidgetSize }) {
  const canvasHeight = canvasHeightFor(size)
  // 7: 컴팩트 카드의 스테이지 뷰와 "크게 보기" 모달의 스테이지 뷰는 서로 다른 스크롤
  // 컨테이너라 패닝 상태(드래그 중 여부)도 각자 따로 갖는다.
  const stagePan = usePanScroll<HTMLDivElement>()
  const modalStagePan = usePanScroll<HTMLDivElement>()
  const { activeResume } = useResumesState()
  const ownedSkills = useMemo(() => activeResume?.skills ?? [], [activeResume])
  // E: 이력서 스킬의 category(백엔드가 이미 내려주는 값)를 classifySkill에 넘겨서
  // pearl 사전 폴백보다 우선 신뢰하게 한다.
  const ownedSkillCategories = useMemo(() => activeResume?.skillCategories ?? {}, [activeResume])
  const ownedSet = useMemo(() => new Set(ownedSkills), [ownedSkills])
  const bookmarkIds = useBookmarks()
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const identity: Identity | null = Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null

  // 왼쪽 패널은 북마크 전부를 후보로 보여줘야 하므로, 개수 상관없이 북마크가 하나라도
  // 있으면 상세를 불러온다(예전엔 DAG용으로 2개 이상일 때만 불러왔다).
  const [postings, setPostings] = useState<PostingDetail[]>([])
  const [postingsLoading, setPostingsLoading] = useState(false)
  useEffect(() => {
    if (bookmarkIds.length === 0) {
      setPostings([])
      return
    }
    let cancelled = false
    setPostingsLoading(true)
    loadBookmarkDetails(bookmarkIds, (id) => jobsApi.detail(id))
      .then((items) => { if (!cancelled) setPostings(items) })
      .finally(() => { if (!cancelled) setPostingsLoading(false) })
    return () => { cancelled = true }
  }, [bookmarkIds])

  // 왼쪽 패널 체크박스 행에 쓸 공고별 매칭률 — placeholders.tsx의 기존 패턴과 동일하게
  // matched_count가 있으면 그걸, 없으면 보유 기술 교집합 개수를 쓴다. 새 백엔드 호출 없음.
  const postingsWithMatch = useMemo(() => postings.map((p) => ({
    detail: p,
    matchPct: matchPctFor(p.skills, p.matched_count, ownedSet),
    yearBadge: yearBadgeFor(p.post_date),
  })), [postings, ownedSet])

  // 선택 상태 — 저장된 선택이 없으면(한 번도 안 건드렸으면) 북마크 전체가 암묵 기본값.
  // 북마크가 지워졌는데 선택 목록엔 남아 있을 수 있어(스토어는 그 경로를 모른다) 현재
  // 북마크 집합 기준으로 걸러(stale filtering) 읽는다.
  const bookmarkIdSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds])
  const storedSelected = useSelectedGoalIds()
  const touched = useGoalSelectionTouched()
  const selectedIds = useMemo(() => {
    const base = touched ? storedSelected : bookmarkIds
    return base.filter((id) => bookmarkIdSet.has(id))
  }, [touched, storedSelected, bookmarkIds, bookmarkIdSet])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  // 시안 2: 목표를 고르면 "선택 없음" 안내 -> 전체 다이어그램으로 위젯 높이가 크게
  // 바뀐다. 위젯 자체엔 overflow-anchor: none을 걸어 두지만(workflowMap.css), 그와
  // 별개로 위젯 밖(페이지) 스크롤 위치도 명시적으로 붙잡아 리플로우로 스크롤이 위로
  // 튀지 않게 한다 — 두 번의 requestAnimationFrame으로 리액트 렌더+브라우저 레이아웃이
  // 끝난 뒤에 원래 스크롤 위치를 복원한다.
  const handleToggle = (id: string) => {
    const scrollY = window.scrollY
    toggleGoalId(id, selectedIds)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - scrollY) > 0) window.scrollTo({ top: scrollY })
      })
    })
  }

  const selectedPostings = useMemo(
    () => postings.filter((p) => selectedIdSet.has(String(p.id))),
    [postings, selectedIdSet],
  )

  const postingIds = useMemo(() => selectedPostings.map((p) => Number(p.id)), [selectedPostings])
  const targetSet = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => p.skills.forEach((s) => { if (!ownedSet.has(s)) set.add(s) }))
    return set
  }, [selectedPostings, ownedSet])
  const targetSkillsArray = useMemo(() => [...targetSet], [targetSet])

  // 자격증 트랙 — roadmapScoped는 자격증을 모르므로(학습 순서·payoff 계산 대상이 아님)
  // 스킬 쪽과는 완전히 별도로, 보유/목표 두 집합만 뽑는다. 스테이지 뷰는 이 값들로 직접
  // 자격증 컬럼을 계산하고(relations.ts), list 뷰는 하단 칩 레인(certLane)으로 보여준다.
  const ownedCerts = useMemo(() => activeResume?.certs ?? [], [activeResume])
  const ownedCertSet = useMemo(() => new Set(ownedCerts), [ownedCerts])
  const targetCerts = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => p.certs.forEach((c) => { if (!ownedCertSet.has(c)) set.add(c) }))
    return [...set]
  }, [selectedPostings, ownedCertSet])
  const hasCertLane = ownedCerts.length > 0 || targetCerts.length > 0

  // F: 개념 트랙 — 공고 상세가 concepts를 옵셔널로 내려주면(다른 에이전트가 백엔드에 추가
  // 중이라 아직 없을 수 있다) 목표로 선택된 공고들의 개념명만 모은다. 이력서엔 "보유 개념"
  // 개념 자체가 없으므로(개념은 공고 요구사항일 뿐 사람이 소유하는 게 아니다) owned 집합은
  // 두지 않는다. 필드가 없는 공고는 조용히 건너뛴다(크래시 없음).
  const targetConcepts = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => {
      const list = (p as PostingDetailWithConcepts).concepts ?? []
      list.forEach((c) => { if (c?.name) set.add(c.name) })
    })
    return [...set]
  }, [selectedPostings])

  // F: 연차 게이트 — 선택된 목표 공고들 중 career_min이 있는 것들의 최댓값을 "이 목표
  // 묶음을 지원하려면 필요한 경력"으로 삼는다(여러 공고 중 가장 까다로운 기준). 하나도
  // career_min이 없으면(전부 신입·무관) 게이트 자체를 렌더하지 않는다.
  const careerGoalMin = useMemo(() => {
    const mins = selectedPostings.map((p) => p.career_min).filter((v): v is number => v != null && v > 0)
    return mins.length > 0 ? Math.max(...mins) : null
  }, [selectedPostings])
  const resumeCareerMax = activeResume?.careerMax ?? null

  const roadmapKey = identity && postingIds.length ? `${resumeId}:${postingIds.slice().sort().join(',')}` : 'idle'
  const roadmap = useWidgetData<ScopedRoadmapData>(
    identity && postingIds.length ? () => dashboardApi.roadmapScoped(identity, postingIds, 10) : null,
    MOCK_ROADMAP,
    roadmapKey,
  )

  const showNoBookmarks = bookmarkIds.length === 0
  const showNoSelection = !showNoBookmarks && selectedIds.length === 0
  const isLoading = !showNoBookmarks && !showNoSelection && (postingsLoading || (identity !== null && roadmap.loading))
  const canShowGraph = !showNoBookmarks && !showNoSelection && !isLoading

  // 시안 1: 목표 선택 패널은 이제 앵커 바 옆 "목표 추가" 팝오버다(다이어그램 위에
  // 겹치지 않는다). 기본은 닫힘이지만, 아직 목표를 하나도 안 골랐으면(showNoSelection)
  // 처음부터 열어서 "여기서 고르면 된다"는 게 바로 보이게 한다 — 이 초기값은 마운트
  // 시점 값만 쓰고, 그 뒤엔 토글 버튼/바깥 클릭/Escape로만 바뀐다.
  const [goalPanelOpen, setGoalPanelOpen] = useState(showNoSelection)
  const goalPopoverWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!goalPanelOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (goalPopoverWrapRef.current && !goalPopoverWrapRef.current.contains(e.target as Node)) {
        setGoalPanelOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setGoalPanelOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [goalPanelOpen])

  // 앵커 바에 상시 노출할 선택된 목표 칩 — selectedIds(스토어 순서)를 기준으로
  // postingsWithMatch에서 상세를 찾아 매칭 퍼센트까지 함께 붙인다. 아직 상세가
  // 로딩되지 않은 항목은(postingsLoading 동안) 조용히 걸러진다.
  const selectedGoalChips = useMemo(() => {
    const byId = new Map(postingsWithMatch.map((pw) => [String(pw.detail.id), pw]))
    return selectedIds.map((id) => byId.get(id)).filter((pw): pw is typeof postingsWithMatch[number] => !!pw)
  }, [selectedIds, postingsWithMatch])

  // 2단계: roadmap/stages/list 보기 전환 — dashboardConfig.ts와 같은 패턴(localStorage가
  // 정본)을 이 위젯 안에서 useState+localStorage로 간단히 구현한다(별도 스토어 모듈은
  // 과하다). 마운트 시 1회만 저장된 값을 읽고, 그 뒤엔 토글 버튼으로만 바뀐다.
  // Phase 1(로드맵 백본 재설계): roadmap이 새 기본값이다 — 사람이 큐레이션한 백엔드
  // 로드맵 백본은 북마크·목표 선택 없이도 항상 그려지므로, 예전처럼 "북마크부터
  // 채워야 뭔가 보이는" stages/list를 기본으로 둘 이유가 없다.
  const [view, setViewState] = useState<'roadmap' | 'stages' | 'list'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY)
      return saved === 'list' || saved === 'stages' ? saved : 'roadmap'
    } catch {
      return 'roadmap'
    }
  })
  // Phase 1: 로드맵 백본은 북마크·목표 선택과 무관하게 항상 그려지는 정본 데이터라,
  // "크게 보기"와 그 모달도 roadmap 뷰에서는 canShowGraph(북마크+목표 선택 필요)를
  // 기다리지 않는다 — stages/list는 여전히 canShowGraph가 있어야 실제 내용이 있다.
  const canExpand = view === 'roadmap' || canShowGraph
  const setView = (next: 'roadmap' | 'stages' | 'list') => {
    setViewState(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등)해도 뷰 전환 자체는 계속 동작해야 한다.
    }
  }

  // D: 선택된 공고가 2개 이상이고 서로 이질적이면(요구 스킬 집합 쌍별 Jaccard 유사도의
  // 최솟값 < 0.2) 스테이지 뷰 위에 "리스트 보기로 나눠 보라"는 안내 배너를 띄운다.
  // 배너는 캔버스 밖(위) HTML이라 스테이지 뷰 레이아웃엔 영향이 없다.
  const heterogeneousGoals = useMemo(() => {
    if (selectedPostings.length < 2) return false
    return minPairwiseJaccard(selectedPostings.map((p) => new Set(p.skills))) < 0.2
  }, [selectedPostings])

  // 데모용 추천 공고 가져오기 — 검증된 기업명으로 최대 12개 회사를 4개씩 묶어 조회해
  // 후보를 최대 8개 모은다. 예전엔 모으자마자 전부 자동으로 북마크했는데, 어떤 공고가
  // 담기는지 미리 보고 골라 담고 싶다는 요청으로 모달에 나열하고 개별 추가 버튼으로
  // 바꿨다. 개별 회사 조회 실패는 allSettled로 흡수해 하나 실패해도 전체가 안 멈춘다.
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendMessage, setRecommendMessage] = useState<string | null>(null)
  const [recommendCandidates, setRecommendCandidates] = useState<PostingCard[]>([])
  const [recommendModalOpen, setRecommendModalOpen] = useState(false)
  const [addedCandidateIds, setAddedCandidateIds] = useState<Set<string>>(new Set())

  const handleRecommendClick = async () => {
    if (recommendLoading) return
    setRecommendLoading(true)
    setRecommendMessage(null)
    const seenIds = new Set<string>()
    const collected: PostingCard[] = []
    try {
      const pool = DREAM_COMPANIES.slice(0, RECOMMEND_MAX_COMPANIES)
      for (let i = 0; i < pool.length && collected.length < RECOMMEND_TARGET_NEW; i += RECOMMEND_CHUNK_SIZE) {
        const chunk = pool.slice(i, i + RECOMMEND_CHUNK_SIZE)
        const results = await Promise.allSettled(
          chunk.map((company) => jobsApi.list({
            pool: 'domestic', company: company.name, sort: 'latest', page: 1, page_size: 2,
            include_recent_closed: true,
          }, token)),
        )
        for (const result of results) {
          if (collected.length >= RECOMMEND_TARGET_NEW) break
          if (result.status !== 'fulfilled') continue
          for (const item of result.value.items) {
            if (collected.length >= RECOMMEND_TARGET_NEW) break
            const id = String(item.id)
            if (seenIds.has(id) || isBookmarked(id)) continue
            seenIds.add(id)
            collected.push(item)
          }
        }
      }

      if (collected.length === 0) {
        setRecommendMessage('이미 추천드릴 새 공고가 없어요')
        window.setTimeout(() => setRecommendMessage(null), 4000)
      } else {
        setRecommendCandidates(collected)
        setAddedCandidateIds(new Set())
        setRecommendModalOpen(true)
      }
    } catch {
      setRecommendMessage('추천 공고를 가져오지 못했어요')
      window.setTimeout(() => setRecommendMessage(null), 4000)
    } finally {
      setRecommendLoading(false)
    }
  }

  const handleAddCandidate = (item: PostingCard) => {
    const id = String(item.id)
    if (addedCandidateIds.has(id)) return
    toggleBookmark(id)
    if (isGoalSelectionTouched()) {
      setSelectedGoalIds([...new Set([...getSelectedGoalIds(), id])])
    }
    setAddedCandidateIds((prev) => new Set(prev).add(id))
  }

  useEffect(() => {
    if (!recommendModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setRecommendModalOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [recommendModalOpen])

  // F-2: AI 로드맵 보강 — 별 아이콘 버튼(WandSparkles). 위 Sparkles 추천 버튼과 헷갈리지
  // 않도록 아이콘·툴팁을 다르게 둔다(추천 = 새 목표 후보 찾기, 보강 = 이미 고른 목표의
  // 학습 순서를 LLM이 다시 짜준다). 선택된 목표가 하나도 없으면 payload를 만들 수 없어
  // 버튼을 비활성화한다.
  const [enrichModalOpen, setEnrichModalOpen] = useState(false)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichData, setEnrichData] = useState<RoadmapEnrichResponse | null>(null)

  const handleEnrichClick = async () => {
    if (enrichLoading || selectedPostings.length === 0) return
    const primary = selectedPostings[0]
    const payload: RoadmapEnrichRequest = {
      goal_company: primary.company ?? '목표 기업',
      goal_title: primary.title,
      owned_skills: ownedSkills,
      missing_skills: targetSkillsArray,
      concepts: targetConcepts,
      certs: targetCerts,
      career_required: careerGoalMin,
      career_mine: resumeCareerMax,
    }
    setEnrichModalOpen(true)
    setEnrichLoading(true)
    setEnrichData(null)
    try {
      const res = await dashboardApi.roadmapEnrich(payload, token)
      setEnrichData(res)
    } catch (err) {
      // 12: 엔드포인트가 아직 없거나 요청이 실패해도 데모가 끊기면 안 된다 — 폴백으로
      // 조용히 이어간다(실패했다는 사실만 콘솔에 남긴다).
      console.info('[workflow] AI 보강 응답 실패, 준비된 폴백으로 대체해요', err)
      setEnrichData(buildFallbackEnrichment(payload))
    } finally {
      setEnrichLoading(false)
    }
  }

  useEffect(() => {
    if (!enrichModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setEnrichModalOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enrichModalOpen])

  // 2a: 크게 보기 — 더 넓은 영역에 스테이지 뷰(또는 리스트 뷰)를 그리는 오버레이 모달.
  // Escape·백드롭 클릭으로 닫는다.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  // 범례 — 보유(초록) · 목표(검정) · 경유/추론된 선행(회색) 3색과, 파란 실선 화살표
  // (먼저 배우기) · 점선 박스(같이 배우기) 두 표기를 설명한다.
  const legend = (
    <div className="wfm-legend">
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--owned" />보유</span>
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--target" />목표</span>
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--bridge" />경유 · 추론된 선행</span>
      <span className="wfm-legend__item">
        <svg width="18" height="8" viewBox="0 0 18 8" className="wfm-legend__arrow" aria-hidden="true">
          <line x1="0" y1="4" x2="12" y2="4" stroke="#3b82f6" strokeWidth="2" />
          <path d="M11 0.5 L17 4 L11 7.5 Z" fill="#3b82f6" />
        </svg>
        파란 실선 화살표 = 먼저 배우기
      </span>
      <span className="wfm-legend__item">
        <i className="wfm-legend__box" aria-hidden="true" />
        점선 박스 = 같이 배우기
      </span>
      {/* F: 4타입 노드(스킬/자격증/개념/연차)는 좌측 테두리 색 3그룹으로만 구분한다 —
          범례에도 같은 3색을 그대로 노출해 카드 배열이 무슨 뜻인지 바로 읽히게 한다. */}
      <span className="wfm-legend__item"><i className="wfm-legend__bar" style={{ background: '#1f9d57' }} />기술</span>
      <span className="wfm-legend__item"><i className="wfm-legend__bar" style={{ background: '#8a6fc4' }} />자격증</span>
      <span className="wfm-legend__item"><i className="wfm-legend__bar" style={{ background: '#b8892b' }} />개념 · 연차</span>
    </div>
  )

  // 자격증 레인 — 학습 순서가 없는 정보라 메인 그래프에 억지로 엮지 않고, list 뷰 카드
  // 하단에 완전히 분리된 작은 패널로만 붙인다. 스테이지 뷰는 자격증 컬럼을 따로 쓰므로
  // 이 레인을 렌더링하지 않는다(아래 JSX의 stages 분기에서 certLane을 넣지 않은 이유).
  // 양쪽 다 비어 있으면(대부분의 비자격증 직군) 레인 자체를 렌더링하지 않는다.
  const certLane = hasCertLane ? (
    <div className="wfm-cert-lane" aria-label="자격증">
      <span className="wfm-cert-lane__title">자격증</span>
      <div className="wfm-cert-lane__row">
        {ownedCerts.map((c) => (
          <span key={`oc-${c}`} className="wfm-cert-chip wfm-cert-chip--owned">
            <Award size={11} />
            {c}
          </span>
        ))}
        {targetCerts.map((c) => (
          <span key={`tc-${c}`} className="wfm-cert-chip wfm-cert-chip--target">
            <Award size={11} />
            {c}
            <span className="wfm-cert-chip__badge">필요</span>
          </span>
        ))}
      </div>
    </div>
  ) : null

  // 왼쪽 패널 — 북마크 전부를 체크박스 행으로 보여준다. 목표 선택 자체가 이 위젯의
  // 주된 진입점이라, "선택 0개" 상태에서도 이 패널만은 계속 온전히 보이고 조작 가능해야 한다.
  const goalPanel = (
    <div className="wfm-goal-panel" aria-label="목표로 삼을 북마크 선택">
      {postingsLoading && postingsWithMatch.length === 0 ? (
        <div className="wfm-goal-loading" role="status" aria-live="polite">북마크를 불러오는 중이에요.</div>
      ) : (
        <ul className="wfm-goal-list">
          {postingsWithMatch.map(({ detail, matchPct, yearBadge }) => {
            const id = String(detail.id)
            const checked = selectedIdSet.has(id)
            const company = detail.company ?? '회사명 미상'
            return (
              <li key={id} className="wfm-goal-item">
                <label className="wfm-goal-row">
                  <input
                    type="checkbox"
                    className="wfm-goal-checkbox"
                    checked={checked}
                    onChange={() => handleToggle(id)}
                  />
                  <span className="wfm-goal-avatar" style={{ background: avatarColor(company) }}>
                    {company.slice(0, 1)}
                  </span>
                  <span className="wfm-goal-info">
                    <span className="wfm-goal-company">{company}</span>
                    <span className="wfm-goal-title" title={detail.title}>{detail.title}</span>
                  </span>
                  {yearBadge && <span className="wfm-goal-year">{yearBadge}</span>}
                  <span className="wfm-goal-pct">{matchPct}%</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  return (
    <>
      <div className="dcard wfm-card">
        <SectionHeader
          title="목표 · 학습 워크플로우 맵"
          hint="백엔드 로드맵을 항상 보여주고, 북마크에서 목표를 고르면 필요한 노드를 강조해요"
          right={(
            <div className="wfm-header-actions">
              {!showNoBookmarks && !identity && <PreviewBadge />}
              {/* Phase 1: 로드맵 백본 뷰는 북마크 없이도 항상 그려지므로, 뷰 토글 자체는
                  이제 showNoBookmarks와 무관하게 항상 보인다 — stages/list만 여전히
                  북마크가 있어야 실제로 뭔가 나온다(그 안내는 각 pane 안에서 보여준다). */}
              <div className="wfm-view-toggle" role="group" aria-label="보기 방식 전환">
                <button
                  type="button"
                  className={`wfm-view-toggle__btn${view === 'roadmap' ? ' is-active' : ''}`}
                  onClick={() => setView('roadmap')}
                  aria-label="로드맵 보기"
                  aria-pressed={view === 'roadmap'}
                  title="로드맵 보기"
                >
                  <Milestone size={13} />
                </button>
                <button
                  type="button"
                  className={`wfm-view-toggle__btn${view === 'stages' ? ' is-active' : ''}`}
                  onClick={() => setView('stages')}
                  aria-label="단계별 보기"
                  aria-pressed={view === 'stages'}
                  title="단계별 보기"
                >
                  <Workflow size={13} />
                </button>
                <button
                  type="button"
                  className={`wfm-view-toggle__btn${view === 'list' ? ' is-active' : ''}`}
                  onClick={() => setView('list')}
                  aria-label="리스트 보기"
                  aria-pressed={view === 'list'}
                  title="리스트 보기"
                >
                  <List size={13} />
                </button>
              </div>
              {!showNoBookmarks && (
                <button
                  type="button"
                  className={`wfm-expand-btn wfm-enrich-btn${enrichLoading ? ' is-loading' : ''}`}
                  onClick={handleEnrichClick}
                  disabled={enrichLoading || selectedPostings.length === 0}
                  aria-label="AI로 로드맵 보강"
                  title="AI로 로드맵 보강"
                >
                  <WandSparkles size={14} />
                </button>
              )}
              <div className="wfm-recommend-wrap">
                <button
                  type="button"
                  className={`wfm-expand-btn wfm-recommend-btn${recommendLoading ? ' is-loading' : ''}`}
                  onClick={handleRecommendClick}
                  disabled={recommendLoading}
                  aria-label="추천 공고 가져오기"
                  title="추천 공고 가져오기"
                >
                  <Sparkles size={14} />
                </button>
                {recommendMessage && (
                  <span className="wfm-recommend-msg" role="status" aria-live="polite">{recommendMessage}</span>
                )}
              </div>
              {canExpand && (
                <button
                  type="button"
                  className="wfm-expand-btn"
                  onClick={() => setExpanded(true)}
                  aria-label="워크플로우 맵 크게 보기"
                  title="크게 보기"
                >
                  <Maximize2 size={14} />
                </button>
              )}
            </div>
          )}
        />
        <div className="wfm-body">
          {/* Phase 1: 목표 선택 앵커 바는 이제 showNoBookmarks와 무관하게 항상 보인다 —
              roadmap 뷰도 targetSkills/targetConcepts로 강조를 받으므로 북마크가 없는
              게스트에게는 "북마크하면 목표를 강조해준다"는 안내로 대신 채운다. 시안 1:
              선택된 목표는 위젯 헤더 바로 아래 앵커 바에 상시 칩으로 뜬다(매칭 퍼센트 +
              삭제(X) 포함). 목표 추가는 옆 팝오버로 열리고, 팝오버는 position:absolute라
              열려도 이 바 아래 다이어그램 레이아웃을 흔들지 않는다(시안 2). */}
          {showNoBookmarks ? (
            <div className="wfm-goal-anchorbar">
              <span className="wfm-goal-anchorbar__label">목표</span>
              <span className="wfm-goal-anchorbar__empty">관심 있는 공고를 북마크하면 로드맵에서 목표 노드를 강조해줘요</span>
            </div>
          ) : (
            <div className="wfm-goal-anchorbar">
              <span className="wfm-goal-anchorbar__label">목표</span>
              <div className="wfm-goal-chips">
                {selectedGoalChips.length === 0 ? (
                  <span className="wfm-goal-anchorbar__empty">아직 목표를 선택하지 않았어요</span>
                ) : (
                  selectedGoalChips.map(({ detail, matchPct }) => {
                    const id = String(detail.id)
                    const company = detail.company ?? '회사명 미상'
                    return (
                      <span key={id} className="wfm-goal-chip">
                        <span className="wfm-goal-chip__avatar" style={{ background: avatarColor(company) }}>
                          {company.slice(0, 1)}
                        </span>
                        <span className="wfm-goal-chip__name" title={`${company} · ${detail.title}`}>{company}</span>
                        <span className="wfm-goal-chip__pct">{matchPct}%</span>
                        <button
                          type="button"
                          className="wfm-goal-chip__remove"
                          onClick={() => handleToggle(id)}
                          aria-label={`${company} 목표에서 제거`}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    )
                  })
                )}
              </div>
              <div className="wfm-goal-add-wrap" ref={goalPopoverWrapRef}>
                <button
                  type="button"
                  className={`wfm-goal-add-btn${goalPanelOpen ? ' is-active' : ''}`}
                  onClick={() => setGoalPanelOpen((open) => !open)}
                  aria-expanded={goalPanelOpen}
                  aria-label="목표 추가"
                  title="목표 추가"
                >
                  <Plus size={13} />
                  목표 추가
                </button>
                {goalPanelOpen && (
                  <div className="wfm-goal-popover">
                    <div className="wfm-goal-popover__head">
                      <span className="wfm-goal-popover__title">목표로 삼을 공고</span>
                      <button
                        type="button"
                        className="wfm-goal-popover__close"
                        onClick={() => setGoalPanelOpen(false)}
                        aria-label="목표 추가 팝오버 닫기"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {goalPanel}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="wfm-graph-pane">
            {/* 4: 목표 미선택/로딩/리스트/DAG 네 상태 모두 같은 canvasHeight를 쓴다
                (예전엔 각자 다른 높이 정책이라 상태가 바뀔 때마다 위젯 전체 높이가
                확 무너져 보였다) — 내용이 그보다 짧으면 안내문이 이 높이 안에서
                가운데 정렬되고, 길면 pane 안에서만 스크롤로 흡수한다. roadmap 뷰는 이
                게이트들(showNoBookmarks/showNoSelection/isLoading)과 무관하게 항상
                백본을 그린다 — 그게 이 재설계의 핵심 요구다. */}
            {view === 'roadmap' ? (
              <RoadmapView
                ownedSkills={ownedSkills}
                ownedCerts={ownedCerts}
                targetSkills={targetSkillsArray}
                targetConcepts={targetConcepts}
                height={canvasHeight}
              />
            ) : showNoBookmarks ? (
              <div className="wfm-empty" style={{ height: canvasHeight, flex: 'none' }}>
                <p className="wfm-empty__lead">북마크한 공고를 목표로 학습 경로를 그려드려요.</p>
                <span className="wfm-empty__hint">관심 있는 공고를 북마크하면 목표로 고를 수 있어요.</span>
                {ownedSkills.length > 0 && (
                  <div className="wfm-empty__owned">
                    <span className="wfm-empty__owned-label">지금 보유한 기술</span>
                    <div className="wfm-empty__chips">
                      {ownedSkills.slice(0, 12).map((s) => <span key={s} className="wfm-chip wfm-chip--owned">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : showNoSelection ? (
                // flex:'none'으로 .wfm-empty 클래스의 flex:1(flex-basis:0%로 인라인
                // height를 무시할 수 있다)을 이 자리에서만 눌러, canvasHeight가 그대로
                // 이 블록의 실제 높이가 되게 한다.
                <div className="wfm-empty wfm-empty--selection" style={{ height: canvasHeight, flex: 'none' }}>
                  <p className="wfm-empty__lead">북마크한 공고 중 목표로 삼을 걸 선택해보세요.</p>
                  <span className="wfm-empty__hint">위의 "목표 추가" 버튼에서 하나 이상 체크하면 학습 순서가 나타나요.</span>
                </div>
              ) : isLoading ? (
                <div className="wfm-loading" role="status" aria-live="polite" style={{ height: canvasHeight, flex: 'none' }}>워크플로우 맵을 그리는 중이에요.</div>
              ) : view === 'list' ? (
                // D: 리스트 뷰 — 보유 밴드 · 공통 코어 · 공고별 트랙을 WorkflowList가
                // 그린다. 라이브 로드맵은 안 쓰므로 roadmap.loading을 기다리지 않아도
                // 되지만, 위 isLoading 게이트를 stages 뷰와 공유해 굳이 분기하지 않았다
                // (실무상 로드맵 응답이 빨라 체감 지연이 거의 없다).
                <div className="wfm-list-pane" style={{ height: canvasHeight }}>
                  <WorkflowList
                    ownedSkills={ownedSkills}
                    ownedSkillCategories={ownedSkillCategories}
                    selectedPostings={selectedPostings}
                  />
                  {certLane}
                </div>
              ) : (
                <>
                  {heterogeneousGoals && (
                    <div className="wfm-heterogeneous-banner">
                      <span>선택한 공고들의 분야가 달라요.</span>
                      <button
                        type="button"
                        className="wfm-heterogeneous-banner__btn"
                        onClick={() => setView('list')}
                      >
                        리스트 보기에서 공고별로 나눠 볼 수 있어요
                      </button>
                    </div>
                  )}
                  {/* 7: 빈 캔버스 영역을 마우스로 눌러 끌면 스크롤 위치가 옮겨진다
                      (usePanScroll) — 카드·버튼 위에서 누르면 패닝 대신 원래 클릭이
                      그대로 동작한다. */}
                  <div
                    ref={stagePan.ref}
                    className={`wfm-stage-pane${stagePan.isPanning ? ' is-panning' : ''}`}
                    style={{ height: canvasHeight }}
                    onMouseDown={stagePan.onMouseDown}
                    onMouseMove={stagePan.onMouseMove}
                    onMouseUp={stagePan.onMouseUp}
                    onMouseLeave={stagePan.onMouseLeave}
                  >
                    <WorkflowStages
                      ownedSkills={ownedSkills}
                      ownedSkillCategories={ownedSkillCategories}
                      selectedPostings={selectedPostings}
                      targetSkills={targetSkillsArray}
                      targetCerts={targetCerts}
                      ownedCerts={ownedCerts}
                      targetConcepts={targetConcepts}
                      careerGoalMin={careerGoalMin}
                      resumeCareerMax={resumeCareerMax}
                      liveSteps={roadmap.value.steps}
                      // 2026-07-20: 대시보드 전체 폭 행으로 옮겨지면서 카드 폭도
                      // "크게 보기" 모달과 같은 넓은 규격(NODE_WIDTH_WIDE)을 쓴다 —
                      // 이 위젯은 이제 이 화면에서만 쓰이므로(다른 좁은 카드 컨텍스트
                      // 없음) 항상 wide로 렌더해도 안전하다.
                      wide
                    />
                  </div>
                  {legend}
                  {roadmap.value.as_of && <AsOf asOf={roadmap.value.as_of} n={roadmap.value.total} />}
                </>
              )}
            </div>
          </div>
      </div>

      {expanded && canExpand && (
        <div className="wfm-modal__backdrop" onClick={() => setExpanded(false)}>
          <div
            className="wfm-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label="학습 워크플로우 맵 크게 보기"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfm-modal__titlebar">
              <span className="wfm-modal__title">목표 · 학습 워크플로우 맵</span>
              <button type="button" className="wfm-modal__close" onClick={() => setExpanded(false)} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            {view === 'roadmap' ? (
              // Phase 1: 로드맵 백본은 모달에서도 같은 컴포넌트를 더 큰 높이로 그린다 —
              // 백본 자체는 이미 내부 스크롤(usePanScroll)을 갖고 있어 모달 전용 래퍼가
              // 따로 필요 없다.
              <div className="wfm-modal__roadmap">
                <RoadmapView
                  ownedSkills={ownedSkills}
                  ownedCerts={ownedCerts}
                  targetSkills={targetSkillsArray}
                  targetConcepts={targetConcepts}
                  height={640}
                />
              </div>
            ) : view === 'list' ? (
              // 2단계: "크게 보기" 모달도 현재 모드를 따른다 — list 모드면 모달도
              // 리스트를 더 넓은 영역에 그린다(WorkflowList 자체는 캡 없이 전부
              // 보여주므로 컴팩트 카드보다 스크롤 여유만 커지면 충분하다).
              <div className="wfm-modal__list">
                <WorkflowList
                  ownedSkills={ownedSkills}
                  ownedSkillCategories={ownedSkillCategories}
                  selectedPostings={selectedPostings}
                />
                {certLane}
              </div>
            ) : (
              <>
                <div
                  ref={modalStagePan.ref}
                  className={`wfm-modal__stage${modalStagePan.isPanning ? ' is-panning' : ''}`}
                  onMouseDown={modalStagePan.onMouseDown}
                  onMouseMove={modalStagePan.onMouseMove}
                  onMouseUp={modalStagePan.onMouseUp}
                  onMouseLeave={modalStagePan.onMouseLeave}
                >
                  <WorkflowStages
                    ownedSkills={ownedSkills}
                    ownedSkillCategories={ownedSkillCategories}
                    selectedPostings={selectedPostings}
                    targetSkills={targetSkillsArray}
                    targetCerts={targetCerts}
                    ownedCerts={ownedCerts}
                    targetConcepts={targetConcepts}
                    careerGoalMin={careerGoalMin}
                    resumeCareerMax={resumeCareerMax}
                    liveSteps={roadmap.value.steps}
                    wide
                  />
                </div>
                {legend}
              </>
            )}
          </div>
        </div>
      )}

      {recommendModalOpen && (
        <div className="wfm-modal__backdrop" onClick={() => setRecommendModalOpen(false)}>
          <div
            className="wfm-modal__card wfm-recommend-modal"
            role="dialog"
            aria-modal="true"
            aria-label="추천 공고"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfm-modal__titlebar">
              <span className="wfm-modal__title">추천 공고</span>
              <button type="button" className="wfm-modal__close" onClick={() => setRecommendModalOpen(false)} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <p className="wfm-recommend-modal__hint">담고 싶은 공고만 골라서 추가하세요. 추가하면 북마크되고 목표로도 반영돼요.</p>
            <ul className="wfm-recommend-modal__list">
              {recommendCandidates.map((item) => {
                const id = String(item.id)
                const added = addedCandidateIds.has(id)
                const company = item.company ?? '회사명 미상'
                const matchPct = matchPctFor(item.skills, item.matched_count, ownedSet)
                const yearBadge = yearBadgeFor(item.post_date)
                return (
                  <li key={id} className="wfm-recommend-modal__item">
                    <span className="wfm-goal-avatar" style={{ background: avatarColor(company) }}>
                      {company.slice(0, 1)}
                    </span>
                    <span className="wfm-goal-info">
                      <span className="wfm-goal-company">{company}</span>
                      <span className="wfm-goal-title" title={item.title}>{item.title}</span>
                    </span>
                    {yearBadge && <span className="wfm-goal-year">{yearBadge}</span>}
                    <span className="wfm-goal-pct">{matchPct}%</span>
                    <button
                      type="button"
                      className={`wfm-recommend-modal__add${added ? ' is-added' : ''}`}
                      onClick={() => handleAddCandidate(item)}
                      disabled={added}
                    >
                      {added ? '추가됨' : '추가'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {enrichModalOpen && (
        <div className="wfm-modal__backdrop" onClick={() => setEnrichModalOpen(false)}>
          <div
            className="wfm-modal__card wfm-enrich-modal"
            role="dialog"
            aria-modal="true"
            aria-label="AI 로드맵 보강"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfm-modal__titlebar">
              <span className="wfm-modal__title">AI 로드맵 보강</span>
              <button type="button" className="wfm-modal__close" onClick={() => setEnrichModalOpen(false)} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            {enrichLoading ? (
              <div className="wfm-loading" role="status" aria-live="polite">AI가 로드맵을 보강하는 중이에요.</div>
            ) : enrichData ? (
              <div className="wfm-enrich-body">
                <div className="wfm-enrich-headline">{enrichData.headline}</div>
                {enrichData.summary && <p className="wfm-enrich-summary">{enrichData.summary}</p>}
                {enrichData.quick_win && (
                  <div className="wfm-enrich-quickwin">
                    <span className="wfm-enrich-quickwin__label">지금 바로</span>
                    <span className="wfm-enrich-quickwin__text">{enrichData.quick_win}</span>
                  </div>
                )}
                <ul className="wfm-enrich-steps">
                  {[...enrichData.steps].sort((a, b) => a.order - b.order).map((step) => (
                    <li key={`${step.order}-${step.label}`} className={`wfm-enrich-step wfs-type--${step.type}`}>
                      <div className="wfm-enrich-step__head">
                        <span className="wfm-enrich-step__order">{step.order}</span>
                        <span className="wfm-enrich-step__label">{step.label}</span>
                        <span className={`wfm-enrich-step__priority wfm-enrich-step__priority--${step.priority}`}>
                          {ENRICH_PRIORITY_LABEL[step.priority] ?? step.priority}
                        </span>
                      </div>
                      <div className="wfm-enrich-step__meta">
                        <Check size={10} />
                        <span>{step.effort}</span>
                      </div>
                      {step.reason && <p className="wfm-enrich-step__reason">{step.reason}</p>}
                      {step.project && (
                        <p className="wfm-enrich-step__project"><b>프로젝트 제안</b> {step.project}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="wfm-loading">보강 결과를 불러오지 못했어요.</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
