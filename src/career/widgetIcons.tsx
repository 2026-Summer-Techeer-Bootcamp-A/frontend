import type { WidgetShape } from './widgetCatalog'

// 위젯 설정 팝오버 체크박스 옆에 붙는 초소형 모노크롬 프리뷰 아이콘. 위젯이 실제로
// 어떤 형태(히어로 카드/링/막대/꺾은선 등)인지 한눈에 구분되도록 형태만 아주 단순히
// 축약한다. 색은 전부 currentColor — 부모가 color로 톤을 제어한다.
export function WidgetShapeIcon({ shape, size = 22 }: { shape: WidgetShape; size?: number }) {
  const h = size * (14 / 18)
  const common = { width: size, height: h, viewBox: '0 0 18 14', 'aria-hidden': true }

  switch (shape) {
    case 'hero':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="16" height="12" rx="2.5" fill="currentColor" opacity="0.85" />
          <circle cx="4.5" cy="10" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'ring':
      return (
        <svg {...common}>
          <circle cx="9" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'bars':
      return (
        <svg {...common}>
          <rect x="1.5" y="8.5" width="3" height="4.5" fill="currentColor" />
          <rect x="6.5" y="6" width="3" height="7" fill="currentColor" />
          <rect x="11.5" y="3" width="3" height="10" fill="currentColor" />
        </svg>
      )
    case 'line':
      return (
        <svg {...common}>
          <polyline
            points="1,11 5.5,4.5 9,9 13,2.5 17,7"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      )
    case 'network':
      return (
        <svg {...common}>
          <line x1="3" y1="11" x2="9" y2="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="9" y1="3" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" />
          <line x1="3" y1="11" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="3" cy="11" r="1.6" fill="currentColor" />
          <circle cx="9" cy="3" r="1.6" fill="currentColor" />
          <circle cx="15" cy="9" r="1.6" fill="currentColor" />
        </svg>
      )
    case 'radar':
      return (
        <svg {...common}>
          <polygon
            points="9,1.5 16,6 13.5,12.5 4.5,12.5 2,6"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
      )
    case 'scatter':
      return (
        <svg {...common}>
          <circle cx="2.5" cy="10.5" r="1.1" fill="currentColor" />
          <circle cx="6" cy="4.5" r="1.1" fill="currentColor" />
          <circle cx="9.5" cy="9" r="1.1" fill="currentColor" />
          <circle cx="12.5" cy="3" r="1.1" fill="currentColor" />
          <circle cx="15.5" cy="7.5" r="1.1" fill="currentColor" />
          <circle cx="14" cy="11.5" r="1.1" fill="currentColor" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <line x1="1.5" y1="3" x2="16.5" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1.5" y1="7" x2="16.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1.5" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'stat':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="7" width="4" height="6" rx="1" fill="currentColor" />
        </svg>
      )
  }
}
