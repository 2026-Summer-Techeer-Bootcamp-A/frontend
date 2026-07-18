import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ResumeInsight from './ResumeInsight'
import { postResumeFeedback } from './resumeInsightApi'
import { dashboardApi, marketApi, resumeApi } from '../career/api'

// 인증/저장 이력서/시각화/피드백 API를 전부 모킹한다 — 이 테스트가 검증하려는 건
// "초기 마운트에서는 시각화만 자동으로 채우고, 비용이 드는 postResumeFeedback은
// 사용자가 명시적으로 트리거(제출 버튼 또는 저장 이력서 재선택)할 때만 실행된다"는
// 계약이지, 실제 네트워크 응답 형태가 아니다.
vi.mock('../career/authStore', () => ({
  useAuth: () => ({ isAuthed: true }),
  getAuthToken: () => 'test-token',
}))

vi.mock('../career/api', () => ({
  dashboardApi: { coverage: vi.fn() },
  marketApi: { skillShare: vi.fn() },
  resumeApi: { list: vi.fn(), detail: vi.fn() },
}))

vi.mock('./resumeInsightApi', () => ({
  postResumeFeedback: vi.fn(),
}))

const savedResumeItem = { resume_id: 1, title: '내 이력서', position: 'backend', is_primary: true }
const savedResumeDetail = {
  resume_id: 1,
  title: '내 이력서',
  skills: [{ canonical: 'React', category: 'skill', in_dict: true }],
  certs: [],
  position: 'backend',
  career_min: 0,
  career_max: 3,
  pool: 'domestic' as const,
  memo: null,
  is_primary: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  vi.mocked(resumeApi.list).mockResolvedValue({ items: [savedResumeItem] })
  vi.mocked(resumeApi.detail).mockResolvedValue(savedResumeDetail)
  vi.mocked(marketApi.skillShare).mockResolvedValue({
    items: [{ canonical: 'React', category: null, posting_count: 10, share: 0.5 }],
    as_of: '2026-07-01',
    sample_size: 10,
  })
  vi.mocked(dashboardApi.coverage).mockResolvedValue({
    coverage_score: 50,
    top_skills: [{ canonical: 'React', owned: true }],
  })
  vi.mocked(postResumeFeedback).mockResolvedValue({
    feedback: ['잘 정리됐어요.'],
    questions: ['React 렌더링 최적화 경험은?'],
    model: 'test-model',
    degraded: false,
  })
})

afterEach(() => {
  cleanup()
})

describe('ResumeInsight initial mount', () => {
  test('auto-fills the saved resume and visualization without firing the costly feedback call', async () => {
    render(<ResumeInsight />)

    // 시각화는 자동으로 채워진다 — 수요 데이터를 불러왔는지로 확인한다.
    await waitFor(() => expect(marketApi.skillShare).toHaveBeenCalled())
    await waitFor(() => expect(dashboardApi.coverage).toHaveBeenCalled())

    // 마운트만으로는 비용이 드는 피드백 호출이 절대 발동하지 않아야 한다.
    expect(postResumeFeedback).not.toHaveBeenCalled()

    // 헤더도 "입력을 기다리는 중"(아직 아무 것도 안 채워진 상태)이 아니라
    // 분석 대기 중임을 나타내야 한다.
    expect(screen.getByText('분석 대기 중')).toBeInTheDocument()
    expect(
      screen.getByText('저장된 이력서에서 기술을 불러왔어요. 분석 요청을 누르면 이력서 피드백과 예상 면접 질문을 받아볼 수 있어요.'),
    ).toBeInTheDocument()
  })

  test('explicitly clicking the submit button still fires the feedback call with the auto-loaded skills', async () => {
    render(<ResumeInsight />)

    await waitFor(() => expect(marketApi.skillShare).toHaveBeenCalled())
    expect(postResumeFeedback).not.toHaveBeenCalled()

    const submitButton = await screen.findByRole('button', { name: '분석 요청' })
    fireEvent.click(submitButton)

    await waitFor(() => expect(postResumeFeedback).toHaveBeenCalledTimes(1))
    expect(postResumeFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: [{ canonical: 'React', category: 'skill', in_dict: false }],
        position: 'backend',
      }),
    )

    await screen.findByText('분석 완료')
  })
})
