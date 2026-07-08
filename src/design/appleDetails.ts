// ============================================================
// Like Apple 레퍼런스 데이터 — Apple 최신 디자인 언어(iOS 26 / macOS 26 "Liquid Glass") 디테일 아카이브.
// /design-system의 "Like Apple" 참고 탭에서 렌더링.
//
// source 필드 안내:
//  - '공식 HIG'      : Apple developer.apple.com Human Interface Guidelines, WWDC 세션에서
//                       확인 가능한 확정 사실(수치가 비공개라 근사치인 경우 detail에 명시).
//  - '커뮤니티 컨셉'  : 제3자 디자이너·매체의 추정이나 아직 애플이 공식화하지 않은 방향성.
//
// 주의: 조사 시점(2026년 7월) 기준으로 iOS 27 / iPadOS 27 / macOS 27 "Golden Gate"는
// 이미 2026년 6월 WWDC에서 공식 발표되어 베타가 배포 중이다. 최초 조사 요청 당시 전제였던
// "아직 출시되지 않은 미래 버전이라 전부 커뮤니티 추정"은 더 이상 정확하지 않으며,
// '커뮤니티 컨셉' 카테고리 항목 중 다수는 이제 '공식 HIG'(베타 기준)로 표기되어 있다.
// ============================================================

export interface AppleDetail {
  id: string
  category: string
  title: string
  source: '공식 HIG' | '커뮤니티 컨셉'
  spec: string
  detail: string
  demo?: {
    kind: 'swatches' | 'text' | 'pill' | 'box' | 'stat'
    colors?: string[]
    content?: string
    style?: Record<string, string | number>
    value?: string
    label?: string
  }
}

export const APPLE_CATEGORIES = [
  '재질', '코너·형태', '타이포그래피', '컬러 시스템', '아이콘', '컨트롤', '모션', '레이아웃·스페이싱', '커뮤니티 컨셉',
] as const

export const APPLE_DETAILS: AppleDetail[] = [
  // ---------- 재질 ----------
  {
    id: 'mat-two-variants',
    category: '재질',
    title: '리퀴드 글래스 Regular·Clear',
    source: '공식 HIG',
    spec: 'Regular=적응형 범용 소재, Clear=고정 투명·비적응형, 서로 혼용 금지',
    detail: 'Regular는 배경 밝기와 색상에 맞춰 스스로 명암을 조절해 어떤 콘텐츠 위에서도 가독성을 유지하도록 설계된 범용 소재다. 반면 Clear는 톤 적응 레이어가 없어 항상 더 투명한 상태를 유지하는데, 이는 배경이 되는 미디어 자체의 색감과 생동감을 그대로 드러내기 위함이다. 두 변형은 성격이 근본적으로 달라 한 화면에 섞어 쓰지 않는 것이 원칙이며, Clear는 배경이 미디어로 풍부하고 그 위에 얹히는 콘텐츠가 밝고 대담할 때만 권장된다.',
    demo: {
      kind: 'box',
      content: 'Regular / Clear',
      style: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px) saturate(180%)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '16px 24px', color: '#fff', fontWeight: 600 },
    },
  },
  {
    id: 'mat-refraction',
    category: '재질',
    title: '실시간 굴절과 렌즈 왜곡',
    source: '공식 HIG',
    spec: '곡면 유리처럼 뒤쪽 콘텐츠 빛을 실시간으로 굴절·집광',
    detail: '리퀴드 글래스는 실제 곡면 유리처럼 뒤쪽 콘텐츠의 빛을 실시간으로 굽히고 모아 보여주는 렌즈 효과를 낸다. 이는 소재를 평면적인 반투명 레이어가 아니라 물리적 두께와 곡률을 가진 실체처럼 느끼게 하려는 의도다. 컨트롤이 확장되거나 모핑될 때 곡률이 커지면서 굴절이 더 두드러지는데, 이는 사용자의 조작에 물리적인 피드백을 주기 위한 설계다. 정확한 굴절 계수는 공개되지 않았으며 배경 콘텐츠와 기기 상황에 따라 실시간으로 계산되는 것으로 보인다.',
    demo: {
      kind: 'box',
      content: 'Refraction',
      style: { background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05))', backdropFilter: 'blur(12px)', borderRadius: 24, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), 0 4px 24px rgba(0,0,0,0.2)', padding: '20px', color: '#1c1c1e' },
    },
  },
  {
    id: 'mat-specular-highlight',
    category: '재질',
    title: '움직임에 반응하는 하이라이트',
    source: '공식 HIG',
    spec: '기기 기울임·잠금 해제 등 상호작용에 반응하는 스페큘러 하이라이트',
    detail: '리퀴드 글래스는 주변에 광원이 있는 것처럼 표면에 하이라이트를 렌더링하고, 기기를 기울이거나 잠금을 해제하는 등의 상호작용에 따라 그 빛이 표면을 따라 이동하도록 설계됐다. 이는 소재가 살아있는 듯한 촉각적 반응성을 주기 위한 장치다. 다만 하이라이트의 움직임 폭은 대략 수 픽셀 이내로 제한되는 것으로 알려져 있는데, 정확한 수치는 애플이 공식 문서화하지 않았지만 전정계가 민감한 사용자의 어지럼증을 방지하려는 배려로 추정된다.',
    demo: {
      kind: 'box',
      content: 'Specular',
      style: { background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.65), rgba(255,255,255,0.05) 60%)', backdropFilter: 'blur(16px)', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', padding: '20px', color: '#1c1c1e' },
    },
  },
  {
    id: 'mat-dynamic-tint',
    category: '재질',
    title: '스크롤 콘텐츠 반응 동적 틴트',
    source: '공식 HIG',
    spec: '배경 콘텐츠 색상·명도를 실시간 샘플링해 톤 자동 보정',
    detail: '내비게이션 바나 툴바 같은 글래스 컨트롤은 그 아래로 스크롤되는 콘텐츠의 색상과 밝기를 실시간으로 감지해 자신의 틴트와 대비를 조정한다. 어두운 사진 위에서는 컨트롤이 더 밝게, 밝은 배경 위에서는 더 어둡게 반응하는 식이다. 고정된 색을 쓰면 특정 배경에서 가독성이 떨어지기 때문에, 소재 스스로 환경에 적응해 텍스트와 아이콘의 대비를 항상 확보하도록 설계한 것이다.',
    demo: {
      kind: 'box',
      content: 'Dynamic Tint',
      style: { background: 'linear-gradient(90deg, rgba(20,20,25,0.55), rgba(255,255,255,0.25))', backdropFilter: 'blur(18px)', borderRadius: 20, padding: '18px 24px', color: '#fff', fontWeight: 500 },
    },
  },
  {
    id: 'mat-reduce-transparency',
    category: '재질',
    title: '투명도 감소 접근성 렌더링',
    source: '공식 HIG',
    spec: '손쉬운 사용 > 투명도 감소 켜면 불투명·흐림 처리된 단색에 가깝게 전환',
    detail: '사용자가 손쉬운 사용에서 투명도 감소를 켜면 리퀴드 글래스는 굴절과 반사 효과를 낮추고 훨씬 불투명하고 흐릿한 표면으로 대체된다. 이는 저시력이나 대비 민감 사용자가 배경 콘텐츠와 컨트롤 경계를 구분하지 못하는 문제를 막기 위한 설계다. 투명도 감소와 대비 높이기를 함께 켜면 글래스 요소는 거의 단색에 가깝게 렌더링되어 반투명함이 최소화되는데, 정확한 불투명도 수치는 공개되지 않았으나 대략 90% 이상의 불투명 처리로 추정된다.',
    demo: {
      kind: 'box',
      content: 'Reduced',
      style: { background: 'rgba(240,240,245,0.94)', backdropFilter: 'blur(4px)', borderRadius: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.12)', padding: '18px 24px', color: '#1c1c1e' },
    },
  },
  {
    id: 'mat-usage-scope',
    category: '재질',
    title: '내비게이션 레이어 전용 원칙',
    source: '공식 HIG',
    spec: '탭 바·툴바·사이드바·시트에 사용, 리스트·본문 등 콘텐츠 레이어엔 비권장',
    detail: '애플은 리퀴드 글래스를 앱 콘텐츠 위에 떠 있는 내비게이션 레이어, 즉 탭 바, 툴바, 사이드바, 시트, 팝오버 같은 제어 요소에만 쓰도록 권장한다. 콘텐츠 자체를 글래스로 만들면 정작 사용자가 읽어야 할 정보의 가독성이 흔들리기 때문에, 소재는 어디까지나 콘텐츠를 감싸는 틀의 역할에 머물러야 한다는 것이 핵심 원칙이다. 같은 이유로 전체 화면 배경, 스크롤되는 리스트, 여러 겹의 글래스를 쌓는 구성도 지양하도록 안내한다.',
    demo: {
      kind: 'box',
      content: 'Tab Bar',
      style: { background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', borderRadius: 28, padding: '12px 20px', boxShadow: '0 6px 20px rgba(0,0,0,0.2)', color: '#fff', textAlign: 'center' },
    },
  },

  // ---------- 코너·형태 ----------
  {
    id: 'corner-concentric-formula',
    category: '코너·형태',
    title: '동심원 코너 반경 공식',
    source: '공식 HIG',
    spec: '바깥 반경 = 안쪽 반경 + 패딩(동일 중심 공유)',
    detail: 'WWDC25에서 애플은 중첩된 모양들이 같은 중심을 공유하도록, 바깥 요소의 코너 반경에서 안쪽 요소까지의 여백을 뺀 값을 안쪽 반경으로 쓰는 동심 구조를 제시했다. 이는 버튼 안의 아이콘, 시트 안의 카드처럼 요소가 겹겹이 중첩될 때 둥근 모서리끼리 시각적으로 어긋나 보이는 문제를 근본적으로 없애기 위한 기하학 규칙이다. SwiftUI에서는 ConcentricRectangle API가 이 관계를 자동 계산해준다.',
    demo: {
      kind: 'box',
      content: '28 = 20 + 8',
      style: { borderRadius: 28, padding: 24, background: 'linear-gradient(135deg,#3a3a3c,#1c1c1e)', boxShadow: 'inset 0 0 0 8px rgba(255,255,255,0.08)', color: '#fff', textAlign: 'center' },
    },
  },
  {
    id: 'corner-continuous-curvature',
    category: '코너·형태',
    title: '연속 곡률 스퀴클',
    source: '공식 HIG',
    spec: '일반 원형 border-radius가 아닌 초타원(superellipse) 기반 연속 곡률 적용',
    detail: '이전부터 애플 앱 아이콘에 쓰이던 초타원 기반 연속 곡률 형태가 이제 버튼, 시트, 컨트롤 등 시스템 전반의 모서리로 확장 적용됐다. 일반 CSS border-radius는 직선과 원호가 만나는 지점에서 곡률이 급격히 꺾이지만, 연속 곡률 커브는 곡률 변화가 매끄럽게 이어져 눈이 모서리를 더 완결된 형태로 인식한다. 이는 하드웨어 베젤의 곡률과 소프트웨어 모서리를 시각적으로 통일하려는 애플의 오랜 디자인 철학의 연장선이다.',
    demo: {
      kind: 'box',
      content: 'Continuous',
      style: { borderRadius: 34, background: '#0a84ff', padding: '20px', color: '#fff', textAlign: 'center' },
    },
  },
  {
    id: 'corner-app-icon-superellipse',
    category: '코너·형태',
    title: '앱 아이콘의 초타원 근사',
    source: '공식 HIG',
    spec: '코너 반경 대략 아이콘 폭의 22% 수준, n≈4~5 초타원을 베지어로 근사',
    detail: '애플 앱 아이콘의 윤곽은 순수한 수학적 초타원이 아니라 그 형태를 정교하게 근사한 베지어 곡선으로 구성된다. 정확한 지수 값은 공개되지 않았지만 커뮤니티 역설계에 따르면 대략 4~5 사이의 초타원, 코너 반경은 아이콘 폭의 약 22% 정도로 추정된다. 완전한 수학적 공식보다 시각적으로 균형 잡힌 두께감을 주기 위해 근사 곡선을 손으로 조율한 결과로 보인다.',
    demo: {
      kind: 'box',
      content: 'App Icon',
      style: { borderRadius: '22%', background: 'linear-gradient(160deg,#ff9f0a,#ff375f)', padding: '24px', color: '#fff', textAlign: 'center', fontWeight: 600 },
    },
  },
  {
    id: 'corner-sheet-bottom-radius',
    category: '코너·형태',
    title: '하단 시트의 큰 라운드',
    source: '공식 HIG',
    spec: '상단 좌우 모서리에 대략 20~34pt 수준의 큰 라운드 처리(정확한 공식 수치 비공개)',
    detail: '화면 아래에서 올라오는 시트는 상단 좌우 모서리에 눈에 띄게 큰 라운드를 적용해 하드웨어 디스플레이의 둥근 베젤과 시각적으로 이어지는 느낌을 준다. 정확한 포인트 값은 애플이 공식 문서화하지 않았으나, 여러 구현체를 관찰하면 대략 20~34pt 범위로 추정된다. 이렇게 큰 반경을 쓰는 이유는 시트가 화면 자체의 물리적 경계에서 자연스럽게 솟아오르는 것처럼 보이게 하기 위함이다.',
    demo: {
      kind: 'box',
      content: 'Sheet',
      style: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, background: '#2c2c2e', padding: '20px', color: '#fff', textAlign: 'center' },
    },
  },
  {
    id: 'corner-button-radius',
    category: '코너·형태',
    title: '글래스 버튼의 동심 반경',
    source: '공식 HIG',
    spec: '버튼 반경은 고정값이 아니라 부모 컨테이너에 동심으로 종속, 독립용 대체값 병행',
    detail: '새 디자인 시스템에서 버튼의 코너 반경은 하나의 고정 상수가 아니라, 버튼이 놓이는 컨테이너의 반경에서 패딩을 뺀 동심 값으로 계산되는 경우가 많다. 이는 버튼 크기나 위치가 바뀌어도 컨테이너와의 기하학적 정렬이 항상 유지되도록 하기 위한 설계다. 컨테이너 없이 독립적으로 쓰이는 버튼을 위해서는 동심 계산이 적용되지 않을 때 쓰이는 대체 반경도 함께 정의하도록 안내한다.',
    demo: {
      kind: 'box',
      content: 'Button',
      style: { borderRadius: 14, background: '#0a84ff', padding: '10px 22px', color: '#fff', display: 'inline-block', fontWeight: 600 },
    },
  },
  {
    id: 'corner-concentric-rectangle-api',
    category: '코너·형태',
    title: 'SwiftUI ConcentricRectangle',
    source: '공식 HIG',
    spec: '모서리별 개별 지정 가능, 고정 반경 또는 동심(concentric) 선택',
    detail: '애플은 iOS 26 SwiftUI에 ConcentricRectangle과 관련 API를 새로 도입해 개발자가 직접 반경을 계산하지 않아도 동심 코너 관계를 선언적으로 표현할 수 있게 했다. 각 모서리를 개별적으로 고정 반경 또는 동심으로 지정할 수 있어, 한 뷰 안에서도 모서리마다 다른 규칙을 적용하는 세밀한 제어가 가능하다. 이는 다양한 화면 크기와 중첩 깊이에서도 일관된 기하학적 조화를 자동으로 유지하려는 목적이다.',
    demo: {
      kind: 'text',
      content: '.rect(corners: .concentric)',
      style: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13, background: 'rgba(127,127,127,0.15)', borderRadius: 8, padding: '8px 12px' },
    },
  },

  // ---------- 타이포그래피 ----------
  {
    id: 'type-large-title-scale',
    category: '타이포그래피',
    title: '라지 타이틀 34pt 스케일',
    source: '공식 HIG',
    spec: 'Large Title 34pt / Regular, 자간 대략 -0.36px',
    detail: '라지 타이틀은 iOS 11부터 도입된 스타일로 내비게이션 바 상단에서 화면의 정체성을 크게 드러낸다. 기본 굵기는 Regular이지만 설정 앱처럼 강조가 필요한 화면에서는 Bold 변형을 함께 쓴다. 자간은 대략 -0.36px 안팎으로 살짝 좁혀 큰 글자가 벌어져 보이는 느낌을 줄이는데, 애플이 정확한 수치를 공개하지 않아 이는 추정치다.',
    demo: { kind: 'text', content: '설정', style: { fontSize: 34, fontWeight: 400, letterSpacing: -0.36, fontFamily: '-apple-system, "SF Pro Display", sans-serif' } },
  },
  {
    id: 'type-title-hierarchy',
    category: '타이포그래피',
    title: '타이틀 1·2·3 계층 구조',
    source: '공식 HIG',
    spec: 'Title 1 28pt · Title 2 22pt · Title 3 20pt, 모두 Regular',
    detail: 'Title 1/2/3는 화면 안에서 섹션과 콘텐츠 그룹을 구분하는 중간 계층 제목이다. 세 스타일 모두 기본 굵기는 Regular로 통일되어 있어 위계는 크기만으로 표현되고, 두께 차이는 Headline 이하에서만 의미를 갖는다. Title 3(20pt)는 SF Pro Text와 Display가 갈리는 경계값과 겹쳐 있어 렌더링 시 미묘하게 폰트 최적화가 달라질 수 있다.',
    demo: { kind: 'text', content: '섹션 제목', style: { fontSize: 22, fontWeight: 400, letterSpacing: -0.26, fontFamily: '-apple-system, "SF Pro Display", sans-serif' } },
  },
  {
    id: 'type-headline-body-pair',
    category: '타이포그래피',
    title: '헤드라인·본문 17pt 짝',
    source: '공식 HIG',
    spec: 'Headline 17pt / Semibold vs Body 17pt / Regular, 자간 -0.43px',
    detail: 'Headline과 Body는 같은 17pt 크기를 공유하면서 굵기 차이만으로 강조와 본문을 구분하는 대표적인 사례다. 자간 -0.43px는 여러 iOS 개발자 레퍼런스에서 동일하게 교차 확인되는 값으로, SF Pro Text가 큰 글자보다 상대적으로 넓게 설계된 기본 자간을 보정하기 위해 음수로 조여준 것이다. 이 페어링은 표준 리스트 셀에서 제목-부제목 구조로 가장 흔하게 쓰인다.',
    demo: { kind: 'text', content: 'Headline / Body', style: { fontSize: 17, fontWeight: 600, letterSpacing: -0.43, fontFamily: '-apple-system, "SF Pro Text", sans-serif' } },
  },
  {
    id: 'type-callout-subheadline',
    category: '타이포그래피',
    title: '콜아웃·서브헤드라인',
    source: '공식 HIG',
    spec: 'Callout 16pt · Subheadline 15pt, 모두 Regular',
    detail: 'Callout과 Subheadline은 Body보다 한 단계 낮은 보조 정보용 스타일로 목록의 설명 문구나 부가 텍스트에 쓰인다. 두 스타일 모두 Regular 굵기이며 자간은 Body보다 조금 느슨한 대략 -0.24~-0.31px 범위로 추정된다. 크기 차이는 1pt로 작지만 Dynamic Type 환경에서는 스케일링 배율이 서로 달라 접근성 설정을 켜면 둘의 체감 크기 차가 벌어진다.',
    demo: { kind: 'text', content: '부가 설명 텍스트입니다', style: { fontSize: 16, fontWeight: 400, letterSpacing: -0.31, fontFamily: '-apple-system, "SF Pro Text", sans-serif' } },
  },
  {
    id: 'type-footnote-caption-scale',
    category: '타이포그래피',
    title: '풋노트·캡션 저계조 크기',
    source: '공식 HIG',
    spec: 'Footnote 13pt · Caption 1 12pt · Caption 2 11pt',
    detail: '이 세 스타일은 각주, 타임스탬프, 메타데이터처럼 화면에서 가장 작은 텍스트에 쓰인다. 글자가 작아질수록 획과 글자 사이가 시각적으로 붙어 보이기 때문에 SF Pro는 13pt 이하 구간에서 자간을 점점 양수 방향으로 벌리도록 설계되어 있다는 점이 여러 자료에서 공통적으로 확인된다. Caption 2(11pt)의 자간은 대략 +0.07px, Caption 1(12pt)은 보정이 거의 없는 0에 가까운 값으로 추정되며 정확한 수치는 비공개다.',
    demo: { kind: 'text', content: '오후 3:24', style: { fontSize: 11, fontWeight: 400, letterSpacing: 0.07, fontFamily: '-apple-system, "SF Pro Text", sans-serif' } },
  },
  {
    id: 'type-sf-pro-display-text-split',
    category: '타이포그래피',
    title: 'SF Pro Display·Text 분기',
    source: '공식 HIG',
    spec: '20pt 미만 SF Pro Text / 20pt 이상 SF Pro Display 자동 전환',
    detail: 'SF Pro는 하나의 서체 이름 아래 Text와 Display라는 두 개의 옵티컬 사이즈를 갖고 있으며, iOS가 렌더링 시점에 글자 크기(20pt 기준)에 따라 자동으로 전환한다. Text 버전은 작은 크기에서도 가독성을 지키기 위해 자간을 넓히고 글자 속 여백을 더 열어 설계했고, Display 버전은 큰 제목에서 자간을 좁히고 비례를 정제해 또렷한 인상을 준다. 최신 가변 폰트인 SF Pro Variable은 이 전환을 옵티컬 사이즈(opsz) 축으로 끊김 없이 연속 처리한다.',
    demo: { kind: 'text', content: 'Aa 20pt 경계', style: { fontSize: 20, fontWeight: 400, letterSpacing: -0.24, fontFamily: '-apple-system, "SF Pro Display", sans-serif' } },
  },
  {
    id: 'type-dynamic-type-accessibility',
    category: '타이포그래피',
    title: '다이내믹 타입 접근성 스케일',
    source: '공식 HIG',
    spec: '표준 7단계(xSmall~xxxLarge) + 접근성 5단계(AX1~AX5)',
    detail: 'Dynamic Type은 설정에서 고를 수 있는 7개의 표준 크기와, "큰 접근성 텍스트"를 켰을 때 추가되는 AX1~AX5 확대 단계를 합쳐 총 12단계로 텍스트 크기를 조절한다. Body 스타일은 기본 17pt에서 시작해 가장 큰 AX5 단계에서 대략 46pt까지 커지는 것으로 커뮤니티 레퍼런스에서 확인되며, 이는 기본 크기 대비 약 270% 수준이지만 iOS 버전에 따라 조금씩 달라질 수 있는 추정치다. 반면 Large Title처럼 이미 큰 스타일은 접근성 단계에서 상대적으로 덜 확대되도록 설계되어 전체 레이아웃이 과도하게 깨지지 않도록 균형을 잡는다.',
    demo: { kind: 'stat', value: '약 270%', label: 'Body 최대 확대 비율(AX5, 추정)' },
  },

  // ---------- 컬러 시스템 ----------
  {
    id: 'color-system-tint-palette',
    category: '컬러 시스템',
    title: '시스템 틴트 컬러 팔레트',
    source: '공식 HIG',
    spec: 'Red·Orange·Yellow·Green·Mint·Teal·Cyan·Blue·Indigo·Purple·Pink·Brown 12색',
    detail: 'iOS는 이름이 붙은 12개의 시스템 컬러를 제공하며 각각 라이트와 다크 모드에 서로 다른 hex 값을 갖는 다이내믹 컬러다. 예를 들어 systemBlue는 라이트 #007AFF, 다크 #0A84FF처럼 다크 모드 값이 대체로 명도와 채도를 살짝 높여 어두운 배경 위에서도 선명하게 보이도록 보정되어 있다. 앱이 이 이름 자체를 참조하면 시스템이 외형 모드에 맞춰 자동으로 올바른 색을 선택해준다.',
    demo: { kind: 'swatches', colors: ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#5AC8FA', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E'] },
  },
  {
    id: 'color-system-tint-dark-mode',
    category: '컬러 시스템',
    title: '다크 모드 틴트 컬러 변주',
    source: '공식 HIG',
    spec: '예: systemRed #FF453A · systemGreen #30D158 · systemBlue #0A84FF',
    detail: '다크 모드에서는 배경이 검정에 가까워지면서 같은 색이 상대적으로 탁하게 보이는 착시가 생기기 때문에, 애플은 각 시스템 컬러의 다크 버전을 별도로 정의해 채도와 밝기를 미세 조정했다. 흥미로운 사례로 systemTeal과 systemCyan은 라이트 모드에서는 다른 색(#5AC8FA vs #32ADE6)이지만 다크 모드에서는 동일한 #64D2FF로 수렴한다. 이 값들은 UIColor 공식 문서와 다수의 iOS 개발자 레퍼런스에서 교차 확인된 수치다.',
    demo: { kind: 'swatches', colors: ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#63E6E2', '#64D2FF', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#AC8E68'] },
  },
  {
    id: 'color-gray-scale-steps',
    category: '컬러 시스템',
    title: '시스템 그레이 6단계',
    source: '공식 HIG',
    spec: 'systemGray #8E8E93(라이트=다크 동일) ~ systemGray6 #F2F2F7',
    detail: 'systemGray부터 systemGray6까지 6단계는 구분선, 배경, 비활성 상태처럼 색상이 아닌 명도로만 위계를 표현해야 하는 곳에 쓰인다. 흥미롭게도 가장 진한 systemGray(#8E8E93)는 라이트와 다크 모드에서 동일한 hex 값을 쓰는 유일한 계열이고, 번호가 커질수록(2→6) 라이트에서는 더 밝아지고 다크에서는 더 어두워지는 반대 방향으로 값이 벌어진다. 이 구조 덕분에 어느 외형 모드에서도 "번호가 낮을수록 진하고 높을수록 배경에 가깝다"는 규칙이 유지된다.',
    demo: { kind: 'swatches', colors: ['#8E8E93', '#AEAEB2', '#C7C7CC', '#D1D1D6', '#E5E5EA', '#F2F2F7'] },
  },
  {
    id: 'color-label-opacity-hierarchy',
    category: '컬러 시스템',
    title: '레이블 컬러 불투명도 위계',
    source: '공식 HIG',
    spec: 'label 100% · secondaryLabel 60% · tertiaryLabel 30% · quaternaryLabel 18%',
    detail: '레이블 컬러 4단계는 사실 검정(라이트) 또는 흰색(다크) 한 가지 색에 불투명도만 다르게 적용한 값이다. 라이트 모드에서는 rgba(60,60,67,a) 계열에 60%, 30%, 18% 알파를 얹고, 다크 모드에서는 흰색 계열인 rgba(235,235,245,a)로 대칭 구조를 이룬다. 불투명도 기반 설계이기 때문에 어떤 배경색 위에 놓여도 자연스럽게 위계와 대비가 유지되는 것이 핵심 의도다.',
    demo: { kind: 'swatches', colors: ['#000000FF', '#3C3C4399', '#3C3C434C', '#3C3C432D'] },
  },
  {
    id: 'color-fill-hierarchy',
    category: '컬러 시스템',
    title: '필 컬러 4단계 오버레이',
    source: '공식 HIG',
    spec: 'systemFill 20% ~ quaternarySystemFill 8%(라이트), rgba(120,120,128,a) 계열',
    detail: '필 컬러는 버튼이나 슬라이더 트랙처럼 배경 위에 얹히는 도형을 채우는 용도로, 회색 rgba(120,120,128) 계열에 불투명도만 20%, 16%, 12%, 8%로 낮춰가며 4단계를 만든다. 다크 모드에서는 같은 계열이되 각각 36%, 32%, 24%, 18%로 더 높은 불투명도를 써서 어두운 배경 위에서도 형태가 충분히 도드라지게 보정한다. 얇고 작은 도형일수록 진한 systemFill을, 넓은 영역일수록 옅은 quaternarySystemFill을 쓰는 것이 애플의 사용 가이드다.',
    demo: { kind: 'swatches', colors: ['#78788033', '#78788028', '#7676801E', '#74748014'] },
  },
  {
    id: 'color-background-hierarchy',
    category: '컬러 시스템',
    title: '배경 컬러 3단 + 그룹 변형',
    source: '공식 HIG',
    spec: 'systemBackground #FFFFFF/#000000, Grouped 변형은 명암 순서가 반전',
    detail: '일반 배경(systemBackground)은 라이트에서 흰색, 다크에서 검정으로 시작해 secondary, tertiary로 갈수록 옅은 회색이 섞여 들어간다. 반면 그룹 스타일 테이블에 쓰는 Grouped 배경은 정반대 순서로 시작해, 라이트 모드 systemGroupedBackground는 흰색이 아니라 연회색(#F2F2F7)이고 그 위에 올라가는 secondarySystemGroupedBackground가 흰색(#FFFFFF)이 되는 식으로 배경-카드 대비를 반대로 설계했다. 이 반전 구조를 모르고 두 배경 세트를 섞어 쓰면 카드와 배경이 구분되지 않는 실수가 흔히 발생한다.',
    demo: { kind: 'swatches', colors: ['#FFFFFF', '#F2F2F7', '#FFFFFF', '#000000', '#1C1C1E', '#2C2C2E'] },
  },
  {
    id: 'color-separator-lines',
    category: '컬러 시스템',
    title: '구분선 셰이드·오퍼시티',
    source: '공식 HIG',
    spec: 'separator rgba(60,60,67,0.29) · opaqueSeparator #C6C6C8',
    detail: '구분선은 셀 사이 얇은 줄처럼 아래 배경이 비쳐도 되는 곳에는 반투명 separator를, 탭 바 위쪽 경계처럼 완전히 불투명해야 하는 곳에는 opaqueSeparator(#C6C6C8)를 구분해서 쓴다. 다크 모드에서는 separator가 rgba(84,84,88,0.6)으로, opaqueSeparator가 #38383A로 바뀌는데 두 값 모두 배경보다 살짝 밝은 회색을 써서 낮은 대비로도 경계를 인지할 수 있게 한다. 반투명 버전의 불투명도가 라이트(29%)보다 다크(60%)에서 훨씬 높은 이유는 어두운 배경일수록 옅은 선이 쉽게 묻히기 때문이다.',
    demo: { kind: 'swatches', colors: ['#3C3C4349', '#C6C6C8FF'] },
  },

  // ---------- 아이콘 ----------
  {
    id: 'icon-rendering-monochrome',
    category: '아이콘',
    title: '모노크롬 렌더링 모드',
    source: '공식 HIG',
    spec: '단일 색상으로 심벌 전체 레이어를 채우는 기본 모드',
    detail: '모노크롬은 SF 심벌스의 타이포그래피적 성격을 가장 잘 드러내는 기본 렌더링 방식으로, 여러 심벌이 나란히 놓여도 어느 하나가 튀지 않고 텍스트처럼 자연스럽게 섞이도록 설계됐다. 색상이 하나뿐이라 주변 텍스트나 다른 아이콘과의 통일감을 유지하기 가장 쉬운 모드이기도 하다.',
    demo: { kind: 'pill', content: '● Monochrome', style: { background: '#1c1c1e', color: '#f2f2f7', borderRadius: 999, padding: '6px 14px', fontSize: 13 } },
  },
  {
    id: 'icon-rendering-hierarchical',
    category: '아이콘',
    title: '계층적 렌더링 모드',
    source: '공식 HIG',
    spec: '하나의 틴트 컬러에 레이어별로 다른 불투명도 적용',
    detail: '계층적 모드는 심벌을 구성하는 1차, 2차, 3차 레이어에 같은 색을 쓰되 불투명도를 다르게 주어 깊이와 강조점을 표현한다. 완전히 다른 색을 쓰지 않고도 심벌 내부에 시각적 위계를 만들어, 어떤 부분이 핵심 요소이고 어떤 부분이 보조 요소인지 한눈에 구분되게 하려는 목적이다.',
    demo: { kind: 'pill', content: '◐ Hierarchical', style: { background: 'rgba(10,132,255,0.15)', color: '#0a84ff', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 600 } },
  },
  {
    id: 'icon-rendering-palette',
    category: '아이콘',
    title: '팔레트 렌더링 모드',
    source: '공식 HIG',
    spec: '레이어마다 서로 다른 지정 색상 2개 이상 적용',
    detail: '팔레트 모드는 심벌의 각 레이어에 개발자가 직접 지정한 두 개 이상의 대비되는 색을 매핑하는 방식이다. 브랜드 컬러나 앱 고유의 색 체계를 심벌에 반영하면서도 레이어 구조 자체는 그대로 유지하고 싶을 때 쓰도록 설계됐다. 색상 조합을 자유롭게 커스터마이즈할 수 있다는 점에서 모노크롬이나 계층적 모드보다 표현력이 크다.',
    demo: { kind: 'pill', content: '◑ Palette', style: { background: 'linear-gradient(90deg,#ff375f,#ff9f0a)', color: '#fff', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 600 } },
  },
  {
    id: 'icon-rendering-multicolor',
    category: '아이콘',
    title: '멀티컬러 렌더링 모드',
    source: '공식 HIG',
    spec: '심벌 고유의 내재적 색상을 자동 적용(예: 나뭇잎=초록, 삭제=빨강)',
    detail: '멀티컬러는 개발자가 색을 지정하지 않아도 심벌 자체에 내장된 고유 색상이 자동으로 표시되는 모드로, 현실 세계에서 그 사물이 갖는 색을 반영해 의미 전달을 강화하려는 목적을 가진다. 나뭇잎 심벌은 초록색을, 삭제를 뜻하는 휴지통 심벌은 경고성 빨간색을 내재하고 있어 별도 설정 없이도 직관적인 의미 전달이 가능하다.',
    demo: { kind: 'pill', content: '🍃 Multicolor', style: { background: 'rgba(52,199,89,0.15)', color: '#34c759', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 600 } },
  },
  {
    id: 'icon-weight-scale',
    category: '아이콘',
    title: '9단계 굵기와 3단계 크기',
    source: '공식 HIG',
    spec: '굵기 ultralight~black 9단계, 스케일 small/medium/large 3단계',
    detail: 'SF 심벌스는 SF Pro 폰트의 9가지 굵기(ultralight부터 black까지)에 정확히 대응하는 9단계 굵기를 제공해, 인접한 텍스트의 굵기와 심벌의 굵기를 맞출 수 있게 설계됐다. 스케일은 SF Pro의 대문자 높이를 기준으로 small, medium, large 세 단계로 나뉘는데, 이는 같은 포인트 크기에서도 텍스트와의 굵기 매칭을 깨뜨리지 않으면서 심벌의 상대적 강조 정도만 조절할 수 있게 하려는 목적이다.',
    demo: { kind: 'stat', value: '9 × 3', label: 'weights × scales' },
  },
  {
    id: 'icon-composer-tool',
    category: '아이콘',
    title: 'Icon Composer 글래스 아이콘',
    source: '공식 HIG',
    spec: '레이어별 굴절·스페큘러·반투명도 조절 가능한 공식 아이콘 제작 툴',
    detail: 'WWDC25에서 공개된 Icon Composer는 하나의 레이어 구성 파일로 아이폰, 아이패드, 맥, 워치용 아이콘을 동시에 만들 수 있게 해주는 애플 공식 툴이다. 각 레이어에 굴절, 스페큘러 하이라이트, 반투명도, 그림자 같은 리퀴드 글래스 속성을 개별적으로 부여할 수 있어, 아이콘도 다른 시스템 컨트롤처럼 빛을 받는 실체처럼 보이도록 설계할 수 있다. 이는 iOS 26부터 아이콘 디자인 가이드라인이 평면적인 플랫 아이콘에서 레이어드 글래스 아이콘 제작으로 방향을 전환했음을 보여준다.',
    demo: {
      kind: 'box',
      content: 'Icon Composer',
      style: { background: 'linear-gradient(160deg, rgba(255,255,255,0.3), rgba(120,120,255,0.15))', backdropFilter: 'blur(10px)', borderRadius: '22%', padding: '24px', color: '#1c1c1e', textAlign: 'center', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 6px 16px rgba(0,0,0,0.15)' },
    },
  },

  // ---------- 컨트롤 ----------
  {
    id: 'ctrl-min-tap-target',
    category: '컨트롤',
    title: '최소 탭 타겟 크기',
    source: '공식 HIG',
    spec: '모든 인터랙티브 컨트롤 최소 44×44pt',
    detail: '애플은 초기 iPhone HIG 때부터 버튼, 슬라이더, 토글 등 손가락으로 조작하는 모든 컨트롤의 최소 크기를 44×44pt로 규정해 왔다. 이보다 작은 타겟은 탭 오류율이 크게 높아진다는 사용성 연구가 근거이며, 운동 장애가 있는 사용자의 접근성도 함께 고려한 수치다. 문단 안에 삽입된 텍스트 링크 정도가 사실상 유일한 예외로 남아 있다.',
    demo: { kind: 'stat', value: '44×44pt', label: '최소 탭 타겟' },
  },
  {
    id: 'ctrl-toggle-switch',
    category: '컨트롤',
    title: '토글 스위치 규격',
    source: '공식 HIG',
    spec: 'iOS 스위치(UISwitch) 51×31pt 고정 크기',
    detail: 'iOS의 표준 토글 스위치는 51×31pt로 크기가 고정되어 있어 개발자가 임의로 치수를 바꿀 수 없다. 시스템 전역에서 온/오프 상태를 나타내는 컨트롤을 동일하게 인식시키기 위한 설계다. 리퀴드 글래스 도입 이후에도 바깥 크기는 그대로 유지되고 트랙·노브의 재질 표현만 유리 질감으로 바뀌었다.',
    demo: { kind: 'box', style: { width: 51, height: 31, borderRadius: 15.5, backgroundColor: '#34C759', border: '1px solid rgba(255,255,255,0.3)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)' } },
  },
  {
    id: 'ctrl-tab-bar',
    category: '컨트롤',
    title: '플로팅 탭 바',
    source: '공식 HIG',
    spec: '콘텐츠 높이 대략 49pt, 좌우·하단 약 21pt 인셋, 스크롤 시 축소',
    detail: 'iOS 26부터 탭 바는 화면 하단에 완전히 붙지 않고 콘텐츠 위에 떠 있는 캡슐형 리퀴드 글래스 표면으로 바뀌었다. 기존 탭 바의 콘텐츠 영역 높이(세이프 에어리어 제외 대략 49pt)는 대체로 유지되지만, 좌우와 하단에서 약 21pt씩 인셋되어 떠 있는 느낌을 만든다(수치는 기기·상황에 따라 달라질 수 있어 근사치다). 아래로 스크롤하면 탭 바가 자동으로 작아져 콘텐츠에 집중하게 하며, 이 축소 동작과 액세서리 뷰 추가는 개발자가 커스터마이즈할 수 있다.',
    demo: { kind: 'box', style: { width: 200, height: 49, borderRadius: 24, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' } },
  },
  {
    id: 'ctrl-nav-large-title',
    category: '컨트롤',
    title: '내비게이션 라지 타이틀',
    source: '공식 HIG',
    spec: '라지 타이틀 상태 약 96pt → 스크롤 시 표준 44pt로 축소',
    detail: '화면에 처음 진입하면 내비게이션 바는 큰 제목을 보여주며 이때 전체 높이가 상태 바를 제외하고 대략 96pt에 이른다. 콘텐츠를 위로 스크롤하면 제목이 점점 작아지면서 표준 내비게이션 바 높이인 44pt로 수렴하는 연속적인 축소 애니메이션이 일어난다. 리퀴드 글래스 적용 이후에는 이 축소 과정에서 배경이 투명한 유리 재질로 바뀌어 콘텐츠가 은은하게 비쳐 보이는 효과가 추가되었다.',
    demo: { kind: 'stat', value: '96pt → 44pt', label: '라지 타이틀 축소' },
  },
  {
    id: 'ctrl-sheet-detents',
    category: '컨트롤',
    title: '시트 프레젠테이션 디텐트',
    source: '공식 HIG',
    spec: '.medium(화면 약 50%), .large(전체 높이), .fraction()·.height()로 커스텀',
    detail: 'SwiftUI의 presentationDetents는 시트가 멈추는 높이 지점을 정의하는 기능이다. 기본 제공되는 .medium은 화면 높이의 대략 절반, .large는 거의 전체 화면을 차지하며, 가로 모드에서는 .medium이 자동으로 비활성화되어 사용 가능한 공간을 보존한다. 필요하면 .fraction(0.3)처럼 비율을 직접 지정하거나 .height()로 정확한 포인트 값을 지정해 세밀하게 커스텀할 수 있고, 디텐트가 둘 이상이면 시스템이 드래그 인디케이터를 자동으로 붙여준다.',
    demo: { kind: 'box', style: { width: 160, height: 90, borderRadius: '20px 20px 0 0', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.3)', borderBottom: 'none' } },
  },
  {
    id: 'ctrl-search-liquid-glass',
    category: '컨트롤',
    title: '검색 필드 캡슐화',
    source: '공식 HIG',
    spec: '툴바 한쪽에 배치된 원형 리퀴드 글래스 검색 캡슐',
    detail: 'iOS 26부터 검색 필드는 넓은 바 형태 대신 툴바 한쪽에 자리한 작고 둥근 리퀴드 글래스 캡슐로 표현되는 경우가 많아졌다. 아이패드에서는 창 오른쪽 위, 아이폰에서는 한손 조작이 쉬운 화면 아래쪽에 배치되는 경향이 있다. 툴바 전체를 투명한 유리 재질로 통일하면서도 검색 기능이 콘텐츠를 가리는 면적을 최소화하려는 설계다.',
    demo: { kind: 'pill', content: '🔍', style: { width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
  },
  {
    id: 'ctrl-segmented-control',
    category: '컨트롤',
    title: '세그먼트 컨트롤',
    source: '공식 HIG',
    spec: '터치 시 알약형 리퀴드 글래스 프레임으로 부풀어 오르는 하이라이트',
    detail: '세그먼트 컨트롤은 탭 바와 같은 계열의 리퀴드 글래스 하이라이트 효과를 공유해, 세그먼트를 누르는 순간 선택 영역이 유리처럼 부풀어 오르는 애니메이션을 보여준다. 정확한 높이값이 공식 문서에 표로 명시되어 있지는 않지만 대략 32~36pt 안팎의 컴팩트한 높이가 흔히 관찰된다(추정치). 탭 바와 달리 위치와 레이아웃을 개발자가 비교적 자유롭게 조정할 수 있다는 점이 특징이다.',
    demo: { kind: 'pill', content: '사진   동영상   추천', style: { padding: '6px 10px', borderRadius: 18, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.25)', fontSize: 13 } },
  },

  // ---------- 모션 ----------
  {
    id: 'motion-spring-default',
    category: '모션',
    title: 'SwiftUI 기본 스프링 값',
    source: '공식 HIG',
    spec: 'response 0.55 / dampingFraction 0.825 / blendDuration 0',
    detail: 'SwiftUI의 .spring() 애니메이션은 매개변수를 지정하지 않으면 response 0.55, dampingFraction 0.825, blendDuration 0을 기본값으로 사용한다. 이 조합은 살짝 튕기면서도 과하지 않게 정지하는, 애플이 UI 전반에서 선호하는 감속 곡선을 만든다. response 값이 낮을수록 애니메이션이 빨라지고 dampingFraction이 낮을수록 통통 튀는 정도가 커진다.',
    demo: { kind: 'stat', value: '0.55 / 0.825', label: 'response / dampingFraction' },
  },
  {
    id: 'motion-interactive-spring',
    category: '모션',
    title: '인터랙티브 스프링',
    source: '공식 HIG',
    spec: '드래그·터치 추적을 위해 응답 속도를 크게 낮춘 스프링 변형',
    detail: 'interactiveSpring()은 기본 스프링보다 response 값을 크게 낮춰(대략 0.15 안팎으로 추정) 손가락 움직임을 지연 없이 즉각 따라가도록 튜닝한 변형이다. 드래그 제스처처럼 사용자의 실시간 입력에 반응해야 하는 인터랙션에 주로 쓰인다. 정확한 기본 수치를 애플이 별도로 공개하지 않아 이 값은 관례적으로 통용되는 근사치로 이해해야 한다.',
    demo: { kind: 'stat', value: '약 0.15', label: 'interactive response(추정)' },
  },
  {
    id: 'motion-liquid-glass-morph',
    category: '모션',
    title: '리퀴드 글래스 모핑 전환',
    source: '공식 HIG',
    spec: '툴바 버튼이 부풀어 시트·메뉴 형태로 이어지는 navigation zoom 전환',
    detail: 'iOS 26의 리퀴드 글래스는 툴바 버튼을 누르면 그 버튼 자체가 부풀어 올라 시트나 메뉴 형태로 자연스럽게 이어지는 모핑 전환을 제공한다. 이는 버튼과 그로 인해 열리는 콘텐츠 사이의 인과관계를 시각적으로 분명히 보여주기 위한 설계다. 개발자는 matchedTransitionSource와 navigationTransition(.zoom) 같은 API로 이 효과를 직접 구현할 수 있다.',
    demo: { kind: 'box', style: { width: 60, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' } },
  },
  {
    id: 'motion-glass-material-thickening',
    category: '모션',
    title: '글래스 재질 두께 변화',
    source: '공식 HIG',
    spec: '확장될수록 재질이 두꺼워지며 렌징·그림자가 강해짐',
    detail: '리퀴드 글래스는 작은 버튼에서 큰 시트로 확장될 때 크기만 커지는 것이 아니라 재질 자체가 더 두껍고 무거운 느낌으로 바뀐다. 확장된 상태에서는 굴절(렌징) 효과와 그림자가 더 뚜렷해져 물리적인 유리 덩어리가 커지는 듯한 인상을 준다. 이런 재질 변화는 사용자에게 화면 위계, 즉 작은 컨트롤과 그것을 감싸는 큰 컨테이너의 관계를 직관적으로 전달한다.',
    demo: { kind: 'box', style: { width: 120, height: 70, borderRadius: 22, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 16px 32px rgba(0,0,0,0.3)' } },
  },
  {
    id: 'motion-reduce-motion',
    category: '모션',
    title: '동작 줄이기 접근성',
    source: '공식 HIG',
    spec: '설정 > 손쉬운 사용 > 동작에서 렌징·패럴랙스 억제, 크로스페이드로 대체',
    detail: '동작 줄이기(Reduce Motion)를 켜면 리퀴드 글래스 특유의 렌징 효과, 기기 움직임에 반응하는 스페큘러 하이라이트, 패럴랙스 애니메이션이 상당 부분 억제된다. 추가로 크로스페이드 전환 선호(Prefer Cross-Fade Transitions)를 켜면 화면 전환 시 요소가 밀려 들어오거나 나가는 대신 서서히 사라졌다 나타나는 방식으로 바뀐다. 다만 두 설정을 모두 켜도 앱 아이콘 모서리의 굴절 효과 같은 일부 시각 효과는 완전히 제거되지 않는다.',
    demo: { kind: 'pill', content: '동작 줄이기 ON → 크로스페이드', style: { padding: '6px 12px', borderRadius: 14, background: 'rgba(120,120,128,0.2)', fontSize: 12 } },
  },

  // ---------- 레이아웃·스페이싱 ----------
  {
    id: 'layout-8pt-grid',
    category: '레이아웃·스페이싱',
    title: '8pt/4pt 기본 그리드',
    source: '공식 HIG',
    spec: '8pt 배수를 기본 단위, 4pt를 세부 정렬용 보조 단위로 사용하는 관행',
    detail: '애플의 HIG 문서가 "8pt 그리드"라는 용어 자체를 명시적으로 규정하지는 않지만, 시스템 UI와 애플이 배포하는 디자인 키트를 역추적하면 대부분의 여백과 크기가 8pt 배수와 4pt 보조 단위에 정렬되어 있다는 것이 디자이너들 사이의 공통된 관찰이다. 따라서 이는 애플이 문서화한 강제 규칙이라기보다, 애플 UI를 일관되게 재현하기 위해 커뮤니티가 정리한 실용적인 작업 모델에 가깝다.',
    demo: { kind: 'box', style: { width: 120, height: 64, backgroundImage: 'repeating-linear-gradient(0deg, rgba(120,120,255,0.25) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgba(120,120,255,0.25) 0 1px, transparent 1px 8px)', border: '1px solid rgba(120,120,255,0.4)', borderRadius: 8 } },
  },
  {
    id: 'layout-edge-margins',
    category: '레이아웃·스페이싱',
    title: '화면 가장자리 여백',
    source: '공식 HIG',
    spec: '일반 아이폰 기본 16pt, 대화면·iPad 맥락 20pt',
    detail: '콘텐츠와 화면 가장자리 사이의 표준 여백은 일반적인 아이폰에서 16pt, 화면이 더 넓은 기기나 iPad 등 맥락에서는 20pt가 흔히 쓰인다. 이 여백은 손가락으로 화면 가장자리를 쥘 때 실수로 콘텐츠를 건드리지 않게 하는 동시에 시각적으로 여유 있는 레이아웃을 만든다. 다만 정확한 값은 화면 크기, 방향, 컨텍스트에 따라 시스템 컴포넌트가 자동으로 조정하는 경우가 많아 절대적인 고정값은 아니다.',
    demo: { kind: 'stat', value: '16pt / 20pt', label: '화면 가장자리 여백' },
  },
  {
    id: 'layout-safe-area',
    category: '레이아웃·스페이싱',
    title: '세이프 에어리어',
    source: '공식 HIG',
    spec: '노치·다이나믹 아일랜드·홈 인디케이터를 자동으로 피하는 레이아웃 가이드',
    detail: '세이프 에어리어는 카메라 노치, 다이나믹 아일랜드, 홈 인디케이터처럼 시스템 UI나 하드웨어 요소가 차지하는 영역을 자동으로 피해 콘텐츠를 배치하도록 돕는 레이아웃 개념이다. 배경이나 몰입형 이미지를 세이프 에어리어 밖까지 확장하는 것은 괜찮지만, 텍스트나 인터랙티브 컨트롤은 반드시 세이프 에어리어 안쪽에 두어야 잘리거나 가려지지 않는다. 기기 세대가 바뀔 때마다 정확한 인셋 수치는 달라지므로 앱은 값을 하드코딩하지 않고 시스템이 제공하는 값을 그대로 따라야 한다.',
    demo: { kind: 'box', style: { width: 100, height: 180, borderRadius: 24, border: '2px solid rgba(255,255,255,0.4)', padding: '28px 8px 20px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)' } },
  },
  {
    id: 'layout-list-row-height',
    category: '레이아웃·스페이싱',
    title: '리스트 행 표준 높이',
    source: '공식 HIG',
    spec: '표준 테이블·리스트 행 높이 약 44pt',
    detail: '표준 리스트·테이블 뷰의 기본 행 높이는 약 44pt로, 이는 최소 탭 타겟 규격과 동일한 값이다. 한 줄짜리 텍스트나 아이콘 정도를 담는 기본 셀에 적합하며, 서브타이틀이나 여러 줄 콘텐츠가 들어가면 셀 높이는 자동으로 그보다 커진다. 탭 타겟 규격과 리스트 행 높이를 일치시켜 리스트 안의 모든 행이 손가락으로 정확히 누르기 좋은 크기를 보장하는 설계다.',
    demo: { kind: 'stat', value: '44pt', label: '리스트 행 높이' },
  },
  {
    id: 'layout-concentric-corners',
    category: '레이아웃·스페이싱',
    title: '동심원 코너 반경 정렬',
    source: '공식 HIG',
    spec: '컨트롤과 컨테이너의 모서리 곡률이 중심을 공유하도록 정렬',
    detail: '리퀴드 글래스 도입과 함께 애플은 버튼이나 컨트롤의 모서리 반경을 그것을 감싸는 컨테이너(카드, 화면 모서리 등)의 반경과 동심원처럼 정렬하는 원칙을 새롭게 강조했다. 안쪽 요소와 바깥 요소의 곡률 중심이 어긋나면 둘 사이 여백이 시각적으로 고르지 않아 보이기 때문에, 컨테이너 반경에서 여백만큼을 뺀 값을 안쪽 요소의 반경으로 쓰는 방식이 권장된다. 이 개념은 WWDC 2025의 리퀴드 글래스 관련 세션에서 공식적으로 소개되었다.',
    demo: { kind: 'box', style: { width: 100, height: 100, borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', padding: 12, boxSizing: 'border-box' } },
  },

  // ---------- 커뮤니티 컨셉 ----------
  // 참고: 이 카테고리는 애초에 "iOS/macOS 27은 아직 출시되지 않은 미래 버전"이라는 전제로
  // 조사가 시작됐지만, 실제로는 2026년 6월 WWDC에서 iOS 27·macOS 27 Golden Gate가 이미
  // 공식 발표되고 베타가 배포 중임이 확인됐다. 그래서 이 탭에는 "이제는 확정된 공식 사실
  // (베타 기준)"과 "여전히 근거 없는 순수 커뮤니티 추측"이 source 필드로 구분되어 섞여 있다.
  {
    id: 'concept-wwdc2026-announcement',
    category: '커뮤니티 컨셉',
    title: 'iOS·macOS 27 공식 발표',
    source: '공식 HIG',
    spec: '2026년 6월 8일 WWDC에서 iOS 27·macOS 27 Golden Gate 공개, 현재 베타 진행 중',
    detail: '이 문서를 작성하는 시점(2026년 7월) 기준으로 애플은 이미 2026년 6월 WWDC에서 iOS 27, iPadOS 27, macOS 27(코드네임 Golden Gate)을 공식 발표했고 개발자 베타가 세 번째 버전까지 배포된 상태다. 즉 이번 조사에서 참고한 두 Figma "Community" 파일이 다루는 iOS·macOS 27은 더 이상 먼 미래의 상상이 아니라 베타 단계의 실제 운영체제다. 다만 정식 출시(가을 예상) 전까지는 세부 사항이 바뀔 수 있어, 이 카테고리의 다른 항목에는 "베타 기준"이라는 전제가 붙는다.',
    demo: { kind: 'stat', value: '2026.06.08', label: 'WWDC 2026 발표일' },
  },
  {
    id: 'concept-official-figma-kit',
    category: '커뮤니티 컨셉',
    title: '애플 공식 27 디자인 키트',
    source: '공식 HIG',
    spec: '애플이 iOS·iPadOS·macOS 27용 공식 Figma·Sketch UI 키트를 developer.apple.com에서 직접 배포',
    detail: '흥미롭게도 애플은 WWDC 2026 이후 developer.apple.com을 통해 iOS·iPadOS·macOS 27용 공식 Figma 및 Sketch 디자인 키트를 직접 배포했다. 이번 조사의 출발점이었던 두 링크는 이 공식 키트가 아니라 팬 디자이너가 만든 "Community" 표기의 비공식 목업 파일로, 애플 공식 키트가 나오기 전부터 만들어진 추정 자료일 가능성이 높다. 따라서 정확한 27세대 컴포넌트 사양이 필요하다면 공식 키트를, 발표 이전 시점의 커뮤니티 상상력을 보고 싶다면 Community 파일을 참고하는 것이 맞는 구분이다.',
    demo: { kind: 'pill', content: 'Apple Design Resources · 27', style: { padding: '6px 12px', borderRadius: 14, background: 'rgba(10,132,255,0.15)', color: '#0a84ff', fontSize: 12, fontWeight: 600 } },
  },
  {
    id: 'concept-transparency-slider',
    category: '커뮤니티 컨셉',
    title: '리퀴드 글래스 투명도 슬라이더',
    source: '공식 HIG',
    spec: '설정 앱에 신규 슬라이더 추가, 클리어~완전 틴트까지 연속 조절(온오프 아님)',
    detail: 'iOS 26 출시 이후 과도한 투명도로 가독성이 떨어진다는 사용자 불만이 이어지자, 애플은 iOS 27과 macOS 27 Golden Gate에 리퀴드 글래스의 투명도를 사용자가 직접 클리어부터 완전 틴트까지 조절할 수 있는 슬라이더를 새로 추가했다. 이 슬라이더는 기기 최초 설정 화면과 설정 앱 두 곳에 노출되며, 온오프 스위치가 아니라 연속적인 단계로 조절되는 점이 특징이다. 이는 재질의 심미성과 실용적 가독성 사이에서 선택권을 사용자에게 넘긴 조정으로 볼 수 있다.',
    demo: { kind: 'stat', value: 'Clear ↔ Tinted', label: '투명도 슬라이더 범위(베타)' },
  },
  {
    id: 'concept-readability-tuning',
    category: '커뮤니티 컨셉',
    title: '가독성 개선 튜닝',
    source: '공식 HIG',
    spec: '배경 확산(diffusion) 강화, 테두리 어둡게, 스페큘러 하이라이트 더 밝게',
    detail: '애플은 iOS 27에서 리퀴드 글래스가 복잡한 배경 콘텐츠를 이전보다 훨씬 효과적으로 확산시켜 흐려 보이도록 튜닝해 그 위에 놓인 텍스트와 아이콘의 가독성을 높였다고 설명했다. 또한 글래스 요소 가장자리를 살짝 어둡게 처리하고 스페큘러 하이라이트는 더 밝게 강조해 배경과 컨트롤 사이의 경계와 깊이감을 분명히 했다. 이는 iOS 26 출시 초기 나왔던 "무엇이 눌리는 버튼이고 무엇이 배경인지 구분이 안 된다"는 비판에 대한 직접적인 응답으로 보인다.',
    demo: { kind: 'box', style: { background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(18px)', borderRadius: 20, border: '1px solid rgba(0,0,0,0.25)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 6px 18px rgba(0,0,0,0.25)', padding: '18px 24px', color: '#1c1c1e' } },
  },
  {
    id: 'concept-icon-layer-depth',
    category: '커뮤니티 컨셉',
    title: '아이콘 레이어 심화',
    source: '공식 HIG',
    spec: '라이트·다크·틴트·클리어 4개 아이콘 모드 모두에 유리 레이어 추가',
    detail: 'iOS 26에서 아이콘이 흐릿하고 디테일이 뭉개진다는 지적을 받자, iOS 27은 라이트, 다크, 틴트, 클리어 네 가지 아이콘 모드 전부에 리퀴드 글래스 레이어를 추가로 얹어 아이콘 아트워크 자체를 더 선명하고 또렷하게 다듬었다. Icon Composer로 만든 레이어 구조에 깊이를 한 겹 더한 셈인데, 어떤 모드를 선택해도 아이콘 경계와 디테일이 뭉개지지 않도록 만드는 것이 목표다.',
    demo: { kind: 'box', style: { width: 56, height: 56, borderRadius: '22%', background: 'linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))', border: '1px solid rgba(255,255,255,0.3)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)' } },
  },
  {
    id: 'concept-macos-window-corner',
    category: '커뮤니티 컨셉',
    title: 'macOS 창 모서리 통일',
    source: '공식 HIG',
    spec: '모든 앱 창 모서리 반경을 더 좁고 일관되게 통일, 개발자 업데이트 없이도 자동 적용',
    detail: 'macOS 27 Golden Gate는 앱 창의 모서리 반경을 이전 버전(Tahoe)보다 눈에 띄게 좁고 통일된 값으로 재조정했다. 개발자가 앱을 따로 업데이트하지 않아도 시스템 차원에서 자동으로 적용되는 변경이라는 점이 특징이며, 이는 여러 서드파티 앱의 창 모서리가 저마다 달라 보이던 파편화 문제를 시스템이 직접 해결한 사례다.',
    demo: { kind: 'box', style: { width: 90, height: 60, borderRadius: 12, background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.2)' } },
  },
  {
    id: 'concept-macos-sidebar-edge',
    category: '커뮤니티 컨셉',
    title: '엣지투엣지 사이드바 복귀',
    source: '공식 HIG',
    spec: '사이드바가 떠 있는 카드 형태 대신 창 가장자리까지 이어지는 형태로 회귀, 아이콘 색상 복원',
    detail: 'macOS Tahoe에서 사이드바를 창 안쪽에 살짝 띄운 카드 형태로 바꾸고 아이콘을 단색으로 통일했던 것과 달리, macOS 27 Golden Gate는 사이드바를 다시 창 가장자리까지 이어지는 형태로 되돌리고 불필요한 그림자를 없앴다. 사이드바 아이콘도 컬러를 되찾아 정보를 훑어볼 때 색으로 항목을 빠르게 구분할 수 있게 했다. 이는 새로운 재질을 도입했다가 사용성 피드백을 받고 이전 방식의 장점을 다시 받아들인, 드문 방향 전환 사례다.',
    demo: { kind: 'box', style: { width: 100, height: 70, borderRadius: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.03) 30%)', border: '1px solid rgba(255,255,255,0.2)' } },
  },
  {
    id: 'concept-unified-toolbar',
    category: '커뮤니티 컨셉',
    title: '앱 전반 통일 툴바',
    source: '공식 HIG',
    spec: '텍스트 헤딩과 컨트롤 그룹의 가독성을 높이는 일관된 툴바 스타일 적용',
    detail: 'macOS 27 Golden Gate는 앱마다 제각각이던 툴바 스타일을 통일해 제목 텍스트와 컨트롤 그룹이 어떤 앱에서든 일관된 위치와 위계로 보이도록 정리했다. 이는 사이드바 변경과 마찬가지로 리퀴드 글래스가 가져온 자유도가 오히려 앱마다 다른 레이아웃 관행을 낳았던 문제를, 시스템 차원의 규범으로 다시 좁힌 조정이다.',
    demo: { kind: 'box', style: { width: 140, height: 22, borderRadius: 8, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' } },
  },
  {
    id: 'concept-frutiger-glass',
    category: '커뮤니티 컨셉',
    title: '프루티거 글래스 팬 컨셉',
    source: '커뮤니티 컨셉',
    spec: '2000년대 스큐어모픽 감성 프루티거 에어로 + 리퀴드 글래스 결합을 상상한 비공식 컨셉',
    detail: 'Figma 커뮤니티에는 플랫 디자인이 완전히 저물고 2000년대 프루티거 에어로풍 스큐어모피즘이 리퀴드 글래스와 결합한 "프루티거 글래스"라는 이름의 팬 디자인 언어가 다음 아이폰 UI가 될 것이라 상상한 컨셉 파일이 올라와 있다. 이는 특정 개인 디자이너의 추측일 뿐 애플이 실제로 채택했거나 예고한 방향이 아니며, 실제 iOS 27은 이런 급진적 스큐어모피즘 회귀 없이 기존 리퀴드 글래스를 다듬는 수준에 머물렀다.',
    demo: { kind: 'swatches', colors: ['#7fd8e8', '#a0c4ff', '#ffd6a5', '#ffffff'] },
  },
  {
    id: 'concept-expectation-vs-reality',
    category: '커뮤니티 컨셉',
    title: '"큰 변화 없다"는 반응',
    source: '커뮤니티 컨셉',
    spec: '일부 매체·커뮤니티는 macOS 27의 변화 폭이 기대보다 작다고 평가',
    detail: 'WWDC 2026 발표 직후 일부 IT 매체와 디자인 커뮤니티에서는 macOS 27 Golden Gate의 리퀴드 글래스 변화가 투명도 슬라이더와 세부 다듬기 수준에 그쳐, 기대했던 만큼 급진적인 재설계는 아니라는 평가가 나왔다. 이는 리퀴드 글래스가 처음 등장한 iOS 26 때부터 이어진 "과도한 투명도" 논란에 대해 애플이 완전히 새로운 소재를 내놓기보다 기존 소재를 세밀하게 보정하는 보수적인 선택을 했다는 해석과 맞물린다. 커뮤니티의 기대와 실제 발표 사이의 이런 온도 차 자체가, 다음 세대 UI를 예측하는 일이 얼마나 불확실한지 보여주는 사례다.',
    demo: { kind: 'pill', content: '"기대보다 조용한 업데이트"', style: { padding: '6px 12px', borderRadius: 14, background: 'rgba(120,120,128,0.18)', fontSize: 12 } },
  },
  {
    id: 'concept-post-27-speculation',
    category: '커뮤니티 컨셉',
    title: '차차기 버전 앞선 상상',
    source: '커뮤니티 컨셉',
    spec: '완전 자동 적응형 재질, AI 기반 레이아웃 재배치 등 아직 근거 없는 추측',
    detail: '커뮤니티는 이미 iOS 27조차 정식 출시되기 전인 지금부터 그 다음 세대를 상상하기 시작했는데, 사용자가 슬라이더로 수동 조절하는 지금의 투명도 설정을 넘어 시간대나 주변 조도에 따라 재질이 완전히 자동으로 적응하는 소재, 혹은 생성형 AI가 맥락에 맞춰 위젯과 레이아웃을 실시간으로 재배치하는 인터페이스 같은 아이디어가 거론된다. 이런 항목들은 애플이 공식적으로 확인하거나 로드맵에 올린 적이 없는 순수한 추정이며, 매년 반복되는 "다음엔 이렇게 바뀌지 않을까"라는 팬 디자이너들의 상상력에 가깝다는 점을 분명히 해 둔다.',
    demo: { kind: 'text', content: '완전 자동 적응형 테마 · AI 재배치 UI (커뮤니티 추정)', style: { fontSize: 13, opacity: 0.85 } },
  },
]
