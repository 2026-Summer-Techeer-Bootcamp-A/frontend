import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { WifiOff, AlertTriangle, MapPin, Home, Inbox } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import { BottomSheet, PageTransition } from './kit'
import { SubScreen } from './charts'
import { PrimaryButton } from './formkit'
import { THEME, themeVars } from './themes'
import './career.css'
import './screens.css'
import './smallscreens.css'

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
