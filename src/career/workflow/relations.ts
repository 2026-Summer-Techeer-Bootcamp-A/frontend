// 스킬 관계 로직 — src/data/skillRelations.json(큐레이션+통계 검증 정본)을 읽어 "무엇을
// 먼저 배워야 하는지"(requires), "같이 배우면 좋은지"(goes_with), "하나만 깊게 파도
// 되는지"(alternative), "자격증 선행이 무엇인지"(cert_path)를 계산하는 순수 함수만
// 모은다. WorkflowStages.tsx가 이 모듈의 결과를 그대로 렌더링에 쓴다. React나 DOM에는
// 전혀 의존하지 않는다(노드 테스트로 검증 가능).
import relationsData from '../../data/skillRelations.json' with { type: 'json' }

export type EvidenceLevel = 'strong' | 'moderate' | 'weak' | 'contradicted'

export type PerPrereqEvidence = {
  cooccur: number
  count_prereq: number
  count_target: number
  p_prereq_given_target: number
  p_target_given_prereq: number
  level: EvidenceLevel
}

export type RequireEvidence = {
  level: EvidenceLevel
  per_prereq: Record<string, PerPrereqEvidence>
}

export type RequireEntry = {
  target: string
  prereq: string[]
  mode: 'all' | 'any'
  primary?: string
  note?: string
  evidence?: RequireEvidence
  curator_verdict?: Record<string, { decision: string; reason: string }>
}

export type GoesWithEntry = { skills: string[]; label: string; note?: string; context?: string }
export type AlternativeEntry = { skills: string[]; label: string; note?: string }
export type CertPathEntry = {
  cert: string
  prereq_skills: string[]
  prereq_certs?: string[]
  note?: string
}
// concept_path — cert_path와 같은 꼴이지만 target이 "개념"(예: MSA·마이크로서비스, 대규모
// 트래픽)이다. 개념 이름은 data-collector-script/concepts_taxonomy.json의 canonical
// 서브키와 맞춘다(별개 사전이지만 이름은 하나로 통일해야 나중에 백엔드 concepts 필드와
// 그대로 매칭된다). prereq_concepts로 개념끼리도 선후 관계를 이룰 수 있다(예: MSA ->
// 대규모 트래픽).
export type ConceptPathEntry = {
  concept: string
  prereq_skills: string[]
  prereq_concepts?: string[]
  category?: string
  note?: string
}

type RelationsData = {
  requires: RequireEntry[]
  goes_with: GoesWithEntry[]
  alternative: AlternativeEntry[]
  cert_path: CertPathEntry[]
  concept_path?: ConceptPathEntry[]
}

const DATA = relationsData as unknown as RelationsData
const REQUIRES_BY_TARGET = new Map<string, RequireEntry>(DATA.requires.map((r) => [r.target, r]))
// concept_path는 스킬-only 직군(대부분)에서는 아예 없을 수 있어 옵셔널로 두고 빈 배열로
// 폴백한다 — 순수 확장이라 concept_path가 없어도 buildStages는 이전과 동일하게 동작한다.
const CONCEPT_PATH: ConceptPathEntry[] = DATA.concept_path ?? []
const CONCEPTS_BY_NAME = new Map<string, ConceptPathEntry>(CONCEPT_PATH.map((c) => [c.concept, c]))

// 근거 문구 최소 기준 — evidence.level이 strong/moderate일 때만 통계를 사람이 읽을 문장
// 으로 노출한다. weak/contradicted는(예: iOS의 Swift/Objective-C 선행처럼 태깅 관행 때문에
// 통계가 역전된 경우) 큐레이터 판단(curator_verdict)으로는 관계를 유지하되, 근거 없는
// 수치 주장은 절대 하지 않는다.
const EVIDENCE_PHRASE_LEVELS: ReadonlySet<EvidenceLevel> = new Set(['strong', 'moderate'])

// mode any에서 실제로 어느 prereq가 "이 관계를 만족시켰는지"(owned로 만족됐든, via로
// 새로 삽입됐든) 고르는 단일 선택 규칙 — primary가 있고 그게 보유돼 있으면 그것부터,
// 아니면 목록 순서상 처음 보유된 것, 그래도 없으면(전부 미보유) primary(없으면 첫 항목)
// 를 고른다. inferPrereqs의 any 분기와 반드시 같은 우선순위를 써야 depth 계산과 엣지가
// 서로 어긋나지 않는다.
function pickAnyPrereq(entry: RequireEntry, ownedSet: ReadonlySet<string>): string {
  if (entry.primary && ownedSet.has(entry.primary)) return entry.primary
  const ownedFound = entry.prereq.find((p) => ownedSet.has(p))
  if (ownedFound) return ownedFound
  return entry.primary ?? entry.prereq[0]
}

// 2: inferPrereqs — target의 requires 항목에서 "미충족" 선행만 반환한다. mode any는
// prereq 중 하나라도 보유하면 이미 충족된 것이므로 빈 배열, 전부 미보유면 primary(없으면
// 첫 항목) 하나만 경유로 반환한다. mode all은 미보유 prereq 전부를 반환한다. requires에
// target 항목 자체가 없으면(선행 정보가 없는 스킬) 빈 배열이다.
export function inferPrereqs(target: string, ownedSet: ReadonlySet<string>): string[] {
  const entry = REQUIRES_BY_TARGET.get(target)
  if (!entry) return []
  if (entry.mode === 'any') {
    const hasOwned = entry.prereq.some((p) => ownedSet.has(p))
    if (hasOwned) return []
    return [entry.primary ?? entry.prereq[0]]
  }
  return entry.prereq.filter((p) => !ownedSet.has(p))
}

// 엣지 출발점 — inferPrereqs(미충족만)와 달리, 엣지는 "실제 선후 관계"를 그대로 보여줘야
// 하므로 이미 보유해서 충족된 prereq에서도 화살표가 출발해야 한다(예: Git 보유 ->
// GitHub Actions). mode all은 prereq 전부가 각각 화살표 출발점이고, mode any는 관계를
// 만족시킨(혹은 만족시킬) prereq 단 하나만 출발점이다(여러 개를 동시에 그리면 "둘 다
// 필요하다"는 mode all과 구별이 안 된다).
function edgeSourcesFor(entry: RequireEntry, ownedSet: ReadonlySet<string>): string[] {
  if (entry.mode === 'all') return entry.prereq
  return [pickAnyPrereq(entry, ownedSet)]
}

function evidencePhraseFor(entry: RequireEntry, prereq: string): string | undefined {
  const ev = entry.evidence?.per_prereq[prereq]
  if (!ev || !EVIDENCE_PHRASE_LEVELS.has(ev.level)) return undefined
  const pct = Math.round(ev.p_prereq_given_target * 100)
  return `${entry.target} 공고의 ${pct}%가 ${prereq}도 요구`
}

export type StageEdge = { from: string; to: string; evidencePhrase?: string }
export type ViaSkill = { skill: string; neededFor: string[] }
export type Bundle = { skills: string[]; label: string; note?: string; column: number }
export type AltBadge = { skill: string; label: string }
// 개념 노드 — depth는 스킬과 동일한 컬럼 체계(1~3, MAX_DEPTH 캡)를 공유해 스테이지 뷰가
// 같은 컬럼 안에 스킬/개념을 섞어 배치할 수 있게 한다. category/note는 concept_path에
// 큐레이션이 있을 때만 채워진다(없는 목표 개념도 depth 1로 그냥 렌더된다 — graceful
// degrade, 근거 없는 카테고리·설명을 지어내지 않는다).
export type ConceptNode = { concept: string; depth: number; category?: string; note?: string }

export type StagesResult = {
  viaSkills: ViaSkill[]
  depthBySkill: Map<string, number>
  bundles: Bundle[]
  certColumn: CertPathEntry[]
  // 목표 자격증이 prereq_certs로 가리키는 "이미 보유한" 자격증 — 예: CKS(목표)가 CKA를
  // 선행으로 요구하는데 CKA를 이미 갖고 있으면, CKA는 certColumn(미보유 목표만)엔 안
  // 잡히지만 그래도 그래프에 "보유·충족된 선행"으로 보여줘야 CKS로 들어오는 화살표가
  // 허공에서 시작하지 않는다.
  ownedCertPrereqs: string[]
  concepts: ConceptNode[]
  edges: StageEdge[]
  altBadges: AltBadge[]
}

const MAX_DEPTH = 3

// 3: buildStages — 보유/목표 스킬·자격증에서 렌더에 필요한 전부(깊이, 경유 스킬, 번들,
// 자격증 컬럼, 엣지, 대안 배지)를 한 번에 계산한다. depth는 재귀로 구한다 — 스킬 X의
// depth는 보유면 0, 아니면 "X의 미충족 선행들의 depth 중 최댓값 + 1"(선행이 없거나 전부
// 보유면 0 + 1 = 1)이다. 이 재귀 자체가 경유(via) 스킬을 발견하는 과정과 같다 — X를
// 풀다가 만난 미충족 선행이 targetSkills에 없으면 그게 경유다. 최대 3으로 캡한다(그
// 이상은 UI가 어차피 "심화" 한 컬럼에 뭉뚱그린다).
export function buildStages(
  ownedSkills: string[],
  targetSkills: string[],
  targetCerts: string[],
  ownedCerts: string[],
  targetConcepts: string[] = [],
): StagesResult {
  const ownedSet = new Set(ownedSkills)
  const targetSet = new Set(targetSkills)
  const ownedCertSet = new Set(ownedCerts)

  const depthBySkill = new Map<string, number>()
  ownedSkills.forEach((s) => depthBySkill.set(s, 0))

  const neededForBySkill = new Map<string, Set<string>>()
  const edgeMap = new Map<string, StageEdge>()
  const visiting = new Set<string>()

  function addEdge(from: string, to: string, evidencePhrase?: string) {
    const key = `${from}->${to}`
    if (!edgeMap.has(key)) edgeMap.set(key, { from, to, evidencePhrase })
  }

  function recordNeededFor(skill: string, parent: string) {
    if (!neededForBySkill.has(skill)) neededForBySkill.set(skill, new Set())
    neededForBySkill.get(skill)!.add(parent)
  }

  // resolve(skill) — 재귀적으로 depth를 구하며, 그 과정에서 만나는 모든 실제 선후 관계를
  // 엣지로 기록한다. visiting은 데이터에 순환이 있어도(있으면 안 되지만) 무한 재귀에
  // 빠지지 않게 하는 방어용 가드다.
  function resolve(skill: string): number {
    if (ownedSet.has(skill)) return 0
    const cached = depthBySkill.get(skill)
    if (cached !== undefined) return cached
    if (visiting.has(skill)) return 0
    visiting.add(skill)

    const entry = REQUIRES_BY_TARGET.get(skill)
    let depth = 1
    if (entry) {
      edgeSourcesFor(entry, ownedSet).forEach((p) => {
        addEdge(p, skill, evidencePhraseFor(entry, p))
        if (!ownedSet.has(p)) recordNeededFor(p, skill)
      })
      const unmet = inferPrereqs(skill, ownedSet)
      if (unmet.length > 0) {
        const childDepths = unmet.map((p) => resolve(p))
        depth = 1 + Math.max(...childDepths)
      }
    }
    depth = Math.min(depth, MAX_DEPTH)
    depthBySkill.set(skill, depth)
    visiting.delete(skill)
    return depth
  }

  targetSkills.forEach((t) => resolve(t))

  // 개념 depth — 스킬과 같은 재귀 패턴이지만 별도 맵(depthByConcept)에 쌓는다. 개념의
  // prereq_skills는 이미 만난 스킬이 아니어도(예: 목표 스킬 목록엔 없는 Redis) resolve()를
  // 그대로 호출해 새 경유 스킬로 편입시킨다 — "Docker(스킬) -> MSA(개념)"처럼 크로스타입
  // 선행이 실제로 그래프에 나타나야 하기 때문이다. prereq_concepts는 재귀적으로
  // resolveConcept를 호출해 개념끼리도 선후 사슬(MSA -> 대규모 트래픽)을 만든다. 큐레이션이
  // 없는 목표 개념(concept_path에 없음)은 depth 1, 엣지 없이 그냥 렌더된다(graceful
  // degrade).
  const depthByConcept = new Map<string, number>()
  const visitingConcept = new Set<string>()
  function resolveConcept(concept: string): number {
    const cached = depthByConcept.get(concept)
    if (cached !== undefined) return cached
    if (visitingConcept.has(concept)) return 0
    visitingConcept.add(concept)

    const entry = CONCEPTS_BY_NAME.get(concept)
    let depth = 1
    if (entry) {
      const skillDepths = entry.prereq_skills.map((s) => {
        const d = resolve(s)
        addEdge(s, concept)
        if (!ownedSet.has(s)) recordNeededFor(s, concept)
        return d
      })
      const conceptDepths = (entry.prereq_concepts ?? []).map((c) => {
        const d = resolveConcept(c)
        addEdge(c, concept)
        return d
      })
      const allDepths = [...skillDepths, ...conceptDepths]
      if (allDepths.length > 0) depth = 1 + Math.max(...allDepths)
    }
    depth = Math.min(depth, MAX_DEPTH)
    depthByConcept.set(concept, depth)
    visitingConcept.delete(concept)
    return depth
  }
  targetConcepts.forEach((c) => resolveConcept(c))

  const viaSkills: ViaSkill[] = []
  depthBySkill.forEach((_depth, skill) => {
    if (ownedSet.has(skill) || targetSet.has(skill)) return
    viaSkills.push({ skill, neededFor: [...(neededForBySkill.get(skill) ?? [])] })
  })

  const concepts: ConceptNode[] = targetConcepts.map((concept) => {
    const entry = CONCEPTS_BY_NAME.get(concept)
    return { concept, depth: depthByConcept.get(concept) ?? 1, category: entry?.category, note: entry?.note }
  })

  // 자격증 엣지 — cert_path에서 targetCerts에 있는 것만, prereq_skills 중 렌더된(=
  // depthBySkill에 있는) 스킬에서, prereq_certs 중 targetCerts에 같이 있거나 이미 보유한
  // 자격증에서 각각 화살표를 잇는다. CKA/CKAD처럼 데이터에 서로 관계가 없으면(둘 다
  // prereq_certs가 없거나 서로를 가리키지 않으면) 자동으로 둘 사이 엣지가 생기지 않는다.
  // 목표 자격증이 이미 보유한 자격증을 선행으로 가리키면(CKS 목표 + CKA 보유) 그 보유
  // 자격증도 ownedCertPrereqs에 모아 화살표 시작점이 허공에 뜨지 않게 한다.
  const targetCertSet = new Set(targetCerts)
  const ownedCertPrereqSet = new Set<string>()
  DATA.cert_path.forEach((c) => {
    if (!targetCertSet.has(c.cert)) return
    c.prereq_skills.forEach((skill) => {
      if (depthBySkill.has(skill)) addEdge(skill, c.cert)
    })
    ;(c.prereq_certs ?? []).forEach((pc) => {
      if (targetCertSet.has(pc)) {
        addEdge(pc, c.cert)
      } else if (ownedCertSet.has(pc)) {
        addEdge(pc, c.cert)
        ownedCertPrereqSet.add(pc)
      }
    })
  })

  // 번들 — goes_with 그룹 중 "렌더 대상"(보유·경유·목표로 이미 화면에 나오는) 스킬을
  // 2개 이상 포함하는 것만 그린다. 배치 컬럼은 그 렌더된 멤버들의 depth 중 최댓값이다.
  const bundles: Bundle[] = []
  DATA.goes_with.forEach((group) => {
    const rendered = group.skills.filter((s) => depthBySkill.has(s))
    if (rendered.length < 2) return
    const column = Math.max(...rendered.map((s) => depthBySkill.get(s) ?? 0))
    bundles.push({ skills: group.skills, label: group.label, note: group.note, column })
  })

  // 대안 배지 — target 스킬이 alternative 그룹의 멤버이고, 같은 그룹의 다른 멤버를 이미
  // 보유 중이면 "대안 X 보유" 배지를 붙인다(예: React 목표인데 Vue를 이미 보유).
  const altBadges: AltBadge[] = []
  targetSkills.forEach((skill) => {
    DATA.alternative.forEach((group) => {
      if (!group.skills.includes(skill)) return
      const ownedAlt = group.skills.filter((s) => s !== skill && ownedSet.has(s))
      if (ownedAlt.length > 0) altBadges.push({ skill, label: `대안 ${ownedAlt.join(', ')} 보유` })
    })
  })

  const certColumn = DATA.cert_path.filter((c) => targetCertSet.has(c.cert) && !ownedCertSet.has(c.cert))

  return {
    viaSkills,
    depthBySkill,
    bundles,
    certColumn,
    ownedCertPrereqs: [...ownedCertPrereqSet],
    concepts,
    edges: [...edgeMap.values()],
    altBadges,
  }
}
