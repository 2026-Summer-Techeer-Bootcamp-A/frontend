import { useMemo } from 'react'
import type { PostingDetail } from '../api'
import {
  SKILL_GROUPS, classifySkill, avatarColor, getSteppingStones, steppingStoneLabel, requiredByFor,
  type SkillGroupName,
} from './workflowShared'

// D: 리스트 뷰 — flow 캔버스와 달리 좌표 산수가 없는 순수 목록형 화면이다. 구조는 위에서
// 아래로 (1) 보유 밴드, (2) 공통 코어(선택 공고 2개 이상일 때만), (3) 공고별 트랙이다.
// 라이브 로드맵(roadmap.value.steps)은 쓰지 않는다 — 순서는 "요구 공고 수 내림차순"이면
// 충분하고, payoff/delta 같은 가짜 정밀도를 흉내 내지 않는다.

type CoreSkillRow = {
  canonical: string
  count: number
  requiredBy: { company: string }[]
  steppingStones: string[]
}

function companyNameOf(p: PostingDetail): string {
  return p.company ?? '회사명 미상'
}

export function WorkflowList({
  ownedSkills,
  ownedSkillCategories,
  selectedPostings,
}: {
  ownedSkills: string[]
  ownedSkillCategories: Record<string, string>
  selectedPostings: PostingDetail[]
}) {
  const ownedSet = useMemo(() => new Set(ownedSkills), [ownedSkills])

  // 1. 보유 밴드 — flow 뷰의 owned 클러스터와 같은 정보(카테고리별 보유 스킬)를
  // 리스트형으로 보여준다. 캡을 두지 않는다(리스트는 스크롤 가능한 세로 공간이라
  // 컴팩트 카드처럼 좁은 캔버스에 우겨넣을 필요가 없다).
  const ownedByGroup = useMemo(() => {
    const map: Record<SkillGroupName, string[]> = { 언어: [], 프레임워크: [], 기타: [] }
    ownedSkills.forEach((skill) => map[classifySkill(skill, ownedSkillCategories[skill])].push(skill))
    return map
  }, [ownedSkills, ownedSkillCategories])

  // 2. 공통 코어 — 선택된 공고 중 2개 이상이 공통으로 요구하는 미보유 스킬. count는
  // "이 스킬을 요구하는 선택 공고 개수"(회사 중복도 그대로 센다), requiredBy는 아바타
  // 표시용으로 회사당 1개만 중복 제거한 목록이다 — 세는 기준과 보여주는 기준이 달라서
  // 일부러 분리했다(같은 회사에서 온 공고 2개가 같은 스킬을 요구하면 count엔 2로
  // 반영하되 아바타는 하나만 찍는다).
  const coreSkills: CoreSkillRow[] = useMemo(() => {
    if (selectedPostings.length < 2) return []
    const counts = new Map<string, number>()
    selectedPostings.forEach((p) => {
      const seenInThisPosting = new Set<string>()
      p.skills.forEach((s) => {
        if (ownedSet.has(s) || seenInThisPosting.has(s)) return
        seenInThisPosting.add(s)
        counts.set(s, (counts.get(s) ?? 0) + 1)
      })
    })
    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([canonical, count]) => ({
        canonical,
        count,
        requiredBy: requiredByFor(canonical, selectedPostings),
        steppingStones: getSteppingStones(canonical, ownedSet),
      }))
      .sort((a, b) => b.count - a.count)
  }, [selectedPostings, ownedSet])

  const coreSkillSet = useMemo(() => new Set(coreSkills.map((c) => c.canonical)), [coreSkills])

  const hasOwnedSkills = ownedSkills.length > 0

  return (
    <div className="wfm-list">
      <section className="wfm-list-owned" aria-label="보유 기술">
        <div className="wfm-list-owned__title">지금 보유 {ownedSkills.length}개</div>
        {!hasOwnedSkills ? (
          <div className="wfm-list-empty-note">아직 등록된 보유 기술이 없어요.</div>
        ) : (
          <div className="wfm-list-owned__groups">
            {SKILL_GROUPS.map((group) => (
              <div key={group} className="wfm-list-owned-group">
                <span className="wfm-list-owned-group__label">{group}</span>
                {ownedByGroup[group].length === 0 ? (
                  <span className="wfm-list-owned-group__empty">보유 스킬 없음</span>
                ) : (
                  <div className="wfm-list-owned-group__chips">
                    {ownedByGroup[group].map((s) => (
                      <span key={s} className="wfm-list-chip wfm-list-chip--owned">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedPostings.length >= 2 && coreSkills.length > 0 && (
        <section className="wfm-list-core" aria-label="공통 코어 스킬">
          <div className="wfm-list-section-title">공통으로 필요해요</div>
          <ul className="wfm-list-rows">
            {coreSkills.map((item) => {
              const stepping = steppingStoneLabel(item.steppingStones, 2)
              return (
                <li key={item.canonical} className="wfm-list-row">
                  <span className="wfm-list-row__name">{item.canonical}</span>
                  <span className="wfm-list-row__count">{item.count}개 공고 요구</span>
                  {stepping && <span className="wfm-list-row__stepping">{stepping}</span>}
                  {item.requiredBy.length > 0 && (
                    <span
                      className="wfm-list-row__avatars"
                      title={item.requiredBy.map((r) => r.company).join(', ')}
                    >
                      {item.requiredBy.slice(0, 2).map((r) => (
                        <span
                          key={r.company}
                          className="wfm-list-row__avatar"
                          style={{ background: avatarColor(r.company) }}
                        >
                          {r.company.slice(0, 1)}
                        </span>
                      ))}
                      {item.requiredBy.length > 2 && (
                        <span className="wfm-list-row__avatar-more">+{item.requiredBy.length - 2}</span>
                      )}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="wfm-list-tracks" aria-label="공고별 트랙">
        {selectedPostings.map((posting) => {
          const company = companyNameOf(posting)
          const unowned = posting.skills.filter((s) => !ownedSet.has(s))
          const trackSkills = unowned.filter((s) => !coreSkillSet.has(s))
          return (
            <div key={posting.id} className="wfm-list-track">
              <div className="wfm-list-track__header">
                <span className="wfm-goal-avatar" style={{ background: avatarColor(company) }}>
                  {company.slice(0, 1)}
                </span>
                <span className="wfm-list-track__company">{company}</span>
                <span className="wfm-list-track__title" title={posting.title}>{posting.title}</span>
              </div>
              {trackSkills.length === 0 ? (
                <div className="wfm-list-empty-note">
                  {unowned.length === 0
                    ? '이 공고 요구 기술은 모두 보유하고 있어요'
                    : '이 공고가 요구하는 미보유 기술은 모두 공통 코어에 포함돼 있어요'}
                </div>
              ) : (
                <ul className="wfm-list-rows">
                  {trackSkills.map((s) => {
                    const stepping = steppingStoneLabel(getSteppingStones(s, ownedSet), 2)
                    return (
                      <li key={s} className="wfm-list-row">
                        <span className="wfm-list-row__name">{s}</span>
                        <span className="wfm-list-row__cat">{classifySkill(s)}</span>
                        {stepping && <span className="wfm-list-row__stepping">{stepping}</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
