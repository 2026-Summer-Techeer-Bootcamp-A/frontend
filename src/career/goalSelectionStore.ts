import { useEffect, useState } from 'react'

// A-5 확장: 목표로 삼을 북마크 선택 상태(로컬 저장). bookmarkStore.ts와 동일 패턴 —
// localStorage가 정본, 변경 시 CustomEvent로 브로드캐스트. 저장 키가 아예 없으면(한 번도
// 안 건드렸으면) "북마크 전체 선택"을 암묵 기본값으로 취급해 기존 워크플로우 맵 동작을
// 그대로 보여준다. 사용자가 한 번이라도 선택을 바꾸면 그 이후엔 빈 선택(0개)도 포함해
// 명시적 상태를 그대로 존중한다 — null(미설정)과 "[]"(명시적으로 0개)를 구분해야 하므로
// localStorage.getItem이 null을 돌려주는지로 "건드렸는지"를 판별한다.
const STORAGE_KEY = 'techeer_goal_selection'
const EVENT = 'goal-selection-change'

function readRaw(): string[] | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function getSelectedGoalIds(): string[] {
  return readRaw() ?? []
}

/** 사용자가 아직 한 번도 선택을 건드리지 않았는지(= 북마크 전체 선택이 암묵 기본값인지). */
export function isGoalSelectionTouched(): boolean {
  return readRaw() !== null
}

export function setSelectedGoalIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event(EVENT))
}

// base: 토글 시점에 "체크된 것으로 보이는" 현재 유효 선택 목록. 아직 안 건드렸을 때는
// 북마크 전체가 암묵 기본값이므로, 호출부(위젯)가 그 유효 목록을 넘겨야 "전체 선택 상태에서
// 하나만 끈다"가 정확히 동작한다.
export function toggleGoalId(id: string, base: string[]): void {
  const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
  setSelectedGoalIds(next)
}

export function useSelectedGoalIds(): string[] {
  const [ids, setIds] = useState<string[]>(getSelectedGoalIds)

  useEffect(() => {
    const handle = () => setIds(getSelectedGoalIds())
    window.addEventListener(EVENT, handle)
    return () => window.removeEventListener(EVENT, handle)
  }, [])

  return ids
}

export function useGoalSelectionTouched(): boolean {
  const [touched, setTouched] = useState<boolean>(isGoalSelectionTouched)

  useEffect(() => {
    const handle = () => setTouched(isGoalSelectionTouched())
    window.addEventListener(EVENT, handle)
    return () => window.removeEventListener(EVENT, handle)
  }, [])

  return touched
}
