import { fireEvent, render, screen } from '@testing-library/react'
import { SplitDiff } from './SplitDiff'

const jobVsResumePayload = {
  base_role: '공고',
  base_title: '플랫폼 백엔드',
  target_role: '내 이력서',
  target_title: '',
  score: 75,
  counts: { met: 4, partial: 1, gap: 1 },
  summary: '백엔드 역량은 충족되나 K8s 운영이 공백입니다.',
  degraded: false,
  requirements: [
    { id: 'R1', text: 'FastAPI 개발', source_quote: 'FastAPI로 운영할 분',
      verdict: 'met', quote: 'FastAPI 40개 엔드포인트 운영', rationale: '일치', next_step: '' },
    { id: 'R4', text: 'ITIL 프로세스 이해', source_quote: 'ITIL 기반 인시던트 관리 경험',
      verdict: 'partial', quote: '장애 대응 프로세스를 운영했습니다.', rationale: 'ITIL 용어는 없지만 전이 가능한 근거로 봤어요.', next_step: '' },
    { id: 'R6', text: 'K8s 운영', source_quote: 'EKS 운영', verdict: 'gap',
      quote: '', rationale: '', next_step: '사이드프로젝트를 EKS에 배포' },
  ],
}

const postingVsPostingPayload = {
  base_role: '공고',
  base_title: 'SAP SM 모듈 운영 담당자',
  target_role: '비교 공고',
  target_title: '시니어 백엔드 엔지니어',
  score: 60,
  counts: { met: 1, partial: 1, gap: 1 },
  summary: '두 공고 모두 운영 경험을 요구하지만 전환 프로젝트 참여 요건은 갈립니다.',
  degraded: true,
  requirements: [
    { id: 'B1', text: '운영 경력 3년 이상', source_quote: '운영 및 유지보수 경력 3년 이상',
      verdict: 'met', quote: '백엔드 운영 경력 4년 이상 우대', rationale: '요구 기간이 겹쳐요.', next_step: '' },
    { id: 'B4', text: 'S/4HANA 전환 참여', source_quote: 'ECC에서 S/4HANA로의 전환 프로젝트 참여',
      verdict: 'gap', quote: '', rationale: '', next_step: '' },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

test('renders weighted score, pair bar, summary, and default margin layout (highlight + note)', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByText(/75%/)).toBeInTheDocument()
  expect(screen.getByText('공고 · 플랫폼 백엔드')).toBeInTheDocument()
  expect(screen.getByText('내 이력서')).toBeInTheDocument()
  expect(screen.getByText(/K8s 운영이 공백/)).toBeInTheDocument()
  // 좌측 문서 형광펜 — source_quote 텍스트가 강조된다.
  expect(screen.getByText('FastAPI로 운영할 분')).toBeInTheDocument()
  expect(screen.getByText('EKS 운영')).toBeInTheDocument()
  // 우측 노트 카드 — verdict 라벨 + rationale + next_step(보완점).
  expect(screen.getByText('충족')).toBeInTheDocument()
  expect(screen.getByText('부분 · 전이가능')).toBeInTheDocument()
  expect(screen.getByText('공백')).toBeInTheDocument()
  expect(screen.getByText('일치')).toBeInTheDocument()
  expect(screen.getByText(/사이드프로젝트를 EKS에 배포/)).toBeInTheDocument()
  expect(screen.getByText('보완점')).toBeInTheDocument()
})

test('note card degrades gracefully when rationale and next_step are both empty', () => {
  // postingVsPostingPayload의 B4는 rationale/next_step이 전부 빈 문자열인 간이 비교 데이터다.
  // 노트 카드는 깨지지 않고 verdict 라벨("공백")만 보여줘야 한다.
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('ECC에서 S/4HANA로의 전환 프로젝트 참여')).toBeInTheDocument()
  expect(screen.getAllByText('공백').length).toBeGreaterThan(0)
})

test('renders posting vs posting payload through the same component, including degraded badge', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('공고 · SAP SM 모듈 운영 담당자')).toBeInTheDocument()
  expect(screen.getByText('비교 공고 · 시니어 백엔드 엔지니어')).toBeInTheDocument()
  expect(screen.getByText(/전환 프로젝트 참여 요건은 갈립니다/)).toBeInTheDocument()
  expect(screen.getByText(/비교 공고 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요/)).toBeInTheDocument()
})

test('quote cue tooltip appears only when quote is non-empty, is keyboard-focusable, and carries the quote text', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  // R1(met)과 R4(partial)는 quote가 있고, R6(gap)은 quote가 빈 문자열이라 표식이 없어야 한다.
  const cueButtons = screen.getAllByRole('button', { name: '내 이력서 원문 근거 보기' })
  expect(cueButtons).toHaveLength(2)

  // 표식은 진짜 button이라 별도 tabIndex 없이도 Tab으로 포커스되고, aria-describedby로 이어진
  // role="tooltip" 요소가 quote 전문을 담고 있다(네이티브 title 하나로 때우지 않는다).
  const describedbyId = cueButtons[0].getAttribute('aria-describedby')
  expect(describedbyId).toBeTruthy()
  const tooltip = document.getElementById(describedbyId as string)
  expect(tooltip).toHaveAttribute('role', 'tooltip')
  expect(tooltip).toHaveTextContent('FastAPI 40개 엔드포인트 운영')

  // 인라인 레이아웃으로 전환해도 같은 표식이 유지된다(두 레이아웃 모두 적용 요구사항).
  fireEvent.click(screen.getByRole('button', { name: '인라인' }))
  expect(screen.getAllByRole('button', { name: '내 이력서 원문 근거 보기' })).toHaveLength(2)
})

test('toggling to inline layout shows verdict pills and only surfaces next_step for gap/partial', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  fireEvent.click(screen.getByRole('button', { name: '인라인' }))

  expect(screen.getByRole('button', { name: '인라인' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: '여백 주석' })).toHaveAttribute('aria-pressed', 'false')

  // vpill은 마커+짧은 라벨을 이중 표기한다.
  expect(screen.getByText(/\+ 충족/)).toBeInTheDocument()
  expect(screen.getByText(/~ 부분/)).toBeInTheDocument()
  expect(screen.getByText(/− 공백/)).toBeInTheDocument()

  // gap 항목(R6)의 next_step만 보조 줄로 노출되고, met 항목(R1)엔 보조 줄이 없다.
  expect(screen.getByText(/사이드프로젝트를 EKS에 배포/)).toBeInTheDocument()
  expect(screen.queryByText('일치')).not.toBeInTheDocument()

  expect(localStorage.getItem('techeer_splitdiff_layout')).toBe('inline')
})
