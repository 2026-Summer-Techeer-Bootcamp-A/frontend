import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { postResumeFeedback } from './resumeInsightApi'

// composeResumeText는 모듈 내부 비공개 함수라 직접 호출할 수 없다 — 대신 postResumeFeedback이
// /resume/confirm에 보내는 요청 바디의 resume_text를 통해 관찰 가능한 동작으로 검증한다.
vi.mock('../career/authStore', () => ({
  getAuthToken: () => null,
}))

describe('postResumeFeedback이 합성하는 resume_text의 자격증 줄', () => {
  const confirmResponse = { session_id: 'sess-1', ttl: 3600 }
  const feedbackResponse = { feedback: [], questions: [], model: 'test', degraded: false }

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn((url: string) => {
      const body = url.endsWith('/resume/confirm') ? confirmResponse : feedbackResponse
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function confirmRequestBody() {
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/resume/confirm'))
    return JSON.parse((call?.[1] as RequestInit).body as string)
  }

  test('certs가 있으면 보유 자격증 줄을 포함한다', async () => {
    await postResumeFeedback({
      skills: [{ canonical: 'Java', category: 'language', in_dict: true }],
      certs: ['정보처리기사', 'SQLD'],
      position: 'backend',
      careerMin: null,
      careerMax: null,
      pool: 'domestic',
      memo: null,
    })

    expect(confirmRequestBody().resume_text).toContain('보유 자격증: 정보처리기사, SQLD')
  })

  test('certs가 비어 있으면 보유 자격증 줄을 생략한다', async () => {
    await postResumeFeedback({
      skills: [{ canonical: 'Java', category: 'language', in_dict: true }],
      certs: [],
      position: 'backend',
      careerMin: null,
      careerMax: null,
      pool: 'domestic',
      memo: null,
    })

    expect(confirmRequestBody().resume_text).not.toContain('보유 자격증')
  })
})
