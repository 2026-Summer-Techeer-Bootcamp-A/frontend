// 로드맵 정본 데이터 타입 — roadmap.sh 스타일 백본(사람이 큐레이션한 트리)을 표현한다.
// 이 타입은 순수 데이터 모델이라 React나 DOM에 의존하지 않는다. career/workflow/의
// 렌더 컴포넌트(RoadmapView.tsx)와 오버레이 계산(roadmapOverlay.ts)이 이 타입으로
// backend.json 같은 트랙 JSON을 읽는다.

// skill: 이력서 skills와 직접 매칭되는 기술(예: Python, Docker).
// concept: 이력서에 "보유" 개념이 없는 엔지니어링 개념/패러다임(예: MSA·마이크로서비스).
// cert: 이력서 certs와 매칭되는 자격증(예: CKA).
export type RoadmapNodeType = 'skill' | 'concept' | 'cert'

// recommended: 그 섹션의 기본(주) 경로 — 중앙 척추에서 실선으로 이어지는 노드.
// alternative: 같은 역할을 대신할 수 있는 대안(예: Django 대신 FastAPI) — 점선.
// optional: 필수는 아니지만 있으면 좋은 심화/부가 항목 — 더 옅은 점선.
export type RoadmapMarker = 'recommended' | 'alternative' | 'optional'

export type RoadmapNode = {
  id: string
  label: string
  type: RoadmapNodeType
  // 소속 섹션(RoadmapSectionMeta.id). 렌더러가 섹션별로 노드를 묶어 마일스톤 아래
  // 가지로 펼친다.
  section: string
  // 전역 정렬 순서 — 같은 섹션 안에서는 이 값으로, 섹션 사이에서는 섹션 자체의 order로
  // 먼저 정렬한 뒤 이 값으로 2차 정렬한다.
  order: number
  marker: RoadmapMarker
  // 선행 노드 id 목록. 데이터 제작 규칙: 모든 prereq는 반드시 자기 자신과 같은 섹션이거나
  // 더 앞선 섹션(section order가 더 작은)에 속해야 한다 — 렌더러가 섹션을 위에서
  // 아래로 순서대로 그리는 트리 레이아웃이라, prereq가 자기보다 뒤 섹션을 가리키면
  // 화면에 없는 노드를 참조하는 것과 같아서 잠금 판정이 항상 거짓이 된다. 같은 섹션
  // 안에서는 prereq의 order가 자신의 order보다 작아야 한다(순환 방지).
  prereqs: string[]
  // 한 문장 정적 설명. 과장 없이 담백하게, 평서체로 — 지어낸 통계나 근거 없는 주장을
  // 넣지 않는다.
  note: string
}

export type RoadmapSectionMeta = {
  id: string
  title: string
  order: number
}

export type RoadmapTrack = {
  id: string
  label: string
  sections: RoadmapSectionMeta[]
  nodes: RoadmapNode[]
  // _meta는 선택 필드다 — skillRelations.json과 같은 관례로 버전/큐레이터/날짜 등
  // 부가 정보를 남기지만 렌더러는 이 필드를 읽지 않는다.
  _meta?: Record<string, unknown>
}

// 트랙 레지스트리에 노출할 최소 정보 — 탭 UI가 트랙 목록을 그릴 때 전체 트리를 미리
// 로드하지 않고 이 메타만으로 탭을 구성할 수 있게 한다.
export type RoadmapTrackMeta = {
  id: string
  label: string
}
