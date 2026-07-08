import { useNavigate } from 'react-router-dom'
import { Home, BarChart3, Map, User } from 'lucide-react'

export type CareerTab = 'home' | 'market' | 'map' | 'resume'

const TABS: { key: CareerTab; label: string; icon: typeof Home; to: string }[] = [
  { key: 'home', label: '홈', icon: Home, to: '/' },
  { key: 'market', label: '시장', icon: BarChart3, to: '/market' },
  { key: 'map', label: '지도', icon: Map, to: '/map' },
  { key: 'resume', label: '마이', icon: User, to: '/resume' },
]

/** 커리어 앱 공용 하단 탭바 (4탭). 미선택 = 배경 없이 아이콘만(DS). */
export default function CareerTabBar({ active }: { active: CareerTab }) {
  const navigate = useNavigate()
  return (
    <div className="cr-nav cr-nav--4">
      {TABS.map(({ key, label, icon: Icon, to }) => (
        <button
          key={key}
          type="button"
          className={`cr-nav__item${active === key ? ' on' : ''}`}
          onClick={() => active !== key && navigate(to)}
          aria-label={label}
          aria-current={active === key ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={active === key ? 2.4 : 2} />
        </button>
      ))}
    </div>
  )
}
