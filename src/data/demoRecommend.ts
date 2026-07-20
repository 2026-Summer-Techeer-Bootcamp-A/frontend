import careerData from './careerData.json' with { type: 'json' }

// 데모용 추천 공고 큐레이션 — WorkflowMap.tsx의 "추천 공고" 버튼은 원래 dreamCompanies
// 기업명으로 백엔드 API(jobsApi.list)를 조회했다. 로그인 없는 게스트나 백엔드가 죽어있는
// 환경에서는 이 호출이 항상 실패해 버튼이 데모 도중 아무것도 못 보여줬다. 이 파일은
// careerData.json에 이미 들어있는 실제 공고 126개를 그대로 읽어 직무 8개로 분류하고,
// 각 직무마다 "유명 기업 우선 → 정보량(자기소개/자격요건 섹션 수) 우선" 순으로 몇 개씩
// 추려낸다. 네트워크 호출이 전혀 없고 입력이 고정 파일이라 항상 같은 결과가 나온다
// (랜덤 없음, 시간 의존 없음) — 이 결정성이 오프라인 데모의 핵심이다.

type CareerPosting = (typeof careerData.postings)[number]

export type DemoRole =
  | '백엔드'
  | '프론트엔드'
  | '풀스택'
  | '데이터 분석'
  | '데이터 엔지니어'
  | 'ML·AI'
  | '데브옵스·SRE'
  | '모바일'

export type DemoPostingCard = {
  id: string
  company: string
  title: string
  techs: string[]
  careerMin: number | null
  careerMax: number | null
  industry: string
  tier: string | null
  logo: string
  requirementSummary?: string
}

export type DemoRoleGroup = { role: DemoRole; postings: DemoPostingCard[] }

// 모달에 보여줄 직무 순서 — 사용자가 지정한 순서를 그대로 쓴다. 분류 우선순위
// (CLASSIFY_ORDER)와는 다른 목적의 배열이라 따로 둔다.
const DISPLAY_ORDER: DemoRole[] = [
  '백엔드', '프론트엔드', '풀스택', '데이터 분석',
  '데이터 엔지니어', 'ML·AI', '데브옵스·SRE', '모바일',
]

// 분류 우선순위 — 식별력이 높은(다른 직무와 잘 안 겹치는) 직무부터 먼저 검사한다.
// 예를 들어 Kotlin은 백엔드에도 안드로이드에도 나오는 기술이라, 백엔드처럼 기술
// 태그가 넓은 캐치올 직무를 맨 마지막에 둬야 모바일/ML·AI 공고가 전부 백엔드로
// 빨려 들어가는 걸 막을 수 있다.
const CLASSIFY_ORDER: DemoRole[] = [
  '모바일', 'ML·AI', '데브옵스·SRE', '데이터 엔지니어', '데이터 분석', '프론트엔드', '풀스택', '백엔드',
]

// 직무 판별 규칙 — title 키워드(직함에 그 직무 이름이 그대로 있으면 강한 신호)와
// tech 키워드(직무 전형적인 스택) 두 갈래로 점수를 매긴다. 전부 소문자 부분 문자열
// 매칭이라 대소문자·표기 차이(Node.js vs node.js)에 흔들리지 않는다.
const ROLE_RULES: Record<DemoRole, { title: string[]; tech: string[] }> = {
  모바일: {
    title: ['안드로이드', 'android', 'ios', 'flutter', '앱 개발', 'xr/vr', 'xr', 'vr', 'ar '],
    tech: ['flutter', 'swift', 'android', 'ios', 'react native'],
  },
  'ML·AI': {
    title: [
      'ai ', 'ai)', 'ai/', '(ai', 'ai엔진', 'ai 엔지니어', 'ml ', 'machine learning', 'computer vision',
      'perception', 'llm', 'ai agent', 'ai model', '인공지능', 'ai 리서치', 'ai research', 'ai solution',
      'vision engineer', '자율주행',
    ],
    tech: ['pytorch', 'tensorflow', 'cuda', 'langchain', 'opencv', 'kubeflow', 'yolo'],
  },
  '데브옵스·SRE': {
    title: ['devops', 'sre', 'site reliability', 'cloud infra', 'cloud security', '인프라'],
    tech: ['kubernetes', 'terraform', 'ansible', 'argocd', 'eks', 'cloudformation', 'prometheus', 'grafana', 'jenkins'],
  },
  '데이터 엔지니어': {
    title: ['data engineer', '데이터 엔지니어', '데이터엔지니어', 'data architect', 'data & ai engineering'],
    tech: ['airflow', 'kafka', 'spark', 'hadoop', 'bigquery', 'snowflake', 'redshift', 'flink'],
  },
  '데이터 분석': {
    title: ['data analyst', '데이터 분석', 'analytics engineer', 'data scientist', 'data governance', 'bi manager'],
    tech: ['tableau', 'power bi', 'pandas', 'metabase', 'dbt', 'scikit-learn'],
  },
  프론트엔드: {
    title: ['프론트엔드', 'frontend', 'front-end', 'fe engineer', 'ux engineer'],
    tech: ['react', 'vue', 'next.js', 'typescript', 'angular', 'svelte'],
  },
  풀스택: {
    title: ['풀스택', 'full stack', 'fullstack'],
    tech: [],
  },
  백엔드: {
    title: ['백엔드', 'backend', '서버 개발', '서버개발', 'server developer', 'server engineer'],
    tech: ['spring', 'java', 'node.js', 'django', 'nestjs', 'fastapi', 'express', 'jpa', '.net', 'php', 'laravel'],
  },
}

// 이 표본(careerData.json)에 실제로 등장하는 유명 기업만 부분 문자열로 매칭한다
// (쿠팡, 카카오 계열사, 토스 계열사, CJ 계열사, 업스테이지, 42dot, 뱅크샐러드, 컬리,
// 우아한형제들, 크래프톤). 네이버·라인·삼성·당근은 지금 이 126개 표본엔 없지만
// 데이터가 늘어나면 바로 잡히도록 목록에 남겨둔다.
const FAMOUS_COMPANIES = [
  '쿠팡', '올리브영', 'CJ ENM', '씨제이', '카카오', '비바리퍼블리카', '토스', '업스테이지',
  '42dot', '포티투닷', '뱅크샐러드', '컬리', '우아한형제들', '배달의민족', '크래프톤',
  '라인', '네이버', '삼성', '당근',
]

function isFamous(company: string): boolean {
  return FAMOUS_COMPANIES.some((f) => company.includes(f))
}

function titleHitFor(role: DemoRole, title: string): boolean {
  return ROLE_RULES[role].title.some((k) => title.toLowerCase().includes(k))
}

// 공고 하나당 직무 하나만 정한다. CLASSIFY_ORDER 순서대로 훑으면서 (title 적중 여부,
// tech 적중 개수) 튜플이 가장 좋은 직무를 고른다 — 동점이면 먼저 검사한(더 식별력 높은)
// 직무가 이긴다.
function classifyRole(p: CareerPosting): DemoRole | null {
  const title = p.title.toLowerCase()
  const techs = p.techs.map((t) => t.toLowerCase())
  let bestRole: DemoRole | null = null
  let bestTitleHit = -1
  let bestTechHits = -1
  for (const role of CLASSIFY_ORDER) {
    const rules = ROLE_RULES[role]
    const titleHit = rules.title.some((k) => title.includes(k)) ? 1 : 0
    const techHits = rules.tech.filter((k) => techs.some((t) => t.includes(k))).length
    if (titleHit === 0 && techHits === 0) continue
    if (titleHit > bestTitleHit || (titleHit === bestTitleHit && techHits > bestTechHits)) {
      bestRole = role
      bestTitleHit = titleHit
      bestTechHits = techHits
    }
  }
  return bestRole
}

// 자격요건 한 줄 요약 — descSections에서 "자격 요건"(없으면 "우대 사항") 섹션의 첫
// 불릿 줄만 뽑는다. "[이런 분과 함께하고 싶어요]" 같은 대괄호 소제목 줄은 실제 요건이
// 아니라 건너뛰고, 그 다음 줄을 찾는다. 불릿 기호(•, -, *, ·, ㆍ — 마지막은 한글 자소
// 아래아점으로, 일부 공고가 •  대신 이 문자를 쓴다)를 떼고 너무 길면 말줄임표로 자른다.
function firstBulletLine(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  const line = lines.find((l) => !/^[[(].*[\])]$/.test(l))
  if (!line) return undefined
  const cleaned = line.replace(/^[•\-*·ㆍ]\s*/, '').trim()
  if (!cleaned) return undefined
  return cleaned.length > 60 ? `${cleaned.slice(0, 60)}…` : cleaned
}

function requirementSummary(p: CareerPosting): string | undefined {
  const sections = p.descSections ?? []
  const section = sections.find((s) => s.title.includes('자격')) ?? sections.find((s) => s.title.includes('우대'))
  return section ? firstBulletLine(section.text) : undefined
}

function toCard(p: CareerPosting): DemoPostingCard {
  return {
    id: p.id,
    company: p.company,
    title: p.title,
    techs: p.techs,
    careerMin: p.careerMin,
    careerMax: p.careerMax,
    industry: p.industry ?? '',
    tier: p.tier ?? null,
    logo: p.logo ?? '',
    requirementSummary: requirementSummary(p),
  }
}

const MAX_PER_ROLE = 4

// 직무별 큐레이션 랭킹 — (a) 유명 기업 우선 (b) title이 그 직무 이름 자체를 담고
// 있으면 가점 (c) descSections가 많을수록(정보량이 많을수록) 우선. 세 기준이 전부
// 같으면 회사명 가나다 순으로 안정적으로 정렬한다(매 호출 결과가 흔들리지 않게).
function rankWithinRole(role: DemoRole, pool: CareerPosting[]): CareerPosting[] {
  const scoreOf = (p: CareerPosting) => (isFamous(p.company) ? 2 : 0) + (titleHitFor(role, p.title) ? 1 : 0)
  return [...pool].sort((a, b) => {
    const sa = scoreOf(a)
    const sb = scoreOf(b)
    if (sa !== sb) return sb - sa
    const da = a.descSections?.length ?? 0
    const db = b.descSections?.length ?? 0
    if (da !== db) return db - da
    return a.company.localeCompare(b.company)
  })
}

// 이 파일의 유일한 공개 API — 호출할 때마다 careerData.json을 훑어 같은 결과를
// 결정적으로 만들어낸다. 결과를 모듈 스코프에서 캐시하지 않는 이유는, 데이터가
// 정적 JSON이라 계산 비용이 무시할 만한 수준이고 캐시 무효화를 신경 쓸 필요가
// 없어야 이 함수 자체가 "항상 정직하게 다시 계산한다"는 걸 보장하기 때문이다.
export function getDemoRecommendations(): DemoRoleGroup[] {
  const buckets = new Map<DemoRole, CareerPosting[]>(DISPLAY_ORDER.map((r) => [r, []]))
  careerData.postings.forEach((p) => {
    const role = classifyRole(p)
    if (role) buckets.get(role)!.push(p)
  })

  return DISPLAY_ORDER.map((role) => ({
    role,
    postings: rankWithinRole(role, buckets.get(role) ?? []).slice(0, MAX_PER_ROLE).map(toCard),
  }))
}
