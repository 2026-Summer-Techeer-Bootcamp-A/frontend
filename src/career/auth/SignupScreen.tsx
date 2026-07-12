import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell, { BrandMark, BRAND_NAME } from './AuthShell'
import SocialButtons from './SocialButtons'
import { TextField, PasswordField, PrimaryButton, useToast } from '../formkit'
import { useAuth } from '../authStore'
import { isEmail } from '../api'

export default function SignupScreen() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const { show, node: toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!isEmail(email.trim())) next.email = '이메일 형식을 확인해주세요'
    if (password.length < 6) next.password = '비밀번호는 6자 이상이에요'
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    try {
      await signup(email.trim(), password, nickname)
      navigate('/', { replace: true })
    } catch (err) {
      show(err instanceof Error ? err.message : '가입에 실패했어요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="ss-authbody">
        <div className="ss-brand"><BrandMark /><span className="ss-brand__name">{BRAND_NAME}</span></div>
        <h1 className="ss-authtitle">시작하기</h1>
        <p className="ss-authsub">30초면 충분해요. 이력서를 올리면 바로 점수가 나와요.</p>

        <form className="ss-form" onSubmit={submit}>
          <TextField
            label="이메일" type="email" inputMode="email" autoComplete="email"
            placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} error={errors.email}
          />
          <PasswordField
            label="비밀번호" autoComplete="new-password"
            placeholder="6자 이상" value={password}
            onChange={(e) => setPassword(e.target.value)} error={errors.password}
          />
          <TextField
            label="닉네임" autoComplete="nickname" placeholder="비워두면 이메일 앞부분을 써요"
            value={nickname} onChange={(e) => setNickname(e.target.value)}
            hint="마이 화면과 인사말에 표시돼요"
          />
          <PrimaryButton type="submit" loading={loading}>가입하고 시작하기</PrimaryButton>
        </form>

        <div className="ss-divider">또는</div>
        <SocialButtons onUnavailable={show} />

        <p className="ss-authswitch">
          이미 계정이 있으신가요? <a onClick={() => navigate('/login')}>로그인</a>
        </p>
      </div>
      {toast}
    </AuthShell>
  )
}
