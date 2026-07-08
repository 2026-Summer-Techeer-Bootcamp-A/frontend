import { Link } from 'react-router-dom'
import {
  Home, Search, User, Settings, Bell, Heart, Calendar, Mail, Trash2, Pencil,
  Check, X, ChevronRight, Upload, Star, Filter,
} from 'lucide-react'
import {
  HiOutlineHome, HiOutlineMagnifyingGlass, HiOutlineUser, HiOutlineCog6Tooth,
  HiOutlineBell, HiOutlineHeart, HiOutlineCalendar, HiOutlineEnvelope,
  HiOutlineTrash, HiOutlinePencil, HiOutlineCheck, HiOutlineXMark,
  HiOutlineChevronRight, HiOutlineArrowUpTray, HiOutlineStar, HiOutlineFunnel,
} from 'react-icons/hi2'
import {
  PiHouse, PiMagnifyingGlass, PiUser, PiGear, PiBell, PiHeart, PiCalendar,
  PiEnvelope, PiTrash, PiPencilSimple, PiCheck, PiX, PiCaretRight,
  PiUploadSimple, PiStar, PiFunnel,
} from 'react-icons/pi'
import {
  TbHome, TbSearch, TbUser, TbSettings, TbBell, TbHeart, TbCalendar, TbMail,
  TbTrash, TbPencil, TbCheck, TbX, TbChevronRight, TbUpload, TbStar, TbFilter,
} from 'react-icons/tb'
import './design-system.css'

const ROWS = [
  { label: 'Home', lucide: Home, hi: HiOutlineHome, pi: PiHouse, tb: TbHome },
  { label: 'Search', lucide: Search, hi: HiOutlineMagnifyingGlass, pi: PiMagnifyingGlass, tb: TbSearch },
  { label: 'User', lucide: User, hi: HiOutlineUser, pi: PiUser, tb: TbUser },
  { label: 'Settings', lucide: Settings, hi: HiOutlineCog6Tooth, pi: PiGear, tb: TbSettings },
  { label: 'Bell', lucide: Bell, hi: HiOutlineBell, pi: PiBell, tb: TbBell },
  { label: 'Heart', lucide: Heart, hi: HiOutlineHeart, pi: PiHeart, tb: TbHeart },
  { label: 'Calendar', lucide: Calendar, hi: HiOutlineCalendar, pi: PiCalendar, tb: TbCalendar },
  { label: 'Mail', lucide: Mail, hi: HiOutlineEnvelope, pi: PiEnvelope, tb: TbMail },
  { label: 'Trash', lucide: Trash2, hi: HiOutlineTrash, pi: PiTrash, tb: TbTrash },
  { label: 'Edit', lucide: Pencil, hi: HiOutlinePencil, pi: PiPencilSimple, tb: TbPencil },
  { label: 'Check', lucide: Check, hi: HiOutlineCheck, pi: PiCheck, tb: TbCheck },
  { label: 'Close', lucide: X, hi: HiOutlineXMark, pi: PiX, tb: TbX },
  { label: 'Chevron', lucide: ChevronRight, hi: HiOutlineChevronRight, pi: PiCaretRight, tb: TbChevronRight },
  { label: 'Upload', lucide: Upload, hi: HiOutlineArrowUpTray, pi: PiUploadSimple, tb: TbUpload },
  { label: 'Star', lucide: Star, hi: HiOutlineStar, pi: PiStar, tb: TbStar },
  { label: 'Filter', lucide: Filter, hi: HiOutlineFunnel, pi: PiFunnel, tb: TbFilter },
]

const FAMILIES = [
  { key: 'lucide', name: 'Lucide', desc: 'shadcn/ui, Vercel 생태계 기본값 — 이미 우리 앱 전체에 사용 중', weight: '2px' },
  { key: 'hi', name: 'Heroicons', desc: 'Tailwind Labs — GitHub·Linear류 SaaS에서 흔히 채택, 살짝 더 각짐', weight: '1.5px' },
  { key: 'pi', name: 'Phosphor', desc: '두께 6단계(Thin~Fill) 지원 — 브랜드 톤에 맞춰 굵기 조절 가능', weight: '가변' },
  { key: 'tb', name: 'Tabler', desc: '4,000+ 아이콘, 어드민·대시보드 제품에서 인기 — 기하학적 라인', weight: '2px' },
] as const

export default function IconSets() {
  return (
    <div className="ds">
      <div className="ds__shell">
        <aside className="ds__side">
          <div className="ds__brand"><span className="dot" /> Career DS</div>
          <Link to="/design-system" className="ds__back">← 디자인 시스템으로</Link>
        </aside>

        <main className="ds__main">
          <div className="ds__hero">
            <span className="ds__eyebrow">Career · Design System</span>
            <h1>아이콘 세트</h1>
            <p>
              실무 제품에서 실제로 쓰이는 4개 세트를 나란히 비교해요. <b>AI 티를 줄이는 핵심은 세트 선택이 아니라
              일관성</b>이에요 — 한 세트만 골라 앱 전체에 통일하고, 이모지나 다른 세트와 섞지 않는 것.
              Lucide도 요즘 AI 코딩 툴의 기본값이 되어 흔해졌지만, 의도적으로 일관되게 쓰면 문제 없어요.
            </p>
          </div>

          <section className="ds-sec">
            <div className="ds-sec__head"><h2>세트 개요</h2></div>
            <div className="ds-grid ds-grid--2">
              {FAMILIES.map((f) => (
                <div className="ds-card" key={f.key}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{f.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{f.desc}</div>
                  <div className="badge badge--info" style={{ marginTop: 8 }}>기본 획 두께 {f.weight}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="ds-sec">
            <div className="ds-sec__head">
              <h2>1:1 비교 카탈로그</h2>
              <span className="ds-sub">같은 의미의 아이콘 16개 × 4세트 — 획 두께·형태 차이를 확인하세요</span>
            </div>
            <div className="ds-card" style={{ overflowX: 'auto' }}>
              <table className="ds-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>의미</th>
                    {FAMILIES.map((f) => <th key={f.key} style={{ textAlign: 'center' }}>{f.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.label}>
                      <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{r.label}</td>
                      <td style={{ textAlign: 'center' }}><r.lucide size={20} color="var(--ink)" /></td>
                      <td style={{ textAlign: 'center' }}><r.hi size={20} color="var(--ink)" /></td>
                      <td style={{ textAlign: 'center' }}><r.pi size={20} color="var(--ink)" /></td>
                      <td style={{ textAlign: 'center' }}><r.tb size={20} color="var(--ink)" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ds-sec">
            <div className="ds-sec__head"><h2>선택 기준</h2></div>
            <div className="ds-card">
              <ul className="motion-rules">
                <li>한 세트만 쓴다 — Lucide 아이콘 사이에 Font Awesome이나 이모지를 섞으면 즉시 "짜깁기" 티가 난다.</li>
                <li>획 두께를 타이포그래피 굵기와 맞춘다 — 본문이 Regular(400)면 아이콘도 얇은 획, Bold 위주 UI면 굵은 획.</li>
                <li>채움(filled) 아이콘은 활성 상태 표시에만 — 기본은 선(outline), 선택된 탭·좋아요 완료 등 상태 변화에만 채움을 쓴다.</li>
                <li>장식용으로 쓰지 않는다 — 아이콘은 항상 기능(내비게이션, 액션, 상태)에 붙어야 하고, 제목 옆 장식으로 쓰지 않는다.</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
