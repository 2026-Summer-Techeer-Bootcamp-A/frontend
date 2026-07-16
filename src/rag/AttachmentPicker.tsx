import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, FileText } from 'lucide-react'
import { getSavedResumes } from './resumeInsightApi'
import type { SavedResumeListItem } from './resumeInsightApi'
import type { ChatAttachment } from './chatContract'

// 첨부 피커 — 📎 버튼을 열면 뜨는 팝오버(데스크톱)/바텀시트(모바일 ≤480px, CSS 미디어쿼리로 승격).
// "최근 본 공고" 섹션(스펙 1.1)은 이번 구현에서 뺐다 — recruitmentApi.ts에는 찜/최근 조회 공고를
// 반환하는 엔드포인트가 없고(postings/map/companiesBySkill뿐), 화면에 있는 useSavedJobs는 로컬스토리지에
// company__title 문자열 키만 들고 있어 백엔드가 요구하는 숫자 posting id를 만들 방법이 없다.
// 스펙 지시대로("없으면 최근 본 공고 섹션 생략") 이력서 섹션만 우선 붙인다.
interface AttachmentPickerProps {
  attachments: ChatAttachment[]
  onAdd: (attachment: ChatAttachment) => void
  onRemove: (kind: ChatAttachment['kind'], id: number) => void
  onClose: () => void
  isAuthed: boolean
  triggerRef: React.RefObject<HTMLElement>
}

type LoadState = 'loading' | 'error' | 'ready'

export default function AttachmentPicker({ attachments, onAdd, onRemove, onClose, isAuthed, triggerRef }: AttachmentPickerProps) {
  const [resumes, setResumes] = useState<SavedResumeListItem[]>([])
  const [state, setState] = useState<LoadState>(isAuthed ? 'loading' : 'ready')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false
    getSavedResumes()
      .then((items) => {
        if (cancelled) return
        setResumes(items)
        setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('error')
      })
    return () => { cancelled = true }
  }, [isAuthed])

  // 열리면 첫 포커스 가능한 요소로, Esc로 닫기, Tab은 컨테이너 안에서만 순환(포커스 트랩).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute('disabled'))
    focusables()[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        triggerRef.current?.focus()
        return
      }
      if (e.key === 'Tab') {
        const items = focusables()
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [onClose, triggerRef])

  // 바깥(트리거 버튼 제외) 클릭 시 닫기.
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose, triggerRef])

  const isSelected = useCallback(
    (resumeId: number) => attachments.some((a) => a.kind === 'resume' && a.id === resumeId),
    [attachments],
  )

  const toggleResume = (resume: SavedResumeListItem) => {
    if (isSelected(resume.resume_id)) {
      onRemove('resume', resume.resume_id)
      return
    }
    onAdd({ kind: 'resume', id: resume.resume_id, title: resume.title, subtitle: resume.position ?? undefined })
  }

  const goToResumeInsight = () => {
    onClose()
    // ResumeInsight 패널(좌측)로 스크롤 + 스킬 입력에 포커스. AssistantWorkspace와 별도 콜백 배선 없이도
    // 동작하도록 DOM 기준 best-effort로 처리한다(두 컴포넌트는 형제 패널이라 서로 직접 참조가 없다).
    const skillInput = document.querySelector<HTMLElement>('.ri__skillinput')
    skillInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    skillInput?.focus()
  }

  return (
    <div
      className="rc__picker"
      role="dialog"
      aria-modal="true"
      aria-label="첨부할 이력서·공고 선택"
      ref={containerRef}
    >
      {!isAuthed && (
        <EmptyCta
          title="로그인하고 이력서를 등록하면 비교할 수 있어요"
          sub="보유 기술을 등록하면 이 공고들과 바로 비교할 수 있어요."
          ctaLabel="이력서 만들기 →"
          onCta={goToResumeInsight}
        />
      )}

      {isAuthed && state === 'loading' && (
        <div className="rc__picker-loading">이력서를 불러오는 중…</div>
      )}

      {isAuthed && state === 'error' && (
        <div className="rc__picker-error">저장된 이력서를 불러오지 못했어요.</div>
      )}

      {isAuthed && state === 'ready' && resumes.length === 0 && (
        <EmptyCta
          title="아직 저장한 이력서가 없어요"
          sub="보유 기술을 등록하면 이 공고들과 바로 비교할 수 있어요."
          ctaLabel="이력서 만들기 →"
          onCta={goToResumeInsight}
        />
      )}

      {isAuthed && state === 'ready' && resumes.length > 0 && (
        <>
          <div className="rc__picker-sec">내 이력서</div>
          {resumes.map((r) => {
            const selected = isSelected(r.resume_id)
            return (
              <button
                key={r.resume_id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                className={`rc__picker-row${selected ? ' is-sel' : ''}`}
                onClick={() => toggleResume(r)}
              >
                <span className="rc__picker-check" aria-hidden="true">{selected && <Check size={11} />}</span>
                <span className="rc__picker-ic" aria-hidden="true"><FileText size={14} /></span>
                <span>
                  <div className="rc__picker-rt">{r.title}</div>
                  {r.position && <div className="rc__picker-rs">{r.position}</div>}
                </span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

function EmptyCta({ title, sub, ctaLabel, onCta }: { title: string; sub: string; ctaLabel: string; onCta: () => void }) {
  return (
    <div className="rc__picker-empty">
      <div className="rc__picker-empty-ic"><FileText size={18} /></div>
      <div className="rc__picker-empty-title">{title}</div>
      <div className="rc__picker-empty-sub">{sub}</div>
      <button type="button" className="rc__picker-cta" onClick={onCta}>{ctaLabel}</button>
    </div>
  )
}
