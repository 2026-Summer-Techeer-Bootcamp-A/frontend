import type { WidgetSize } from './dashboardConfig'

// 위젯 리사이즈 + 카탈로그 공용 타입. DesktopOverview.tsx/placeholders.tsx의 기존
// DASHBOARD_WIDGETS/MARKET_WIDGETS 배열(id/label만 있던 것)을 이 파일로 이전하며
// shape(프리뷰 아이콘 형태)/allowedSizes/defaultSize를 부여한다. 원본 배열은 아직
// 그대로 두고(다음 웨이브가 페이지에서 이 카탈로그를 소비하도록 교체) 여기서는
// 인프라만 준비한다.
export type WidgetShape = 'hero' | 'ring' | 'bars' | 'line' | 'network' | 'radar' | 'scatter' | 'list' | 'stat'

export type WidgetCatalogItem = {
  id: string
  label: string
  shape: WidgetShape
  allowedSizes: WidgetSize[]
  defaultSize: WidgetSize
}

export const DASHBOARD_WIDGETS: WidgetCatalogItem[] = [
  { id: 'hero-score', label: '내 커리어 점수', shape: 'hero', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'hero-applicable', label: '지원 가능 공고', shape: 'hero', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'stat-recent', label: '신규 공고', shape: 'stat', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'top-jobs', label: '맞춤 공고 Top', shape: 'list', allowedSizes: ['2x1', '2x2'], defaultSize: '2x2' },
  { id: 'coverage-histogram', label: '커버리지 분포', shape: 'bars', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'brief', label: '오늘 브리핑', shape: 'list', allowedSizes: ['1x1', '1x2', '2x1'], defaultSize: '1x1' },
  { id: 'deadlines', label: '마감 임박', shape: 'list', allowedSizes: ['1x1', '1x2', '2x1', '2x2'], defaultSize: '2x1' },
  { id: 'industry-fit', label: '업종 적합도', shape: 'radar', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'bookmarks', label: '북마크한 공고', shape: 'list', allowedSizes: ['1x1', '1x2', '2x1', '2x2'], defaultSize: '2x1' },
  { id: 'recent-views', label: '최근 본 공고', shape: 'list', allowedSizes: ['1x1', '1x2', '2x1'], defaultSize: '1x1' },
  { id: 'skill-momentum', label: '내 스킬 시장 모멘텀', shape: 'bars', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'latest-timeline', label: '최신 공고 타임라인', shape: 'line', allowedSizes: ['2x1', '2x2'], defaultSize: '2x2' },
  { id: 'learning-path', label: '학습 로드맵', shape: 'bars', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'skill-unlock', label: '한계 해금', shape: 'bars', allowedSizes: ['1x1', '2x1', '2x2'], defaultSize: '2x1' },
]

// v8 재구성(2026-07-14) — 스트립(변화 브리핑)·풀 셀렉터는 구조 요소라 카탈로그 밖.
// 신입 문호는 §6에 따라 코드는 남기고 렌더만 끈다(SHOW_NEWCOMER 플래그, DesktopMarket 참고) —
// 토글 인프라가 "기본 숨김"을 지원하지 않아 카탈로그엔 올리지 않는다.
export const MARKET_WIDGETS: WidgetCatalogItem[] = [
  // ① 시장 흐름
  { id: 'yearly-trend', label: '연도별 수요 레이스', shape: 'line', allowedSizes: ['2x2'], defaultSize: '2x2' },
  { id: 'group-share-frontend', label: '판도 · 프론트 프레임워크', shape: 'list', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'group-share-backend', label: '판도 · 백엔드 프레임워크', shape: 'list', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'group-share-database', label: '판도 · 데이터베이스', shape: 'list', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'group-share-language', label: '판도 · 프로그래밍 언어', shape: 'list', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'movers', label: '급상승 · 급감', shape: 'bars', allowedSizes: ['1x1', '2x1'], defaultSize: '1x1' },
  { id: 'posting-calendar', label: '채용 공고 등록 캘린더', shape: 'line', allowedSizes: ['2x1'], defaultSize: '2x1' },
  // ② 기술 수요 · 성장
  { id: 'demand-growth-scatter', label: '수요 × 성장률', shape: 'scatter', allowedSizes: ['2x1', '2x2'], defaultSize: '2x2' },
  { id: 'cooccurrence-bar', label: '동반 요구 스킬', shape: 'bars', allowedSizes: ['2x1'], defaultSize: '2x1' },
  { id: 'career-level-dist', label: '경력 요구 수준 분포', shape: 'bars', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'market-skill-unlock', label: '기술 추가 시 지원 증가', shape: 'bars', allowedSizes: ['1x1'], defaultSize: '1x1' },
  // ③ 기술 지형 · 관계
  { id: 'network', label: '기술 관계 네트워크', shape: 'network', allowedSizes: ['2x2'], defaultSize: '2x2' },
  { id: 'concept-tech-sankey', label: '개념 → 기술 Sankey', shape: 'network', allowedSizes: ['2x2'], defaultSize: '2x2' },
  // ④ 지역 · 기업
  { id: 'region-density', label: '지역별 공고 밀도', shape: 'bars', allowedSizes: ['2x1'], defaultSize: '2x1' },
  { id: 'scatter', label: '수요 × 빈도', shape: 'scatter', allowedSizes: ['1x1', '2x1', '2x2'], defaultSize: '1x1' },
  // ⑤ 글로벌 · 해외 트렌드 (pool≠domestic 전용)
  { id: 'global-domestic-lag', label: '국내 시차 타임라인', shape: 'line', allowedSizes: ['2x2'], defaultSize: '2x2' },
  { id: 'hype-vs-hire', label: 'Hype vs Hire', shape: 'scatter', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'global-domestic-gap', label: '해외서 더 뜨는 기술', shape: 'bars', allowedSizes: ['1x1', '2x1', '2x2'], defaultSize: '1x1' },
  { id: 'github-chronicle', label: 'GitHub 스타 모멘텀', shape: 'line', allowedSizes: ['1x1', '2x1', '2x2'], defaultSize: '1x1' },
]
