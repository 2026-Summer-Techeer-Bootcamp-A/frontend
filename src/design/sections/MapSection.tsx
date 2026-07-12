import { Search, MapPin, Info, Minus, Plus, Navigation } from 'lucide-react'
import { AppleSlider } from '../dsPrimitives'

export default function MapSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>지도 <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>국내 전용 · 조연(F16)</span></h2>
              <span className="ds-sub">서울 구 단위 · 클러스터 · 핀↔히트맵 · 응답률(F11) — 좌표는 원티드 직접 + 점핏 지오코딩</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card" style={{ gridColumn: 'span 2' }}>
                <div className="demo-label">지도 + 클러스터 (서울 구 단위)</div>
                <div className="mx-map">
                  <div className="mx-search"><Search size={15} /> 지역·지하철역·회사 검색</div>
                  <div className="mx-controls">
                    <button><Plus size={17} /></button>
                    <button><Minus size={17} /></button>
                  </div>
                  <button className="mx-locate"><Navigation size={17} /></button>
                  <div className="mx-cluster lg" style={{ left: '40%', top: '52%' }}>1,842</div>
                  <div className="mx-namepill" style={{ left: '40%', top: '33%' }}>강남구<b>1,842</b></div>
                  <div className="mx-cluster md" style={{ left: '66%', top: '34%' }}>861</div>
                  <div className="mx-cluster md" style={{ left: '22%', top: '38%' }}>642</div>
                  <div className="mx-cluster sm" style={{ left: '72%', top: '64%' }}>447</div>
                  <div className="mx-cluster sm" style={{ left: '30%', top: '72%' }}>388</div>
                  <div className="mx-me" style={{ left: '52%', top: '58%' }} />
                </div>
                <div className="mx-nlabel" style={{ marginTop: 10 }}><MapPin size={12} /> 국내 풀 · 기준일 2026-07-07 · N=7,104</div>
              </div>

              <div className="ds-card">
                <div className="demo-label">Apple 클러스터 마커</div>
                <div className="ds-demo-stage" style={{ background: '#eef1f6', borderRadius: 14, position: 'relative', minHeight: 150 }}>
                  <div className="mx-cluster lg" style={{ left: '28%', top: '42%' }}>1,842</div>
                  <div className="mx-cluster md" style={{ left: '58%', top: '35%' }}>642</div>
                  <div className="mx-cluster sm" style={{ left: '76%', top: '62%' }}>88</div>
                  <span className="mx-pin accent" style={{ left: '44%', top: '76%' }} />
                  <div className="mx-me" style={{ left: '68%', top: '78%' }} />
                </div>
                <div className="ds-demo-caption">구형 셰이딩·화이트 링·펄스 내위치 점 — 값이 클수록 크고 진하게</div>
              </div>

              <div className="ds-card">
                <div className="demo-label">핀 ↔ 히트맵 토글</div>
                <div className="ds-demo-stage">
                  <div className="ds-seg mx-layers">
                    <button className="on"><MapPin size={13} style={{ marginRight: 4, verticalAlign: -2 }} />핀</button>
                    <button>히트맵</button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">구 단위 히트맵 (posting_count)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                  <div className="mx-choro">
                    {([['강남', 1842, 1], ['구로', 861, 0.55], ['마포', 642, 0.42], ['성동', 588, 0.38], ['영등포', 512, 0.34], ['분당', 447, 0.3], ['종로', 388, 0.26], ['용산', 214, 0.16]] as [string, number, number][]).map(([nm, v, o]) => (
                      <div className="d" key={nm} style={{ background: `rgba(11, 11, 12,${0.1 + o * 0.8})`, color: o > 0.45 ? '#fff' : '#1c1d21' }}>
                        <span className="nm">{nm}</span>
                        <span className="v">{v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mx-legend">
                    <div className="bar" />
                    <div className="ticks"><span>0</span><span>구별 공고 수</span><span>1,842</span></div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">선택 지역 인포 콜아웃</div>
                <div className="ds-demo-stage">
                  <div className="mx-callout">
                    <h5>강남구</h5>
                    <div className="kv"><span>모집중</span><b>1,842건</b></div>
                    <div className="kv"><span>평균 매칭</span><b>61%</b></div>
                    <div className="kv"><span>평균 응답률</span><b>84%</b></div>
                    <div className="kv"><span>곧 마감</span><b>37건</b></div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">선택 지역 공고 시트</div>
                <div className="ds-demo-stage" style={{ alignItems: 'flex-end' }}>
                  <div className="mx-resultsheet">
                    <div className="grip" />
                    <div className="head"><b>강남구 <span className="n">1,842</span>건</b><span className="badge badge--info">매칭순</span></div>
                    <div className="mx-row"><div className="ax-reco" style={{ padding: 0, border: 'none', gap: 8, flex: 1 }}><span style={{ fontWeight: 700 }}>토스 · 백엔드</span></div><span className="mx-resp hi">응답 91%</span><span className="badge badge--deadline">D-7</span></div>
                    <div className="mx-row"><span style={{ flex: 1, fontWeight: 700 }}>당근 · 서버</span><span className="mx-resp mid">응답 63%</span><span className="badge badge--career">매칭 3/5</span></div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">구별 공고 랭킹</div>
                {([['1', '강남구', 100, '1,842'], ['2', '구로·가산', 47, '861'], ['3', '마포', 35, '642'], ['4', '성동(성수)', 32, '588']] as [string, string, number, string][]).map(([no, name, w, v]) => (
                  <div className="mx-rank" key={no}>
                    <span className="no">{no}</span>
                    <span className="name">{name}</span>
                    <span className="v">{v}</span>
                    <div className="track"><i style={{ width: `${w}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="ds-card">
                <div className="demo-label">내 주변 반경 (드래그해 보세요)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <AppleSlider defaultPct={45} format={(p) => `${(1 + (p / 100) * 19).toFixed(1)}km 이내`} />
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">지원 응답률 배지 (F11 · 원티드)</div>
                <div className="ds-demo-stage" style={{ gap: 8 }}>
                  <span className="mx-resp hi">응답 91%</span>
                  <span className="mx-resp mid">응답 63%</span>
                  <span className="mx-resp lo">응답 데이터 없음</span>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">국내 전용 안내 배너</div>
                <div className="ds-demo-stage">
                  <div className="mx-domestic"><Info size={15} style={{ flex: 'none' }} /> 지도는 <b style={{ margin: '0 3px' }}>국내 풀</b>에서만 활성이에요. 글로벌은 국가 레벨만 제공돼요.</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">기준일·모수(N) 라벨 (정직 표기)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                  <span className="mx-nlabel"><MapPin size={12} /> 기준일 2026-07-07 · N=7,104</span>
                  <span className="mx-nlabel"><Info size={12} /> 용산구 <span className="warn">표본 42건 — 참고용</span></span>
                </div>
              </div>
            </div>
    </section>
  )
}
