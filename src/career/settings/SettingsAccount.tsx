import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, KeyRound, UserX } from 'lucide-react'
import { SubScreen } from '../charts'
import { MenuRow, SectionHeader } from '../kit'
import { TextField, PrimaryButton, useToast } from '../formkit'
import { EmptyState } from '../states'
import { useAuth } from '../authStore'
import '../smallscreens.css'

export default function SettingsAccount() {
  const navigate = useNavigate()
  const { user, isAuthed, updateProfile } = useAuth()
  const { show, node: toast } = useToast()
  const [nickname, setNickname] = useState(user?.nickname ?? '')

  if (!isAuthed || !user) {
    return (
      <SubScreen title="계정 관리">
        <EmptyState
          icon={<LogIn size={26} />}
          title="로그인이 필요해요"
          desc="계정 정보를 보려면 먼저 로그인해주세요."
          actionLabel="로그인하기"
          onAction={() => navigate('/login')}
        />
      </SubScreen>
    )
  }

  const initial = (user.nickname || user.email)[0]?.toUpperCase() ?? '·'
  const dirty = nickname.trim() !== user.nickname && nickname.trim().length > 0

  return (
    <SubScreen title="계정 관리">
      <div className="ss-account">
        <span className="ss-account__avatar">{initial}</span>
        <span className="ss-account__email">{user.email}</span>
      </div>

      <div style={{ marginTop: 10 }}>
        <TextField label="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" />
      </div>
      <div style={{ marginTop: 14 }}>
        <PrimaryButton
          disabled={!dirty}
          onClick={() => { updateProfile({ nickname: nickname.trim() }); show('저장됐어요') }}
        >
          저장
        </PrimaryButton>
      </div>

      <SectionHeader title="보안" />
      <div className="kit-menulist">
        <MenuRow icon={<KeyRound size={18} />} tint="#5a86cf" label="비밀번호 변경" onClick={() => show('준비 중이에요')} />
        <MenuRow icon={<UserX size={18} />} label="회원 탈퇴" danger onClick={() => show('준비 중이에요')} />
      </div>
      <div style={{ height: 18 }} />
      {toast}
    </SubScreen>
  )
}
