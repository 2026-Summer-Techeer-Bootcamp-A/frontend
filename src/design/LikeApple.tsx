import {
  Home, Search, Heart, User, Settings, MessageCircle, Phone, Camera, Bell,
  Mail, Trash2, Share2, Pencil, Star, ChevronRight, Plus,
  Send, Copy, Flag, MoreHorizontal, Image as ImageIcon,
  Wifi, SunMedium, PanelLeft, Play, Folder, FileText, Users, Settings2,
} from 'lucide-react'
import './design-system.css'
import './appleGallery.css'

const NAV = [
  { id: 'controls', label: '버튼 · 컨트롤' },
  { id: 'tabbars', label: '탭바' },
  { id: 'lists', label: '리스트' },
  { id: 'widgets', label: '위젯' },
  { id: 'notifications', label: '알림' },
  { id: 'menus', label: '메뉴' },
  { id: 'sidebars', label: '사이드바' },
  { id: 'alerts', label: '얼럿' },
  { id: 'messages', label: '메시지' },
  { id: 'icons', label: '아이콘' },
]

export default function LikeApple() {
  return (
    <div className="ag">
          <div className="ds__hero">
            <span className="ds__eyebrow">Career · Design System</span>
            <h1>Like Apple</h1>
            <p>
              iOS 26 · iPadOS 26 공식 컴포넌트 레퍼런스를 최대한 그대로 재현했어요.
              <b> Liquid Glass(블러)는 제거</b>하고 솔리드 + 절제된 그림자로 입체감만 남겼어요.
            </p>
          </div>

          <nav className="ds__subtabs">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}>{n.label}</a>
            ))}
          </nav>

          {/* ---------- 버튼 · 컨트롤 ---------- */}
          <section className="ds-sec" id="controls">
            <div className="ds-sec__head"><h2>버튼 · 컨트롤</h2></div>
            <div className="ds-grid ds-grid--3">
              <div className="ag-card">
                <div className="ag-label">Filled · Tinted · Plain (Blue)</div>
                <div className="ag-stage">
                  <button className="ag-btn blue filled"><Play size={13} fill="#fff" /> Play</button>
                  <button className="ag-btn blue tinted"><Play size={13} fill="#007aff" /> Play</button>
                  <button className="ag-btn blue plain"><Play size={13} fill="#007aff" /> Play</button>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Gray · Red 역할</div>
                <div className="ag-stage">
                  <button className="ag-btn gray filled">Label</button>
                  <button className="ag-btn red tinted">Delete</button>
                  <button className="ag-btn red disabled">Delete</button>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Icon-only · Disabled</div>
                <div className="ag-stage">
                  <button className="ag-btn blue filled icon-round"><Plus size={18} /></button>
                  <button className="ag-btn gray tinted icon-round"><Search size={18} /></button>
                  <button className="ag-btn blue disabled">Play</button>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Segmented Control</div>
                <div className="ag-stage">
                  <span className="ag-segment">
                    <button className="on">Day</button>
                    <button>Week</button>
                    <button>Month</button>
                  </span>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Switch · Slider</div>
                <div className="ag-stage">
                  <span className="ag-switch on" />
                  <span className="ag-switch" />
                  <div className="ag-slider">
                    <div className="track"><span className="fill" style={{ width: '55%' }} /><span className="thumb" style={{ left: '55%' }} /></div>
                  </div>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Search Field · Page Control</div>
                <div className="ag-stage">
                  <span className="ag-search"><Search size={16} /> Search</span>
                  <span className="ag-pagectl"><span /><span className="on" /><span /><span /></span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 탭바 (플로팅 캡슐) ---------- */}
          <section className="ds-sec" id="tabbars">
            <div className="ds-sec__head">
              <h2>탭바</h2>
              <span className="ds-sub">iOS 26 신형 — 전체 폭이 아닌 플로팅 캡슐 + 별도 검색 원형 버튼</span>
            </div>
            <div className="ds-grid ds-grid--2">
              <div className="ag-card">
                <div className="ag-label">플로팅 탭바 + 검색 버튼</div>
                <div className="ag-stage">
                  <span className="ag-tabbar-float">
                    <span className="seg on"><Home size={18} /><span>Home</span></span>
                    <span className="seg"><Heart size={18} /><span>Saved</span></span>
                    <span className="seg"><MessageCircle size={18} /><span>Chat</span></span>
                    <span className="seg"><User size={18} /><span>Profile</span></span>
                  </span>
                  <span className="ag-tabbar-search"><Search size={20} /></span>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">iPad 툴바형 (사이드바 토글 + 라벨 + 검색)</div>
                <div className="ag-stage">
                  <div className="ag-toolbar-wide">
                    <span className="icon-btn"><PanelLeft size={18} /></span>
                    <span className="lbl on">공고</span>
                    <span className="lbl">저장</span>
                    <span className="lbl">지원현황</span>
                    <span className="lbl">알림</span>
                    <span className="icon-btn" style={{ marginLeft: 'auto' }}><Search size={18} /></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 리스트 ---------- */}
          <section className="ds-sec" id="lists">
            <div className="ds-sec__head"><h2>리스트</h2></div>
            <div className="ds-grid ds-grid--2">
              <div className="ag-card">
                <div className="ag-label">Grouped List</div>
                <div className="ag-list">
                  <div className="row"><span className="ic" style={{ background: '#ff9500' }}><Bell size={15} /></span><span className="label">Notifications</span><ChevronRight size={17} className="chev" /></div>
                  <div className="row"><span className="ic" style={{ background: '#007aff' }}><Wifi size={15} /></span><span className="label">Wi-Fi</span><span className="value">Home 5G</span><ChevronRight size={17} className="chev" /></div>
                  <div className="row"><span className="ic" style={{ background: '#34c759' }}><Phone size={15} /></span><span className="label">Phone</span><ChevronRight size={17} className="chev" /></div>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Swipe Actions</div>
                <div className="ag-stage" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="ag-swipe">
                    <span className="content">React Native 채용공고</span>
                    <span className="action" style={{ background: '#ff9500' }}><Star size={16} /></span>
                    <span className="action" style={{ background: '#ff3b30' }}><Trash2 size={16} /></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 위젯 ---------- */}
          <section className="ds-sec" id="widgets">
            <div className="ds-sec__head"><h2>위젯</h2></div>
            <div className="ds-grid ds-grid--3">
              <div className="ag-card">
                <div className="ag-label">Weather Widget</div>
                <div className="ag-stage"><div className="ag-widget weather"><div className="top">Seoul</div><SunMedium size={26} /><div className="big">24°</div></div></div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Calendar Widget</div>
                <div className="ag-stage"><div className="ag-widget calendar"><div className="top" style={{ color: '#ff3b30' }}>JULY</div><div className="big">8</div><div style={{ fontSize: 12, color: 'var(--ios-sub)' }}>Wed · 오늘 면접 2건</div></div></div>
              </div>
              <div className="ag-card">
                <div className="ag-label">아이콘 배지</div>
                <div className="ag-stage">
                  <span className="ag-icon-badge">
                    <span className="ag-widget calendar" style={{ width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Mail size={22} color="#007aff" /></span>
                    <span className="count">7</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 알림 (스택형) ---------- */}
          <section className="ds-sec" id="notifications">
            <div className="ds-sec__head"><h2>알림</h2></div>
            <div className="ds-card">
              <div className="ag-label">Stacked Notifications</div>
              <div className="ag-stage">
                <div className="ag-notif-stack">
                  <div className="card">
                    <span className="ic" style={{ background: '#ff3b30' }}><Mail size={16} /></span>
                    <div className="body"><div className="title">엑스소프트</div><div className="desc">서류 전형 결과를 안내드립니다</div></div>
                    <span className="time">지금</span>
                  </div>
                  <div className="card">
                    <span className="ic" style={{ background: '#007aff' }}><MessageCircle size={16} /></span>
                    <div className="body"><div className="title">세이프에이아이</div><div className="desc">면접 일정 조율 부탁드려요</div></div>
                    <span className="time">3분</span>
                  </div>
                  <div className="card">
                    <span className="ic" style={{ background: '#34c759' }}><Users size={16} /></span>
                    <div className="body"><div className="title">지원 현황</div><div className="desc">69건이 일주일 내 마감돼요</div></div>
                    <span className="time">1시간</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 메뉴 ---------- */}
          <section className="ds-sec" id="menus">
            <div className="ds-sec__head"><h2>메뉴</h2></div>
            <div className="ds-grid ds-grid--2">
              <div className="ag-card">
                <div className="ag-label">Context Menu (세그먼트 헤더 + 단축키)</div>
                <div className="ag-stage">
                  <div className="ag-menu2">
                    <div className="ag-menu2__seg">
                      <button><Star size={14} /> Label</button>
                      <button><Star size={14} /> Label</button>
                      <button className="destructive"><Star size={14} /> Destr.</button>
                    </div>
                    <div className="row"><Copy size={15} /> 복사하기 <span className="kbd">⌘C</span></div>
                    <div className="row disabled"><Pencil size={15} /> 수정하기</div>
                    <div className="row destructive"><Trash2 size={15} /> 삭제하기<span className="sub">되돌릴 수 없어요</span></div>
                    <div className="sep" />
                    <div className="section-title">Section Title</div>
                    <div className="row"><Flag size={15} /> 신고하기 <ChevronRight size={15} className="chev" /></div>
                    <div className="row"><Share2 size={15} /> 공유하기 <ChevronRight size={15} className="chev" /></div>
                  </div>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Edit Menu Bar</div>
                <div className="ag-stage">
                  <div className="ag-editbar">
                    <button>Cut</button><button>Copy</button><button>Paste</button>
                    <button className="destructive">Delete</button><button>Replace…</button>
                    <button><MoreHorizontal size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 사이드바 (iPad) ---------- */}
          <section className="ds-sec" id="sidebars">
            <div className="ds-sec__head"><h2>사이드바</h2></div>
            <div className="ds-card">
              <div className="ag-label">iPad Sidebar</div>
              <div className="ag-stage">
                <div className="ag-sidebar2">
                  <div className="ag-sidebar2__top"><span className="edit">Edit</span><MoreHorizontal size={16} /></div>
                  <div className="ag-sidebar2__search"><Search size={14} /> Search</div>
                  <div className="row on"><Home size={15} /> 전체 공고</div>
                  <div className="row"><Star size={15} /> 저장한 공고</div>
                  <div className="section">채용 풀 <ChevronDownStub /></div>
                  <div className="row nested"><Folder size={13} /> 국내</div>
                  <div className="row nested"><Folder size={13} /> 해외</div>
                  <div className="section">설정</div>
                  <div className="row"><Settings2 size={15} /> 알림 설정</div>
                  <div className="row"><FileText size={15} /> 이력서 관리</div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 얼럿 ---------- */}
          <section className="ds-sec" id="alerts">
            <div className="ds-sec__head"><h2>얼럿</h2></div>
            <div className="ds-grid ds-grid--2">
              <div className="ag-card">
                <div className="ag-label">입력 + 스택 버튼</div>
                <div className="ag-stage">
                  <div className="ag-alert2">
                    <h4>지원 메모 남기기</h4>
                    <p>다음에 이 공고를 다시 볼 때 참고할 메모예요.</p>
                    <div className="field"><span className="fl">메모</span><span className="ph">예: 연봉 협의 필요</span></div>
                    <div className="actions">
                      <button className="primary">저장</button>
                      <button className="secondary">취소</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">2버튼 (취소 / 확인)</div>
                <div className="ag-stage">
                  <div className="ag-alert2" style={{ width: 240 }}>
                    <h4>지원을 취소할까요?</h4>
                    <p>저장된 초안은 유지돼요.</p>
                    <div className="actions row2">
                      <button className="secondary">취소</button>
                      <button className="primary">확인</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- 메시지 ---------- */}
          <section className="ds-sec" id="messages">
            <div className="ds-sec__head"><h2>메시지 (iMessage)</h2></div>
            <div className="ds-grid ds-grid--3">
              <div className="ag-card">
                <div className="ag-label">Bubbles</div>
                <div className="ag-stage">
                  <div className="ag-msgs">
                    <span className="ag-bubble received">서류 합격하셨어요! 🎉</span>
                    <span className="ag-bubble sent">감사합니다, 언제 면접 볼 수 있을까요?</span>
                    <span className="ag-bubble received">다음 주 화요일 오후 2시 어떠세요?</span>
                  </div>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Typing · Tapback</div>
                <div className="ag-stage" style={{ gap: 16 }}>
                  <div className="ag-typing"><span /><span /><span /></div>
                  <span className="ag-tapback"><Heart size={14} fill="#ff3b30" /></span>
                </div>
              </div>
              <div className="ag-card">
                <div className="ag-label">Composer</div>
                <div className="ag-stage"><div className="ag-composer"><span className="field">메시지 보내기</span><span className="send"><Send size={15} /></span></div></div>
              </div>
            </div>
          </section>

          {/* ---------- 아이콘 ---------- */}
          <section className="ds-sec" id="icons">
            <div className="ds-sec__head">
              <h2>아이콘</h2>
              <span className="ds-sub">SF Symbols 렌더링 모드 3종 (같은 심볼, 다른 처리)</span>
            </div>
            <div className="ag-card">
              <div className="ag-sym-row">
                <div className="cell"><ImageIcon size={30} color="#007aff" /><div>Monochrome</div></div>
                <div className="cell"><Camera size={30} color="#007aff" /><div>Hierarchical</div></div>
                <div className="cell"><Pencil size={30} color="#ff9500" /><div>Multicolor</div></div>
                <div className="cell"><MoreHorizontal size={30} color="#1c1c1e" /><div>Weight: Regular</div></div>
                <div className="cell"><Plus size={30} color="#1c1c1e" strokeWidth={3} /><div>Weight: Bold</div></div>
                <div className="cell"><Settings size={30} color="#1c1c1e" /><div>System</div></div>
              </div>
            </div>
          </section>
    </div>
  )
}

function ChevronDownStub() {
  return <span style={{ fontSize: 11 }}>⌄</span>
}
