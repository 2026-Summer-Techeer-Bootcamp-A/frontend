// 데모 시나리오 — 생각(thinking) → 쿼리(query) → 답변(answer)을 부드럽게 흘리는 어시스턴트용.
// 각 시나리오는 서로 다른 시각화 차트(line/bar/radar/donut/grouped)를 하나씩 예시로 든다.
// 백엔드 /chat v2 계약(chatContract.ts)과는 별개인 프론트 데모 픽스처다.

export type Viz =
  | { kind: 'line'; points: { x: string; y: number }[] }
  | { kind: 'bar'; items: { name: string; value: number }[] }
  | { kind: 'radar'; indicators: { name: string; max: number }[]; values: number[] }
  | { kind: 'donut'; items: { name: string; value: number }[] }
  | { kind: 'grouped'; categories: string[]; series: { name: string; values: number[] }[] }

export interface AnswerSeg { text: string; cite: string }

export interface DemoScenario {
  id: string
  chip: string
  userQ: string
  thinking: string[]     // 자연어 사고 흐름(라벨 아닌 부드러운 문장)
  query: string          // 실제로 도는 조회 한 줄
  vizLabel: string
  viz: Viz
  answer: AnswerSeg[]
  n: number              // 근거 건수
}

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'trend',
    chip: '채용 추이',
    userQ: 'React 채용 추이 어때?',
    thinking: ['채용 데이터를 살펴보고 있어요', 'React 공고를 최근 12주로 모으는 중', '주별 증감을 계산하고 있어요'],
    query: 'posting_weekly · tech=React · 최근 12주',
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
      { text: '특히 최근 3주 증가폭이 뚜렷해요.', cite: '2026-07-07 기준' },
    ],
    n: 482,
  },
  {
    id: 'gap',
    chip: '부족한 기술',
    userQ: '내가 부족한 기술은 뭐야?',
    thinking: ['이력서 스킬과 시장 요구를 대조하는 중', '미보유 기술을 추려내고 있어요', '매칭 증가폭 순으로 정렬해요'],
    query: 'match_gap · resume ∩ market',
    vizLabel: '기술 추가 시 매칭 공고 증가폭',
    viz: {
      kind: 'bar',
      items: [
        { name: 'TypeScript', value: 394 }, { name: 'AWS', value: 241 }, { name: 'Docker', value: 188 },
        { name: 'Kubernetes', value: 156 }, { name: 'Go', value: 92 },
      ],
    },
    answer: [
      { text: '가장 큰 갭은 TypeScript예요 — 추가하면 매칭 공고가 394건 늘어요.', cite: 'match_gap 1순위' },
      { text: 'AWS·Docker가 그 다음으로 효과가 커요.', cite: '미보유 상위 5' },
    ],
    n: 1071,
  },
  {
    id: 'fit',
    chip: '직무 적합도',
    userQ: '내 직무 적합도는 어때?',
    thinking: ['직무별 요구 스킬셋을 불러오는 중', '내 스킬과 겹치는 비율을 계산해요', '직무 축에 투영하고 있어요'],
    query: 'role_fit · resume vs 5 roles',
    vizLabel: '직무별 적합도(%)',
    viz: {
      kind: 'radar',
      indicators: [
        { name: '백엔드', max: 100 }, { name: '프론트엔드', max: 100 }, { name: '데브옵스', max: 100 },
        { name: '데이터', max: 100 }, { name: '플랫폼', max: 100 },
      ],
      values: [82, 54, 68, 40, 73],
    },
    answer: [
      { text: '백엔드 적합도가 82%로 가장 높아요.', cite: 'role_fit · 5개 직무' },
      { text: '플랫폼·데브옵스도 강점이에요.', cite: '2026-07-07 기준' },
    ],
    n: 5,
  },
  {
    id: 'region',
    chip: '지역 분포',
    userQ: '공고는 주로 어디에 많아?',
    thinking: ['공고 위치를 집계하는 중', '권역별로 묶고 있어요', '비중을 계산해요'],
    query: 'region_dist · geohash 집계',
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
      { text: '판교·강남 권역만 214건이에요.', cite: '국내 전체 대비' },
    ],
    n: 760,
  },
  {
    id: 'compare',
    chip: '기술 비교',
    userQ: 'React·Vue·Angular 비교해줘',
    thinking: ['세 기술의 공고를 모으는 중', '작년 동기와 비교하고 있어요', '증감을 계산해요'],
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
      { text: 'React 공고가 482건으로 작년보다 늘었어요.', cite: 'tech_compare · yoy' },
      { text: '반면 Vue·Angular는 소폭 줄었어요.', cite: '2026-07-07 기준' },
    ],
    n: 719,
  },
]
