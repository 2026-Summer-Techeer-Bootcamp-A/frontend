// 커리어 홈 디자인 시스템 base 토큰 (P3 확정).
// 추후 색상/폰트 등 디자인 시스템 확장 시 이 파일을 정본으로 사용.
export interface CareerTheme {
  key: string
  name: string
  stageBg: string
  screenBg: string
  statusTheme: 'light' | 'dark'
  primary: string // 버튼/활성
  accent: string // 데이터 시각화(링/바)
  gap: string // 갭(코랄/레드)
  met: string // 충족(그린)
  partial: string // 부분(앰버)
  ink: string
  muted: string
  cardBg: string
  chipBg: string
  chipText: string
  radius: number
  headingWeight: number
  letterSpacing: string
  navActive: string
}

// 액센트 = near-black 모노크롬 확정. 뉴트럴은 쿨 톤으로 하모나이즈.
export const THEME: CareerTheme = {
  key: 'p3',
  name: '커리어 홈',
  stageBg: 'radial-gradient(120% 120% at 70% 20%,#ffffff 0%,#f7f7f8 55%,#f0f0f1 100%)',
  screenBg: '#f7f7f8',
  statusTheme: 'light',
  primary: '#0b0b0c',
  accent: '#0b0b0c',
  gap: '#e0453a',
  met: '#1f7a63',
  partial: '#8a6d3b',
  ink: '#18181b',
  muted: '#71717a',
  cardBg: '#ffffff',
  chipBg: '#f0f0f1',
  chipText: '#18181b',
  radius: 14,
  headingWeight: 700,
  letterSpacing: '-0.6px',
  navActive: '#0b0b0c',
}

export function themeVars(t: CareerTheme): React.CSSProperties {
  return {
    // @ts-expect-error CSS custom properties
    '--c-primary': t.primary,
    '--c-accent': t.accent,
    '--c-gap': t.gap,
    '--c-met': t.met,
    '--c-partial': t.partial,
    '--c-ink': t.ink,
    '--c-muted': t.muted,
    '--c-card': t.cardBg,
    '--c-chipbg': t.chipBg,
    '--c-chiptext': t.chipText,
    '--c-radius': `${t.radius}px`,
    '--c-hweight': t.headingWeight,
    '--c-ls': t.letterSpacing,
    '--c-nav': t.navActive,
  }
}
