// 제네릭 시각 데모 렌더러 — Do & Don't 가이드, Like Apple 페이지가 공유.
export interface StageSpec {
  kind: 'swatches' | 'text' | 'pill' | 'box' | 'emoji' | 'bars' | 'stat' | 'avatarRow'
  colors?: string[]
  values?: number[]
  content?: string
  style?: Record<string, string | number>
  inner?: { content: string; style?: Record<string, string | number> }
  items?: string[]
  value?: string
  label?: string
  caption?: string
}

export default function Stage({ spec }: { spec: StageSpec }) {
  switch (spec.kind) {
    case 'swatches':
      return (
        <div className="stage-swatches">
          {(spec.colors ?? []).map((c, i) => (
            <i key={i} style={{ background: c }} />
          ))}
        </div>
      )
    case 'text':
      return <div style={spec.style as React.CSSProperties}>{spec.content}</div>
    case 'pill':
      return (
        <span style={{ display: 'inline-flex', ...(spec.style as React.CSSProperties) }}>
          {spec.content}
        </span>
      )
    case 'box':
      return (
        <div style={spec.style as React.CSSProperties}>
          {spec.content}
          {spec.inner && (
            <div style={{ marginTop: 10, ...(spec.inner.style as React.CSSProperties) }}>
              {spec.inner.content}
            </div>
          )}
        </div>
      )
    case 'emoji':
      return (
        <div className="stage-emoji">
          {(spec.items ?? []).map((it, i) =>
            /\p{Emoji}/u.test(it) && it.length <= 4 ? (
              <span key={i}>{it}</span>
            ) : (
              <span key={i} className="txt">{it}</span>
            ),
          )}
        </div>
      )
    case 'bars':
      return (
        <div className="stage-bars">
          {(spec.values ?? []).map((v, i) => (
            <i key={i} style={{ height: `${v}%`, background: spec.colors?.[i] ?? '#0b0b0c' }} />
          ))}
        </div>
      )
    case 'stat':
      return (
        <div className="stage-stat">
          <div className="v">{spec.value}</div>
          <div className="l">{spec.label}</div>
          {spec.caption && <div className="c">{spec.caption}</div>}
        </div>
      )
    case 'avatarRow':
      return (
        <div className="stage-avatar">
          {(spec.colors ?? []).map((c, i) => (
            <i key={i} style={{ background: c }} />
          ))}
        </div>
      )
    default:
      return null
  }
}
