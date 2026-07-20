import { useMemo, useState } from 'react'
import { Award, Check, CheckCircle2, AlertCircle } from 'lucide-react'
import type { PostingDetail, ScopedRoadmapStep } from '../api'
import {
  categoryBadgeLabel, avatarColor, requiredByFor, careerGateLabel, isCareerGateFulfilled,
  type PostingDetailWithConcepts,
} from './workflowShared'
import { buildStages, type Bundle, type ConceptNode } from './relations'
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
// F: 연차 게이트 — 그래프 엣지로 잇지 않는 알약형(pill) 노드라 layoutStages에 넘길 때도
// nodeSpecs에만 자리(칸)를 잡아줄 뿐 edgeInputs엔 절대 넣지 않는다. 높이는 estimate* 계열
// 함수처럼 workflowLayout.ts에 두지 않고 여기 로컬 상수로만 둔다(레이아웃 엔진 자체는
// 안 건드리는 순수 확장이라, 이 노드도 그 엔진이 이미 지원하는 "고정 크기 노드 하나"
// 계약만 쓴다).
const CAREER_GATE_ID = '__wfs_career_gate__'
const CAREER_GATE_HEIGHT = 56

// 5: 대안(alternative)을 이미 보유한 목표 스킬은 "당장 급하지 않다"는 신호라 정렬에서
// 뒤로 민다. 라이브 로드맵 순서(hasOrder일 때 liveOrder)나 요구 건수(-count) 기반
// 1차 키에 이 페널티를 더해, 같은 1차 기준 그룹 안에서는 순서를 보존하면서 대안 보유
// 스킬만 항상 그 뒤로 밀리게 한다.
const ALT_PRIORITY_PENALTY = 1_000_000

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
  // 3: 카운트 3줄 요약(언어/프레임워크/기타)을 매칭 보유 스킬 pill로 바꾸면서 이
  // 컴포넌트 안에서는 더 이상 쓰이지 않는다 — WorkflowMap.tsx가 여전히 넘겨주는
  // 프롭이라 시그니처엔 남기고 밑줄 프리픽스로 미사용 처리한다(list 뷰
  // WorkflowList.tsx는 이 프롭을 그대로 쓴다).
  ownedSkillCategories: _ownedSkillCategories,
  selectedPostings,
  targetSkills,
  targetCerts,
  ownedCerts,
  targetConcepts = [],
  careerGoalMin = null,
  resumeCareerMax = null,
  liveSteps,
  wide = false,
}: {
  ownedSkills: string[]
  ownedSkillCategories: Record<string, string>
  selectedPostings: PostingDetail[]
  targetSkills: string[]
  targetCerts: string[]
  ownedCerts: string[]
  // F: 4타입 확장 — 셋 다 옵셔널이다. 개념·자격증 정보가 아예 없는 직군(대부분)은 예전과
  // 똑같이 스킬만 그려진다(순수 확장, 크래시 없음).
  targetConcepts?: string[]
  careerGoalMin?: number | null
  resumeCareerMax?: number | null
  liveSteps: ScopedRoadmapStep[]
  wide?: boolean
}) {
  const ownedSet = useMemo(() => new Set(ownedSkills), [ownedSkills])
  const nodeWidth = wide ? NODE_WIDTH_WIDE : NODE_WIDTH
  // N: 목표가 1건뿐이면 모든 카드의 "N개 공고 요구"가 항상 1이라 정보량이 0이다 — 그
  // 줄과 회사 아바타 칩을 카드에서 아예 뺀다(여러 목표를 골랐을 때는 기존 동작 그대로).
  const singleGoal = selectedPostings.length === 1

  const stages = useMemo(
    () => buildStages(ownedSkills, targetSkills, targetCerts, ownedCerts, targetConcepts),
    [ownedSkills, targetSkills, targetCerts, ownedCerts, targetConcepts],
  )
  const { depthBySkill, edges, bundles, certColumn, viaSkills, concepts, ownedCertPrereqs } = stages

  // F: 개념 카테고리 뱃지 폴백 — concept_path 큐레이션에 category가 없으면(아직 안 큐레이션된
  // 목표 개념) 선택된 공고가 내려준 concepts[].category로라도 채운다. 둘 다 없으면 뱃지를
  // 안 그린다(근거 없는 카테고리를 지어내지 않는다).
  const conceptCategoryFromPostings = useMemo(() => {
    const map = new Map<string, string>()
    selectedPostings.forEach((p) => {
      const list = (p as PostingDetailWithConcepts).concepts ?? []
      list.forEach((c) => { if (c?.name && c.category && !map.has(c.name)) map.set(c.name, c.category) })
    })
    return map
  }, [selectedPostings])

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

  // 3: 보유 요약 카드 — 예전엔 "28개, 언어4/프레임워크8/기타16" 카운트 3줄만 보여줬는데,
  // 목표 공고가 실제로 요구하는 것 중 내가 이미 가진 스킬이 뭔지는 안 보였다. 선택된
  // 목표 공고들이 요구하는 스킬 중 보유한 것만 모아, 그 스킬을 요구하는 공고 수 내림차순
  // (여러 목표에서 겹치는 스킬을 우선)으로 정렬한다 — 카드엔 최대 4개만 이름으로 pill
  // 노출하고, 나머지는 renderColumnItem 아래 총 개수 캡션으로만 남는다.
  const matchedOwnedSkills = useMemo(() => {
    const counts = new Map<string, number>()
    selectedPostings.forEach((p) => {
      p.skills.forEach((s) => { if (ownedSet.has(s)) counts.set(s, (counts.get(s) ?? 0) + 1) })
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [selectedPostings, ownedSet])
  const shownOwnedPills = matchedOwnedSkills.slice(0, 4)

  const totalOwned = ownedSkills.length

  // 8: 매치 0%(보유와 겹치는 요구가 하나도 없음)여도 목표가 실제로 요구하는 스킬/개념/
  // 자격증 자체는(0%는 "그중 하나도 안 가졌다"는 뜻일 뿐) buildStages가 이미 전부
  // 단계 컬럼에 펼친다 — resolve()가 target마다 최소 depth 1을 매겨 depthBySkill에
  // 넣으므로, 보유 선행 체인이 있어야만 렌더되도록 걸러지는 필터는 애초에 없다(아래
  // hasAnyTargetData는 그걸 재확인하는 게 아니라, "그 필터링 결과가 우연히 비었다"와
  // "이 목표 공고 자체가 요구 스킬/개념/자격증을 하나도 추출하지 못했다"를 구분하기
  // 위한 것이다). 후자(진짜 데이터 공백)일 때만 정직한 안내를 보여준다 — 가짜 스킬을
  // 지어내 채우지 않는다.
  const hasAnyTargetData = targetSkills.length > 0 || targetCerts.length > 0 || targetConcepts.length > 0

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
    const base = hasOrder
      ? (liveOrder.get(skill) ?? Number.MAX_SAFE_INTEGER)
      : -countFor(skill, selectedPostings)
    // 5: 대안을 이미 보유했으면(altBadgeBySkill) 1차 기준 순위는 그대로 두되 큰 페널티를
    // 더해 항상 대안 없는 스킬들 뒤로 민다 — "지금 시작 가능"이 정말 급한 것부터 읽히게.
    return altBadgeBySkill.has(skill) ? base + ALT_PRIORITY_PENALTY : base
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

  // F: 개념 노드도 스킬과 같은 depth 컬럼(1~3)에 섞여 들어간다 — 별도 "개념 컬럼"을 새로
  // 만들지 않고, 기존 보유->경유->심화 컬럼 구조 안에서 타입 색(좌측 테두리)으로만
  // 구분한다(요구사항: 컬럼 구조는 유지, 안에서 타입이 섞인다).
  const conceptsByColumn = useMemo(() => {
    const map = new Map<number, ConceptNode[]>()
    concepts.forEach((c) => {
      const depth = Math.max(1, Math.min(3, c.depth))
      if (!map.has(depth)) map.set(depth, [])
      map.get(depth)!.push(c)
    })
    return map
  }, [concepts])

  // 컬럼 하나(카드+번들+개념)를 정렬 + 캡 처리한 아이템 목록으로 만든다.
  type ColumnItem = { kind: 'skill'; skill: string } | { kind: 'bundle'; bundle: Bundle } | { kind: 'concept'; node: ConceptNode }
  const columnItemsFor = (depth: 1 | 2 | 3): { items: ColumnItem[]; overflow: number } => {
    const skills = skillsByColumn.get(depth) ?? []
    const columnBundles = bundlesByColumn.get(depth) ?? []
    const columnConcepts = conceptsByColumn.get(depth) ?? []
    const items: ColumnItem[] = [
      ...skills.map((skill): ColumnItem => ({ kind: 'skill', skill })),
      ...columnBundles.map((bundle): ColumnItem => ({ kind: 'bundle', bundle })),
      ...columnConcepts.map((node): ColumnItem => ({ kind: 'concept', node })),
    ]
    const keyOf = (item: ColumnItem) => {
      if (item.kind === 'skill') return primaryKeyFor(item.skill)
      if (item.kind === 'concept') return Number.MAX_SAFE_INTEGER - 1 // 개념은 라이브 로드맵 순서 정보가 없어 항상 스킬/번들 뒤에 온다.
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
  }, [skillsByColumn, bundlesByColumn, conceptsByColumn, depthBySkill, hasOrder, liveOrder, selectedPostings])

  // 5: "먼저" 배지 — 정렬된 1단계(없으면 그다음 단계) 첫 항목이 "지금 당장 할 한 수"다.
  // 번들은 여러 스킬 묶음이라 "이거 하나"라는 신호가 약해 배지 대상에서 뺀다(스킬/개념
  // 카드에만 붙인다).
  const firstPriorityId = useMemo(() => {
    for (const d of [1, 2, 3] as const) {
      const { items } = stageItemsByColumn.get(d) ?? { items: [] }
      if (items.length === 0) continue
      const first = items[0]
      if (first.kind === 'skill') return first.skill
      if (first.kind === 'concept') return first.node.concept
      return null
    }
    return null
  }, [stageItemsByColumn])

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

    specs.push({ id: SUMMARY_NODE_ID, column: startCol, width: nodeWidth, height: estimateStartSummaryHeight(totalOwned, shownOwnedPills.length) })
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
          specs.push({ id: skill, column: col, width: nodeWidth, height: estimateSkillCardHeight({ hasReason, hasPayoff, hasAlt, hasDemand: !singleGoal }) })
        } else if (item.kind === 'bundle') {
          specs.push({
            id: bundleNodeId(item.bundle),
            column: col,
            width: nodeWidth,
            height: estimateBundleHeight(item.bundle.skills.length, !!item.bundle.note),
          })
        } else {
          // 개념 카드는 별도 estimate 함수를 새로 만들지 않고 스킬 카드와 같은 높이
          // 추정을 재사용한다 — note 유무만 "이유" 슬롯 유무로 취급한다(개념엔 수요줄/
          // payoff/대안 배지가 없으니 hasDemand는 항상 false다).
          specs.push({ id: item.node.concept, column: col, width: nodeWidth, height: estimateSkillCardHeight({ hasReason: !!item.node.note, hasPayoff: false, hasAlt: false, hasDemand: false }) })
        }
      })
    })

    const certCol = columnPosition.get('cert')
    if (certCol !== undefined) {
      // F: 목표 자격증이 이미 보유한 자격증을 선행으로 가리키면(예: CKS 목표 + CKA 보유),
      // 그 보유 자격증도 같은 컬럼에 작은 칩으로 먼저 놓는다 — CKA -> CKS 화살표가 허공에서
      // 시작하지 않게. 보유 스킬 칩(ownedEdgeSources)과 같은 크기 계약을 재사용한다.
      ownedCertPrereqs.forEach((cert) => {
        specs.push({ id: cert, column: certCol, width: estimateChipWidth(cert), height: CHIP_HEIGHT })
      })
      certColumn.slice(0, CARD_CAP).forEach((c) => {
        specs.push({ id: c.cert, column: certCol, width: nodeWidth, height: estimateCertCardHeight(!!c.note) })
      })
    }

    // F: 연차 게이트 — 그래프 엣지 없이, 가장 오른쪽(목표에 가장 가까운) 렌더된 컬럼에
    // 알약형 노드 하나만 얹는다. career_min 정보가 있는 목표 공고가 하나도 없으면
    // (careerGoalMin === null) 아예 렌더하지 않는다.
    if (careerGoalMin !== null) {
      const lastKey = renderedColumnKeys[renderedColumnKeys.length - 1]
      const lastCol = columnPosition.get(lastKey) ?? startCol
      specs.push({ id: CAREER_GATE_ID, column: lastCol, width: nodeWidth, height: CAREER_GATE_HEIGHT })
    }
    return specs
  }, [columnPosition, nodeWidth, totalOwned, shownOwnedPills, ownedEdgeSources, stageItemsByColumn, viaReasonBySkill, deltaBySkill, altBadgeBySkill, certColumn, ownedCertPrereqs, careerGoalMin, renderedColumnKeys, singleGoal])

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

  // "지금 보유" 그룹 배경 패널의 bounding box — 요약 카드(SUMMARY_NODE_ID)부터 그
  // 아래 쌓인 보유 스킬 칩들(ownedEdgeSources)까지 전부를 감싸는 사각형을 구해,
  // 시작 컬럼 전체가 하나의 덩어리로 보이게 하는 배경 패널(.wfs-start-group)을
  // 그린다. 순수하게 시각적인 오버레이라 layoutStages가 계산한 실제 노드 좌표는
  // 건드리지 않는다.
  const startGroupRect = useMemo(() => {
    const summaryRect = renderLayout.rectOf(SUMMARY_NODE_ID)
    if (!summaryRect) return null
    const startCol = columnPosition.get('start') ?? 0
    const box = renderLayout.columnBox(startCol)
    let bottom = summaryRect.y + summaryRect.height
    ownedEdgeSources.forEach((skill) => {
      const r = renderLayout.rectOf(skill)
      if (r) bottom = Math.max(bottom, r.y + r.height)
    })
    const pad = 12
    return { x: box.x - pad, y: summaryRect.y - pad, width: box.width + pad * 2, height: bottom - summaryRect.y + pad * 2 }
  }, [renderLayout, columnPosition, ownedEdgeSources])

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

  // N: 목표가 1건뿐이면(singleGoal) 모든 카드가 항상 "1개 공고 요구"만 반복해 정보량이
  // 0이라 이 블록 전체를 그리지 않는다 — nodeSpecs가 hasDemand: !singleGoal로 넘긴 높이
  // 추정과 반드시 짝을 맞춘다.
  const renderBadges = (skill: string) => {
    if (singleGoal) return null
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

  // 시안 3: 스킬명 -> 카테고리 -> (있으면 대안 배지) -> 이유 -> 수요(공고 수 + 회사
  // 아바타) -> (있으면) payoff 순으로 배치한다. 카드 높이는 이 구성요소 유무만으로
  // 미리 정확히 추정되므로(workflowLayout.ts의 estimateSkillCardHeight) DOM에서 실제로
  // 렌더되는 내용과 어긋나지 않게, 각 블록은 항상 estimateSkillCardHeight가 가정한 것과
  // 동일한 조건(hasReason/hasPayoff/hasAlt/hasDemand)으로만 나타난다.
  // 3차: 카드(.wfs-scard)와 "먼저" 배지는 더 이상 한 요소가 아니다 — 배지가
  // top:-8px로 카드 테두리 위에 살짝 걸치는데, 카드 자신은 내용을 가두려고
  // overflow:hidden을 쓰므로 배지를 카드 안에 넣으면 그 -8px만큼 잘려 나갔다.
  // 좌표만 갖는 슬롯(.wfs-node-slot, overflow 없음)을 감싸고 카드와 배지를 그
  // 슬롯의 형제로 두면, 카드 안쪽 텍스트는 여전히 슬롯 크기를 넘지 않게 잘리되
  // 배지는 카드 밖으로 걸쳐도 온전히 보인다.
  const renderSkillCard = (skill: string) => {
    const rect = renderLayout?.rectOf(skill)
    if (!rect) return null
    const isTarget = !viaReasonBySkill.has(skill)
    const category = categoryBadgeLabel(skill)
    const reason = viaReasonBySkill.get(skill)
    const altBadge = altBadgeBySkill.get(skill)
    const payoff = deltaBySkill.get(skill)
    const isFirst = skill === firstPriorityId
    return (
      <div key={skill} className="wfs-node-slot" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
        <div
          className={`wfs-scard wfs-type--skill${isTarget ? ' wfs-scard--goal' : ' wfs-scard--via'}${isFirst ? ' wfs-scard--first' : ''}${isDimmed(skill) ? ' wfs-dim' : ''}`}
          onMouseEnter={() => setHoveredId(skill)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="wfs-scard__head">
            <span className="wfs-scard__name" title={skill}>{skill}</span>
            <span className="wfs-chip-cat">{category}</span>
          </div>
          {/* 4: 대안(alternative)을 이미 보유했다는 신호는 카드 아래 묻히면 안 보이니
              헤더 바로 아래로 올려 눈에 띄게 한다(정렬에서도 뒤로 밀리지만, 카드 자체는
              눈에 잘 띄어야 "왜 뒤에 있는지" 이해가 된다). */}
          {altBadge && <div className="wfs-scard__altbadge"><Check size={10} /><span className="wfs-scard__altbadge-text">{altBadge}</span></div>}
          {reason && <div className="wfs-scard__reason">{reason}</div>}
          {renderBadges(skill)}
          {payoff !== undefined && payoff > 0 && (
            <div className="wfs-scard__payoff">배우면 <b>+{payoff}건</b> 더 지원 가능</div>
          )}
        </div>
        {isFirst && <span className="wfs-first-badge">먼저</span>}
      </div>
    )
  }

  // F: 개념 카드 — 스킬 목표 카드(wfs-scard--goal)와 같은 톤을 쓰되(개념은 항상 "목표"다,
  // 보유라는 상태가 없다) 좌측 테두리만 앰버로 바꿔 타입을 구분한다. 카테고리 뱃지는
  // concept_path 큐레이션 우선, 없으면 공고가 내려준 category로 폴백한다(둘 다 없으면
  // 뱃지 자체를 안 그린다 — 근거 없는 값을 지어내지 않는다).
  const renderConceptCard = (node: ConceptNode) => {
    const rect = renderLayout?.rectOf(node.concept)
    if (!rect) return null
    const category = node.category ?? conceptCategoryFromPostings.get(node.concept)
    const isFirst = node.concept === firstPriorityId
    return (
      <div key={node.concept} className="wfs-node-slot" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
        <div
          className={`wfs-scard wfs-scard--goal wfs-type--concept${isFirst ? ' wfs-scard--first' : ''}${isDimmed(node.concept) ? ' wfs-dim' : ''}`}
          onMouseEnter={() => setHoveredId(node.concept)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="wfs-scard__head">
            <span className="wfs-scard__name" title={node.concept}>{node.concept}</span>
            {category && <span className="wfs-chip-cat">{category}</span>}
          </div>
          {node.note && <div className="wfs-scard__reason">{node.note}</div>}
        </div>
        {isFirst && <span className="wfs-first-badge">먼저</span>}
      </div>
    )
  }

  const renderBundleCard = (bundle: Bundle) => {
    const id = bundleNodeId(bundle)
    const rect = renderLayout?.rectOf(id)
    if (!rect) return null
    return (
      <div key={id} className="wfs-node-slot" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
        <span className="wfs-bundle__label">{bundle.label}</span>
        <div className="wfs-bundle">
          {bundle.skills.map((skill) => {
            // N: 목표 1건일 때는 스킬 카드와 마찬가지로 "1개 공고" 반복을 뺀다.
            const count = singleGoal ? 0 : countFor(skill, selectedPostings)
            const requiredBy = singleGoal ? [] : requiredByFor(skill, selectedPostings)
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
      </div>
    )
  }

  const renderColumnItem = (item: ColumnItem) => {
    if (item.kind === 'skill') return renderSkillCard(item.skill)
    if (item.kind === 'concept') return renderConceptCard(item.node)
    return renderBundleCard(item.bundle)
  }

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

            {/* "지금 보유" 그룹 배경 — 요약 카드와 그 아래 보유 스킬 칩들을 하나의
                덩어리로 묶어 보이게 한다(startGroupRect 계산 참고). 카드/칩보다 먼저
                그려야 그 뒤(아래)로 깔린다. */}
            {startGroupRect && (
              <div
                className="wfs-start-group"
                style={{ position: 'absolute', left: startGroupRect.x, top: startGroupRect.y, width: startGroupRect.width, height: startGroupRect.height }}
              />
            )}

            {(() => {
              const rect = renderLayout.rectOf(SUMMARY_NODE_ID)
              if (!rect) return null
              return (
                <div className="wfs-summary" style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
                  {totalOwned === 0 ? (
                    <div className="wfs-empty-note">아직 등록된 보유 기술이 없어요.</div>
                  ) : (
                    <>
                      {/* 3: "28개, 언어4/프레임워크8/기타16" 카운트 요약 대신, 목표 공고가
                          요구하는 것 중 이미 가진 실제 스킬을 이름으로 보여준다 — 카운트는
                          "보유 기술 N개"라는 평범한 캡션으로만 내린다. */}
                      <div className="wfs-summary__caption">보유 기술 {totalOwned}개</div>
                      {shownOwnedPills.length > 0 ? (
                        <div className="wfs-summary__pills">
                          {shownOwnedPills.map((s) => <span key={s} className="wfs-summary__pill">{s}</span>)}
                        </div>
                      ) : (
                        <div className="wfs-summary__note">목표와 겹치는 보유 기술은 아직 없어요.</div>
                      )}
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
              const ids = items.map((item) => {
                if (item.kind === 'skill') return item.skill
                if (item.kind === 'concept') return item.node.concept
                return bundleNodeId(item.bundle)
              })
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

            {ownedCertPrereqs.map((cert) => {
              const rect = renderLayout.rectOf(cert)
              if (!rect) return null
              return (
                <span
                  key={cert}
                  style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                  className={`wfs-chip${isDimmed(cert) ? ' wfs-dim' : ''}`}
                  onMouseEnter={() => setHoveredId(cert)}
                  onMouseLeave={() => setHoveredId(null)}
                  title={`${cert} 보유 — 이 선행이 이미 충족됐어요`}
                >
                  <Check size={9} />
                  {cert}
                </span>
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
                      className={`wfs-need-card wfs-type--cert${isDimmed(c.cert) ? ' wfs-dim' : ''}`}
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

            {/* F: 연차 게이트 — 그래프 엣지 없는 알약형 노드. career_min 정보가 있는 목표
                공고가 하나도 없으면(careerGoalMin === null) 렌더하지 않는다. */}
            {careerGoalMin !== null && (() => {
              const rect = renderLayout.rectOf(CAREER_GATE_ID)
              if (!rect) return null
              const fulfilled = isCareerGateFulfilled(careerGoalMin, resumeCareerMax)
              return (
                <div
                  style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                  className={`wfs-career-gate wfs-type--career${fulfilled ? ' is-fulfilled' : ' is-unfulfilled'}`}
                >
                  {fulfilled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <div className="wfs-career-gate__text">
                    <span className="wfs-career-gate__label">{careerGateLabel(careerGoalMin)}</span>
                    <span className="wfs-career-gate__status">{fulfilled ? '충족' : '미충족'}</span>
                  </div>
                </div>
              )
            })()}
      </div>
      {/* 8: 이 목표 공고가 요구 스킬/개념/자격증을 하나도 추출하지 못한, 진짜 데이터
          공백일 때만 보여주는 정직한 안내 — 요구 데이터가 하나라도 있으면 위 컬럼들이
          전부 펼쳐지므로 이 블록은 그때는 렌더되지 않는다. */}
      {!hasAnyTargetData && (
        <div className="wfs-no-data-note">
          이 목표는 아직 분석된 요구 기술 데이터가 없어요. 공고에서 요구 스킬을 추출하지 못했어요.
        </div>
      )}
    </div>
  )
}
