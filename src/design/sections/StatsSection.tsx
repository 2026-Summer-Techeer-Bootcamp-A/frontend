import { TrendingUp } from 'lucide-react'
import { Sparkline, LineChart, Donut, Gauge } from '../dsPrimitives'

export default function StatsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>통계·차트</h2>
              <span className="ds-sub">KPI · 추이 · 랭킹 · 도넛 · 게이지 · 히트맵 · 펀넬 — 값의 크기는 색의 진하기로</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">KPI 스탯 타일</div>
                <div className="sx-kpi">
                  <div className="l">이번 달 신규 공고</div>
                  <div className="n">2,486 <span className="sx-delta up"><TrendingUp size={12} /> 12%</span></div>
                  <div style={{ marginTop: 8 }}><Sparkline /></div>
                  <div className="c">최근 30일 · 2026-07-07 기준</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">추이 라인·에어리어</div>
                <LineChart series={[{ color: '#2f61b8', pts: [12, 18, 15, 24, 22, 31, 28, 37] }]} />
                <div className="sx-legend"><span><i style={{ background: '#2f61b8' }} />주간 신규 공고</span></div>
              </div>

              <div className="ds-card">
                <div className="demo-label">멀티 라인 (내 위치 vs 시장)</div>
                <LineChart series={[
                  { color: '#2f61b8', pts: [40, 44, 43, 52, 58, 61, 66, 73] },
                  { color: '#a2a6b0', pts: [50, 51, 52, 53, 55, 56, 57, 58] },
                ]} />
                <div className="sx-legend">
                  <span><i style={{ background: '#2f61b8' }} />내 커버리지</span>
                  <span><i style={{ background: '#a2a6b0' }} />지원자 평균</span>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">세로 막대 (요일별 공고)</div>
                <div className="sx-bars">
                  {[['월', 62, '#5a86cf'], ['화', 88, '#2f61b8'], ['수', 74, '#2f61b8'], ['목', 95, '#21447c'], ['금', 58, '#5a86cf'], ['토', 22, '#cdd2db'], ['일', 15, '#e2e5ec']].map(([d, h, c]) => (
                    <div className="col" key={d as string}>
                      <span className="val">{h as number}</span>
                      <div className="bar" style={{ height: `${h as number}%`, background: c as string }} />
                      <span className="cap">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">수평 랭킹 바 (기술 수요)</div>
                {[['React', 88, '482', '#21447c'], ['TypeScript', 72, '394', '#2f61b8'], ['Python', 61, '331', '#2f61b8'], ['AWS', 44, '241', '#5a86cf'], ['Go', 28, '152', '#8fb0e2']].map(([k, w, v, c]) => (
                  <div className="sx-hbar" key={k as string}>
                    <span className="k">{k}</span>
                    <div className="track"><i style={{ width: `${w}%`, background: c as string }} /></div>
                    <span className="v">{v}</span>
                  </div>
                ))}
              </div>

              <div className="ds-card">
                <div className="demo-label">도넛 (고용 형태 비중)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column' }}>
                  <Donut segs={[{ v: 58, c: '#21447c' }, { v: 26, c: '#2f61b8' }, { v: 16, c: '#8fb0e2' }]} mid="58%" sub="정규직" />
                  <div className="sx-legend" style={{ justifyContent: 'center' }}>
                    <span><i style={{ background: '#21447c' }} />정규직</span>
                    <span><i style={{ background: '#2f61b8' }} />계약직</span>
                    <span><i style={{ background: '#8fb0e2' }} />인턴</span>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">반원 게이지</div>
                <div className="ds-demo-stage"><Gauge pct={73} label="요구스택 커버리지" /></div>
              </div>

              <div className="ds-card">
                <div className="demo-label">스택 바 (보유 vs 갭)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="sx-stack">
                    <i style={{ width: '65%', background: 'var(--accent)' }}>13 보유</i>
                    <i style={{ width: '35%', background: '#c8382d' }}>7 갭</i>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">비교 바 (내 값 vs 평균)</div>
                <div className="sx-compare">
                  <div className="row me"><span className="k">나</span><div className="track"><i style={{ width: '73%' }} /></div><span className="v">73%</span></div>
                  <div className="row avg"><span className="k">평균</span><div className="track"><i style={{ width: '58%' }} /></div><span className="v">58%</span></div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">히트맵 (요일 × 시간대 지원)</div>
                <div className="sx-heat">
                  {[['오전', [10, 30, 55, 80, 60, 20, 8]], ['오후', [40, 70, 90, 100, 85, 35, 12]], ['저녁', [60, 50, 45, 40, 30, 55, 40]]].map(([lab, vals]) => (
                    <div className="hrow" key={lab as string}>
                      <span className="hlabel">{lab}</span>
                      {(vals as number[]).map((v, i) => (
                        <div className="cell" key={i} style={{ background: `rgba(47,97,184,${0.08 + (v / 100) * 0.82})` }} />
                      ))}
                    </div>
                  ))}
                  <div className="cols">{['월', '화', '수', '목', '금', '토', '일'].map((d) => <span key={d}>{d}</span>)}</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">펀넬 (지원 → 합격)</div>
                <div className="sx-funnel">
                  {[['지원', '1,204', 100, '#21447c'], ['서류 통과', '486', 78, '#2f61b8'], ['면접', '152', 54, '#5a86cf'], ['합격', '38', 32, '#8fb0e2']].map(([s, v, w, c]) => (
                    <div className="step" key={s as string} style={{ width: `${w}%`, background: c as string }}>
                      <span>{s}</span><span className="v">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">기간 세그먼트 + 데이터 테이블</div>
                <div className="ds-seg" style={{ marginBottom: 14 }}>
                  <button>7일</button><button className="on">30일</button><button>전체</button>
                </div>
                <table className="ds-table">
                  <thead><tr><th>기술</th><th className="num">공고</th><th className="num">추이</th></tr></thead>
                  <tbody>
                    <tr><td>React</td><td className="num">482</td><td className="num" style={{ color: '#1c7a4d', fontWeight: 700 }}>+8%</td></tr>
                    <tr><td>TypeScript</td><td className="num">394</td><td className="num" style={{ color: '#1c7a4d', fontWeight: 700 }}>+5%</td></tr>
                    <tr><td>jQuery</td><td className="num">57</td><td className="num" style={{ color: '#b5342a', fontWeight: 700 }}>-12%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
    </section>
  )
}
