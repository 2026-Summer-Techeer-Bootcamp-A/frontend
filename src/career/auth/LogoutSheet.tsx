import { LogOut } from 'lucide-react'
import { BottomSheet } from '../kit'
import { PrimaryButton } from '../formkit'

/** 로그아웃 확인 시트. 확인 시 onConfirm(로그아웃 + 이동)을 호출한다. */
export default function LogoutSheet({
  open, onClose, onConfirm,
}: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="ss-state" style={{ minHeight: 'auto', padding: '8px 6px 6px' }}>
        <span className="ss-state__ic ss-state__ic--warn"><LogOut size={26} /></span>
        <div className="ss-state__title">로그아웃 할까요?</div>
        <div className="ss-state__desc">다시 이용하려면 로그인이 필요해요.</div>
        <div className="ss-state__actions">
          <PrimaryButton variant="danger" onClick={onConfirm}>로그아웃</PrimaryButton>
          <PrimaryButton variant="ghost" onClick={onClose}>취소</PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  )
}
