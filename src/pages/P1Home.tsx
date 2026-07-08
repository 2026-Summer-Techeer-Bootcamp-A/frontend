import { MapPin, Search, Bookmark } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { GoogleLogo, AmazonLogo, MicrosoftLogo, FigmaLogo } from '../components/Logos'
import './p1.css'

interface Job {
  role: string
  co: string
  loc: string
  tag: string
  salary: string
  logo: React.ReactNode
}

const popular: Job[] = [
  { role: 'UI Designer', co: 'Google', loc: 'California, USA', tag: 'Full Time', salary: '$18,000', logo: <GoogleLogo size={30} /> },
  { role: 'Product Designer', co: 'Amazon', loc: 'Seattle, USA', tag: 'Full Time', salary: '$16,000', logo: <AmazonLogo size={30} /> },
  { role: 'UX Researcher', co: 'Microsoft', loc: 'Remote', tag: 'Full Time', salary: '$15,000', logo: <MicrosoftLogo size={28} /> },
]

const suggested: Job[] = [
  { role: 'UX Researcher', co: 'Figma', loc: 'Miami,USA', tag: 'Full Time', salary: '$15,000', logo: <FigmaLogo size={26} /> },
]

function JobCard({ job }: { job: Job }) {
  return (
    <div className="p1card">
      <div className="p1card__logo">{job.logo}</div>
      <div className="p1card__mid">
        <div className="p1card__role">{job.role}</div>
        <div className="p1card__co">{job.co}</div>
        <div className="p1card__meta">
          <span className="p1card__loc">
            <MapPin size={13} /> {job.loc}
          </span>
          <span className="p1card__tag">{job.tag}</span>
        </div>
      </div>
      <div className="p1card__salary">
        <b>{job.salary}</b>
        <span>/Month</span>
      </div>
      <Bookmark className="p1card__bookmark" size={19} />
    </div>
  )
}

export default function P1Home() {
  return (
    <PhoneFrame stage="purple" statusTheme="light" homeIndicator="none">
      <div className="p1" style={{ paddingBottom: 120 }}>
        <p className="p1__hi">Hi, Pooja</p>
        <h1 className="p1__title">
          Let&rsquo;s Find Your
          <br />
          <span className="accent">Dream Job</span>
        </h1>

        <div className="p1__searchwrap">
          <div className="p1__field">
            <MapPin size={18} /> Location
          </div>
          <button className="p1__searchbtn">
            <Search size={18} /> Search Jobs
          </button>
        </div>

        <div className="p1__section">
          <h2>Popular Jobs</h2>
          <span className="p1__viewall">View All</span>
        </div>
        {popular.map((j) => (
          <JobCard key={j.role + j.co} job={j} />
        ))}

        <div className="p1__section">
          <h2>Suggested For You</h2>
          <span className="p1__viewall">View All</span>
        </div>
        {suggested.map((j) => (
          <JobCard key={j.role + j.co} job={j} />
        ))}
      </div>
      <BottomNav active="home" />
    </PhoneFrame>
  )
}
