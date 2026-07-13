import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Bookmark, Bell, Shield, Settings, LogOut, LogIn, Plus, Briefcase, User, FileText, ChevronRight, Trash2, CheckCircle2 } from 'lucide-react'
import { CareerScreen, ScreenHead } from './charts'
import { MenuRow, SectionHeader, SkillChip, TechSearchSheet } from './kit'
import { useResumesState, resumeToUpsertPayload } from './state'
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
  const { resumes, activeResume, updateResume, deleteResume, setPrimary } = useResumesState()
  const { user, isAuthed, logout } = useAuth()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const displayName = user?.nickname ?? '리버'
  const displayEmail = user?.email ?? 'bootcamp@example.com'
  const avatarInitial = user ? (user.nickname || user.email).slice(0, 2).toUpperCase() : 'RV'

  const toggleSkill = (t: string) => {
    if (!activeResume) return
    const nextSkills = activeResume.skills.includes(t)
      ? activeResume.skills.filter((s) => s !== t)
      : [...activeResume.skills, t]
    updateResume(activeResume.id, resumeToUpsertPayload({
      ...activeResume,
      skills: nextSkills,
      careerMin: activeResume.careerMin ?? 0,
      careerMax: activeResume.careerMax ?? 0,
      pool: activeResume.pool ?? '국내',
    }))
  }

  return (
    <CareerScreen active="resume">
      <ScreenHead title="마이" sub="내 이력서와 커버리지" />

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
        {activeResume && (
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
        )}
      </div>

      {/* 내 이력서 — 다중 관리: 목록 + 기본 지정 + 삭제 + 추가 */}
      <SectionHeader title="내 이력서" hint={`${resumes.length}개`} />
      {resumes.length === 0 ? (
        <button className="cr-activeresume" onClick={() => navigate('/resume/new')}>
          <span className="cr-activeresume__ic"><FileText size={18} /></span>
          <span className="cr-activeresume__body"><span className="t">이력서를 추가해보세요</span></span>
          <ChevronRight size={17} className="cr-activeresume__chev" />
        </button>
      ) : (
        <>
          {resumes.map((r) => (
            <div key={r.id} className="cr-activeresume" style={{ marginBottom: 8 }}>
              <span className="cr-activeresume__ic"><FileText size={18} /></span>
              <span className="cr-activeresume__body" onClick={() => navigate(`/resume/${r.id}/edit`)} style={{ cursor: 'pointer' }}>
                <span className="t">{r.title}</span>
                <span className="s">{r.position || '직무 미정'} · 보유 기술 {r.skills.length}개</span>
              </span>
              {r.isPrimary ? (
                <span className="cr-analysisbadge"><CheckCircle2 size={13} style={{ verticalAlign: -2 }} /> 기본</span>
              ) : (
                <button className="cr-analysisbadge" onClick={() => setPrimary(r.id)}>기본으로 설정</button>
              )}
              <button
                aria-label={`${r.title} 삭제`}
                onClick={() => { if (window.confirm(`'${r.title}'을(를) 삭제할까요?`)) deleteResume(r.id) }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button className="cr-activeresume" onClick={() => navigate('/resume/new')}>
            <span className="cr-activeresume__ic"><Plus size={18} /></span>
            <span className="cr-activeresume__body"><span className="t">새 이력서 추가</span></span>
          </button>
        </>
      )}

      {/* 보유 기술 — 편집 가능 토큰 칩 + 추가 (기본 이력서 기준) */}
      {activeResume && (
        <>
          <SectionHeader title="보유 기술" hint={`${activeResume.skills.length}개`} />
          <div className="scr-card" style={{ marginTop: 0 }}>
            <div className="scr-skillbox" style={{ marginTop: 0 }}>
              {activeResume.skills.map((s) => <SkillChip key={s} tech={s} onRemove={() => toggleSkill(s)} />)}
              <button className="kit-schip add" onClick={() => setPickerOpen(true)}><Plus size={14} /> 추가</button>
            </div>
          </div>
        </>
      )}

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

      <TechSearchSheet open={pickerOpen} onClose={() => setPickerOpen(false)} all={TECHS} owned={activeResume?.skills ?? []} onToggle={toggleSkill} />
      <LogoutSheet open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => { logout(); setLogoutOpen(false); navigate('/login') }} />
    </CareerScreen>
  )
}
