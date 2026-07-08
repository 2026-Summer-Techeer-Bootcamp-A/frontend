import type { ReactNode } from 'react'

// 위젯 공통 프레임 — 후보 태그 · 제목 · 헤드라인 카피 · 본문 · 정직 배지
export function WidgetFrame({
  tag, title, headline, aside, children, note, asOf, n, scopeBadge,
}: {
  tag: string
  title: string
  headline: ReactNode
  aside?: ReactNode
  children: ReactNode
  note: string
  asOf: string
  n: number
  scopeBadge?: string
}) {
  return (
    <section className="wg" id={tag.replace(/\s/g, '')}>
      <header className="wg__head">
        <div>
          <span className="wg__tag">{tag}</span>
          {scopeBadge && <span className="wg__scopebadge">{scopeBadge}</span>}
          <h3 className="wg__title">{title}</h3>
        </div>
        {aside}
      </header>
      <p className="wg__headline">{headline}</p>
      <div className="wg__body">{children}</div>
      <footer className="wg__foot">
        <span className="wg__asof">기준일 {asOf}</span>
        <span className="wg__dot" />
        <span>N = {n.toLocaleString()}</span>
        <span className="wg__note">{note}</span>
      </footer>
    </section>
  )
}
