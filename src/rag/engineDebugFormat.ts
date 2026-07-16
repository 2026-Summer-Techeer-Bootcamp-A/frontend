// EngineTechnicalDetails가 백엔드 ToolResult.debug(임의의 key-value)를 렌더링할 때 쓰는
// 순수 포맷 헬퍼. React 컴포넌트(.tsx)와 분리해 node:test로 직접 단위 테스트한다.

export const DEBUG_KEY_LABELS: Record<string, string> = {
  embedding_model: '임베딩 모델',
  embedding_dim: '임베딩 차원',
  embedding_preview: '쿼리 벡터 프리뷰 (앞 8차원)',
  distance_metric: '유사도 메트릭',
  sql: '실행 SQL',
  sql_1hop: '실행 SQL (1-Hop)',
  sql_2hop_cross: '실행 SQL (2-Hop 교차)',
  params: '바인딩 파라미터',
  strength_formula: '강도 산식',
  base_postings: '기준 공고 수',
  note: '비고',
}

export function formatDebugValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
