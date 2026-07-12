import { Clock, Sparkles, TrendingUp, Megaphone } from 'lucide-react'
import { SubScreen } from '../charts'
import { SwitchRow, useToast } from '../formkit'
import { useSettings, type NotificationSettings } from '../settingsStore'
import '../smallscreens.css'

const ROWS: { key: keyof NotificationSettings; title: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'deadline', title: '마감 임박 알림', desc: '찜한 공고 마감 3일 전에 알려드려요', icon: <Clock size={17} /> },
  { key: 'newJobs', title: '새 맞춤 공고', desc: '내 기술과 잘 맞는 공고가 올라오면', icon: <Sparkles size={17} /> },
  { key: 'trend', title: '트렌드 · 시장 리포트', desc: '주간 기술 트렌드 요약', icon: <TrendingUp size={17} /> },
  { key: 'marketing', title: '마케팅 · 이벤트', desc: '혜택과 소식을 받아볼게요', icon: <Megaphone size={17} /> },
]

export default function SettingsNotifications() {
  const { settings, setNotification } = useSettings()
  const { show, node: toast } = useToast()

  return (
    <SubScreen title="알림 설정">
      <div className="ss-group" style={{ marginTop: 8 }}>
        <div className="ss-card ss-card--pad">
          {ROWS.map((r) => (
            <SwitchRow
              key={r.key}
              icon={r.icon}
              title={r.title}
              desc={r.desc}
              checked={settings.notifications[r.key]}
              onChange={(v) => { setNotification(r.key, v); show(v ? '켰어요' : '껐어요') }}
            />
          ))}
        </div>
        <div className="ss-about__note" style={{ textAlign: 'left', marginTop: 12 }}>
          기기 설정에서 알림을 꺼두면 위 설정과 무관하게 알림이 오지 않아요.
        </div>
      </div>
      {toast}
    </SubScreen>
  )
}
