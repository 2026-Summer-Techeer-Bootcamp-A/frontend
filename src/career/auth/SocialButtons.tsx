import { siGoogle, siGithub, siKakaotalk } from 'simple-icons'

const PROVIDERS = [
  { key: 'google', label: 'Google로 계속하기', icon: siGoogle },
  { key: 'github', label: 'GitHub로 계속하기', icon: siGithub },
  { key: 'kakao', label: '카카오로 계속하기', icon: siKakaotalk },
] as const

/** 소셜 로그인 버튼 — 백엔드 OAuth 미구현. 신뢰용 UI, 클릭 시 안내만. */
export default function SocialButtons({ onUnavailable }: { onUnavailable: (msg: string) => void }) {
  return (
    <div className="ss-social">
      {PROVIDERS.map((p) => (
        <button key={p.key} type="button" className="ss-social__btn" onClick={() => onUnavailable('소셜 로그인은 준비 중이에요')}>
          <span className="ss-social__ic">
            <svg viewBox="0 0 24 24" width={18} height={18} fill={`#${p.icon.hex}`} aria-hidden>
              <path d={p.icon.path} />
            </svg>
          </span>
          {p.label}
          <span className="ss-social__soon">준비 중</span>
        </button>
      ))}
    </div>
  )
}
