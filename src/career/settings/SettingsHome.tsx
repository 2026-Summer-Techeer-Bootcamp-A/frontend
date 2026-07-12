import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { User, Bell, FileText, Shield, Info, LogOut } from 'lucide-react'
import { SubScreen } from '../charts'
import { MenuRow, SectionHeader } from '../kit'
import LogoutSheet from '../auth/LogoutSheet'
import { useAuth } from '../authStore'
import { useIsDesktop } from '../../shared/useMediaQuery'
import { APP_VERSION } from './about'
import '../smallscreens.css'

export default function SettingsHome() {
  const navigate = useNavigate()
  const { isAuthed, logout } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const isDesktop = useIsDesktop()

  // 데스크톱은 사이드 패널이 설정 홈 역할을 하므로 목록 페이지가 패널과 중복된다 —
  // 첫 하위 항목으로 리다이렉트한다. 모바일은 패널이 없어 홈 목록이 그대로 필요하다.
  if (isDesktop) return <Navigate to="/settings/account" replace />

  return (
    <SubScreen title="설정">
      <SectionHeader title="계정" />
      <div className="kit-menulist">
        <MenuRow icon={<User size={18} />} tint="#0b0b0c" label="계정 관리" onClick={() => navigate('/settings/account')} />
        <MenuRow icon={<Bell size={18} />} tint="#c76a2e" label="알림 설정" onClick={() => navigate('/settings/notifications')} />
      </div>

      <SectionHeader title="정보" />
      <div className="kit-menulist">
        <MenuRow icon={<FileText size={18} />} tint="#7c7f88" label="이용약관" onClick={() => navigate('/settings/terms')} />
        <MenuRow icon={<Shield size={18} />} tint="#218a58" label="개인정보처리방침" onClick={() => navigate('/settings/privacy')} />
        <MenuRow icon={<Info size={18} />} tint="#5a86cf" label="앱 정보" value={`v${APP_VERSION}`} onClick={() => navigate('/settings/about')} />
      </div>

      {isAuthed && (
        <>
          <div style={{ height: 8 }} />
          <div className="kit-menulist">
            <MenuRow icon={<LogOut size={18} />} label="로그아웃" danger onClick={() => setLogoutOpen(true)} />
          </div>
        </>
      )}
      <div style={{ height: 18 }} />

      <LogoutSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => { logout(); setLogoutOpen(false); navigate('/login') }}
      />
    </SubScreen>
  )
}
