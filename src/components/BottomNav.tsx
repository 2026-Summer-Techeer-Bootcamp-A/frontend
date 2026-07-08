import { Home, Heart, Settings, User } from 'lucide-react'

interface BottomNavProps {
  active?: 'home' | 'heart' | 'settings' | 'user'
}

export default function BottomNav({ active = 'home' }: BottomNavProps) {
  const items: { key: BottomNavProps['active']; icon: typeof Home }[] = [
    { key: 'home', icon: Home },
    { key: 'heart', icon: Heart },
    { key: 'settings', icon: Settings },
    { key: 'user', icon: User },
  ]
  return (
    <div className="bottomnav">
      {items.map(({ key, icon: Icon }) => (
        <div
          key={key}
          className={`bottomnav__item${active === key ? ' bottomnav__item--active' : ''}`}
        >
          <Icon size={22} strokeWidth={active === key ? 2.4 : 2} />
        </div>
      ))}
    </div>
  )
}
