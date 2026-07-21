import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { WifiOff, AlertTriangle, MapPin, Home, Inbox } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import { BottomSheet, PageTransition } from './kit'
import { SubScreen } from './charts'
import { PrimaryButton } from './formkit'
import { THEME, themeVars } from './themes'
import { SplitDiff } from '../rag/viz/SplitDiff'
import type { SplitDiffPayload } from '../rag/chatContract'
import './career.css'
import './screens.css'
import './smallscreens.css'

/* ---------- SplitDiff 검증용 목 데이터(백엔드 없이 렌더 확인) ----------
 * 임베디드 제어 엔지니어 공고(기준) vs 내 이력서(판정 대상). 자격요건 4개 + 우대요건 2개,
 * met 1 / partial 1 / gap 4로 구성해 상태 보드 3열이 전부 채워지도록 하고, gap 중 절반은
 * 원문 근거(quote)가 아예 없는 케이스(근거 없음 섹션 노출)로, 절반은 근거는 있지만 요건을
 * 충분히 충족하지 못하는 케이스로 나눠 EvidenceCompare의 두 분기를 모두 보여준다. */
const MOCK_SPLIT_DIFF_PAYLOAD: SplitDiffPayload = {
  base_role: '임베디드 제어 엔지니어',
  base_title: '다온로보틱스',
  target_role: '내 이력서',
  target_title: '',
  score: 58,
  counts: { met: 1, partial: 1, gap: 4 },
  summary:
    '자격요건 4개 중 1개는 충족, 1개는 부분 충족이에요. CAN/LIN 통신과 기능안전 표준 관련 요건은 이력서에서 근거를 찾지 못했고, 우대요건 2개도 모두 공백이에요.',
  degraded: false,
  requirements: [
    {
      id: 'r1',
      text: 'C/C++ 기반 임베디드 펌웨어 개발 경력 3년 이상',
      source_quote: '자격 요건: ARM Cortex-M 기반 C/C++ 펌웨어 개발 경력 3년 이상',
      verdict: 'met',
      quote: '3년간 ARM Cortex-M4 기반 모터 제어 펌웨어를 C로 설계해 양산 라인에 투입했습니다.',
      rationale: '이력서에 명시된 3년간의 Cortex-M4 펌웨어 개발 경력이 요건의 기간과 기술 스택을 모두 충족해요.',
      next_step: '',
      requirement_kind: 'must',
    },
    {
      id: 'r2',
      text: 'RTOS 기반 멀티태스크 스케줄링 설계 경험',
      source_quote: 'FreeRTOS 등 RTOS 환경에서 우선순위 기반 태스크 스케줄링을 설계한 경험이 필요합니다.',
      verdict: 'partial',
      quote: 'FreeRTOS로 센서 폴링과 통신 태스크를 분리해 운용한 경험이 있습니다.',
      rationale: 'FreeRTOS 사용 경험은 확인되지만 우선순위 기반 스케줄링을 직접 설계했는지는 이력서만으로 확정하기 어려워요.',
      next_step: '우선순위 기반 태스크 스케줄링을 직접 설계한 프로젝트 경험을 이력서에 구체적으로 추가해보세요.',
      requirement_kind: 'must',
    },
    {
      id: 'r3',
      text: 'CAN/LIN 통신 프로토콜 스택 개발 경험',
      source_quote: 'CAN/LIN 통신 프로토콜 스택을 직접 개발하거나 디버깅한 경험이 있어야 합니다.',
      verdict: 'gap',
      quote: 'UART와 I2C 기반 센서 인터페이스를 연동한 경험이 있습니다.',
      rationale: 'UART/I2C 연동 경험은 있으나 CAN/LIN 프로토콜 스택 개발 경험은 이력서에서 확인되지 않아요.',
      next_step: 'CAN/LIN 통신 관련 프로젝트 경험이 있다면 이력서에 추가하고, 없다면 관련 학습 프로젝트를 진행해보세요.',
      requirement_kind: 'must',
    },
    {
      id: 'r4',
      text: 'ISO 26262 기능안전 표준 준수 개발 경험',
      source_quote: 'ISO 26262 기능안전 표준에 따른 개발 프로세스 경험자를 우선 검토합니다.',
      verdict: 'gap',
      quote: '',
      rationale: '이력서에서 ISO 26262 또는 기능안전 관련 언급을 찾지 못했어요.',
      next_step: '기능안전 표준 관련 교육 이수나 프로젝트 경험이 있다면 이력서에 명시해주세요.',
      requirement_kind: 'must',
    },
    {
      id: 'r5',
      text: 'AUTOSAR 아키텍처 기반 개발 경험',
      source_quote: 'AUTOSAR 아키텍처 기반 개발 경험자는 우대합니다.',
      verdict: 'gap',
      quote: '',
      rationale: '이력서에서 AUTOSAR 관련 경험을 찾지 못했어요.',
      next_step: 'AUTOSAR 관련 사이드 프로젝트나 스터디 경험이 있다면 추가해보세요.',
      requirement_kind: 'preferred',
    },
    {
      id: 'r6',
      text: 'Python 기반 HIL 테스트 자동화 스크립트 작성 경험',
      source_quote: 'Python으로 HIL(Hardware-in-the-Loop) 테스트를 자동화한 경험이 있으면 우대합니다.',
      verdict: 'gap',
      quote: 'Python으로 개인 프로젝트의 데이터 수집 스크립트를 작성한 경험이 있습니다.',
      rationale: 'Python 스크립트 작성 경험은 있으나 HIL 테스트 자동화 맥락과는 거리가 있어요.',
      next_step: 'HIL 테스트 환경에서의 자동화 스크립트 작성 경험을 쌓거나 관련 사례를 이력서에 추가해보세요.',
      requirement_kind: 'preferred',
    },
  ],
}

type Tone = 'default' | 'warn' | 'err'
const toneClass: Record<Tone, string> = { default: '', warn: ' ss-state__ic--warn', err: ' ss-state__ic--err' }

/* ---------- 범용 빈 상태 ---------- */
export function EmptyState({
  icon, title, desc, tone = 'default', actionLabel, onAction, secondaryLabel, onSecondary,
}: {
  icon: ReactNode; title: string; desc?: ReactNode; tone?: Tone
  actionLabel?: string; onAction?: () => void
  secondaryLabel?: string; onSecondary?: () => void
}) {
  return (
    <div className="ss-state">
      <span className={`ss-state__ic${toneClass[tone]}`}>{icon}</span>
      <div className="ss-state__title">{title}</div>
      {desc && <div className="ss-state__desc">{desc}</div>}
      {(actionLabel || secondaryLabel) && (
        <div className="ss-state__actions">
          {actionLabel && <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>}
          {secondaryLabel && <PrimaryButton variant="ghost" onClick={onSecondary}>{secondaryLabel}</PrimaryButton>}
        </div>
      )}
    </div>
  )
}

/* ---------- 에러 + 재시도 ---------- */
export function ErrorState({
  title = '문제가 생겼어요', desc = '잠시 후 다시 시도해주세요.', onRetry,
}: { title?: string; desc?: ReactNode; onRetry?: () => void }) {
  return (
    <EmptyState
      tone="err"
      icon={<AlertTriangle size={28} />}
      title={title}
      desc={desc}
      actionLabel={onRetry ? '다시 시도' : undefined}
      onAction={onRetry}
    />
  )
}

/* ---------- 오프라인 ---------- */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      tone="warn"
      icon={<WifiOff size={28} />}
      title="인터넷 연결이 없어요"
      desc="네트워크 상태를 확인하고 다시 시도해주세요."
      actionLabel={onRetry ? '다시 시도' : undefined}
      onAction={onRetry}
    />
  )
}

/* ---------- 위치 권한 요청 시트 ---------- */
export function LocationPermissionSheet({
  open, onClose, onAllow, onDeny,
}: { open: boolean; onClose: () => void; onAllow?: () => void; onDeny?: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="ss-state" style={{ minHeight: 'auto', padding: '8px 6px 6px' }}>
        <span className="ss-state__ic"><MapPin size={28} /></span>
        <div className="ss-state__title">위치 접근을 허용할까요?</div>
        <div className="ss-state__desc">
          내 주변 채용 공고를 지도에서 보여드리기 위해 위치 정보를 사용해요. 위치는 저장하지 않아요.
        </div>
        <div className="ss-state__actions">
          <PrimaryButton onClick={() => { onAllow?.(); onClose() }}>허용</PrimaryButton>
          <PrimaryButton variant="ghost" onClick={() => { onDeny?.(); onClose() }}>나중에</PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ---------- 상태 전용 풀스크린 셸 (탭바 없음) ---------- */
function StateShell({ children }: { children: ReactNode }) {
  const t = THEME
  return (
    <div className="stage stage--app">
      <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="dark">
        <div className="career" style={{ ...themeVars(t), display: 'flex', minHeight: '100%' }}>
          <PageTransition type="fade">{children}</PageTransition>
        </div>
      </PhoneFrame>
    </div>
  )
}

/* ---------- 404 ---------- */
export default function NotFoundScreen() {
  const navigate = useNavigate()
  return (
    <StateShell>
      <div className="ss-state">
        <div className="ss-state__big">404</div>
        <div className="ss-state__title" style={{ marginTop: 10 }}>페이지를 찾을 수 없어요</div>
        <div className="ss-state__desc">주소가 바뀌었거나 삭제된 화면일 수 있어요.</div>
        <div className="ss-state__actions">
          <PrimaryButton onClick={() => navigate('/')}><Home size={18} /> 홈으로</PrimaryButton>
        </div>
      </div>
    </StateShell>
  )
}

/* ---------- 상태 갤러리 (데모/DS 확인용) ---------- */
export function StatesGallery() {
  const [permOpen, setPermOpen] = useState(false)
  return (
    <SubScreen title="시스템 상태">
      <div className="ss-gallery__note">
        데모에서 스쳐 지나가지만 앱 완성도를 좌우하는 화면들이에요. 각 컴포넌트는 실제 화면에서 재사용돼요.
      </div>

      <div className="ss-demoframe">
        <span className="ss-demoframe__tag">EmptyState · 이력서 없음</span>
        <EmptyState icon={<Inbox size={28} />} title="아직 이력서가 없어요" desc="이력서를 등록하면 내 위치를 계산해드려요." actionLabel="이력서 등록" />
      </div>

      <div className="ss-demoframe">
        <span className="ss-demoframe__tag">ErrorState · 재시도</span>
        <ErrorState onRetry={() => {}} />
      </div>

      <div className="ss-demoframe">
        <span className="ss-demoframe__tag">OfflineState</span>
        <OfflineState onRetry={() => {}} />
      </div>

      <div className="ss-demoframe">
        <span className="ss-demoframe__tag">404</span>
        <div className="ss-state">
          <div className="ss-state__big">404</div>
          <div className="ss-state__title" style={{ marginTop: 10 }}>페이지를 찾을 수 없어요</div>
          <div className="ss-state__desc">주소가 바뀌었거나 삭제된 화면일 수 있어요.</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryButton variant="ghost" onClick={() => setPermOpen(true)}>
          <MapPin size={18} /> 위치 권한 시트 열기
        </PrimaryButton>
      </div>
      <div style={{ height: 12 }} />

      <LocationPermissionSheet open={permOpen} onClose={() => setPermOpen(false)} />

      <div className="ss-demoframe" data-testid="splitdiff-mock-gallery">
        <span className="ss-demoframe__tag">SplitDiff · 커리어 적합도 비교(목 데이터)</span>
        <SplitDiff payload={MOCK_SPLIT_DIFF_PAYLOAD} />
      </div>
    </SubScreen>
  )
}

/* 오프라인 풀스크린(라우트용). */
export function OfflineScreen() {
  return (
    <StateShell>
      <OfflineState onRetry={() => window.location.reload()} />
    </StateShell>
  )
}
