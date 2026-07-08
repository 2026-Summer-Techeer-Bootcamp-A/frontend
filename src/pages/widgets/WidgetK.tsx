import { useMemo } from 'react'
import { WidgetFrame } from './Shell'
import raw from '../../data/pearl/k.json'

type Badge = {
  tech: string; types: string[]; hn_ratio: number | null
  all_share_pct: number; hn_pct?: number; job_pct?: number
}
const K = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { months: [string, string]; groups: Record<string, Badge[]> }
}

const META: Record<string, { icon: string; title: string; sub: string; cls: string }> = {
  steady: { icon: '🪨', title: '스테디셀러', sub: '몇 년째 시장의 중심', cls: 'steady' },
  rising: { icon: '📈', title: '뜨는 중', sub: '최근 6개월 언급 급등', cls: 'rising' },
  falling: { icon: '📉', title: '식는 중', sub: '관심이 빠지는 중', cls: 'falling' },
  hype_only: { icon: '🔥', title: '하입 온리', sub: '개발자는 열광, 채용은 아직', cls: 'hype' },
}
const ORDER = ['steady', 'rising', 'hype_only', 'falling']

export default function WidgetK() {
  const { groups } = K.data

  // 여러 그룹에 걸친 기술 = 이중 배지(예: Bun = 뜨는 중 + 하입 온리)
  const multi = useMemo(() => {
    const count = new Map<string, number>()
    Object.values(groups).forEach((arr) => arr.forEach((b) => count.set(b.tech, (count.get(b.tech) ?? 0) + 1)))
    return new Set([...count].filter(([, c]) => c > 1).map(([t]) => t))
  }, [])

  const sub = (g: string, b: Badge) => {
    if (g === 'steady') return `${b.all_share_pct}%`
    if (g === 'hype_only') return `HN ${b.hn_pct} · 채용 ${b.job_pct}`
    return b.hn_ratio ? `×${b.hn_ratio}` : ''
  }
  const tip = (g: string, b: Badge) => {
    if (g === 'steady') return `${b.tech} — HN 공고 중 평균 ${b.all_share_pct}% 언급, 최근/과거 변동 작음`
    if (g === 'hype_only') return `${b.tech} — HN 언급 상위 ${b.hn_pct}백분위인데 채용 수요는 ${b.job_pct}백분위`
    if (g === 'rising') return `${b.tech} — 최근 6개월 HN 언급이 이전 대비 ${b.hn_ratio}배`
    return `${b.tech} — 최근 6개월 HN 언급이 이전의 ${b.hn_ratio}배로 감소`
  }

  return (
    <WidgetFrame
      tag="후보 K · 공통 레이어" title="기술 아키타입 배지"
      headline={<>기술마다 <b>성격</b>이 있어요 — <b style={{ color: '#b8892b' }}>Bun</b>은 커뮤니티에선 폭등, 채용은 아직이에요</>}
      note={K.sample_note} asOf={K.as_of} n={K.sample_size}
    >
      <div className="wg-k">
        {ORDER.map((g) => {
          const m = META[g]
          return (
            <div key={g} className={`wg-k__card ${m.cls}`}>
              <div className="wg-k__chead">
                <span className="wg-k__icon">{m.icon}</span>
                <div>
                  <div className="wg-k__ctitle">{m.title}</div>
                  <div className="wg-k__csub">{m.sub}</div>
                </div>
              </div>
              <div className="wg-k__badges">
                {(groups[g] ?? []).map((b) => (
                  <span key={b.tech} className={`wg-k__badge ${multi.has(b.tech) ? 'dual' : ''}`} title={tip(g, b)}>
                    {b.tech}
                    <em>{sub(g, b)}</em>
                    {multi.has(b.tech) && <span className="wg-k__dual">2관왕</span>}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="wg-k__foot">
        <b>2관왕</b> = 두 성격을 동시에 — 예: <b>Bun·Supabase·Ollama</b>는 뜨는 중이면서 아직 채용은 적은 하입 온리예요.
        갭 기술 옆·공고 카드·기술 세부 어디에나 이 배지를 붙일 수 있어요.
      </div>
    </WidgetFrame>
  )
}
