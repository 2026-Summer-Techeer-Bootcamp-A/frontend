// @ts-nocheck -- Node's built-in test types are not part of the app tsconfig.
import assert from 'node:assert/strict'
import test from 'node:test'
import { inferPrereqs, buildStages } from './relations.ts'

// (1) iOS 목표 + Swift 미보유 -> Swift가 경유로 삽입되고 depth 1, iOS depth 2.
// RxSwift까지 목표로 잡으면 iOS 기반 심화라 depth 3이 된다.
test('iOS 목표에서 미보유 Swift가 경유로 삽입되고 depth가 단계별로 쌓인다', () => {
  const result = buildStages([], ['iOS', 'RxSwift'], [], [])

  const swift = result.viaSkills.find((v) => v.skill === 'Swift')
  assert.ok(swift, 'Swift가 경유 스킬로 삽입돼야 한다')
  assert.deepEqual(swift.neededFor, ['iOS'])

  assert.equal(result.depthBySkill.get('Swift'), 1)
  assert.equal(result.depthBySkill.get('iOS'), 2)
  assert.equal(result.depthBySkill.get('RxSwift'), 3)

  const swiftToIos = result.edges.find((e) => e.from === 'Swift' && e.to === 'iOS')
  assert.ok(swiftToIos, 'Swift -> iOS 엣지가 있어야 한다')
  const iosToRxswift = result.edges.find((e) => e.from === 'iOS' && e.to === 'RxSwift')
  assert.ok(iosToRxswift, 'iOS -> RxSwift 엣지가 있어야 한다')
})

// (2) JavaScript를 이미 보유하고 있으면 React는 mode any 선행 중 하나가 이미 충족된
// 것이므로 경유 없이 바로 depth 1이 된다.
test('JavaScript 보유 시 React는 경유 없이 depth 1', () => {
  const result = buildStages(['JavaScript'], ['React'], [], [])

  assert.equal(result.viaSkills.some((v) => v.skill === 'React'), false)
  assert.equal(result.depthBySkill.get('React'), 1)

  const jsToReact = result.edges.find((e) => e.from === 'JavaScript' && e.to === 'React')
  assert.ok(jsToReact, 'JavaScript -> React 엣지는 보유 스킬에서도 그려져야 한다')
})

// (3) NestJS는 mode all(Node.js, TypeScript 둘 다 필요). JavaScript만 보유한 상태라
// Node.js와 TypeScript 둘 다 미보유분이라 전부 경유로 삽입돼야 한다.
test('NestJS(mode all)는 미보유 선행 전부를 경유로 삽입한다', () => {
  const result = buildStages(['JavaScript'], ['NestJS'], [], [])

  const viaSkillNames = result.viaSkills.map((v) => v.skill).sort()
  assert.deepEqual(viaSkillNames, ['Node.js', 'TypeScript'])
  result.viaSkills.forEach((v) => assert.deepEqual(v.neededFor, ['NestJS']))

  assert.equal(result.depthBySkill.get('Node.js'), 1)
  assert.equal(result.depthBySkill.get('TypeScript'), 1)
  assert.equal(result.depthBySkill.get('NestJS'), 2)
})

// (4) Git을 이미 보유하고 GitHub Actions를 목표로 잡으면, mode all(단일 선행)이 이미
// 충족돼 있으므로 depth는 1이고 엣지는 보유 칩인 Git에서 출발해야 한다.
test('Git 보유 + GitHub Actions 목표는 Git에서 출발하는 엣지와 depth 1을 낸다', () => {
  const result = buildStages(['Git'], ['GitHub Actions'], [], [])

  assert.equal(result.depthBySkill.get('GitHub Actions'), 1)
  const edge = result.edges.find((e) => e.from === 'Git' && e.to === 'GitHub Actions')
  assert.ok(edge, 'Git -> GitHub Actions 엣지가 있어야 한다')
  assert.equal(edge.evidencePhrase, 'GitHub Actions 공고의 17%가 Git도 요구')
})

// (5) CKAD와 CKA를 둘 다 목표 자격증으로 잡아도, 데이터에 둘 사이 관계가 없으므로
// 절대 서로를 잇는 엣지가 생기면 안 된다. 둘 다 Kubernetes에서만 엣지를 받는다.
test('CKAD와 CKA는 서로 엣지가 없고 둘 다 Kubernetes에서만 엣지를 받는다', () => {
  const result = buildStages(['Docker'], ['Kubernetes'], ['CKAD', 'CKA'], [])

  assert.ok(result.edges.some((e) => e.from === 'Kubernetes' && e.to === 'CKAD'))
  assert.ok(result.edges.some((e) => e.from === 'Kubernetes' && e.to === 'CKA'))
  assert.equal(result.edges.some((e) => e.from === 'CKAD' && e.to === 'CKA'), false)
  assert.equal(result.edges.some((e) => e.from === 'CKA' && e.to === 'CKAD'), false)

  const certNames = result.certColumn.map((c) => c.cert).sort()
  assert.deepEqual(certNames, ['CKA', 'CKAD'])
})

// (6) evidence가 없거나(자격증 엣지) 통계 근거 등급이 strong/moderate에 못 미치면(iOS의
// Swift 선행은 "contradicted") evidencePhrase는 반드시 undefined여야 한다 — 근거 없는
// 수치 주장을 하지 않기 위해서다.
test('evidence가 부족한 관계는 evidencePhrase가 undefined다', () => {
  const iosResult = buildStages([], ['iOS'], [], [])
  const swiftToIos = iosResult.edges.find((e) => e.from === 'Swift' && e.to === 'iOS')
  assert.ok(swiftToIos)
  assert.equal(swiftToIos.evidencePhrase, undefined)

  const certResult = buildStages(['Docker'], ['Kubernetes'], ['CKAD'], [])
  const kubeToCkad = certResult.edges.find((e) => e.from === 'Kubernetes' && e.to === 'CKAD')
  assert.ok(kubeToCkad)
  assert.equal(kubeToCkad.evidencePhrase, undefined)
})

// inferPrereqs 단독 동작도 확인한다 — buildStages 내부에서만 간접 검증하지 않고, mode
// any/all 각각의 최소 계약을 직접 확인한다.
test('inferPrereqs는 mode any에서 하나라도 보유하면 빈 배열을 반환한다', () => {
  assert.deepEqual(inferPrereqs('React', new Set(['JavaScript'])), [])
  assert.deepEqual(inferPrereqs('React', new Set([])), ['JavaScript'])
})

test('inferPrereqs는 mode all에서 미보유 선행 전부를 반환한다', () => {
  assert.deepEqual(inferPrereqs('NestJS', new Set([])).sort(), ['Node.js', 'TypeScript'])
  assert.deepEqual(inferPrereqs('NestJS', new Set(['Node.js'])), ['TypeScript'])
})

// concept_path 확장 — (7) Docker 미보유 + MSA·마이크로서비스 목표. Docker/Spring이
// 경유 스킬로 삽입되고, Docker/Spring -> MSA 크로스타입 엣지가 생긴다.
test('MSA 목표에서 미보유 Docker/Spring이 경유로 삽입되고 개념으로 엣지가 이어진다', () => {
  const result = buildStages([], [], [], [], ['MSA·마이크로서비스'])

  const dockerVia = result.viaSkills.find((v) => v.skill === 'Docker')
  assert.ok(dockerVia, 'Docker가 경유 스킬로 삽입돼야 한다')
  assert.deepEqual(dockerVia.neededFor, ['MSA·마이크로서비스'])

  const dockerToMsa = result.edges.find((e) => e.from === 'Docker' && e.to === 'MSA·마이크로서비스')
  assert.ok(dockerToMsa, 'Docker -> MSA 엣지가 있어야 한다')
  const springToMsa = result.edges.find((e) => e.from === 'Spring' && e.to === 'MSA·마이크로서비스')
  assert.ok(springToMsa, 'Spring -> MSA 엣지가 있어야 한다')

  const msaNode = result.concepts.find((c) => c.concept === 'MSA·마이크로서비스')
  assert.ok(msaNode, 'MSA가 concepts에 포함돼야 한다')
  // MSA의 prereq_skills(Spring, Docker) 각각이 자기 자신의 미보유 선행(Java, Linux)까지
  // 경유로 끌고 오므로 depth는 1단이 아니라 "Java/Linux(1) -> Spring/Docker(2) -> MSA(3)"
  // 3단으로 쌓인다 — 크로스타입 엣지가 스킬 쪽 기존 재귀 depth 계산을 그대로 흡수한다.
  assert.equal(msaNode.depth, 3)
})

// (8) 개념끼리도 선후 사슬을 이룬다 — 대규모 트래픽은 MSA·마이크로서비스를 prereq_concepts로
// 가리키므로, 둘 다 목표로 잡으면 MSA -> 대규모 트래픽 엣지가 생기고 대규모 트래픽의
// depth가 MSA보다 깊어야 한다. Java/Linux를 보유시켜 Spring/Docker depth를 1로 낮춰두면
// MAX_DEPTH(3) 캡에 걸리지 않고 순수하게 depth 순서만 검증할 수 있다.
test('개념끼리 선후 사슬이 있으면 depth가 쌓이고 개념 간 엣지가 생긴다', () => {
  const result = buildStages(['Java', 'Linux'], [], [], [], ['MSA·마이크로서비스', '대규모 트래픽'])

  const msaToTraffic = result.edges.find((e) => e.from === 'MSA·마이크로서비스' && e.to === '대규모 트래픽')
  assert.ok(msaToTraffic, 'MSA -> 대규모 트래픽 엣지가 있어야 한다')

  const msaDepth = result.concepts.find((c) => c.concept === 'MSA·마이크로서비스')?.depth ?? 0
  const trafficDepth = result.concepts.find((c) => c.concept === '대규모 트래픽')?.depth ?? 0
  assert.ok(trafficDepth > msaDepth, '대규모 트래픽 depth가 MSA depth보다 깊어야 한다')
})

// (9) 큐레이션 없는 목표 개념은 depth 1, 엣지 없이 그냥 렌더된다(graceful degrade) —
// concept_path에 없는 이름이어도 크래시 없이 concepts 배열에 나타나야 한다.
test('concept_path에 없는 개념은 depth 1로 그레이스풀 디그레이드된다', () => {
  const result = buildStages([], [], [], [], ['존재하지 않는 개념'])
  const node = result.concepts.find((c) => c.concept === '존재하지 않는 개념')
  assert.ok(node)
  assert.equal(node.depth, 1)
  assert.equal(node.category, undefined)
  assert.equal(result.edges.some((e) => e.to === '존재하지 않는 개념'), false)
})

// (10) 자격증 선행이 이미 보유한 자격증을 가리키면(CKS 목표 + CKA 보유) ownedCertPrereqs에
// 잡히고, CKA -> CKS 엣지가 생겨야 한다(허공에서 시작하는 화살표 방지).
test('목표 자격증이 보유 자격증을 선행으로 가리키면 ownedCertPrereqs와 엣지가 생긴다', () => {
  const result = buildStages(['Kubernetes'], [], ['CKS'], ['CKA'])
  assert.deepEqual(result.ownedCertPrereqs, ['CKA'])
  const edge = result.edges.find((e) => e.from === 'CKA' && e.to === 'CKS')
  assert.ok(edge, 'CKA -> CKS 엣지가 있어야 한다')
})

// (11) 기존 스킬-only 호출(5번째 인자 생략)은 예전과 동일하게 동작해야 한다 — 순수 확장
// 계약 확인.
test('targetConcepts를 생략해도 기존 스킬-only 동작은 그대로다', () => {
  const result = buildStages(['JavaScript'], ['React'], [], [])
  assert.equal(result.depthBySkill.get('React'), 1)
  assert.deepEqual(result.concepts, [])
})
