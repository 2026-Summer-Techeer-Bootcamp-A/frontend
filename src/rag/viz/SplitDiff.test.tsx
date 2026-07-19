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

test('renders weighted score, pair bar, summary, and default detail layout (full-width card with quote)', () => {
  const { container } = render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByText(/75%/)).toBeInTheDocument()
  expect(screen.getByText('공고 · 플랫폼 백엔드')).toBeInTheDocument()
  expect(screen.getByText('내 이력서')).toBeInTheDocument()
  expect(screen.getByText(/K8s 운영이 공백/)).toBeInTheDocument()

  // 공고 문구 형광펜 줄
  expect(screen.getByText('FastAPI로 운영할 분')).toBeInTheDocument()
  expect(screen.getByText('EKS 운영')).toBeInTheDocument()

  // 상세 카드 안: 판정 뱃지 + 내 이력서 원문 인용(quote) + 판정 근거(rationale) + 보완점(next_step)
  expect(screen.getByText('충족')).toBeInTheDocument()
  expect(screen.getByText('부분 · 전이가능')).toBeInTheDocument()
  expect(screen.getByText('공백')).toBeInTheDocument()
  expect(screen.getByText('FastAPI 40개 엔드포인트 운영')).toBeInTheDocument()
  expect(screen.getByText('장애 대응 프로세스를 운영했습니다.')).toBeInTheDocument()
  expect(screen.getByText('일치')).toBeInTheDocument()
  expect(screen.getByText(/사이드프로젝트를 EKS에 배포/)).toBeInTheDocument()
  expect(screen.getByText('보완점')).toBeInTheDocument()

  // 왼쪽 컬러 레일(테두리)은 어디에도 없어야 한다 — 옛 노트 카드의 verdict 전용 클래스가
  // 남아있지 않은지 확인한다(rv__sd-note는 상단 score-strip 안내문과 클래스명이 겹치므로 제외).
  expect(container.querySelector('.rv__sd-note-nv')).toBeNull()
  expect(container.querySelector('.rv__sd-note--met')).toBeNull()
  expect(container.querySelector('.rv__sd-vbadge--met')).not.toBeNull()
  expect(container.querySelector('.rv__sd-detailcard--gap')).not.toBeNull()
})

test('detail card shows the missing-evidence message when quote is empty', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  // R6(gap)은 quote가 빈 문자열이라 인용 대신 안내 문구가 떠야 한다.
  expect(screen.getByText('내 이력서에서 근거를 찾지 못했어요')).toBeInTheDocument()
})

test('detail card degrades gracefully when rationale and next_step are both empty', () => {
  // postingVsPostingPayload의 B4는 rationale/next_step이 전부 빈 문자열인 간이 비교 데이터다.
  // 카드는 깨지지 않고 판정 뱃지와 원문 안내(근거 없음)만 보여줘야 한다.
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('ECC에서 S/4HANA로의 전환 프로젝트 참여')).toBeInTheDocument()
  expect(screen.getAllByText('공백').length).toBeGreaterThan(0)
  expect(screen.getByText('비교 공고에서 근거를 찾지 못했어요')).toBeInTheDocument()
})

test('renders posting vs posting payload through the same component, including degraded badge', () => {
  render(<SplitDiff payload={postingVsPostingPayload as any} />)
  expect(screen.getByText('공고 · SAP SM 모듈 운영 담당자')).toBeInTheDocument()
  expect(screen.getByText('비교 공고 · 시니어 백엔드 엔지니어')).toBeInTheDocument()
  expect(screen.getByText(/전환 프로젝트 참여 요건은 갈립니다/)).toBeInTheDocument()
  expect(screen.getByText(/비교 공고 원문을 찾지 못해 보유 기술 태그 기반 비교로 대체됐어요/)).toBeInTheDocument()
})

test('toggling to inline layout ("간단") shows verdict pills, quote tooltip cues, and only surfaces next_step for gap/partial', () => {
  render(<SplitDiff payload={jobVsResumePayload as any} />)

  // 기본(상세) 레이아웃엔 카드 안에서 이미 quote를 직접 인용하므로 quotecue 툴팁이 없어야 한다(중복 방지).
  expect(screen.queryByRole('button', { name: '내 이력서 원문 근거 보기' })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '간단' }))
  expect(screen.getByRole('button', { name: '간단' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: '상세' })).toHaveAttribute('aria-pressed', 'false')

  // vpill은 마커+짧은 라벨을 이중 표기한다.
  expect(screen.getByText(/\+ 충족/)).toBeInTheDocument()
  expect(screen.getByText(/~ 부분/)).toBeInTheDocument()
  expect(screen.getByText(/− 공백/)).toBeInTheDocument()

  // gap 항목(R6)의 next_step만 보조 줄로 노출되고, met 항목(R1)엔 보조 줄이 없다.
  expect(screen.getByText(/사이드프로젝트를 EKS에 배포/)).toBeInTheDocument()
  expect(screen.queryByText('일치')).not.toBeInTheDocument()

  // 인라인에서는 quote 툴팁 표식이 유지된다(quote가 있는 R1, R4만).
  const cueButtons = screen.getAllByRole('button', { name: '내 이력서 원문 근거 보기' })
  expect(cueButtons).toHaveLength(2)
  const describedbyId = cueButtons[0].getAttribute('aria-describedby')
  expect(describedbyId).toBeTruthy()
  const tooltip = document.getElementById(describedbyId as string)
  expect(tooltip).toHaveAttribute('role', 'tooltip')
  expect(tooltip).toHaveTextContent('FastAPI 40개 엔드포인트 운영')

  expect(localStorage.getItem('techeer_splitdiff_layout')).toBe('inline')
})

test('unknown stored layout value (e.g. legacy "margin") falls back to the default detail layout', () => {
  localStorage.setItem('techeer_splitdiff_layout', 'margin')
  render(<SplitDiff payload={jobVsResumePayload as any} />)
  expect(screen.getByRole('button', { name: '상세' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: '간단' })).toHaveAttribute('aria-pressed', 'false')
  // 상세 레이아웃 특유의 인용 블록이 보이면 정상적으로 폴백된 것이다.
  expect(screen.getByText('FastAPI 40개 엔드포인트 운영')).toBeInTheDocument()
})
