import { useEffect, useMemo, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { SectionHeader, PreviewBadge } from '../kit'
import { AsOf } from '../charts'
import { useResumesState } from '../state'
import { getAuthToken } from '../authStore'
import { useBookmarks, loadBookmarkDetails } from '../bookmarkStore'
import { useSelectedGoalIds, useGoalSelectionTouched, toggleGoalId } from '../goalSelectionStore'
import { dashboardApi, jobsApi, type Identity, type PostingDetail, type ScopedRoadmapData } from '../api'
import { useWidgetData } from '../useWidgetData'
import type { WidgetSize } from '../dashboardConfig'
import './workflowMap.css'

// A-5: 목표 · 학습 워크플로우 맵 — 예전엔 북마크한 공고 전부(암묵적 목표)를 그대로
// 썼지만, 이제는 왼쪽 패널에서 북마크 중 "목표로 삼을 것"을 직접 골라야 한다(안 B,
// 사이드 패널). 선택된 공고들의 요구 기술과 이력서 보유 기술을 좌우 DAG로 이어 "무엇을
// 어떤 순서로 배우면 좋은가"를 보여준다. 읽기 전용(드래그 연결 불가)이며 dagre로
// 좌→우 자동 배치한다. 순서는 추천이지 강제 선행 조건이 아니므로 엣지 라벨은 항상
// "함께 요구됨" 계열로 두고 "선수"/"prerequisite" 표현은 쓰지 않는다.

type SkillClass = 'owned' | 'target' | 'bridge'
type SkillNodeData = { label: string; cls: SkillClass; badge?: string; category?: string; [key: string]: unknown }
type SkillFlowNode = Node<SkillNodeData, 'skill'>

const CLASS_LABEL: Record<SkillClass, string> = { owned: '보유', target: '목표', bridge: '경유' }

function SkillNode({ data }: NodeProps<SkillFlowNode>) {
  return (
    <div className={`wfm-node wfm-node--${data.cls}`}>
      <Handle type="target" position={Position.Left} className="wfm-node__handle" />
      <span className="wfm-node__class">{CLASS_LABEL[data.cls]}</span>
      <span className="wfm-node__label" title={data.label}>{data.label}</span>
      {data.category && <span className="wfm-node__category">{data.category}</span>}
      {data.badge && <span className="wfm-node__badge">{data.badge}</span>}
      <Handle type="source" position={Position.Right} className="wfm-node__handle" />
    </div>
  )
}

const NODE_TYPES = { skill: SkillNode }
const NODE_W = 156
const NODE_H = 72

// 2b: 노드 4~5개짜리 짧은 체인도 데이터가 성긴 것처럼 보이지 않도록 랭크 간격을 살짝
// 좁혔다. 노드 수가 늘어도 dagre가 자동으로 배치하므로 큰 그래프의 가독성은 유지된다.
function layoutGraph(nodes: SkillFlowNode[], edges: Edge[]): SkillFlowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 18, ranksep: 50 })
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    return pos ? { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } } : n
  })
}

const CO_EDGE_STYLE = { stroke: '#9a9ca6', strokeWidth: 1.6 }
const CO_EDGE_LABEL_STYLE = { fontSize: 10, fill: '#7c7f88', fontWeight: 700 }
const CO_EDGE_LABEL_BG = { fill: '#fff', fillOpacity: 0.92 }
const CONTEXT_EDGE_STYLE = { stroke: '#d8dade', strokeWidth: 1 }

const MOCK_ROADMAP: ScopedRoadmapData = { start_matched: 0, total: 0, as_of: '', steps: [] }

// 목표 후보 아바타 색 — 회사명 해시로 고정 배정해 리렌더돼도 색이 흔들리지 않게 한다.
const AVATAR_PALETTE = ['#18181b', '#1f9d57', '#3b82f6', '#b45309', '#8b5cf6', '#0891b2']
function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

export function WorkflowMap({ size = '2x2' }: { size?: WidgetSize }) {
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
  const postingsWithMatch = useMemo(() => postings.map((p) => {
    const heldCount = p.skills.filter((s) => ownedSet.has(s)).length
    const matchPct = p.skills.length ? Math.round(((p.matched_count ?? heldCount) / p.skills.length) * 100) : 0
    return { detail: p, matchPct }
  }), [postings, ownedSet])

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

  const roadmapKey = identity && postingIds.length ? `${resumeId}:${postingIds.slice().sort().join(',')}` : 'idle'
  const roadmap = useWidgetData<ScopedRoadmapData>(
    identity && postingIds.length ? () => dashboardApi.roadmapScoped(identity, postingIds, 10) : null,
    MOCK_ROADMAP,
    roadmapKey,
  )

  const { nodes, edges } = useMemo(() => {
    const liveSteps = roadmap.value.steps
    const hasOrder = liveSteps.length > 0
    // 라이브 로드맵을 못 받는 경우(비로그인 · 이력서 없음)엔 선택된 공고들이 그 기술을
    // 몇 번이나 요구하는지로 대체 순서를 만든다 — delta/matched_after 없이 "N개 공고 요구"만 배지로 쓴다.
    const fallbackOrder = !hasOrder && targetSet.size > 0
      ? [...targetSet]
        .map((canonical) => ({ canonical, count: selectedPostings.filter((p) => p.skills.includes(canonical)).length }))
        .sort((a, b) => b.count - a.count)
      : []

    const ns: SkillFlowNode[] = []
    const es: Edge[] = []

    const ownedShown = ownedSkills.slice(0, 8)
    const ownedRest = ownedSkills.length - ownedShown.length
    const ownedIds: string[] = []
    ownedShown.forEach((skill) => {
      const id = `owned-${skill}`
      ownedIds.push(id)
      ns.push({ id, type: 'skill', position: { x: 0, y: 0 }, draggable: false, data: { label: skill, cls: 'owned' } })
    })
    if (ownedRest > 0) {
      ownedIds.push('owned-more')
      ns.push({ id: 'owned-more', type: 'skill', position: { x: 0, y: 0 }, draggable: false, data: { label: `+${ownedRest}개`, cls: 'owned' } })
    }

    const chainIds: string[] = []
    if (hasOrder) {
      liveSteps.forEach((step, i) => {
        const id = `step-${step.step}`
        chainIds.push(id)
        const cls: SkillClass = targetSet.has(step.canonical) ? 'target' : 'bridge'
        ns.push({
          id, type: 'skill', position: { x: 0, y: 0 }, draggable: false,
          data: {
            label: step.canonical, cls, category: step.category,
            badge: `+${step.delta.toLocaleString()}건 · 누적 ${step.matched_after.toLocaleString()}건`,
          },
        })
        if (i > 0) {
          const prevId = chainIds[i - 1]
          es.push({
            id: `${prevId}->${id}`, source: prevId, target: id, type: 'smoothstep',
            label: '함께 요구됨', markerEnd: { type: MarkerType.ArrowClosed, color: '#9a9ca6' },
            style: CO_EDGE_STYLE, labelStyle: CO_EDGE_LABEL_STYLE, labelBgStyle: CO_EDGE_LABEL_BG,
          })
        }
      })
    } else {
      fallbackOrder.forEach((item, i) => {
        const id = `fb-${i}`
        chainIds.push(id)
        ns.push({
          id, type: 'skill', position: { x: 0, y: 0 }, draggable: false,
          data: { label: item.canonical, cls: 'target', badge: `${item.count}개 공고 요구` },
        })
        if (i > 0) {
          const prevId = chainIds[i - 1]
          es.push({
            id: `${prevId}->${id}`, source: prevId, target: id, type: 'smoothstep',
            label: '함께 요구됨', markerEnd: { type: MarkerType.ArrowClosed, color: '#9a9ca6' },
            style: CO_EDGE_STYLE, labelStyle: CO_EDGE_LABEL_STYLE, labelBgStyle: CO_EDGE_LABEL_BG,
          })
        }
      })
    }

    // 보유 -> 첫 학습 스텝으로 옅은 컨텍스트 선(라벨 없음, 화살표 없음) — "지금 여기서 출발"만
    // 시각적으로 잇고, 순서를 강제하는 선행 조건처럼 보이지 않게 한다.
    if (chainIds.length > 0) {
      ownedIds.forEach((oid) => {
        es.push({
          id: `${oid}->${chainIds[0]}`, source: oid, target: chainIds[0], type: 'straight',
          style: CONTEXT_EDGE_STYLE,
        })
      })
    }

    return { nodes: layoutGraph(ns, es), edges: es }
  }, [roadmap.value, targetSet, selectedPostings, ownedSkills])

  const showNoBookmarks = bookmarkIds.length === 0
  const showNoSelection = !showNoBookmarks && selectedIds.length === 0
  const isLoading = !showNoBookmarks && !showNoSelection && (postingsLoading || (identity !== null && roadmap.loading))
  const canShowGraph = !showNoBookmarks && !showNoSelection && !isLoading

  // 2a: 크게 보기 — 같은 nodes/edges를 더 큰 캔버스에 그리는 오버레이 모달. 그래프
  // 자체는 다시 계산하지 않고 그대로 재사용하며, Escape·백드롭 클릭으로 닫는다.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  const legend = (
    <div className="wfm-legend">
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--owned" />보유</span>
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--target" />목표</span>
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--bridge" />경유</span>
    </div>
  )

  // 왼쪽 패널 — 북마크 전부를 체크박스 행으로 보여준다. 목표 선택 자체가 이 위젯의
  // 주된 진입점이라, "선택 0개" 상태에서도 이 패널만은 계속 온전히 보이고 조작 가능해야 한다.
  const goalPanel = (
    <div className="wfm-goal-panel" aria-label="목표로 삼을 북마크 선택">
      {postingsLoading && postingsWithMatch.length === 0 ? (
        <div className="wfm-goal-loading" role="status" aria-live="polite">북마크를 불러오는 중이에요.</div>
      ) : (
        <ul className="wfm-goal-list">
          {postingsWithMatch.map(({ detail, matchPct }) => {
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
          right={!showNoBookmarks ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!identity && <PreviewBadge />}
              {canShowGraph && (
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
          ) : undefined}
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
            {goalPanel}
            <div className="wfm-graph-pane">
              {showNoSelection ? (
                <div className="wfm-empty wfm-empty--selection">
                  <p className="wfm-empty__lead">북마크한 공고 중 목표로 삼을 걸 선택해보세요.</p>
                  <span className="wfm-empty__hint">왼쪽에서 하나 이상 체크하면 학습 순서가 나타나요.</span>
                </div>
              ) : isLoading ? (
                <div className="wfm-loading" role="status" aria-live="polite">워크플로우 맵을 그리는 중이에요.</div>
              ) : (
                <>
                  <div className="wfm-canvas" style={{ height: size === '2x2' ? 420 : 260 }}>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      nodeTypes={NODE_TYPES}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                      nodesDraggable={false}
                      nodesConnectable={false}
                      elementsSelectable={false}
                      panOnScroll
                      zoomOnScroll={false}
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background gap={18} size={1} color="#eceef3" />
                      <Controls showInteractive={false} />
                    </ReactFlow>
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
            <div className="wfm-modal__canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.35 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnScroll
                zoomOnScroll
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={18} size={1} color="#eceef3" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
            {legend}
          </div>
        </div>
      )}
    </>
  )
}
