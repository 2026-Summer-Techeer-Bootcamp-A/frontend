import { useEffect, useMemo, useState } from 'react'
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
import { dashboardApi, jobsApi, type Identity, type PostingDetail, type ScopedRoadmapData } from '../api'
import { useWidgetData } from '../useWidgetData'
import type { WidgetSize } from '../dashboardConfig'
import './workflowMap.css'

// A-5: 학습 워크플로우 맵 — 북마크한 공고(암묵적 목표)와 이력서 보유 기술을 좌우 DAG로
// 이어, "무엇을 어떤 순서로 배우면 좋은가"를 보여준다. 읽기 전용(드래그 연결 불가)이며
// dagre로 좌→우 자동 배치한다. 순서는 추천이지 강제 선행 조건이 아니므로 엣지 라벨은
// 항상 "함께 요구됨" 계열로 두고 "선수"/"prerequisite" 표현은 쓰지 않는다.

type SkillClass = 'owned' | 'target' | 'bridge'
type SkillNodeData = { label: string; cls: SkillClass; badge?: string; [key: string]: unknown }
type SkillFlowNode = Node<SkillNodeData, 'skill'>

const CLASS_LABEL: Record<SkillClass, string> = { owned: '보유', target: '목표', bridge: '경유' }

function SkillNode({ data }: NodeProps<SkillFlowNode>) {
  return (
    <div className={`wfm-node wfm-node--${data.cls}`}>
      <Handle type="target" position={Position.Left} className="wfm-node__handle" />
      <span className="wfm-node__class">{CLASS_LABEL[data.cls]}</span>
      <span className="wfm-node__label" title={data.label}>{data.label}</span>
      {data.badge && <span className="wfm-node__badge">{data.badge}</span>}
      <Handle type="source" position={Position.Right} className="wfm-node__handle" />
    </div>
  )
}

const NODE_TYPES = { skill: SkillNode }
const NODE_W = 156
const NODE_H = 58

function layoutGraph(nodes: SkillFlowNode[], edges: Edge[]): SkillFlowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 18, ranksep: 58 })
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

export function WorkflowMap({ size = '2x2' }: { size?: WidgetSize }) {
  const { activeResume } = useResumesState()
  const ownedSkills = useMemo(() => activeResume?.skills ?? [], [activeResume])
  const ownedSet = useMemo(() => new Set(ownedSkills), [ownedSkills])
  const bookmarkIds = useBookmarks()
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const identity: Identity | null = Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null

  const [postings, setPostings] = useState<PostingDetail[]>([])
  const [postingsLoading, setPostingsLoading] = useState(false)
  useEffect(() => {
    if (bookmarkIds.length < 2) {
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

  const postingIds = useMemo(() => postings.map((p) => Number(p.id)), [postings])
  const targetSet = useMemo(() => {
    const set = new Set<string>()
    postings.forEach((p) => p.skills.forEach((s) => { if (!ownedSet.has(s)) set.add(s) }))
    return set
  }, [postings, ownedSet])

  const roadmapKey = identity && postingIds.length ? `${resumeId}:${postingIds.slice().sort().join(',')}` : 'idle'
  const roadmap = useWidgetData<ScopedRoadmapData>(
    identity && postingIds.length ? () => dashboardApi.roadmapScoped(identity, postingIds, 6) : null,
    MOCK_ROADMAP,
    roadmapKey,
  )

  const { nodes, edges } = useMemo(() => {
    const liveSteps = roadmap.value.steps
    const hasOrder = liveSteps.length > 0
    // 라이브 로드맵을 못 받는 경우(비로그인 · 이력서 없음)엔 북마크 공고들이 그 기술을
    // 몇 번이나 요구하는지로 대체 순서를 만든다 — delta/matched_after 없이 "N개 공고 요구"만 배지로 쓴다.
    const fallbackOrder = !hasOrder && targetSet.size > 0
      ? [...targetSet]
        .map((canonical) => ({ canonical, count: postings.filter((p) => p.skills.includes(canonical)).length }))
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
          data: { label: step.canonical, cls, badge: `+${step.delta.toLocaleString()}건` },
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
  }, [roadmap.value, targetSet, postings, ownedSkills])

  const showEmpty = bookmarkIds.length < 2
  const isLoading = !showEmpty && (postingsLoading || (identity !== null && roadmap.loading))

  return (
    <div className="dcard wfm-card">
      <SectionHeader
        title="학습 워크플로우 맵"
        hint="북마크 목표 기반 추천 순서"
        right={!showEmpty && !identity ? <PreviewBadge /> : undefined}
      />
      {showEmpty ? (
        <div className="wfm-empty">
          <p className="wfm-empty__lead">북마크한 공고를 목표로 학습 경로를 그려드려요.</p>
          <span className="wfm-empty__hint">공고를 2개 이상 북마크하면 워크플로우 맵이 나타나요.</span>
          {ownedSkills.length > 0 && (
            <div className="wfm-empty__owned">
              <span className="wfm-empty__owned-label">지금 보유한 기술</span>
              <div className="wfm-empty__chips">
                {ownedSkills.slice(0, 12).map((s) => <span key={s} className="wfm-chip wfm-chip--owned">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="wfm-loading" role="status" aria-live="polite">워크플로우 맵을 그리는 중이에요.</div>
      ) : (
        <>
          <div className="wfm-canvas" style={{ height: size === '2x2' ? 360 : 260 }}>
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
          <div className="wfm-legend">
            <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--owned" />보유</span>
            <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--target" />목표</span>
            <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--bridge" />경유</span>
          </div>
          {roadmap.value.as_of && <AsOf asOf={roadmap.value.as_of} n={roadmap.value.total} />}
        </>
      )}
    </div>
  )
}
