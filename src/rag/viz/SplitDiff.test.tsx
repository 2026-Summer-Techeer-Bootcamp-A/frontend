import { fireEvent, render, screen, within } from '@testing-library/react'
import { SplitDiff } from './SplitDiff'

const jobVsResumePayload = {
  base_role: '공고',
  base_title: '플랫폼 백엔드',
  target_role: '내 이력서',
  target_title: '',
  score: 75,
  counts: { met: 1, partial: 1, gap: 1 },
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
  counts: { met: 1, partial: 0, gap: 1 },
  summary: '두 공고 모두 운영 경험을 요구하지만 전환 프로젝트 참여 요건은 갈립니다.',
  degraded: true,
  requirements: [
    { id: 'B1', text: '운영 경력 3년 이상', source_quote: '운영 및 유지보수 경력 3년 이상',
      verdict: 'met', quote: '백엔드 운영 경력 4년 이상 우대', rationale: '요구 기간이 겹쳐요.', next_step: '' },
    { id: 'B4', text: 'S/4HANA 전환 참여', source_quote: 'ECC에서 S/4HANA로의 전환 프로젝트 참여',
      verdict: 'gap', quote: '', rationale: '', next_step: '' },
  ],
}

test('renders pair bar and AI 판단 배너 without any percentage figure', () => {
  const { container } = render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByText('공고 · 플랫폼 백엔드')).toBeInTheDocument()
  expect(screen.getByText('내 이력서')).toBeInTheDocument()
  expect(screen.getByText(/K8s 운영이 공백/)).toBeInTheDocument()

  // 확정 레이아웃엔 퍼센트 적합도 수치가 없어야 한다.
  expect(container.textContent).not.toMatch(/\d+%/)
})

test('summary pills show met/partial/gap and must/preferred counts', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const pills = screen.getByRole('group', { name: '적합도 요약' })

  expect(within(pills).getByText('준비 1')).toBeInTheDocument()
  expect(within(pills).getByText('애매 1')).toBeInTheDocument()
  expect(within(pills).getByText('부족 1')).toBeInTheDocument()
  // R1, R6는 자격요건(must), R4는 우대요건(preferred).
  expect(within(pills).getByText('자격요건 2')).toBeInTheDocument()
  expect(within(pills).getByText('우대요건 1')).toBeInTheDocument()
})

test('requirement without an explicit kind defaults to 자격요건 (must) in pill counts without inventing data', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  const pills = screen.getByRole('group', { name: '적합도 요약' })
  // postingVsPostingPayload의 두 요구사항 모두 requirement_kind가 없다 — 기본값은 자격요건.
  expect(within(pills).getByText('자격요건 2')).toBeInTheDocument()
  expect(within(pills).getByText('우대요건 0')).toBeInTheDocument()
})

test('main canvas falls back to flowing source-quote highlights when no full posting description is given', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const canvas = screen.getByRole('region', { name: '공고 요구 구절 하이라이트' })

  const metHl = within(canvas).getByTestId('sd-hl-R1')
  const partialHl = within(canvas).getByTestId('sd-hl-R4')
  const gapHl = within(canvas).getByTestId('sd-hl-R6')

  expect(metHl).toHaveClass('rv__sd-hl--met')
  expect(partialHl).toHaveClass('rv__sd-hl--partial')
  expect(gapHl).toHaveClass('rv__sd-hl--gap')

  expect(within(metHl).getByText('FastAPI로 운영할 분')).toBeInTheDocument()
  expect(within(partialHl).getByText('ITIL 기반 인시던트 관리 경험')).toBeInTheDocument()
  expect(within(gapHl).getByText('EKS 운영')).toBeInTheDocument()
})

test('each highlighted phrase carries a distinct inline status icon per verdict (colorblind-safe)', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const metHl = screen.getByTestId('sd-hl-R1')
  const partialHl = screen.getByTestId('sd-hl-R4')
  const gapHl = screen.getByTestId('sd-hl-R6')

  expect(metHl.querySelector('.rv__sd-icon--met')).toHaveTextContent('✓')
  expect(partialHl.querySelector('.rv__sd-icon--partial')).toHaveTextContent('∼')
  expect(gapHl.querySelector('.rv__sd-icon--gap')).toHaveTextContent('✕')

  // 색만으로 상태를 구분하지 않는다 — 스크린리더용 텍스트도 항상 같이 존재한다.
  expect(metHl.querySelector('.rv__sd-hl-sr')).toHaveTextContent('준비')
  expect(partialHl.querySelector('.rv__sd-hl-sr')).toHaveTextContent('애매')
  expect(gapHl.querySelector('.rv__sd-hl-sr')).toHaveTextContent('부족')
})

test('highlighted phrase is keyboard focusable and shows a tooltip with verdict/kind badge, requirement text and next step', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const partialHl = screen.getByTestId('sd-hl-R4')

  expect(partialHl).toHaveAttribute('tabIndex', '0')
  fireEvent.focus(partialHl)

  const tooltip = within(partialHl).getByRole('tooltip')
  expect(tooltip).toBeInTheDocument()
  expect(within(tooltip).getByText('애매')).toBeInTheDocument()
  expect(within(tooltip).getByText('우대요건')).toBeInTheDocument()
  expect(within(tooltip).getByText('ITIL 프로세스 이해')).toBeInTheDocument()
  expect(within(tooltip).getByText('내 이력서 근거')).toBeInTheDocument()
  expect(within(tooltip).getByText('장애 대응 프로세스를 운영했습니다.')).toBeInTheDocument()
  expect(within(tooltip).getByText('보완')).toBeInTheDocument()
  expect(within(tooltip).getByText('관련 경험을 이력서에 구체적으로 적어보세요')).toBeInTheDocument()
})

test('tooltip honestly shows a red no-evidence message when the target has no matching quote', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const gapHl = screen.getByTestId('sd-hl-R6')
  fireEvent.focus(gapHl)

  const missing = within(gapHl).getByText('내 이력서에서 근거를 찾지 못했어요')
  expect(missing).toBeInTheDocument()
  expect(missing).toHaveClass('rv__sd-tooltip-quote--missing')
})

test('tooltip omits the 보완 row when a requirement has no next step', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  const metHl = screen.getByTestId('sd-hl-R1')
  fireEvent.focus(metHl)
  expect(within(metHl).queryByText('보완')).not.toBeInTheDocument()
})

test('renders posting vs posting payload through the same component, including degraded note and its own target-role evidence label', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('공고 · SAP SM 모듈 운영 담당자')).toBeInTheDocument()
  expect(screen.getByText('비교 공고 · 시니어 백엔드 엔지니어')).toBeInTheDocument()
  expect(screen.getByText(/전환 프로젝트 참여 요건은 갈립니다/)).toBeInTheDocument()
  expect(screen.getByText(/비교 공고 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요/)).toBeInTheDocument()

  const gapHl = screen.getByTestId('sd-hl-B4')
  fireEvent.focus(gapHl)
  expect(within(gapHl).getByText('비교 공고 근거')).toBeInTheDocument()
  expect(within(gapHl).getByText('비교 공고에서 근거를 찾지 못했어요')).toBeInTheDocument()
})

test('renders the full posting description with inline highlights when base_description matches every source_quote', () => {
  const payloadWithDescription = {
    ...jobVsResumePayload,
    base_description: '자격 요건\nFastAPI로 운영할 분을 찾습니다.\n우대 사항\nITIL 기반 인시던트 관리 경험, EKS 운영 경험이 있으면 좋습니다.',
  }
  render(<SplitDiff payload={payloadWithDescription as any} />)
  const canvas = screen.getByRole('region', { name: '공고 요구 구절 하이라이트' })

  expect(canvas.querySelector('.rv__sd-canvas--full')).toBeInTheDocument()
  expect(canvas.querySelector('.rv__sd-canvas--fallback')).not.toBeInTheDocument()
  expect(within(canvas).getByText('자격 요건', { exact: false })).toBeInTheDocument()
  expect(within(canvas).getByTestId('sd-hl-R1')).toHaveTextContent('FastAPI로 운영할 분')
  expect(within(canvas).getByTestId('sd-hl-R4')).toHaveTextContent('ITIL 기반 인시던트 관리 경험')
  expect(within(canvas).getByTestId('sd-hl-R6')).toHaveTextContent('EKS 운영')
})

test('falls back to the flowing quote layout when base_description does not stably contain every source_quote', () => {
  const payloadWithUnstableDescription = {
    ...jobVsResumePayload,
    // R6의 source_quote("EKS 운영")가 원문에 없다 — 매칭이 불안정하니 폴백으로 안전하게 내려가야 한다.
    base_description: '자격 요건\nFastAPI로 운영할 분을 찾습니다.\n우대 사항\nITIL 기반 인시던트 관리 경험이 있으면 좋습니다.',
  }
  render(<SplitDiff payload={payloadWithUnstableDescription as any} />)
  const canvas = screen.getByRole('region', { name: '공고 요구 구절 하이라이트' })

  expect(canvas.querySelector('.rv__sd-canvas--fallback')).toBeInTheDocument()
  expect(canvas.querySelector('.rv__sd-canvas--full')).not.toBeInTheDocument()
  expect(within(canvas).getByTestId('sd-hl-R6')).toHaveTextContent('EKS 운영')
})
