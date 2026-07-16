import { Check, Plus } from 'lucide-react'

// 이력서 ↔ 공고 딥 비교의 스킬 2열 diff(스펙 3.a). 매칭됨(✓ 잉크 칩)과 부족함(＋ 고스트 칩)을
// 색으로만 구분하지 않고 아이콘 + 헤딩 텍스트로 병기한다(시그니처 안티-AI 규칙, 스펙 3.f a11y).
// 여분 기술(공고가 요구하지 않는데 이력서에만 있는 것)은 카드 하단에 옅은 인라인 텍스트로만.
export interface SkillDiffProps {
  matched: string[]
  missing: string[]
  extra?: string[]
}

export default function SkillDiff({ matched, missing, extra = [] }: SkillDiffProps) {
  return (
    <div className="rv__skilldiff">
      <div className="rv__diffcol">
        <h4 className="rv__diffcol-h">매칭됨 ({matched.length})</h4>
        {matched.length === 0 ? (
          <div className="rv__empty">매칭된 기술이 없어요.</div>
        ) : (
          <ul className="rv__diffchips">
            {matched.map((name) => (
              <li key={name} className="rv__diffchip rv__diffchip--matched">
                <Check size={11} aria-hidden="true" /> {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rv__diffcol">
        <h4 className="rv__diffcol-h">부족함 ({missing.length})</h4>
        {missing.length === 0 ? (
          // 빈(부족 0) 상태 — 긍정 문구(스펙 3.e)
          <div className="rv__empty">이 공고가 요구하는 기술을 모두 보유하고 있어요 🎉</div>
        ) : (
          <ul className="rv__diffchips">
            {missing.map((name) => (
              <li key={name} className="rv__diffchip rv__diffchip--missing">
                <Plus size={11} aria-hidden="true" /> {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {extra.length > 0 && (
        <div className="rv__diffextra">여분 기술(공고 밖): {extra.join(', ')}</div>
      )}
    </div>
  )
}
