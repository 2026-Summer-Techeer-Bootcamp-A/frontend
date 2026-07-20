import { fireEvent, render, screen, within } from '@testing-library/react'
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
      verdict: 'met', quote: 'FastAPI 40개 엔드포인트 운영', rationale: '일치', next_step: '',
      requirement_kind: 'must' },
    { id: 'R4', text: 'ITIL 프로세스 이해', source_quote: 'ITIL 기반 인시던트 관리 경험',
      verdict: 'partial', quote: '장애 대응 프로세스를 운영했습니다.', rationale: 'ITIL 용어는 없지만 전이 가능한 근거로 봤어요.', next_step: '관련 경험을 이력서에 구체적으로 적어보세요',
      requirement_kind: 'preferred' },
    { id: 'R6', text: 'K8s 운영', source_quote: 'EKS 운영', verdict: 'gap',
      quote: '', rationale: '', next_step: '사이드프로젝트를 EKS에 배포',
      requirement_kind: 'must' },
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

test('renders pair bar and summary without any percentage figure', () => {
  const { container } = render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByText('공고 · 플랫폼 백엔드')).toBeInTheDocument()
  expect(screen.getByText('내 이력서')).toBeInTheDocument()
  expect(screen.getByText(/K8s 운영이 공백/)).toBeInTheDocument()

  // 확정 레이아웃엔 퍼센트 적합도 수치가 없어야 한다(가중 도넛/스코어 배지 전부 제거).
  expect(container.textContent).not.toMatch(/\d+%/)
})

test('status board groups requirements into met/partial/gap columns with requirement-kind badges', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const board = screen.getByRole('region', { name: '요구사항 상태 보드' })

  expect(within(board).getByText('FastAPI 개발')).toBeInTheDocument()
  expect(within(board).getByText('ITIL 프로세스 이해')).toBeInTheDocument()
  expect(within(board).getByText('K8s 운영')).toBeInTheDocument()

  // 자격요건(R1, R6)은 솔리드 뱃지, 우대요건(R4)은 아웃라인 뱃지 클래스로 갈린다.
  const mustBadges = board.querySelectorAll('.rv__sd-kind--must')
  const preferredBadges = board.querySelectorAll('.rv__sd-kind--preferred')
  expect(mustBadges.length).toBe(2)
  expect(preferredBadges.length).toBe(1)

  // 상태 카운트도 퍼센트가 아니라 개수로만 표시된다(met 1, partial 1, gap 1).
  const counts = Array.from(board.querySelectorAll('.rv__sd-col-count')).map((el) => el.textContent)
  expect(counts).toEqual(['1', '1', '1'])
})

test('requirement without an explicit kind defaults to 자격요건 (must) without inventing data', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  const board = screen.getByRole('region', { name: '요구사항 상태 보드' })
  // postingVsPostingPayload의 두 요구사항 모두 requirement_kind가 없다 — 기본값은 자격요건(솔리드).
  expect(board.querySelectorAll('.rv__sd-kind--must').length).toBe(2)
  expect(board.querySelectorAll('.rv__sd-kind--preferred').length).toBe(0)
})

test('evidence compare maps posting quote to resume quote by color and collects no-evidence items honestly', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const evidence = screen.getByRole('region', { name: '원문 대조' })

  // quote가 있는 R1, R4는 좌우로 매핑되어 보인다.
  expect(within(evidence).getByText('FastAPI로 운영할 분')).toBeInTheDocument()
  expect(within(evidence).getByText('FastAPI 40개 엔드포인트 운영')).toBeInTheDocument()

  // quote가 빈 R6는 "근거 없음"으로 따로 모인다.
  expect(within(evidence).getByText('근거 없음')).toBeInTheDocument()
  expect(within(evidence).getByText('EKS 운영')).toBeInTheDocument()
  expect(within(evidence).getByText('내 이력서에서 근거를 찾지 못했어요')).toBeInTheDocument()
})

test('renders posting vs posting payload through the same component, including degraded note', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('공고 · SAP SM 모듈 운영 담당자')).toBeInTheDocument()
  expect(screen.getByText('비교 공고 · 시니어 백엔드 엔지니어')).toBeInTheDocument()
  expect(screen.getByText(/전환 프로젝트 참여 요건은 갈립니다/)).toBeInTheDocument()
  expect(screen.getByText(/비교 공고 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요/)).toBeInTheDocument()
})

test('action checklist orders must-have items before preferred ones and tracks checkbox progress locally', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const checklist = screen.getByRole('region', { name: '액션 체크리스트' })
  const items = within(checklist).getAllByRole('checkbox')
  // next_step이 있는 항목은 R4(preferred)와 R6(must) 두 개다 — must가 먼저 와야 한다.
  expect(items).toHaveLength(2)

  const labels = within(checklist).getAllByText(/사이드프로젝트를 EKS에 배포|관련 경험을 이력서에 구체적으로 적어보세요/)
  expect(labels[0]).toHaveTextContent('사이드프로젝트를 EKS에 배포')
  expect(labels[1]).toHaveTextContent('관련 경험을 이력서에 구체적으로 적어보세요')

  expect(items[0]).not.toBeChecked()
  fireEvent.click(items[0])
  expect(items[0]).toBeChecked()
})

test('action checklist shows an empty state when no requirement has a next step', () => {
  const noActionPayload = {
    ...jobVsResumePayload,
    requirements: jobVsResumePayload.requirements.map((r) => ({ ...r, next_step: '' })),
  }
  render(<SplitDiff payload={noActionPayload as any} />)
  const checklist = screen.getByRole('region', { name: '액션 체크리스트' })
  expect(within(checklist).getByText('지금 더 준비할 액션이 없어요.')).toBeInTheDocument()
  expect(within(checklist).queryAllByRole('checkbox')).toHaveLength(0)
})
