import { useEffect, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { FileText, RotateCcw, X } from 'lucide-react'
import { getAuthToken, useAuth } from '../career/authStore'
import { dashboardApi, marketApi } from '../career/api'
import { getSavedResumeDetail, getSavedResumes, postResumeFeedback } from './resumeInsightApi'
import type { Pool, ResumeFeedbackResponse, SavedResumeListItem } from './resumeInsightApi'
import CoverageRing from './viz/CoverageRing'
import DemandBars from './viz/DemandBars'
import GapList from './viz/GapList'
import type { DemandBarDatum } from './viz/DemandBars'
import { SAMPLE_COVERAGE, SAMPLE_DEMAND, SAMPLE_GAPS, SAMPLE_POSITION_LABEL } from './viz/vizSample'
import './rag-console.css'
import './resume-insight.css'

// 실 백엔드(POST /api/v1/resume/confirm → POST /api/v1/resume/feedback) 연동 화면.
// PDF 파싱은 쓰지 않는다 — 사용자가 보유 기술을 직접 입력해 confirm 세션에 넘기고,
// 그 세션을 근거로 feedback이 이력서 피드백 + 예상 면접 질문을 만든다.
// 여기에 더해 커버리지 링/수요 막대/미보유 갭 3종 시각화를 얹어, 저장 이력서를 불러오면
// 스킬셋 로드 직후 자동으로 분석까지 실행한다(로그인/저장 이력서가 없으면 예시 데이터로 대체).

type Status = 'idle' | 'loading' | 'done' | 'error'
type VizStatus = 'idle' | 'loading' | 'done' | 'error'

interface CoverageInfo {
  score: number
  ownedCount: number
  totalCount: number
  live: boolean
}

interface VizResult {
  coverage: CoverageInfo
  demand: DemandBarDatum[]
  gaps: DemandBarDatum[]
}

interface AnalysisInput {
  skills: string[]
  position: string
  pool: Pool
  memo: string | null
  resumeId: number | 'manual'
}

interface CachedPayload {
  position: string
  pool: Pool
  skills: string[]
  result: ResumeFeedbackResponse
  viz: VizResult | null
}

const CACHE_PREFIX = 'ri:result:'
const CACHE_LAST_KEY = 'ri:last-key'

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

function cacheKeyFor(resumeId: number | 'manual'): string {
  return resumeId === 'manual' ? 'manual' : String(resumeId)
}

/** 수요 상위 스킬(공개 API) + 가능하면 실 커버리지(로그인+저장 이력서)를 함께 가져온다.
 *  커버리지 실 API가 없거나 실패하면 수요 상위 스킬 대비 보유 비율로 근사한 폴백을 만든다. */
async function loadVizData(input: AnalysisInput, isAuthed: boolean): Promise<VizResult | null> {
  let demand: DemandBarDatum[] = []
  try {
    const shareRes = await marketApi.skillShare({ pool: input.pool, position: input.position, top_k: 8 })
    const ownedLower = new Set(input.skills.map((s) => s.trim().toLowerCase()))
    demand = shareRes.items
      .map((item) => ({
        canonical: item.canonical,
        share: item.share,
        owned: ownedLower.has(item.canonical.trim().toLowerCase()),
      }))
      .sort((a, b) => b.share - a.share)
  } catch {
    demand = []
  }

  let coverage: CoverageInfo | null = null
  const token = getAuthToken()
  if (isAuthed && input.resumeId !== 'manual' && token) {
    try {
      const cov = await dashboardApi.coverage({ resumeId: input.resumeId, token }, input.position)
      coverage = {
        score: cov.coverage_score,
        ownedCount: cov.top_skills.filter((s) => s.owned).length,
        totalCount: cov.top_skills.length,
        live: true,
      }
    } catch {
      coverage = null
    }
  }

  if (!coverage && demand.length > 0) {
    const ownedCount = demand.filter((d) => d.owned).length
    coverage = { score: (ownedCount / demand.length) * 100, ownedCount, totalCount: demand.length, live: false }
  }

  if (demand.length === 0 && !coverage) return null
  return {
    coverage: coverage ?? { score: 0, ownedCount: 0, totalCount: 0, live: false },
    demand,
    gaps: demand.filter((d) => !d.owned),
  }
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

  // 등록된 이력서 선택 — 직접 입력 대신 저장된 이력서에서 스킬셋을 불러올 수 있게 한다.
  const [savedResumes, setSavedResumes] = useState<SavedResumeListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | 'manual'>('manual')
  const [resumeLoadError, setResumeLoadError] = useState('')
  const [loadingResume, setLoadingResume] = useState(false)
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null)

  // 커버리지 링 · 수요 막대 · 미보유 갭 3종 시각화 상태.
  const [vizStatus, setVizStatus] = useState<VizStatus>('idle')
  const [viz, setViz] = useState<VizResult | null>(null)
  const [showSample, setShowSample] = useState(false)

  useEffect(() => {
    if (!isAuthed) return
    getSavedResumes()
      .then(setSavedResumes)
      .catch(() => setSavedResumes([]))
  }, [isAuthed])

  // 마운트 시 마지막 분석 결과를 로컬 캐시에서 복원한다 — 새로고침/재방문에도 최근 결과가 그대로 보이게.
  // 스키마가 깨져 있거나 파싱에 실패하면 조용히 무시하고 빈 상태로 시작한다.
  useEffect(() => {
    try {
      const lastKey = localStorage.getItem(CACHE_LAST_KEY)
      if (!lastKey) return
      const raw = localStorage.getItem(`${CACHE_PREFIX}${lastKey}`)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<CachedPayload> | null
      if (!parsed || typeof parsed.position !== 'string' || !Array.isArray(parsed.skills) || !parsed.result) return

      setPosition(parsed.position)
      setPool(parsed.pool === 'global' ? 'global' : 'domestic')
      setSkills(parsed.skills)
      setResult(parsed.result)
      setStatus('done')
      if (parsed.viz) {
        setViz(parsed.viz)
        setVizStatus('done')
      }
      if (lastKey !== 'manual') {
        const n = Number(lastKey)
        if (Number.isInteger(n) && n > 0) setSelectedResumeId(n)
      }
    } catch {
      // 캐시 파싱 실패 — 무시하고 빈 상태로 시작한다.
    }
  }, [])

  const busy = status === 'loading'

  const persistResult = (input: AnalysisInput, feedbackRes: ResumeFeedbackResponse | null, vizRes: VizResult | null) => {
    if (!feedbackRes) return
    try {
      const key = cacheKeyFor(input.resumeId)
      const payload: CachedPayload = {
        position: input.position,
        pool: input.pool,
        skills: input.skills,
        result: feedbackRes,
        viz: vizRes,
      }
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload))
      localStorage.setItem(CACHE_LAST_KEY, key)
    } catch {
      // localStorage 사용 불가(프라이빗 모드 등) — 캐시 없이 진행한다.
    }
  }

  const runAnalysis = (input: AnalysisInput) => {
    if (input.skills.length === 0) return
    setStatus('loading')
    setErrorMsg('')
    setVizStatus('loading')
    setShowSample(false)

    const feedbackPromise = postResumeFeedback({
      skills: input.skills.map((s) => ({ canonical: s, category: 'skill', in_dict: false })),
      position: input.position,
      careerMin: null,
      careerMax: null,
      pool: input.pool,
      memo: input.memo,
    })
      .then((res) => {
        setResult(res)
        setStatus('done')
        return res
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : '분석 결과를 가져오지 못했어요.')
        setStatus('error')
        return null
      })

    const vizPromise = loadVizData(input, isAuthed)
      .then((v) => {
        setViz(v)
        setVizStatus(v ? 'done' : 'error')
        return v
      })
      .catch(() => {
        setViz(null)
        setVizStatus('error')
        return null
      })

    void Promise.all([feedbackPromise, vizPromise]).then(([feedbackRes, vizRes]) => {
      persistResult(input, feedbackRes, vizRes)
    })
  }

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
        const mappedPosition = mapSavedPosition(detail.position)
        const loadedSkills = detail.skills.map((s) => s.canonical)
        setPosition(mappedPosition)
        setPool(detail.pool)
        setSkills(loadedSkills)
        setSelectedMemo(detail.memo)
        // 저장 이력서를 불러오면 스킬셋 로드가 끝난 즉시 자동으로 분석까지 실행한다.
        runAnalysis({ skills: loadedSkills, position: mappedPosition, pool: detail.pool, memo: detail.memo, resumeId })
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
    runAnalysis({ skills, position, pool, memo: selectedMemo, resumeId: selectedResumeId })
  }

  const statusLabel = busy ? '분석 중' : result ? '분석 완료' : '입력을 기다리는 중'

  // 실데이터가 있으면(로그인 없이도 skillShare는 공개 API라 뜰 수 있다) 그걸 쓰고,
  // 없으면(분석 전 idle이거나 실패) 항상 예시 데이터로 채운 뒤 블러 또는 뱃지로 구분한다.
  const hasLiveViz = vizStatus === 'done' && !!viz && (viz.demand.length > 0 || viz.coverage.totalCount > 0)
  const revealSample = !hasLiveViz && showSample
  const isBlurred = !hasLiveViz && !showSample
  const vizIsSample = !hasLiveViz

  const coverageDatum = hasLiveViz && viz ? viz.coverage : SAMPLE_COVERAGE
  const demandData = hasLiveViz && viz ? viz.demand : SAMPLE_DEMAND
  const gapData = hasLiveViz && viz ? viz.gaps : SAMPLE_GAPS

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
                <div className="ri__hint">불러오면 자동으로 분석까지 실행돼요. 스킬은 아래에서 자유롭게 더하거나 뺄 수 있어요.</div>
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
          {/* 커버리지 링 · 수요 막대 · 미보유 갭 — 상태와 무관하게 항상 상단에 노출한다.
              실데이터가 없으면 블러 + CTA, '예시 보기'를 누르면 샘플로 채운다. */}
          <div className="ri__vizwrap">
            {revealSample && (
              <div className="ri__viz-samplenote">예시 데이터 · {SAMPLE_POSITION_LABEL} 지원자 기준</div>
            )}
            <div className={`ri__vizgrid${isBlurred ? ' ri__vizgrid--blur' : ''}`} aria-hidden={isBlurred}>
              <div className="rc__viz">
                <div className="rc__viz-cap">커버리지</div>
                <CoverageRing
                  score={coverageDatum.score}
                  ownedCount={coverageDatum.ownedCount}
                  totalCount={coverageDatum.totalCount}
                  sample={vizIsSample}
                />
              </div>
              <div className="rc__viz">
                <div className="rc__viz-cap">수요 상위 스킬</div>
                <DemandBars items={demandData} sample={vizIsSample} />
              </div>
              <div className="rc__viz">
                <div className="rc__viz-cap">배울 우선순위 (미보유 갭)</div>
                <GapList items={gapData} sample={vizIsSample} />
              </div>
            </div>
            {isBlurred && (
              <div className="ri__viz-cta">
                <div className="ri__viz-scrim">
                  <p>로그인하고 이력서를 불러오면 내 데이터로 채워져요.</p>
                  <button type="button" className="ri__viz-sample-btn" onClick={() => setShowSample(true)}>
                    예시 보기
                  </button>
                </div>
              </div>
            )}
          </div>

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
