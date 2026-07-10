import { palette } from '../tokens'
import { ScaleBar } from '../dsPrimitives'

export default function ColorsSection() {
  return (
    <section className="ds-sec ds-page">
            <div className="ds-sec__head">
              <h2>컬러 팔레트</h2>
              <span className="ds-sub">호버하면 hex가 보여요</span>
            </div>
            <div className="ds-card">
              <ScaleBar label="Accent · 슬레이트 블루" sub="주요 액션 · 데이터 강조" entries={Object.entries(palette.accent)} />
              <ScaleBar label="Neutral · 쿨 그레이" sub="배경 · 텍스트 · 보더" entries={Object.entries(palette.neutral)} />
              <div className="scale">
                <div className="scale__label">
                  <span style={{ color: 'var(--ink)' }}>Semantic · 의미색</span>
                  <span>상태 · 피드백</span>
                </div>
                <div className="semantic-row">
                  <div className="semantic-tile" style={{ background: palette.semantic.successBg, color: palette.semantic.success }}>
                    <div className="name">Success</div>
                    <div className="hex">{palette.semantic.success}</div>
                  </div>
                  <div className="semantic-tile" style={{ background: palette.semantic.warningBg, color: palette.semantic.warning }}>
                    <div className="name">Warning</div>
                    <div className="hex">{palette.semantic.warning}</div>
                  </div>
                  <div className="semantic-tile" style={{ background: palette.semantic.dangerBg, color: palette.semantic.danger }}>
                    <div className="name">Danger</div>
                    <div className="hex">{palette.semantic.danger}</div>
                  </div>
                  <div className="semantic-tile" style={{ background: palette.semantic.infoBg, color: palette.semantic.info }}>
                    <div className="name">Info</div>
                    <div className="hex">{palette.semantic.info}</div>
                  </div>
                </div>
              </div>
            </div>
    </section>
  )
}
