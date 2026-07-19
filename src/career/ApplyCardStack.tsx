import { MiniScore } from './kit'
import { ddayInfo } from './state'
import type { PostingCard } from './api'

/** 3a 지원 가능 공고 카드 — 데스크톱 대시보드(Zone 2 "지금 지원할 만한 공고")와 모바일 홈
 * "바로 지원 후보" 섹션이 함께 쓰는 공용 컴포넌트다. career/ 아래 둔 이유는 두 화면 모두 이미
 * career/kit·career/state를 참조하고 있어 상대 경로가 가장 짧아지기 때문이다.
 * 두 화면의 원본 데이터 모델이 다르므로(데스크톱은 API로 받는 PostingCard, 모바일은
 * data/careerData.json에 이미 matchPct·gap이 계산되어 있는 정적 공고) 렌더링 컴포넌트와
 * ApplyCardJob 타입만 공유하고, 빌더 함수는 화면별로 각자 만든다. 카드 왼쪽 세로 액센트
 * 보더 대신 링 색과 배경 틴트만 쓴다. */
export type ApplyCardJob = {
  id: string | number
  company: string | null
  title: string
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
      return { id: job.id, company: job.company, title: job.title, matchPct, gapSkill: gap[0] ?? null, dday }
    })
    .sort((a, b) => b.matchPct - a.matchPct)
}

export function ApplyCardStack({ cards, onOpen }: { cards: ApplyCardJob[]; onOpen: (id: ApplyCardJob['id']) => void }) {
  return (
    <div className="dov-avc">
      {cards.map(({ id, company, title, matchPct, gapSkill, dday }) => (
        <button key={id} type="button" className="dov-avc__card" onClick={() => onOpen(id)}>
          <span className="dov-avc__ring"><MiniScore pct={matchPct} size={44} /></span>
          <span className="dov-avc__main">
            <span className="dov-avc__co">{company ?? '회사명 미상'}</span>
            <span className="dov-avc__ti">{title}</span>
            {gapSkill && <span className="dov-avc__gap"><i />+{gapSkill}만 더</span>}
          </span>
          {dday && <span className="dov-avc__dday">D-{dday.d}</span>}
        </button>
      ))}
    </div>
  )
}
