import { Check, X, ChevronDown, Star, UploadCloud } from 'lucide-react'

export default function FormsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head"><h2>폼 요소</h2></div>
            <div className="ds-grid ds-grid--3">
              <div className="ds-card">
                <div className="demo-label">텍스트 필드 (기본 · 에러 · 헬퍼)</div>
                <div className="field-group">
                  <label>이메일</label>
                  <input className="ds-input-plain" placeholder="you@example.com" />
                  <span className="helper">가입 시 사용한 이메일이에요</span>
                </div>
                <div className="field-group" style={{ marginTop: 16 }}>
                  <label>비밀번호</label>
                  <input className="ds-input-plain err" placeholder="8자 이상" />
                  <span className="helper error">비밀번호는 8자 이상이어야 해요</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">텍스트에어리어 · 셀렉트</div>
                <div className="field-group">
                  <label>자기소개</label>
                  <textarea placeholder="간단한 소개를 입력하세요" />
                </div>
                <div className="field-group" style={{ marginTop: 16 }}>
                  <label>경력</label>
                  <span className="ds-select"><span>3~5년</span><ChevronDown size={16} /></span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">태그 인풋 · 드롭존</div>
                <div className="ds-tag-input">
                  <span className="token-chip">React <span className="x"><X size={11} /></span></span>
                  <span className="token-chip">TypeScript <span className="x"><X size={11} /></span></span>
                  <span className="type">기술 추가...</span>
                </div>
                <div className="ds-dropzone" style={{ marginTop: 14 }}>
                  <UploadCloud size={22} style={{ margin: '0 auto 8px', display: 'block' }} />
                  이력서 파일을 끌어다 놓으세요
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">체크박스 그룹</div>
                <div className="ds-choice-group">
                  <span className="ds-check"><span className="box"><Check size={13} strokeWidth={3} /></span> 정규직</span>
                  <span className="ds-check off"><span className="box" /> 계약직</span>
                  <span className="ds-check off"><span className="box" /> 인턴</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">라디오 그룹</div>
                <div className="ds-choice-group">
                  <span className="ds-check ds-radio"><span className="dot" /> 최적순</span>
                  <span className="ds-check ds-radio off"><span className="dot" /> 최신순</span>
                  <span className="ds-check ds-radio off"><span className="dot" /> 마감순</span>
                </div>
              </div>
              <div className="ds-card">
                <div className="demo-label">별점 (인터랙티브)</div>
                <div className="ds-rating">
                  {[1, 2, 3, 4].map((i) => <Star key={i} size={22} fill="#0b0b0c" color="#0b0b0c" />)}
                  <Star size={22} color="#cdd2db" />
                </div>
              </div>
            </div>
    </section>
  )
}
