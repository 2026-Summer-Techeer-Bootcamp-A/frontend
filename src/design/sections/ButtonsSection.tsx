import { ArrowUpRight, X, ChevronRight } from 'lucide-react'

export default function ButtonsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>버튼</h2>
              <span className="ds-sub">iOS 5종 스타일 — Filled·Tinted·Gray·Plain·Bordered</span>
            </div>
            <div className="ds-card">
              <div className="demo-label">Variant</div>
              <div className="demo">
                <button className="btn btn--primary">지원하기</button>
                <button className="btn btn--secondary">저장</button>
                <button className="btn btn--gray">건너뛰기</button>
                <button className="btn btn--plain">취소</button>
                <button className="btn btn--ghost">더보기</button>
                <button className="btn btn--ink">Ink</button>
                <button className="btn btn--danger">삭제</button>
                <button className="btn btn--primary" disabled>비활성</button>
              </div>
              <div className="demo-label" style={{ marginTop: 6 }}>Size · Icon</div>
              <div className="demo">
                <button className="btn btn--primary btn--sm">Small</button>
                <button className="btn btn--primary">Medium</button>
                <button className="btn btn--primary btn--lg">Large</button>
                <button className="btn btn--ghost btn--icon"><X size={18} /></button>
                <button className="btn btn--primary btn--icon"><ArrowUpRight size={18} /></button>
              </div>
              <div className="demo">
                <button className="btn btn--secondary">전체보기 <ChevronRight size={15} /></button>
              </div>
            </div>
    </section>
  )
}
