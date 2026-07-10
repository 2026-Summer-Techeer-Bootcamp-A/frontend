import { useEffect, useState } from 'react'
import {
  ArrowUpRight, Award, Building2, ChevronRight, Compass, Layers,
  MapPin, Send, Target, ThumbsDown, ThumbsUp, TrendingUp, Zap,
  type LucideIcon,
} from 'lucide-react'

/** RAG 어시스턴트 데모 — 정량 질문은 근거 있는 집계로, 의미 기반 질문은 유사도 검색으로 답한다.
 * "AI를 씁니다"를 배지·오브·글로우로 과시하지 않는다. 대신 조회 결과(숫자·차트·리스트)를
 * Claude Code의 툴콜 출력처럼 먼저 보여주고, 그 근거로 답을 생성한다 — 답의 "품질과 과정"으로 증명한다. */

type ListItem = { name: string; sub?: string; metric: string; pct?: number; rank?: number }

type ToolResult =
  | { kind: 'trend'; label: string; n: number; unit: string; delta: string; spark: number[] }
  | { kind: 'list'; label: string; items: ListItem[] }
  | { kind: 'compare'; label: string; beforeLabel: string; before: number; afterLabel: string; after: number; deltaLabel: string }
  | { kind: 'stat'; label: string; big: number; suffix: string; caption: string; sub: string }

type Scenario = {
  id: string
  chipLabel: string
  userQ: string
  thinking: string
  substeps: string[]
  icon: LucideIcon
  tool: ToolResult
  answer: { text: string; cite: string }[]
  confidenceN: number
  confidenceLevel: number
  followups: string[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'trend',
    chipLabel: '채용 추이',
    userQ: 'React 공고 추이는 어때?',
    thinking: '공고 데이터를 살펴보고 있어요…',
    substeps: ['React 관련 공고를 찾고 있어요', '최근 30일로 좁히고 있어요', '증감률을 계산하고 있어요'],
    icon: TrendingUp,
    tool: { kind: 'trend', label: '채용 공고 데이터 조회', n: 482, unit: '건 · React · 최근 30일', delta: '+8%', spark: [28, 31, 30, 35, 38, 34, 40, 44, 41, 46, 44, 48] },
    answer: [
      { text: '최근 30일 React 공고는 482건으로 8% 늘었어요.', cite: '공고 482건 · React · 2026-07-07' },
      { text: '보유 기술 기준 커버리지는 상위 20개 중 73%예요.', cite: '2026-07-07 기준' },
    ],
    confidenceN: 482, confidenceLevel: 5,
    followups: ['이번 분기 전체 추세로 보여줘', 'Vue·Angular와 비교해줘'],
  },
  {
    id: 'similar',
    chipLabel: '비슷한 공고',
    userQ: '내 이력서와 비슷한 공고는?',
    thinking: '비슷한 공고를 찾고 있어요…',
    substeps: ['이력서 스킬을 확인하고 있어요', '비슷한 공고를 비교하고 있어요', '유사도 순으로 정리하고 있어요'],
    icon: Compass,
    tool: {
      kind: 'list', label: '비슷한 공고 검색',
      items: [
        { name: '토스', sub: '백엔드 엔지니어', metric: '86%', pct: 86 },
        { name: '당근마켓', sub: '서버 개발자', metric: '81%', pct: 81 },
        { name: '우아한형제들', sub: '플랫폼 엔지니어', metric: '74%', pct: 74 },
      ],
    },
    answer: [
      { text: '이력서와 가장 비슷한 공고는 토스 백엔드예요(유사도 86%).', cite: '유사 공고 12건 · 2026-07-07' },
      { text: '다음은 당근마켓 서버 개발자예요(유사도 81%).', cite: '2026-07-07 기준' },
    ],
    confidenceN: 12, confidenceLevel: 3,
    followups: ['마감 임박 순으로 다시 보여줘', '유사도 기준을 낮춰서 더 찾아줘'],
  },
  {
    id: 'gap',
    chipLabel: '부족한 기술',
    userQ: '내가 부족한 기술이 뭐야?',
    thinking: '이력서와 시장 요구를 비교하고 있어요…',
    substeps: ['이력서와 시장 요구를 대조하고 있어요', '부족한 기술을 추려내고 있어요', '영향이 큰 순서로 정렬하고 있어요'],
    icon: Target,
    tool: {
      kind: 'list', label: '기술 갭 분석',
      items: [
        { name: 'TypeScript', metric: '+394건', rank: 1 },
        { name: 'AWS', metric: '+241건', rank: 2 },
        { name: 'Docker', metric: '+188건', rank: 3 },
      ],
    },
    answer: [
      { text: '가장 큰 갭은 TypeScript예요. 추가하면 매칭 공고가 394건 늘어나요.', cite: '미보유 기술 1순위 · 2026-07-07' },
      { text: '그다음은 AWS·Docker 순이에요.', cite: '커버리지 레이더 기준' },
    ],
    confidenceN: 794, confidenceLevel: 4,
    followups: ['TypeScript 배우면 얼마나 늘어나는지 보여줘', '전체 갭 리스트 다 보여줘'],
  },
  {
    id: 'cooccurrence',
    chipLabel: '같이 배울 기술',
    userQ: 'React 배우면 뭘 같이 알아야 해?',
    thinking: '함께 요구되는 기술을 찾고 있어요…',
    substeps: ['React 공고들을 모으고 있어요', '함께 쓰이는 기술을 찾고 있어요', '동반 빈도를 계산하고 있어요'],
    icon: Layers,
    tool: {
      kind: 'list', label: '동반 기술 분석',
      items: [
        { name: 'TypeScript', metric: '82%', pct: 82 },
        { name: 'Node.js', metric: '55%', pct: 55 },
        { name: 'Next.js', metric: '41%', pct: 41 },
      ],
    },
    answer: [
      { text: 'React를 요구하는 공고의 82%는 TypeScript도 같이 원해요.', cite: '동시출현율 · 공고 5,766건' },
      { text: 'Node.js·Next.js가 그 다음으로 자주 같이 나와요.', cite: '2026-07-07 기준' },
    ],
    confidenceN: 5766, confidenceLevel: 5,
    followups: ['TypeScript부터 배우는 순서 알려줘', 'Next.js 요구 공고만 보여줘'],
  },
  {
    id: 'rising',
    chipLabel: '뜨는 기술',
    userQ: '요즘 뜨는 기술 뭐야?',
    thinking: '관심도 변화를 확인하고 있어요…',
    substeps: ['최근 관심 신호를 살펴보고 있어요', '커뮤니티 언급 추이를 확인하고 있어요', '채용 수요와 비교하고 있어요'],
    icon: ArrowUpRight,
    tool: {
      kind: 'list', label: '관심도 상승 기술',
      items: [
        { name: 'Rust', metric: '관심 급증' },
        { name: 'Bun', metric: '관심 급증' },
        { name: 'Zig', metric: '완만한 상승' },
      ],
    },
    answer: [
      { text: 'Rust·Bun이 최근 커뮤니티 언급이 눈에 띄게 늘었어요.', cite: 'HN·GitHub 관심 신호 기준' },
      { text: '다만 아직 채용 수요로 크게 이어지진 않았어요.', cite: '참고용 신호 · 2026-07-07' },
    ],
    confidenceN: 41, confidenceLevel: 2,
    followups: ['Rust 공고는 실제로 몇 건이야?', '내 기술 스택이랑 관련 있어?'],
  },
  {
    id: 'certs',
    chipLabel: '필요한 자격증',
    userQ: '백엔드 직무에 필요한 자격증은?',
    thinking: '요구되는 자격증을 확인하고 있어요…',
    substeps: ['백엔드 공고를 모으고 있어요', '요구 자격증을 집계하고 있어요', '빈도 순으로 정리하고 있어요'],
    icon: Award,
    tool: {
      kind: 'list', label: '자격증 요구 현황',
      items: [
        { name: 'AWS Solutions Architect', metric: '1,451건' },
        { name: 'PMP', metric: '1,018건' },
        { name: 'CKA', metric: '134건' },
      ],
    },
    answer: [
      { text: '백엔드 공고에서 가장 많이 요구하는 자격증은 AWS SA예요.', cite: '공고 1,451건 · 2026-07-07' },
      { text: '보유 중이시면 이미 상위권이에요.', cite: '자격증 갭 분석 기준' },
    ],
    confidenceN: 1451, confidenceLevel: 5,
    followups: ['내가 가진 자격증이랑 비교해줘', 'PMP 요구하는 회사 보여줘'],
  },
  {
    id: 'company',
    chipLabel: '원하는 회사',
    userQ: 'Kotlin 원하는 회사 어디야?',
    thinking: '이 기술을 요구하는 회사를 찾고 있어요…',
    substeps: ['Kotlin 요구 공고를 찾고 있어요', '최근과 과거로 나누고 있어요', '응답률을 확인하고 있어요'],
    icon: Building2,
    tool: {
      kind: 'list', label: '기업 조회',
      items: [
        { name: '카카오', sub: '최근 채용', metric: '응답률 91%' },
        { name: '우아한형제들', sub: '최근 채용', metric: '응답률 84%' },
        { name: '토스', sub: '과거 채용', metric: '응답률 -' },
      ],
    },
    answer: [
      { text: '요즘 Kotlin을 원하는 곳은 카카오·우아한형제들이에요.', cite: '최근 180일 기준 · 2026-07-07' },
      { text: '토스는 예전엔 원했지만 최근엔 공고가 없었어요.', cite: '과거 180일 비교' },
    ],
    confidenceN: 63, confidenceLevel: 3,
    followups: ['지원하면 응답 잘 오는 곳만 보여줘', 'Kotlin 대신 Java로도 찾아줘'],
  },
  {
    id: 'whatif',
    chipLabel: '이거 배우면?',
    userQ: '쿠버네티스 배우면 어때?',
    thinking: '가상으로 계산해보고 있어요…',
    substeps: ['지금 매칭 공고를 세고 있어요', '쿠버네티스를 추가해보고 있어요', '차이를 계산하고 있어요'],
    icon: Zap,
    tool: { kind: 'compare', label: '가상 시뮬레이션', beforeLabel: '지금', before: 5120, afterLabel: '쿠버네티스 추가 시', after: 6033, deltaLabel: '+913건' },
    answer: [
      { text: '쿠버네티스를 추가하면 매칭 공고가 5,120건에서 6,033건으로 늘어나요.', cite: '913건 증가 · 국내 기준' },
      { text: '지금 갭 중에서 효과가 가장 큰 기술이에요.', cite: '2026-07-07 기준' },
    ],
    confidenceN: 82000, confidenceLevel: 5,
    followups: ['다른 기술로도 시뮬레이션해줘', '이 기술 배우는 순서도 알려줘'],
  },
  {
    id: 'region',
    chipLabel: '지역별 공고',
    userQ: '판교 쪽 공고 많아?',
    thinking: '지역별로 모아보고 있어요…',
    substeps: ['판교·강남 공고를 모으고 있어요', '반경으로 좁히고 있어요', '비중을 계산하고 있어요'],
    icon: MapPin,
    tool: { kind: 'stat', label: '지역 조회', big: 214, suffix: '건', caption: '판교·강남 반경 3km', sub: '국내 전체의 18%' },
    answer: [
      { text: '판교·강남 권역에만 214건이 몰려 있어요.', cite: '국내 공고 전체의 18% · 2026-07-07' },
      { text: '특히 판교는 스타트업 비중이 높아요.', cite: '기업 규모 분포 기준' },
    ],
    confidenceN: 214, confidenceLevel: 4,
    followups: ['지도에서 바로 보여줘', '다른 지역이랑 비교해줘'],
  },
]

type Phase = 'idle' | 'thinking' | 'retrieving' | 'streaming' | 'done'

function useCountUp(target: number, active: boolean, duration = 650) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) { setValue(0); return }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return value
}

/** 미니 스파크라인 — 조회 결과(JSON)를 그대로 라인차트로 렌더링 */
function MiniSpark({ points }: { points: number[] }) {
  const W = 108, H = 30, P = 3
  const max = Math.max(...points) * 1.1 || 1
  const min = Math.min(...points) * 0.9
  const x = (i: number) => P + (i * (W - P * 2)) / (points.length - 1)
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - P * 2)
  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <polyline points={line} fill="none" stroke="#2f61b8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ToolResultCard({ tool, Icon, active }: { tool: ToolResult; Icon: LucideIcon; active: boolean }) {
  const compareBefore = useCountUp(tool.kind === 'compare' ? tool.before : 0, active && tool.kind === 'compare')
  const compareAfter = useCountUp(tool.kind === 'compare' ? tool.after : 0, active && tool.kind === 'compare')
  const statBig = useCountUp(tool.kind === 'stat' ? tool.big : 0, active && tool.kind === 'stat')

  return (
    <div className="rag-tool">
      <div className="rag-tool__head"><Icon size={12} /> {tool.label}</div>

      {tool.kind === 'trend' && (
        <div className="rag-tool__stat">
          <b>{tool.n.toLocaleString()}</b>
          <span>{tool.unit}</span>
          <MiniSpark points={tool.spark} />
          <span className="rag-tool__delta">{tool.delta}</span>
        </div>
      )}

      {tool.kind === 'list' && (
        <div className="rag-tool__list">
          {tool.items.map((it) => (
            <div className="rag-tool__row" key={it.name}>
              {it.rank && <span className="rag-tool__rank">{it.rank}</span>}
              <span className="co">{it.name}</span>
              {it.sub && <span className="role">{it.sub}</span>}
              {it.pct !== undefined && (
                <span className="rag-tool__bar"><span style={{ width: `${it.pct}%` }} /></span>
              )}
              <span className="pct">{it.metric}</span>
            </div>
          ))}
        </div>
      )}

      {tool.kind === 'compare' && (
        <div className="rag-tool__compare">
          <div className="rag-tool__compare-side">
            <span className="lbl">{tool.beforeLabel}</span>
            <b>{compareBefore.toLocaleString()}</b>
          </div>
          <ArrowUpRight size={16} className="rag-tool__compare-arrow" />
          <div className="rag-tool__compare-side">
            <span className="lbl">{tool.afterLabel}</span>
            <b>{compareAfter.toLocaleString()}</b>
          </div>
          <span className="rag-tool__delta">{tool.deltaLabel}</span>
        </div>
      )}

      {tool.kind === 'stat' && (
        <div className="rag-tool__bigstat">
          <b>{statBig.toLocaleString()}{tool.suffix}</b>
          <div className="rag-tool__bigstat-meta">
            <span>{tool.caption}</span>
            <span className="muted">{tool.sub}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RagAssistantDemo() {
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [segIndex, setSegIndex] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [citeShown, setCiteShown] = useState<boolean[]>([])
  const [runId, setRunId] = useState(0)
  const [substepIdx, setSubstepIdx] = useState(0)

  const scenario = SCENARIOS[scenarioIdx]

  const play = (idx: number) => {
    setScenarioIdx(idx)
    setRunId((n) => n + 1)
  }

  useEffect(() => {
    setPhase('thinking')
    setSegIndex(0)
    setCharIdx(0)
    setCiteShown([])
    setSubstepIdx(0)
    const t = window.setTimeout(() => setPhase('retrieving'), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  useEffect(() => {
    if (phase !== 'retrieving') return
    const t = window.setTimeout(() => setPhase('streaming'), 900)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'thinking' && phase !== 'retrieving') return
    if (substepIdx >= scenario.substeps.length - 1) return
    const t = window.setTimeout(() => setSubstepIdx((n) => n + 1), 580)
    return () => window.clearTimeout(t)
  }, [phase, substepIdx, scenario])

  useEffect(() => {
    if (phase !== 'streaming') return
    const seg = scenario.answer[segIndex]
    if (!seg) { setPhase('done'); return }
    const chars = Array.from(seg.text)
    if (charIdx < chars.length) {
      const t = window.setTimeout(() => setCharIdx((n) => n + 1), 28)
      return () => window.clearTimeout(t)
    }
    if (!citeShown[segIndex]) {
      const t = window.setTimeout(() => {
        setCiteShown((prev) => { const next = [...prev]; next[segIndex] = true; return next })
      }, 140)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => { setSegIndex((n) => n + 1); setCharIdx(0) }, 280)
    return () => window.clearTimeout(t)
  }, [phase, segIndex, charIdx, citeShown, scenario])

  const dots = Array.from({ length: 5 }, (_, i) => i < scenario.confidenceLevel)
  const busy = phase === 'thinking' || phase === 'retrieving' || phase === 'streaming'

  return (
    <div className={`ax-card rag-shell${busy ? ' generating' : ''}`}>
      <div className="ax-card__halo" aria-hidden="true" />

      <div className="ax-head" style={{ marginBottom: 14 }}>
        <div className="ax-avatar"><Compass size={16} /></div>
        <div>
          <div className="nm">커리어 어시스턴트</div>
          <div className="st">
            {phase === 'idle' && '무엇이든 물어보세요'}
            {phase === 'thinking' && scenario.thinking}
            {phase === 'retrieving' && '찾은 내용을 정리하고 있어요…'}
            {(phase === 'streaming' || phase === 'done') && '데이터 기반 응답'}
          </div>
        </div>
      </div>

      <div className="ax-thread">
        <div className="ax-msg me">{scenario.userQ}</div>

        {(phase === 'thinking' || phase === 'retrieving') && (
          <div className="rag-ticker">
            <span className="rag-ticker__dot" />
            <span key={substepIdx} className="rag-ticker__text">{scenario.substeps[substepIdx]}</span>
          </div>
        )}

        {(phase === 'retrieving' || phase === 'streaming' || phase === 'done') && (
          <ToolResultCard tool={scenario.tool} Icon={scenario.icon} active />
        )}

        {(phase === 'streaming' || phase === 'done') && (
          <div className="ax-msg bot ax-msg--grounded">
            {scenario.answer.map((seg, i) => {
              if (i > segIndex) return null
              const chars = Array.from(seg.text)
              const isCurrent = i === segIndex
              const shownChars = isCurrent ? chars.slice(0, charIdx) : chars
              return (
                <span className="ax-seg" key={i}>
                  {shownChars.map((c, ci) => <span className="ax-char" key={ci}>{c}</span>)}
                  {isCurrent && charIdx < chars.length && <span className="ax-caret" />}
                  {(i < segIndex || citeShown[i]) && (
                    <span className="ax-inline-cite"><span className="dot" />{seg.cite}</span>
                  )}
                </span>
              )
            })}
          </div>
        )}

        {phase === 'done' && (
          <div className="rag-followthrough">
            <div className="ax-confidence">
              <span className="dots">{dots.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</span>
              근거 <b>{scenario.confidenceN.toLocaleString()}</b>건 기반
            </div>
            {scenario.followups.map((f) => (
              <button key={f} className="ax-followup">{f} <ChevronRight size={15} className="chev" /></button>
            ))}
            <div className="ax-feedback">
              이 답변이 도움됐나요?
              <button className="on"><ThumbsUp size={15} /></button>
              <button><ThumbsDown size={15} /></button>
            </div>
          </div>
        )}
      </div>

      <div className="rag-composer-row">
        <div className="ax-composer">
          <input placeholder="채용 시장에 대해 물어보세요" readOnly value={phase === 'idle' ? '' : scenario.userQ} />
          <button className="ax-send" onClick={() => play(scenarioIdx)}><Send size={16} /></button>
        </div>
        <div className="ax-suggests rag-prompts">
          {SCENARIOS.map((s, i) => (
            <button key={s.id} className={`ax-chip${i === scenarioIdx && phase !== 'idle' ? ' active' : ''}`} onClick={() => play(i)}>
              {s.chipLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
