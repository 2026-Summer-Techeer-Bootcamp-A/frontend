import { useEffect, useRef, useState } from 'react'

export type HomeFilterValues = {
  district: string
  deadlineWithinDays: number | undefined
  minMatch: number | undefined
  industry: string | undefined
  skills: string[]
}

const DEADLINE_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: '전체', value: undefined },
  { label: '7일 이내', value: 7 },
  { label: '14일 이내', value: 14 },
  { label: '30일 이내', value: 30 },
]

// 업종 값 11종은 스펙 고정 목록 — 백엔드 industry 필드는 부분 일치이므로 라벨을 그대로 값으로 사용한다.
const INDUSTRY_OPTIONS: { label: string; value: string | undefined }[] = [
  { label: '전체', value: undefined },
  { label: '헬스케어', value: '헬스케어' },
  { label: '모빌리티/물류', value: '모빌리티/물류' },
  { label: '금융IT/핀테크', value: '금융IT/핀테크' },
  { label: 'AI/데이터', value: 'AI/데이터' },
  { label: '미디어/콘텐츠', value: '미디어/콘텐츠' },
  { label: '커머스', value: '커머스' },
  { label: '에듀테크', value: '에듀테크' },
  { label: '게임', value: '게임' },
  { label: 'SaaS/B2B', value: 'SaaS/B2B' },
  { label: '블록체인/크립토', value: '블록체인/크립토' },
  { label: '보안', value: '보안' },
]

// 검색 페이지(DesktopJobs)와 동일하게 지역/마감임박/매치율 하한/업종/기술스택을 상세 필터로 노출한다.
// min_match는 로그인 + 활성 이력서가 있을 때만 의미가 있어 showMinMatch로 노출을 제어한다.
export default function HomeFilterPopover({
  values,
  onApply,
  onClose,
  showMinMatch,
  skillOptions,
}: {
  values: HomeFilterValues
  onApply: (next: HomeFilterValues) => void
  onClose: () => void
  showMinMatch: boolean
  skillOptions: string[]
}) {
  const [draft, setDraft] = useState<HomeFilterValues>(values)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const apply = () => {
    onApply(draft)
    onClose()
  }

  const reset = () => {
    const cleared: HomeFilterValues = {
      district: '',
      deadlineWithinDays: undefined,
      minMatch: undefined,
      industry: undefined,
      skills: [],
    }
    setDraft(cleared)
    onApply(cleared)
    onClose()
  }

  const toggleSkill = (skill: string) => {
    setDraft((d) => {
      const has = d.skills.includes(skill)
      return { ...d, skills: has ? d.skills.filter((s) => s !== skill) : [...d.skills, skill] }
    })
  }

  return (
    <div className="hfeed-filter__popover" ref={ref} role="dialog" aria-label="상세 필터">
      <h4 className="hfeed-filter__popover-title">상세 필터</h4>

      <div className="hfeed-filter__popover-field">
        <label className="hfeed-filter__popover-label" htmlFor="hfeed-filter-district">지역</label>
        <input
          id="hfeed-filter-district"
          type="text"
          className="hfeed-filter__popover-input"
          placeholder="예: 강남구"
          value={draft.district}
          onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
        />
      </div>

      <div className="hfeed-filter__popover-field">
        <span className="hfeed-filter__popover-label">마감 임박</span>
        <div className="hfeed-filter__popover-seg">
          {DEADLINE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={draft.deadlineWithinDays === opt.value ? 'is-on' : ''}
              onClick={() => setDraft((d) => ({ ...d, deadlineWithinDays: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hfeed-filter__popover-field">
        <span className="hfeed-filter__popover-label">업종</span>
        <div className="hfeed-filter__popover-seg">
          {INDUSTRY_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={draft.industry === opt.value ? 'is-on' : ''}
              onClick={() => setDraft((d) => ({ ...d, industry: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {showMinMatch && (
        <div className="hfeed-filter__popover-field">
          <label className="hfeed-filter__popover-label" htmlFor="hfeed-filter-minmatch">최소 매치율</label>
          <input
            id="hfeed-filter-minmatch"
            type="range"
            className="hfeed-filter__popover-range"
            min={0}
            max={100}
            step={5}
            value={draft.minMatch ?? 0}
            onChange={(e) => {
              const next = Number(e.target.value)
              setDraft((d) => ({ ...d, minMatch: next === 0 ? undefined : next }))
            }}
          />
          <div className="hfeed-filter__popover-rangeval tnum">
            <b>{draft.minMatch ?? 0}%</b> 이상
          </div>
        </div>
      )}

      <div className="hfeed-filter__popover-field">
        <span className="hfeed-filter__popover-label">기술스택</span>
        <div className="hfeed-filter__popover-seg hfeed-filter__popover-seg--multi">
          {skillOptions.length === 0 && (
            <span className="hfeed-filter__popover-empty">불러온 공고에 기술스택이 없어요</span>
          )}
          {skillOptions.map((skill) => (
            <button
              key={skill}
              type="button"
              className={draft.skills.includes(skill) ? 'is-on' : ''}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      <div className="hfeed-filter__popover-actions">
        <button type="button" className="reset" onClick={reset}>초기화</button>
        <button type="button" className="apply" onClick={apply}>적용</button>
      </div>
    </div>
  )
}
