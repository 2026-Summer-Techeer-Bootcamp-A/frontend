import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UploadCloud, Plus, X } from 'lucide-react'
import { SubScreen, PoolToggle } from './charts'
import { SkillChip, TechSearchSheet, CertSearchSheet, SegmentedControl } from './kit'
import { useResumesState, resumeToUpsertPayload, detailToResume } from './state'
import { resumeApi } from './api'
import type { ResumePreferencesDto } from './api'
import { getAuthToken } from './authStore'
import { confirmResumeSession } from '../rag/resumeInsightApi'
import { useIsDesktop } from '../shared/useMediaQuery'
import ResumeParsing, { type ParsedResult } from './ResumeParsing'
import techs from '../data/techs.json'

const TECHS = techs as { tech: string; count: number; category: string }[]

// 채용 카테고리(직무). 실제 값은 백엔드 GET /job-categories(name·is_tech)로 대체 가능.
const POSITIONS = [
  '백엔드 개발', '프론트엔드 개발', '풀스택 개발', '안드로이드 개발', 'iOS 개발',
  '데이터 엔지니어', '데이터 사이언티스트', '머신러닝·AI 엔지니어', 'DevOps·인프라',
  '보안 엔지니어', 'QA 엔지니어', '임베디드·시스템', '게임 클라이언트', '게임 서버',
  '블록체인 개발', '데이터 분석가', 'PM·기획',
]

type Level = NonNullable<ResumePreferencesDto['level']>
type JobSearchStatus = NonNullable<ResumePreferencesDto['jobSearchStatus']>
type Stage = '대기업' | '중견' | '중소'
type StagePref = 'hide' | 'show' | 'boost'

const LEVELS: { key: Level; label: string; range: string; min: number; max: number }[] = [
  { key: 'intern', label: '신입', range: '0~1년', min: 0, max: 1 },
  { key: 'junior', label: '주니어', range: '1~3년', min: 1, max: 3 },
  { key: 'mid', label: '미드레벨', range: '3~6년', min: 3, max: 6 },
  { key: 'senior', label: '시니어', range: '6~10년', min: 6, max: 10 },
  { key: 'lead', label: '리드', range: '10~15년', min: 10, max: 15 },
  { key: 'director', label: '디렉터', range: '15~20년', min: 15, max: 20 },
]

const STAGES: { key: Stage; label: string }[] = [
  { key: '대기업', label: '대기업' },
  { key: '중견', label: '중견기업' },
  { key: '중소', label: '중소·스타트업' },
]
const STAGE_PREFS: { key: StagePref; label: string }[] = [
  { key: 'hide', label: '숨김' },
  { key: 'show', label: '보통' },
  { key: 'boost', label: '강조' },
]

const SECTORS = [
  '백엔드', '프론트엔드', '데이터', 'AI·ML', '인프라·DevOps', '보안',
  '모바일', '게임', '핀테크', '대규모 트래픽', 'MSA', '클라우드',
]

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '그 외']

const DEFAULT_PREFS: ResumePreferencesDto = {
  companyStagePrefs: { 대기업: 'show', 중견: 'show', 중소: 'show' },
  sectorInterests: [],
  location: { remote: true, onsite: true, regions: [] },
}

export default function ResumeSubmit() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const isNew = window.location.pathname === '/resume/new'
  const { resumes, activeId, createResume, updateResume } = useResumesState()
  const isDesktop = useIsDesktop()

  const targetId = params.id ?? (isNew ? undefined : activeId || undefined)
  const existing = resumes.find((r) => r.id === targetId)

  const [mode, setMode] = useState<'form' | 'pdf'>('form')
  const [previewTab, setPreviewTab] = useState<'settings' | 'preview'>('settings')
  const [saveError, setSaveError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [certPickerOpen, setCertPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // LLM 파싱 오버레이
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [title, setTitle] = useState(existing?.title ?? '내 이력서')
  const [position, setPosition] = useState(
    existing?.position && POSITIONS.includes(existing.position) ? existing.position : '백엔드 개발',
  )
  const [pool, setPool] = useState<'국내' | '국외'>(existing?.pool ?? '국내')
  const [careerMin, setCareerMin] = useState(String(existing?.careerMin ?? 0))
  const [careerMax, setCareerMax] = useState(String(existing?.careerMax ?? 3))
  const [skills, setSkills] = useState<string[]>(existing?.skills ?? [])
  const [certs, setCerts] = useState<string[]>(existing?.certs ?? [])
  const [memo, setMemo] = useState(existing?.memo ?? '')

  const [level, setLevel] = useState<Level | undefined>(undefined)
  const [jobSearchStatus, setJobSearchStatus] = useState<JobSearchStatus | undefined>(undefined)
  const [companyStagePrefs, setCompanyStagePrefs] = useState(DEFAULT_PREFS.companyStagePrefs)
  const [sectorInterests, setSectorInterests] = useState<string[]>([])
  const [remote, setRemote] = useState(true)
  const [onsite, setOnsite] = useState(true)
  const [regions, setRegions] = useState<string[]>([])

  useEffect(() => {
    if (!existing) return
    const token = getAuthToken()
    if (!token) return

    // resumes 목록의 비활성 항목은 skills/certs/career가 빈 스텁이라(useResumesState 참고),
    // 폼을 채울 때는 반드시 이 이력서의 실제 상세를 직접 불러온다 — 그렇지 않으면
    // 비어있는 스텁으로 폼이 채워졌다가 저장 시 실제 데이터를 덮어써버린다.
    resumeApi.detail(Number(existing.id), token).then((detail) => {
      const full = detailToResume(detail)
      setTitle(full.title)
      if (full.position && POSITIONS.includes(full.position)) setPosition(full.position)
      setPool(full.pool ?? '국내')
      setCareerMin(String(full.careerMin ?? 0))
      setCareerMax(String(full.careerMax ?? 3))
      setSkills(full.skills)
      setCerts(full.certs)
      setMemo(full.memo ?? '')
    }).catch(() => setSaveError('이력서를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'))

    resumeApi.getPreferences(Number(existing.id), token).then((p) => {
      setLevel(p.level)
      setJobSearchStatus(p.jobSearchStatus)
      setCompanyStagePrefs({ ...DEFAULT_PREFS.companyStagePrefs, ...p.companyStagePrefs })
      setSectorInterests(p.sectorInterests)
      setRemote(p.location.remote)
      setOnsite(p.location.onsite)
      setRegions(p.location.regions)
    }).catch(() => { /* keep defaults */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  const toggleSkill = (t: string) =>
    setSkills((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))
  const addCert = (name: string) => setCerts((c) => (c.includes(name) ? c : [...c, name]))
  const removeCert = (name: string) => setCerts((c) => c.filter((x) => x !== name))

  const handleLevel = (lv: typeof LEVELS[number]) => {
    setLevel(lv.key)
    setCareerMin(String(lv.min))
    setCareerMax(String(lv.max))
  }
  const setStagePref = (stage: Stage, val: StagePref) =>
    setCompanyStagePrefs((c) => ({ ...c, [stage]: val }))
  const toggleSector = (s: string) =>
    setSectorInterests((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]))
  const toggleRegion = (r: string) =>
    setRegions((arr) => (arr.includes(r) ? arr.filter((x) => x !== r) : [...arr, r]))

  const handleFile = (file: File) => {
    // LLM 파싱 오버레이를 띄운다. 완료 후 onParseDone이 폼을 채운다.
    setPendingFile(file)
    if (!existing) setTitle((t) => (t === '내 이력서' ? file.name.replace(/\.pdf$/i, '') : t))
  }

  const onParseDone = (result: ParsedResult) => {
    setPendingFile(null)
    const mergedSkills = [...new Set([...skills, ...result.skills])]
    const mergedCerts  = [...new Set([...certs,  ...result.certs])]
    setSkills(mergedSkills)
    setCerts(mergedCerts)
    if (result.position && POSITIONS.includes(result.position)) setPosition(result.position)
    if (result.careerYears !== null && result.careerYears !== undefined) {
      setCareerMin(String(result.careerYears))
      setCareerMax(String(result.careerYears + 1))
    }
    // 메모 문장들을 줄바꿈으로 연결해 메모 필드에 자동 채움
    if (result.memoSentences && result.memoSentences.length > 0) {
      setMemo(result.memoSentences.join('\n'))
    }
    if (result.level) setLevel(result.level as Level)
    if (result.regions && result.regions.length > 0) setRegions(result.regions)
    if (result.sectorInterests && result.sectorInterests.length > 0) setSectorInterests(result.sectorInterests)
    // RAG 세션 시딩 (부가 효과 — 실패해도 무시)
    if (result.rawText) {
      confirmResumeSession({
        skills: mergedSkills.map((s) => ({ canonical: s, category: 'skill', in_dict: false })),
        certs: mergedCerts,
        position: result.position ?? position,
        careerMin: result.careerYears ?? null,
        careerMax: result.careerYears ? result.careerYears + 1 : null,
        pool: pool === '국외' ? 'global' : 'domestic',
        memo: result.memoSentences.join('\n') || null,
        resumeText: result.rawText,
      }).catch(() => {})
    }
    setMode('form')
  }

  const handleSubmit = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const cMin = Number(careerMin) || 0
      const cMax = Math.max(cMin, Number(careerMax) || cMin)
      const payload = resumeToUpsertPayload({
        title: title.trim() || '내 이력서',
        skills,
        certs,
        position,
        careerMin: cMin,
        careerMax: cMax,
        pool,
        memo: memo.trim() || undefined,
      })

      const savedResume = existing
        ? await updateResume(existing.id, payload)
        : await createResume(payload)

      const token = getAuthToken()
      if (token) {
        await resumeApi.updatePreferences(Number(savedResume.id), {
          level, jobSearchStatus, companyStagePrefs, sectorInterests,
          location: { remote, onsite, regions },
        }, token).catch(() => {
          setSaveError('이력서는 저장됐지만 선호도 저장에 실패했어요. 마이페이지에서 다시 시도해주세요.')
        })
      }
      navigate('/resume')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했어요')
    } finally {
      setSaving(false)
    }
  }

  const previewCard = (
    <div className="rpv-card">
      <div className="rpv-title">{title || '내 이력서'}</div>
      <div className="rpv-meta">{position} · {careerMin}~{careerMax}년 · {pool}</div>
      <div className="rpv-section">
        <div className="rpv-section__label">기술 스택</div>
        <div className="rpv-chips">
          {skills.map((s) => <span key={s} className="rpv-chip">{s}</span>)}
          {skills.length === 0 && <span className="rpv-empty">아직 없어요</span>}
        </div>
      </div>
      <div className="rpv-section">
        <div className="rpv-section__label">자격증</div>
        <div className="rpv-chips">
          {certs.map((c) => <span key={c} className="rpv-chip">{c}</span>)}
          {certs.length === 0 && <span className="rpv-empty">아직 없어요</span>}
        </div>
      </div>
    </div>
  )

  const settingsForm = (
    <>
      <div className="scr-intro">
        <div className="scr-intro__text">몇 가지 선호를 알려주시면 추천을 더 정확하게 맞춰드려요.</div>
      </div>

      <div className="scr-segfull">
        <button className={mode === 'form' ? 'on' : ''} onClick={() => setMode('form')}>직접 입력</button>
        <button className={mode === 'pdf' ? 'on' : ''} onClick={() => setMode('pdf')}>PDF 업로드</button>
      </div>

      {mode === 'pdf' ? (
        <label className="scr-upload">
          <input
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <UploadCloud size={30} style={{ color: 'var(--c-accent)' }} />
          <div style={{ marginTop: 8 }}><b>이력서 PDF</b>를 올려주세요</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>
            {'기술·자격증·포지션·연차를 AI가 실시간 분석해요'}
          </div>
          {saveError && <div className="scr-excluded" style={{ background: '#fbe9e9', color: '#b3261e' }}>{saveError}</div>}
        </label>
      ) : (
        <>
          {saveError && <div className="scr-excluded" style={{ background: '#fbe9e9', color: '#b3261e' }}>{saveError}</div>}

          <div className="scr-field">
            <label className="scr-field__lbl">이력서 제목</label>
            <input className="scr-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 백엔드 신입 이력서" />
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">희망 포지션</label>
            <select className="scr-input scr-select" value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">채용 풀</label>
            <PoolToggle pool={pool} onChange={setPool} />
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">현재 레벨</label>
            <div className="scr-levellist">
              {LEVELS.map((lv) => (
                <button key={lv.key} className={`scr-levelrow${level === lv.key ? ' on' : ''}`} onClick={() => handleLevel(lv)}>
                  <span className="scr-levelrow__label">{lv.label}</span>
                  <span className="scr-levelrow__range">{lv.range}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">경력 (년)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input className="scr-input" type="number" min={0} value={careerMin} onChange={(e) => setCareerMin(e.target.value)} placeholder="최소" />
              <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>~</span>
              <input className="scr-input" type="number" min={0} value={careerMax} onChange={(e) => setCareerMax(e.target.value)} placeholder="최대" />
            </div>
            <span className="scr-field__hint" style={{ fontSize: 12, color: 'var(--c-muted)' }}>신입은 0으로 두세요. 위 레벨을 고르면 자동으로 채워져요.</span>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">구직 상태</label>
            <SegmentedControl
              value={jobSearchStatus ?? 'active'}
              onChange={(v) => setJobSearchStatus(v as JobSearchStatus)}
              options={[
                { key: 'active', label: '적극적으로 찾는 중' },
                { key: 'casual', label: '가볍게 보는 중' },
                { key: 'none', label: '안 찾음' },
              ]}
            />
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">기업 단계 선호</label>
            <div className="scr-stagelist">
              {STAGES.map((s) => (
                <div className="scr-stagerow" key={s.key}>
                  <span className="scr-stagerow__name">{s.label}</span>
                  <div className="scr-stagepill">
                    {STAGE_PREFS.map((sp) => (
                      <button key={sp.key} className={companyStagePrefs[s.key] === sp.key ? 'on' : ''} onClick={() => setStagePref(s.key, sp.key)}>
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">관심 분야</label>
            <div className="scr-chiprow">
              {SECTORS.map((s) => (
                <button key={s} className={`scr-selchip${sectorInterests.includes(s) ? ' on' : ''}`} onClick={() => toggleSector(s)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">근무 형태·지역</label>
            <div className="scr-checkrow">
              <label className="scr-checkopt"><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> 재택</label>
              <label className="scr-checkopt"><input type="checkbox" checked={onsite} onChange={(e) => setOnsite(e.target.checked)} /> 사무실·하이브리드</label>
            </div>
            {onsite && (
              <div className="scr-chiprow" style={{ marginTop: 10 }}>
                {REGIONS.map((r) => (
                  <button key={r} className={`scr-selchip${regions.includes(r) ? ' on' : ''}`} onClick={() => toggleRegion(r)}>{r}</button>
                ))}
              </div>
            )}
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">보유 기술 <span style={{ color: 'var(--c-muted)', fontWeight: 500 }}>{skills.length}개</span></label>
            <div className="scr-skillbox">
              {skills.map((s) => <SkillChip key={s} tech={s} onRemove={() => toggleSkill(s)} />)}
              <button className="kit-schip add" onClick={() => setPickerOpen(true)}><Plus size={14} /> 추가</button>
            </div>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">보유 자격증 <span style={{ color: 'var(--c-muted)', fontWeight: 500 }}>{certs.length}개</span></label>
            <div className="scr-skillbox">
              {certs.map((c) => (
                <span key={c} className="kit-schip">{c} <button onClick={() => removeCert(c)} aria-label={`${c} 삭제`}><X size={12} /></button></span>
              ))}
              <button className="kit-schip add" onClick={() => setCertPickerOpen(true)}><Plus size={14} /> 추가</button>
            </div>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">메모 <span style={{ color: 'var(--c-muted)', fontWeight: 500 }}>AI 어시스턴트 참고용 · 비공개</span></label>
            <textarea
              className="scr-input"
              style={{ minHeight: 96, resize: 'vertical' }}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={4000}
              placeholder="이력서 분석 시 참고할 맥락을 자유롭게 적어주세요. (예: 이번엔 백엔드 중심으로 어필하고 싶어요)"
            />
            <span className="scr-field__hint" style={{ fontSize: 12, color: 'var(--c-muted)' }}>
              이 메모는 이력서 미리보기·다른 사람에게는 보이지 않아요. 이름·연락처 등 개인정보는 적지 말아주세요.
            </span>
          </div>

          <div className="scr-note" style={{ marginTop: 10 }}>
            🔒 이력서 원문·개인정보(이름·연락처 등)는 서버에 저장하지 않아요. 매칭에 필요한 <b>직무·경력·기술셋</b>만 사용해요.
          </div>

          <button className="scr-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중…' : (existing ? '저장하고 마이로' : '확인하고 마이로')}
          </button>
        </>
      )}
    </>
  )

  return (
    <SubScreen title="이력서 제출">
      {/* LLM 파싱 오버레이 — PDF 업로드 직후 표시 */}
      {pendingFile && (
        <ResumeParsing
          file={pendingFile}
          onDone={onParseDone}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {isDesktop ? (
        <div className="rpv-grid">
          <div className="rpv-settings">{settingsForm}</div>
          <div className="rpv-preview">{previewCard}</div>
        </div>
      ) : (
        <>
          <div className="scr-segfull" style={{ marginBottom: 12 }}>
            <button className={previewTab === 'settings' ? 'on' : ''} onClick={() => setPreviewTab('settings')}>설정</button>
            <button className={previewTab === 'preview' ? 'on' : ''} onClick={() => setPreviewTab('preview')}>미리보기</button>
          </div>
          {previewTab === 'settings' ? settingsForm : previewCard}
        </>
      )}

      <div style={{ height: 20 }} />

      <TechSearchSheet open={pickerOpen} onClose={() => setPickerOpen(false)} all={TECHS} owned={skills} onToggle={toggleSkill} />
      <CertSearchSheet open={certPickerOpen} onClose={() => setCertPickerOpen(false)} owned={certs} onAdd={addCert} />
    </SubScreen>
  )
}
