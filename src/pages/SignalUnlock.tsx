import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Zap, RotateCcw, FlaskConical, Lock, Unlock, Target } from 'lucide-react'
import matchRaw from '../data/matchData.json'
import './signalUnlock.css'

/* ================================================================
   와우 위젯 · 스킬 하나의 나비효과 (/signal/unlock)
   목표 직군 세팅 → 그 직군 공고로만 필터 → 목표에 맞는 해금만 노출.
   (백엔드 목표면 C++ 대신 Spring/Kafka/K8s가 뜸.)
   인터랙션: 미보유 기술 클릭 → 지원가능 공고가 애니메이션 확장.
   실측 matchData.json(byRole). viz = ECharts.
   ================================================================ */

const GREEN = '#3fb27f'
const BLUE = '#5a86cf'
const MUTE = '#37507e'
const GREY = '#2b303c'

type Cand = { tech: string; reqCount: number; reqPct: number; marginalApply: number; newApplyPct: number }
type RoleData = { n: number; funnel: { apply: number; near1: number; near2_3: number; far: number }; applyPct: number; coverageNow: number; candidates: Cand[] }
const DATA = matchRaw as unknown as {
  _meta: { myTech: string[]; asOf: string; roles: { key: string; label: string; n: number }[]; note: string }
  byRole: Record<string, RoleData>
}
const M = DATA._meta
const ROLES = M.roles
const DEFAULT_ROLE = ROLES.some((r) => r.key === 'backend') ? 'backend' : ROLES[0].key

export default function SignalUnlock() {
  const [role, setRole] = useState<string>(DEFAULT_ROLE)
  const [sel, setSel] = useState<string | null>(null)
  const D = DATA.byRole[role]
  const F = D.funnel
  const N = D.n
  const roleLabel = ROLES.find((r) => r.key === role)?.label ?? '전체'

  const cand = useMemo(() => D.candidates.find((c) => c.tech === sel) ?? null, [D, sel])
  const gain = cand?.marginalApply ?? 0
  const apply = F.apply + gain
  const near1 = F.near1 - gain
  const applyPct = N ? +((apply / N) * 100).toFixed(1) : 0

  const pickRole = (k: string) => { setRole(k); setSel(null) }

  const meterOption = useMemo(() => {
    const seg = (name: string, val: number, color: string) => ({
      name, type: 'bar', stack: 'x', barWidth: 46,
      data: [val], itemStyle: { color },
      label: { show: val / N > 0.06, position: 'inside', formatter: () => `${val}`, color: '#fff', fontFamily: 'Pretendard', fontWeight: 800, fontSize: 13 },
    })
    return {
      animationDuration: 650, animationEasing: 'cubicInOut',
      grid: { left: 6, right: 6, top: 6, bottom: 6 },
      tooltip: {
        trigger: 'item', backgroundColor: '#12141a', borderColor: '#262a34', borderWidth: 1,
        textStyle: { color: '#f4f6fb', fontFamily: 'Pretendard', fontSize: 12.5 }, extraCssText: 'border-radius:10px;',
        formatter: (p: { seriesName: string; value: number }) => `${p.seriesName} · <b>${p.value}</b>건 (${N ? Math.round((p.value / N) * 100) : 0}%)`,
      },
      xAxis: { type: 'value', max: N, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      series: [
        seg('지원 가능', apply, GREEN),
        seg('딱 1개 부족', near1, BLUE),
        seg('2~3개 부족', F.near2_3, MUTE),
        seg('격차 큼', F.far, GREY),
      ],
    }
  }, [apply, near1, N, F.near2_3, F.far])

  return (
    <div className="ul-stage">
      <div className="ul-canvas">
        <header className="ul-head">
          <div>
            <span className="ul-eyebrow"><Zap size={13} strokeWidth={2.5} /> 와우 · 이력서 × 목표 직군 시뮬레이터</span>
            <h1 className="ul-title">목표에 맞는 스킬 하나가 여는 문</h1>
            <p className="ul-dek">
              아무 기술이나 배우는 게 아니에요. <b>가고 싶은 직군</b>을 정하면, 그 직군 공고만 놓고
              <b> 뭘 배우면 지원 가능한 공고가 가장 많이 열리는지</b> 보여줘요.
            </p>
          </div>
          <div className="ul-badge"><FlaskConical size={12} strokeWidth={2.3} /> 이력서 파싱 가정 · 실 공고</div>
        </header>

        {/* 목표 프로필 */}
        <div className="ul-target">
          <span className="ul-target__k"><Target size={14} strokeWidth={2.4} /> 목표 직군</span>
          <div className="ul-roles">
            {ROLES.map((r) => (
              <button key={r.key} className={'ul-role' + (r.key === role ? ' is-on' : '')} onClick={() => pickRole(r.key)}>
                {r.label}<i>{r.n}</i>
              </button>
            ))}
          </div>
          <span className="ul-target__ind">업종 <b>전체</b> <em>데이터 준비중</em></span>
        </div>

        {/* 내 이력서 기술 */}
        <div className="ul-mine">
          <span className="ul-mine__k">이력서에서 추출된 내 기술</span>
          {M.myTech.map((t) => <span key={t} className="ul-mine__chip">{t}</span>)}
        </div>

        {/* 다크 히어로 · 도달 미터 */}
        <section className="ul-hero">
          <div className="ul-hero__bar">
            <div className="ul-hero__stat">
              <div className={'ul-hero__big' + (sel ? ' is-boost' : '')}>{apply}<i>/{N}</i></div>
              <div className="ul-hero__lbl">
                <b>{roleLabel}</b> 공고 중 <b>지원 가능</b> · 도달률 <b className="ul-num">{applyPct}%</b>
                {sel && <span className="ul-hero__gain">＋{gain} · {sel} 배우면</span>}
              </div>
            </div>
            <div className="ul-hero__legend">
              <span><i style={{ background: GREEN }} /> 지원가능</span>
              <span><i style={{ background: BLUE }} /> 1개 부족</span>
              <span><i style={{ background: MUTE }} /> 2~3개</span>
              <span><i style={{ background: GREY }} /> 격차</span>
            </div>
          </div>
          <ReactECharts option={meterOption} style={{ height: 72 }} />
          <div className="ul-hero__hint">
            {sel
              ? <><Unlock size={13} strokeWidth={2.4} /> <b>{sel}</b> 하나로 <b className="ul-g">＋{gain}개</b> {roleLabel} 공고가 열려요 — 도달률 {D.applyPct}% → <b className="ul-g">{applyPct}%</b></>
              : <><Lock size={13} strokeWidth={2.4} /> 아래에서 기술을 눌러보세요 — 그 하나만 배우면 열리는 <b>{roleLabel}</b> 공고가 초록으로 확장돼요</>}
          </div>
        </section>

        {/* 후보 스킬 */}
        <section className="ul-cands">
          <div className="ul-cands__h">
            <span>{roleLabel}에서 한 개만 더 배운다면?</span>
            <span className="ul-cands__sub">"이거 하나만 부족" 공고가 많은 순</span>
            {sel && <button className="ul-reset" onClick={() => setSel(null)}><RotateCcw size={13} strokeWidth={2.4} /> 초기화</button>}
          </div>
          {D.candidates.length === 0 ? (
            <div className="ul-empty">이 직군은 "딱 1개 부족" 공고가 적어요 — 이미 대부분의 요구 기술을 갖췄거나, 표본이 작아요.</div>
          ) : (
            <div className="ul-grid">
              {D.candidates.map((c, i) => {
                const on = c.tech === sel
                const max = D.candidates[0].marginalApply
                return (
                  <button key={c.tech} className={'ul-cand' + (on ? ' is-on' : '')} onClick={() => setSel(on ? null : c.tech)}>
                    <span className="ul-cand__rank">{i + 1}</span>
                    <span className="ul-cand__tech">{c.tech}</span>
                    <span className="ul-cand__bar"><span className="ul-cand__fill" style={{ width: `${(c.marginalApply / max) * 100}%` }} /></span>
                    <span className="ul-cand__n">＋{c.marginalApply}<i>공고</i></span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <footer className="ul-foot">
          <span className="ul-foot__dot" />
          실측 · jumpit <b>{roleLabel}</b> 공고 <b>N={N}</b>({M.asOf}). "지원 가능" = 요구 기술을 모두 보유.
          "＋N" = 그 기술 하나만 배우면 지원 가능해지는 공고 수(단일 기술 기준). 목표 직군은 회원 정보로 세팅(가정) · 업종 필터는 데이터 준비 중이에요.
        </footer>
      </div>
    </div>
  )
}
