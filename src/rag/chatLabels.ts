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

/** 소요 시간(ms)을 사람이 읽는 단위로. 1000ms 이상이면 초 단위 소수 1자리, 아니면 ms 그대로.
 *  원래 EngineFlowLog 안에만 있던 걸 여기로 옮겨 ProcessTimeline 등 다른 곳에서도 재사용한다. */
export function msLabel(ms?: number | null): string | null {
  if (ms === null || ms === undefined) return null
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

// 스킬 카테고리 슬러그(백엔드 canonical category) → 한글 라벨. career/kit.tsx의 TECH_CATEGORY_LABEL과
// 같은 슬러그 집합을 다루지만 그쪽은 export가 안 돼 있어(비공개 상수) 여기서 독립적으로 정의한다 —
// 이력서↔시장 비교 카드의 레이더 축 라벨(3.c)에서 쓸 예정.
export const CATEGORY_LABEL: Record<string, string> = {
  language: '언어',
  backend: '백엔드',
  frontend: '프론트엔드',
  data_db: '데이터·DB',
  cloud_services: '클라우드',
  devops: 'DevOps',
  mobile: '모바일',
  ai_llm: 'AI·LLM',
  testing: '테스트',
  design: '디자인',
  collab_pm: '협업·PM',
  enterprise_saas: '엔터프라이즈·SaaS',
  ide: 'IDE',
  embedded: '임베디드',
  desktop: '데스크톱',
  graphics_game: '그래픽·게임',
  cad_eda: 'CAD·EDA',
  security: '보안',
  media: '미디어',
}

export function categoryLabel(category: string | undefined | null): string {
  if (!category) return '기타'
  return CATEGORY_LABEL[category] ?? '기타'
}
