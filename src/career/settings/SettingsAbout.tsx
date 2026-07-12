import { Compass, ScrollText, Mail, Star } from 'lucide-react'
import { SubScreen } from '../charts'
import { MenuRow } from '../kit'
import { useToast } from '../formkit'
import { BRAND_NAME } from '../auth/AuthShell'
import { APP_VERSION, APP_BUILD } from './about'
import '../smallscreens.css'

export default function SettingsAbout() {
  const { show, node: toast } = useToast()
  return (
    <SubScreen title="앱 정보">
      <div className="ss-about">
        <span className="ss-about__mark"><Compass size={34} strokeWidth={2.2} /></span>
        <span className="ss-about__name">{BRAND_NAME}</span>
        <span className="ss-about__ver">버전 {APP_VERSION} ({APP_BUILD})</span>
      </div>

      <div className="kit-menulist" style={{ marginTop: 8 }}>
        <MenuRow icon={<Star size={18} />} tint="#c76a2e" label="앱 평가하기" onClick={() => show('준비 중이에요')} />
        <MenuRow icon={<ScrollText size={18} />} tint="#7c7f88" label="오픈소스 라이선스" onClick={() => show('준비 중이에요')} />
        <MenuRow icon={<Mail size={18} />} tint="#2f61b8" label="문의하기" onClick={() => show('준비 중이에요')} />
      </div>

      <div className="ss-about__note">
        이 앱은 공개된 채용 데이터를 분석해 커리어 인사이트를 제공하는 데모예요.
        수집한 이력서 원문은 저장하지 않아요.
      </div>
      {toast}
    </SubScreen>
  )
}
