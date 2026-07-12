import type { ReactNode } from 'react'
import { Compass } from 'lucide-react'
import { PageTransition } from '../kit'
import { THEME, themeVars } from '../themes'
import { useIsDesktop } from '../../shared/useMediaQuery'
import '../career.css'
import '../screens.css'
import '../smallscreens.css'
import './authDesktop.css'

// 브랜드명은 데모 플레이스홀더. 실제 서비스명이 정해지면 여기만 교체.
export const BRAND_NAME = '커리어'

/** 로고 마크 (accent 라운드 스퀘어 + 컴퍼스). */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span className="ss-brand__mark" style={{ width: size, height: size, borderRadius: size * 0.29 }}>
      <Compass size={Math.round(size * 0.58)} strokeWidth={2.2} />
    </span>
  )
}

const FEATURES = [
  '실 채용데이터 124,237건 기반 포지셔닝 점수',
  '내 기술 커버리지 · 갭 분석 · What-if 시뮬',
  '지역별 채용 지도 · 시장 트렌드',
]

/** 인증 화면 셸 — 폰 프레임 없음. 데스크톱은 macOS 로그인 윈도우 문법(월페이퍼 + 중앙 글래스 카드),
    모바일은 폼 풀블리드. 폼 로직은 children(Login/Signup)이 그대로 갖고 셸은 프레젠테이션만 바꾼다. */
export default function AuthShell({ children }: { children: ReactNode }) {
  const t = THEME
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <div className="dauth" style={themeVars(t)}>
        <div className="dauth__card">
          <div className="dauth__mark" aria-hidden>
            <Compass size={24} strokeWidth={2.2} />
          </div>
          <PageTransition type="fade">{children}</PageTransition>
        </div>
      </div>
    )
  }

  return (
    <div className="ss-authpage" style={themeVars(t)}>
      <aside className="ss-authpage__aside">
        <div className="ss-authpage__brandbox">
          <div className="ss-authpage__brandrow">
            <BrandMark size={40} />
            <span className="ss-authpage__bname">{BRAND_NAME}</span>
          </div>
          <p className="ss-authpage__btag">내 기술로 채용 시장을 읽다</p>
          <ul className="ss-authpage__feats">
            {FEATURES.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </aside>
      <main className="ss-authpage__main">
        <div className="ss-authpage__form">
          <PageTransition type="fade">{children}</PageTransition>
        </div>
      </main>
    </div>
  )
}
