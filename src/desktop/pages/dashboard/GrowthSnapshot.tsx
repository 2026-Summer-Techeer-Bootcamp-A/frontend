import { FileText } from 'lucide-react'
import { ActivityRings } from '../../../career/kit'

/** 2번 작업 — 기존 "오늘 브리핑"(BriefingQueue, 텍스트 액션 큐) 자리를 대신하는 시각화 위젯.
 * 시계열 히스토리(스킬을 언제 배웠는지 등)가 없으므로 "최근 변화 추이"는 지어내지 않고,
 * 지금 갖고 있는 신호(커버리지 · 보유 기술 수 · 지원 가능 공고 수 · 카테고리별 보유 분포)만
 * 현재 상태 스냅샷으로 정직하게 보여준다. */
export type GrowthCategoryCount = { key: string; label: string; count: number; color: string }

export function GrowthSnapshot({
  hasResume, coveragePct, skillCount, applicableCount, categories, onRegister,
}: {
  hasResume: boolean
  coveragePct: number
  skillCount: number
  applicableCount: number
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

  const categorizedTotal = categories.reduce((sum, c) => sum + c.count, 0)
  const maxCatCount = Math.max(...categories.map((c) => c.count), 1)
  const shown = categories.slice(0, 6)

  return (
    <div className="dov-gs">
      <div className="dov-gs__top">
        <div className="dov-gs__ring">
          <ActivityRings metrics={[{ key: 'cov', label: '기술 보유율', pct: coveragePct, color: '#1f9d57' }]} size={72} />
          <span className="dov-gs__ring-num">{coveragePct}<small>%</small></span>
        </div>
        <div className="dov-gs__stats">
          <div className="dov-gs__stat">
            <span className="dov-gs__stat-num">{skillCount}</span>
            <span className="dov-gs__stat-lbl">보유 기술</span>
          </div>
          <div className="dov-gs__stat">
            <span className="dov-gs__stat-num">{applicableCount}</span>
            <span className="dov-gs__stat-lbl">지원 가능 공고</span>
          </div>
        </div>
      </div>
      {shown.length > 0 && (
        <div className="dov-gs__cats">
          <div className="dov-gs__cats-label">
            카테고리별 보유 기술{categorizedTotal < skillCount && <span> · 분류 가능한 기술 기준</span>}
          </div>
          {shown.map((c) => (
            <div key={c.key} className="dov-gs__cat-row">
              <span className="dov-gs__cat-name">{c.label}</span>
              <span className="dov-gs__cat-track"><i style={{ width: `${(c.count / maxCatCount) * 100}%`, background: c.color }} /></span>
              <span className="dov-gs__cat-n">{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
