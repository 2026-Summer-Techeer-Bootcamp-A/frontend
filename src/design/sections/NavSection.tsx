import { Search, Home, Heart, User, Bell, User2, ChevronRight, Shield, CreditCard, Globe, Copy, Trash2, Save, Edit3 } from 'lucide-react'

export default function NavSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>내비게이션</h2>
              <span className="ds-sub">드롭다운 · 그룹 리스트 · 독바 · 바텀시트 · 하단 탭바</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">컨텍스트 메뉴 (세그먼트 헤더 · 단축키 · Like Apple 흡수)</div>
                <div className="ds-demo-stage">
                  <div className="ds-menu" style={{ width: 236 }}>
                    <div className="ds-menu__seg">
                      <button><Save size={13} /> 저장</button>
                      <button><Edit3 size={13} /> 수정</button>
                      <button className="destructive"><Trash2 size={13} /> 삭제</button>
                    </div>
                    <div className="item"><Copy size={15} /> 복사하기 <span className="kbd">⌘C</span></div>
                    <div className="item disabled"><Edit3 size={15} /> 수정하기</div>
                    <div className="item destructive">
                      <Trash2 size={15} /> 삭제하기<span className="sub">되돌릴 수 없어요</span>
                    </div>
                    <div className="sep" />
                    <div className="section-title">더보기</div>
                    <div className="item"><Bell size={15} /> 알림 켜기 <ChevronRight size={15} className="chev" /></div>
                    <div className="item"><User2 size={15} /> 프로필 <ChevronRight size={15} className="chev" /></div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">그룹 리스트 (동심원 코너 실적용: 16 → 8)</div>
                <div className="ds-demo-stage" style={{ alignItems: 'stretch' }}>
                  <div className="grouped-list">
                    <div className="row">
                      <span className="icon" style={{ background: '#0b0b0c' }}><Bell size={15} /></span>
                      <span className="label">알림</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                    <div className="row">
                      <span className="icon" style={{ background: '#5f7a2e' }}><Shield size={15} /></span>
                      <span className="label">개인정보</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                    <div className="row">
                      <span className="icon" style={{ background: '#ac5623' }}><CreditCard size={15} /></span>
                      <span className="label">결제 수단</span>
                      <span className="value">2개</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                    <div className="row">
                      <span className="icon" style={{ background: '#5b5e66' }}><Globe size={15} /></span>
                      <span className="label">언어</span>
                      <span className="value">한국어</span>
                      <ChevronRight size={16} className="chev" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">플로팅 독바</div>
                <div className="ds-demo-stage">
                  <div className="dock-bar">
                    <span className="it on"><Home size={19} /></span>
                    <span className="it"><Search size={19} /></span>
                    <span className="it"><Heart size={19} /></span>
                    <span className="it"><User size={19} /></span>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">바텀시트</div>
                <div className="ds-demo-stage" style={{ alignItems: 'flex-end' }}>
                  <div className="ds-sheet-mini">
                    <div className="grip" />
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>정렬 · 필터</div>
                    <div className="ds-check ds-radio" style={{ marginBottom: 8 }}><span className="dot" /> 최적순</div>
                    <div className="ds-check ds-radio off"><span className="dot" /> 최신순</div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">하단 탭바</div>
                <div className="ds-demo-stage">
                  <div className="ds-bottomnav">
                    <span className="it on"><Home size={19} /></span>
                    <span className="it"><Search size={19} /></span>
                    <span className="it"><Heart size={19} /></span>
                    <span className="it"><User size={19} /></span>
                  </div>
                </div>
              </div>
            </div>
    </section>
  )
}
