import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Bookmark, Bell, Shield, Settings, LogOut, Plus, X } from 'lucide-react'
import { CareerScreen, ScreenHead } from './charts'
import { ResumeHeroCard, MenuRow, SectionHeader, SkillChip, TechSearchSheet } from './kit'
import { useResumesState, calculateCoverage, type Resume } from './state'
import techs from '../data/techs.json'

const TECHS = techs as { tech: string; count: number }[]

function careerText(min: number | null, max: number | null) {
  if (min === null && max === null) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

export default function ResumeScreen() {
  const navigate = useNavigate()
  const { resumes, activeId, activeResume, updateResumes, selectResume, addResume } = useResumesState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const uid = useRef(Date.now())

  const toggleSkill = (t: string) => {
    const updated = resumes.map((x) => {
      if (x.id === activeResume.id) {
        const nextSkills = x.skills.includes(t) ? x.skills.filter((s) => s !== t) : [...x.skills, t]
        return {
          ...x,
          skills: nextSkills,
          coveragePct: calculateCoverage(nextSkills, '국내'),
        }
      }
      return x
    })
    updateResumes(updated)
  }

  const delResume = (id: string) => {
    if (resumes.length <= 1) return
    const nl = resumes.filter((x) => x.id !== id)
    updateResumes(nl)
    if (activeId === id) {
      selectResume(nl[0].id)
    }
  }

  const handleAddResume = () => {
    const id = `rx${uid.current++}`
    const newResume: Resume = {
      id,
      title: '새 이력서',
      skills: [],
      position: '직무 미정',
      careerMin: 0,
      careerMax: 0,
      coveragePct: 0,
    }
    addResume(newResume)
  }

  return (
    <CareerScreen active="resume">
      <ScreenHead title="마이" sub="내 이력서와 커버리지" />

      {/* 이력서 전환 · 추가/삭제 (토큰 칩) */}
      <div className="scr-rchips">
        {resumes.map((x, i) => (
          <span key={x.id} className={`kit-schip rchip${activeId === x.id ? ' on' : ''}`} onClick={() => selectResume(x.id)}>
            이력서 {i + 1}
            {resumes.length > 1 && (
              <button className="kit-schip__x" onClick={(e) => { e.stopPropagation(); delResume(x.id) }} aria-label="삭제"><X size={12} /></button>
            )}
          </span>
        ))}
        <button className="kit-schip add" onClick={handleAddResume}><Plus size={14} /> 추가</button>
      </div>

      {/* 이력서 히어로 카드 */}
      <ResumeHeroCard
        title={activeResume.title} position={activeResume.position} career={careerText(activeResume.careerMin, activeResume.careerMax)}
        coverage={calculateCoverage(activeResume.skills, '국내')} skillCount={activeResume.skills.length} onEdit={() => navigate('/resume/submit')}
      />

      {/* 보유 기술 — 편집 가능 토큰 칩 + 추가 */}
      <SectionHeader title="보유 기술" hint={`${activeResume.skills.length}개`} />
      <div className="scr-card" style={{ marginTop: 0 }}>
        <div className="scr-skillbox" style={{ marginTop: 0 }}>
          {activeResume.skills.map((s) => <SkillChip key={s} tech={s} onRemove={() => toggleSkill(s)} />)}
          <button className="kit-schip add" onClick={() => setPickerOpen(true)}><Plus size={14} /> 추가</button>
        </div>
      </div>

      {/* 관리 */}
      <SectionHeader title="관리" />
      <div className="kit-menulist">
        <MenuRow icon={<Award size={18} />} label="자격증 갭" onClick={() => navigate('/cert-gap')} />
        <MenuRow icon={<Bookmark size={18} />} label="저장한 공고" value="0개" />
      </div>

      {/* 설정 */}
      <SectionHeader title="설정" />
      <div className="kit-menulist">
        <MenuRow icon={<Bell size={18} />} label="알림 설정" />
        <MenuRow icon={<Shield size={18} />} label="개인정보 · 데이터" value="원문 미저장" />
        <MenuRow icon={<Settings size={18} />} label="설정" />
        <MenuRow icon={<LogOut size={18} />} label="로그아웃" danger />
      </div>
      <div style={{ height: 18 }} />

      <TechSearchSheet open={pickerOpen} onClose={() => setPickerOpen(false)} all={TECHS} owned={activeResume.skills} onToggle={toggleSkill} />
    </CareerScreen>
  )
}
