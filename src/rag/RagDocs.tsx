import { useMemo, useState } from 'react'
import { BookOpen, Wrench } from 'lucide-react'
import { loadDocs } from './docsLoader'
import 'highlight.js/styles/github.css'
import './rag-docs.css'

export default function RagDocs() {
  const tracks = useMemo(() => loadDocs(), [])
  const flat = tracks.flatMap((t) => t.docs.map((d) => ({ track: t.id, slug: d.slug })))
  const [active, setActive] = useState(flat[0]?.slug ?? '')

  const current = tracks.flatMap((t) => t.docs).find((d) => d.slug === active) ?? null

  return (
    <div className="rd">
      <aside className="rd__side">
        <div className="rd__brand">RAG 학습 문서</div>
        {tracks.map((t) => (
          <div key={t.id} className="rd__track">
            <div className="rd__track-h">{t.id === 'learning' ? <BookOpen size={13} /> : <Wrench size={13} />} {t.label}</div>
            {t.docs.length === 0 && <div className="rd__empty">아직 문서 없음</div>}
            {t.docs.map((d) => (
              <button key={d.slug} className={`rd__link${d.slug === active ? ' on' : ''}`} onClick={() => setActive(d.slug)}>
                {d.title}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="rd__main">
        {current
          ? <article className="rd__doc" dangerouslySetInnerHTML={{ __html: current.html }} />
          : <div className="rd__empty rd__empty--big">문서를 준비 중이에요.</div>}
      </main>

      <nav className="rd__toc">
        {current?.toc.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={`rd__toc-link rd__toc-link--l${t.level}`}>{t.text}</a>
        ))}
      </nav>
    </div>
  )
}
