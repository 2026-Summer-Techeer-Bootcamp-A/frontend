import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Check, Plus } from 'lucide-react'
import { SubScreen, PoolToggle } from './charts'
import { SkillChip, TechSearchSheet } from './kit'
import { useResumesState, calculateCoverage } from './state'
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

export default function ResumeSubmit() {
  const navigate = useNavigate()
  const { resumes, activeId, updateResumes } = useResumesState()
  const active = resumes.find((r) => r.id === activeId) ?? resumes[0]

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

  const toggleSkill = (t: string) =>
    setSkills((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))

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
    navigate('/resume')
  }

  return (
    <SubScreen title="이력서 제출">
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
            <label className="scr-field__lbl">경력 (년)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input className="scr-input" type="number" min={0} value={careerMin} onChange={(e) => setCareerMin(e.target.value)} placeholder="최소" />
              <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>~</span>
              <input className="scr-input" type="number" min={0} value={careerMax} onChange={(e) => setCareerMax(e.target.value)} placeholder="최대" />
            </div>
            <span className="scr-field__hint" style={{ fontSize: 12, color: 'var(--c-muted)' }}>신입은 0으로 두세요.</span>
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
