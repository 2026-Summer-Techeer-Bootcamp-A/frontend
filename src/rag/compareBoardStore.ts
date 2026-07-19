import { useEffect, useState } from 'react'

// 비교 보드(4b) — 대화 중 나온 커리어 적합도 비교(resume_posting_llm/posting_posting_llm) 결과가
// 나올 때마다 그 공고를 카드로 쌓아두는 로컬 저장 스토어. bookmarkStore.ts와 같은 패턴(localStorage
// 정본 + CustomEvent 브로드캐스트)을 그대로 따른다. 카드를 클릭하면 그 공고를 다시 첨부해
// 재비교 질문을 자동 구성해 보낸다(드래그는 생략 — 클릭 재비교로 충분하다는 스펙 결정).
const STORAGE_KEY = 'techeer_compare_board'
const EVENT = 'compare-board-change'
const MAX_CARDS = 12

export interface CompareBoardCard {
  id: number
  title: string
  subtitle: string
  addedAt: number
}

function readBoard(): CompareBoardCard[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeBoard(cards: CompareBoardCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  window.dispatchEvent(new Event(EVENT))
}

export function getCompareBoard(): CompareBoardCard[] {
  return readBoard()
}

/** 같은 공고(id)가 이미 있으면 맨 앞으로 옮기며 최신 정보로 덮어쓰고, 없으면 새로 추가한다.
 *  최대 MAX_CARDS개를 넘으면 가장 오래된 카드부터 밀어낸다. */
export function addToCompareBoard(card: { id: number; title: string; subtitle: string }): void {
  const cur = readBoard().filter((c) => c.id !== card.id)
  const next = [{ ...card, addedAt: Date.now() }, ...cur].slice(0, MAX_CARDS)
  writeBoard(next)
}

export function removeFromCompareBoard(id: number): void {
  writeBoard(readBoard().filter((c) => c.id !== id))
}

export function useCompareBoard(): CompareBoardCard[] {
  const [cards, setCards] = useState<CompareBoardCard[]>(readBoard)
  useEffect(() => {
    const handle = () => setCards(readBoard())
    window.addEventListener(EVENT, handle)
    return () => window.removeEventListener(EVENT, handle)
  }, [])
  return cards
}

/** "3분 전" 같은 상대 시각. 짧은 드로어 리스트라 초 단위까지는 필요 없다. */
export function relativeTime(addedAt: number): string {
  const diffMs = Date.now() - addedAt
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '방금 비교함'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}
