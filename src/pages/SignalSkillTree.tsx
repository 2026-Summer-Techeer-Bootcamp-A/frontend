import { useMemo, useState } from 'react'
import { GitBranch, Target, Check, Lock, FlaskConical } from 'lucide-react'
import matchRaw from '../data/matchData.json'
import './signalSkillTree.css'

/* ================================================================
   와우 위젯 · 목표 직군 스킬트리 (/signal/skilltree)
   목표 직군의 핵심 스택을 게임 스킬트리처럼: 보유(해금)·다음(학습가능)·심화(잠김).
   내 해금 진척률을 한눈에. 실측 matchData.json(byRole.techs). 티어=보유/1갭/그외.
   ================================================================ */

type Tech = { tech: string; reqPct: number; owned: boolean; tier: 'have' | 'next' | 'later' }
type RoleData = { techs: Tech[] }
const DATA = matchRaw as unknown as {
  _meta: { roles: { key: string; label: string; n: number }[]; asOf: string }
  byRole: Record<string, RoleData>
}
const ROLES = DATA._meta.roles.filter((r) => r.key !== 'all')
const DEFAULT_ROLE = ROLES.some((r) => r.key === 'backend') ? 'backend' : ROLES[0].key

const VW = 1120
const TIER_CX = { have: 190, next: 560, later: 930 }
const NW = 150
const PITCH = 58
const TOP = 78

const TIER_META = [
  { key: 'have' as const, label: '보유 · 해금됨', sub: '이력서에서 확인' },
  { key: 'next' as const, label: '다음 · 학습 가능', sub: '한 걸음 앞' },
  { key: 'later' as const, label: '심화 · 잠김', sub: '그 다음 단계' },
]

export default function SignalSkillTree() {
  const [role, setRole] = useState<string>(DEFAULT_ROLE)
  const D = DATA.byRole[role]
  const roleLabel = ROLES.find((r) => r.key === role)?.label ?? ''

  const model = useMemo(() => {
    const groups = {
      have: D.techs.filter((t) => t.tier === 'have'),
      next: D.techs.filter((t) => t.tier === 'next'),
      later: D.techs.filter((t) => t.tier === 'later'),
    }
    const rows = Math.max(groups.have.length, groups.next.length, groups.later.length, 1)
    const areaH = rows * PITCH
    const pos: Record<string, { x: number; y: number; t: Tech }[]> = { have: [], next: [], later: [] }
    ;(['have', 'next', 'later'] as const).forEach((k) => {
      const g = groups[k]
      const startY = TOP + (areaH - g.length * PITCH) / 2 + PITCH / 2
      g.forEach((t, i) => pos[k].push({ x: TIER_CX[k], y: startY + i * PITCH, t }))
    })
    const cy = (k: 'have' | 'next' | 'later') => {
      const a = pos[k]
      return a.length ? a.reduce((s, p) => s + p.y, 0) / a.length : TOP + areaH / 2
    }
    const total = D.techs.length
    const haveN = groups.have.length
    return { pos, areaH, haveCY: cy('have'), nextCY: cy('next'), total, haveN, pct: Math.round((haveN / total) * 100) }
  }, [D])

  const VH = TOP + model.areaH + 34

  const NodeRect = ({ x, y, t }: { x: number; y: number; t: Tech }) => (
    <g transform={`translate(${x - NW / 2},${y - 18})`} className={`st-node st-node--${t.tier}`}>
      <rect width={NW} height={36} rx={9} />
      <g transform="translate(12,18)">
        {t.tier === 'have' && <Check size={13} strokeWidth={3} className="st-ic st-ic--have" x={-2} y={-7} />}
        {t.tier === 'later' && <Lock size={12} strokeWidth={2.4} className="st-ic st-ic--lock" x={-1} y={-6} />}
      </g>
      <text x={t.tier === 'next' ? 13 : 30} y={17} className="st-node__t">{t.tech}</text>
      <text x={NW - 11} y={17} textAnchor="end" className="st-node__p">{t.reqPct}%</text>
    </g>
  )

  const edge = (x1: number, y1: number, x2: number, y2: number, cls: string) => {
    const mx = (x1 + x2) / 2
    return <path key={`${x1}-${y1}-${x2}-${y2}`} className={cls} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" />
  }

  return (
    <div className="st-stage">
      <div className="st-canvas">
        <header className="st-head">
          <div>
            <span className="st-eyebrow"><GitBranch size={13} strokeWidth={2.4} /> 와우 · 목표 직군 스킬트리</span>
            <h1 className="st-title">내 스킬트리, 어디까지 켜졌나</h1>
            <p className="st-dek">
              가고 싶은 직군의 핵심 스택을 게임 스킬트리처럼 봐요. <b>초록은 이미 해금</b>,
              <b> 앰버는 지금 배울 수 있는 다음 단계</b>, 회색은 그 너머예요.
            </p>
          </div>
          <div className="st-prog">
            <div className="st-prog__n">{model.pct}<i>%</i></div>
            <div className="st-prog__lbl">핵심 스택 해금<br /><b>{model.haveN}/{model.total}</b></div>
          </div>
        </header>

        <div className="st-target">
          <span className="st-target__k"><Target size={14} strokeWidth={2.4} /> 목표 직군</span>
          <div className="st-roles">
            {ROLES.map((r) => (
              <button key={r.key} className={'st-role' + (r.key === role ? ' is-on' : '')} onClick={() => setRole(r.key)}>
                {r.label}<i>{r.n}</i>
              </button>
            ))}
          </div>
        </div>

        <section className="st-hero">
          <div className="st-tiers">
            {TIER_META.map((t) => (
              <div key={t.key} className={'st-tierlbl st-tierlbl--' + t.key}>
                <span className="st-tierlbl__t">{t.label}</span>
                <span className="st-tierlbl__s">{t.sub}</span>
              </div>
            ))}
          </div>
          <svg className="st-svg" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={`${roleLabel} 스킬트리`}>
            {/* 엣지: 보유→다음, 다음→심화 */}
            {model.pos.next.map((p) => edge(TIER_CX.have + NW / 2, model.haveCY, p.x - NW / 2, p.y, 'st-edge st-edge--active'))}
            {model.pos.later.map((p) => edge(TIER_CX.next + NW / 2, model.nextCY, p.x - NW / 2, p.y, 'st-edge'))}
            {/* 노드 */}
            {(['have', 'next', 'later'] as const).flatMap((k) => model.pos[k].map((p) => <NodeRect key={p.t.tech} x={p.x} y={p.y} t={p.t} />))}
          </svg>
        </section>

        <footer className="st-foot">
          <FlaskConical size={12} strokeWidth={2.2} />
          <span>
            실측 · jumpit <b>{roleLabel}</b> 공고의 상위 요구 기술 {model.total}개(요구율 순). 보유=이력서 매칭 · 다음=딱 1개
            부족 공고가 많은(바로 학습가치) 기술 · 심화=그 외. % = 그 직군 공고 요구율. 이력서 파싱·매칭은 데모예요.
          </span>
        </footer>
      </div>
    </div>
  )
}
