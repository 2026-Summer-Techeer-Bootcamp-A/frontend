import { useEffect, useRef, useState } from 'react'
import { Building2, Search, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '../career/api'

type Results = Awaited<ReturnType<typeof searchApi.search>>
const EMPTY: Results = { postings: [], skills: [], companies: [], query: '' }

export default function GlobalSearch() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results>(EMPTY)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults(EMPTY); setOpen(false); return }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      searchApi.search(q, 5)
        .then((value) => { if (!controller.signal.aborted) { setResults(value); setOpen(true) } })
        .catch(() => { if (!controller.signal.aborted) setResults({ ...EMPTY, query: q }) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (path: string) => { setOpen(false); setQuery(''); navigate(path) }
  const hasResults = results.postings.length + results.skills.length + results.companies.length > 0

  return (
    <div ref={rootRef} style={{ position: 'relative', width: 320 }}>
      <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', border: '1px solid var(--c-line, #dedee3)', borderRadius: 10, background: 'var(--c-surface, #fff)' }}>
        <Search size={15} color="var(--c-muted)" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="공고 · 기술 · 기업 검색"
          aria-label="통합 검색"
          style={{ width: '100%', border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 13 }}
        />
        {loading && <span style={{ color: 'var(--c-muted)', fontSize: 11 }}>검색 중</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', zIndex: 300, top: 42, right: 0, width: 380, maxHeight: 480, overflowY: 'auto', padding: 8, border: '1px solid var(--c-line, #dedee3)', borderRadius: 14, background: 'var(--c-surface, #fff)', boxShadow: '0 18px 48px rgba(0,0,0,.16)' }}>
          {!hasResults && !loading && <div style={{ padding: 18, color: 'var(--c-muted)', fontSize: 13 }}>검색 결과가 없어요.</div>}
          {results.postings.length > 0 && <SearchSection title="공고">
            {results.postings.map((item) => <ResultButton key={item.id} onClick={() => go(`/job/${item.id}`)} title={item.title} meta={`${item.company} · ${item.pool}`} />)}
          </SearchSection>}
          {results.skills.length > 0 && <SearchSection title="기술">
            {results.skills.map((item) => <ResultButton key={item.canonical} icon={<Sparkles size={14} />} onClick={() => go(`/tech/${encodeURIComponent(item.canonical)}`)} title={item.canonical} meta={item.category ?? '기술'} />)}
          </SearchSection>}
          {results.companies.length > 0 && <SearchSection title="기업">
            {results.companies.map((item) => <ResultButton key={item.company} icon={<Building2 size={14} />} onClick={() => go(`/jobs?q=${encodeURIComponent(item.company)}`)} title={item.company} meta={`공고 ${item.posting_count}건`} />)}
          </SearchSection>}
        </div>
      )}
    </div>
  )
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ padding: '5px 0' }}><div style={{ padding: '5px 10px', color: 'var(--c-muted)', fontSize: 11, fontWeight: 700 }}>{title}</div>{children}</section>
}

function ResultButton({ title, meta, icon, onClick }: { title: string; meta: string; icon?: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: 0, borderRadius: 9, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>{icon}<span style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{title}</b><small style={{ color: 'var(--c-muted)' }}>{meta}</small></span></button>
}
