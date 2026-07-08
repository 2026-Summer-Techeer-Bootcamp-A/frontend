import { WidgetFrame } from './Shell'
import { C } from './base'
import raw from '../../data/pearl/s.json'

type Level = { level: string; n: number }
type Example = { company: string; level: string; rate: number; matched: string[]; matched_n: number }
const S = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { levels: Level[]; median_rate: number; examples: Example[] }
}

const LEVEL_META: Record<string, { label: string; color: string }> = {
  very_low: { label: '매우 낮음', color: C.dangerSoft },
  low: { label: '낮음', color: '#e0a99f' },
  normal: { label: '보통', color: C.neutral300 },
  high: { label: '높음', color: C.accent300 },
  very_high: { label: '매우 높음', color: C.accent },
}

export default function WidgetS() {
  const total = S.data.levels.reduce((a, l) => a + l.n, 0)
  const goodPct = Math.round(
    (S.data.levels.filter((l) => l.level === 'high' || l.level === 'very_high').reduce((a, l) => a + l.n, 0) / total) * 100,
  )

  return (
    <WidgetFrame
      tag="후보 S" title="응답 잘 오는 회사"
      headline={<>인증 시스템 없이도 알 수 있어요 — 지원자의 <b style={{ color: C.accent }}>{goodPct}%</b>가 응답률 "높음" 이상인 회사에 지원해요</>}
      note={S.sample_note} asOf={S.as_of} n={S.sample_size}
    >
      <div className="wg-s">
        <div className="wg-s__left">
          <div className="wg-s__bigstat">
            <b className="tnum">{S.data.median_rate}<em>%</em></b>
            <span>응답률 정보가 있는 공고의 중위 응답률</span>
          </div>
          <div className="wg-s__stack">
            {S.data.levels.map((l) => (
              <div key={l.level} className="wg-s__srow">
                <span className="wg-s__slabel">{LEVEL_META[l.level].label}</span>
                <div className="wg-s__strack">
                  <i style={{ width: `${(l.n / total) * 100}%`, background: LEVEL_META[l.level].color }} />
                </div>
                <span className="wg-s__sn tnum">{l.n.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="wg-s__right">
          <div className="wg-s__rtitle">내 기술과 겹치고, 응답도 잘 오는 회사</div>
          <div className="wg-s__cards">
            {S.data.examples.map((e) => (
              <div key={e.company} className="wg-s__card">
                <div className="wg-s__cname">{e.company}</div>
                <div className="wg-s__crate">
                  <span className={`wg-s__badge ${e.level}`}>{LEVEL_META[e.level].label}</span>
                  <span className="tnum">{e.rate}%</span>
                </div>
                <div className="wg-s__cchips">
                  {e.matched.slice(0, 4).map((s) => <span key={s} className="chip chip--held">{s}</span>)}
                  {e.matched.length > 4 && <span className="chip chip--neutral">+{e.matched.length - 4}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetFrame>
  )
}
