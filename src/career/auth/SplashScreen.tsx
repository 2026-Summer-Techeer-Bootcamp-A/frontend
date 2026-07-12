import { useEffect } from 'react'
import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AuthShell, { BRAND_NAME } from './AuthShell'
import { getAuthUser } from '../authStore'

/** 앱 진입 스플래시. 로고를 잠깐 보여주고 로그인(또는 홈)으로 넘어간다. */
export default function SplashScreen() {
  const navigate = useNavigate()
  useEffect(() => {
    const id = setTimeout(() => {
      navigate(getAuthUser() ? '/' : '/login', { replace: true })
    }, 1600)
    return () => clearTimeout(id)
  }, [navigate])

  return (
    <AuthShell>
      <div className="ss-splash">
        <span className="ss-splash__mark"><Compass size={44} strokeWidth={2.2} /></span>
        <div className="ss-splash__name">{BRAND_NAME}</div>
        <div className="ss-splash__tag">내 기술로 채용 시장을 읽다</div>
        <div className="ss-splash__dots"><i /><i /><i /></div>
      </div>
    </AuthShell>
  )
}
