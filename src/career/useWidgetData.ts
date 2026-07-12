import { useEffect, useState } from 'react'

// ============================================================
// 하이브리드 위젯 데이터 훅
// VITE_API_BASE가 없으면 즉시 mock. 있으면 fetchLive를 시도하고
// 실패하거나 빈 데이터면 mock으로 폴백한다. 위젯은 source로
// 'live'/'mock'을 구분해 필요 시 preview 배지를 노출할 수 있다.
// 이번 Phase의 위젯은 모두 fetchLive=null로 넘겨 mock만 쓰지만,
// 훅 자체는 향후 라이브 엔드포인트 연결까지 그대로 재사용된다.
// ============================================================

export type WidgetData<T> = { value: T; source: 'live' | 'mock'; loading: boolean; error?: string }

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || ''

export function useWidgetData<T>(fetchLive: (() => Promise<T>) | null, mock: T): WidgetData<T> {
  const [state, setState] = useState<WidgetData<T>>(() =>
    API_BASE && fetchLive
      ? { value: mock, source: 'mock', loading: true }
      : { value: mock, source: 'mock', loading: false },
  )

  useEffect(() => {
    if (!API_BASE || !fetchLive) return
    let cancelled = false
    setState({ value: mock, source: 'mock', loading: true })
    fetchLive()
      .then((live) => {
        if (cancelled) return
        const empty = live == null || (Array.isArray(live) && live.length === 0)
        setState(empty ? { value: mock, source: 'mock', loading: false } : { value: live, source: 'live', loading: false })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({ value: mock, source: 'mock', loading: false, error: err instanceof Error ? err.message : String(err) })
      })
    return () => { cancelled = true }
    // fetchLive/mock은 호출부에서 매 렌더 새로 만들어질 수 있어 의도적으로 최초 마운트에만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
