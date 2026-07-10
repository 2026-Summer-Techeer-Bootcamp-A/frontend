// 데모 시나리오 — 생각(각 단계마다 실제 도구가 낸 "결과") → 쿼리 → 답변.
// 모든 결과값(n건·유사도·묶음)은 SQL/벡터/그래프 도구의 출력에 해당한다(LLM이 지어낸 숫자가 아님).
// 백엔드 /chat v2 계약(chatContract.ts)의 steps[].detail·route·citations·confidence에 1:1 대응한다.
// route를 sql/vector/graph로 섞어, 정량은 SQL로 정확히, 풍성한 서술은 벡터·그래프 검색 근거로만 나오게 한다.

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

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'trend',
    chip: '채용 추이',
    userQ: 'React 채용 추이 어때?',
    route: 'sql',
    thinking: [
      { text: '질문 유형을 판정하는 중', result: '정량 → SQL' },
      { text: 'React 공고를 최근 12주로 집계', result: '482건' },
      { text: '주별 증감을 계산', result: '+8%' },
    ],
    query: 'count(posting) · tech=React · 최근 12주',
    vizLabel: 'React 공고 · 주별 추이',
    viz: {
      kind: 'line',
      points: [
        { x: '4/21', y: 402 }, { x: '4/28', y: 411 }, { x: '5/5', y: 405 }, { x: '5/12', y: 423 },
        { x: '5/19', y: 438 }, { x: '5/26', y: 430 }, { x: '6/2', y: 447 }, { x: '6/9', y: 452 },
        { x: '6/16', y: 449 }, { x: '6/23', y: 461 }, { x: '6/30', y: 470 }, { x: '7/7', y: 482 },
      ],
    },
    answer: [
      { text: '최근 12주 React 공고는 482건으로 8% 늘었어요.', cite: 'posting_weekly · 482건' },
      { text: '5월 중순 잠깐 정체했다가 6월부터 다시 오르는 흐름이고, 특히 최근 3주 증가폭이 뚜렷해요.', cite: '주별 추이 · 12주' },
    ],
    n: 482,
  },
  {
    id: 'similar',
    chip: '비슷한 공고',
    userQ: '내 이력서랑 비슷한 공고 찾아줘',
    route: 'vector',
    thinking: [
      { text: '이력서를 임베딩해 의미가 가까운 공고를 탐색', result: '후보 218건' },
      { text: '코사인 유사도 상위로 추리는 중', result: 'top 5' },
      { text: '공고 원문에서 근거 문장을 추출', result: '유사도 0.86' },
    ],
    query: 'vector · pgvector HNSW · resume→posting',
    vizLabel: '이력서와 유사한 공고 top 5 (유사도)',
    viz: {
      kind: 'bar',
      items: [
        { name: '토스', value: 86 }, { name: '당근마켓', value: 81 }, { name: '우아한형제들', value: 74 },
        { name: 'LINE', value: 71 }, { name: '쿠팡', value: 68 },
      ],
    },
    answer: [
      { text: '이력서와 가장 가까운 공고는 토스 백엔드예요(유사도 0.86).', cite: '유사 공고 top 5' },
      { text: '직무명은 "서버 엔지니어"로 다르지만, 요구 스택(Kotlin·Spring·MSA)이 이력서와 크게 겹쳐서 키워드 매칭으론 놓쳤을 공고예요.', cite: '공고 원문 근거' },
      { text: '상위 5곳 모두 대용량 트래픽 경험을 우대하니, 그 경험을 앞에 두면 반응이 좋을 거예요.', cite: 'top5 공통 키워드' },
    ],
    n: 218,
  },
  {
    id: 'cooccurrence',
    chip: '같이 배울 기술',
    userQ: 'React 배우면 뭘 같이 알아야 해?',
    route: 'graph',
    thinking: [
      { text: 'React 노드에서 지식그래프 이웃을 순회', result: '이웃 12노드' },
      { text: '동시요구 강도로 정렬', result: '상위 5' },
      { text: '소속 커뮤니티를 확인', result: '프론트 클러스터' },
    ],
    query: 'graph · local search · React 이웃',
    vizLabel: 'React 동반 요구 기술 (동시출현 %)',
    viz: {
      kind: 'radar',
      indicators: [
        { name: 'TypeScript', max: 100 }, { name: 'Node.js', max: 100 }, { name: 'Next.js', max: 100 },
        { name: 'Jest', max: 100 }, { name: 'GraphQL', max: 100 },
      ],
      values: [82, 55, 41, 33, 24],
    },
    answer: [
      { text: 'React를 요구하는 공고의 82%가 TypeScript도 함께 원해요.', cite: '동시출현 · 5,766건' },
      { text: 'Node.js·Next.js가 그 뒤를 이어서, 프론트만이 아니라 풀스택으로 묶이는 경향이 뚜렷해요.', cite: 'graph local search' },
      { text: '이 다섯 기술이 모두 "프론트엔드" 커뮤니티에 속해, 한 방향으로 학습하면 매칭 커버리지가 빠르게 올라요.', cite: 'community/frontend' },
    ],
    n: 5766,
  },
  {
    id: 'region',
    chip: '지역 분포',
    userQ: '공고는 주로 어디에 많아?',
    route: 'sql',
    thinking: [
      { text: '공고 위치를 권역으로 묶는 중', result: '4개 권역' },
      { text: '권역별 비중을 계산', result: '서울 68%' },
    ],
    query: 'group by region · geohash 집계',
    vizLabel: '권역별 공고 분포',
    viz: {
      kind: 'donut',
      items: [
        { name: '판교·강남', value: 214 }, { name: '서울 기타', value: 320 },
        { name: '경기', value: 140 }, { name: '지방', value: 86 },
      ],
    },
    answer: [
      { text: '서울 권역(판교·강남 포함)에 공고의 68%가 몰려 있어요.', cite: 'region_dist' },
      { text: '그중 판교·강남 권역만 214건으로, 다른 권역보다 스타트업·핀테크 공고 비중이 특히 높아요.', cite: '국내 전체 대비' },
    ],
    n: 760,
  },
  {
    id: 'compare',
    chip: '기술 비교',
    userQ: 'React·Vue·Angular 비교해줘',
    route: 'sql',
    thinking: [
      { text: '세 프레임워크 공고를 집계', result: '719건' },
      { text: '작년 동기와 비교', result: 'yoy' },
    ],
    query: 'tech_compare · yoy · React|Vue|Angular',
    vizLabel: '프레임워크 공고 · 작년 vs 올해',
    viz: {
      kind: 'grouped',
      categories: ['React', 'Vue', 'Angular'],
      series: [
        { name: '작년', values: [420, 180, 90] },
        { name: '올해', values: [482, 166, 71] },
      ],
    },
    answer: [
      { text: 'React 공고가 482건으로 작년보다 15% 늘었어요.', cite: 'tech_compare · yoy' },
      { text: '반면 Vue·Angular는 각각 8%·21% 줄어, 신규 수요가 React로 쏠리는 흐름이 분명해요.', cite: '2026-07-07 기준' },
    ],
    n: 719,
  },
]
