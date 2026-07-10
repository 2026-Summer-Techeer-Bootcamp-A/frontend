import { useState } from 'react'
import './motion/_kit.css'
import GroupA from './motion/GroupA'
import GroupB from './motion/GroupB'
import GroupC from './motion/GroupC'
import GroupD from './motion/GroupD'
import GroupE from './motion/GroupE'
import GroupF from './motion/GroupF'
import GroupG from './motion/GroupG'
import GroupH from './motion/GroupH'
import GroupI from './motion/GroupI'
import GroupJ from './motion/GroupJ'

/* 애플 모션 레퍼런스 (iOS 26 / macOS 26 Tahoe · Liquid Glass).
   조사 카탈로그(apple-motion-catalog.md)의 54개 효과를 A~J 그룹으로 나눠 웹(CSS 스프링 + FLIP + SVG goo)으로 재현.
   각 그룹은 motion/Group*.tsx 로 분리 — 한 파일 비대화를 막고 데모별 CSS를 국소화한다.
   정직성: 티어 배지(T1 재현 가능 / T2 시그니처 / 근사=웹 한계)로 구현 충실도를 명시. */

const GROUPS = [
  { id: 'am-a', key: 'A', label: '다이나믹 아일랜드', n: 6 },
  { id: 'am-b', key: 'B', label: 'Liquid Glass 코어', n: 11 },
  { id: 'am-c', key: 'C', label: '탭 바', n: 4 },
  { id: 'am-d', key: 'D', label: '시트 / 모달', n: 3 },
  { id: 'am-e', key: 'E', label: '내비게이션', n: 3 },
  { id: 'am-f', key: 'F', label: '앱 아이콘', n: 4 },
  { id: 'am-g', key: 'G', label: 'SF Symbols 7', n: 8 },
  { id: 'am-h', key: 'H', label: '컨트롤 & 피드백', n: 7 },
  { id: 'am-i', key: 'I', label: '시스템 표면', n: 4 },
  { id: 'am-j', key: 'J', label: 'macOS Tahoe', n: 4 },
]

export default function AppleMotion() {
  const [active, setActive] = useState('am-a')
  const jump = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div className="ds-sec ds-page am">
      <div className="ds-sec__head">
        <h2>
          애니메이션 · 모션 <span className="am-badge">iOS 26 · macOS Tahoe · Liquid Glass</span>
        </h2>
        <p className="ds-sub">
          Apple의 2026 모션(iOS 26 / macOS 26 Tahoe)을 웹으로 재현한 레퍼런스 — 조사한 54개 효과 전체를 A~J 그룹으로 담았어요.
          배지는 구현 충실도예요: <b>T1</b> 고충실 재현, <b>T2</b> 시그니처 룩, <b>근사</b>는 진짜 렌징·틴트·패스모프처럼 웹 한계로 근사한 것.
          모든 데모는 <code>prefers-reduced-motion</code>을 존중해요.
        </p>
      </div>

      <nav className="am-nav" aria-label="모션 그룹">
        {GROUPS.map((g) => (
          <button key={g.id} className={`am-nav__pill${active === g.id ? ' on' : ''}`} onClick={() => jump(g.id)}>
            <span className="am-nav__k">{g.key}</span>
            {g.label}
            <span className="am-nav__n">{g.n}</span>
          </button>
        ))}
      </nav>

      <GroupA />
      <GroupB />
      <GroupC />
      <GroupD />
      <GroupE />
      <GroupF />
      <GroupG />
      <GroupH />
      <GroupI />
      <GroupJ />
    </div>
  )
}
