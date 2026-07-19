import { MiniScore } from '../../../career/kit'
import { ddayInfo } from '../../../career/state'
import type { PostingCard } from '../../../career/api'

/** 3a 지원 가능 공고 카드 — Zone 2 "지금 지원할 만한 공고" 위젯의 HBars를 카드 스택으로
 * 교체한다. 데이터는 기존 위젯이 쓰던 matchedJobs(PostingCard[])를 그대로 재사용하고(새
 * API 없음), 매치율 링은 kit.tsx의 기존 MiniScore(다른 화면의 JobCardCompact가 이미 쓰는
 * 소형 원형 게이지)를 재사용한다. 카드 왼쪽 세로 액센트 보더 대신 링 색과 배경 틴트만 쓴다. */
export type ApplyCardJob = {
  job: PostingCard
  matchPct: number
  gapSkill: string | null
  dday: { d: number } | null
}

export function buildApplyCards(jobs: PostingCard[], mySkills: string[], asOf: string): ApplyCardJob[] {
  return jobs
    .map((job) => {
      const requiredCount = job.skills.length
      const matchPct = requiredCount > 0 ? Math.round(((job.matched_count ?? 0) / requiredCount) * 100) : 0
      const gap = job.skills.filter((s) => !mySkills.includes(s))
      const dday = job.close_date ? ddayInfo(job.close_date, asOf) : null
      return { job, matchPct, gapSkill: gap[0] ?? null, dday }
    })
    .sort((a, b) => b.matchPct - a.matchPct)
}

export function ApplyCardStack({ cards, onOpen }: { cards: ApplyCardJob[]; onOpen: (id: PostingCard['id']) => void }) {
  return (
    <div className="dov-avc">
      {cards.map(({ job, matchPct, gapSkill, dday }) => (
        <button key={job.id} type="button" className="dov-avc__card" onClick={() => onOpen(job.id)}>
          <span className="dov-avc__ring"><MiniScore pct={matchPct} size={44} /></span>
          <span className="dov-avc__main">
            <span className="dov-avc__co">{job.company ?? '회사명 미상'}</span>
            <span className="dov-avc__ti">{job.title}</span>
            {gapSkill && <span className="dov-avc__gap"><i />+{gapSkill}만 더</span>}
          </span>
          {dday && <span className="dov-avc__dday">D-{dday.d}</span>}
        </button>
      ))}
    </div>
  )
}
