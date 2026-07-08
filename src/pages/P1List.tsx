import { Search, SlidersHorizontal, Bookmark, MapPin } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { NetflixLogo, MicrosoftLogo, FigmaLogo } from '../components/Logos'
import './p1.css'
import './p1list.css'

interface Listing {
  role: string
  co: string
  tags: string[]
  loc: string
  salary: string
  logo: React.ReactNode
  logoBg: string
}

const listings: Listing[] = [
  {
    role: 'Product Designer',
    co: 'Netflix',
    tags: ['Design', 'Full Time', 'Remote'],
    loc: 'California, USA',
    salary: '$18,000',
    logo: <NetflixLogo size={30} />,
    logoBg: '#fff',
  },
  {
    role: 'Sr. UX Researcher',
    co: 'Microsoft',
    tags: ['UX Designer', 'Full Time', 'Location'],
    loc: 'Bangaluru, India',
    salary: '$15,000',
    logo: <MicrosoftLogo size={28} />,
    logoBg: '#fff',
  },
  {
    role: 'UI/Designer',
    co: 'Figma',
    tags: ['Design', 'Full Time', 'Remote'],
    loc: 'Bangaluru, India',
    salary: '$15,000',
    logo: <FigmaLogo size={26} />,
    logoBg: '#f4f4f8',
  },
]

export default function P1List() {
  return (
    <PhoneFrame stage="purple" statusTheme="light" homeIndicator="none">
      <div className="p1l" style={{ paddingBottom: 120 }}>
        <div className="p1l__search">
          <Search size={19} color="#9a9fac" />
          <span className="p1l__search-input">What are you craving?</span>
          <span className="p1l__search-filter">
            <SlidersHorizontal size={17} />
          </span>
        </div>

        <h1 className="p1l__count">15 Jobs Available</h1>

        {listings.map((job) => (
          <div className="p1lcard" key={job.role + job.co}>
            <div className="p1lcard__top">
              <div className="p1lcard__logo" style={{ background: job.logoBg }}>
                {job.logo}
              </div>
              <div>
                <div className="p1lcard__role">{job.role}</div>
                <div className="p1lcard__co">{job.co}</div>
              </div>
              <Bookmark className="p1lcard__bm" size={20} />
            </div>
            <div className="p1lcard__tags">
              {job.tags.map((t) => (
                <span className="p1lcard__tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <div className="p1lcard__divider" />
            <div className="p1lcard__foot">
              <span className="p1lcard__loc">
                <MapPin size={16} /> {job.loc}
              </span>
              <span className="p1lcard__salary">
                <b>{job.salary}</b>
                <span>/Month</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="home" />
    </PhoneFrame>
  )
}
