import { FileText, Bookmark, MapPin, Briefcase } from 'lucide-react'
import { BottomSheet, MenuRow, MiniScore } from './kit'
import CompanyLogo from './CompanyLogo'
import data from '../data/careerData.json'

type Job = (typeof data.postings)[number]
const RESUME: string[] = data.resume.skills
const tierClass = (t: string | null) => (t === '대기업' ? 't1' : t === '중견' ? 't2' : 't3')

function careerText(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

/** 공고 컨텍스트 시트 — 카드 탭 시 요약(전체 페이지 이동 대신). */
export default function JobSheet({
  job, open, onClose, onDetail,
}: { job: Job | null; open: boolean; onClose: () => void; onDetail: () => void }) {
  const held = job ? job.techs.filter((x) => RESUME.includes(x)).slice(0, 4) : []
  const gap = job ? job.gap.slice(0, 3) : []
  return (
    <BottomSheet open={open} onClose={onClose}>
      {job && (
        <>
          <div className="lsheet__hd">
            <CompanyLogo logo={job.logo} name={job.company} size={46} radius={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lsheet__name cr-ellip">{job.company}</div>
              <div className="lsheet__role cr-ellip">{job.title}</div>
            </div>
            <MiniScore pct={job.matchPct} size={52} />
          </div>

          <div className="lsheet__tags">
            {job.tier && <span className={`cr-tier ${tierClass(job.tier)}`}>{job.tier}</span>}
            <span className="lsheet__tag"><MapPin size={13} /> {job.region || 'Remote'}</span>
            <span className="lsheet__tag"><Briefcase size={13} /> {careerText(job.careerMin, job.careerMax)}</span>
          </div>

          <div className="lsheet__bar" style={{ marginTop: 12 }}><i style={{ width: `${job.matchPct}%` }} /></div>
          <div className="lsheet__barlbl">요구 {job.matchTotal}개 중 {job.matchHeld}개 보유</div>

          <div className="cr-chips" style={{ marginTop: 8 }}>
            {held.map((s) => <span key={s} className="cr-chip held">{s}</span>)}
            {gap.map((s) => <span key={s} className="cr-chip gap">{s}</span>)}
          </div>

          <div className="kit-menulist" style={{ marginTop: 14 }}>
            <MenuRow icon={<FileText size={18} />} label="공고 상세 전체보기" onClick={onDetail} />
            <MenuRow icon={<Bookmark size={18} />} label="저장" />
          </div>
        </>
      )}
    </BottomSheet>
  )
}
