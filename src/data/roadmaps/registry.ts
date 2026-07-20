// 로드맵 트랙 레지스트리 — 지금은 backend.json 하나뿐이지만, 다른 직군(프론트엔드,
// 데이터, 모바일 등) 로드맵을 추가할 때 이 파일에 항목만 더하면 RoadmapView.tsx의
// 탭 UI가 자동으로 늘어나게 만드는 확장 지점이다. 트랙 JSON은 전부 정적 import라
// (동적 import를 쓰지 않는다) 번들에 함께 들어가지만, 백엔드 하나뿐인 지금은 무시할
// 수준이고 나중에 트랙이 많아지면 이 자리에서 동적 import로 바꾸면 된다.
import backendTrack from './backend.json' with { type: 'json' }
import type { RoadmapTrack, RoadmapTrackMeta } from './types'

const TRACKS: Record<string, RoadmapTrack> = {
  backend: backendTrack as unknown as RoadmapTrack,
}

export const DEFAULT_ROADMAP_TRACK_ID = 'backend'

// 탭 UI가 쓸 목록 — TRACKS의 순서를 그대로 따른다(현재는 백엔드 1개).
export const ROADMAP_TRACK_LIST: RoadmapTrackMeta[] = Object.values(TRACKS).map((t) => ({ id: t.id, label: t.label }))

export function loadRoadmapTrack(id: string): RoadmapTrack {
  return TRACKS[id] ?? TRACKS[DEFAULT_ROADMAP_TRACK_ID]
}
