import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, X } from 'lucide-react'

const ROUTES = [
  { to: '/', label: '홈' },
  { to: '/?empty=1', label: '홈 (이력서 없음)' },
  { to: '/market', label: '시장' },
  { to: '/map', label: '지도' },
  { to: '/resume', label: '마이' },
  { to: '/jobs', label: '채용 공고' },
  { to: '/resume/submit', label: '이력서 제출' },
  { to: '/job/0', label: '공고 상세' },
  { to: '/tech/TypeScript', label: '기술 세부' },
  { to: '/cert-gap', label: '자격증 갭' },
  { to: '/design-system', label: '디자인 시스템' },
]

/** 데모용 페이지 이동 리모컨 (폰 프레임 밖 · 뷰포트 우상단 고정). */
export default function DemoRemote() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
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
            {ROUTES.map((r) => (
              <button key={r.to} onClick={() => { navigate(r.to); setOpen(false) }}>{r.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
