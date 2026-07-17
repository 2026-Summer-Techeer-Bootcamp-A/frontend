import { useEffect, useState } from 'react'

// 목표 기업 앵커(A-1) 저장(로컬 저장). bookmarkStore.ts와 동일 패턴 —
// localStorage가 정본, 변경 시 CustomEvent로 브로드캐스트. 지금은 히어로/목표 기업
// 패널만 읽지만, 저장소를 분리해두면 다른 위젯도 나중에 같은 목표를 그대로 구독할 수 있다.
const STORAGE_KEY = 'techeer_target_company'
const EVENT = 'target-company-change'

export function getTargetCompany(): string {
  return (localStorage.getItem(STORAGE_KEY) ?? '').trim()
}

export function setTargetCompany(company: string): void {
  const trimmed = company.trim()
  if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
  else localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVENT))
}

export function useTargetCompany(): string {
  const [company, setCompany] = useState<string>(getTargetCompany)

  useEffect(() => {
    const handle = () => setCompany(getTargetCompany())
    window.addEventListener(EVENT, handle)
    return () => window.removeEventListener(EVENT, handle)
  }, [])

  return company
}
