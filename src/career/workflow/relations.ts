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

type RelationsData = {
  requires: RequireEntry[]
  goes_with: GoesWithEntry[]
  alternative: AlternativeEntry[]
  cert_path: CertPathEntry[]
}

const DATA = relationsData as unknown as RelationsData
const REQUIRES_BY_TARGET = new Map<string, RequireEntry>(DATA.requires.map((r) => [r.target, r]))

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

export type StagesResult = {
  viaSkills: ViaSkill[]
  depthBySkill: Map<string, number>
  bundles: Bundle[]
  certColumn: CertPathEntry[]
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

  const viaSkills: ViaSkill[] = []
  depthBySkill.forEach((_depth, skill) => {
    if (ownedSet.has(skill) || targetSet.has(skill)) return
    viaSkills.push({ skill, neededFor: [...(neededForBySkill.get(skill) ?? [])] })
  })

  // 자격증 엣지 — cert_path에서 targetCerts에 있는 것만, prereq_skills 중 렌더된(=
  // depthBySkill에 있는) 스킬에서, prereq_certs 중 targetCerts에 같이 있는 자격증에서
  // 각각 화살표를 잇는다. CKA/CKAD처럼 데이터에 서로 관계가 없으면(둘 다 prereq_certs가
  // 없거나 서로를 가리키지 않으면) 자동으로 둘 사이 엣지가 생기지 않는다.
  const targetCertSet = new Set(targetCerts)
  DATA.cert_path.forEach((c) => {
    if (!targetCertSet.has(c.cert)) return
    c.prereq_skills.forEach((skill) => {
      if (depthBySkill.has(skill)) addEdge(skill, c.cert)
    })
    ;(c.prereq_certs ?? []).forEach((pc) => {
      if (targetCertSet.has(pc)) addEdge(pc, c.cert)
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
    edges: [...edgeMap.values()],
    altBadges,
  }
}
