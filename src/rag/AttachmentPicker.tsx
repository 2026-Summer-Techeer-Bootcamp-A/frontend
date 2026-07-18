import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, Check, FileText } from 'lucide-react'
import { jobsApi } from '../career/api'
import { useBookmarks } from '../career/bookmarkStore'
import { getSavedResumes, getSavedResumeDetail, confirmResumeSession, composeResumeText } from './resumeInsightApi'
import type { SavedResumeListItem } from './resumeInsightApi'
import type { ChatAttachment } from './chatContract'
import { loadBookmarkAttachments } from './bookmarkAttachments'

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
  const [resumeState, setResumeState] = useState<LoadState>(isAuthed ? 'loading' : 'ready')
  const bookmarkIds = useBookmarks()
  const bookmarkKey = bookmarkIds.join(',')
  const [bookmarkedPostings, setBookmarkedPostings] = useState<ChatAttachment[]>([])
  const [bookmarkState, setBookmarkState] = useState<LoadState>(bookmarkIds.length > 0 ? 'loading' : 'ready')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false
    getSavedResumes()
      .then((items) => {
        if (cancelled) return
        setResumes(items)
        setResumeState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setResumeState('error')
      })
    return () => { cancelled = true }
  }, [isAuthed])

  useEffect(() => {
    if (bookmarkIds.length === 0) {
      setBookmarkedPostings([])
      setBookmarkState('ready')
      return
    }

    let cancelled = false
    setBookmarkState('loading')
    loadBookmarkAttachments(bookmarkIds, (id) => jobsApi.detail(id))
      .then((items) => {
        if (cancelled) return
        setBookmarkedPostings(items)
        setBookmarkState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setBookmarkedPostings([])
        setBookmarkState('error')
      })
    return () => { cancelled = true }
    // bookmarkKey is the stable value used to refresh API-backed bookmarks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkKey])

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
    (kind: ChatAttachment['kind'], id: number) => attachments.some((a) => a.kind === kind && a.id === id),
    [attachments],
  )

  const toggleResume = (resume: SavedResumeListItem) => {
    if (isSelected('resume', resume.resume_id)) {
      onRemove('resume', resume.resume_id)
      return
    }
    onAdd({ kind: 'resume', id: resume.resume_id, title: resume.title, subtitle: resume.position ?? undefined })
    // resume 첨부 자체는 resume_id만 실어(태그 기반 비교용) 나르므로, 원문 인용 LLM 판정이
    // 쓰는 resume_session_id는 여기서 별도로 시딩해야 한다 — 저장 이력서는 원문을 DB에 두지
    // 않으니 구조화 필드를 텍스트로 합성해 confirm 세션을 새로 튼다. 칩 토글 자체를 막을 이유는
    // 아니라 응답을 기다리지 않고 백그라운드로 흘려보내고, 실패하면 태그 비교로 조용히 강등된다.
    getSavedResumeDetail(resume.resume_id)
      .then((detail) =>
        confirmResumeSession({
          skills: detail.skills,
          // SavedResumeDetail은 certs를 안 내려준다(저장 이력서 상세 조회 엔드포인트가 skills만
          // 준다) — 자격증 없이도 판정은 되니 생략하고 넘어간다.
          position: detail.position,
          careerMin: detail.career_min,
          careerMax: detail.career_max,
          pool: detail.pool,
          memo: detail.memo,
          resumeText: composeResumeText({
            skills: detail.skills,
            position: detail.position,
            careerMin: detail.career_min,
            careerMax: detail.career_max,
            pool: detail.pool,
            memo: detail.memo,
          }),
        }),
      )
      .catch(() => {
        // 세션 시딩 실패 — resumeSessionId 없이 진행하면 백엔드가 태그 기반 비교로 강등한다.
      })
  }

  const togglePosting = (posting: ChatAttachment) => {
    if (isSelected('posting', posting.id)) {
      onRemove('posting', posting.id)
      return
    }
    onAdd(posting)
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

      {isAuthed && resumeState === 'loading' && (
        <div className="rc__picker-loading">이력서를 불러오는 중…</div>
      )}

      {isAuthed && resumeState === 'error' && (
        <div className="rc__picker-error">저장된 이력서를 불러오지 못했어요.</div>
      )}

      {isAuthed && resumeState === 'ready' && resumes.length === 0 && (
        <EmptyCta
          title="아직 저장한 이력서가 없어요"
          sub="보유 기술을 등록하면 이 공고들과 바로 비교할 수 있어요."
          ctaLabel="이력서 만들기 →"
          onCta={goToResumeInsight}
        />
      )}

      {isAuthed && resumeState === 'ready' && resumes.length > 0 && (
        <>
          <div className="rc__picker-sec">내 이력서</div>
          {resumes.map((r) => {
            const selected = isSelected('resume', r.resume_id)
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

      <div className="rc__picker-sec">북마크 공고</div>
      {bookmarkState === 'loading' && (
        <div className="rc__picker-loading">북마크 공고를 불러오는 중…</div>
      )}
      {bookmarkState === 'error' && (
        <div className="rc__picker-error">북마크 공고를 불러오지 못했어요.</div>
      )}
      {bookmarkState === 'ready' && bookmarkedPostings.length === 0 && (
        <div className="rc__picker-note">아직 북마크한 공고가 없어요.</div>
      )}
      {bookmarkState === 'ready' && bookmarkedPostings.map((posting) => {
        const selected = isSelected('posting', posting.id)
        return (
          <button
            key={posting.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            className={`rc__picker-row${selected ? ' is-sel' : ''}`}
            onClick={() => togglePosting(posting)}
          >
            <span className="rc__picker-check" aria-hidden="true">{selected && <Check size={11} />}</span>
            <span className="rc__picker-ic" aria-hidden="true"><Bookmark size={14} /></span>
            <span>
              <div className="rc__picker-rt">{posting.title}</div>
              {posting.subtitle && <div className="rc__picker-rs">{posting.subtitle}</div>}
            </span>
          </button>
        )
      })}
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
