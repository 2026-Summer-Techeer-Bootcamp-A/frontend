import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  RESUME_SKILLS,
  getResumeSkillRoutingFrame,
  renderResumeSkillRouting,
  resumeSkillRoutingViz,
} from '../src/ppt/viz/resume-skill-routing.ts'

test('8개 기술을 네 분야와 네 단계 모노톤에 매핑한다', () => {
  assert.deepEqual(
    RESUME_SKILLS.map(({ name, field, tone }) => ({ name, field, tone })),
    [
      { name: 'Java', field: 'backend', tone: 'white' },
      { name: 'React', field: 'frontend', tone: 'light' },
      { name: 'Docker', field: 'infra', tone: 'black' },
      { name: 'MySQL', field: 'data', tone: 'mid' },
      { name: 'Spring', field: 'backend', tone: 'white' },
      { name: 'AWS', field: 'infra', tone: 'black' },
      { name: 'Python', field: 'data', tone: 'mid' },
      { name: 'Git', field: 'infra', tone: 'black' },
    ],
  )
})

test('기술 칩은 순차 이동하고 도착하면 사라진다', () => {
  const start = getResumeSkillRoutingFrame(0.05, 960, 540)
  const middle = getResumeSkillRoutingFrame(0.45, 960, 540)
  const end = getResumeSkillRoutingFrame(8 / 9, 960, 540)

  assert.equal(start.skills.filter((skill) => skill.visible).length, 0)
  assert.ok(middle.skills.some((skill) => skill.visible && skill.inTransit))
  assert.ok(middle.skills.some((skill) => skill.arrived))
  assert.ok(end.skills.every((skill) => !skill.visible && skill.arrived))
})

test('최종 분야별 완료 수를 유지한다', () => {
  assert.deepEqual(getResumeSkillRoutingFrame(1, 960, 540).completed, {
    backend: 2,
    frontend: 1,
    data: 2,
    infra: 3,
  })
})

test('동일 입력은 동일하고 해상도에 비례한다', () => {
  const first = getResumeSkillRoutingFrame(0.45, 960, 540)
  assert.deepEqual(first, getResumeSkillRoutingFrame(0.45, 960, 540))

  const small = getResumeSkillRoutingFrame(0.45, 960, 540)
  const large = getResumeSkillRoutingFrame(0.45, 1920, 1080)
  const movingIndex = small.skills.findIndex((skill) => skill.visible)
  assert.ok(movingIndex >= 0)
  assert.ok(Math.abs(large.skills[movingIndex].x - small.skills[movingIndex].x * 2) < 0.000001)
  assert.ok(Math.abs(large.skills[movingIndex].width - small.skills[movingIndex].width * 2) < 0.000001)
})

test('독립된 9초 기능 시각화 메타데이터를 제공한다', () => {
  assert.equal(resumeSkillRoutingViz.id, 'resume-skill-routing')
  assert.equal(resumeSkillRoutingViz.title, '이력서 기술 분류')
  assert.equal(resumeSkillRoutingViz.category, 'feature')
  assert.equal(resumeSkillRoutingViz.period, 9000)
  assert.equal(resumeSkillRoutingViz.render, renderResumeSkillRouting)
})

test('시각화 목록에 별도 항목으로 등록된다', () => {
  const source = readFileSync(new URL('../src/ppt/vizRegistry.ts', import.meta.url), 'utf8')
  assert.match(source, /resumeSkillRoutingViz/)
})
