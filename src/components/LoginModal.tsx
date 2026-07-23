import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Lock, AlertCircle } from 'lucide-react'
import { TextField, PasswordField, PrimaryButton } from '../career/formkit'
import { useAuth } from '../career/authStore'
import './LoginModal.css'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string
  onSuccess?: () => void
}

export default function LoginModal({
  isOpen,
  onClose,
  message = '사용하려면 로그인이 필요합니다',
  onSuccess,
}: LoginModalProps) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!email.trim()) next.email = '이메일을 입력해주세요'
    if (!password) next.password = '비밀번호를 입력해주세요'
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    try {
      await login(email.trim(), password)
      setEmail('')
      setPassword('')
      setErrors({})
      if (onSuccess) {
        onSuccess()
      } else {
        onClose()
      }
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignupClick = () => {
    onClose()
    navigate('/signup')
  }

  return (
    <div className="login-modal__backdrop" onClick={onClose}>
      <div
        className="login-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label="로그인 모달"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        <div className="login-modal__header">
          <div className="login-modal__icon-wrap">
            <Lock size={22} />
          </div>
          <h2 className="login-modal__title">로그인</h2>
          <p className="login-modal__sub">
            AI 로드맵, 커리어 어시스턴트 등 AI 관련 기능은 로그인 후 이용하실 수 있습니다.
          </p>
        </div>

        <div className="login-modal__alert-banner" role="alert">
          <AlertCircle size={16} className="login-modal__alert-icon" />
          <span>{message}</span>
        </div>

        <form className="login-modal__form" onSubmit={submit}>
          {errors.general && (
            <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
              {errors.general}
            </div>
          )}
          <TextField
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <PasswordField
            label="비밀번호"
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <PrimaryButton type="submit" loading={loading} style={{ marginTop: '8px' }}>
            로그인하기
          </PrimaryButton>
        </form>

        <div className="login-modal__footer">
          계정이 없으신가요?
          <span className="login-modal__switch-link" onClick={handleSignupClick}>
            회원가입
          </span>
        </div>
      </div>
    </div>
  )
}
