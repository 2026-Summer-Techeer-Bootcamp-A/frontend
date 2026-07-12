import type { ReactNode } from 'react'

type StageVariant = 'purple' | 'blue' | 'gray'

interface StatusBarProps {
  time?: string
  theme?: 'light' | 'dark'
}

export function StatusBar({ time = '12:30', theme = 'light' }: StatusBarProps) {
  return (
    <div className={`statusbar statusbar--${theme}`}>
      <span className="statusbar__time">{time}</span>
      <span className="statusbar__icons">
        {/* signal */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
          <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
        </svg>
        {/* wifi */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <path
            d="M8.5 2.2c2.6 0 5 1 6.8 2.7l-1.4 1.5A7.5 7.5 0 0 0 8.5 4.3 7.5 7.5 0 0 0 3.1 6.4L1.7 4.9A9.7 9.7 0 0 1 8.5 2.2Z"
            fill="currentColor"
          />
          <path
            d="M8.5 5.9c1.5 0 2.9.6 4 1.6l-1.5 1.6a3.6 3.6 0 0 0-5 0L4.5 7.5a5.8 5.8 0 0 1 4-1.6Z"
            fill="currentColor"
          />
          <circle cx="8.5" cy="10.4" r="1.6" fill="currentColor" />
        </svg>
        {/* battery */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
          <rect x="24" y="4" width="2" height="5" rx="1" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  )
}

interface PhoneFrameProps {
  stage: StageVariant
  statusTheme?: 'light' | 'dark'
  time?: string
  homeIndicator?: 'light' | 'dark' | 'none'
  /** 화면 전체 배경(스크린 안쪽) */
  screenBg?: string
  /** 3번 이미지처럼 노치를 알약형 노치로 쓸 때 */
  children: ReactNode
  /** stage 없이 폰만 렌더(갤러리/조합용) */
  bare?: boolean
  /** 2번 이미지처럼 3D로 기울일 때 */
  tilt?: boolean
  /** 스크롤과 무관하게 폰 화면에 고정되는 오버레이(데모 리모컨 등) */
  overlay?: ReactNode
  /** 앱 모드: 가짜 기기 베젤·상태바·아일랜드·홈인디케이터를 제거하고 뷰포트를 채우는
      PC↔모바일 반응형 컬럼으로 렌더한다. 랩 목업 페이지는 이 값을 켜지 않아 프레임이 유지된다. */
  app?: boolean
}

export default function PhoneFrame({
  stage,
  statusTheme = 'light',
  time = '12:30',
  homeIndicator = 'dark',
  screenBg = '#ffffff',
  children,
  bare = false,
  tilt = false,
  overlay,
  app = false,
}: PhoneFrameProps) {
  const phone = (
    <div className={`phone${tilt ? ' phone--tilt' : ''}${app ? ' phone--app' : ''}`}>
      {!app && <div className="phone__island" />}
      <div className="phone__screen" style={{ background: screenBg }}>
        {!app && <StatusBar time={time} theme={statusTheme} />}
        <div className="screen-scroll">{children}</div>
        {overlay}
        {!app && homeIndicator !== 'none' && (
          <div className={`home-indicator home-indicator--${homeIndicator}`} />
        )}
      </div>
    </div>
  )

  if (bare) return phone
  return <div className={`stage stage--${stage}${tilt ? ' stage--tilt' : ''}${app ? ' stage--app' : ''}`}>{phone}</div>
}
