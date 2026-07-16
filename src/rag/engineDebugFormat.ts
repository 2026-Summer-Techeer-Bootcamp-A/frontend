// EngineFlowLog가 백엔드 ToolResult.debug / LLM last_debug(임의의 key-value)를 렌더링할 때
// 쓰는 순수 포맷 헬퍼. React 컴포넌트(.tsx)와 분리해 node:test로 직접 단위 테스트한다.

export const DEBUG_KEY_LABELS: Record<string, string> = {
  embedding_model: '임베딩 모델',
  embedding_dim: '임베딩 차원',
  embedding_preview: '쿼리 벡터 프리뷰 (앞 8차원)',
  distance_metric: '유사도 메트릭',
  raw_cosine_distances: '원시 코사인 거리 (상위 5개)',
  sql: '실행 SQL',
  sql_ms: 'SQL 실행시간',
  sql_1hop: '실행 SQL (1-Hop)',
  sql_1hop_ms: 'SQL 실행시간 (1-Hop)',
  sql_2hop_cross: '실행 SQL (2-Hop 교차)',
  sql_2hop_cross_ms: 'SQL 실행시간 (2-Hop 교차)',
  params: '바인딩 파라미터',
  strength_formula: '강도 산식',
  base_postings: '기준 공고 수',
  note: '비고',
  model: 'LLM 모델',
  temperature: 'temperature',
  attempts: 'LLM 호출 시도 횟수',
  latency_ms: 'LLM 응답 지연',
  prompt_tokens: '입력 토큰',
  output_tokens: '출력 토큰',
  total_tokens: '총 토큰',
  error: '오류',
}

const _MS_KEYS = new Set(['sql_ms', 'sql_1hop_ms', 'sql_2hop_cross_ms', 'latency_ms'])

export function formatDebugValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number' && _MS_KEYS.has(key)) return `${value}ms`
  return String(value)
}
