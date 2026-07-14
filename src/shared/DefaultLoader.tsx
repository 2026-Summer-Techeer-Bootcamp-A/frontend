import { useEffect, useState } from 'react'

export default function DefaultLoader({ size = 'small' }: { size?: 'small' | 'large' }) {
  const [visible, setVisible] = useState(false)

  // 150ms 미세 지연 노출을 적용하여 극히 짧은 로딩 속도 시의 화면 튀는 깜빡임 방지
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  const isLarge = size === 'large'
  const containerStyle: React.CSSProperties = isLarge
    ? {
        position: 'fixed',
        inset: 0,
        background: 'var(--bg, #f8fafc)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        gap: 16,
        animation: 'loader-fade-in 0.25s ease-out forwards',
      }
    : {
        width: '100%',
        height: '240px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'loader-fade-in 0.2s ease-out forwards',
      }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes loader-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes loader-spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <svg
        style={{
          width: isLarge ? 48 : 32,
          height: isLarge ? 48 : 32,
          color: 'var(--c-accent, #3b82f6)',
          animation: 'loader-spin 0.8s linear infinite',
        }}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="42 20"
          strokeLinecap="round"
        />
      </svg>
      {isLarge && (
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink, #0f172a)', opacity: 0.8 }}>
          필요한 리소스를 불러오는 중입니다
        </span>
      )}
    </div>
  )
}
