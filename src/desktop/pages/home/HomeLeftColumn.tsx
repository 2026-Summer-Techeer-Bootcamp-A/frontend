import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../../career/authStore'
import { useResumesState } from '../../../career/state'
import { useBookmarks } from '../../../career/bookmarkStore'
import { useRecentViews } from '../../../career/viewHistoryStore'
import HomeMarketPulse from './HomeMarketPulse'

const MAX_SKILL_CHIPS = 8
// viewHistoryStore의 MAX_HISTORY(20)와 동일 — 전체 최근 조회 수를 얻기 위한 상한.
const MAX_RECENT_VIEWS = 20

export default function HomeLeftColumn({ pool = 'all' }: { pool?: 'all' | 'domestic' | 'global' }) {
  const navigate = useNavigate()
  const { user, isAuthed } = useAuth()
  const { activeResume } = useResumesState()
  const bookmarks = useBookmarks()
  const recentViews = useRecentViews(MAX_RECENT_VIEWS)

  if (!isAuthed) {
    return (
      <section className="hfeed-guest">
        <div className="hfeed-guest__eyebrow">게스트</div>
        <div className="hfeed-guest__title">로그인하고 매치율 확인하기</div>
        <div className="hfeed-guest__body">로그인하면 공고마다 내 이력서 매치율이 보여요.</div>
        <div className="hfeed-guest__actions">
          <button type="button" className="hfeed-guest__btn hfeed-guest__btn--primary" onClick={() => navigate('/login')}>
            로그인
          </button>
          <button type="button" className="hfeed-guest__btn hfeed-guest__btn--ghost" onClick={() => navigate('/signup')}>
            회원가입
          </button>
        </div>
        <button type="button" className="hfeed-guest__skip">먼저 둘러보기</button>
      </section>
    )
  }

  const avatarInitial = (user?.nickname || user?.email || '사용자').slice(0, 1).toUpperCase()
  const targetLabel = activeResume?.position ? `${activeResume.position} 지망` : '희망 직무 미설정'
  const skills = activeResume?.skills ?? []
  const visibleSkills = skills.slice(0, MAX_SKILL_CHIPS)
  const extraSkillCount = skills.length - visibleSkills.length
  const coveragePct = activeResume?.coveragePct ?? 0

  return (
    <>
      <section className="hfeed-profile card">
        <div className="hfeed-profile__top">
          <div className="hfeed-profile__avatar">{avatarInitial}</div>
          <div>
            <div className="hfeed-profile__name">{user?.nickname ?? '사용자'}</div>
            <div className="hfeed-profile__target">{targetLabel}</div>
          </div>
        </div>
        <div className="hfeed-profile__stats">
          <div className="hfeed-profile__stat">
            <div className="lb">북마크</div>
            <div className="v tnum">{bookmarks.length}</div>
          </div>
          <div className="hfeed-profile__stat">
            <div className="lb">최근 본 공고</div>
            <div className="v tnum">{recentViews.length}</div>
          </div>
        </div>
      </section>

      {activeResume && (
        <section className="hfeed-resume card">
          <div className="hfeed-resume__head">
            <h3>내 이력서</h3>
            <button type="button" className="hfeed-resume__edit" onClick={() => navigate('/resume')}>
              이력서 편집
            </button>
          </div>
          <div className="hfeed-resume__meter-cap">
            이력서 완성도 <b className="tnum">{coveragePct}%</b>
          </div>
          <div className="hfeed-meter">
            <i style={{ width: `${coveragePct}%` }} />
          </div>
          <div className="hfeed-resume__skillcap">
            보유 스킬 <b className="tnum">{skills.length}개</b>
          </div>
          <div className="hfeed-chips">
            {visibleSkills.map((skill) => (
              <span key={skill} className="hfeed-chip">{skill}</span>
            ))}
            {extraSkillCount > 0 && <span className="hfeed-chip--more">+{extraSkillCount}</span>}
          </div>
        </section>
      )}

      <nav className="hfeed-links card">
        <button type="button" className="hfeed-links__row" onClick={() => navigate('/jobs')}>
          <span className="lb">북마크한 공고</span>
          <span className="ct tnum">{bookmarks.length}</span>
          <ChevronRight size={16} className="chev" />
        </button>
        <button type="button" className="hfeed-links__row" onClick={() => navigate('/jobs')}>
          <span className="lb">최근 본 공고</span>
          <span className="ct tnum">{recentViews.length}</span>
          <ChevronRight size={16} className="chev" />
        </button>
      </nav>

      <HomeMarketPulse pool={pool} />
    </>
  )
}
