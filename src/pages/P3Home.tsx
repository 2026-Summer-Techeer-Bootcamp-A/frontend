import { SlidersHorizontal, Search, X, PenTool, Shield, BarChart3, ArrowUpRight } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import { GoogleLogo, AdobeLogo } from '../components/Logos'
import './p3.css'

function MatchCard({
  bg,
  logo,
  pay,
  per,
  co,
  role,
  applied,
  avatars,
}: {
  bg: string
  logo: React.ReactNode
  pay: string
  per: string
  co: string
  role: string
  applied: string
  avatars: string[]
}) {
  return (
    <div className="p3mcard" style={{ background: bg }}>
      <div className="p3mcard__row">
        <span className="p3mcard__logo">{logo}</span>
        <span className="p3mcard__pay">
          <b>{pay}</b>
          <span>{per}</span>
        </span>
      </div>
      <div className="p3mcard__co">{co}</div>
      <div className="p3mcard__role">{role}</div>
      <div className="p3mcard__applied">
        <span className="p3mcard__avatars">
          {avatars.map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </span>
        <small>{applied}</small>
      </div>
    </div>
  )
}

export default function P3Home() {
  return (
    <PhoneFrame stage="gray" statusTheme="light" homeIndicator="none" screenBg="#ffffff">
      <div className="p3" style={{ paddingBottom: 40 }}>
        <div className="p3__top">
          <div className="p3__profile">
            <span className="p3__avatar" />
            <span className="p3__hi">
              <small>Hi</small>
              <b>George</b>
            </span>
          </div>
          <div className="p3__filterbtn">
            <SlidersHorizontal size={22} />
          </div>
        </div>

        <div className="p3__hero">
          <h1>
            Matching
            <br />
            Jobs
          </h1>
          <div className="p3__searchbtn">
            <Search size={30} />
          </div>
        </div>

        <div className="p3__chips">
          <span className="p3__chip">
            UX Designer <X size={20} strokeWidth={2.6} />
          </span>
          <span className="p3__chip">
            Remote <X size={20} strokeWidth={2.6} />
          </span>
        </div>

        <div className="p3__label">Job matched</div>
        <div className="p3__hscroll">
          <MatchCard
            bg="#eaf0fb"
            logo={<GoogleLogo size={28} />}
            pay="$120"
            per="/h"
            co="Google"
            role="Led UX Designer"
            applied="80 Applied"
            avatars={['#7d93a9', '#a9856b']}
          />
          <MatchCard
            bg="#fdeceb"
            logo={<AdobeLogo size={26} />}
            pay="$150K"
            per="Year"
            co="Adobe"
            role="Sr. UX Designer"
            applied="60 Applied"
            avatars={['#c08b6a', '#8a7d6f']}
          />
          <MatchCard
            bg="#e9f6ef"
            logo={<GoogleLogo size={28} />}
            pay="$110"
            per="/h"
            co="Grab"
            role="Lead Designer"
            applied="40 Applied"
            avatars={['#6f9b8a', '#7d93a9']}
          />
        </div>

        <div className="p3__label">Job categories</div>
        <div className="p3__hscroll">
          <div className="p3cat">
            <div className="p3cat__icon" style={{ background: '#3b6bff' }}>
              <PenTool size={22} />
            </div>
            <div className="p3cat__name">Designer</div>
            <div className="p3cat__jobs">3.2k Jobs</div>
            <div className="p3cat__arrow">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="p3cat">
            <div className="p3cat__icon" style={{ background: '#f0413e' }}>
              <Shield size={22} />
            </div>
            <div className="p3cat__name">Security</div>
            <div className="p3cat__jobs">3.2k Jobs</div>
            <div className="p3cat__arrow">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="p3cat">
            <div className="p3cat__icon" style={{ background: '#12b76a' }}>
              <BarChart3 size={22} />
            </div>
            <div className="p3cat__name">Data</div>
            <div className="p3cat__jobs">2.8k Jobs</div>
            <div className="p3cat__arrow">
              <ArrowUpRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}
