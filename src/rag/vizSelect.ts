// selectChart(result) → ChartSpec|null — 결정론적 순수 함수. kind + label + item shape만 보고
// 판단하며, 어떤 경로에서도 items[]로 관계(그래프)를 합성하지 않는다(스펙 §2, §4 정직성 규칙).
//
// 이 파일이 대체하는 것: AssistantVisualizer.tsx가 갖고 있던 "vectorResult(유사 검색) → items[]로
// 스타형 네트워크 그래프 합성" 로직. semantic_search는 노드 간 관계가 없는 유사도 내림차순
// 랭킹일 뿐이라, 그 오매핑은 여기서 완전히 제거됐다 — list kind는 전부 shape 기반 세분(§2.3
// 5번 분기)을 거쳐 rankedBar/demandBar/regionBar 중 하나로만 간다.

import type { ToolResult, ToolResultKind } from './chatContract'

export type ChartType =
  | 'rankedBar' // 가로 랭크드 바 (단색, 순위)
  | 'demandBar' // 가로 바 + 보유/미보유 색 인코딩
  | 'comparisonBar' // 카테고리 바, 항목별 색 구분
  | 'regionBar' // 지역 분포 바
  | 'treemap' // 구성비(파티션)
  | 'network' // 그래프(공동출현)
  | 'heatmap' // 대칭 강도 행렬
  | 'line' // 추세(미래)
  | 'bigStat' // 단일 수치 + 비율 바
  | 'gaugeRing' // 도넛 링 (CoverageRing 재사용) — demandBar 토글 전용
  | 'scatter' // 2D(미래/조건부)
  | 'sankey' // 흐름(미래/조건부)

export interface ChartSpec {
  primary: ChartType
  toggle?: ChartType // 있으면 VizBox류 세그먼트로 전환 제공
  height: number // px
  reason: string // 디버그·저널용 — 왜 이 차트를 골랐는지
}

// 비교 3종은 ComparisonCards가 전담 렌더한다 — selectChart는 여기서 절대 관여하지 않는다.
const COMPARE_KINDS = new Set<ToolResultKind>(['resume_posting', 'posting_posting', 'resume_market'])

// 보유/미보유 인코딩이 있으면 커버리지(resume_coverage) — 백엔드가 metric에 정확히
// '보유'/'미보유' 문자열만 넣는다(resume_tool.py resume_coverage).
function hasOwnedEncoding(r: ToolResult): boolean {
  return r.items.length > 0 && r.items.every((i) => i.metric === '보유' || i.metric === '미보유')
}

// 지역 결과 — label 기반 판별(백엔드 sql_tool.py top_locations의 label은 항상 "지역별 공고 분포"를 포함).
// label 문자열 의존은 취약하다(스펙 §2.4가 지적) — 백엔드가 viz_hint를 주면 그걸 최우선으로 읽도록
// 후속에서 교체 가능하지만, 오늘은 프론트 단독으로도 결정론적으로 동작해야 하므로 이 폴백을 유지한다.
function isRegion(r: ToolResult): boolean {
  return r.label.includes('지역')
}

// 유사도 결과 — 툴팁 접미사("% 유사")만 다르고 차트 자체는 rankedBar로 동일하다.
function isSimilarity(r: ToolResult): boolean {
  return r.items.length > 0 && r.items.every((i) => (i.metric ?? '').includes('유사'))
}

// 부족 기술(resume_gap) — rankedBar를 쓰되 갭 강조색을 준다(배울 우선순위라는 결을 살린다).
function isGap(r: ToolResult): boolean {
  return r.label.includes('부족')
}

export function selectChart(r: ToolResult): ChartSpec | null {
  // 0) 비교 3종은 여기서 절대 처리하지 않는다 (ComparisonCards 소유)
  if (COMPARE_KINDS.has(r.kind)) return null

  switch (r.kind) {
    // 1) 그래프 = 공동출현. 유일하게 그래프가 정당한 케이스.
    case 'graph': {
      const hasCross = (r.edges ?? []).some((e) => (e as { hop?: unknown }).hop === 2)
      return hasCross
        ? { primary: 'heatmap', toggle: 'network', height: 260, reason: '2-hop 메시 → 히트맵 기본' }
        : { primary: 'network', toggle: 'heatmap', height: 260, reason: '스타 구조 → 네트워크 기본' }
    }

    // 2) 단일 수치 (skill_demand 등)
    case 'stat':
      return { primary: 'bigStat', height: 200, reason: '단일 집계값 + 전체 대비 비율' }

    // 3) 다중 기술 비교
    case 'compare':
      return r.items.length > 0
        ? { primary: 'comparisonBar', height: 220, reason: '항목별 색 구분 비교 바' }
        : null

    // 4) 추세 (현재 producer 없음 — 계약만 존재. producer 생기면 바로 활성화됨)
    case 'trend':
      return r.items.length > 0
        ? { primary: 'line', toggle: 'rankedBar', height: 220, reason: '시간축 흐름 → 선형' }
        : null

    // 5) list = 여러 intent가 공유 → shape로 세분
    case 'list': {
      if (r.items.length === 0) return null
      if (hasOwnedEncoding(r))
        return { primary: 'demandBar', toggle: 'gaugeRing', height: 240, reason: '보유/미보유 색 인코딩' }
      if (isRegion(r))
        return { primary: 'regionBar', toggle: 'treemap', height: 240, reason: '지역=상호배타 파티션' }
      // semantic_search(유사) · skill_ranking · cert · concept · gap 전부 여기로 — 전부 랭크드 바가 정직.
      // 그래프 합성 금지: 관계 없는 랭킹 리스트를 네트워크로 그리지 않는다.
      return {
        primary: 'rankedBar',
        height: 220,
        reason: isSimilarity(r) ? '유사도 랭킹' : isGap(r) ? '갭 강조 랭킹' : '독립 비율 순위',
      }
    }

    default:
      // 6) 최종 fallback: items 있으면 랭크드 바, 없으면 렌더 안 함 (강제 그래프 금지!)
      return r.items.length > 0
        ? { primary: 'rankedBar', height: 220, reason: 'fallback ranked bar' }
        : null
  }
}

// AssistantVisualizer가 ComparisonCards와 같은 필터를 다시 쓸 수 있도록 export.
export { COMPARE_KINDS }

// rankedBarOption의 similarity/gap 옵션을 ChartHost가 판단할 때 재사용.
export { isSimilarity as isSimilarityResult, isGap as isGapResult, hasOwnedEncoding as hasOwnedEncodingResult }
