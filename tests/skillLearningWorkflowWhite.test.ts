import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WORKFLOW_SKILLS,
  getSkillLearningWorkflowFrame,
  renderSkillLearningWorkflowWhite,
  skillLearningWorkflowWhiteViz,
} from '../src/ppt/viz/skill-learning-workflow-white.ts'

test('14개 기술 중 네 기술만 정해진 학습 순서를 가진다', () => {
  assert.equal(WORKFLOW_SKILLS.length, 14)
  assert.deepEqual(
    WORKFLOW_SKILLS.filter((skill) => skill.order !== null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((skill) => skill.name),
    ['Java', 'Spring', 'Docker', 'AWS'],
  )
})

test('시작에는 14개 기술이 흩어져 있고 연결과 문구는 보이지 않는다', () => {
  const frame = getSkillLearningWorkflowFrame(0, 960, 540)
  assert.equal(frame.skills.filter((skill) => skill.visible).length, 14)
  assert.ok(frame.skills.every((skill) => skill.moveProgress === 0))
  assert.ok(frame.connections.every((connection) => connection.progress === 0))
  assert.equal(frame.messageAlpha, 0)
})

test('선택 기술은 강조된 뒤 중앙 워크플로우로 이동한다', () => {
  const selecting = getSkillLearningWorkflowFrame(0.3, 960, 540)
  assert.ok(selecting.skills.some((skill) => skill.selected && skill.selectionProgress > 0))

  const arranged = getSkillLearningWorkflowFrame(0.56, 960, 540)
  const selected = arranged.skills
    .filter((skill) => skill.selected)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  assert.equal(selected.length, 4)
  assert.ok(selected.every((skill) => skill.moveProgress === 1))
  assert.ok(selected.every((skill, index) => index === 0 || skill.x > selected[index - 1].x))
})

test('마지막에는 네 기술과 완성된 세 연결 및 문구만 남는다', () => {
  const frame = getSkillLearningWorkflowFrame(1, 960, 540)
  assert.deepEqual(
    frame.skills.filter((skill) => skill.visible).map((skill) => skill.name),
    ['Java', 'Spring', 'Docker', 'AWS'],
  )
  assert.equal(frame.connections.length, 3)
  assert.ok(frame.connections.every((connection) => connection.progress === 1))
  assert.equal(frame.messageAlpha, 1)
})

test('동일 입력은 동일하고 2배 해상도에서 좌표와 크기도 2배다', () => {
  const small = getSkillLearningWorkflowFrame(0.5, 960, 540)
  assert.deepEqual(small, getSkillLearningWorkflowFrame(0.5, 960, 540))
  const large = getSkillLearningWorkflowFrame(0.5, 1920, 1080)
  assert.ok(Math.abs(large.skills[0].x - small.skills[0].x * 2) < 0.000001)
  assert.ok(Math.abs(large.skills[0].width - small.skills[0].width * 2) < 0.000001)
})

test('독립된 7초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(skillLearningWorkflowWhiteViz.id, 'skill-learning-workflow-white')
  assert.equal(skillLearningWorkflowWhiteViz.title, '나의 기술 학습 경로')
  assert.equal(skillLearningWorkflowWhiteViz.category, 'feature')
  assert.equal(skillLearningWorkflowWhiteViz.period, 7000)
  assert.equal(skillLearningWorkflowWhiteViz.render, renderSkillLearningWorkflowWhite)
})
