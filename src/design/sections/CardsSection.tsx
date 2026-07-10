import { Search, MapPin, Bell, X, MoreHorizontal, Clock, Shield, Globe } from 'lucide-react'

export default function CardsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>카드 조합</h2>
              <span className="ds-sub">실제 컴포넌트가 모여 이루는 화면 단위</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">아바타 그룹</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', minHeight: 100 }}>
                  <div className="ds-avatar-group">
                    <div className="ds-avatar" style={{ background: 'linear-gradient(135deg,#6d7f95,#455568)' }}>K</div>
                    <div className="ds-avatar" style={{ background: 'linear-gradient(135deg,#c9a58c,#9a745a)' }}>R</div>
                    <div className="ds-avatar" style={{ background: 'linear-gradient(135deg,#8a7461,#5c4a3b)' }}>M</div>
                    <div className="ds-avatar" style={{ background: 'var(--accent-100)', color: 'var(--accent-700)' }}>+5</div>
                  </div>
                  <div className="ds-demo-caption">김·이·박 외 5명이 이 공고에 지원했어요</div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button className="btn btn--ghost btn--icon"><MoreHorizontal size={18} /></button>
                  <button className="btn btn--ghost btn--icon" style={{ marginLeft: 8 }}><X size={18} /></button>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">필터 + 토큰 칩 조합</div>
                <div className="demo" style={{ marginBottom: 14 }}>
                  <span className="filter-chip on">전체</span>
                  <span className="filter-chip">국내</span>
                  <span className="filter-chip">해외</span>
                </div>
                <label className="ds-input" style={{ width: '100%', marginBottom: 10 }}>
                  <Search size={17} /><input placeholder="React, 서울..." />
                </label>
                <div className="demo">
                  <span className="token-chip">React <span className="x"><X size={11} /></span></span>
                  <span className="token-chip">서울 <span className="x"><X size={11} /></span></span>
                </div>
              </div>

              <div className="ds-card">
                <div className="ds-jobcard" style={{ maxWidth: '100%', boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-100)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>엑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>B2B솔루션 WEB/JAVA 개발자</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        엑스소프트 <span className="badge badge--career" style={{ marginLeft: 4 }}>경력 4~10년</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ margin: '12px 0 4px', fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>요구 10개 중 5개 보유</span>
                    <b style={{ color: 'var(--accent)' }}>50% 매칭</b>
                  </div>
                  <div className="ds-bar" style={{ width: '100%' }}><i style={{ width: '50%' }} /></div>
                  <div style={{ marginTop: 10 }}>
                    <span className="chip chip--held">CSS</span>
                    <span className="chip chip--held" style={{ marginLeft: 6 }}>JavaScript</span>
                    <span className="chip chip--gap" style={{ marginLeft: 6 }}>Java</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={14} /> 서울</span>
                    <span className="hier-badge"><Clock size={12} /> ~7/31 D-24</span>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">컴팩트 리스트 로우</div>
                <div className="combo-list-row">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-100)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>세</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>Back-end Engineer</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>세이프에이아이 · 서울</div>
                  </div>
                  <span className="badge badge--success">44%</span>
                </div>
                <div className="combo-list-row">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-100)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>매</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>DevOps Engineer</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>매드업 · 서울</div>
                  </div>
                  <span className="badge badge--career">20%</span>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">회사 프로필 카드</div>
                <div className="combo-company-card">
                  <div className="logo" style={{ background: 'var(--accent-100)', color: 'var(--accent-700)' }}>엑</div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>엑스소프트</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>IT · 컨텐츠 · 2004년 창립</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                    <span className="chip chip--neutral">채용중 3</span>
                    <span className="badge badge--success">모집중</span>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">설정 리스트 (토글 로우)</div>
                <div className="combo-settings-row">
                  <Bell size={17} color="var(--muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>새 공고 알림</span>
                  <span className="ds-switch on" />
                </div>
                <div className="combo-settings-row">
                  <Shield size={17} color="var(--muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>비공개 프로필</span>
                  <span className="ds-switch" />
                </div>
                <div className="combo-settings-row">
                  <Globe size={17} color="var(--muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>해외 공고 포함</span>
                  <span className="ds-switch on" />
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">Hero 위젯 축소판</div>
                <div style={{ background: 'var(--bg)', borderRadius: 18, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ds-ring" style={{ width: 56, height: 56 }}>
                      <b style={{ fontSize: 13 }}>73%</b>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>요구스택 커버리지</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>13/20 기술 보유</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <span className="badge badge--success">모집중 394</span>
                    <span className="badge badge--warn">곧 마감 69</span>
                  </div>
                </div>
              </div>
            </div>
    </section>
  )
}
