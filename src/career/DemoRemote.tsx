import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, X, List } from 'lucide-react'

// 데모용 페이지 이동 목록 — label + 실제 라우터 경로(path).
const ROUTES = [
  { to: '/', label: '홈 · 대시보드', path: '/' },
  { to: '/jobs', label: '맞춤 공고', path: '/jobs' },
  { to: '/market', label: '채용 시장', path: '/market' },
  { to: '/map', label: '지도', path: '/map' },
  { to: '/resume', label: '마이', path: '/resume' },
  { to: '/job/0', label: '공고 상세', path: '/job/:id' },
  { to: '/tech/TypeScript', label: '기술 세부', path: '/tech/:name' },
  { to: '/cert-gap', label: '자격증 갭', path: '/cert-gap' },
  { to: '/resume/submit', label: '이력서 제출', path: '/resume/submit' },
  { to: '/splash', label: '스플래시', path: '/splash' },
  { to: '/login', label: '로그인', path: '/login' },
  { to: '/signup', label: '회원가입', path: '/signup' },
  { to: '/settings', label: '설정', path: '/settings' },
  { to: '/settings/account', label: '계정 관리', path: '/settings/account' },
  { to: '/settings/notifications', label: '알림 설정', path: '/settings/notifications' },
  { to: '/settings/about', label: '앱 정보', path: '/settings/about' },
  { to: '/states', label: '시스템 상태', path: '/states' },
  { to: '/design-system', label: '디자인 시스템', path: '/design-system' },
]

/** 데모용 페이지 이동 리모컨 (뷰포트 우하단 고정). 각 항목에 라우터 경로 뱃지 + 갤러리 이동. */
export default function DemoRemote() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const go = (to: string) => { navigate(to); setOpen(false) }
  return (
    <div className="demo-remote">
      <button className="demo-remote__btn" onClick={() => setOpen((o) => !o)}>
        {open ? <X size={15} /> : <LayoutGrid size={15} />}
        데모 페이지 · 이동
      </button>
      {open && (
        <>
          <div className="demo-remote__ov" onClick={() => setOpen(false)} />
          <div className="demo-remote__menu">
            <div className="demo-remote__scroll">
              {ROUTES.map((r) => (
                <button key={r.to} className="demo-remote__item" onClick={() => go(r.to)}>
                  <span className="demo-remote__label">{r.label}</span>
                  <code className="demo-remote__path">{r.path}</code>
                </button>
              ))}
            </div>
            <button className="demo-remote__gallery" onClick={() => go('/gallery')}>
              <List size={15} /> 전체 화면 리스트 (갤러리)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
