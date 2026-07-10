import { ChevronRight, Info, Send, ThumbsUp, ThumbsDown, Target } from 'lucide-react'
import { AssistantThreadDemo } from '../dsPrimitives'

export default function InsightsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>인사이트·AI</h2>
              <span className="ds-sub">챗봇·인사이트·추천 — 보라·핑크·Sparkles 없이 나머지 화면과 한 몸, 근거를 항상 노출</span>
            </div>
            <div className="ds-grid ds-grid--3">
              <AssistantThreadDemo />

              <div className="ds-card">
                <div className="demo-label">컴포저 입력 + 전송</div>
                <div className="ds-demo-stage">
                  <div className="ax-composer">
                    <input placeholder="채용 시장에 대해 물어보세요" />
                    <button className="ax-send"><Send size={16} /></button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">추천 프롬프트 칩</div>
                <div className="ds-demo-stage" style={{ alignItems: 'stretch' }}>
                  <div className="ax-suggests">
                    <button className="ax-chip">내 갭 분석해줘</button>
                    <button className="ax-chip">연봉 높은 지역은?</button>
                    <button className="ax-chip">다음에 배울 기술</button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">AI 인사이트 카드 (근거 포함)</div>
                <div className="ax-insight">
                  <span className="badge-ai"><Target size={11} /> 데이터 인사이트</span>
                  <h4>TypeScript를 더하면 매칭 공고가 41% 늘어요</h4>
                  <p>현재 조건에서 요구되지만 미보유한 기술 1순위예요. 서울권 공고 기준 가장 큰 갭이에요.</p>
                  <div className="ax-cite"><Info size={12} /> 근거: 공고 394건 · 2026-07-07 기준</div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">요약 (TL;DR)</div>
                <ul className="ax-summary">
                  <li><span className="dot" />React·TS 보유로 상위 <b>27%</b> 커버리지</li>
                  <li><span className="dot" />가장 큰 갭은 <b>클라우드(AWS)</b> 계열</li>
                  <li><span className="dot" />판교·강남에 적합 공고 <b>213건</b> 집중</li>
                </ul>
              </div>

              <div className="ds-card">
                <div className="demo-label">갭 분석 (다음에 배울 것)</div>
                <div className="ax-gap"><span className="no">1</span><span className="k">TypeScript</span><span className="meta">+394건</span></div>
                <div className="ax-gap"><span className="no">2</span><span className="k">AWS</span><span className="meta">+241건</span></div>
                <div className="ax-gap"><span className="no">3</span><span className="k">Docker</span><span className="meta">+188건</span></div>
              </div>

              <div className="ds-card">
                <div className="demo-label">추천 공고 + 이유</div>
                <div className="ax-reco">
                  <div className="logo">토</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">프론트엔드 엔지니어</div>
                    <div className="co">토스 · 강남</div>
                    <div className="why">추천 이유: 보유한 React·TypeScript가 요구 스택의 82%를 커버해요</div>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">신뢰도 (허수 % 대신 근거 건수)</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                  <div className="ax-confidence">
                    <span className="dots"><i className="on" /><i className="on" /><i className="on" /><i className="on" /><i /></span>
                    근거 <b>342</b>건 기반
                  </div>
                  <div className="ax-confidence">
                    <span className="dots"><i className="on" /><i className="on" /><i /><i /><i /></span>
                    근거 <b>28</b>건 — 참고용
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">후속 질문</div>
                <button className="ax-followup">이 갭을 메우는 로드맵 보여줘 <ChevronRight size={15} className="chev" /></button>
                <button className="ax-followup">TypeScript 공고만 필터링 <ChevronRight size={15} className="chev" /></button>
              </div>

              <div className="ds-card">
                <div className="demo-label">응답 피드백</div>
                <div className="ds-demo-stage">
                  <div className="ax-feedback">
                    이 답변이 도움됐나요?
                    <button className="on"><ThumbsUp size={15} /></button>
                    <button><ThumbsDown size={15} /></button>
                  </div>
                </div>
              </div>

              <div className="ds-card">
                <div className="demo-label">AI 배지 · 인용 라인</div>
                <div className="ds-demo-stage" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                  <span className="badge-ai" style={{ margin: 0 }}><Target size={11} /> AI 추천</span>
                  <div className="ax-cite" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <Info size={12} /> 출처: 채용공고 342건 분석 · SQL 집계
                  </div>
                </div>
              </div>
            </div>
    </section>
  )
}
