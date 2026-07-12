import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Check, Plus } from 'lucide-react'
import { TechIcon } from '../career/kit'
import techs from '../data/techs.json'
import './SkillManagerModal.css'

/* PC 중앙 모달 — 보유 기술 검색/추가/제거.
   MacMenu.tsx의 외부클릭·Escape 닫기 문법을 그대로 이식한다(카드 바깥 클릭 = 백드롭
   클릭과 동치이므로 별도 백드롭 onClick 핸들러 없이 document mousedown만으로 처리).
   테마 CSS 변수(.dshell에서 주입)를 그대로 물려받도록 portal 없이 컴포넌트 트리 안에서
   position:fixed 오버레이로 렌더한다 — createPortal로 document.body에 붙이면 .dshell
   바깥이라 --c-ink 등 변수 상속이 끊긴다. */

const TECHS = techs as { tech: string; count: number }[]

export function SkillManagerModal({
  open, onClose, owned, onChange,
}: {
  open: boolean
  onClose: () => void
  owned: string[]
  onChange: (nextSkills: string[]) => void
}) {
  const [draft, setDraft] = useState<string[]>(owned)
  const [q, setQ] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  // 열릴 때마다 현재 보유 기술로 draft를 초기화(취소 시 원상복구되도록).
  useEffect(() => {
    if (!open) return
    setDraft(owned)
    setQ('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 외부 클릭·Escape로 닫기(MacMenu와 동일 문법).
  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return TECHS.filter((t) => !s || t.tech.toLowerCase().includes(s)).slice(0, 60)
  }, [q])

  if (!open) return null

  const toggle = (tech: string) => {
    setDraft((cur) => (cur.includes(tech) ? cur.filter((t) => t !== tech) : [...cur, tech]))
  }
  const remove = (tech: string) => setDraft((cur) => cur.filter((t) => t !== tech))
  const save = () => {
    onChange(draft)
    onClose()
  }

  return (
    <div className="skm__backdrop">
      <div ref={cardRef} className="skm__card" role="dialog" aria-modal="true" aria-label="기술 관리">
        <div className="skm__titlebar">
          <span className="skm__title">기술 관리</span>
          <button type="button" className="skm__close" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>

        <div className="skm__search">
          <Search size={16} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="기술 검색 (예: React)"
          />
        </div>

        <div className="skm__body">
          <div className="skm__owned">
            <div className="skm__owned-t">보유 기술 <span>{draft.length}개</span></div>
            <div className="skm__chips kit-scroll">
              {draft.length === 0 && <div className="skm__empty">아직 담은 기술이 없어요.</div>}
              {draft.map((t) => (
                <span key={t} className="skm__chip">
                  <TechIcon tech={t} size={16} />
                  {t}
                  <button type="button" className="skm__chip-x" onClick={() => remove(t)} aria-label={`${t} 제거`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="skm__results kit-scroll">
            {filtered.map((t) => {
              const on = draft.includes(t.tech)
              return (
                <button
                  key={t.tech}
                  type="button"
                  className={`skm__row${on ? ' on' : ''}`}
                  onClick={() => toggle(t.tech)}
                >
                  <TechIcon tech={t.tech} size={22} />
                  <span className="skm__row-nm">{t.tech}</span>
                  <span className="skm__row-ct">{t.count.toLocaleString()}</span>
                  <span className="skm__row-act">{on ? <Check size={15} /> : <Plus size={15} />}</span>
                </button>
              )
            })}
            {filtered.length === 0 && <div className="skm__empty">검색 결과가 없어요.</div>}
          </div>
        </div>

        <div className="skm__foot">
          <button type="button" className="skm__btn skm__btn--ghost" onClick={onClose}>취소</button>
          <button type="button" className="skm__btn skm__btn--fill" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  )
}
