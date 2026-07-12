import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Bookmark, Bell, Shield, Settings, LogOut, LogIn, Plus, X, Briefcase, User, FileText, ChevronRight } from 'lucide-react'
import { CareerScreen, ScreenHead } from './charts'
import { MenuRow, SectionHeader, SkillChip, TechSearchSheet } from './kit'
import { useResumesState, calculateCoverage, type Resume } from './state'
import { useAuth } from './authStore'
import LogoutSheet from './auth/LogoutSheet'
import techs from '../data/techs.json'

const TECHS = techs as { tech: string; count: number }[]

function careerText(min: number | null, max: number | null) {
  if (min === null && max === null) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

export default function ResumeScreen() {
  const navigate = useNavigate()
  const { resumes, activeId, activeResume, updateResumes, selectResume, addResume } = useResumesState()
  const { user, isAuthed, logout } = useAuth()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const uid = useRef(Date.now())

  const displayName = user?.nickname ?? '리버'
  const displayEmail = user?.email ?? 'bootcamp@example.com'
  const avatarInitial = user ? (user.nickname || user.email).slice(0, 2).toUpperCase() : 'RV'

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

      {/* 계정 카드 — 담백하게: 아바타 이니셜 + 이름/이메일 + 정보수정, 아래 목표직무·경력 2단 */}
      <div className="cr-profile">
        <div className="cr-profile__top">
          <span className="cr-profile__avatar">{avatarInitial}</span>
          <div className="cr-profile__id">
            <span className="nm">{displayName}</span>
            <span className="em">{displayEmail}</span>
          </div>
          <button className="cr-profile__edit" onClick={() => navigate(isAuthed ? '/settings/account' : '/login')}>
            {isAuthed ? '내 정보 수정' : '로그인'}
          </button>
        </div>
        <div className="cr-profile__stats">
          <div className="cr-profile__stat">
            <Briefcase size={15} />
            <div><span className="lb">목표 직무</span><span className="v">{activeResume.position}</span></div>
          </div>
          <div className="cr-profile__stat">
            <User size={15} />
            <div><span className="lb">경력</span><span className="v">{careerText(activeResume.careerMin, activeResume.careerMax)}</span></div>
          </div>
        </div>
      </div>

      {/* 활성 이력서 카드 */}
      <SectionHeader title="활성 이력서" />
      <button className="cr-activeresume" onClick={() => navigate('/resume/submit')}>
        <span className="cr-activeresume__ic"><FileText size={18} /></span>
        <span className="cr-activeresume__body">
          <span className="t">{activeResume.title}</span>
          <span className="s">{activeResume.position} · 보유 기술 {activeResume.skills.length}개</span>
        </span>
        <span className="cr-analysisbadge">분석 기준</span>
        <ChevronRight size={17} className="cr-activeresume__chev" />
      </button>

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
        <MenuRow icon={<Bell size={18} />} label="알림 설정" onClick={() => navigate('/settings/notifications')} />
        <MenuRow icon={<Shield size={18} />} label="개인정보 · 데이터" value="원문 미저장" onClick={() => navigate('/settings/privacy')} />
        <MenuRow icon={<Settings size={18} />} label="설정" onClick={() => navigate('/settings')} />
        {isAuthed
          ? <MenuRow icon={<LogOut size={18} />} label="로그아웃" danger onClick={() => setLogoutOpen(true)} />
          : <MenuRow icon={<LogIn size={18} />} label="로그인" onClick={() => navigate('/login')} />}
      </div>
      <div style={{ height: 18 }} />

      <TechSearchSheet open={pickerOpen} onClose={() => setPickerOpen(false)} all={TECHS} owned={activeResume.skills} onToggle={toggleSkill} />
      <LogoutSheet open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => { logout(); setLogoutOpen(false); navigate('/login') }} />
    </CareerScreen>
  )
}
