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
