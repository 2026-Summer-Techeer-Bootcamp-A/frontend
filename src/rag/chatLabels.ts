// 백엔드 계약(route/intent)은 내부용 영문 슬러그라 화면에 그대로 노출하면 사용자가 못 읽는다.
// 기본 모드 배지·로그 뷰가 공용으로 쓰는 사용자용 한글 라벨 매핑. 원천: backend/app/services/rag/pipeline.py
// (route는 backend/app/services/rag/schemas.py의 Literal["sql","vector","graph","mixed"]).
import type { Route } from './chatContract'

export const ROUTE_LABEL: Record<Route, string> = {
  sql: '수치 집계',
  vector: '의미 검색',
  graph: '관계 분석',
  mixed: '복합 분석',
}

export const INTENT_LABEL: Record<string, string> = {
  cooccurrence: '동반 기술',
  semantic_search: '의미 유사 검색',
  skill_demand: '기술 수요',
  compare: '기술 비교',
  concept_ranking: '트렌드 개념 랭킹',
  cert_ranking: '자격증 랭킹',
  region_distribution: '지역 분포',
  skill_ranking: '기술 랭킹',
  overview: '전체 현황',
}

export function routeLabel(route: Route | string | undefined | null): string {
  if (!route) return '알 수 없음'
  return ROUTE_LABEL[route as Route] ?? route
}

export function intentLabel(intent: string | undefined | null): string {
  if (!intent) return '알 수 없음'
  return INTENT_LABEL[intent] ?? intent
}
