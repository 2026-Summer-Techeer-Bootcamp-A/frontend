import { Bell, Search, SlidersHorizontal, Heart, MoreVertical, ArrowUpRight, Home, MessageCircle, Sparkles, Compass, User } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import { GoogleLogo, MicrosoftLogo } from '../components/Logos'
import './p2.css'

const screenBg = 'linear-gradient(180deg, #d3e2ee 0%, #dfeaf3 35%, #cadcee 100%)'

function Avatars() {
  const colors = ['#8aa0b6', '#b6927a', '#7a9b8a']
  return (
    <span className="p2card__avatars">
      {colors.map((c) => (
        <span key={c} style={{ background: c }} />
      ))}
    </span>
  )
}

export default function P2Home() {
  return (
    <PhoneFrame stage="blue" statusTheme="light" homeIndicator="dark" time="9:40 PM" screenBg={screenBg}>
      <div className="p2" style={{ paddingBottom: 110 }}>
        <div className="p2__topbar">
          <div className="p2__hey">
            <span
              className="p2__avatar"
              style={{ background: 'linear-gradient(135deg, #7e93a8, #566b80)' }}
            />
            <span>Hey&nbsp;👋</span>
          </div>
          <div className="p2__bell">
            <Bell size={20} />
          </div>
        </div>

        <p className="p2__label">Dream Job Found</p>
        <h1 className="p2__title">
          Hey, Discover
          <br />
          New Job Matches
        </h1>

        <div className="p2__searchrow">
          <div className="p2__search">
            <Search size={19} /> Search...
          </div>
          <div className="p2__filter">
            <SlidersHorizontal size={20} />
          </div>
        </div>

        <div className="p2card">
          <div className="p2card__top">
            <span className="p2card__logo">
              <GoogleLogo size={30} />
            </span>
            <span className="p2card__co">Google</span>
            <span className="p2card__actions">
              <span className="p2card__circle">
                <Heart size={19} />
              </span>
              <span className="p2card__circle">
                <MoreVertical size={19} />
              </span>
            </span>
          </div>
          <div className="p2card__role">
            Software Development
            <br />
            Engineer Pro
          </div>
          <div className="p2card__tags">
            <span className="p2card__tag">SF/Remote</span>
            <span className="p2card__tag">Full time</span>
            <span className="p2card__tag">Engineer Pro</span>
          </div>
          <div className="p2card__pay">
            $150k <small>/Year</small>
          </div>
          <div className="p2card__foot">
            <span className="p2card__apply">
              <Avatars /> 20+ Apply
            </span>
            <span className="p2card__details">
              See Details <ArrowUpRight size={17} />
            </span>
          </div>
        </div>

        <div className="p2card">
          <div className="p2card__top">
            <span className="p2card__logo">
              <MicrosoftLogo size={28} />
            </span>
            <span className="p2card__co">Microsoft</span>
            <span className="p2card__actions">
              <span className="p2card__circle">
                <Heart size={19} />
              </span>
              <span className="p2card__circle">
                <MoreVertical size={19} />
              </span>
            </span>
          </div>
          <div className="p2card__role">Product Designer</div>
        </div>
      </div>

      <div className="p2nav">
        <span className="p2nav__item p2nav__item--active">
          <Home size={22} />
        </span>
        <span className="p2nav__item">
          <MessageCircle size={22} />
        </span>
        <span className="p2nav__item">
          <Sparkles size={22} />
        </span>
        <span className="p2nav__item">
          <Compass size={22} />
        </span>
        <span className="p2nav__item">
          <User size={22} />
        </span>
      </div>
    </PhoneFrame>
  )
}
