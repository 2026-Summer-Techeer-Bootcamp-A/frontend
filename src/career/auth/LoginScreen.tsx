import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell, { BrandMark, BRAND_NAME } from './AuthShell'
import SocialButtons from './SocialButtons'
import { TextField, PasswordField, PrimaryButton, useToast } from '../formkit'
import { useAuth } from '../authStore'

export default function LoginScreen() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { show, node: toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

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
      navigate('/', { replace: true })
    } catch (err) {
      show(err instanceof Error ? err.message : '로그인에 실패했어요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="ss-authbody">
        <div className="ss-brand"><BrandMark /><span className="ss-brand__name">{BRAND_NAME}</span></div>
        <h1 className="ss-authtitle">다시 오셨네요</h1>
        <p className="ss-authsub">이메일로 로그인하고 내 커리어 점수를 확인하세요.</p>

        <form className="ss-form" onSubmit={submit}>
          <TextField
            label="이메일" type="email" inputMode="email" autoComplete="email"
            placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} error={errors.email}
          />
          <PasswordField
            label="비밀번호" autoComplete="current-password"
            placeholder="6자 이상" value={password}
            onChange={(e) => setPassword(e.target.value)} error={errors.password}
          />
          <PrimaryButton type="submit" loading={loading}>로그인</PrimaryButton>
        </form>

        <div className="ss-divider">또는</div>
        <SocialButtons onUnavailable={show} />

        <p className="ss-authswitch">
          계정이 없으신가요? <a onClick={() => navigate('/signup')}>회원가입</a>
        </p>
      </div>
      {toast}
    </AuthShell>
  )
}
