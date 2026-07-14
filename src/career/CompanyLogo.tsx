import { useState } from 'react'

interface Props {
  logo?: string
  name: string
  size?: number
  radius?: number
  style?: React.CSSProperties
}

/** 실제 로고 이미지 → 실패 시 회사 이니셜 박스로 폴백 */
export default function CompanyLogo({ logo, name, size = 44, radius = 12, style }: Props) {
  const [broken, setBroken] = useState(false)
  const base: React.CSSProperties = { width: size, height: size, borderRadius: radius, flex: 'none', ...style }
  if (logo && !broken) {
    return (
      <img
        src={logo}
        alt={name}
        loading="lazy"
        onError={() => setBroken(true)}
        style={{ ...base, objectFit: 'cover', background: '#fff', border: '1px solid #eef0f4' }}
      />
    )
  }
  return (
    <div
      style={{
        ...base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--c-chipbg)',
        color: 'var(--c-chiptext)',
        fontWeight: 800,
        fontSize: size * 0.42,
      }}
    >
      {name.slice(0, 1)}
    </div>
  )
}
