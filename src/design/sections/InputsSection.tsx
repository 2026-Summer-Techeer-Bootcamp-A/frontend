import { Search, Check, SlidersHorizontal, Minus, Plus } from 'lucide-react'
import { AppleSlider } from '../dsPrimitives'

export default function InputsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>인풋 · 컨트롤</h2>
            </div>
            <div className="ds-card">
              <div className="demo-label">인풋 · 필터</div>
              <div className="demo">
                <label className="ds-input"><Search size={17} /><input placeholder="검색어를 입력하세요" /></label>
                <button className="btn btn--ghost"><SlidersHorizontal size={16} /> 필터</button>
              </div>
              <div className="demo-label">세그먼트</div>
              <div className="demo">
                <span className="ds-seg">
                  <button className="on">국내 채용공고</button>
                  <button>해외 채용공고</button>
                </span>
                <span className="ds-seg">
                  <button className="on">최적순</button>
                  <button>최신순</button>
                  <button>마감순</button>
                </span>
              </div>
              <div className="demo-label">체크 · 라디오 · 스위치</div>
              <div className="demo">
                <span className="ds-check"><span className="box"><Check size={13} strokeWidth={3} /></span> 경력직 채용 보지 않기</span>
                <span className="ds-check off"><span className="box" /> 신입 채용 보지 않기</span>
                <span className="ds-check ds-radio"><span className="dot" /> 최적순</span>
                <span className="ds-check ds-radio off"><span className="dot" /> 최신순</span>
                <span className="ds-switch on" />
                <span className="ds-switch" />
              </div>
              <div className="demo-label">스테퍼 · 슬라이더</div>
              <div className="demo">
                <div className="ios-stepper">
                  <button><Minus size={15} /></button>
                  <span className="val">3</span>
                  <button><Plus size={15} /></button>
                </div>
                <AppleSlider defaultPct={62} />
              </div>
            </div>
    </section>
  )
}
