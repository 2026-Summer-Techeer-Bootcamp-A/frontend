// ============================================================
// 커리어 앱 디자인 토큰 (정본) — 액센트: near-black 모노크롬
// 이미지 뉴트럴 팔레트를 쿨 톤으로 하모나이즈.
// ============================================================

export const palette = {
  // 액센트: near-black 그레이 램프
  accent: {
    50: '#f4f4f5',
    100: '#e4e4e7',
    200: '#c9c9cf',
    300: '#9a9aa2',
    400: '#52525b',
    500: '#0b0b0c', // base
    600: '#09090a',
    700: '#070708',
    800: '#050506',
  },
  // 뉴트럴 (쿨 그레이)
  neutral: {
    0: '#ffffff',
    50: '#f7f7f8', // 배경(bg)
    100: '#f0f0f1', // 서브 서피스
    200: '#e4e4e7', // 보더/구분선
    300: '#d4d4d8',
    400: '#a1a1aa', // 비활성
    500: '#71717a', // 보조 텍스트(muted)
    600: '#52525b',
    700: '#3f3f46',
    900: '#18181b', // 잉크(본문/제목)
  },
  // 의미색
  semantic: {
    success: '#218a58',
    successBg: '#e6f5ed',
    warning: '#c76a2e',
    warningBg: '#fbeee2',
    danger: '#c8382d',
    dangerBg: '#fbe9e7',
    info: '#0b0b0c',
    infoBg: '#f0f0f1',
  },
  // 데이터 시각화 (절제된 다계열용 — 단일 지표는 모노톤 사용)
  dataviz: {
    positive: '#1f9d57',
    warn: '#d9822b',
  },
} as const

export interface TypeToken {
  name: string
  role: string
  size: number
  weight: number
  ls: string
  lh: number
}

export const typography = {
  family: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Roboto Mono', ui-monospace, monospace",
  weights: [
    { w: 400, name: 'Regular' },
    { w: 500, name: 'Medium' },
    { w: 600, name: 'SemiBold' },
    { w: 700, name: 'Bold' },
    { w: 800, name: 'ExtraBold' },
  ],
  scale: [
    { name: 'Display', role: '히어로 타이틀 (메인)', size: 37, weight: 800, ls: '-1.5px', lh: 1.1 },
    { name: 'Title / H1', role: '페이지 타이틀', size: 28, weight: 800, ls: '-1px', lh: 1.15 },
    { name: 'Heading / H2', role: '섹션 제목', size: 20, weight: 700, ls: '-0.5px', lh: 1.25 },
    { name: 'Subhead / H3', role: '카드 제목·소제목', size: 16, weight: 700, ls: '-0.3px', lh: 1.3 },
    { name: 'Body', role: '본문', size: 14, weight: 400, ls: '-0.2px', lh: 1.55 },
    { name: 'Body Strong', role: '강조 본문', size: 14, weight: 600, ls: '-0.2px', lh: 1.55 },
    { name: 'Caption', role: '보조 설명', size: 12, weight: 500, ls: '0', lh: 1.45 },
    { name: 'Label', role: '배지·태그·라벨', size: 11, weight: 700, ls: '0.2px', lh: 1.2 },
  ] as TypeToken[],
} as const

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, '2xl': 28, pill: 999 } as const
export const spacing = [4, 8, 12, 16, 20, 24, 32, 40] as const

// 엘리베이션(레이어드 섀도) — 낮을수록 종이에 가깝게, 높을수록 떠 있게
export const elevation = {
  0: 'none',
  1: '0 1px 2px rgba(20,30,60,0.05), 0 1px 1px rgba(20,30,60,0.04)',
  2: '0 2px 8px rgba(20,30,60,0.06), 0 1px 2px rgba(20,30,60,0.05)',
  3: '0 8px 24px rgba(20,30,60,0.08), 0 2px 6px rgba(20,30,60,0.05)',
  4: '0 20px 48px rgba(20,30,60,0.14), 0 6px 16px rgba(20,30,60,0.08)',
} as const

// 모션 — Apple HIG 준용. "물리적으로 그럴듯한" 감속·스프링, 장식적 바운스 금지.
export const motion = {
  duration: {
    instant: 100, // 탭 하이라이트, 프레스 피드백
    fast: 200, // 토글·칩·세그먼트 전환
    base: 300, // 시트·팝오버·탭 전환
    slow: 400, // 화면 전체 전환(push/modal)
  },
  easing: {
    standard: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // 기본 easeInOut, 대부분의 상태 변화
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)', // 진입(등장) — 빠르게 시작해 부드럽게 정착
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)', // 퇴장(사라짐) — 서서히 시작해 빠르게 소멸
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // 시트 등장 등 살짝 오버슈트하는 스프링감
  },
  rules: [
    '변화는 상태를 설명해야 한다 — 장식이 아니라 "무엇이 어디서 왔는지"에 답한다.',
    '탭 피드백은 크기(scale 0.96~0.97)와 불투명도(opacity 0.8) 조합만 사용. 흔들림·회전 금지.',
    '진입은 decelerate(빠르게 시작), 퇴장은 accelerate(빠르게 사라짐) — 비대칭이 자연스럽다.',
    '시트·팝오버만 spring(과도 없는 살짝의 오버슈트) 허용. 버튼·칩에는 스프링 금지.',
    '같은 성격의 전환은 항상 같은 duration/easing — 화면마다 다른 곡선 금지.',
    '지속시간은 요소 크기에 비례: 작은 요소 100~200ms, 화면 전체 300~400ms. 500ms 이상 금지.',
  ],
} as const
