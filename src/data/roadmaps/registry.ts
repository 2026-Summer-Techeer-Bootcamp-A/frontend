// 로드맵 트랙 레지스트리 — 직군(백엔드, 프론트엔드, 데이터, 데브옵스, 모바일)별
// 로드맵을 이 파일에 항목만 더하면 RoadmapView.tsx의 탭 UI가 자동으로 늘어나게 만드는
// 확장 지점이다. 트랙 JSON은 전부 정적 import라(동적 import를 쓰지 않는다) 번들에
// 함께 들어가지만, 트랙 5개 수준에서는 무시할 만하고 나중에 트랙이 훨씬 많아지면
// 이 자리에서 동적 import로 바꾸면 된다.
import backendTrack from './backend.json' with { type: 'json' }
import frontendTrack from './frontend.json' with { type: 'json' }
import dataTrack from './data.json' with { type: 'json' }
import devopsTrack from './devops.json' with { type: 'json' }
import mobileTrack from './mobile.json' with { type: 'json' }
import type { RoadmapTrack, RoadmapTrackMeta } from './types'

const TRACKS: Record<string, RoadmapTrack> = {
  backend: backendTrack as unknown as RoadmapTrack,
  frontend: frontendTrack as unknown as RoadmapTrack,
  data: dataTrack as unknown as RoadmapTrack,
  devops: devopsTrack as unknown as RoadmapTrack,
  mobile: mobileTrack as unknown as RoadmapTrack,
}

export const DEFAULT_ROADMAP_TRACK_ID = 'backend'

// 탭 UI가 쓸 목록 — TRACKS의 순서를 그대로 따른다(현재는 백엔드 1개).
export const ROADMAP_TRACK_LIST: RoadmapTrackMeta[] = Object.values(TRACKS).map((t) => ({ id: t.id, label: t.label }))

export function loadRoadmapTrack(id: string): RoadmapTrack {
  return TRACKS[id] ?? TRACKS[DEFAULT_ROADMAP_TRACK_ID]
}
