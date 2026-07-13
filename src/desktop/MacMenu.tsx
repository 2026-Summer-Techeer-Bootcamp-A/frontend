import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import './macmenu.css'

/* macOS 풀다운 메뉴(mg-menu) 문법을 우리 팔레트로 틴트한 범용 드롭다운.
   /design-system/apple-mac 의 글래스 메뉴를 참고하되 액센트는 #0b0b0c, 파괴적 액션은 #c8382d를 쓴다. */

export type MacMenuItem = {
  icon?: ReactNode
  label: string
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
}
export type MacMenuEntry = MacMenuItem | 'sep' | { header: { name: string; email: string } }

export default function MacMenu({
  open,
  onClose,
  items,
  anchor = 'right',
}: {
  open: boolean
  onClose: () => void
  items: MacMenuEntry[]
  anchor?: 'right' | 'left'
}) {
  const ref = useRef<HTMLDivElement>(null)

  // 외부 클릭·Escape로 닫기
  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`macmenu${anchor === 'left' ? ' macmenu--left' : ''}`}
      role="menu"
    >
      {items.map((entry, i) => {
        if (entry === 'sep') return <div key={i} className="macmenu__sep" role="separator" />
        if ('header' in entry) {
          return (
            <div key={i} className="macmenu__header">
              <span className="macmenu__header-name">{entry.header.name}</span>
              <span className="macmenu__header-email">{entry.header.email}</span>
            </div>
          )
        }
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={`macmenu__row${entry.destructive ? ' destructive' : ''}`}
            disabled={entry.disabled}
            onClick={() => {
              onClose()
              entry.onClick?.()
            }}
          >
            {entry.icon && <span className="macmenu__icon">{entry.icon}</span>}
            <span className="macmenu__label">{entry.label}</span>
          </button>
        )
      })}
    </div>
  )
}
