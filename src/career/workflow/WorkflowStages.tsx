import { useMemo, useState } from 'react'
import { Award } from 'lucide-react'
import type { PostingDetail, ScopedRoadmapStep } from '../api'
import { classifySkill, avatarColor, requiredByFor, type SkillGroupName } from './workflowShared'
import { buildStages, type Bundle } from './relations'
import {
  layoutStages, roundedPath, estimateSkillCardHeight, estimateBundleHeight, estimateCertCardHeight,
  estimateStartSummaryHeight, estimateChipWidth, NODE_WIDTH, NODE_WIDTH_WIDE, COLUMN_GAP, CHIP_HEIGHT,
  type LayoutNode, type LayoutEdgeInput, type LayoutRect,
} from './workflowLayout'

// 스테이지 뷰 — 목업(시안 B v2)의 학습 단계 컬럼 + 스킬 단위 관계선을 그대로 옮긴다.
// 시안 4/5: 좌표는 더 이상 렌더 후 DOM을 측정해서 얻지 않는다(리사이즈·스크롤·폰트
// 로딩마다 재측정이 일어나 화살표가 흔들리던 원인). elkjs의 layered 알고리즘으로도
// 시도했으나, partitioning 힌트가 절대 제약이 아니라서 라이브 화면에서 스테이지 컬럼이
// 시각적으로 무너지는 문제가 있었다(노드가 컬럼 경계 없이 흩어짐) — "컬럼이 또렷한
// 세로 레인"이라는 요구가 협상 불가라서 elk를 걷어내고, workflowLayout.ts의
// layoutStages가 순수 함수로 컬럼 x(오직 컬럼 인덱스의 함수)와 컬럼 안 y(누적 스택)를
// 직접 계산하고, 엣지도 그 알려진 좌표에서 직교(orthogonal) polyline으로 직접
// 계산한다. 카드 크기는 "이 카드에 어떤 내용이 들어가는지"(이유/페이오프/대안 배지
// 유무, 번들 멤버 수 등)만으로 순수 추정한다 — DOM 측정도, 외부 레이아웃 엔진도 없는
// 완전한 순수 함수라 리사이즈/스크롤/폰트로딩과 100% 무관하고, useMemo 안에서 동기로
// 계산한다(비동기 로딩 상태가 아예 없다).
// 번들(goes_with)은 멤버 스킬을 각각 노드로 두지 않고 번들 박스 하나를 노드로
// 취급한다 — 번들 멤버를 가리키는 엣지는 번들 박스로 리다이렉트된다(호버 dim은 원래
// 스킬 단위 그대로 유지된다).

const CARD_CAP = 6
const SUMMARY_NODE_ID = '__wfs_summary__'

type ColumnKey = 'start' | 1 | 2 | 3 | 'cert'

const COLUMN_META: Record<Exclude<ColumnKey, 'start' | 'cert'>, { step: string; title: string }> = {
  1: { step: '1단계', title: '지금 시작 가능' },
  2: { step: '2단계', title: '그 다음' },
  3: { step: '3단계', title: '심화' },
}

function countFor(canonical: string, selectedPostings: PostingDetail[]): number {
  return selectedPostings.filter((p) => p.skills.includes(canonical)).length
}

function bundleNodeId(b: Bundle): string {
  return `bundle:${b.column}:${b.label}`
}

type DrawnPath = { key: string; from: string; to: string; d: string; evidencePhrase?: string }

export function WorkflowStages({
  ownedSkills,
  ownedSkillCategories,
  selectedPostings,
  targetSkills,
  targetCerts,
  ownedCerts,
  liveSteps,
  wide = false,
}: {
  ownedSkills: string[]
  ownedSkillCategories: Record<string, string>
  selectedPostings: PostingDetail[]
  targetSkills: string[]
  targetCerts: string[]
  ownedCerts: string[]
  liveSteps: ScopedRoadmapStep[]
  wide?: boolean
}) {
  const ownedSet = useMemo(() => new Set(ownedSkills), [ownedSkills])
  const nodeWidth = wide ? NODE_WIDTH_WIDE : NODE_WIDTH

  const stages = useMemo(
    () => buildStages(ownedSkills, targetSkills, targetCerts, ownedCerts),
    [ownedSkills, targetSkills, targetCerts, ownedCerts],
  )
  const { depthBySkill, edges, bundles, certColumn, viaSkills } = stages

  const viaReasonBySkill = useMemo(() => {
    const map = new Map<string, string>()
    viaSkills.forEach((v) => {
      if (v.neededFor.length > 0) map.set(v.skill, `${v.neededFor.join(', ')}에 필요해서 추가했어요`)
    })
    return map
  }, [viaSkills])

  const altBadgeBySkill = useMemo(() => {
    const map = new Map<string, string>()
    stages.altBadges.forEach((b) => {
      const existing = map.get(b.skill)
      map.set(b.skill, existing ? `${existing}, ${b.label}` : b.label)
    })
    return map
  }, [stages.altBadges])

  // 시안 3: "배우면 지원 가능 +N건" payoff — 억지로 새 계산을 만들지 않고, 라이브
  // 로드맵(roadmapScoped) 스텝에 이미 있는 delta(그 스킬을 그리디 순서에 넣었을 때
  // 매칭 공고 수가 늘어난 폭)를 그대로 쓴다. 로드맵이 비어 있으면(liveSteps.length===0)
  // 아무 카드에도 payoff가 붙지 않는다 — 근거 없는 숫자를 지어내지 않는다.
  const deltaBySkill = useMemo(() => {
    const map = new Map<string, number>()
    liveSteps.forEach((s) => { if (s.delta > 0) map.set(s.canonical, s.delta) })
    return map
  }, [liveSteps])

  // 보유 요약 카드 — 총 개수 + 언어/프레임워크/기타 카운트. classifySkill을 재사용해
  // list 뷰·flow 뷰와 같은 분류 기준을 그대로 쓴다.
  const ownedGroupCounts = useMemo(() => {
    const counts: Record<SkillGroupName, number> = { 언어: 0, 프레임워크: 0, 기타: 0 }
    ownedSkills.forEach((s) => { counts[classifySkill(s, ownedSkillCategories[s])] += 1 })
    return counts
  }, [ownedSkills, ownedSkillCategories])

  const totalOwned = ownedSkills.length

  // 엣지 출발점인 보유 스킬만 시작 컬럼에 칩으로 노출한다(전체 보유 스킬을 다 늘어놓으면
  // 이 카드가 list 뷰와 중복되는 정보가 된다 — 여기선 "무엇에서 시작하는지"만 보여준다).
  const ownedEdgeSources = useMemo(() => {
    const set = new Set<string>()
    edges.forEach((e) => { if (ownedSet.has(e.from)) set.add(e.from) })
    return set
  }, [edges, ownedSet])

  // 번들(goes_with) — 컬럼별로 묶고, 번들에 포함된 스킬은 개별 카드로 중복 렌더링하지
  // 않는다(번들 박스 안 한 행으로만 나온다).
  const bundlesByColumn = useMemo(() => {
    const map = new Map<number, Bundle[]>()
    bundles.forEach((b) => {
      if (b.column < 1) return // 멤버가 전부 보유라 컬럼0이면 학습 경로에 의미가 없어 생략한다.
      if (!map.has(b.column)) map.set(b.column, [])
      map.get(b.column)!.push(b)
    })
    return map
  }, [bundles])

  const bundleMemberSet = useMemo(() => {
    const set = new Set<string>()
    bundlesByColumn.forEach((list) => list.forEach((b) => b.skills.forEach((s) => set.add(s))))
    return set
  }, [bundlesByColumn])

  // 번들 멤버를 가리키는 엣지를 번들 박스 노드로 리다이렉트하는 매핑 — layoutStages가
  // 보는 노드 목록에서 번들은 멤버 하나하나가 아니라 박스 하나가 노드다.
  const skillToBundleId = useMemo(() => {
    const map = new Map<string, string>()
    bundlesByColumn.forEach((list) => list.forEach((b) => b.skills.forEach((s) => map.set(s, bundleNodeId(b)))))
    return map
  }, [bundlesByColumn])

  const hasOrder = liveSteps.length > 0
  const liveOrder = useMemo(() => new Map(liveSteps.map((s, i) => [s.canonical, i])), [liveSteps])
  const primaryKeyFor = (skill: string): number => {
    if (hasOrder) {
      const idx = liveOrder.get(skill)
      return idx !== undefined ? idx : Number.MAX_SAFE_INTEGER
    }
    return -countFor(skill, selectedPostings)
  }

  const skillsByColumn = useMemo(() => {
    const map = new Map<number, string[]>()
    depthBySkill.forEach((depth, skill) => {
      if (ownedSet.has(skill)) return
      if (depth < 1) return
      if (bundleMemberSet.has(skill)) return
      if (!map.has(depth)) map.set(depth, [])
      map.get(depth)!.push(skill)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primaryKeyFor는 매 렌더 새 클로저지만
    // depthBySkill/ownedSet/bundleMemberSet이 바뀔 때만 목록 자체가 바뀐다.
  }, [depthBySkill, ownedSet, bundleMemberSet])

  // 컬럼 하나(카드+번들)를 정렬 + 캡 처리한 아이템 목록으로 만든다.
  type ColumnItem = { kind: 'skill'; skill: string } | { kind: 'bundle'; bundle: Bundle }
  const columnItemsFor = (depth: 1 | 2 | 3): { items: ColumnItem[]; overflow: number } => {
    const skills = skillsByColumn.get(depth) ?? []
    const columnBundles = bundlesByColumn.get(depth) ?? []
    const items: ColumnItem[] = [
      ...skills.map((skill): ColumnItem => ({ kind: 'skill', skill })),
      ...columnBundles.map((bundle): ColumnItem => ({ kind: 'bundle', bundle })),
    ]
    const keyOf = (item: ColumnItem) => {
      if (item.kind === 'skill') return primaryKeyFor(item.skill)
      const rendered = item.bundle.skills.filter((s) => depthBySkill.has(s))
      if (rendered.length === 0) return Number.MAX_SAFE_INTEGER
      return Math.min(...rendered.map((s) => primaryKeyFor(s)))
    }
    items.sort((a, b) => keyOf(a) - keyOf(b))
    const capped = items.slice(0, CARD_CAP)
    return { items: capped, overflow: items.length - capped.length }
  }

  // 1/2/3단계 각각의 정렬+캡 결과 — 노드 목록 만들 때와 렌더할 때 둘 다 이 결과를 쓴다.
  const stageItemsByColumn = useMemo(() => {
    const map = new Map<1 | 2 | 3, { items: ColumnItem[]; overflow: number }>()
    ;([1, 2, 3] as const).forEach((d) => { map.set(d, columnItemsFor(d)) })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columnItemsFor는 매 렌더 새 클로저지만
    // 아래 값들이 바뀔 때만 실제 출력이 바뀐다.
  }, [skillsByColumn, bundlesByColumn, depthBySkill, hasOrder, liveOrder, selectedPostings])

  const renderedColumnKeys = useMemo(() => {
    const keys: ColumnKey[] = ['start']
    ;([1, 2, 3] as const).forEach((d) => {
      const { items } = stageItemsByColumn.get(d) ?? { items: [] }
      if (items.length > 0) keys.push(d)
    })
    if (certColumn.length > 0) keys.push('cert')
    return keys
  }, [stageItemsByColumn, certColumn])

  const columnPosition = useMemo(() => {
    const map = new Map<ColumnKey, number>()
    renderedColumnKeys.forEach((k, i) => map.set(k, i))
    return map
  }, [renderedColumnKeys])

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    edges.forEach((e) => {
      if (!map.has(e.from)) map.set(e.from, new Set())
      if (!map.has(e.to)) map.set(e.to, new Set())
      map.get(e.from)!.add(e.to)
      map.get(e.to)!.add(e.from)
    })
    return map
  }, [edges])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isDimmed = (id: string) => {
    if (!hoveredId) return false
    if (id === hoveredId) return false
    return !(neighbors.get(hoveredId)?.has(id) ?? false)
  }

  // layoutStages에 넘길 노드 목록 — 카드 크기는 DOM 측정이 아니라 렌더될 내용(이유/
  // payoff/대안 배지 유무, 번들 멤버 수)만으로 결정된다. column은 렌더링 순서와 동일한
  // 인덱스라 layoutStages가 이 순서 그대로 위에서부터 세로로 쌓는다.
  const nodeSpecs = useMemo<LayoutNode[]>(() => {
    const specs: LayoutNode[] = []
    const startCol = columnPosition.get('start') ?? 0

    specs.push({ id: SUMMARY_NODE_ID, column: startCol, width: nodeWidth, height: estimateStartSummaryHeight(totalOwned) })
    ownedEdgeSources.forEach((skill) => {
      specs.push({ id: skill, column: startCol, width: estimateChipWidth(skill), height: CHIP_HEIGHT })
    })

    ;([1, 2, 3] as const).forEach((depth) => {
      const col = columnPosition.get(depth)
      if (col === undefined) return
      const { items } = stageItemsByColumn.get(depth) ?? { items: [] }
      items.forEach((item) => {
        if (item.kind === 'skill') {
          const skill = item.skill
          const hasReason = viaReasonBySkill.has(skill)
          const hasPayoff = (deltaBySkill.get(skill) ?? 0) > 0
          const hasAlt = altBadgeBySkill.has(skill)
          specs.push({ id: skill, column: col, width: nodeWidth, height: estimateSkillCardHeight({ hasReason, hasPayoff, hasAlt }) })
        } else {
          specs.push({
            id: bundleNodeId(item.bundle),
            column: col,
            width: nodeWidth,
            height: estimateBundleHeight(item.bundle.skills.length, !!item.bundle.note),
          })
        }
      })
    })

    const certCol = columnPosition.get('cert')
    if (certCol !== undefined) {
      certColumn.slice(0, CARD_CAP).forEach((c) => {
        specs.push({ id: c.cert, column: certCol, width: nodeWidth, height: estimateCertCardHeight(!!c.note) })
      })
    }
    return specs
  }, [columnPosition, nodeWidth, totalOwned, ownedEdgeSources, stageItemsByColumn, viaReasonBySkill, deltaBySkill, altBadgeBySkill, certColumn])

  // layoutStages에 넘길 엣지 목록 — 번들 멤버를 가리키는 엣지는 번들 박스로
  // 리다이렉트한다. 양 끝이 같은 박스로 접히면(같은 번들 안 두 멤버 사이 엣지) 자기
  // 자신을 향하는 선이 되므로 뺀다.
  const { edgeInputs, edgeMeta } = useMemo(() => {
    const inputs: LayoutEdgeInput[] = []
    const meta = new Map<string, { evidencePhrase?: string; logicalFrom: string; logicalTo: string }>()
    edges.forEach((e) => {
      const from = skillToBundleId.get(e.from) ?? e.from
      const to = skillToBundleId.get(e.to) ?? e.to
      if (from === to) return
      const id = `${e.from}->${e.to}`
      inputs.push({ id, from, to })
      meta.set(id, { evidencePhrase: e.evidencePhrase, logicalFrom: e.from, logicalTo: e.to })
    })
    return { edgeInputs: inputs, edgeMeta: meta }
  }, [edges, skillToBundleId])

  // layoutStages는 순수 동기 함수다(DOM 측정도, 외부 레이아웃 엔진 호출도 없다) —
  // 비동기 로딩 상태 자체가 없으므로 nodeSpecs/edgeInputs/nodeWidth가 바뀔 때만
  // useMemo로 재계산한다.
  const layout = useMemo(() => layoutStages(nodeSpecs, edgeInputs, nodeWidth), [nodeSpecs, edgeInputs, nodeWidth])

  const renderLayout = useMemo(() => {
    const paths: DrawnPath[] = layout.edges.map((e) => {
      const meta = edgeMeta.get(e.id)
      return {
        key: e.id,
        from: meta?.logicalFrom ?? e.from,
        to: meta?.logicalTo ?? e.to,
        d: roundedPath(e.points, 8),
        evidencePhrase: meta?.evidencePhrase,
      }
    })
    return {
      width: layout.width + 4,
      height: layout.height + 4,
      rectOf: (id: string): LayoutRect | undefined => layout.nodes.get(id),
      columnBox: (colIndex: number) => layout.columns.get(colIndex) ?? { x: colIndex * (nodeWidth + COLUMN_GAP), width: nodeWidth },
      paths,
    }
  }, [layout, edgeMeta, nodeWidth])

  // 컬럼 안 넘친(overflow) 항목 배지의 위치 — 그 컬럼에서 실제 렌더된 항목들 중 가장
  // 아래에 있는 것 바로 밑에 붙인다.
  function overflowPosition(ids: string[]): { x: number; y: number; width: number } {
    let bottom = 0
    let x = 0
    let width = nodeWidth
    ids.forEach((id) => {
      const r = renderLayout?.rectOf(id)
      if (!r) return
      if (r.y + r.height > bottom) bottom = r.y + r.height
      x = r.x
      width = r.width
    })
    return { x, y: bottom + 8, width }
  }

  const renderBadges = (skill: string) => {
    const count = countFor(skill, selectedPostings)
    const requiredBy = requiredByFor(skill, selectedPostings)
    return (
      <div className="wfs-scard__demand">
        {count > 0 && <span className="wfs-badge wfs-badge--blue">{count}개 공고 요구</span>}
        {requiredBy.length > 0 && (
          <span className="wfs-scard__avatars">
            {requiredBy.slice(0, 3).map((r) => (
              <span key={r.company} className="wfs-avatar" style={{ background: avatarColor(r.company) }}>
                {r.company.slice(0, 1)}
              </span>
            ))}
            {requiredBy.length > 3 && <span className="wfs-avatar-more">+{requiredBy.length - 3}</span>}
          </span>
        )}
      </div>
    )
  }

  // 시안 3: 스킬명 -> 카테고리 -> 수요(공고 수 + 회사 아바타) -> (있으면) payoff 순으로
  // 여백 있게 배치한다. 카드 높이는 이 구성요소 유무만으로 미리 정확히 추정되므로(
  // workflowLayout.ts의 estimateSkillCardHeight) DOM에서 실제로 렌더되는 내용과
  // 어긋나지 않게, 각 블록은 항상 estimateSkillCardHeight가 가정한 것과 동일한 조건
  // (hasReason/hasPayoff/hasAlt)으로만 나타난다.
  const renderSkillCard = (skill: string) => {
    const rect = renderLayout?.rectOf(skill)
    if (!rect) return null
    const isTarget = !viaReasonBySkill.has(skill)
    const category = classifySkill(skill)
    const reason = viaReasonBySkill.get(skill)
    const altBadge = altBadgeBySkill.get(skill)
    const payoff = deltaBySkill.get(skill)
    return (
      <div
        key={skill}
        style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        className={`wfs-scard${isTarget ? ' wfs-scard--goal' : ' wfs-scard--via'}${isDimmed(skill) ? ' wfs-dim' : ''}`}
        onMouseEnter={() => setHoveredId(skill)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="wfs-scard__head">
          <span className="wfs-scard__name" title={skill}>{skill}</span>
          <span className="wfs-chip-cat">{category}</span>
        </div>
        {reason && <div className="wfs-scard__reason">{reason}</div>}
        {renderBadges(skill)}
        {payoff !== undefined && payoff > 0 && (
          <div className="wfs-scard__payoff">배우면 <b>+{payoff}건</b> 더 지원 가능</div>
        )}
        {altBadge && <div className="wfs-scard__alt">{altBadge}</div>}
      </div>
    )
  }

  const renderBundleCard = (bundle: Bundle) => {
    const id = bundleNodeId(bundle)
    const rect = renderLayout?.rectOf(id)
    if (!rect) return null
    return (
      <div
        key={id}
        style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        className="wfs-bundle"
      >
        <span className="wfs-bundle__label">{bundle.label}</span>
        {bundle.skills.map((skill) => {
          const count = countFor(skill, selectedPostings)
          const requiredBy = requiredByFor(skill, selectedPostings)
          return (
            <div
              key={skill}
              className={`wfs-bundle__row${isDimmed(skill) ? ' wfs-dim' : ''}`}
              onMouseEnter={() => setHoveredId(skill)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="wfs-bundle__row-name">{skill}</span>
              {count > 0 && <span className="wfs-badge wfs-badge--blue">{count}개 공고</span>}
              {requiredBy.slice(0, 2).map((r) => (
                <span key={r.company} className="wfs-avatar wfs-avatar--sm" style={{ background: avatarColor(r.company) }}>
                  {r.company.slice(0, 1)}
                </span>
              ))}
            </div>
          )
        })}
        {bundle.note && <div className="wfs-bundle__note">{bundle.note}</div>}
      </div>
    )
  }

  const renderColumnItem = (item: ColumnItem) => (item.kind === 'skill' ? renderSkillCard(item.skill) : renderBundleCard(item.bundle))

  return (
    <div className={`wfs-root${wide ? ' wfs-root--wide' : ''}`}>
      <div className="wfs-headrow" style={{ position: 'relative', width: renderLayout.width, height: 30 }}>
            {renderedColumnKeys.map((key) => {
              const colIndex = columnPosition.get(key) ?? 0
              const box = renderLayout.columnBox(colIndex)
              const step = key === 'start' ? '시작' : key === 'cert' ? '자격증' : COLUMN_META[key].step
              const title = key === 'start' ? '지금 보유' : key === 'cert' ? undefined : COLUMN_META[key].title
              return (
                <div key={String(key)} className="wfs-colhead" style={{ position: 'absolute', left: box.x, width: box.width }}>
                  <div className="wfs-step">{step}</div>
                  {title && <div className="wfs-steptitle">{title}</div>}
                </div>
              )
            })}
          </div>

          <div className="wfs-canvas" style={{ position: 'relative', width: renderLayout.width, height: renderLayout.height }}>
            <svg className="wfs-svg" width={renderLayout.width} height={renderLayout.height} aria-hidden="true">
              <defs>
                <marker id="wfsHead" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
                  <path d="M0 0 L7 4 L0 8 Z" fill="#3b82f6" />
                </marker>
              </defs>
              {renderLayout.paths.map((p) => {
                const dim = hoveredId !== null && hoveredId !== p.from && hoveredId !== p.to
                return (
                  <path
                    key={p.key}
                    className={`wfs-edge${dim ? ' wfs-edge--dim' : ''}`}
                    d={p.d}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd="url(#wfsHead)"
                  >
                    {p.evidencePhrase && <title>{p.evidencePhrase}</title>}
                  </path>
                )
              })}
            </svg>

            {(() => {
              const rect = renderLayout.rectOf(SUMMARY_NODE_ID)
              if (!rect) return null
              return (
                <div className="wfs-summary" style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
                  {totalOwned === 0 ? (
                    <div className="wfs-empty-note">아직 등록된 보유 기술이 없어요.</div>
                  ) : (
                    <>
                      <div className="wfs-summary__big">{totalOwned}개</div>
                      <div className="wfs-summary__sub">비교 기준 스택</div>
                      <div className="wfs-summary__lines">
                        <div><span>언어</span><b>{ownedGroupCounts.언어}</b></div>
                        <div><span>프레임워크</span><b>{ownedGroupCounts.프레임워크}</b></div>
                        <div><span>기타</span><b>{ownedGroupCounts.기타}</b></div>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            {[...ownedEdgeSources].map((skill) => {
              const rect = renderLayout.rectOf(skill)
              if (!rect) return null
              return (
                <span
                  key={skill}
                  style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                  className={`wfs-chip${isDimmed(skill) ? ' wfs-dim' : ''}`}
                  onMouseEnter={() => setHoveredId(skill)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {skill}
                </span>
              )
            })}

            {([1, 2, 3] as const).map((depth) => {
              if (!renderedColumnKeys.includes(depth)) return null
              const { items, overflow } = stageItemsByColumn.get(depth) ?? { items: [], overflow: 0 }
              const ids = items.map((item) => (item.kind === 'skill' ? item.skill : bundleNodeId(item.bundle)))
              const overflowPos = overflow > 0 ? overflowPosition(ids) : null
              return (
                <div key={depth}>
                  {items.map(renderColumnItem)}
                  {overflowPos && (
                    <div className="wfs-overflow-row" style={{ position: 'absolute', left: overflowPos.x, top: overflowPos.y, width: overflowPos.width }}>
                      +{overflow}개
                    </div>
                  )}
                </div>
              )
            })}

            {certColumn.length > 0 && (
              <>
                {certColumn.slice(0, CARD_CAP).map((c) => {
                  const rect = renderLayout.rectOf(c.cert)
                  if (!rect) return null
                  return (
                    <div
                      key={c.cert}
                      style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                      className={`wfs-need-card${isDimmed(c.cert) ? ' wfs-dim' : ''}`}
                      onMouseEnter={() => setHoveredId(c.cert)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="wfs-need-card__name"><Award size={12} />{c.cert}</div>
                      {c.note && <div className="wfs-need-card__reason">{c.note}</div>}
                    </div>
                  )
                })}
                {certColumn.length > CARD_CAP && (() => {
                  const pos = overflowPosition(certColumn.slice(0, CARD_CAP).map((c) => c.cert))
                  return (
                    <div className="wfs-overflow-row" style={{ position: 'absolute', left: pos.x, top: pos.y, width: pos.width }}>
                      +{certColumn.length - CARD_CAP}개
                    </div>
                  )
                })()}
              </>
            )}
      </div>
    </div>
  )
}
