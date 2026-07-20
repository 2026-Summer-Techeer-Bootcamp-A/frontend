import { FileText } from 'lucide-react'

/** A-3: "요즘 뜨는 내 기술" — 기존 "요즘 내 성장"(보유율 링 + 지원 가능 숫자)은 히어로 카드와
 * 내용이 겹쳐 걷어냈다. 대신 최근 90일 신규 공고와 직전 90일 공고를 비교해 내 보유 기술이
 * 얼마나 더/덜 요구되는지 변화율로 보여준다. 표본이 얕은 기술(직전 기간 요구 건수가 적은 기술)은
 * 증감률이 튀기 쉬워 DesktopOverview의 최소 건수 컷을 통과한 기술만 여기로 넘어온다. */
export type GrowthCategoryCount = { key: string; label: string; count: number; color: string }
export type SkillTrendItem = { skill: string; recentCount: number; priorCount: number; changePct: number }

export function GrowthSnapshot({
  hasResume, trending, recentTotal, categories, onRegister,
}: {
  hasResume: boolean
  trending: SkillTrendItem[]
  recentTotal: number
  categories: GrowthCategoryCount[]
  onRegister: () => void
}) {
  if (!hasResume) {
    return (
      <div className="dov-gs dov-gs--empty">
        <span className="dov-gs__empty-icon"><FileText size={17} /></span>
        <p className="dov-gs__empty-title">이력서를 등록하면 내 성장 현황을 확인할 수 있어요.</p>
        <button type="button" className="dov-gs__empty-btn" onClick={onRegister}>이력서 등록하기</button>
      </div>
    )
  }

  // 표본 부족(직전 90일 요구 건수가 최소 건수 컷 미만)으로 변화율을 보여줄 기술이 없으면,
  // 지어낸 추이 대신 지금 보유 기술의 카테고리 분포로 정직하게 폴백한다.
  if (trending.length === 0) {
    const shownCategories = categories.slice(0, 6)
    if (shownCategories.length === 0) {
      return (
        <div className="dov-gs dov-gs--empty">
          <p className="dov-gs__empty-title">아직 기술 수요 변화를 보여줄 데이터가 부족해요.</p>
        </div>
      )
    }
    const maxCatCount = Math.max(...shownCategories.map((c) => c.count), 1)
    return (
      <div className="dov-gs">
        <div className="dov-gs__cats">
          <div className="dov-gs__cats-label">최근 데이터가 부족해 보유 기술 카테고리 분포를 보여드려요</div>
          {shownCategories.map((c) => (
            <div key={c.key} className="dov-gs__cat-row">
              <span className="dov-gs__cat-name">{c.label}</span>
              <span className="dov-gs__cat-track"><i style={{ width: `${(c.count / maxCatCount) * 100}%`, background: c.color }} /></span>
              <span className="dov-gs__cat-n">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const maxAbsChange = Math.max(...trending.map((t) => Math.abs(t.changePct)), 1)

  return (
    <div className="dov-gs">
      <div className="dov-gs__trend-label">최근 90일 신규 공고에서 내 기술 수요 변화</div>
      <div className="dov-gs__trend-list">
        {trending.map((t) => (
          <div key={t.skill} className="dov-gs__trend-row">
            <span className="dov-gs__trend-name">{t.skill}</span>
            <span className="dov-gs__trend-track">
              <i
                className={t.changePct >= 0 ? 'up' : 'down'}
                style={{ width: `${Math.min(100, (Math.abs(t.changePct) / maxAbsChange) * 100)}%` }}
              />
            </span>
            <span className={`dov-gs__trend-pct${t.changePct >= 0 ? ' up' : ''}`}>
              {t.changePct >= 0 ? '+' : ''}{t.changePct}%
            </span>
          </div>
        ))}
      </div>
      <div className="dov-gs__trend-caption">최근 90일 {recentTotal.toLocaleString()}건 중 내 기술 겹침 · 기준일 대비</div>
    </div>
  )
}
