import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp } from 'lucide-react'
import { SubScreen, PoolToggle } from './charts'
import { CardModeToggle, JobCardCompact, type CardMode } from './kit'
import { JobCard } from './CareerDashboard'
import CompanyLogo from './CompanyLogo'
import data from '../data/careerData.json'

type Pool = '국내' | '국외'
type Sort = 'match' | 'tier' | 'latest'
const TIER_RANK: Record<string, number> = { 대기업: 0, 중견: 1, 중소: 2 }
const tierRank = (t: string | null) => (t && t in TIER_RANK ? TIER_RANK[t] : 3)

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

const SORTS: { key: Sort; label: string }[] = [
  { key: 'match', label: '매칭순' },
  { key: 'tier', label: '규모순' },
  { key: 'latest', label: '최신순' },
]

export default function JobsScreen() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [pool, setPool] = useState<Pool>('국내')
  const [mode, setMode] = useState<CardMode>('full')
  const [sort, setSort] = useState<Sort>('match')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    let arr = data.postings.filter((p) => p.pool === pool)
    if (s) arr = arr.filter((p) => (p.company + ' ' + p.title).toLowerCase().includes(s))
    return [...arr].sort((a, b) => {
      if (sort === 'tier') return tierRank(a.tier) - tierRank(b.tier) || b.matchPct - a.matchPct
      if (sort === 'latest') return (b.postDate || '').localeCompare(a.postDate || '')
      return b.matchPct - a.matchPct
    })
  }, [q, pool, sort])

  return (
    <SubScreen title="채용 공고">
      <div className="scr-searchbar">
        <Search size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="회사 · 공고 검색" />
      </div>

      <div className="scr-toolbar" style={{ justifyContent: 'space-between' }}>
        <PoolToggle pool={pool} onChange={setPool} />
        <CardModeToggle mode={mode} onChange={setMode} />
      </div>
      <div className="scr-chipsel" style={{ marginTop: 10 }}>
        {SORTS.map((s) => (
          <button key={s.key} className={sort === s.key ? 'on' : ''} onClick={() => setSort(s.key)}>{s.label}</button>
        ))}
      </div>

      <div className="scr-asof" style={{ marginTop: 12 }}>{list.length}건</div>

      <div style={{ marginTop: 8 }}>
        {list.length === 0 ? (
          <div className="cr-empty">검색 결과가 없어요.</div>
        ) : mode === 'compact' ? (
          list.map((p) => (
            <JobCardCompact
              key={p.id}
              job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
              logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
              onOpen={() => navigate(`/job/${data.postings.indexOf(p)}`)}
            />
          ))
        ) : (
          list.map((p) => <JobCard key={p.id} p={p} onOpen={() => navigate(`/job/${data.postings.indexOf(p)}`)} />)
        )}
      </div>
      <div style={{ height: 20 }} />

      <button
        className="scr-totop" aria-label="최상단으로"
        onClick={(e) => (e.currentTarget.closest('.screen-scroll') as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronUp size={20} />
      </button>
    </SubScreen>
  )
}
