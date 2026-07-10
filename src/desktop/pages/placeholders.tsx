import type { ReactNode } from 'react'
import './placeholders.css'

/* Phase 1 데스크톱 페이지 플레이스홀더.
   데이터/위젯을 붙이는 건 Phase 3. 지금은 각 영역의 "위계 의도"만 골격으로 보여준다.
   점선 슬롯 = 아직 디자인/구현 전이라는 신호(최종 화면엔 남지 않는다). */

function PageHead({ title, desc }: { title: string; desc: string }) {
  return (
    <header className="dph__head">
      <h1 className="dph__title">{title}</h1>
      <p className="dph__desc">{desc}</p>
    </header>
  )
}

function Slot({ label, span = 1, tall = false }: { label: string; span?: number; tall?: boolean }) {
  return (
    <div className={`dph__slot${tall ? ' tall' : ''}`} style={{ gridColumn: `span ${span}` }}>
      <span className="dph__slot-label">{label}</span>
      <span className="dph__slot-tag">Phase 3</span>
    </div>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <div className="dph">{children}</div>
}

/** 대시보드 — 멀티위젯 커맨드센터. 점수화 요약을 최상단 위계로. */
export function DesktopOverview() {
  return (
    <Page>
      <PageHead title="대시보드" desc="점수화 요약을 중심으로 오늘 확인할 것들을 한 화면에" />
      <div className="dph__grid dph__grid--overview">
        <Slot label="점수화 요약 (보유율 · 지원 가능)" span={2} tall />
        <Slot label="오늘 브리핑" tall />
        <Slot label="마감 임박" />
        <Slot label="기술 갭 요약" />
        <Slot label="맞춤 공고 Top" span={2} />
      </div>
    </Page>
  )
}

/** 맞춤 공고 — 마스터-디테일(좌 필터 · 중앙 결과 · 우 상세 프리뷰). */
export function DesktopJobs() {
  return (
    <Page>
      <PageHead title="맞춤 공고" desc="필터 · 결과 · 상세를 한 화면에서 (마스터–디테일)" />
      <div className="dph__grid dph__grid--jobs">
        <Slot label="필터 패널" tall />
        <Slot label="결과 리스트 / 테이블" tall />
        <Slot label="상세 프리뷰" tall />
      </div>
    </Page>
  )
}

/** 채용 시장 — 위젯 갤러리 + taxonomy 필터를 대형 분석 보드로. */
export function DesktopMarket() {
  return (
    <Page>
      <PageHead title="채용 시장" desc="트렌드 위젯과 taxonomy 필터를 분석 보드로" />
      <div className="dph__grid dph__grid--market">
        <Slot label="taxonomy 필터" />
        <Slot label="트렌드 위젯 A" />
        <Slot label="트렌드 위젯 B" />
        <Slot label="트렌드 위젯 C" />
        <Slot label="트렌드 위젯 D" />
        <Slot label="트렌드 위젯 E" />
      </div>
    </Page>
  )
}

/** 지도 — 지도 + 리스트 동시 노출. */
export function DesktopMap() {
  return (
    <Page>
      <PageHead title="지도" desc="지도와 공고 리스트를 동시에" />
      <div className="dph__grid dph__grid--map">
        <Slot label="지도" tall />
        <Slot label="리스트 패널" tall />
      </div>
    </Page>
  )
}

/** 마이 — 이력서 · 내 기술 · 설정. */
export function DesktopMy() {
  return (
    <Page>
      <PageHead title="마이" desc="이력서 관리 · 내 기술 · 설정" />
      <div className="dph__grid dph__grid--my">
        <Slot label="프로필 · 이력서" tall />
        <Slot label="내 기술" />
        <Slot label="설정" />
      </div>
    </Page>
  )
}
