import { useEffect, useMemo, useState } from 'react'
import { Award, List, ListChecks, Maximize2, Sparkles, Workflow, X } from 'lucide-react'
import { SectionHeader, PreviewBadge } from '../kit'
import { AsOf } from '../charts'
import { useResumesState } from '../state'
import { getAuthToken } from '../authStore'
import { useBookmarks, loadBookmarkDetails, isBookmarked, toggleBookmark } from '../bookmarkStore'
import {
  useSelectedGoalIds, useGoalSelectionTouched, toggleGoalId,
  getSelectedGoalIds, isGoalSelectionTouched, setSelectedGoalIds,
} from '../goalSelectionStore'
import { dashboardApi, jobsApi, type Identity, type PostingCard, type PostingDetail, type ScopedRoadmapData } from '../api'
import { useWidgetData } from '../useWidgetData'
import type { WidgetSize } from '../dashboardConfig'
import dreamCompanies from '../../data/dreamCompanies.json'
import { avatarColor, matchPctFor, yearBadgeFor, minPairwiseJaccard } from './workflowShared'
import { WorkflowList } from './WorkflowList'
import { WorkflowStages } from './WorkflowStages'
import './workflowMap.css'

// 데모용: 클릭 한 번으로 유명 기업 공고를 북마크 + 목표 선택까지 채워 넣어 워크플로우
// 맵을 즉석에서 populate한다. 실제 검증된 기업명 목록은 dreamCompanies.json에 있다.
type DreamCompany = { name: string; tier: '대기업' | '중견' }
const DREAM_COMPANIES = dreamCompanies as DreamCompany[]
const RECOMMEND_TARGET_NEW = 8
const RECOMMEND_MAX_COMPANIES = 12
const RECOMMEND_CHUNK_SIZE = 4

// A-5: 목표 · 학습 워크플로우 맵 — 북마크한 공고 전부(암묵적 목표) 대신 목표 선택
// 패널에서 "목표로 삼을 것"을 직접 골라야 한다(캔버스 위에 뜨는 플로팅 드로어). 선택된
// 공고들의 요구 기술과 이력서 보유 기술을 스테이지 뷰(WorkflowStages)로 이어 "무엇을
// 어떤 순서로 배우면 좋은가"를 보여준다. 좌표 계산·React Flow 캔버스·카테고리 클러스터
// 노드는 전부 WorkflowStages.tsx로 옮겼다 — 이 파일은 데이터 패칭, 목표 선택, 추천 공고
// 모달, 크게 보기 모달, 뷰(stages/list) 토글 같은 위젯 셸만 담당한다. list 뷰
// (WorkflowList)와 workflowShared.ts의 공용 헬퍼(분류·아바타색·매치율 등)는 그대로
// 유지한다 — list 뷰가 여전히 그 헬퍼들을 쓴다.

const MOCK_ROADMAP: ScopedRoadmapData = { start_matched: 0, total: 0, as_of: '', steps: [] }

// 2단계: stages/list 보기 선택 저장 키 — dashboardConfig.ts의 STORAGE_KEY_DASHBOARD_CONFIG와
// 같은 techeer_ 프리픽스 네이밍을 따른다.
const VIEW_STORAGE_KEY = 'techeer_workflow_view'

export function WorkflowMap({ size = '2x2' }: { size?: WidgetSize }) {
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
  const handleToggle = (id: string) => toggleGoalId(id, selectedIds)

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

  // 컴팩트 카드에서 목표 선택 패널은 이제 캔버스 위에 뜨는 플로팅 드로어다(4번 피드백:
  // 다이어그램이 카드를 거의 다 채우게). 기본은 닫힘(다이어그램이 바로 보이게)이지만,
  // 아직 목표를 하나도 안 골랐으면(showNoSelection) 처음부터 열어서 "여기서 고르면
  // 된다"는 게 바로 보이게 한다 — 이 초기값은 마운트 시점 값만 쓰고, 그 뒤엔 토글 버튼으로만 바뀐다.
  const [goalPanelOpen, setGoalPanelOpen] = useState(showNoSelection)

  // 2단계: stages/list 보기 전환 — dashboardConfig.ts와 같은 패턴(localStorage가 정본)을
  // 이 위젯 안에서 useState+localStorage로 간단히 구현한다(별도 스토어 모듈은 과하다).
  // 마운트 시 1회만 저장된 값을 읽고, 그 뒤엔 토글 버튼으로만 바뀐다.
  const [view, setViewState] = useState<'stages' | 'list'>(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'stages'
    } catch {
      return 'stages'
    }
  })
  const setView = (next: 'stages' | 'list') => {
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

  // D: 이질성 배너가 실제로 렌더되는 조건(아래 stages 뷰 분기와 동일해야 한다). 배너가
  // 뜰 때만 캔버스 좌상단에 고정된 목표 선택 토글/드로어를 배너 높이만큼 아래로 밀어
  // 배너 텍스트를 가리지 않게 한다.
  const bannerVisible = !showNoSelection && !isLoading && view !== 'list' && heterogeneousGoals

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
          hint="북마크에서 목표를 선택하면 학습 순서를 보여줘요"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!showNoBookmarks && !identity && <PreviewBadge />}
              {!showNoBookmarks && (
                <div className="wfm-view-toggle" role="group" aria-label="보기 방식 전환">
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
              {!showNoBookmarks && canShowGraph && (
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
        {showNoBookmarks ? (
          <div className="wfm-empty">
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
        ) : (
          <div className="wfm-body">
            <div className="wfm-graph-pane">
              <button
                type="button"
                className={`wfm-goal-toggle${bannerVisible ? ' wfm-goal-toggle--shifted' : ''}`}
                onClick={() => setGoalPanelOpen((open) => !open)}
                aria-expanded={goalPanelOpen}
                aria-label="목표 선택 패널 토글"
                title="목표 선택"
              >
                <ListChecks size={13} />
                목표 선택
              </button>
              {goalPanelOpen && (
                <div className={`wfm-goal-drawer${bannerVisible ? ' wfm-goal-drawer--shifted' : ''}`}>
                  <div className="wfm-goal-drawer__head">
                    <span className="wfm-goal-drawer__title">목표로 삼을 공고</span>
                    <button
                      type="button"
                      className="wfm-goal-drawer__close"
                      onClick={() => setGoalPanelOpen(false)}
                      aria-label="목표 선택 패널 닫기"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {goalPanel}
                </div>
              )}
              {showNoSelection ? (
                <div className="wfm-empty wfm-empty--selection">
                  <p className="wfm-empty__lead">북마크한 공고 중 목표로 삼을 걸 선택해보세요.</p>
                  <span className="wfm-empty__hint">위의 "목표 선택" 버튼에서 하나 이상 체크하면 학습 순서가 나타나요.</span>
                </div>
              ) : isLoading ? (
                <div className="wfm-loading" role="status" aria-live="polite">워크플로우 맵을 그리는 중이에요.</div>
              ) : view === 'list' ? (
                // D: 리스트 뷰 — 보유 밴드 · 공통 코어 · 공고별 트랙을 WorkflowList가
                // 그린다. 라이브 로드맵은 안 쓰므로 roadmap.loading을 기다리지 않아도
                // 되지만, 위 isLoading 게이트를 stages 뷰와 공유해 굳이 분기하지 않았다
                // (실무상 로드맵 응답이 빨라 체감 지연이 거의 없다).
                <div className="wfm-list-pane" style={{ maxHeight: size === '2x2' ? 500 : 260 }}>
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
                  <div className="wfm-stage-pane" style={{ maxHeight: size === '2x2' ? 500 : 260 }}>
                    <WorkflowStages
                      ownedSkills={ownedSkills}
                      ownedSkillCategories={ownedSkillCategories}
                      selectedPostings={selectedPostings}
                      targetSkills={targetSkillsArray}
                      targetCerts={targetCerts}
                      ownedCerts={ownedCerts}
                      liveSteps={roadmap.value.steps}
                    />
                  </div>
                  {legend}
                  {roadmap.value.as_of && <AsOf asOf={roadmap.value.as_of} n={roadmap.value.total} />}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {expanded && canShowGraph && (
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
            {view === 'list' ? (
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
                <div className="wfm-modal__stage">
                  <WorkflowStages
                    ownedSkills={ownedSkills}
                    ownedSkillCategories={ownedSkillCategories}
                    selectedPostings={selectedPostings}
                    targetSkills={targetSkillsArray}
                    targetCerts={targetCerts}
                    ownedCerts={ownedCerts}
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
    </>
  )
}
