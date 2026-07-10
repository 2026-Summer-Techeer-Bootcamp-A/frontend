import { ChevronRight, Info, ChevronDown } from 'lucide-react'

export default function DataDisplaySection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head"><h2>데이터 표시</h2></div>
            <div className="ds-grid ds-grid--2">
              <div className="ds-card">
                <div className="demo-label">테이블 (우측정렬 · tabular-nums)</div>
                <table className="ds-table">
                  <thead><tr><th>회사</th><th>매칭</th><th className="num">급여</th></tr></thead>
                  <tbody>
                    <tr><td>엑스소프트</td><td>50%</td><td className="num">4,000만~1억</td></tr>
                    <tr><td>세이프에이아이</td><td>44%</td><td className="num">3,000만~1억</td></tr>
                    <tr><td>매드업</td><td>20%</td><td className="num">1,000만~5,000만</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="ds-card">
                <div className="demo-label">브레드크럼 · 페이지네이션</div>
                <div className="demo">
                  <span className="ds-breadcrumb">채용공고 <ChevronRight size={14} /> 국내 <ChevronRight size={14} /> <b>엑스소프트</b></span>
                </div>
                <div className="demo" style={{ marginTop: 18 }}>
                  <span className="ds-pagination">
                    <button>‹</button>
                    <button className="on">1</button>
                    <button>2</button>
                    <button>3</button>
                    <button>›</button>
                  </span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">툴팁</div>
                <div className="ds-demo-stage">
                  <span className="ds-tooltip-demo">
                    <button className="btn btn--ghost btn--icon"><Info size={18} /></button>
                    <span className="ds-tooltip">현재 시점 기준 수치예요</span>
                  </span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">아코디언</div>
                <div className="ds-accordion">
                  <div className="head on">지원 자격이 어떻게 되나요? <ChevronDown size={16} /></div>
                  <div className="body">경력 4~10년, React/TypeScript 경험자를 우대해요.</div>
                  <div className="head">복지 혜택은 무엇인가요?</div>
                  <div className="head">면접은 몇 차까지 진행되나요?</div>
                </div>
              </div>
            </div>
    </section>
  )
}
