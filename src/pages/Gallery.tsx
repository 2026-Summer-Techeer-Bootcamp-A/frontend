import { useState } from 'react'
import { Link } from 'react-router-dom'

type Item = { to: string; title: string; sub: string; swatch: string; path?: string }

/* ── 1. 프론트엔드 화면들 (실제 제품 화면 — 라우터 경로 표기) ── */
const frontendScreens: Item[] = [
  // 앱 탭
  { to: '/', path: '/', title: '홈 · 대시보드', sub: '점수화 요약 · What-if · 주간 펄스 (모바일) / 멀티컬럼 대시보드 (PC)', swatch: 'linear-gradient(135deg,#21447c,#0b0b0c)' },
  { to: '/market', path: '/market', title: '채용 시장', sub: '기회 사분면 · 수요 · co-occurrence · 추이 · 산업', swatch: 'linear-gradient(135deg,#0b0b0c,#4a7bd0)' },
  { to: '/map', path: '/map', title: '지도', sub: 'Leaflet 국내 마커 · 클러스터 · 위치 권한 시트', swatch: 'linear-gradient(135deg,#0b0b0c,#218a58)' },
  { to: '/resume', path: '/resume', title: '마이', sub: '이력서 · 내 기술 · 로그인 상태 · 설정 진입', swatch: 'linear-gradient(135deg,#0b0b0c,#8fb0e2)' },
  { to: '/jobs', path: '/jobs', title: '채용 공고', sub: '검색 · 풀 · 정렬 · 빈 상태(EmptyState)', swatch: 'linear-gradient(135deg,#4a7bd0,#7aa0dc)' },
  // 상세/플로우
  { to: '/job/0', path: '/job/:id', title: '공고 상세', sub: '요구기술 보유/미보유 · 매칭 · 회사', swatch: 'linear-gradient(135deg,#21447c,#5a5c63)' },
  { to: '/tech/TypeScript', path: '/tech/:name', title: '기술 세부', sub: '점유율 · 연차별 · 동반기술 · 과거vs현재', swatch: 'linear-gradient(135deg,#0b0b0c,#7aa0dc)' },
  { to: '/cert-gap', path: '/cert-gap', title: '자격증 갭', sub: '요구 자격증 랭킹 · 내 보유/미보유', swatch: 'linear-gradient(135deg,#b8892b,#d8b25e)' },
  { to: '/resume/submit', path: '/resume/submit', title: '이력서 제출', sub: '폼/PDF · 자동완성 · 매칭 제외 라벨', swatch: 'linear-gradient(135deg,#4a7bd0,#8fb0e2)' },
  // 인증
  { to: '/splash', path: '/splash', title: '스플래시', sub: '로고 인트로 · 로그인 여부 따라 자동 진입', swatch: 'linear-gradient(135deg,#17306a,#0b0b0c)' },
  { to: '/login', path: '/login', title: '로그인', sub: 'PC 풀스크린 분할 · 소셜(준비 중)', swatch: 'linear-gradient(135deg,#0b0b0c,#4a7bd0)' },
  { to: '/signup', path: '/signup', title: '회원가입', sub: '이메일 · 비밀번호 · 닉네임 · 유효성', swatch: 'linear-gradient(135deg,#0b0b0c,#5a86cf)' },
  // 설정
  { to: '/settings', path: '/settings', title: '설정 홈', sub: 'iOS 그룹 리스트 · 계정/정보/로그아웃', swatch: 'linear-gradient(135deg,#21447c,#8fb0e2)' },
  { to: '/settings/account', path: '/settings/account', title: '계정 관리', sub: '닉네임 수정 · 비번변경/탈퇴(준비 중)', swatch: 'linear-gradient(135deg,#0b0b0c,#7aa0dc)' },
  { to: '/settings/notifications', path: '/settings/notifications', title: '알림 설정', sub: 'iOS 토글 4종 · 즉시 저장', swatch: 'linear-gradient(135deg,#0b0b0c,#218a58)' },
  { to: '/settings/terms', path: '/settings/terms', title: '이용약관', sub: '정적 문서', swatch: 'linear-gradient(135deg,#4a7bd0,#8fb0e2)' },
  { to: '/settings/privacy', path: '/settings/privacy', title: '개인정보처리방침', sub: '정적 문서 · 원문 미저장', swatch: 'linear-gradient(135deg,#5a86cf,#8fb0e2)' },
  { to: '/settings/about', path: '/settings/about', title: '앱 정보', sub: '버전 · 라이선스 · 문의', swatch: 'linear-gradient(135deg,#21447c,#5a5c63)' },
  // 상태
  { to: '/states', path: '/states', title: '시스템 상태', sub: 'Empty · Error · Offline · 404 · 위치권한', swatch: 'linear-gradient(135deg,#b8892b,#d8b25e)' },
]

/* ── 2. 레퍼런스 (실제 시안 평면 재현) ── */
const reference: Item[] = [
  { to: '/ref-botrix', title: 'Botrix · AI Command Center', sub: 'SaaS 대시보드 (Zywra 태블릿 시안)', swatch: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
  { to: '/ref-education', title: 'Education Platform', sub: '어학 학습 대시보드 (Nixtio 시안)', swatch: 'linear-gradient(135deg,#8b9cf7,#f6a5b8)' },
  { to: '/ref-mysales', title: 'MySales · CRM', sub: 'CRM 태블릿 대시보드 (Novelino 시안)', swatch: 'linear-gradient(135deg,#7c5cff,#b9a5ff)' },
  { to: '/ref-hom', title: 'HOM · Smart Home (Dark)', sub: '다크 스마트홈 태블릿 (Hyperfantasy 시안)', swatch: 'linear-gradient(135deg,#171a24,#3b4a6b)' },
]

/* ── 3. 위젯 디자인 및 시안들 ── */
const widgetDesigns: Item[] = [
  { to: '/signal', title: '당신의 시장 좌표', sub: '실데이터 기술 지형 · 수요×성장', swatch: 'linear-gradient(135deg,#12141a,#0b0b0c)' },
  { to: '/signal/network', title: '기술 동반 네트워크', sub: '실 cooccurrence · 내 기술 연결', swatch: 'linear-gradient(135deg,#12141a,#5a86cf)' },
  { to: '/signal/trend', title: '기술 흥망성쇠', sub: '2022→2025 순위 역전 · Then vs Now', swatch: 'linear-gradient(135deg,#12141a,#c8506a)' },
  { to: '/signal/competency', title: '회사가 진짜 원하는 사람', sub: '실텍스트 역량·태도·개념 추출', swatch: 'linear-gradient(135deg,#12141a,#5a86cf)' },
  { to: '/signal/feed', title: '내게 맞는 공고 타임라인', sub: '실 publishedAt · 스트리밍 피드', swatch: 'linear-gradient(135deg,#12141a,#0b0b0c)' },
  { to: '/signal/unlock', title: '스킬 하나의 나비효과', sub: '뭘 배우면 +N 공고 지원가능', swatch: 'linear-gradient(135deg,#12141a,#218a58)' },
  { to: '/signal/skilltree', title: '목표 직군 스킬트리', sub: '보유/다음/심화 3티어 해금', swatch: 'linear-gradient(135deg,#12141a,#d9932f)' },
  { to: '/signal/concept', title: '당신의 개념 좌표 (시뮬)', sub: '개념 수요×경험 + DNA 레이더', swatch: 'linear-gradient(135deg,#12141a,#6b5bd6)' },
  { to: '/signal/concept-trend', title: '개념 시대정신 (시뮬)', sub: '2020→2026 개념 흐름 · AI 변곡점', swatch: 'linear-gradient(135deg,#12141a,#6b5bd6)' },
  { to: '/signal/concept-bridge', title: '개념 → 기술 브릿지 (실측)', sub: '개념 카드 + 우선순위 스캐터', swatch: 'linear-gradient(135deg,#12141a,#2a9db0)' },
  { to: '/p1-home', title: 'P1 · Home', sub: "Let's Find Your Dream Job", swatch: 'linear-gradient(135deg,#6a6cf0,#a5a6f6)' },
  { to: '/p2-home', title: 'P2 · Home (3D)', sub: 'Discover New Job Matches', swatch: 'linear-gradient(135deg,#3f73a3,#8fb5d6)' },
  { to: '/p3-home', title: 'P3 · Home', sub: 'Matching Jobs', swatch: 'linear-gradient(135deg,#17181c,#5a5c63)' },
  { to: '/orbit', title: 'Orbit · Dashboard (PC)', sub: 'Discuss New Opportunity', swatch: 'linear-gradient(135deg,#f6907e,#83aed4)' },
  { to: '/design-system', title: 'Design System', sub: '팔레트 · 타이포 · 컴포넌트 카탈로그', swatch: 'linear-gradient(135deg,#0b0b0c,#8fb0e2)' },
  { to: '/widgets', title: 'Data Viz Widgets', sub: '채용시장 시각화 위젯 17종 (ECharts)', swatch: 'linear-gradient(135deg,#21447c,#b8892b)' },
]

/* ── 4. 기타 ── */
const etc: Item[] = [
  { to: '/assistant', path: '/assistant', title: '커리어 어시스턴트 · AI 인사이트 콘솔', sub: 'POST /api/v1/chat 실연동 · 기본/Verbose 과정 보기', swatch: 'linear-gradient(135deg,#12141a,#5a86cf)' },
  { to: '/rag-docs', path: '/rag-docs', title: 'AI 채팅 · RAG 문서', sub: 'RAG 콘솔 · 시나리오 · 문서 뷰어', swatch: 'linear-gradient(135deg,#12141a,#2a9db0)' },
]

const TABS = [
  { key: 'frontend', label: '프론트엔드 화면들', items: frontendScreens, showPath: true },
  { key: 'reference', label: '레퍼런스', items: reference, showPath: false },
  { key: 'widgets', label: '위젯 디자인 및 시안들', items: widgetDesigns, showPath: false },
  { key: 'etc', label: '기타', items: etc, showPath: false },
] as const

export default function Gallery() {
  const [tab, setTab] = useState(0)
  const active = TABS[tab]
  return (
    <div className="gallery">
      <div className="gallery__head">
        <h1>Job App — UI Demo</h1>
        <p>커리어 포지셔닝 대시보드 · 실 데이터(채용공고 124,237건) 기반 데모.</p>
      </div>

      <div className="gallery__tabs" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === i}
            className={`gallery__tab${tab === i ? ' on' : ''}`}
            onClick={() => setTab(i)}
          >
            {t.label}
            <span className="gallery__tab-n">{t.items.length}</span>
          </button>
        ))}
      </div>

      <div className="gallery__list">
        {active.items.map((p) => (
          <Link key={p.title} to={p.to} className="gallery__row">
            <span className="gallery__chip" style={{ background: p.swatch }} />
            <span className="gallery__row-body">
              <h3>{p.title}</h3>
              <span>{p.sub}</span>
            </span>
            {active.showPath && <code className="gallery__path">{p.path ?? p.to}</code>}
          </Link>
        ))}
      </div>
    </div>
  )
}
