import { useEffect, useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import './smallscreens.css'

/* 자잘한 화면(인증·설정·상태) 공용 폼 프리미티브. DS 토큰(--c-*) 위에서 동작한다. */

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
  hint?: string
}

export function TextField({ label, error, hint, id, ...rest }: TextFieldProps) {
  const inputId = id ?? `f-${label}`
  return (
    <label className="ss-field" htmlFor={inputId}>
      <span className="ss-field__label">{label}</span>
      <input id={inputId} className={`ss-field__input${error ? ' err' : ''}`} {...rest} />
      {error ? <span className="ss-field__err">{error}</span> : hint ? <span className="ss-field__hint">{hint}</span> : null}
    </label>
  )
}

export function PasswordField({ label, error, hint, id, ...rest }: Omit<TextFieldProps, 'type'>) {
  const [show, setShow] = useState(false)
  const inputId = id ?? `f-${label}`
  return (
    <label className="ss-field" htmlFor={inputId}>
      <span className="ss-field__label">{label}</span>
      <span className="ss-field__wrap">
        <input id={inputId} type={show ? 'text' : 'password'} className={`ss-field__input${error ? ' err' : ''}`} {...rest} />
        <button type="button" className="ss-field__eye" onClick={() => setShow((s) => !s)} aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error ? <span className="ss-field__err">{error}</span> : hint ? <span className="ss-field__hint">{hint}</span> : null}
    </label>
  )
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: 'primary' | 'ghost' | 'danger'
}

export function PrimaryButton({ children, loading, variant = 'primary', className = '', disabled, ...rest }: BtnProps) {
  return (
    <button className={`ss-btn ss-btn--${variant} ${className}`.trim()} disabled={disabled || loading} {...rest}>
      {loading ? <span className="ss-spinner" aria-hidden /> : children}
    </button>
  )
}

/* iOS 스타일 토글 스위치. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`ss-switch${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ss-switch__knob" />
    </button>
  )
}

/* 설정에서 쓰는 스위치 행(제목 + 설명 + 토글).
   tint: 데스크톱(macOS 설정 문법)에서 아이콘 스쿼클 색으로 쓰는 CSS 변수 —
   모바일 CSS는 참조하지 않아 모바일 렌더 결과는 불변이다. */
export function SwitchRow({
  title, desc, checked, onChange, icon, tint,
}: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; icon?: ReactNode; tint?: string }) {
  return (
    <div className="ss-swrow">
      {icon && <span className="ss-swrow__ic" style={tint ? ({ '--menu-tint': tint } as React.CSSProperties) : undefined}>{icon}</span>}
      <span className="ss-swrow__body">
        <span className="ss-swrow__t">{title}</span>
        {desc && <span className="ss-swrow__d">{desc}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

/* 가벼운 토스트 — "준비 중"/"저장됨" 같은 짧은 피드백용. 화면 하단에서 슬라이드. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(id)
  }, [msg])
  const node = <div className={`ss-toast${msg ? ' show' : ''}`} role="status">{msg}</div>
  return { show: setMsg, node }
}
