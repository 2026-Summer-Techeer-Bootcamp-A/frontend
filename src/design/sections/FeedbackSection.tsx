import { Check, Inbox, Info, AlertTriangle, CheckCircle2, Trash2, Save } from 'lucide-react'

export default function FeedbackSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>피드백 · 상태</h2>
              <span className="ds-sub">토스트 · 얼럿 · 배너 · 스켈레톤 · 빈 상태</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">토스트</div>
                <div className="ds-demo-stage">
                  <div className="ds-toast">
                    <span className="ic"><Check size={14} /></span>
                    지원서가 저장됐어요
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">얼럿</div>
                <div className="ds-demo-stage">
                  <div className="app-alert">
                    <div className="app-alert__icon"><AlertTriangle size={18} /></div>
                    <div className="app-alert__title">지원을 취소할까요?</div>
                    <div className="app-alert__msg">저장된 초안은 유지돼요.</div>
                    <div className="app-alert__actions">
                      <button className="btn btn--gray">취소</button>
                      <button className="btn btn--primary">확인</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">인라인 배너</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div className="ios-banner info"><Info size={15} /> 이력서를 등록하면 매칭도가 더 정확해져요.</div>
                  <div className="ios-banner warn"><AlertTriangle size={15} /> 69건이 일주일 내 마감돼요.</div>
                  <div className="ios-banner success"><CheckCircle2 size={15} /> 지원 완료</div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">스켈레톤 로딩</div>
                <div className="ds-demo-stage" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                    <div className="ds-skel" style={{ width: 44, height: 44, borderRadius: 12 }} />
                    <div style={{ flex: 1 }}>
                      <div className="ds-skel" style={{ height: 14, width: '70%', marginBottom: 8 }} />
                      <div className="ds-skel" style={{ height: 12, width: '45%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">빈 상태</div>
                <div className="ds-demo-stage">
                  <div className="ds-empty">
                    <div className="glyph"><Inbox size={24} /></div>
                    <h4>조건에 맞는 공고가 없어요</h4>
                    <p>필터를 조정해보세요</p>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">모달 (얼럿 폼 · 위험 색상으로 구분)</div>
                <div className="ds-demo-stage">
                  <div className="app-alert app-alert--danger">
                    <div className="app-alert__icon"><Trash2 size={18} /></div>
                    <div className="app-alert__title">이력서를 삭제할까요?</div>
                    <div className="app-alert__msg">삭제하면 되돌릴 수 없어요. 저장된 지원 내역도 함께 사라져요.</div>
                    <div className="app-alert__actions">
                      <button className="btn btn--gray">취소</button>
                      <button className="btn btn--danger">삭제</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">토스트 스택</div>
                <div className="ds-demo-stage">
                  <div className="ds-toast-stack">
                    <div className="ds-toast"><span className="ic"><Check size={14} /></span>지원서가 저장됐어요</div>
                    <div className="ds-toast"><span className="ic"><Save size={14} /></span>초안이 자동저장됐어요</div>
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">프로그레스바 (확정 · 불확정)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', gap: 14 }}>
                  <div className="ds-progress"><i style={{ width: '68%' }} /></div>
                  <div className="ds-progress-indet" />
                </div>
              </div>
            </div>
    </section>
  )
}
