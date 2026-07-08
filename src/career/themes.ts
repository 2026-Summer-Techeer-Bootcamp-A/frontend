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

// 액센트 = 슬레이트 블루(C) 확정. 뉴트럴은 쿨 톤으로 하모나이즈.
export const THEME: CareerTheme = {
  key: 'p3',
  name: '커리어 홈',
  stageBg: 'radial-gradient(120% 120% at 70% 20%,#eef1f6 0%,#e5e8ee 55%,#dcdfe6 100%)',
  screenBg: '#f6f8fc',
  statusTheme: 'light',
  primary: '#2f61b8',
  accent: '#2f61b8',
  gap: '#e0453a',
  ink: '#1c1d21',
  muted: '#7c7f88',
  cardBg: '#ffffff',
  chipBg: '#dde8f9',
  chipText: '#274f97',
  radius: 22,
  headingWeight: 700,
  letterSpacing: '-0.6px',
  navActive: '#2f61b8',
}

export function themeVars(t: CareerTheme): React.CSSProperties {
  return {
    // @ts-expect-error CSS custom properties
    '--c-primary': t.primary,
    '--c-accent': t.accent,
    '--c-gap': t.gap,
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
