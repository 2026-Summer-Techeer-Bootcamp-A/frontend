// 데모 시나리오 — 프리셋 칩(하단 rc__chips·빈 상태 CommandPalette의 rc__palette-item)의 시드 데이터.
// RagConsole은 이 중 chip(칩 라벨)·userQ(실제로 보내는 질문)만 쓴다 — 클릭하면 userQ를 실 백엔드
// /chat/stream으로 그대로 보내 진짜 응답을 받아온다(칩은 가짜 답변을 재생하지 않는다).
// thinking/query/vizLabel/viz/answer/n은 DemoScenario 타입을 채우기 위한 예시성 참고 데이터로,
// 지금 화면에는 렌더되지 않는다 — 실제 결과는 항상 라이브 스트림에서 온다.
export type Route = 'sql' | 'vector' | 'graph'

export type Viz =
  | { kind: 'line'; points: { x: string; y: number }[] }
  | { kind: 'bar'; items: { name: string; value: number }[] }
  | { kind: 'radar'; indicators: { name: string; max: number }[]; values: number[] }
  | { kind: 'donut'; items: { name: string; value: number }[] }
  | { kind: 'grouped'; categories: string[]; series: { name: string; values: number[] }[] }

export interface ThinkStep { text: string; result: string }
export interface AnswerSeg { text: string; cite: string }

export interface DemoScenario {
  id: string
  chip: string
  userQ: string
  route: Route
  thinking: ThinkStep[]   // 각 단계 = 도구 호출 + 그 결과
  query: string
  vizLabel: string
  viz: Viz
  answer: AnswerSeg[]
  n: number
}

// 총 6개, 그리드/칩에 노출되는 순서 그대로 배열돼 있다.
// 앞의 2개는 구직자가 실제로 물어볼 법한 평범한 통계성 질문으로, SQL 집계 경로를 탄다
// (백엔드 인기 기술, 신입 인기 자격증). 그리드 상단에서 "일상적으로 이렇게 물어봐도 된다"를 보여준다.
// 뒤의 4개는 벡터 검색의 실제 강점을 보여주기 위해 검증된 프롬프트다(키워드 매칭이면
// 놓칠 질의를 의미 기반 임베딩이 잡아내는 케이스). 그리드 하단에서 각기 다른 강점을 하나씩 보여준다:
// 의미적 바꿔말하기("예쁘게 만드는" → 프론트/UI 직무), 업무 서술→직군 매핑(MLOps),
// 언어 간 검색(영문 질의 → 국내 한글 공고), 표기 변형 흡수(React Native ≈ RN·모바일 앱).
export const SCENARIOS: DemoScenario[] = [
  {
    id: 'sql-backend-top-skills',
    chip: '백엔드 인기 기술',
    userQ: '요즘 백엔드 공고에서 제일 많이 찾는 기술이 뭐야?',
    route: 'sql',
    thinking: [
      { text: '백엔드 직군 공고를 필터링해 기술 태그를 집계', result: '공고 1,842건' },
      { text: '태그별 등장 빈도로 정렬', result: '상위 5개 기술' },
    ],
    query: 'sql · posting_tech GROUP BY · 직군 필터',
    vizLabel: '백엔드 공고 상위 기술 top 5',
    viz: {
      kind: 'bar',
      items: [
        { name: 'Python', value: 612 }, { name: 'Java', value: 548 }, { name: 'Spring', value: 471 },
        { name: 'AWS', value: 429 }, { name: 'Docker', value: 356 },
      ],
    },
    answer: [
      { text: '최근 백엔드 공고에서 가장 많이 요구하는 기술은 Python이고 Java, Spring이 뒤를 이어요.', cite: '백엔드 직군 공고 1,842건 집계' },
      { text: 'AWS와 Docker도 상위권이라 클라우드 배포 경험이 사실상 기본 요구로 자리잡았어요.', cite: '기술 태그 빈도 순위' },
    ],
    n: 1842,
  },
  {
    id: 'sql-entry-certs',
    chip: '신입 인기 자격증',
    userQ: '신입 개발자 공고에서 많이 보는 자격증이 뭐야?',
    route: 'sql',
    thinking: [
      { text: '신입 대상 공고를 필터링해 요구 자격증을 집계', result: '공고 612건' },
      { text: '자격증별 등장 빈도로 정렬', result: '상위 5개' },
    ],
    query: 'sql · posting_cert GROUP BY · entry_level 필터',
    vizLabel: '신입 공고 상위 자격증 top 5',
    viz: {
      kind: 'bar',
      items: [
        { name: '정보처리기사', value: 214 }, { name: 'AWS Certified', value: 87 }, { name: 'SQLD', value: 63 },
        { name: '리눅스마스터', value: 41 }, { name: 'OCJP', value: 28 },
      ],
    },
    answer: [
      { text: '신입 공고에서는 정보처리기사가 압도적으로 많이 언급되고, AWS 인증과 SQLD가 뒤를 이어요.', cite: '신입 공고 612건 집계' },
      { text: '클라우드와 데이터베이스 관련 자격증이 상위권인 걸 보면 실무 준비도를 함께 보는 경향이 있어요.', cite: '자격증 태그 빈도 순위' },
    ],
    n: 612,
  },
  {
    id: 'vector-pretty-ui',
    chip: '예쁜 화면 개발자',
    userQ: '웹 화면 예쁘게 만드는 개발자 공고 추천해줘',
    route: 'vector',
    thinking: [
      { text: '질의를 임베딩해 의미가 가까운 공고를 탐색', result: '후보 173건' },
      { text: '"예쁘게 만드는"을 UI/UX·디자인 시스템 직무로 의미 연결', result: '프론트엔드 클러스터' },
      { text: '코사인 유사도 상위로 추리는 중', result: '유사도 0.81' },
    ],
    query: 'vector · pgvector HNSW · 자연어 질의→공고',
    vizLabel: '의미 유사 공고 top 5 (유사도)',
    viz: {
      kind: 'bar',
      items: [
        { name: '토스', value: 81 }, { name: '무신사', value: 77 }, { name: '오늘의집', value: 74 },
        { name: '당근마켓', value: 70 }, { name: '카카오스타일', value: 66 },
      ],
    },
    answer: [
      { text: '"예쁘게 만드는"이라는 표현을 프론트엔드·UI 엔지니어링 직무로 의미 연결해 찾았어요.', cite: '벡터 검색 · 유사도 0.81' },
      { text: '공고 원문에 "디자인 시스템", "픽셀 퍼펙트" 같은 표현이 있어 키워드로는 놓쳤을 공고예요.', cite: '공고 원문 근거' },
    ],
    n: 173,
  },
  {
    id: 'vector-mlops',
    chip: 'ML 배포 공고',
    userQ: '머신러닝 모델을 실제 서비스에 배포하는 일 하는 공고 찾아줘',
    route: 'vector',
    thinking: [
      { text: '업무 서술문을 임베딩해 의미가 가까운 공고를 탐색', result: '후보 96건' },
      { text: '"모델을 서비스에 배포"를 MLOps/ML 엔지니어 직군으로 매핑', result: 'MLOps 클러스터' },
      { text: '코사인 유사도 상위로 추리는 중', result: '유사도 0.84' },
    ],
    query: 'vector · pgvector HNSW · 업무서술→직군',
    vizLabel: '의미 유사 공고 top 5 (유사도)',
    viz: {
      kind: 'bar',
      items: [
        { name: '네이버', value: 84 }, { name: '카카오브레인', value: 79 }, { name: '업스테이지', value: 76 },
        { name: '뤼튼', value: 72 }, { name: '스캐터랩', value: 69 },
      ],
    },
    answer: [
      { text: '직무명에 "머신러닝"이 없어도 모델 서빙·추론 파이프라인을 다루는 MLOps 공고를 찾았어요.', cite: '벡터 검색 · 유사도 0.84' },
      { text: '공고 원문의 "모델 서빙", "추론 최적화" 같은 표현이 질의와 의미적으로 가까워요.', cite: '공고 원문 근거' },
    ],
    n: 96,
  },
  {
    id: 'vector-cross-lingual',
    chip: 'K8s 백엔드',
    userQ: 'backend engineer with kubernetes experience',
    route: 'vector',
    thinking: [
      { text: '영문 질의를 임베딩해 국내 공고 풀에서 의미가 가까운 공고를 탐색', result: '후보 152건' },
      { text: '언어 경계를 넘어 "쿠버네티스 경험 우대" 한글 공고와 매칭', result: '교차언어 매칭' },
      { text: '코사인 유사도 상위로 추리는 중', result: '유사도 0.79' },
    ],
    query: 'vector · pgvector HNSW · cross-lingual',
    vizLabel: '의미 유사 공고 top 5 (유사도)',
    viz: {
      kind: 'bar',
      items: [
        { name: '쿠팡', value: 79 }, { name: '당근마켓', value: 75 }, { name: 'NHN클라우드', value: 71 },
        { name: '왓챠', value: 68 }, { name: '뱅크샐러드', value: 64 },
      ],
    },
    answer: [
      { text: '영문 질의를 그대로 국내 한글 공고 풀에 매칭했어요 — 언어가 달라도 의미가 통해요.', cite: '벡터 검색 · 유사도 0.79' },
      { text: '공고 원문은 한글("쿠버네티스", "컨테이너 오케스트레이션")이지만 벡터 공간에서 질의와 가까워요.', cite: '공고 원문 근거' },
    ],
    n: 152,
  },
  {
    id: 'vector-react-native',
    chip: 'RN 모바일 앱',
    userQ: 'React Native로 모바일 앱 만드는 공고 추천',
    route: 'vector',
    thinking: [
      { text: '질의를 임베딩해 의미가 가까운 공고를 탐색', result: '후보 84건' },
      { text: '"React Native"의 표기 변형(RN·크로스플랫폼 앱)을 함께 흡수', result: '표기 변형 매칭' },
      { text: '코사인 유사도 상위로 추리는 중', result: '유사도 0.83' },
    ],
    query: 'vector · pgvector HNSW · 표기 변형 흡수',
    vizLabel: '의미 유사 공고 top 5 (유사도)',
    viz: {
      kind: 'bar',
      items: [
        { name: '토스', value: 83 }, { name: '당근마켓', value: 78 }, { name: '무신사', value: 73 },
        { name: '컬리', value: 70 }, { name: '야놀자', value: 65 },
      ],
    },
    answer: [
      { text: '"React Native"뿐 아니라 "RN", "크로스플랫폼 앱" 같은 표기 변형까지 흡수해 찾았어요.', cite: '벡터 검색 · 유사도 0.83' },
      { text: '공고 원문에 정확히 "React Native"라고 안 써 있어도 의미가 가까우면 잡아내요.', cite: '공고 원문 근거' },
    ],
    n: 84,
  },
]
