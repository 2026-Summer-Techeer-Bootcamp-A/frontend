import { Bell, X, Clock } from 'lucide-react'

export default function ChipsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>칩 · 배지</h2>
              <span className="ds-sub">캡슐=인터랙티브 전용(필터·토큰·카운터), 사각=밀집 라벨(스킬·상태)</span>
            </div>
            <div className="ds-grid ds-grid--2">
              <div className="ds-card">
                <div className="demo-label">필터 칩 (캡슐 · 탭 가능)</div>
                <div className="demo">
                  <span className="filter-chip on">전체</span>
                  <span className="filter-chip">국내</span>
                  <span className="filter-chip">해외</span>
                  <span className="filter-chip">신입</span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>토큰 칩 (제거 가능)</div>
                <div className="demo">
                  <span className="token-chip">React <span className="x"><X size={11} /></span></span>
                  <span className="token-chip">서울 <span className="x"><X size={11} /></span></span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>카운터 배지 (원형 · 알림 전용)</div>
                <div className="demo">
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <button className="btn btn--ghost btn--icon"><Bell size={18} /></button>
                    <span className="counter-badge" style={{ position: 'absolute', top: -4, right: -4 }}>3</span>
                  </span>
                  <span className="counter-badge">12</span>
                  <span className="counter-badge neutral">99+</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">스킬 칩 (사각 · 밀집 라벨)</div>
                <div className="demo">
                  <span className="chip chip--held">React</span>
                  <span className="chip chip--held">TypeScript</span>
                  <span className="chip chip--gap">Kubernetes</span>
                  <span className="chip chip--neutral">Full Time</span>
                  <span className="chip chip--outline">Remote</span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>상태 배지 (사각)</div>
                <div className="demo">
                  <span className="badge badge--success">모집중 394</span>
                  <span className="badge badge--warn">곧 마감 69</span>
                  <span className="badge badge--career">경력 4~10년</span>
                  <span className="badge badge--info">신규</span>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>계층형 아이콘 배지 (SF Symbols hierarchical)</div>
                <div className="demo">
                  <span className="hier-badge"><Clock size={13} /> ~7/31 마감 D-24</span>
                </div>
              </div>
            </div>
    </section>
  )
}
