import KitShowcase from '../KitShowcase'

export default function KitSection() {
  return (
    <section className="ds-sec ds-page">
      <div className="ds-sec__head">
        <h2>커리어 위젯 킷 <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>화면 조립용 신규 컴포넌트</span></h2>
        <p>홈·시장·마이·지도 재설계에 쓰는 위계형 위젯. Apple 톤 + 슬레이트블루, 과장식 없음.</p>
      </div>
      <KitShowcase />
    </section>
  )
}
