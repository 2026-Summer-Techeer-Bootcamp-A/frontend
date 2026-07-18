import { useEffect, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { FileText, RotateCcw, X } from 'lucide-react'
import { getAuthToken, useAuth } from '../career/authStore'
import { dashboardApi, marketApi, resumeApi } from '../career/api'
import type { ResumeListItemDto } from '../career/api'
import { postResumeFeedback } from './resumeInsightApi'
import type { Pool, ResumeFeedbackResponse } from './resumeInsightApi'
import { loadInitialAssistantResume, toAssistantResumeInput } from './resumeSelection'
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
// 여기에 더해 커버리지 링/수요 막대/미보유 갭 3종 시각화를 얹는다. 저장 이력서를 불러오면
// 초기 진입에서는 스킬셋과 시각화만 자동으로 채우고, 비용이 드는 LLM 피드백은 사용자가
// 분석 요청 버튼을 누르거나 드롭다운에서 저장 이력서를 다시 선택할 때만 실행한다
// (로그인/저장 이력서가 없으면 예시 데이터로 대체).

// 'ready'는 저장 이력서에서 스킬·시각화까지는 채웠지만 LLM 피드백은 아직 요청 전인 상태다.
// 이 상태를 'idle'로 두면 스킬이 이미 채워졌는데도 헤더가 "입력을 기다리는 중"으로 보여
// 마치 아무 것도 안 된 것처럼 오해를 준다.
type Status = 'idle' | 'ready' | 'loading' | 'done' | 'error'
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
  certs: string[]
  position: string
  pool: Pool
  memo: string | null
  resumeId: number | 'manual'
}

interface CachedPayload {
  position: string
  pool: Pool
  skills: string[]
  certs: string[]
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

function cacheKeyFor(resumeId: number | 'manual'): string {
  return resumeId === 'manual' ? 'manual' : String(resumeId)
}

/** 수요 상위 스킬(공개 API) + 가능하면 실 커버리지(로그인+저장 이력서)를 함께 가져온다.
 *  커버리지 실 API가 없거나 실패하면 수요 상위 스킬 대비 보유 비율로 근사한 폴백을 만든다. */
async function loadVizData(input: AnalysisInput, isAuthed: boolean): Promise<VizResult | null> {
  const ownedLower = new Set(input.skills.map((s) => s.trim().toLowerCase()))
  const toDemand = (items: Array<{ canonical: string; share: number }>): DemandBarDatum[] =>
    items
      .map((item) => ({
        canonical: item.canonical,
        share: item.share,
        owned: ownedLower.has(item.canonical.trim().toLowerCase()),
      }))
      .sort((a, b) => b.share - a.share)

  let demand: DemandBarDatum[] = []
  try {
    const shareRes = await marketApi.skillShare({ pool: input.pool, position: input.position, top_k: 8 })
    demand = toDemand(shareRes.items)
    // 백엔드 stats/skill-share의 position 필터가 현재 어떤 값을 넘겨도 빈 결과(sample_size 0)를
    // 돌려주는 버그가 있다 — position 없이 재요청해 시장 전체 수요로 대체한다. 실데이터이므로
    // 정직한 폴백이고, 이렇게 안 하면 시각화가 통째로 "데이터를 불러오지 못했어요"로 빠진다.
    if (demand.length === 0) {
      const fallbackRes = await marketApi.skillShare({ pool: input.pool, top_k: 8 })
      demand = toDemand(fallbackRes.items)
    }
  } catch {
    demand = []
  }

  let coverage: CoverageInfo | null = null
  const token = getAuthToken()
  if (isAuthed && input.resumeId !== 'manual' && token) {
    try {
      const identity = { resumeId: input.resumeId, token }
      let cov = await dashboardApi.coverage(identity, input.position)
      // 커버리지도 같은 position 필터 버그의 영향을 받는다 — top_skills가 비면
      // position 없이 재요청해 시장 전체 기준 커버리지로 대체한다.
      if (cov.top_skills.length === 0) {
        cov = await dashboardApi.coverage(identity)
      }
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
  const [certs, setCerts] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ResumeFeedbackResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 등록된 이력서 선택 — 직접 입력 대신 저장된 이력서에서 스킬셋을 불러올 수 있게 한다.
  const [savedResumes, setSavedResumes] = useState<ResumeListItemDto[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | 'manual'>('manual')
  const [resumeLoadError, setResumeLoadError] = useState('')
  const [loadingResume, setLoadingResume] = useState(false)
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null)

  // 커버리지 링 · 수요 막대 · 미보유 갭 3종 시각화 상태.
  const [vizStatus, setVizStatus] = useState<VizStatus>('idle')
  const [viz, setViz] = useState<VizResult | null>(null)
  const [showSample, setShowSample] = useState(false)

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
      setCerts(Array.isArray(parsed.certs) ? parsed.certs : [])
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
        certs: input.certs,
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
      certs: input.certs,
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

  // 로그인 사용자는 마이페이지와 같은 규칙으로 기본 이력서를 우선 불러온다.
  // 초기 진입에서는 저장 데이터와 시각화만 채우고, 비용이 드는 LLM 피드백은 사용자가 요청할 때 실행한다.
  useEffect(() => {
    if (!isAuthed) {
      setSavedResumes([])
      setSelectedResumeId('manual')
      setSelectedMemo(null)
      setResumeLoadError('')
      setLoadingResume(false)
      return
    }

    const token = getAuthToken()
    if (!token) {
      setResumeLoadError('로그인 정보를 확인하지 못했어요. 다시 로그인해주세요.')
      return
    }

    let cancelled = false

    const loadInitialResume = async () => {
      setLoadingResume(true)
      setResumeLoadError('')

      try {
        const { items, input } = await loadInitialAssistantResume({
          list: () => resumeApi.list(token),
          detail: (resumeId) => resumeApi.detail(resumeId, token),
        })
        if (cancelled) return

        setSavedResumes(items)
        if (!input) {
          setSelectedResumeId('manual')
          return
        }
        setSelectedResumeId(input.resumeId)
        setPosition(input.position)
        setPool(input.pool)
        setSkills(input.skills)
        setCerts(input.certs)
        setSelectedMemo(input.memo)

        // runAnalysis 전체(피드백+시각화)를 자동 호출하지 않는다 — 여기서는 시각화만
        // runAnalysis와 동일한 방식으로 직접 채우고, 비용이 드는 postResumeFeedback 호출은
        // 사용자가 분석 요청 버튼을 누르거나(submit) 저장 이력서를 다시 선택할 때만
        // (selectSavedResume) 실행되도록 남겨둔다.
        // 캐시 복원 이펙트가 이미 같은 이력서의 완료된 분석 결과를 채워놨다면(status 'done')
        // 그 결과를 지우지 않는다 — 여기서 무조건 'ready'로 되돌리면 이미 확보한 피드백이
        // 화면에서 사라지는 것처럼 보인다.
        setStatus((prev) => (prev === 'done' ? prev : 'ready'))
        setVizStatus('loading')
        setShowSample(false)
        loadVizData(input, isAuthed)
          .then((v) => {
            if (cancelled) return
            setViz(v)
            setVizStatus(v ? 'done' : 'error')
          })
          .catch(() => {
            if (cancelled) return
            setViz(null)
            setVizStatus('error')
          })
      } catch (err: unknown) {
        if (!cancelled) {
          setResumeLoadError(err instanceof Error ? err.message : '저장된 이력서를 불러오지 못했어요.')
        }
      } finally {
        if (!cancelled) setLoadingResume(false)
      }
    }

    void loadInitialResume()

    return () => {
      cancelled = true
    }
  }, [isAuthed])

  const selectSavedResume = (value: string) => {
    if (value === 'manual') {
      setSelectedResumeId('manual')
      setSelectedMemo(null)
      setResumeLoadError('')
      return
    }
    const token = getAuthToken()
    if (!token) {
      setResumeLoadError('로그인 정보를 확인하지 못했어요. 다시 로그인해주세요.')
      return
    }
    const resumeId = Number(value)
    setSelectedResumeId(resumeId)
    setLoadingResume(true)
    setResumeLoadError('')
    resumeApi.detail(resumeId, token)
      .then((detail) => {
        const input = toAssistantResumeInput(detail)
        setPosition(input.position)
        setPool(input.pool)
        setSkills(input.skills)
        setCerts(input.certs)
        setSelectedMemo(input.memo)
        // 저장 이력서를 불러오면 스킬셋 로드가 끝난 즉시 자동으로 분석까지 실행한다.
        runAnalysis(input)
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
    runAnalysis({ skills, certs, position, pool, memo: selectedMemo, resumeId: selectedResumeId })
  }

  const statusLabel = busy
    ? '분석 중'
    : result
      ? '분석 완료'
      : status === 'ready'
        ? '분석 대기 중'
        : '입력을 기다리는 중'

  // 실데이터가 있으면(로그인 없이도 skillShare는 공개 API라 뜰 수 있다) 그걸 쓰고,
  // 없으면(분석 전 idle이거나 실패) 항상 예시 데이터로 채운 뒤 블러 또는 뱃지로 구분한다.
  const hasLiveViz = vizStatus === 'done' && !!viz && (viz.demand.length > 0 || viz.coverage.totalCount > 0)
  // 로그인 + 보유 기술이 있는 이력서라면 실데이터를 받을 자격이 있다 — 이 경우 아직 로딩 중이거나
  // 실패했더라도 "로그인하고 이력서를 불러오면" CTA를 보여주면 안 된다(이미 했으니까). 블러 자체는
  // 로딩 스켈레톤 대용으로 유지하되, 안내 문구만 상태별로 구분한다.
  const vizEligible = isAuthed && skills.length > 0
  // 'idle'은 분석이 막 시작되기 직전(같은 틱) 순간일 뿐이라 로딩 쪽으로 묶는다 —
  // 그래야 'done'인데도 실제로는 빈 결과인 드문 경우만 "실패" 문구로 정확히 분리된다.
  const vizPending = vizEligible && !hasLiveViz && (vizStatus === 'loading' || vizStatus === 'idle')
  const vizFailed = vizEligible && !hasLiveViz && !vizPending
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
          {isAuthed && savedResumes.length === 0 && loadingResume && (
            <div className="ri__hint">저장된 이력서를 불러오는 중…</div>
          )}
          {isAuthed && savedResumes.length === 0 && resumeLoadError && (
            <div className="ri__hint ri__hint--error">{resumeLoadError}</div>
          )}
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
            {isBlurred && vizPending && (
              <div className="ri__viz-cta" aria-live="polite">
                <div className="ri__viz-scrim">
                  <p>내 데이터를 불러오는 중…</p>
                </div>
              </div>
            )}
            {isBlurred && vizFailed && (
              <div className="ri__viz-cta">
                <div className="ri__viz-scrim">
                  <p>데이터를 불러오지 못했어요.</p>
                  <button type="button" className="ri__viz-sample-btn" onClick={submit}>
                    다시 시도
                  </button>
                </div>
              </div>
            )}
            {isBlurred && !vizEligible && (
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

          {status === 'ready' && (
            <div className="rc__empty">저장된 이력서에서 기술을 불러왔어요. 분석 요청을 누르면 이력서 피드백과 예상 면접 질문을 받아볼 수 있어요.</div>
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
