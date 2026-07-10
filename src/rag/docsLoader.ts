import { marked } from 'marked'
import hljs from 'highlight.js'

export interface TocItem { id: string; text: string; level: number }
export interface DocEntry { slug: string; title: string; order: number; html: string; toc: TocItem[] }
export interface DocTrack { id: 'learning' | 'journal'; label: string; docs: DocEntry[] }

// repo 루트 rag-development/ 를 eager raw 로드. vite.config의 server.fs.allow:['..'] 필요.
const learningRaw = import.meta.glob('../../../rag-development/rag-learning/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const journalRaw = import.meta.glob('../../../rag-development/rag-build-journal/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w가-힣\s-]/g, '').replace(/\s+/g, '-')
}

function parseDoc(path: string, raw: string): DocEntry {
  const file = path.split('/').pop() ?? path
  const slug = file.replace(/\.md$/, '')
  const orderMatch = slug.match(/^(\d+)/)
  const order = orderMatch ? Number(orderMatch[1]) : 999
  const firstH1 = raw.match(/^#\s+(.+)$/m)
  const title = firstH1 ? firstH1[1].trim() : slug

  const toc: TocItem[] = []
  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text)
    if (depth === 2 || depth === 3) toc.push({ id, text, level: depth })
    return `<h${depth} id="${id}">${text}</h${depth}>`
  }
  renderer.code = ({ text, lang }) => {
    const valid = lang && hljs.getLanguage(lang)
    const out = valid ? hljs.highlight(text, { language: lang! }).value : hljs.highlightAuto(text).value
    return `<pre class="doc-code"><code class="hljs">${out}</code></pre>`
  }
  const html = marked.parse(raw, { renderer, async: false }) as string
  return { slug, title, order, html, toc }
}

function buildTrack(id: DocTrack['id'], label: string, raw: Record<string, string>): DocTrack {
  const docs = Object.entries(raw).map(([p, r]) => parseDoc(p, r)).sort((a, b) => a.order - b.order)
  return { id, label, docs }
}

export function loadDocs(): DocTrack[] {
  return [
    buildTrack('learning', '개념서', learningRaw),
    buildTrack('journal', '구현기', journalRaw),
  ]
}
