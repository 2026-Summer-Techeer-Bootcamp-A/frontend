// /chat v2 시나리오 픽스처 — RagConsole·데모 오토플레이가 사용.
// 원문 데이터 출처: src/design/ragAssistant.tsx의 하드코딩 SCENARIOS(9종).
// steps/route/plan은 계약(chatContract.ts) 및 task-2-brief.md의 라우팅 규칙을 따른다:
//   - 정량/집계/랭킹(trend, gap, certs, whatif, region, company) → route:'sql'
//   - 의미 유사(similar) → route:'vector'
//   - 관계/동반/클러스터(cooccurrence, rising) → route:'graph'
//   - rising만 eval에 status:'retry' 1회를 넣어 재검색 루프를 데모한다.

import type { DemoScenario } from './chatContract'

export const SCENARIOS: DemoScenario[] = [
  // 1) 관계 질문 → graph 라우팅 (그래프 모먼트의 주인공)
  {
    id: 'cooccurrence',
    chipLabel: '같이 배울 기술',
    userQ: 'React 배우면 뭘 같이 알아야 해?',
    response: {
      route: 'graph',
      plan: { intent: 'cooccurrence', subqueries: ['React 이웃 기술'], tools: ['graph'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '관계 질문 → graph 라우팅', status: 'done' },
        { kind: 'tool', tool: 'graph', label: '지식그래프 순회', detail: 'React 이웃 3노드 · 엣지 3', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '동시출현율 인용', status: 'done' },
      ],
      tool_results: [
        {
          kind: 'graph', label: '순회 서브그래프', focusId: 'react',
          traversal: ['react', 'typescript', 'nodejs', 'nextjs'],
          nodes: [
            { id: 'react', label: 'React', group: 'frontend', focus: true },
            { id: 'typescript', label: 'TypeScript', group: 'frontend' },
            { id: 'nodejs', label: 'Node.js', group: 'backend' },
            { id: 'nextjs', label: 'Next.js', group: 'frontend' },
          ],
          edges: [
            { source: 'react', target: 'typescript', strength: 82, label: '82%' },
            { source: 'react', target: 'nodejs', strength: 55, label: '55%' },
            { source: 'react', target: 'nextjs', strength: 41, label: '41%' },
          ],
        },
        {
          kind: 'list', label: '동반 기술',
          items: [
            { name: 'TypeScript', metric: '82%', pct: 82 },
            { name: 'Node.js', metric: '55%', pct: 55 },
            { name: 'Next.js', metric: '41%', pct: 41 },
          ],
        },
      ],
      answer: [
        { text: 'React를 요구하는 공고의 82%는 TypeScript도 같이 원해요.', cite: '동시출현율 · 공고 5,766건' },
        { text: 'Node.js·Next.js가 그 다음으로 자주 같이 나와요.', cite: '2026-07-07 기준' },
      ],
      citations: [{ type: 'community', ref: 'community/frontend', label: '프론트 클러스터 · 공고 5,766건' }],
      confidence: { level: 5, n: 5766 },
      degraded: false,
    },
  },

  // 2) 정량 질문 → sql 라우팅
  {
    id: 'trend',
    chipLabel: '채용 추이',
    userQ: 'React 공고 추이는 어때?',
    response: {
      route: 'sql',
      plan: { intent: 'trend', subqueries: ['React 최근 30일 공고 수'], tools: ['sql'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '정량 질문 → sql 강제', status: 'done' },
        { kind: 'tool', tool: 'sql', label: '집계 쿼리 실행', detail: 'count · React · 최근 30일', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '수치 그대로 인용', status: 'done' },
      ],
      tool_results: [
        { kind: 'trend', label: '채용 공고 데이터 조회', n: 482, unit: '건 · React · 최근 30일', delta: '+8%', spark: [28, 31, 30, 35, 38, 34, 40, 44, 41, 46, 44, 48] },
      ],
      answer: [
        { text: '최근 30일 React 공고는 482건으로 8% 늘었어요.', cite: '공고 482건 · React · 2026-07-07' },
        { text: '보유 기술 기준 커버리지는 상위 20개 중 73%예요.', cite: '2026-07-07 기준' },
      ],
      citations: [{ type: 'sql', ref: 'agg/posting_daily', label: '집계 테이블 · React · 30일' }],
      confidence: { level: 5, n: 482 },
      degraded: false,
    },
  },

  // 3) 의미 유사 질문 → vector 라우팅
  {
    id: 'similar',
    chipLabel: '비슷한 공고',
    userQ: '내 이력서와 비슷한 공고는?',
    response: {
      route: 'vector',
      plan: { intent: 'similar', subqueries: ['이력서 스킬 임베딩', '유사 공고 검색'], tools: ['vector'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '의미 유사 질문 → vector 라우팅', status: 'done' },
        { kind: 'tool', tool: 'vector', label: '임베딩 유사도 검색', detail: '이력서 벡터 · 공고 12건 비교', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '유사도 순 인용', status: 'done' },
      ],
      tool_results: [
        {
          kind: 'list', label: '비슷한 공고 검색',
          items: [
            { name: '토스', sub: '백엔드 엔지니어', metric: '86%', pct: 86 },
            { name: '당근마켓', sub: '서버 개발자', metric: '81%', pct: 81 },
            { name: '우아한형제들', sub: '플랫폼 엔지니어', metric: '74%', pct: 74 },
          ],
        },
      ],
      answer: [
        { text: '이력서와 가장 비슷한 공고는 토스 백엔드예요(유사도 86%).', cite: '유사 공고 12건 · 2026-07-07' },
        { text: '다음은 당근마켓 서버 개발자예요(유사도 81%).', cite: '2026-07-07 기준' },
      ],
      citations: [{ type: 'vector', ref: 'vector/resume_postings', label: '이력서-공고 임베딩 유사도 · 12건' }],
      confidence: { level: 3, n: 12 },
      degraded: false,
    },
  },

  // 4) 정량(갭 집계) 질문 → sql 라우팅
  {
    id: 'gap',
    chipLabel: '부족한 기술',
    userQ: '내가 부족한 기술이 뭐야?',
    response: {
      route: 'sql',
      plan: { intent: 'gap', subqueries: ['이력서 보유 기술 조회', '시장 요구 기술과 대조'], tools: ['sql'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '정량 질문 → sql 강제', status: 'done' },
        { kind: 'tool', tool: 'sql', label: '갭 집계 쿼리 실행', detail: '이력서 vs 시장 요구 diff', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '영향 큰 순서로 인용', status: 'done' },
      ],
      tool_results: [
        {
          kind: 'list', label: '기술 갭 분석',
          items: [
            { name: 'TypeScript', metric: '+394건', rank: 1 },
            { name: 'AWS', metric: '+241건', rank: 2 },
            { name: 'Docker', metric: '+188건', rank: 3 },
          ],
        },
      ],
      answer: [
        { text: '가장 큰 갭은 TypeScript예요. 추가하면 매칭 공고가 394건 늘어나요.', cite: '미보유 기술 1순위 · 2026-07-07' },
        { text: '그다음은 AWS·Docker 순이에요.', cite: '커버리지 레이더 기준' },
      ],
      citations: [{ type: 'sql', ref: 'agg/skill_gap', label: '기술 갭 집계 · 미보유 기술 1순위' }],
      confidence: { level: 4, n: 794 },
      degraded: false,
    },
  },

  // 5) 관계/클러스터(관심도 신호) 질문 → graph 라우팅. 근거 부족 → 재검색(retry) 루프 데모.
  {
    id: 'rising',
    chipLabel: '뜨는 기술',
    userQ: '요즘 뜨는 기술 뭐야?',
    response: {
      route: 'graph',
      plan: { intent: 'rising', subqueries: ['최근 관심 신호 그래프 순회', '채용 수요 그래프와 대조'], tools: ['graph'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '관계/클러스터 질문 → graph 라우팅', status: 'done' },
        { kind: 'tool', tool: 'graph', label: '커뮤니티 언급 그래프 순회', detail: 'HN·GitHub 언급 그래프 1차 탐색', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: '근거 부족 → 그래프 재순회', status: 'retry' },
        { kind: 'tool', tool: 'graph', label: '커뮤니티 언급 그래프 재순회', detail: '탐색 범위 확장 · 채용 수요 노드 포함', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (재검색 후)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '참고용 신호로 인용', status: 'done' },
      ],
      tool_results: [
        {
          kind: 'list', label: '관심도 상승 기술',
          items: [
            { name: 'Rust', metric: '관심 급증' },
            { name: 'Bun', metric: '관심 급증' },
            { name: 'Zig', metric: '완만한 상승' },
          ],
        },
      ],
      answer: [
        { text: 'Rust·Bun이 최근 커뮤니티 언급이 눈에 띄게 늘었어요.', cite: 'HN·GitHub 관심 신호 기준' },
        { text: '다만 아직 채용 수요로 크게 이어지진 않았어요.', cite: '참고용 신호 · 2026-07-07' },
      ],
      citations: [{ type: 'community', ref: 'community/hn_github', label: 'HN·GitHub 관심 신호 · 41건' }],
      confidence: { level: 2, n: 41 },
      degraded: false,
    },
  },

  // 6) 정량(자격증 집계) 질문 → sql 라우팅
  {
    id: 'certs',
    chipLabel: '필요한 자격증',
    userQ: '백엔드 직무에 필요한 자격증은?',
    response: {
      route: 'sql',
      plan: { intent: 'certs', subqueries: ['백엔드 공고 수집', '요구 자격증 집계'], tools: ['sql'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '정량 질문 → sql 강제', status: 'done' },
        { kind: 'tool', tool: 'sql', label: '자격증 요구 집계 쿼리 실행', detail: '백엔드 공고 · 자격증 빈도', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '빈도 순 인용', status: 'done' },
      ],
      tool_results: [
        {
          kind: 'list', label: '자격증 요구 현황',
          items: [
            { name: 'AWS Solutions Architect', metric: '1,451건' },
            { name: 'PMP', metric: '1,018건' },
            { name: 'CKA', metric: '134건' },
          ],
        },
      ],
      answer: [
        { text: '백엔드 공고에서 가장 많이 요구하는 자격증은 AWS SA예요.', cite: '공고 1,451건 · 2026-07-07' },
        { text: '보유 중이시면 이미 상위권이에요.', cite: '자격증 갭 분석 기준' },
      ],
      citations: [{ type: 'sql', ref: 'agg/cert_requirements', label: '자격증 요구 집계 · 백엔드 공고 1,451건' }],
      confidence: { level: 5, n: 1451 },
      degraded: false,
    },
  },

  // 7) 정량(기업 랭킹) 질문 → sql 라우팅
  {
    id: 'company',
    chipLabel: '원하는 회사',
    userQ: 'Kotlin 원하는 회사 어디야?',
    response: {
      route: 'sql',
      plan: { intent: 'company', subqueries: ['Kotlin 요구 공고 수집', '최근/과거 180일 비교'], tools: ['sql'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '정량 질문 → sql 강제', status: 'done' },
        { kind: 'tool', tool: 'sql', label: '기업 조회 쿼리 실행', detail: 'Kotlin · 최근 180일 vs 과거 180일', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '응답률 함께 인용', status: 'done' },
      ],
      tool_results: [
        {
          kind: 'list', label: '기업 조회',
          items: [
            { name: '카카오', sub: '최근 채용', metric: '응답률 91%' },
            { name: '우아한형제들', sub: '최근 채용', metric: '응답률 84%' },
            { name: '토스', sub: '과거 채용', metric: '응답률 -' },
          ],
        },
      ],
      answer: [
        { text: '요즘 Kotlin을 원하는 곳은 카카오·우아한형제들이에요.', cite: '최근 180일 기준 · 2026-07-07' },
        { text: '토스는 예전엔 원했지만 최근엔 공고가 없었어요.', cite: '과거 180일 비교' },
      ],
      citations: [{ type: 'sql', ref: 'agg/company_kotlin', label: 'Kotlin 요구 기업 집계 · 최근 180일' }],
      confidence: { level: 3, n: 63 },
      degraded: false,
    },
  },

  // 8) 정량(가상 시뮬레이션) 질문 → sql 라우팅
  {
    id: 'whatif',
    chipLabel: '이거 배우면?',
    userQ: '쿠버네티스 배우면 어때?',
    response: {
      route: 'sql',
      plan: { intent: 'whatif', subqueries: ['현재 매칭 공고 수 조회', '쿠버네티스 추가 시뮬레이션'], tools: ['sql'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '정량 질문 → sql 강제', status: 'done' },
        { kind: 'tool', tool: 'sql', label: '가상 시뮬레이션 쿼리 실행', detail: '기술 추가 전/후 매칭 공고 수 비교', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '증가분 그대로 인용', status: 'done' },
      ],
      tool_results: [
        { kind: 'compare', label: '가상 시뮬레이션', beforeLabel: '지금', before: 5120, afterLabel: '쿠버네티스 추가 시', after: 6033, deltaLabel: '+913건' },
      ],
      answer: [
        { text: '쿠버네티스를 추가하면 매칭 공고가 5,120건에서 6,033건으로 늘어나요.', cite: '913건 증가 · 국내 기준' },
        { text: '지금 갭 중에서 효과가 가장 큰 기술이에요.', cite: '2026-07-07 기준' },
      ],
      citations: [{ type: 'sql', ref: 'sim/skill_addition', label: '가상 시뮬레이션 · 913건 증가' }],
      confidence: { level: 5, n: 82000 },
      degraded: false,
    },
  },

  // 9) 정량(지역 집계) 질문 → sql 라우팅
  {
    id: 'region',
    chipLabel: '지역별 공고',
    userQ: '판교 쪽 공고 많아?',
    response: {
      route: 'sql',
      plan: { intent: 'region', subqueries: ['판교·강남 반경 3km 공고 집계'], tools: ['sql'], pool: 'domestic' },
      steps: [
        { kind: 'plan', label: '질문 분해', detail: '정량 질문 → sql 강제', status: 'done' },
        { kind: 'tool', tool: 'sql', label: '지역 조회 쿼리 실행', detail: '판교·강남 반경 3km · 비중 계산', status: 'done' },
        { kind: 'eval', label: '근거 충분성 검증', detail: 'pass (1회)', status: 'done' },
        { kind: 'synth', label: '답변 합성', detail: '비중 함께 인용', status: 'done' },
      ],
      tool_results: [
        { kind: 'stat', label: '지역 조회', big: 214, suffix: '건', caption: '판교·강남 반경 3km', sub: '국내 전체의 18%' },
      ],
      answer: [
        { text: '판교·강남 권역에만 214건이 몰려 있어요.', cite: '국내 공고 전체의 18% · 2026-07-07' },
        { text: '특히 판교는 스타트업 비중이 높아요.', cite: '기업 규모 분포 기준' },
      ],
      citations: [{ type: 'sql', ref: 'agg/region_pangyo', label: '지역 집계 · 판교·강남 214건' }],
      confidence: { level: 4, n: 214 },
      degraded: false,
    },
  },
]
