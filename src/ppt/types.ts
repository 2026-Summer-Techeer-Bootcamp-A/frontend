// PPT Visual Maker 공용 타입 계약.
// render는 순수 함수여야 한다: 같은 (p, ts, w, h) 입력에는 항상 같은 프레임을 그려야 한다.
// 외부 상태/DOM을 참조하지 않는다. mp4 결정론적 렌더가 이 계약에 의존한다.

export type VizRender = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  ts: number,
) => void

export interface VizDef {
  id: string
  title: string
  subtitle: string
  category: 'feature' | 'tech'
  period: number
  render: VizRender
}

export interface ExportOptions {
  speed: number
  fps: 60
  width: number
  height: number
}
