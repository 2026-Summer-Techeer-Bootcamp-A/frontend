import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { FileText, RotateCcw, X } from 'lucide-react'
import { useAuth } from '../career/authStore'
import { getSavedResumeDetail, getSavedResumes, postResumeFeedback } from './resumeInsightApi'
import type { Pool, ResumeFeedbackResponse, SavedResumeListItem } from './resumeInsightApi'
import './rag-console.css'
import './resume-insight.css'

// 실 백엔드(POST /api/v1/resume/confirm → POST /api/v1/resume/feedback) 연동 화면.
// PDF 파싱은 쓰지 않는다 — 사용자가 보유 기술을 직접 입력해 confirm 세션에 넘기고,
// 그 세션을 근거로 feedback이 이력서 피드백 + 예상 면접 질문을 만든다.

type Status = 'idle' | 'loading' | 'done' | 'error'

const POSITIONS: { value: string; label: string }[] = [
  { value: 'backend', label: '백엔드' },
  { value: 'frontend', label: '프론트엔드' },
  { value: 'fullstack', label: '풀스택' },
  { value: 'devops', label: 'DevOps·인프라' },
  { value: 'data', label: '데이터' },
]

// 저장된 이력서는 한국어 자유 직군 텍스트("백엔드 개발", "머신러닝·AI 엔지니어" 등)를 쓰고,
// 이 화면은 백엔드 /resume/feedback이 인식하는 5개 영문 키만 받는다 — 키워드로 가장 가까운 값에 매핑한다.
function mapSavedPosition(raw: string | null): string {
  const p = (raw ?? '').toLowerCase()
  if (p.includes('프론트')) return 'frontend'
  if (p.includes('풀스택')) return 'fullstack'
  if (p.includes('devops') || p.includes('인프라')) return 'devops'
  if (p.includes('데이터') || p.includes('머신러닝') || p.includes('ai')) return 'data'
  return 'backend'
}

// 입력 기술이 실제 응답 텍스트(피드백+면접 질문)에 몇 번 언급됐는지 센다.
// 외부에서 가져온 수요 지표가 아니라 이 응답 자체에서 직접 뽑아낸 값이라 근거 없는 숫자가 아니다.
function countSkillMentions(skills: string[], texts: string[]): { name: string; count: number }[] {
  const joined = texts.join(' \n ').toLowerCase()
  return skills
    .map((s) => {
      const escaped = s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = joined.match(new RegExp(escaped, 'g'))
      return { name: s, count: matches ? matches.length : 0 }
    })
    .sort((a, b) => b.count - a.count)
}

export default function ResumeInsight() {
  const { isAuthed } = useAuth()
  const [position, setPosition] = useState('backend')
  const [pool, setPool] = useState<Pool>('domestic')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ResumeFeedbackResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  // 분석을 실제로 요청한 시점의 스킬 목록 — 결과가 온 뒤 입력창에서 스킬을 더 추가해도
  // 시각화는 실제로 백엔드가 받은 스킬셋 기준으로 그대로 유지한다.
  const [analyzedSkills, setAnalyzedSkills] = useState<string[]>([])

  // 등록된 이력서 선택 — 직접 입력 대신 저장된 이력서에서 스킬셋을 불러올 수 있게 한다.
  const [savedResumes, setSavedResumes] = useState<SavedResumeListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | 'manual'>('manual')
  const [resumeLoadError, setResumeLoadError] = useState('')
  const [loadingResume, setLoadingResume] = useState(false)
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthed) return
    getSavedResumes()
      .then(setSavedResumes)
      .catch(() => setSavedResumes([]))
  }, [isAuthed])

  const busy = status === 'loading'

  const selectSavedResume = (value: string) => {
    if (value === 'manual') {
      setSelectedResumeId('manual')
      setSelectedMemo(null)
      return
    }
    const resumeId = Number(value)
    setSelectedResumeId(resumeId)
    setLoadingResume(true)
    setResumeLoadError('')
    getSavedResumeDetail(resumeId)
      .then((detail) => {
        setPosition(mapSavedPosition(detail.position))
        setPool(detail.pool)
        setSkills(detail.skills.map((s) => s.canonical))
        setSelectedMemo(detail.memo)
      })
      .catch((err: unknown) => {
        setResumeLoadError(err instanceof Error ? err.message : '이력서를 불러오지 못했어요.')
      })
      .finally(() => setLoadingResume(false))
  }

  const addSkill = () => {
    const v = skillInput.trim()
    if (!v) return
    setSkills((prev) => (prev.some((s) => s.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]))
    setSkillInput('')
  }

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill))

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  const submit = () => {
    if (skills.length === 0 || busy) return
    setStatus('loading')
    setErrorMsg('')
    setAnalyzedSkills(skills)
    postResumeFeedback({
      skills: skills.map((s) => ({ canonical: s, category: 'skill', in_dict: false })),
      position,
      careerMin: null,
      careerMax: null,
      pool,
      memo: selectedMemo,
    })
      .then((res) => {
        setResult(res)
        setStatus('done')
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '분석 결과를 가져오지 못했어요.'
        setErrorMsg(message)
        setStatus('error')
      })
  }

  const statusLabel = busy ? '분석 중' : result ? '분석 완료' : '입력을 기다리는 중'

  const mentionRows = useMemo(() => {
    if (!result) return []
    return countSkillMentions(analyzedSkills, [...result.feedback, ...result.questions])
  }, [result, analyzedSkills])
  const mentionMax = Math.max(1, ...mentionRows.map((r) => r.count))

  return (
    <div className="ri">
      <div className="rc__head">
        <span className="rc__avatar"><FileText size={15} /></span>
        <div>
          <div className="rc__nm">이력서 분석</div>
          <div className={`rc__st${busy ? ' rc__st--live' : ''}`}>{statusLabel}</div>
        </div>
      </div>

      <div className="rc__body">
        <div className="ri__form">
          {isAuthed && savedResumes.length > 0 && (
            <div className="ri__field">
              <label className="ri__label">등록된 이력서</label>
              <select
                className="ri__select"
                value={String(selectedResumeId)}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => selectSavedResume(e.target.value)}
                disabled={busy || loadingResume}
              >
                <option value="manual">직접 입력</option>
                {savedResumes.map((r) => (
                  <option key={r.resume_id} value={r.resume_id}>
                    {r.title}{r.position ? ` · ${r.position}` : ''}
                  </option>
                ))}
              </select>
              {loadingResume && <div className="ri__hint">이력서를 불러오는 중…</div>}
              {resumeLoadError && <div className="ri__hint ri__hint--error">{resumeLoadError}</div>}
              {selectedResumeId !== 'manual' && !loadingResume && !resumeLoadError && (
                <div className="ri__hint">불러온 스킬은 아래에서 자유롭게 더하거나 뺄 수 있어요.</div>
              )}
            </div>
          )}

          <div className="ri__field">
            <label className="ri__label">희망 포지션</label>
            <div className="ri__pillrow">
              {POSITIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`ri__pill${position === opt.value ? ' on' : ''}`}
                  onClick={() => setPosition(opt.value)}
                  disabled={busy}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ri__field">
            <label className="ri__label">채용 풀</label>
            <div className="rc__seg" role="group" aria-label="채용 풀 선택">
              <button type="button" aria-pressed={pool === 'domestic'} onClick={() => setPool('domestic')} disabled={busy}>국내</button>
              <button type="button" aria-pressed={pool === 'global'} onClick={() => setPool('global')} disabled={busy}>해외</button>
            </div>
          </div>

          <div className="ri__field">
            <label className="ri__label">보유 기술 <span className="ri__count">{skills.length}개</span></label>
            <div className="ri__skillbox">
              {skills.map((s) => (
                <span className="ri__skillchip" key={s}>
                  {s}
                  <button type="button" className="ri__skillchip-x" onClick={() => removeSkill(s)} aria-label={`${s} 삭제`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                className="ri__skillinput"
                value={skillInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="기술을 입력하고 Enter"
                disabled={busy}
              />
            </div>
          </div>

          <button type="button" className="ri__submit" onClick={submit} disabled={busy || skills.length === 0}>
            {busy ? '분석 중…' : '분석 요청'}
          </button>
        </div>

        <div className="ri__results">
          {status === 'idle' && (
            <div className="rc__empty">보유 기술을 입력하고 분석 요청을 누르면 이력서 피드백과 예상 면접 질문을 받아볼 수 있어요.</div>
          )}

          {status === 'loading' && (
            <div className="rc__skeleton" aria-live="polite" aria-busy="true">
              <span className="rc__skel-line" style={{ width: '88%' }} />
              <span className="rc__skel-line" style={{ width: '62%' }} />
              <span className="rc__skel-line" style={{ width: '74%' }} />
              <span className="rc__skel-line" style={{ width: '80%' }} />
            </div>
          )}

          {status === 'error' && (
            <div className="rc__error">
              <span className="rc__error-text">{errorMsg}</span>
              <button type="button" className="rc__retry" onClick={submit}>
                <RotateCcw size={13} /> 다시 시도
              </button>
            </div>
          )}

          {status === 'done' && result && (
            <div className="ri__out">
              {result.degraded && (
                <div className="rc__meta">
                  <span className="rc__degraded">LLM 미가용 · 규칙 기반 보완</span>
                </div>
              )}

              {mentionRows.length > 0 && (
                <div className="ri__section">
                  <div className="rc__ev-k">입력 기술 vs 응답 언급 빈도</div>
                  <div className="ri__hint">보유 기술로 입력한 항목이 실제로 받은 피드백·면접 질문 텍스트에 등장한 횟수예요.</div>
                  <div className="rc__minichart">
                    {mentionRows.map((r) => (
                      <div className="rc__mc-row" key={r.name}>
                        <span className="rc__mc-label">{r.name}</span>
                        <span className="rc__mc-track">
                          <span className="rc__mc-fill" style={{ width: `${(r.count / mentionMax) * 100}%` }} />
                        </span>
                        <span className="rc__mc-val">{r.count}회</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="ri__section">
                <div className="rc__ev-k">이력서 피드백</div>
                <ul className="ri__list">
                  {result.feedback.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>

              <div className="ri__section">
                <div className="rc__ev-k">예상 면접 질문</div>
                <div className="ri__hint">공고 수요를 바탕으로 실무 면접관 시선에서 준비한 질문이에요.</div>
                <ol className="ri__qlist">
                  {result.questions.map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              </div>

              <div className="ri__model">모델 · {result.model}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
