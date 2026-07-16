import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

// 얇은 렌더 래퍼 — echartsOptions.ts의 순수 옵션 빌더 결과를 받아 그리기만 한다.
// echarts-for-react는 부모 컨테이너 리사이즈(ResizeObserver)에 자동 대응하므로 width는 100%로
// 두고 height만 고정한다(모바일 390px에서도 좌우 스크롤 없이 꽉 찬다).
export interface EChartProps {
  option: EChartsOption
  height: number
}

export function EChart({ option, height }: EChartProps) {
  return <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height }} />
}
