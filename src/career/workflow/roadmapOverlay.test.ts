// @ts-nocheck -- Node's built-in test types are not part of the app tsconfig (relations.test.ts와 동일한 실행 방식).
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRoadmapOverlay, effectiveOwnedSkills } from './roadmapOverlay.ts'
import { loadRoadmapTrack } from '../../data/roadmaps/registry.ts'

const track = loadRoadmapTrack('backend')

// (1) 백본은 항상 51개 노드, 11개 섹션을 갖는다 — 로그인/북마크 여부와 무관하게 항상
// 이 크기로 그려진다는 것 자체가 "게스트에서도 꽉 찬 백본" 요구의 데이터 쪽 증거다.
test('backend 트랙은 30개 이상의 노드와 11개 섹션을 갖는다', () => {
  assert.ok(track.nodes.length >= 30, `노드 수는 30개 이상이어야 한다(실제 ${track.nodes.length})`)
  assert.equal(track.sections.length, 11)
})

// (2) prereqs 무결성 — 모든 prereq id는 실제로 존재하는 노드를 가리켜야 한다.
test('모든 prereq id는 실존하는 노드를 가리킨다', () => {
  const ids = new Set(track.nodes.map((n) => n.id))
  track.nodes.forEach((n) => {
    n.prereqs.forEach((p) => {
      assert.ok(ids.has(p), `${n.id}의 prereq ${p}가 존재하지 않는다`)
    })
  })
})

// (3) 섹션 순서 규칙 — prereq는 자기 자신과 같은 섹션이거나 더 앞선 섹션만 가리켜야
// 한다(types.ts의 데이터 제작 규칙). 이 규칙이 깨지면 렌더러가 위에서 아래로 그리는
// 트리에서 "아직 그려지지 않은 뒤 섹션 노드"를 참조하게 된다.
test('모든 prereq는 같은 섹션이거나 더 앞선 섹션을 가리킨다', () => {
  const sectionOrder = new Map(track.sections.map((s) => [s.id, s.order]))
  const nodeById = new Map(track.nodes.map((n) => [n.id, n]))
  track.nodes.forEach((n) => {
    n.prereqs.forEach((p) => {
      const prereqNode = nodeById.get(p)
      assert.ok(prereqNode, `${p}가 존재해야 한다`)
      const selfOrder = sectionOrder.get(n.section)
      const prereqOrder = sectionOrder.get(prereqNode.section)
      assert.ok(prereqOrder <= selfOrder, `${n.id}(섹션 ${n.section})의 prereq ${p}(섹션 ${prereqNode.section})가 더 뒤 섹션을 가리킨다`)
      if (prereqOrder === selfOrder) {
        assert.ok(prereqNode.order < n.order, `같은 섹션 안에서 ${p}의 order가 ${n.id}보다 작아야 한다`)
      }
    })
  })
})

// (4) 실제로 매칭되는 스킬이 하나도 없으면(존재하지 않는 더미 스킬만 넘겨 게스트
// 폴백을 우회한다 — ownedSkills가 진짜 빈 배열이면 게스트 폴백이 적용되므로 여기서는
// 일부러 매칭 안 되는 값을 넣는다) prereq 없는 루트 노드만 unlockable(스킬/자격증)
// 또는 owned(개념 — prereq가 없으면 자동으로 cleared)이고, 나머지는 전부 locked다.
test('매칭되는 보유 스킬이 없으면 루트 노드만 잠기지 않는다', () => {
  const overlay = buildRoadmapOverlay(track, ['__no_match__'], [])
  const rootIds = track.nodes.filter((n) => n.prereqs.length === 0).map((n) => n.id)
  rootIds.forEach((id) => {
    assert.notEqual(overlay.statusById.get(id), 'locked', `루트 노드 ${id}는 잠겨 있으면 안 된다`)
  })
  assert.equal(overlay.statusById.get('django'), 'locked', 'Python 없이 Django는 잠겨 있어야 한다')
})

// (5) Python을 보유하면 Django(스킬)는 unlockable(아직 소유는 아니지만 배울 수 있음)로
// 바뀐다.
test('Python 보유 시 Django는 unlockable이 된다', () => {
  const overlay = buildRoadmapOverlay(track, ['Python'], [])
  assert.equal(overlay.statusById.get('python'), 'owned')
  assert.equal(overlay.statusById.get('django'), 'unlockable')
})

// (6) 개념 노드는 이력서로 "보유"할 수 없으므로, 그 prereq가 전부 충족되면 곧바로
// owned로 표시된다(unlockable 상태를 거치지 않는다). internet/http는 스킬 앵커가
// 전혀 없는 순수 개념 사슬이라 아무것도 보유하지 않아도 처음부터 owned다(뿌리
// 노드가 스킬이면 곧바로 unlockable인 것과 대칭). 반면 REST API 설계는 SQL(스킬)을
// prereq로 두므로, SQL을 보유하기 전까지는 잠겨 있어야 한다 — 순수 개념 사슬만으로는
// 절대 "무료로" 달성되지 않게 하려고 일부러 스킬 앵커를 하나 걸어뒀다.
test('스킬 앵커가 없는 순수 개념 사슬은 처음부터 owned, 스킬 앵커가 있으면 그 스킬 보유 전까지 잠긴다', () => {
  const overlay = buildRoadmapOverlay(track, ['__no_match__'], [])
  assert.equal(overlay.statusById.get('internet'), 'owned', 'prereq 없는 concept는 처음부터 owned다')
  assert.equal(overlay.statusById.get('http'), 'owned', 'http는 internet에만 기대는 순수 개념 사슬이라 처음부터 owned다')
  assert.equal(overlay.statusById.get('rest-api'), 'locked', 'REST API 설계는 SQL을 보유하기 전까지 잠겨 있어야 한다')

  const overlayWithSql = buildRoadmapOverlay(track, ['SQL'], [])
  assert.equal(overlayWithSql.statusById.get('rest-api'), 'owned', 'SQL을 보유하면 REST API 설계도 owned가 된다')
})

// (7) 개념 체인 — Spring까지 보유하면 MSA·마이크로서비스concept가 owned로 풀린다
// (MSA의 유일한 prereq가 spring이므로).
test('Spring 보유 시 MSA 개념이 owned로 풀린다', () => {
  const overlay = buildRoadmapOverlay(track, ['Java', 'Spring'], [])
  assert.equal(overlay.statusById.get('spring'), 'owned')
  assert.equal(overlay.statusById.get('msa'), 'owned')
})

// (8) 진척 게이지 — owned/total이 실제 상태 맵의 owned 개수와 일치해야 한다.
test('progress.owned는 상태 owned 노드 수와 일치한다', () => {
  const overlay = buildRoadmapOverlay(track, ['Python', 'Git'], [])
  let counted = 0
  overlay.statusById.forEach((s) => { if (s === 'owned') counted += 1 })
  assert.equal(overlay.progress.owned, counted)
  assert.equal(overlay.progress.total, track.nodes.length)
})

// (9) 섹션 달성 — foundations 섹션의 recommended 노드 4개(internet/http/git/
// terminal-basics) 중 git만 보유하면(terminal-basics 미보유) achieved는 false이고,
// 둘 다 보유하면(internet/http는 스킬 앵커 없는 순수 개념이라 항상 owned) true다.
test('섹션의 recommended 노드가 전부 owned여야만 achieved가 true다', () => {
  const partial = buildRoadmapOverlay(track, ['Git'], [])
  assert.equal(partial.sectionProgress.get('foundations')?.achieved, false, 'terminal-basics가 없으면 achieved가 아니어야 한다')

  const full = buildRoadmapOverlay(track, ['Git', '터미널 기초'], [])
  assert.equal(full.sectionProgress.get('foundations')?.achieved, true, 'recommended 노드 4개가 전부 owned면 achieved여야 한다')
})

// (10) 강조 — targetSkills/targetConcepts에 있는 라벨과 매칭되는 노드만 highlightedIds에
// 들어간다.
test('목표 스킬/개념 라벨이 하이라이트 집합에 들어간다', () => {
  const overlay = buildRoadmapOverlay(track, [], [], ['Docker', 'Kafka'], ['MSA·마이크로서비스'])
  assert.ok(overlay.highlightedIds.has('docker'))
  assert.ok(overlay.highlightedIds.has('kafka'))
  assert.ok(overlay.highlightedIds.has('msa'))
  assert.equal(overlay.highlightedIds.has('spring'), false)
})

// (11) 게스트 폴백 — ownedSkills가 빈 배열이면 careerData.json의 목 이력서 스킬로
// 대체된다(목 이력서엔 Python, Git, Docker 등이 있다).
test('빈 이력서는 careerData.json 목 스킬로 폴백된다', () => {
  const effective = effectiveOwnedSkills([])
  assert.ok(effective.length > 0, '게스트 폴백 스킬이 비어 있으면 안 된다')
  assert.ok(effective.includes('Python'), '목 이력서에 Python이 포함돼 있어야 한다')
})

// (12) 게스트 폴백이 실제 buildRoadmapOverlay 경로에서도 적용된다 — 빈 배열을 넘겨도
// 목 스킬 기준으로 일부 노드가 owned로 나와야 한다(백본이 게스트에서도 "꽉 차게"
// 그려진다는 요구의 오버레이 쪽 증거).
test('게스트(빈 ownedSkills)로도 일부 노드가 owned로 계산된다', () => {
  const overlay = buildRoadmapOverlay(track, [], [])
  assert.ok(overlay.progress.owned > 0, '게스트 폴백이 적용되면 owned가 0보다 커야 한다')
})
