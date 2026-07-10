import { useMemo, useState } from 'react'
import { CATEGORIES, DONT_DO_ITEMS } from './dontDoItems'
import Stage from './Stage'
import './design-system.css'

export default function DoDont() {
  const [active, setActive] = useState<string>('전체')
  const list = useMemo(
    () => (active === '전체' ? DONT_DO_ITEMS : DONT_DO_ITEMS.filter((i) => i.category === active)),
    [active],
  )

  return (
    <>
          <div className="ds__hero guide__head">
            <span className="ds__eyebrow">Career · Design System</span>
            <h1>Do &amp; Don&apos;t 가이드</h1>
            <p>
              바이브 코딩 도구(v0·Bolt·Lovable·Cursor)와 AI 디자인 생성기(Gemini·Canva AI)가 뽑아내는 SaaS 룩을
              반면교사 삼았어요. 무지개 배지, 글로시 그라디언트 버튼, 카드 속 카드 같은 패턴은 전부 <b>Don&apos;t</b>예요.
              다만 장식을 걷어낸다고 그림자·재질·곡률까지 다 지우면 부트스트랩 시절로 되돌아갈 뿐이에요 — 그래서 좌측 액센트
              보더 같은 "클리셰를 없앤 척하는 새 클리셰"도 Don&apos;t에 넣었고, iOS 26 Liquid Glass의 동심원 코너·절제된
              단일광원 그림자·물리적 프레스 피드백처럼 <b>이유 있는 디테일</b>을 Do로 세웠어요.
            </p>
            <div className="guide__count" style={{ marginTop: 10 }}>
              총 {DONT_DO_ITEMS.length}개 항목 · {CATEGORIES.length}개 카테고리
            </div>
          </div>

          <div className="guide__filters">
            <button className={active === '전체' ? 'on' : ''} onClick={() => setActive('전체')}>
              전체 {DONT_DO_ITEMS.length}
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} className={active === c ? 'on' : ''} onClick={() => setActive(c)}>
                {c} {DONT_DO_ITEMS.filter((i) => i.category === c).length}
              </button>
            ))}
          </div>

          <div className="guide__grid">
            {list.map((item) => (
              <div key={item.id}>
                <div className="guide__item-label">
                  <span className="guide__item-cat">{item.category}</span>
                  {item.title}
                </div>
                <div className="dd-grid">
                  <div className="dd-card dont">
                    <span className="dd-tag">✕ Don&apos;t</span>
                    <div className="dd-stage">
                      <Stage spec={item.dontStage} />
                    </div>
                    <p className="dd-desc">{item.dont}</p>
                  </div>
                  <div className="dd-card do">
                    <span className="dd-tag">✓ Do</span>
                    <div className="dd-stage">
                      <Stage spec={item.doStage} />
                    </div>
                    <p className="dd-desc">{item.do}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
    </>
  )
}
