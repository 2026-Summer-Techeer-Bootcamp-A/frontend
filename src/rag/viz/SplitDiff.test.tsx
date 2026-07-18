import { render, screen } from '@testing-library/react'
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

test('renders weighted score, pair bar, summary, and verdict rows', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByText(/75%/)).toBeInTheDocument()
  expect(screen.getByText('공고 · 플랫폼 백엔드')).toBeInTheDocument()
  expect(screen.getByText('내 이력서')).toBeInTheDocument()
  expect(screen.getByText(/K8s 운영이 공백/)).toBeInTheDocument()
  expect(screen.getByText('FastAPI 40개 엔드포인트 운영')).toBeInTheDocument()
  expect(screen.getByText(/사이드프로젝트를 EKS에 배포/)).toBeInTheDocument()
  expect(screen.getByText('보완점')).toBeInTheDocument()
})

test('gap requirement without a quote shows the missing-evidence note', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByText('내 이력서에서 근거를 찾지 못했어요')).toBeInTheDocument()
})

test('renders posting vs posting payload through the same component, including degraded badge', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('공고 · SAP SM 모듈 운영 담당자')).toBeInTheDocument()
  expect(screen.getByText('비교 공고 · 시니어 백엔드 엔지니어')).toBeInTheDocument()
  expect(screen.getByText(/전환 프로젝트 참여 요건은 갈립니다/)).toBeInTheDocument()
  expect(screen.getByText(/비교 공고 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요/)).toBeInTheDocument()
})
