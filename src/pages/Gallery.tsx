import { Link } from 'react-router-dom'

// 커리어 앱 화면 구조 (탭 5 + 하위 4)
const careerScreens = [
  { to: '/', title: '홈 · 메인', sub: '포지셔닝 점수 + What-if 시뮬 + 주간 펄스 (3막)', swatch: 'linear-gradient(135deg,#21447c,#2f61b8)' },
  { to: '/market', title: '시장 · 탐색', sub: '기회 사분면·수요·co-occ·추이·산업 (병합)', swatch: 'linear-gradient(135deg,#2f61b8,#4a7bd0)' },
  { to: '/map', title: '지도 · 국내', sub: 'Leaflet 서울·마커·바텀시트 (풀스크린)', swatch: 'linear-gradient(135deg,#2f61b8,#218a58)' },
  { to: '/resume', title: '마이 · 내 이력서', sub: '이력서 히어로 카드 + 설정 메뉴', swatch: 'linear-gradient(135deg,#2f61b8,#8fb0e2)' },
  { to: '/resume/submit', title: '이력서 제출', sub: '폼/PDF·자동완성·매칭 제외 라벨', swatch: 'linear-gradient(135deg,#4a7bd0,#8fb0e2)' },
  { to: '/job/0', title: '공고 상세', sub: '요구기술 보유/미보유·매칭·회사', swatch: 'linear-gradient(135deg,#21447c,#5a5c63)' },
  { to: '/tech/TypeScript', title: '기술 세부', sub: '점유율·연차별·동반기술·과거vs현재 기업', swatch: 'linear-gradient(135deg,#2f61b8,#7aa0dc)' },
  { to: '/cert-gap', title: '자격증 갭', sub: '요구 자격증 랭킹·내 보유/미보유', swatch: 'linear-gradient(135deg,#b8892b,#d8b25e)' },
]

const pages = [
  { to: '/p1-home', title: 'P1 · Home', sub: "Let's Find Your Dream Job", swatch: 'linear-gradient(135deg,#6a6cf0,#a5a6f6)' },
  { to: '/p1-list', title: 'P1 · Job List', sub: '15 Jobs Available', swatch: 'linear-gradient(135deg,#6a6cf0,#a5a6f6)' },
  { to: '/p1-detail', title: 'P1 · Job Detail', sub: '90% Sentiment Score', swatch: 'linear-gradient(135deg,#6a6cf0,#a5a6f6)' },
  { to: '/p2-home', title: 'P2 · Home (3D)', sub: 'Discover New Job Matches', swatch: 'linear-gradient(135deg,#3f73a3,#8fb5d6)' },
  { to: '/p3-home', title: 'P3 · Home', sub: 'Matching Jobs', swatch: 'linear-gradient(135deg,#17181c,#5a5c63)' },
  { to: '/p3-detail', title: 'P3 · Job Detail', sub: 'Led UX Designer', swatch: 'linear-gradient(135deg,#17181c,#5a5c63)' },
  { to: '/orbit', title: 'Orbit · Dashboard (PC)', sub: 'Discuss New Opportunity', swatch: 'linear-gradient(135deg,#f6907e,#83aed4)' },
  { to: '/', title: 'Career · 홈 (메인)', sub: '커리어 대시보드 (확정)', swatch: 'linear-gradient(135deg,#21447c,#2f61b8)' },
  { to: '/design-system', title: 'Design System', sub: '팔레트·타이포·컴포넌트 카탈로그', swatch: 'linear-gradient(135deg,#2f61b8,#8fb0e2)' },
  { to: '/widgets', title: 'Data Viz Widgets', sub: '채용시장 시각화 위젯 17종 (ECharts)', swatch: 'linear-gradient(135deg,#21447c,#b8892b)' },
]

export default function Gallery() {
  return (
    <div className="gallery">
      <div className="gallery__head">
        <h1>Job App — UI Demo</h1>
        <p>커리어 포지셔닝 대시보드 · 실 데이터(채용공고 124,237건) 기반 데모 화면 9종.</p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '4px 4px 12px', opacity: 0.85 }}>
        화면 구조 · 커리어 앱 (탭 5 + 하위 4)
      </h2>
      <div className="gallery__grid">
        {careerScreens.map((p) => (
          <Link key={p.title} to={p.to} className="gallery__card">
            <div className="gallery__swatch" style={{ background: p.swatch }} />
            <h3>{p.title}</h3>
            <span>{p.sub}</span>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '28px 4px 12px', opacity: 0.85 }}>
        레퍼런스 목업 · 디자인 시스템
      </h2>
      <div className="gallery__grid">
        {pages.map((p) => (
          <Link key={p.to} to={p.to} className="gallery__card">
            <div className="gallery__swatch" style={{ background: p.swatch }} />
            <h3>{p.title}</h3>
            <span>{p.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
