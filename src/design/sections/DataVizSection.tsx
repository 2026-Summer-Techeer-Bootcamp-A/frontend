import { ActivityRings, Sparkline } from '../dsPrimitives'

export default function DataVizSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>데이터 시각화</h2>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">커버리지 링 · 매칭 바</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', minHeight: 'auto' }}>
                  <div className="demo">
                    <div className="ds-ring"><b>73%</b></div>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 7, fontWeight: 600 }}>매칭 50%</div>
                      <div className="ds-bar"><i style={{ width: '50%' }} /></div>
                    </div>
                  </div>
                </div>
                <div className="demo-label">탭</div>
                <div className="demo">
                  <span className="ds-tabs">
                    <span className="on">상세 설명</span>
                    <span>회사</span>
                  </span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">통계 카드</div>
                <div className="demo" style={{ gap: 12 }}>
                  <div className="ds-stat" style={{ flex: 1 }}>
                    <div className="n">394</div>
                    <div className="l">모집중 공고</div>
                    <div className="delta">▲ 12 오늘</div>
                  </div>
                  <div className="ds-stat" style={{ flex: 1 }}>
                    <div className="n">73%</div>
                    <div className="l">커버리지</div>
                  </div>
                </div>
                <div className="demo-label" style={{ marginTop: 20 }}>진행 스텝</div>
                <div className="demo">
                  <div className="ds-stepper">
                    <span className="seg on" /><span className="seg on" /><span className="seg on" /><span className="seg" />
                  </div>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">동심원 활동 링</div>
                <div className="ds-demo-stage" style={{ minHeight: 116 }}>
                  <ActivityRings />
                </div>
                <div className="demo-label">스파크라인</div>
                <div className="sparkline-wrap">
                  <div>
                    <div className="num">2,486</div>
                    <div className="lbl">이번 달 신규 지원자</div>
                  </div>
                  <Sparkline />
                </div>
              </div>
            </div>
    </section>
  )
}
