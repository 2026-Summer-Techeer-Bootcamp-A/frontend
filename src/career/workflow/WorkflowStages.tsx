import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Award } from 'lucide-react'
import type { PostingDetail, ScopedRoadmapStep } from '../api'
import { classifySkill, avatarColor, requiredByFor, type SkillGroupName } from './workflowShared'
import { buildStages, type StageEdge, type Bundle } from './relations'

// 스테이지 뷰 — 목업(시안 B v2)의 학습 단계 컬럼 + 스킬 단위 관계선을 그대로 옮긴다.
// 좌표는 dagre 없이 실제 DOM 렌더 크기를 측정해서 그린다(레이아웃은 CSS flex가 맡고,
// 이 컴포넌트는 측정 결과로 SVG 오버레이만 그린다) — 카드 개수·문구 길이에 따라 카드
// 높이가 달라져도 화살표가 항상 카드에 정확히 붙는다.

const CARD_CAP = 6

type ColumnKey = 'start' | 1 | 2 | 3 | 'cert'

const COLUMN_META: Record<Exclude<ColumnKey, 'start' | 'cert'>, { step: string; title: string }> = {
  1: { step: '1단계', title: '지금 시작 가능' },
  2: { step: '2단계', title: '그 다음' },
  3: { step: '3단계', title: '심화' },
}

function countFor(canonical: string, selectedPostings: PostingDetail[]): number {
  return selectedPostings.filter((p) => p.skills.includes(canonical)).length
}

// 목업의 orthogonal polyline(라운드 코너) 함수를 그대로 옮긴다 — 하단 통로 라우팅에 쓴다.
function roundedPath(pts: { x: number; y: number }[], r: number): string {
  if (!pts.length) return ''
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const v1x = p0.x - p1.x
    const v1y = p0.y - p1.y
    const v2x = p2.x - p1.x
    const v2y = p2.y - p1.y
    const len1 = Math.hypot(v1x, v1y) || 1
    const len2 = Math.hypot(v2x, v2y) || 1
    const rr = Math.min(r, len1 / 2, len2 / 2)
    const e1x = p1.x + (v1x / len1) * rr
    const e1y = p1.y + (v1y / len1) * rr
    const e2x = p1.x + (v2x / len2) * rr
    const e2y = p1.y + (v2y / len2) * rr
    d += ` L${e1x} ${e1y} Q${p1.x} ${p1.y} ${e2x} ${e2y}`
  }
  const last = pts[pts.length - 1]
  d += ` L${last.x} ${last.y}`
  return d
}

type DrawnPath = {
  key: string
  from: string
  to: string
  d: string
  evidencePhrase?: string
  labelX?: number
  labelY?: number
}

// 엣지 오버레이 — 목업의 draw()/roundedPath()/레인 라우팅을 React 이펙트로 포팅한다.
// 컨테이너 크기 변화(ResizeObserver) · 창 리사이즈 · 폰트 로드(document.fonts.ready)
// 마다 requestAnimationFrame으로 디바운스해 다시 그린다.
function useEdgeOverlay(
  containerRef: RefObject<HTMLDivElement | null>,
  nodeMap: Map<string, HTMLElement>,
  edges: StageEdge[],
  columnIndexOf: (id: string) => number | undefined,
): DrawnPath[] {
  const [paths, setPaths] = useState<DrawnPath[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    function draw() {
      const cb = container!.getBoundingClientRect()
      if (!cb.width || !cb.height) return
      const flow = container!.querySelector('.wfs-flow') as HTMLElement | null
      const laneBase = flow ? flow.getBoundingClientRect().bottom - cb.top + 16 : cb.height - 50
      let corridorIndex = 0
      const next: DrawnPath[] = []
      edges.forEach((e) => {
        const a = nodeMap.get(e.from)
        const b = nodeMap.get(e.to)
        if (!a || !b) return
        const ra = a.getBoundingClientRect()
        const rb = b.getBoundingClientRect()
        const colA = columnIndexOf(e.from)
        const colB = columnIndexOf(e.to)
        const gap = colA !== undefined && colB !== undefined ? colB - colA : 1
        let d: string
        let labelX: number | undefined
        let labelY: number | undefined
        if (gap === 0) {
          // 같은 컬럼 안(예: CKAD -> CKA) — 세로로 쌓인 카드끼리는 위아래를 잇는다.
          const x1 = ra.left + ra.width / 2 - cb.left
          const y1 = ra.bottom - cb.top
          const x2 = rb.left + rb.width / 2 - cb.left
          const y2 = rb.top - cb.top
          const dy = Math.max(Math.abs(y2 - y1) * 0.5, 14)
          d = `M${x1} ${y1} C ${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`
        } else if (Math.abs(gap) >= 2) {
          // 컬럼을 2개 이상 건너뛰는 긴 선 — 카드 위를 지나지 않게 하단 통로로 우회한다.
          // 레인(lane)을 나눠 여러 통로 선이 겹치지 않게 한다.
          const lane = corridorIndex
          corridorIndex += 1
          const sx = ra.left + ra.width / 2 - cb.left
          const sy = ra.bottom - cb.top
          const laneY = laneBase + lane * 11
          const entryX = rb.left - cb.left
          const entryY = rb.top + rb.height / 2 - cb.top
          const ascentX = entryX - 22 + (lane - 1) * 7
          d = roundedPath(
            [
              { x: sx, y: sy },
              { x: sx, y: laneY },
              { x: ascentX, y: laneY },
              { x: ascentX, y: entryY },
              { x: entryX, y: entryY },
            ],
            10,
          )
          labelX = (sx + ascentX) / 2
          labelY = laneY
        } else {
          // 인접 컬럼 — 부드러운 베지어 곡선.
          const x1 = ra.right - cb.left
          const y1 = ra.top + ra.height / 2 - cb.top
          const x2 = rb.left - cb.left
          const y2 = rb.top + rb.height / 2 - cb.top
          const dx = Math.max(Math.abs(x2 - x1) * 0.45, 28)
          d = `M${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
        }
        next.push({ key: `${e.from}->${e.to}`, from: e.from, to: e.to, d, evidencePhrase: e.evidencePhrase, labelX, labelY })
      })
      setPaths(next)
    }

    let raf: number | null = null
    function schedule() {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = null
        draw()
      })
    }

    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(container)
    window.addEventListener('resize', schedule)
    let cancelled = false
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (!cancelled) schedule() })
    }
    return () => {
      cancelled = true
      if (raf !== null) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [containerRef, nodeMap, edges, columnIndexOf])

  return paths
}

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

  // 보유 요약 카드 — 총 개수 + 언어/프레임워크/기타 카운트. classifySkill을 재사용해
  // list 뷰·flow 뷰와 같은 분류 기준을 그대로 쓴다.
  const ownedGroupCounts = useMemo(() => {
    const counts: Record<SkillGroupName, number> = { 언어: 0, 프레임워크: 0, 기타: 0 }
    ownedSkills.forEach((s) => { counts[classifySkill(s, ownedSkillCategories[s])] += 1 })
    return counts
  }, [ownedSkills, ownedSkillCategories])

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

  const renderedColumnKeys = useMemo(() => {
    const keys: ColumnKey[] = ['start']
    ;([1, 2, 3] as const).forEach((d) => {
      const hasSkills = (skillsByColumn.get(d)?.length ?? 0) > 0
      const hasBundles = (bundlesByColumn.get(d)?.length ?? 0) > 0
      if (hasSkills || hasBundles) keys.push(d)
    })
    if (certColumn.length > 0) keys.push('cert')
    return keys
  }, [skillsByColumn, bundlesByColumn, certColumn])

  const columnPosition = useMemo(() => {
    const map = new Map<ColumnKey, number>()
    renderedColumnKeys.forEach((k, i) => map.set(k, i))
    return map
  }, [renderedColumnKeys])

  const certSet = useMemo(() => new Set(certColumn.map((c) => c.cert)), [certColumn])

  // columnIndexOf는 엣지 오버레이 이펙트의 의존값으로 쓰이므로, 매 렌더 새 클로저를
  // 만들면(예: hover만 바뀌어도 재생성) 이펙트가 계속 재실행돼 무한 재측정 루프에 빠진다.
  // 실제로 컬럼 구성이 바뀔 때만 참조가 바뀌도록 useMemo로 감싼다.
  const columnIndexOf = useMemo(() => {
    const columnKeyOfId = (id: string): ColumnKey | undefined => {
      if (ownedSet.has(id)) return 'start'
      if (certSet.has(id)) return 'cert'
      const d = depthBySkill.get(id)
      if (d === undefined) return undefined
      return Math.min(Math.max(d, 1), 3) as 1 | 2 | 3
    }
    return (id: string): number | undefined => {
      const key = columnKeyOfId(id)
      return key === undefined ? undefined : columnPosition.get(key)
    }
  }, [ownedSet, certSet, depthBySkill, columnPosition])

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

  const containerRef = useRef<HTMLDivElement>(null)
  const nodeMapRef = useRef<Map<string, HTMLElement>>(new Map())
  const registerNode = (id: string) => (el: HTMLElement | null) => {
    if (el) nodeMapRef.current.set(id, el)
    else nodeMapRef.current.delete(id)
  }

  // 카드 컨테이너(wfs-root) 크기 변화는 ResizeObserver가 잡아준다 — 카드가 늘거나
  // 줄어 컬럼 높이가 바뀌면 컨테이너 높이도 같이 바뀌므로 별도 트리거 없이 재측정된다.
  const paths = useEdgeOverlay(containerRef, nodeMapRef.current, edges, columnIndexOf)

  const renderBadges = (skill: string) => {
    const count = countFor(skill, selectedPostings)
    const requiredBy = requiredByFor(skill, selectedPostings)
    return (
      <div className="wfs-scard__foot">
        {count > 0 && <span className="wfs-badge wfs-badge--blue">{count}개 공고 요구</span>}
        {requiredBy.slice(0, 2).map((r) => (
          <span key={r.company} className="wfs-avatar" style={{ background: avatarColor(r.company) }}>
            {r.company.slice(0, 1)}
          </span>
        ))}
        {requiredBy.length > 2 && <span className="wfs-avatar-more">+{requiredBy.length - 2}</span>}
      </div>
    )
  }

  const renderSkillCard = (skill: string) => {
    const isTarget = !viaReasonBySkill.has(skill)
    const category = classifySkill(skill)
    const reason = viaReasonBySkill.get(skill)
    const altBadge = altBadgeBySkill.get(skill)
    return (
      <div
        key={skill}
        ref={registerNode(skill)}
        className={`wfs-scard${isTarget ? ' wfs-scard--goal' : ' wfs-scard--via'}${isDimmed(skill) ? ' wfs-dim' : ''}`}
        onMouseEnter={() => setHoveredId(skill)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="wfs-scard__name">
          {skill}
          <span className="wfs-chip-cat">{category}</span>
        </div>
        {reason && <div className="wfs-scard__reason">{reason}</div>}
        {renderBadges(skill)}
        {altBadge && <div className="wfs-scard__alt">{altBadge}</div>}
      </div>
    )
  }

  const renderBundleCard = (bundle: Bundle) => (
    <div key={bundle.label} className="wfs-bundle">
      <span className="wfs-bundle__label">{bundle.label}</span>
      {bundle.skills.map((skill) => {
        const rendered = depthBySkill.has(skill)
        const count = countFor(skill, selectedPostings)
        const requiredBy = requiredByFor(skill, selectedPostings)
        return (
          <div
            key={skill}
            ref={rendered ? registerNode(skill) : undefined}
            className={`wfs-bundle__row${rendered && isDimmed(skill) ? ' wfs-dim' : ''}`}
            onMouseEnter={rendered ? () => setHoveredId(skill) : undefined}
            onMouseLeave={rendered ? () => setHoveredId(null) : undefined}
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

  const renderColumnItem = (item: ColumnItem) => (item.kind === 'skill' ? renderSkillCard(item.skill) : renderBundleCard(item.bundle))

  const totalOwned = ownedSkills.length

  return (
    <div ref={containerRef} className={`wfs-root${wide ? ' wfs-root--wide' : ''}`}>
      <svg className="wfs-svg" aria-hidden="true">
        <defs>
          <marker id="wfsHead" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
            <path d="M0 0 L7 4 L0 8 Z" fill="#3b82f6" />
          </marker>
        </defs>
        {paths.map((p) => {
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

      <div className="wfs-flow">
        {renderedColumnKeys.map((key) => {
          if (key === 'start') {
            return (
              <div className="wfs-col" key="start">
                <div className="wfs-colhead">
                  <div className="wfs-step">시작</div>
                  <div className="wfs-steptitle">지금 보유</div>
                </div>
                <div className="wfs-body">
                  {totalOwned === 0 ? (
                    <div className="wfs-empty-note">아직 등록된 보유 기술이 없어요.</div>
                  ) : (
                    <div className="wfs-summary">
                      <div className="wfs-summary__big">{totalOwned}개</div>
                      <div className="wfs-summary__sub">비교 기준 스택</div>
                      <div className="wfs-summary__lines">
                        <div><span>언어</span><b>{ownedGroupCounts.언어}</b></div>
                        <div><span>프레임워크</span><b>{ownedGroupCounts.프레임워크}</b></div>
                        <div><span>기타</span><b>{ownedGroupCounts.기타}</b></div>
                      </div>
                      {ownedEdgeSources.size > 0 && (
                        <div className="wfs-chiprow">
                          {[...ownedEdgeSources].map((skill) => (
                            <span
                              key={skill}
                              ref={registerNode(skill)}
                              className={`wfs-chip${isDimmed(skill) ? ' wfs-dim' : ''}`}
                              onMouseEnter={() => setHoveredId(skill)}
                              onMouseLeave={() => setHoveredId(null)}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          if (key === 'cert') {
            return (
              <div className="wfs-col" key="cert">
                <div className="wfs-colhead">
                  <div className="wfs-step">자격증</div>
                </div>
                <div className="wfs-body">
                  {certColumn.slice(0, CARD_CAP).map((c) => (
                    <div
                      key={c.cert}
                      ref={registerNode(c.cert)}
                      className={`wfs-need-card${isDimmed(c.cert) ? ' wfs-dim' : ''}`}
                      onMouseEnter={() => setHoveredId(c.cert)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="wfs-need-card__name"><Award size={12} />{c.cert}</div>
                      {c.note && <div className="wfs-need-card__reason">{c.note}</div>}
                    </div>
                  ))}
                  {certColumn.length > CARD_CAP && (
                    <div className="wfs-overflow-row">+{certColumn.length - CARD_CAP}개</div>
                  )}
                </div>
              </div>
            )
          }
          const { items, overflow } = columnItemsFor(key)
          const meta = COLUMN_META[key]
          return (
            <div className="wfs-col" key={key}>
              <div className="wfs-colhead">
                <div className="wfs-step">{meta.step}</div>
                <div className="wfs-steptitle">{meta.title}</div>
              </div>
              <div className="wfs-body">
                {items.map(renderColumnItem)}
                {overflow > 0 && <div className="wfs-overflow-row">+{overflow}개</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
