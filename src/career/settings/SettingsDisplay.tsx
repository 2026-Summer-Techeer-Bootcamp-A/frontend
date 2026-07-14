import { FileText } from 'lucide-react'
import { SubScreen } from '../charts'
import { SwitchRow, useToast } from '../formkit'
import { useSettings } from '../settingsStore'
import '../smallscreens.css'

export default function SettingsDisplay() {
  const { settings, setRichOnly } = useSettings()
  const { show, node: toast } = useToast()

  return (
    <SubScreen title="표시 설정">
      <div className="ss-group" style={{ marginTop: 8 }}>
        <div className="ss-card ss-card--pad">
          <SwitchRow
            icon={<FileText size={17} />}
            tint="#0b0b0c"
            title="풍부한 정보가 있는 공고만 보기"
            desc="설명이 부실한 공고를 목록에서 숨겨요."
            checked={settings.richOnly}
            onChange={(v) => { setRichOnly(v); show(v ? '켰어요' : '껐어요') }}
          />
        </div>
      </div>
      {toast}
    </SubScreen>
  )
}
