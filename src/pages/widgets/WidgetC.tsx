import { useMemo, useState } from 'react'
import { WidgetFrame } from './Shell'
import { C, RESUME, useCountUp } from './base'
import raw from '../../data/pearl/c.json'

type Gap = { tech: string; freq: number; matched_after: number; hist_after: number[] }
const CD = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: {
    coverage_score: number; histogram: number[]; my_percentile: number; my_coverage: number
    threshold: number; matched: number; total: number; gap_top5: Gap[]; bin_edges: number[]
  }
}

const W = 620, H = 280, PAD_L = 46, PAD_B = 40, PAD_T = 14, PAD_R = 8

export default function WidgetC() {
  const D = CD.data
  const [thr, setThr] = useState(D.threshold)
  const [wi, setWi] = useState<string | null>(null)

  const gap = wi ? D.gap_top5.find((g) => g.tech === wi)! : null
  const hist = gap ? gap.hist_after : D.histogram
  const maxCount = useMemo(
    () => Math.max(...D.histogram, ...D.gap_top5.flatMap((g) => g.hist_after)),
    [],
  )
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_B - PAD_T
  const binW = plotW / hist.length
  const reach = (h: number[]) => h.reduce((a, c, i) => (i * 5 + 2.5 >= thr ? a + c : a), 0)
  const reachable = reach(hist)
  const baseReach = reach(D.histogram)
  const shown = useCountUp(reachable)
  const thrX = PAD_L + (thr / 100) * plotW

  // 설명용 실측 예시 수치 — 하드코딩 없이 실제 히스토그램에서 계산
  const zeroBin = D.histogram[0]
  const zeroPct = Math.round((zeroBin / D.total) * 100)
  const modeIdx = D.histogram.reduce((best, c, i) => (c > D.histogram[best] ? i : best), 0)
  const modeCount = D.histogram[modeIdx]
  const modeLo = modeIdx * 5, modeHi = modeIdx * 5 + 5
  // y축 그리드라인 4단 (0 / 1/3 / 2/3 / max) — "막대 높이 = 공고 수"를 눈금으로 보여줌
  const yTicks = [0, 1 / 3, 2 / 3, 1].map((f) => ({
    frac: f, count: Math.round(maxCount * f), y: PAD_T + plotH * (1 - f),
  }))

  return (
    <WidgetFrame
      tag="후보 C · 히어로" title="커버리지 분포 — 분포 위의 나"
      headline={<>이 <b>{D.total.toLocaleString()}개</b> 공고가 나를 얼마나 원하는지 — 기술 하나를 배우면 분포 전체가 <b style={{ color: C.accent }}>오른쪽</b>으로 밀려요</>}
      note={CD.sample_note} asOf={CD.as_of} n={CD.sample_size}
    >
      <div className="wg-c">
        <div className="wg-c__left">
          <div className="wg-c__gauge">
            <div className="wg-c__ring" style={{ background: `conic-gradient(${C.accent} 0 ${D.coverage_score}%, #e9edf4 ${D.coverage_score}% 100%)` }}>
              <b>{D.coverage_score}<em>%</em></b>
            </div>
            <div>
              <div className="wg-c__glabel">요구스택 커버리지</div>
              <div className="wg-c__gsub">상위 20 요구기술 기준</div>
            </div>
          </div>
          <div className="wg-c__matched">
            <b className="tnum">{Math.round(shown).toLocaleString()}</b>
            <span>도달 공고 <em>(커버리지 ≥ {thr}%)</em></span>
            {gap && reachable !== baseReach && (
              <span className="wg-c__delta">+{(reachable - baseReach).toLocaleString()} 공고</span>
            )}
          </div>
          <div className="wg-c__myskills">
            <div className="wg-c__mslabel">이 계산에 쓰인 내 기술 <em>(데모 이력서 {RESUME.length}개)</em></div>
            <div className="wg-c__mschips">
              {RESUME.map((s) => (
                <span key={s} className="chip chip--held">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="wg-c__right">
          <div className="wg-c__howto">
            <div className="wg-c__howtitle">이 그래프, 이렇게 읽어요</div>
            <ol className="wg-c__steps">
              <li>
                <b>① 공고 하나마다 점수를 매겨요.</b> 국내 공고 {D.total.toLocaleString()}개 각각에 대해
                "이 공고가 요구하는 기술 중 내가 가진 기술이 몇 %인가"를 계산해요.
                예: 어떤 공고가 5개 기술을 요구하는데 내가 그중 3개를 갖고 있으면 커버리지 <b>60%</b>예요.
              </li>
              <li>
                <b>② 그 점수 {D.total.toLocaleString()}개를 5%씩 20칸에 나눠 담아요.</b> 막대 하나 = 그 커버리지 구간에 속하는
                <b> 공고의 개수</b>예요. 맨 왼쪽 막대(0~5%)엔 <b>{zeroBin.toLocaleString()}개</b>({zeroPct}%) — 제 기술과 거의 안 겹치는 공고들이에요.
                가장 높은 막대는 {modeLo}~{modeHi}% 구간으로 <b>{modeCount.toLocaleString()}개</b>가 몰려 있어요.
              </li>
              <li>
                <b>③ 점선(문턱)은 "지원해볼 만하다"의 기준선이에요.</b> 문턱을 넘는 막대들(오른쪽, 파란색)을 다 더한 값이
                왼쪽의 <b>도달 공고 수</b>예요. 슬라이더로 문턱을 낮추면 파란 영역이 넓어지고 도달 수가 늘어나요.
              </li>
              <li>
                <b>④ "이거 배우면?"을 누르면 기술 하나를 추가로 가졌다고 가정</b>하고 {D.total.toLocaleString()}개 공고의 점수를
                전부 다시 매겨요. 그 기술을 요구하던 공고들의 점수가 오르면서 <b>막대 전체가 오른쪽으로 이동</b>해요 — 그만큼 도달 공고가 늘어나는 거예요.
              </li>
            </ol>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="wg-c__svg" preserveAspectRatio="none">
            {/* 문턱 오른쪽 음영 */}
            <rect x={thrX} y={PAD_T} width={PAD_L + plotW - thrX} height={plotH} fill="rgba(47,97,184,0.05)" />
            {/* y축 그리드라인 + 눈금(공고 수) */}
            {yTicks.map((t) => (
              <g key={t.frac}>
                <line x1={PAD_L} y1={t.y} x2={PAD_L + plotW} y2={t.y} stroke={C.line2} strokeWidth={1} strokeDasharray={t.frac === 0 ? undefined : '3 3'} />
                <text x={PAD_L - 8} y={t.y + 3} className="wg-c__ylab" textAnchor="end">{t.count.toLocaleString()}</text>
              </g>
            ))}
            {hist.map((c, i) => {
              const h = maxCount ? (c / maxCount) * plotH : 0
              const x = PAD_L + i * binW
              const center = i * 5 + 2.5
              const reached = center >= thr
              return (
                <rect
                  key={i} className="wg-c__bar"
                  x={x + 1.5} y={PAD_T + plotH - h} width={binW - 3} height={h}
                  rx={2} fill={reached ? C.accent : C.neutral200}
                  opacity={reached ? 0.92 : 1}
                />
              )
            })}
            {/* 문턱 라인 */}
            <line x1={thrX} y1={PAD_T - 2} x2={thrX} y2={PAD_T + plotH} stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3" />
            {/* x축 눈금 */}
            {[0, 25, 50, 75, 100].map((t) => (
              <text key={t} x={PAD_L + (t / 100) * plotW} y={H - PAD_B + 16} className="wg-c__xlab" textAnchor="middle">{t}%</text>
            ))}
            {/* 축 제목 */}
            <text x={PAD_L + plotW / 2} y={H - 6} className="wg-c__axistitle" textAnchor="middle">
              내 기술이 이 공고 요구사항과 맞는 비율 (커버리지 %) →
            </text>
            <text x={14} y={PAD_T + plotH / 2} className="wg-c__axistitle" textAnchor="middle" transform={`rotate(-90 14 ${PAD_T + plotH / 2})`}>
              ↑ 그 구간에 속한 공고 수
            </text>
          </svg>
          <div className="wg-c__slider">
            <span>도달 문턱 <b>{thr}%</b> 이상이면 “지원해볼 만함”</span>
            <input type="range" min={10} max={90} step={5} value={thr} onChange={(e) => setThr(Number(e.target.value))} />
          </div>
          <div className="wg-c__whatif">
            <span className="wg-c__wilabel">이거 배우면?</span>
            {D.gap_top5.map((g) => (
              <button
                key={g.tech}
                className={`wg-c__chip ${wi === g.tech ? 'on' : ''}`}
                onClick={() => setWi(wi === g.tech ? null : g.tech)}
              >
                +{g.tech} <em>{g.freq}%</em>
              </button>
            ))}
          </div>
        </div>
      </div>
    </WidgetFrame>
  )
}
