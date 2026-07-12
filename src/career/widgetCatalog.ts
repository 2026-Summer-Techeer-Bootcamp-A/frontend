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
  { id: 'stat-coverage', label: '기술 보유율', shape: 'stat', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'stat-applicable-pct', label: '지원 가능 비율', shape: 'stat', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'stat-deadline', label: '마감 임박(7일 내)', shape: 'stat', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'stat-recent', label: '신규 공고', shape: 'stat', allowedSizes: ['1x1'], defaultSize: '1x1' },
  { id: 'top-jobs', label: '맞춤 공고 Top', shape: 'list', allowedSizes: ['2x1', '2x2'], defaultSize: '2x2' },
  { id: 'coverage-histogram', label: '커버리지 분포', shape: 'bars', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'brief', label: '오늘 브리핑', shape: 'list', allowedSizes: ['1x1', '2x1'], defaultSize: '1x1' },
  { id: 'deadlines', label: '마감 임박', shape: 'list', allowedSizes: ['1x1', '2x1', '2x2'], defaultSize: '2x1' },
  { id: 'gap-chips', label: '자주 요구되는 미보유 기술', shape: 'list', allowedSizes: ['1x1', '2x1'], defaultSize: '2x1' },
  { id: 'industry-fit', label: '업종 적합도', shape: 'radar', allowedSizes: ['2x1', '2x2'], defaultSize: '2x2' },
  { id: 'roadmap', label: '추천 로드맵', shape: 'list', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
]

export const MARKET_WIDGETS: WidgetCatalogItem[] = [
  { id: 'hero-demand', label: '수요 리더보드', shape: 'hero', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'leaderboard', label: '상위 요구 기술 Top14', shape: 'bars', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'network', label: '기술 공동출현 네트워크', shape: 'network', allowedSizes: ['2x2'], defaultSize: '2x2' },
  { id: 'propagation', label: '트렌드 전파 네트워크', shape: 'network', allowedSizes: ['2x2'], defaultSize: '2x2' },
  { id: 'yearly-trend', label: '연도별 점유율 추이', shape: 'line', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'movers', label: '급상승 · 급감 Top', shape: 'bars', allowedSizes: ['1x1', '2x1'], defaultSize: '2x1' },
  { id: 'tier-compare', label: '기업 규모별 요구 차이', shape: 'bars', allowedSizes: ['1x1', '2x1'], defaultSize: '2x1' },
  { id: 'generation-trend', label: '레거시 → 신진 스택 변화', shape: 'line', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'scatter', label: '수요 × 빈도 분포', shape: 'scatter', allowedSizes: ['2x1', '2x2'], defaultSize: '2x2' },
  { id: 'hot-companies', label: '이번 달 활발 기업', shape: 'bars', allowedSizes: ['1x1', '2x1'], defaultSize: '2x1' },
  { id: 'region-density', label: '지역별 공고 밀도', shape: 'bars', allowedSizes: ['1x1', '2x1'], defaultSize: '2x1' },
  { id: 'tier-donut', label: '기업 규모 분포', shape: 'ring', allowedSizes: ['1x1'], defaultSize: '1x1' },
]
