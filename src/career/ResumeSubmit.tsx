import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Check, Plus } from 'lucide-react'
import { SubScreen, PoolToggle } from './charts'
import { SkillChip, TechSearchSheet, SegmentedControl } from './kit'
import { useResumesState, calculateCoverage } from './state'
import { useResumePrefs, type ResumePreferences } from './preferencesStore'
import techs from '../data/techs.json'

const TECHS = techs as { tech: string; count: number }[]

// 채용 카테고리(직무). 실제 값은 백엔드 GET /job-categories(name·is_tech)로 대체 가능.
const POSITIONS = [
  '백엔드 개발', '프론트엔드 개발', '풀스택 개발', '안드로이드 개발', 'iOS 개발',
  '데이터 엔지니어', '데이터 사이언티스트', '머신러닝·AI 엔지니어', 'DevOps·인프라',
  '보안 엔지니어', 'QA 엔지니어', '임베디드·시스템', '게임 클라이언트', '게임 서버',
  '블록체인 개발', '데이터 분석가', 'PM·기획',
]

type Mode = 'form' | 'pdf'
type Level = NonNullable<ResumePreferences['level']>
type JobSearchStatus = NonNullable<ResumePreferences['jobSearchStatus']>
type Stage = keyof ResumePreferences['companyStagePrefs']
type StagePref = ResumePreferences['companyStagePrefs'][Stage]

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

export default function ResumeSubmit() {
  const navigate = useNavigate()
  const { resumes, activeId, updateResumes } = useResumesState()
  const active = resumes.find((r) => r.id === activeId) ?? resumes[0]
  const { prefs, updatePrefs } = useResumePrefs()

  const [mode, setMode] = useState<Mode>('form')
  const [parsed, setParsed] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [title, setTitle] = useState(active?.title ?? '내 이력서')
  const [position, setPosition] = useState(
    active?.position && POSITIONS.includes(active.position) ? active.position : '백엔드 개발',
  )
  const [pool, setPool] = useState<'국내' | '국외'>(active?.pool ?? '국내')
  const [careerMin, setCareerMin] = useState(String(active?.careerMin ?? 0))
  const [careerMax, setCareerMax] = useState(String(active?.careerMax ?? 3))
  const [skills, setSkills] = useState<string[]>(active?.skills ?? [])

  const [level, setLevel] = useState<Level | undefined>(prefs.level)
  const [jobSearchStatus, setJobSearchStatus] = useState<JobSearchStatus | undefined>(prefs.jobSearchStatus)
  const [companyStagePrefs, setCompanyStagePrefs] = useState(prefs.companyStagePrefs)
  const [sectorInterests, setSectorInterests] = useState<string[]>(prefs.sectorInterests)
  const [remote, setRemote] = useState(prefs.location.remote)
  const [onsite, setOnsite] = useState(prefs.location.onsite)
  const [regions, setRegions] = useState<string[]>(prefs.location.regions)

  const toggleSkill = (t: string) =>
    setSkills((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))

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

  const handleParse = () => {
    setParsed(true)
    setMode('form')
    setSkills((s) => [...new Set([...s, 'Java', 'Spring', 'MySQL', 'Git', 'Linux', 'Docker'])])
  }

  const handleSubmit = () => {
    const cMin = Number(careerMin) || 0
    const cMax = Math.max(cMin, Number(careerMax) || cMin)
    const updated = resumes.map((x) =>
      x.id === active.id
        ? {
            ...x,
            title: title.trim() || '내 이력서',
            position,
            pool,
            careerMin: cMin,
            careerMax: cMax,
            skills,
            coveragePct: calculateCoverage(skills, pool),
          }
        : x,
    )
    updateResumes(updated)
    updatePrefs({
      level,
      jobSearchStatus,
      companyStagePrefs,
      sectorInterests,
      location: { remote, onsite, regions },
    })
    navigate('/resume')
  }

  return (
    <SubScreen title="이력서 제출">
      <div className="scr-intro">
        <div className="scr-intro__text">몇 가지 선호를 알려주시면 추천을 더 정확하게 맞춰드려요.</div>
        <span className="scr-intro__badge">예상 소요 약 2분</span>
      </div>

      <div className="scr-segfull">
        <button className={mode === 'form' ? 'on' : ''} onClick={() => setMode('form')}>직접 입력</button>
        <button className={mode === 'pdf' ? 'on' : ''} onClick={() => setMode('pdf')}>PDF 업로드</button>
      </div>

      {mode === 'pdf' && !parsed ? (
        <div className="scr-upload" onClick={handleParse}>
          <UploadCloud size={30} style={{ color: 'var(--c-accent)' }} />
          <div style={{ marginTop: 8 }}><b>이력서 PDF</b>를 올려주세요</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>기술·포지션·연차를 자동 추출해요 (탭해서 데모 실행)</div>
        </div>
      ) : (
        <>
          {parsed && (
            <div className="scr-excluded" style={{ background: '#e6f5ed', color: '#1c7a4d' }}>
              <Check size={13} style={{ verticalAlign: -2 }} /> PDF에서 기술을 추출했어요.
            </div>
          )}

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
                <button
                  key={lv.key}
                  className={`scr-levelrow${level === lv.key ? ' on' : ''}`}
                  onClick={() => handleLevel(lv)}
                >
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
                      <button
                        key={sp.key}
                        className={companyStagePrefs[s.key] === sp.key ? 'on' : ''}
                        onClick={() => setStagePref(s.key, sp.key)}
                      >
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
                <button
                  key={s}
                  className={`scr-selchip${sectorInterests.includes(s) ? ' on' : ''}`}
                  onClick={() => toggleSector(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">근무 형태·지역</label>
            <div className="scr-checkrow">
              <label className="scr-checkopt">
                <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> 재택
              </label>
              <label className="scr-checkopt">
                <input type="checkbox" checked={onsite} onChange={(e) => setOnsite(e.target.checked)} /> 사무실·하이브리드
              </label>
            </div>
            {onsite && (
              <div className="scr-chiprow" style={{ marginTop: 10 }}>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    className={`scr-selchip${regions.includes(r) ? ' on' : ''}`}
                    onClick={() => toggleRegion(r)}
                  >
                    {r}
                  </button>
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

          <div className="scr-note" style={{ marginTop: 10 }}>
            🔒 이력서 원문·개인정보(이름·연락처 등)는 서버에 저장하지 않아요. 매칭에 필요한 <b>직무·경력·기술셋</b>만 사용해요.
          </div>

          <button className="scr-primary" onClick={handleSubmit}>확인하고 마이로</button>
        </>
      )}
      <div style={{ height: 20 }} />

      <TechSearchSheet open={pickerOpen} onClose={() => setPickerOpen(false)} all={TECHS} owned={skills} onToggle={toggleSkill} />
    </SubScreen>
  )
}
