import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadInitialAssistantResume,
  mapSavedPosition,
  selectInitialResume,
  toAssistantResumeInput,
} from '../src/rag/resumeSelection.ts'

test('기본 이력서를 초기 선택한다', () => {
  const items = [
    { resume_id: 2, title: '최근', position: 'frontend', is_primary: false },
    { resume_id: 1, title: '기본', position: 'backend', is_primary: true },
  ]

  assert.equal(selectInitialResume(items)?.resume_id, 1)
})

test('기본 표시가 없으면 첫 이력서를 선택하고 빈 목록은 null이다', () => {
  const items = [
    { resume_id: 2, title: '최근', position: 'frontend', is_primary: false },
  ]

  assert.equal(selectInitialResume(items)?.resume_id, 2)
  assert.equal(selectInitialResume([]), null)
})

test('백엔드 계약의 영문 직무 키를 그대로 보존한다', () => {
  for (const position of ['backend', 'frontend', 'fullstack', 'devops', 'data']) {
    assert.equal(mapSavedPosition(position), position)
  }
})

test('저장 이력서 상세를 어시스턴트 입력으로 변환한다', () => {
  const input = toAssistantResumeInput({
    resume_id: 1,
    title: '내 이력서',
    skills: [
      { canonical: 'Java', category: 'language', in_dict: true },
      { canonical: 'Spring', category: 'backend', in_dict: true },
    ],
    certs: [],
    position: '백엔드 개발',
    career_min: 1,
    career_max: 3,
    pool: 'domestic',
    memo: null,
    is_primary: true,
  })

  assert.deepEqual(input, {
    resumeId: 1,
    skills: ['Java', 'Spring'],
    position: 'backend',
    pool: 'domestic',
    memo: null,
  })
})

test('목록의 기본 이력서 ID로 상세를 조회한다', async () => {
  let requestedId: number | null = null

  const result = await loadInitialAssistantResume({
    list: async () => ({
      items: [
        { resume_id: 2, title: '최근', position: 'frontend', is_primary: false },
        { resume_id: 1, title: '기본', position: 'backend', is_primary: true },
      ],
    }),
    detail: async (resumeId) => {
      requestedId = resumeId
      return {
        resume_id: resumeId,
        title: '기본',
        skills: [{ canonical: 'Java', category: 'language', in_dict: true }],
        certs: [],
        position: 'backend',
        career_min: 1,
        career_max: 3,
        pool: 'domestic',
        memo: null,
        is_primary: true,
      }
    },
  })

  assert.equal(requestedId, 1)
  assert.equal(result.input?.resumeId, 1)
  assert.equal(result.items.length, 2)
})
