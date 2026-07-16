// 공고 ↔ 공고 딥 비교의 3열 diff(스펙 3.b). 좁은 채팅 폭(≥360px)에서 원 2개짜리 Venn은 라벨이
// 뭉개지므로 3열(A만 / 공통 / B만) 레이아웃을 채택한다 — 모바일에서는 세로 스택으로 자연스럽게
// 접힌다(rag-console.css 미디어쿼리에서 공통 열을 맨 위로 재배치). 공통 열이 시각적 중심이라
// rc__badge 뉴트럴 배지보다 한 톤 더 진한 틴트(rv__pdchip--shared)를 준다.
export interface PostingDiffProps {
  shared: string[]
  onlyA: string[]
  onlyB: string[]
  labelA?: string
  labelB?: string
}

export default function PostingDiff({ shared, onlyA, onlyB, labelA = 'A만', labelB = 'B만' }: PostingDiffProps) {
  return (
    <div className="rv__postingdiff">
      <DiffColumn title={`${labelA} (${onlyA.length})`} items={onlyA} tone="neutral" />
      <DiffColumn title={`공통 (${shared.length})`} items={shared} tone="shared" />
      <DiffColumn title={`${labelB} (${onlyB.length})`} items={onlyB} tone="neutral" />
    </div>
  )
}

function DiffColumn({ title, items, tone }: { title: string; items: string[]; tone: 'shared' | 'neutral' }) {
  return (
    <div className="rv__diffcol">
      <h4 className="rv__diffcol-h">{title}</h4>
      {items.length === 0 ? (
        <div className="rv__empty">해당 없음</div>
      ) : (
        <ul className="rv__diffchips">
          {items.map((name) => (
            <li key={name} className={`rc__badge rv__pdchip${tone === 'shared' ? ' rv__pdchip--shared' : ''}`}>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
