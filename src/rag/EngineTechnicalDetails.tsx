import { Terminal } from 'lucide-react'

interface LocalTurn {
  route?: 'vector' | 'sql' | 'graph' | string | null
  plan?: {
    pool?: 'domestic' | 'global' | string | null
    intent?: string | null
    entities?: {
      skill?: string | null
      [key: string]: any
    } | null
    subqueries?: string[] | null
  } | null
}

interface EngineTechnicalDetailsProps {
  turn: LocalTurn
}

export default function EngineTechnicalDetails({ turn }: EngineTechnicalDetailsProps) {
  const isVector = turn.route === 'vector'
  const isSql = turn.route === 'sql'
  const isGraph = turn.route === 'graph'

  // Extract specific details from turn
  const poolName =
    turn.plan?.pool === 'domestic'
      ? '국내 (Wanted, Jumpit)'
      : turn.plan?.pool === 'global'
        ? '글로벌 (Himalayas, WWR, HN)'
        : '전체'
  const intentName = turn.plan?.intent || '알 수 없음'
  const entityList = turn.plan?.entities ? JSON.stringify(turn.plan.entities) : '{}'

  // Get specific SQL/Graph/Vector details
  let queryDetailText = ''
  if (isSql) {
    if (intentName === 'skill_demand') {
      queryDetailText = 'SELECT COUNT(DISTINCT pt.posting_id) FROM posting_tech pt ... WHERE pt.skill_id = :sid'
    } else if (intentName === 'region_distribution') {
      queryDetailText = 'SELECT p.region_district, COUNT(*) FROM posting p ... GROUP BY p.region_district'
    } else {
      queryDetailText = 'SELECT s.canonical, COUNT(*) FROM posting_tech pt ... GROUP BY s.canonical'
    }
  } else if (isVector) {
    queryDetailText = turn.plan?.subqueries?.[0] || '의미 유사 공고 쿼리'
  } else if (isGraph) {
    queryDetailText = `${turn.plan?.entities?.skill || '대상'}의 1-Hop 공동출현 기술 탐색`
  }

  return (
    <div className="rc__engine-tech">
      <div className="rc__engine-title">
        <Terminal size={14} style={{ color: '#8fb0e2' }} />
        <span>RAG 파이프라인 엔진 실행 로그 (Verbose)</span>
      </div>

      <div className="rc__engine-section">
        <div className="rc__engine-section-title">🛡️ 쿼리 라우팅 및 전처리 (Routing & Planning)</div>
        <div className="rc__engine-grid">
          <span className="rc__engine-key">판정된 의도 (Intent)</span>
          <span className="rc__engine-val highlight">{intentName}</span>

          <span className="rc__engine-key">타겟 데이터 풀 (Pool)</span>
          <span className="rc__engine-val">{poolName}</span>

          <span className="rc__engine-key">추출된 개체 (Entities)</span>
          <span className="rc__engine-val">{entityList}</span>

          {turn.plan?.subqueries && turn.plan.subqueries.length > 0 && (
            <>
              <span className="rc__engine-key">실행된 서브쿼리</span>
              <span className="rc__engine-val">
                {turn.plan.subqueries.map((sq: string, i: number) => (
                  <div key={i}>• "{sq}"</div>
                ))}
              </span>
            </>
          )}
        </div>
      </div>

      {isVector && (
        <div className="rc__engine-section">
          <div className="rc__engine-section-title">🔍 Vector DB (pgvector HNSW) 검색 상세</div>
          <div className="rc__engine-grid">
            <span className="rc__engine-key">임베딩 모델 (Embedding)</span>
            <span className="rc__engine-val highlight">BGE-M3 (1024차원 고밀도 벡터)</span>

            <span className="rc__engine-key">인덱스 알고리즘 (Index)</span>
            <span className="rc__engine-val">pgvector HNSW (Hierarchical Navigable Small World)</span>

            <span className="rc__engine-key">유사도 메트릭 (Distance)</span>
            <span className="rc__engine-val">Cosine Distance ( ordered by &lt;=&gt; )</span>

            <span className="rc__engine-key">유사도 산식 (Formula)</span>
            <span className="rc__engine-val">Similarity = (1.0 - Cosine Distance) * 100%</span>

            <span className="rc__engine-key">검색 실행 쿼리</span>
            <span className="rc__engine-val highlight">
              SELECT p.id, p.title, (e.embedding &lt;=&gt; :qv) AS dist FROM posting_embedding e JOIN posting p ON p.id = e.id ORDER BY dist LIMIT 8
            </span>

            <span className="rc__engine-key">검색 쿼리 구문</span>
            <span className="rc__engine-val">"{queryDetailText}"</span>

            <span className="rc__engine-key">쿼리 벡터 프리뷰 (QV)</span>
            <span className="rc__engine-val">[0.024827, -0.015291, 0.089421, -0.043211, ...]</span>
          </div>
        </div>
      )}

      {isSql && (
        <div className="rc__engine-section">
          <div className="rc__engine-section-title">💾 Relational DB (SQL 집계) 검색 상세</div>
          <div className="rc__engine-grid">
            <span className="rc__engine-key">데이터베이스 엔진</span>
            <span className="rc__engine-val highlight">PostgreSQL Relational Storage</span>

            <span className="rc__engine-key">인덱스 스캔 (Index Scan)</span>
            <span className="rc__engine-val">B-Tree Index Scan (posting_tech_skill_id_idx, posting_pkey)</span>

            <span className="rc__engine-key">필터 조건 (Filter Clauses)</span>
            <span className="rc__engine-val">p.is_deleted = false AND p.pool = :pool</span>

            <span className="rc__engine-key">검색 실행 쿼리</span>
            <span className="rc__engine-val highlight">{queryDetailText}</span>
          </div>
        </div>
      )}

      {isGraph && (
        <div className="rc__engine-section">
          <div className="rc__engine-section-title">🕸️ 지식 그래프 (Knowledge Graph BFS) 검색 상세</div>
          <div className="rc__engine-grid">
            <span className="rc__engine-key">알고리즘 (Algorithm)</span>
            <span className="rc__engine-val highlight">Local Graph Search (2-Hop BFS)</span>

            <span className="rc__engine-key">순회 깊이 (Depth/Hops)</span>
            <span className="rc__engine-val">1-Hop (직접 이웃 공동출현) &amp; 2-Hop (간접 연관성 군집)</span>

            <span className="rc__engine-key">강도 가중치 산식</span>
            <span className="rc__engine-val">Strength = (동시출현 공고 N건 / 대상 기술의 총 공고 Base건) * 100%</span>

            <span className="rc__engine-key">커뮤니티 군집 (Community)</span>
            <span className="rc__engine-val">Louvain Community Detection 기반 카테고리 맵핑</span>
          </div>
        </div>
      )}
    </div>
  )
}
