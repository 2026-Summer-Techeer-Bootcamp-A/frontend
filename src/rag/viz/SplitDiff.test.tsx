import { render, screen } from '@testing-library/react'
import { SplitDiff } from './SplitDiff'

const payload = {
  posting_title: '플랫폼 백엔드',
  score: 75,
  counts: { met: 4, partial: 1, gap: 1 },
  summary: '백엔드 역량은 충족되나 K8s 운영이 공백입니다.',
  degraded: false,
  requirements: [
    { id: 'R1', text: 'FastAPI 개발', source_quote: 'FastAPI로 운영할 분',
      verdict: 'met', resume_quote: 'FastAPI 40개 엔드포인트 운영', rationale: '일치', next_step: '' },
    { id: 'R6', text: 'K8s 운영', source_quote: 'EKS 운영', verdict: 'gap',
      resume_quote: '', rationale: '', next_step: '사이드프로젝트를 EKS에 배포' },
  ],
}

test('renders weighted score, summary, and verdict rows', () => {
  render(<SplitDiff payload={payload as any} />)
  expect(screen.getByText(/75%/)).toBeInTheDocument()
  expect(screen.getByText(/K8s 운영이 공백/)).toBeInTheDocument()
  expect(screen.getByText('FastAPI 40개 엔드포인트 운영')).toBeInTheDocument()
  expect(screen.getByText(/사이드프로젝트를 EKS에 배포/)).toBeInTheDocument()
})
