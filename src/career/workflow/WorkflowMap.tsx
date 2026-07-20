import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Maximize2, Plus, Sparkles, WandSparkles, X } from 'lucide-react'
import { SectionHeader, PreviewBadge } from '../kit'
import { useResumesState } from '../state'
import { getAuthToken } from '../authStore'
import { useBookmarks, loadBookmarkDetails, toggleBookmark } from '../bookmarkStore'
import {
  useSelectedGoalIds, useGoalSelectionTouched, toggleGoalId,
} from '../goalSelectionStore'
import {
  dashboardApi, jobsApi, type Identity, type PostingDetail,
  type RoadmapEnrichRequest, type RoadmapEnrichResponse, type RoadmapEnrichStep,
} from '../api'
import type { WidgetSize } from '../dashboardConfig'
import { getDemoRecommendations } from '../../data/demoRecommend'
import CompanyLogo from '../CompanyLogo'
import { avatarColor, matchPctFor, yearBadgeFor, type PostingDetailWithConcepts } from './workflowShared'
import { RoadmapView } from './RoadmapView'
import { loadRoadmapTrack, DEFAULT_ROADMAP_TRACK_ID } from '../../data/roadmaps/registry'
import { buildRoadmapOverlay, type NodeStatus } from './roadmapOverlay'
import './workflowMap.css'

// 데모용 추천 공고 — careerData.json 실제 공고를 직무 8개로 미리 분류·큐레이션해둔
// demoRecommend.ts를 그대로 쓴다. 네트워크 호출이 전혀 없어(백엔드·로그인 여부와
// 무관하게) 게스트 화면에서도 항상 같은 결과가 즉시 뜬다. 모듈 스코프에서 한 번만
// 계산해 두는 이유는 이 값이 careerData.json이라는 정적 입력에만 의존해 렌더마다
// 다시 계산할 이유가 없기 때문이다(리렌더 때마다 배열을 새로 만들면 각 그룹의
// postings 배열 참조가 매번 바뀌어 하위 리스트의 불필요한 재조정만 늘어난다).
const DEMO_RECOMMEND_GROUPS = getDemoRecommendations()

// JobSheet.tsx의 careerText와 같은 표기(신입·무관 / 경력 N년+ / 경력 N~M년)를 그대로
// 따른다 — 이 워크플로우 맵 파일 안에서만 쓰는 값이라 workflowShared.ts에 새 export를
// 얹는 대신 여기 작게 둔다.
// careerData.json은 상한이 없는 공고를 careerMax: 100(센티널 값)으로 표시한다 —
// 그대로 보여주면 "경력 5~100년"처럼 어색해지므로 상한이 사실상 무제한인 경우엔
// "N년+"로만 표기한다.
const CAREER_MAX_UNBOUNDED = 50
function demoCareerText(min: number | null, max: number | null): string {
  if (!min) return '신입·무관'
  const hasCappedMax = max != null && max !== min && max < CAREER_MAX_UNBOUNDED
  return hasCappedMax ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

// A-5: 목표 · 학습 워크플로우 맵 — 북마크한 공고 전부(암묵적 목표) 대신 목표 선택
// 패널에서 "목표로 삼을 것"을 직접 골라야 한다. 시안 1: 예전엔 이 선택 UI가 다이어그램
// 위에 겹치는 플로팅 드로어였는데, 위젯 헤더 바로 아래 상시 노출되는 앵커 바(선택된
// 목표를 매칭률+삭제(X) 칩으로)와 그 옆의 "목표 추가" 팝오버로 옮겼다 — 다이어그램은
// 그 아래 온전히 남고, 목표 추가/삭제는 팝오버 안에서 in place로 끝난다(시안 2: 위젯
// 밖 스크롤 위치를 흔들지 않기 위해 handleToggle이 스크롤 위치를 보존한다). 이 파일은
// 데이터 패칭, 목표 선택, 추천 공고 모달, AI 보강 모달, 크게 보기 모달 같은 위젯 셸을
// 담당하고, 실제 로드맵 렌더는 RoadmapView.tsx가 맡는다.
//
// Phase 2(로드맵 유일 뷰 전환): 예전엔 roadmap/stages/list 세 뷰를 토글로 오가며
// stages/list는 북마크 -> 목표 선택이 있어야만 뭔가 그려지는 "장난감"이었다. 사람이
// 큐레이션한 정본 백본(RoadmapView, src/data/roadmaps/backend.json)은 북마크·로그인
// 여부와 무관하게 항상 그려지고 목표 선택은 그 위에 강조만 얹으므로, 뷰 토글과
// stages/list 렌더 분기를 걷어내고 로드맵을 유일한 뷰로 굳혔다. WorkflowStages.tsx와
// WorkflowList.tsx 파일 자체는 다른 곳에서 참조될 수 있어 남겨두되 이 위젯은 더 이상
// import하지 않는다.

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
//
// hasGoal: 목표(북마크 선택)가 있는 요청인지, 아니면 로드맵 미보유 노드로 만든
// 요청(buildRoadmapGap)인지. 데이터 자체(req)는 두 경우 모두 같은 shape이라 이
// 플래그 없이는 구분할 방법이 없는데, 문구가 "OO 공고가 요구하는 기술" 처럼 실제
// 공고를 전제하면 목표가 없을 때는 어색해진다 — 그래서 문구 분기에만 쓴다.
function buildFallbackEnrichment(req: RoadmapEnrichRequest, hasGoal: boolean): RoadmapEnrichResponse {
  const company = req.goal_company || '목표 기업'
  const title = req.goal_title || (hasGoal ? '목표 공고' : '로드맵')
  const steps: RoadmapEnrichStep[] = []
  let order = 1

  req.missing_skills.slice(0, 4).forEach((skill, i) => {
    steps.push({
      order: order++,
      label: skill,
      type: 'skill',
      effort: i === 0 ? '1~2주' : '2~4주',
      priority: i === 0 ? 'high' : i < 2 ? 'medium' : 'low',
      reason: hasGoal
        ? `${company} ${title} 공고가 요구하는 기술이에요.`
        : `${title}에서 다음으로 추천하는 기술이에요.`,
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
      reason: hasGoal
        ? `${title} 직무에서 자주 요구하는 개념이에요.`
        : `${title}에서 자주 나오는 핵심 개념이에요.`,
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
  if (hasGoal && req.career_required != null && req.career_required > 0 && (req.career_mine ?? 0) < req.career_required) {
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
    headline: hasGoal ? `${company} ${title}까지 남은 것` : `${title}에서 다음으로 채우면 좋은 것`,
    summary: steps.length > 0
      ? (hasGoal
        ? `${title} 목표까지 ${steps.length}가지를 준비하면 좋아요. 급한 순서로 정리했어요.`
        : `${title} 기준으로 아직 채우지 못한 핵심 항목 ${steps.length}가지를 정리했어요. 급한 순서로 나열했어요.`)
      : (hasGoal
        ? '지금 보유한 기술만으로도 이 목표에 이미 잘 맞고 있어요.'
        : '이미 로드맵의 핵심 항목을 대부분 채웠어요.'),
    quick_win: steps[0] ? `${steps[0].label}부터 시작해보세요` : '보유 기술을 하나씩 늘려가 보세요',
    steps,
  }
}

// F-2 확장: 목표(북마크 선택)가 하나도 없어도 AI 보강 버튼이 항상 작동해야 한다는
// 데모 요구로, 로드맵 정본 백본(backend.json)에서 아직 보유하지 못한 노드들을
// 뽑아 보강 요청의 재료로 삼는다 — RoadmapView.tsx와 완전히 같은 오버레이 계산
// (buildRoadmapOverlay)을 재사용해 "화면에 실제로 잠겨/해금 가능으로 보이는 노드"와
// 정확히 같은 기준으로 갭을 판정한다. 정렬은 지금 당장 시작할 수 있는(unlockable)
// 노드를 먼저, 그다음 아직 잠긴(locked) 노드를 로드맵 진행 순서(섹션 순서 -> 노드
// 순서)대로 둬서 "다음에 뭘 해야 하는지"가 자연스럽게 읽히게 한다.
const ROADMAP_GAP_SKILL_LIMIT = 6
const ROADMAP_GAP_CONCEPT_LIMIT = 3
const ROADMAP_GAP_CERT_LIMIT = 2
const GAP_STATUS_RANK: Record<NodeStatus, number> = { unlockable: 0, locked: 1, owned: 2 }

function buildRoadmapGap(ownedSkills: string[], ownedCerts: string[]) {
  const track = loadRoadmapTrack(DEFAULT_ROADMAP_TRACK_ID)
  const overlay = buildRoadmapOverlay(track, ownedSkills, ownedCerts)
  const sectionOrderById = new Map(track.sections.map((s) => [s.id, s.order]))

  const gapNodes = track.nodes
    .filter((n) => overlay.statusById.get(n.id) !== 'owned')
    .sort((a, b) => {
      const ra = GAP_STATUS_RANK[overlay.statusById.get(a.id) ?? 'locked']
      const rb = GAP_STATUS_RANK[overlay.statusById.get(b.id) ?? 'locked']
      if (ra !== rb) return ra - rb
      const sa = sectionOrderById.get(a.section) ?? 0
      const sb = sectionOrderById.get(b.section) ?? 0
      if (sa !== sb) return sa - sb
      return a.order - b.order
    })

  return {
    trackLabel: track.label,
    missingSkills: gapNodes.filter((n) => n.type === 'skill').map((n) => n.label).slice(0, ROADMAP_GAP_SKILL_LIMIT),
    concepts: gapNodes.filter((n) => n.type === 'concept').map((n) => n.label).slice(0, ROADMAP_GAP_CONCEPT_LIMIT),
    certs: gapNodes.filter((n) => n.type === 'cert').map((n) => n.label).slice(0, ROADMAP_GAP_CERT_LIMIT),
  }
}

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
  const { activeResume } = useResumesState()
  const ownedSkills = useMemo(() => activeResume?.skills ?? [], [activeResume])
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

  const targetSet = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => p.skills.forEach((s) => { if (!ownedSet.has(s)) set.add(s) }))
    return set
  }, [selectedPostings, ownedSet])
  const targetSkillsArray = useMemo(() => [...targetSet], [targetSet])

  // 자격증 트랙 — 보유/목표 두 집합만 뽑는다. RoadmapView에는 ownedCerts만 넘기고,
  // targetCerts는 AI 보강 요청 payload에 쓴다.
  const ownedCerts = useMemo(() => activeResume?.certs ?? [], [activeResume])
  const ownedCertSet = useMemo(() => new Set(ownedCerts), [ownedCerts])
  const targetCerts = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => p.certs.forEach((c) => { if (!ownedCertSet.has(c)) set.add(c) }))
    return [...set]
  }, [selectedPostings, ownedCertSet])

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

  const showNoBookmarks = bookmarkIds.length === 0
  const showNoSelection = !showNoBookmarks && selectedIds.length === 0

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

  // 데모용 추천 공고 — DEMO_RECOMMEND_GROUPS는 careerData.json에서 이미 계산해 둔
  // 고정값이라(모듈 스코프), 여기선 모달을 열고 닫는 상태만 관리한다. 예전엔 API로
  // 회사명을 조회해서 게스트·백엔드 다운 상황에서 실패하곤 했는데, 이제 네트워크 호출
  // 자체가 없어 실패할 방법이 없다.
  const [recommendModalOpen, setRecommendModalOpen] = useState(false)
  const handleRecommendClick = () => setRecommendModalOpen(true)

  useEffect(() => {
    if (!recommendModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setRecommendModalOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [recommendModalOpen])

  // F-2: 목표 미선택 시 AI 보강 payload의 재료 — 로드맵 정본에서 아직 보유하지 못한
  // 노드들(buildRoadmapGap)을 이력서 보유 스킬/자격증이 바뀔 때만 다시 계산한다.
  // 목표가 선택된 경우엔 아래 handleEnrichClick이 이 값을 참조하지 않는다.
  const roadmapGap = useMemo(() => buildRoadmapGap(ownedSkills, ownedCerts), [ownedSkills, ownedCerts])

  // F-2: AI 로드맵 보강 — 별 아이콘 버튼(WandSparkles). 위 Sparkles 추천 버튼과 헷갈리지
  // 않도록 아이콘·툴팁을 다르게 둔다(추천 = 새 목표 후보 찾기, 보강 = 이미 고른 목표의
  // 학습 순서를 LLM이 다시 짜준다). 데모 요구: 목표를 하나도 안 골라도 버튼이 항상
  // 작동해야 하므로(선택 0개가 "비활성"으로 보이면 안 된다), 선택된 목표가 있으면
  // 그걸 우선 쓰고 없으면 로드맵의 미보유 핵심 노드(buildRoadmapGap)로 payload를
  // 채운다 — 그래서 이 버튼은 더 이상 selectedPostings 유무로 비활성화되지 않는다.
  const [enrichModalOpen, setEnrichModalOpen] = useState(false)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichData, setEnrichData] = useState<RoadmapEnrichResponse | null>(null)

  const handleEnrichClick = async () => {
    if (enrichLoading) return
    const hasGoal = selectedPostings.length > 0
    const primary = selectedPostings[0]
    const payload: RoadmapEnrichRequest = hasGoal
      ? {
        goal_company: primary.company ?? '목표 기업',
        goal_title: primary.title,
        owned_skills: ownedSkills,
        missing_skills: targetSkillsArray,
        concepts: targetConcepts,
        certs: targetCerts,
        career_required: careerGoalMin,
        career_mine: resumeCareerMax,
      }
      : {
        goal_company: '',
        goal_title: `${roadmapGap.trackLabel} 로드맵`,
        owned_skills: ownedSkills,
        missing_skills: roadmapGap.missingSkills,
        concepts: roadmapGap.concepts,
        certs: roadmapGap.certs,
        career_required: null,
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
      setEnrichData(buildFallbackEnrichment(payload, hasGoal))
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

  // 2a: 크게 보기 — 더 넓은 영역에 로드맵을 그리는 오버레이 모달. Escape·백드롭
  // 클릭으로 닫는다.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [expanded])

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
              {/* F-2: 이제 북마크/목표 선택 여부와 무관하게 항상 렌더되고 항상 눌려야
                  한다 — 목표가 없으면 handleEnrichClick이 로드맵 갭 기반 payload로
                  대신 채운다. 로딩 중에만 잠깐 비활성화한다. */}
              <button
                type="button"
                className={`wfm-expand-btn wfm-enrich-btn${enrichLoading ? ' is-loading' : ''}`}
                onClick={handleEnrichClick}
                disabled={enrichLoading}
                aria-label="AI로 로드맵 보강"
                title="AI로 로드맵 보강"
              >
                <WandSparkles size={14} />
              </button>
              <div className="wfm-recommend-wrap">
                <button
                  type="button"
                  className="wfm-expand-btn wfm-recommend-btn"
                  onClick={handleRecommendClick}
                  aria-label="직무별 추천 공고 보기"
                  title="직무별 추천 공고 보기"
                >
                  <Sparkles size={14} />
                </button>
              </div>
              <button
                type="button"
                className="wfm-expand-btn"
                onClick={() => setExpanded(true)}
                aria-label="워크플로우 맵 크게 보기"
                title="크게 보기"
              >
                <Maximize2 size={14} />
              </button>
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
            {/* Phase 2: 로드맵 백본은 showNoBookmarks/showNoSelection 게이트와 무관하게
                항상 그려진다 — 북마크·목표 선택이 없어도 정본 백본이 보이고, 목표를
                고르면 그 위에 강조만 얹힌다. */}
            <RoadmapView
              ownedSkills={ownedSkills}
              ownedCerts={ownedCerts}
              targetSkills={targetSkillsArray}
              targetConcepts={targetConcepts}
              height={canvasHeight}
            />
          </div>
        </div>
      </div>

      {expanded && (
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
            {/* 로드맵 백본은 모달에서도 같은 컴포넌트를 더 큰 높이로 그린다 — 백본 자체가
                이미 내부 스크롤(패닝)을 갖고 있어 모달 전용 래퍼가 따로 필요 없다. */}
            <div className="wfm-modal__roadmap">
              <RoadmapView
                ownedSkills={ownedSkills}
                ownedCerts={ownedCerts}
                targetSkills={targetSkillsArray}
                targetConcepts={targetConcepts}
                height={640}
              />
            </div>
          </div>
        </div>
      )}

      {recommendModalOpen && (
        <div className="wfm-modal__backdrop" onClick={() => setRecommendModalOpen(false)}>
          <div
            className="wfm-modal__card wfm-recommend-modal"
            role="dialog"
            aria-modal="true"
            aria-label="직무별 추천 공고"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfm-modal__titlebar">
              <span className="wfm-modal__title">직무별 추천 공고</span>
              <button type="button" className="wfm-modal__close" onClick={() => setRecommendModalOpen(false)} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <p className="wfm-recommend-modal__hint">직무 8개로 모은 유명 기업 공고예요. 정보가 풍부한 순으로 추렸어요.</p>
            <div className="wfm-recommend-modal__roles">
              {DEMO_RECOMMEND_GROUPS.map(({ role, postings }) => (
                <section key={role} className="wfm-demo-role">
                  <div className="wfm-demo-role__head">
                    <span className="wfm-demo-role__name">{role}</span>
                    <span className="wfm-demo-role__count">{postings.length}</span>
                  </div>
                  <ul className="wfm-demo-role__cards">
                    {postings.map((card) => {
                      const shownTechs = card.techs.slice(0, 4)
                      const moreCount = card.techs.length - shownTechs.length
                      return (
                        <li key={card.id} className="wfm-demo-card">
                          <CompanyLogo logo={card.logo} name={card.company} size={30} radius={9} />
                          <div className="wfm-demo-card__body">
                            <div className="wfm-demo-card__headline">
                              <span className="wfm-demo-card__company">{card.company}</span>
                              {card.tier === '대기업' && <span className="wfm-demo-card__tier">대기업</span>}
                              <span className="wfm-demo-card__career">{demoCareerText(card.careerMin, card.careerMax)}</span>
                              <button
                                type="button"
                                className={`wfm-demo-card__add-btn${bookmarkIds.includes(String(card.id)) ? ' is-added' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleBookmark(String(card.id))
                                  toggleGoalId(String(card.id), selectedIds)
                                }}
                                aria-label={`${card.company} ${card.title} 공고 추가`}
                                title={bookmarkIds.includes(String(card.id)) ? '추가됨' : '추가'}
                              >
                                {bookmarkIds.includes(String(card.id)) ? <Check size={14} /> : <Plus size={14} />}
                              </button>
                            </div>
                            <div className="wfm-demo-card__title" title={card.title}>{card.title}</div>
                            <div className="wfm-demo-card__chips">
                              {shownTechs.map((tech) => (
                                <span key={tech} className="wfm-demo-card__chip">{tech}</span>
                              ))}
                              {moreCount > 0 && (
                                <span className="wfm-demo-card__chip wfm-demo-card__chip--more">+{moreCount}</span>
                              )}
                            </div>
                            {card.requirementSummary && (
                              <p className="wfm-demo-card__req">{card.requirementSummary}</p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
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
