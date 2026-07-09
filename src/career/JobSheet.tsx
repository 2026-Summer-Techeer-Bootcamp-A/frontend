import { useEffect, useState } from 'react'
import { FileText, Bookmark, MapPin, Briefcase } from 'lucide-react'
import { BottomSheet, MenuRow, MiniScore, matchGrad } from './kit'
import CompanyLogo from './CompanyLogo'
import data from '../data/careerData.json'
import { useResumesState } from './state'

type Job = (typeof data.postings)[number]
const tierClass = (t: string | null) => (t === '대기업' ? 't1' : t === '중견' ? 't2' : 't3')

function careerText(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

/** 공고 컨텍스트 시트 — 카드 탭 시 요약(전체 페이지 이동 대신). */
export default function JobSheet({
  job, open, onClose, onDetail,
}: { job: Job | null; open: boolean; onClose: () => void; onDetail: () => void }) {
  const { activeResume } = useResumesState()
  const activeSkills = activeResume ? activeResume.skills : []

  // 닫히는 애니메이션 도중에도 내용이 유지되도록 마지막 값을 붙잡아 둔다.
  // job을 바로 null로 지우면 시트가 내려가는 동안 내용이 먼저 사라져 "순간이동"처럼 보인다.
  const [shown, setShown] = useState(job)
  useEffect(() => { if (job) setShown(job) }, [job])
  const j = job ?? shown

  const held = j ? j.techs.filter((x) => activeSkills.includes(x)).slice(0, 4) : []
  const gap = j ? j.techs.filter((x) => !activeSkills.includes(x)).slice(0, 3) : []
  const matchHeld = j ? j.techs.filter((x) => activeSkills.includes(x)).length : 0
  const matchTotal = j ? j.techs.length : 0
  const matchPct = matchTotal ? Math.round((matchHeld / matchTotal) * 100) : 100

  return (
    <BottomSheet open={open} onClose={onClose}>
      {j && (
        <>
          <div className="lsheet__hd">
            <CompanyLogo logo={j.logo} name={j.company} size={46} radius={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lsheet__name cr-ellip">{j.company}</div>
              <div className="lsheet__role cr-ellip">{j.title}</div>
            </div>
            <MiniScore pct={matchPct} size={52} />
          </div>

          <div className="lsheet__tags">
            {j.tier && <span className={`cr-tier ${tierClass(j.tier)}`}>{j.tier}</span>}
            <span className="lsheet__tag"><MapPin size={13} /> {j.region || 'Remote'}</span>
            <span className="lsheet__tag"><Briefcase size={13} /> {careerText(j.careerMin, j.careerMax)}</span>
          </div>

          <div className="lsheet__bar" style={{ marginTop: 12 }}><i style={{ width: `${matchPct}%`, background: matchGrad(matchPct) }} /></div>
          <div className="lsheet__barlbl">요구 {matchTotal}개 중 {matchHeld}개 보유</div>

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
