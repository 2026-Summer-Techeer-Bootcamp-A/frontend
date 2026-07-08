// ============================================================
// Do & Don't 레퍼런스 데이터 — AI 생성 UI(바이브 코딩) 클리셰를 반면교사 삼는다.
// /design-system/guide 페이지에서 렌더링.
// ============================================================

import type { StageSpec } from './Stage'
export type { StageSpec }

export interface DontDoItem {
  id: string
  category: string
  title: string
  dont: string
  do: string
  dontStage: StageSpec
  doStage: StageSpec
}

export const CATEGORIES = [
  '색상', '그라디언트·배경', '버튼', '타이포그래피', '아이콘·이모지', '카드·레이아웃',
  '데이터·숫자', '랜딩·히어로', '배지·상태', '모션·애니메이션', '폼·인풋', 'AI 클리셰',
] as const

export const DONT_DO_ITEMS: DontDoItem[] = [
  // ---------- 색상 ----------
  {
    id: 'rainbow-badges',
    category: '색상',
    title: '무지개 배지',
    dont: '역할이나 팀마다 다른 원색을 배지에 입히는 방식이다. 색이 정보 구분 이상의 의미를 갖지 못해 장식처럼 보이고, AI 생성 UI의 전형적인 팔레트 남용으로 읽힌다.',
    do: '액센트인 슬레이트 블루 한 가지만 강조가 필요한 항목에 쓰고 나머지는 뉴트럴 톤 하나로 통일한다. 색은 위계를 표현할 때만 사용한다.',
    dontStage: { kind: 'swatches', colors: ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#ef4444'] },
    doStage: { kind: 'swatches', colors: ['#2f61b8', '#eef1f6', '#e2e5ec', '#7c7f88'] },
  },
  {
    id: 'tailwind-default-blue',
    category: '색상',
    title: '기본 블루 남용',
    dont: 'Tailwind 기본 팔레트의 #3B82F6 계열을 그대로 쓰는 것은 어느 AI 코딩 툴로 만들었는지 색만 보고 알 수 있을 정도로 흔한 패턴이다.',
    do: '브랜드 고유의 액센트인 슬레이트 블루 #2f61b8 한 톤으로 통일해 어디에서도 본 적 없는 우리만의 색 정체성을 만든다.',
    dontStage: { kind: 'swatches', colors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
    doStage: { kind: 'swatches', colors: ['#2f61b8', '#1c1d21', '#7c7f88'] },
  },
  {
    id: 'pastel-gradient-cards',
    category: '색상',
    title: '파스텔 그라데이션',
    dont: '카드 배경에 연보라·연분홍·연하늘색 그라데이션을 얹는 것은 감정을 자극하려는 장식이지 정보 전달과는 무관하다.',
    do: '카드 배경은 흰색이나 옅은 뉴트럴 톤 단색으로 두고, 강조는 텍스트 굵기와 보더로만 표현한다.',
    dontStage: { kind: 'swatches', colors: ['#fbcfe8', '#ddd6fe', '#bfdbfe', '#bbf7d0'] },
    doStage: { kind: 'swatches', colors: ['#ffffff', '#f6f8fc', '#eef1f6'] },
  },
  {
    id: 'purple-pink-ai-gradient',
    category: '색상',
    title: '보라-핑크 그라디언트',
    dont: "보라에서 핑크로 흐르는 그라디언트는 생성형 AI 서비스들이 약속이라도 한 듯 쓰는 '우리는 AI입니다' 표식이 되어버렸다.",
    do: 'AI 관련 기능이라고 해서 색을 바꾸지 않는다. 같은 액센트, 같은 뉴트럴로 나머지 화면과 한 몸처럼 보이게 한다.',
    dontStage: { kind: 'swatches', colors: ['#a855f7', '#ec4899'] },
    doStage: { kind: 'swatches', colors: ['#2f61b8', '#1c1d21'] },
  },
  {
    id: 'trend-color-inconsistency',
    category: '색상',
    title: '등락 색 혼용',
    dont: '화면마다 상승을 초록·파랑·보라 등 제각각의 색으로 표시하면 사용자는 매번 색의 의미를 새로 학습해야 한다.',
    do: '상승은 success, 하락은 danger로 앱 전체에서 고정한다. 색이 예측 가능해야 신뢰가 쌓인다.',
    dontStage: { kind: 'swatches', colors: ['#22c55e', '#06b6d4', '#a855f7', '#f59e0b'] },
    doStage: { kind: 'swatches', colors: ['#1c7a4d', '#b5342a'] },
  },

  // ---------- 그라디언트·배경 ----------
  {
    id: 'mesh-gradient-blob-bg',
    category: '그라디언트·배경',
    title: '메시 그라디언트 블롭',
    dont: '배경에 보라·시안 원형 블롭을 흐릿하게 겹쳐 넣는 메시 그라디언트는 랜딩페이지 생성기가 기본값으로 뽑아내는 배경이다.',
    do: '배경은 옅은 뉴트럴 단색으로 비워두고, 콘텐츠의 대비만으로 시선을 이끈다.',
    dontStage: {
      kind: 'box',
      content: '히어로 배경',
      style: { background: 'radial-gradient(circle at 25% 20%, #a855f7 0%, transparent 55%), radial-gradient(circle at 75% 70%, #22d3ee 0%, transparent 55%), #120a24', color: '#ffffff', borderRadius: 20, padding: '32px 20px', textAlign: 'center', fontWeight: 700 },
    },
    doStage: {
      kind: 'box',
      content: '히어로 배경',
      style: { background: '#f6f8fc', color: '#1c1d21', border: '1px solid #e2e5ec', borderRadius: 14, padding: '32px 20px', textAlign: 'left', fontWeight: 700 },
    },
  },
  {
    id: 'glassmorphism-overuse',
    category: '그라디언트·배경',
    title: '아무데나 글래스모피즘',
    dont: '정적인 설정 카드처럼 뜨지 않는 평면 요소에까지 반투명 블러를 깔면, 뒤에 진짜 콘텐츠가 없으니 유리 질감이 아니라 그냥 흐릿한 장식판이 된다.',
    do: 'iOS 26 Liquid Glass처럼 유리 재질은 탭바·시트·팝오버 등 콘텐츠 위에 실제로 떠 있는 컨트롤에만 쓰고, 상단에 미세한 하이라이트 보더로 빛이 스치는 가장자리를 표현한다. 정적 카드는 불투명한 표면으로 남긴다.',
    dontStage: {
      kind: 'box',
      content: '설정 (정적 카드)',
      style: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 18, boxShadow: '0 8px 32px rgba(31,38,135,0.37)', padding: '16px 20px', color: '#ffffff' },
    },
    doStage: {
      kind: 'box',
      content: '탭바 (뜨는 컨트롤)',
      style: { background: 'rgba(28,29,33,0.65)', backdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.12)', borderTop: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, boxShadow: '0 10px 30px rgba(20,20,30,0.35)', padding: '16px 20px', color: '#ffffff' },
    },
  },
  {
    id: 'blob-morph-infinite-animation',
    category: '그라디언트·배경',
    title: '블롭 모핑 애니메이션',
    dont: '배경에서 무한 반복으로 모양이 일렁이는 블롭 애니메이션은 시선을 계속 빼앗아 정작 읽어야 할 콘텐츠에 집중을 방해한다.',
    do: '배경은 정적으로 두고, 움직임은 사용자의 조작에 반응하는 요소에만 짧게 허용한다.',
    dontStage: {
      kind: 'box',
      content: '배경 레이어',
      style: { background: 'linear-gradient(135deg,#f472b6,#818cf8,#38bdf8)', borderRadius: 20, padding: '32px 20px', color: '#ffffff', textAlign: 'center' },
    },
    doStage: {
      kind: 'box',
      content: '배경 레이어',
      style: { background: '#f6f8fc', border: '1px solid #e2e5ec', borderRadius: 14, padding: '32px 20px', color: '#1c1d21', textAlign: 'left' },
    },
  },
  {
    id: 'neon-glow-dark-mode',
    category: '그라디언트·배경',
    title: '네온 글로우 다크모드',
    dont: "다크모드를 보라·핑크 네온 글로우로 채우는 '사이버펑크 SaaS' 룩은 채용 서비스의 신뢰감과 어울리지 않는다.",
    do: '다크모드에서도 절제된 잉크 배경과 얇은 뉴트럴 보더만으로 구성해 라이트모드와 같은 톤의 언어를 유지한다.',
    dontStage: {
      kind: 'box',
      content: '다크모드 카드',
      style: { background: '#0a0a12', border: '1px solid #7c3aed', boxShadow: '0 0 24px 4px rgba(139,92,246,0.6), 0 0 48px 8px rgba(236,72,153,0.35)', borderRadius: 16, padding: '16px 20px', color: '#e9d5ff' },
    },
    doStage: {
      kind: 'box',
      content: '다크모드 카드',
      style: { background: '#1c1d21', border: '1px solid #7c7f88', borderRadius: 14, padding: '16px 20px', color: '#eef1f6', boxShadow: 'none' },
    },
  },

  // ---------- 버튼 ----------
  {
    id: 'glossy-gradient-button',
    category: '버튼',
    title: '글로시 그라디언트',
    dont: '위쪽은 밝고 아래쪽은 진해지는 광택 그라디언트에 인셋 하이라이트까지 넣은 버튼은 스톡 SaaS 템플릿의 시그니처다.',
    do: '버튼은 액센트 단색 하나로 채우고 광택이나 인셋 효과 없이 플랫하게 마감한다.',
    dontStage: {
      kind: 'pill',
      content: '지원하기',
      style: { background: 'linear-gradient(180deg,#60a5fa,#2563eb)', color: '#ffffff', borderRadius: 999, fontWeight: 700, padding: '12px 28px', border: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(37,99,235,0.4)' },
    },
    doStage: {
      kind: 'pill',
      content: '지원하기',
      style: { background: '#2f61b8', color: '#ffffff', borderRadius: 10, fontWeight: 700, padding: '12px 24px', border: 'none', boxShadow: 'none' },
    },
  },
  {
    id: 'button-radius-full-uniform',
    category: '버튼',
    title: '전부 rounded-full',
    dont: 'primary든 secondary든 크기와 상관없이 모든 버튼을 알약 모양으로 통일하면 버튼 간 위계가 사라진다.',
    do: '버튼은 7~20px 사이의 절제된 라운드로 통일하고, pill 형태는 배지·칩 같은 작은 상태 표시에만 남겨둔다.',
    dontStage: {
      kind: 'pill',
      content: '전체 공고 보기',
      style: { borderRadius: 999, background: '#3b82f6', color: '#ffffff', fontWeight: 700, padding: '10px 24px', border: 'none' },
    },
    doStage: {
      kind: 'pill',
      content: '전체 공고 보기',
      style: { borderRadius: 10, background: '#2f61b8', color: '#ffffff', fontWeight: 700, padding: '10px 20px', border: 'none' },
    },
  },
  {
    id: 'button-emoji-icon-shadow-stack',
    category: '버튼',
    title: '장식 3종 세트',
    dont: '이모지, 아이콘, 그림자를 버튼 하나에 전부 얹으면 강조 장치가 서로를 상쇄해 오히려 아무것도 강조되지 않는다.',
    do: '버튼은 명확한 라벨 텍스트 하나로 충분하다. 꼭 필요한 경우에만 아이콘 하나를 더한다.',
    dontStage: {
      kind: 'pill',
      content: '✨ 지원하기 🚀',
      style: { background: 'linear-gradient(90deg,#f97316,#ef4444)', color: '#ffffff', borderRadius: 999, fontWeight: 800, padding: '12px 26px', boxShadow: '0 6px 16px rgba(239,68,68,0.45)' },
    },
    doStage: {
      kind: 'pill',
      content: '지원하기',
      style: { background: '#2f61b8', color: '#ffffff', borderRadius: 10, fontWeight: 700, padding: '12px 24px', boxShadow: 'none' },
    },
  },
  {
    id: 'hover-scale-105-overuse',
    category: '버튼',
    title: 'hover 확대 남발',
    dont: '마우스를 올릴 때마다 살짝 커지는 scale(1.05) 효과를 모든 버튼과 카드에 걸면 화면 전체가 들썩여 산만해진다.',
    do: 'hover 반응은 배경색이나 보더 색 변화처럼 크기 변형이 없는 정적인 방식으로 제한한다.',
    dontStage: {
      kind: 'pill',
      content: '더보기',
      style: { background: '#3b82f6', color: '#ffffff', borderRadius: 999, fontWeight: 700, padding: '10px 22px', boxShadow: '0 8px 20px rgba(59,130,246,0.5)' },
    },
    doStage: {
      kind: 'pill',
      content: '더보기',
      style: { background: '#eef1f6', color: '#1c1d21', border: '1px solid #e2e5ec', borderRadius: 10, fontWeight: 600, padding: '10px 20px' },
    },
  },

  {
    id: 'button-zero-feedback',
    category: '버튼',
    title: '프레스 피드백 제거',
    dont: '그라디언트를 없앤다고 버튼을 눌러도 아무 변화가 없는 완전한 무반응 평면으로 만들면, 눌렸는지 아닌지 알 수 없는 실물감 없는 버튼이 된다.',
    do: 'iOS 스타일처럼 누르는 순간 살짝 축소(scale 0.97)되고 살짝 어두워지는 물리적 피드백을 남긴다. 화려한 튐 없이 딱 필요한 만큼의 실재감이다.',
    dontStage: {
      kind: 'pill',
      content: '지원하기',
      style: { background: '#2f61b8', color: '#ffffff', borderRadius: 10, fontWeight: 700, padding: '12px 24px', boxShadow: 'none', opacity: 1 },
    },
    doStage: {
      kind: 'pill',
      content: '지원하기',
      style: { background: '#28539c', color: '#ffffff', borderRadius: 10, fontWeight: 700, padding: '12px 24px', boxShadow: '0 1px 2px rgba(20,30,60,0.15)', transform: 'scale(0.97)' },
    },
  },

  // ---------- 타이포그래피 ----------
  {
    id: 'centered-gradient-hero-text',
    category: '타이포그래피',
    title: '그라디언트 히어로 텍스트',
    dont: '제목 텍스트에 배경 그라디언트를 입히고 투명 글자색으로 오려내는 효과는 랜딩페이지 생성기의 기본 헤드라인 스타일이다.',
    do: '제목은 잉크 색 단색에 굵기와 자간만으로 강조하고, 좌측 정렬로 본문 흐름과 자연스럽게 이어지게 한다.',
    dontStage: {
      kind: 'text',
      content: '데이터로 보는 진짜 상권',
      style: { background: 'linear-gradient(90deg,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: 30, textAlign: 'center' },
    },
    doStage: {
      kind: 'text',
      content: '데이터로 보는 진짜 상권',
      style: { color: '#1c1d21', fontWeight: 800, fontSize: 28, textAlign: 'left', letterSpacing: '-1px' },
    },
  },
  {
    id: 'typography-scale-no-standard',
    category: '타이포그래피',
    title: '자간·크기 기준 없음',
    dont: '화면마다 임의의 크기와 자간을 즉흥적으로 쓰면 같은 역할의 텍스트가 페이지마다 다르게 보인다.',
    do: '8단계 타입 스케일을 정하고 역할별로 크기·자간·굵기를 고정해 어느 화면에서도 같은 규칙을 따르게 한다.',
    dontStage: { kind: 'text', content: '공고 상세', style: { fontSize: 22, letterSpacing: '2px', fontWeight: 500, textTransform: 'uppercase' } },
    doStage: { kind: 'text', content: '공고 상세', style: { fontSize: 20, letterSpacing: '-0.5px', fontWeight: 700, color: '#1c1d21' } },
  },
  {
    id: 'five-font-weights-at-once',
    category: '타이포그래피',
    title: '굵기 5종 남용',
    dont: '한 화면 안에 얇은 300부터 900까지 다섯 가지 굵기가 섞여 있으면 어떤 텍스트가 더 중요한지 알 수 없다.',
    do: '굵기는 Regular·SemiBold·Bold·ExtraBold 네 단계로만 제한해 위계를 명확히 만든다.',
    dontStage: { kind: 'text', content: '월 350만원 이상', style: { fontSize: 18, fontWeight: 300 } },
    doStage: { kind: 'text', content: '월 350만원 이상', style: { fontSize: 18, fontWeight: 700, color: '#1c1d21' } },
  },
  {
    id: 'numbers-no-tabular-nums',
    category: '타이포그래피',
    title: '숫자 정렬 미적용',
    dont: '숫자에 비례 폭 글꼴을 그대로 쓰면 자릿수가 바뀔 때마다 표나 리스트의 정렬이 흔들린다.',
    do: '모든 숫자에 tabular-nums를 적용하고 우측 정렬해 자릿수가 바뀌어도 열이 흔들리지 않게 한다.',
    dontStage: { kind: 'text', content: '1,204', style: { fontVariantNumeric: 'normal', textAlign: 'left', fontWeight: 400 } },
    doStage: { kind: 'text', content: '1,204', style: { fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 700, color: '#1c1d21' } },
  },

  // ---------- 아이콘·이모지 ----------
  {
    id: 'emoji-in-every-title',
    category: '아이콘·이모지',
    title: '제목마다 이모지',
    dont: '섹션 제목마다 이모지를 하나씩 붙이면 문서 전체가 캐주얼한 블로그 포스트처럼 보여 채용 서비스의 신뢰도를 떨어뜨린다.',
    do: '제목은 텍스트만으로 명확하게 쓰고, 필요한 강조는 굵기와 크기로 해결한다.',
    dontStage: { kind: 'emoji', items: ['🚀', '📊', '💼'] },
    doStage: { kind: 'emoji', items: ['채용 공고'] },
  },
  {
    id: 'sparkles-icon-ai-cliche',
    category: '아이콘·이모지',
    title: 'Sparkles=AI 클리셰',
    dont: '반짝이는 별 아이콘을 붙이면 무조건 AI 기능처럼 보인다는 공식이 굳어져 오히려 진부하게 읽힌다.',
    do: 'AI 기능도 다른 기능과 같은 아이콘 세트, 같은 톤으로 표시해 특별 취급하지 않는다.',
    dontStage: { kind: 'emoji', items: ['✨', '🤖', '⭐'] },
    doStage: { kind: 'emoji', items: ['AI 추천'] },
  },
  {
    id: 'pastel-circle-icons-per-feature',
    category: '아이콘·이모지',
    title: '파스텔 원형 아이콘',
    dont: '기능 카드마다 색이 제각각인 파스텔 원형 배경 위에 아이콘을 얹으면 기능들이 서로 무관해 보인다.',
    do: '아이콘 배경은 같은 뉴트럴 톤 하나로 통일하고, 아이콘 자체도 같은 두께의 선 아이콘 세트를 쓴다.',
    dontStage: { kind: 'avatarRow', colors: ['#fbcfe8', '#c7d2fe', '#bbf7d0', '#fed7aa'] },
    doStage: { kind: 'avatarRow', colors: ['#eef1f6', '#eef1f6', '#eef1f6'] },
  },
  {
    id: 'star-icon-before-score',
    category: '아이콘·이모지',
    title: '점수 앞 별 아이콘',
    dont: '숫자 점수 앞에 별 아이콘을 다섯 개씩 늘어놓는 것은 커머스 리뷰 위젯을 그대로 복사한 듯한 인상을 준다.',
    do: '점수는 숫자와 라벨만으로 표시하고, 별 아이콘 같은 장식은 생략한다.',
    dontStage: { kind: 'emoji', items: ['⭐', '⭐', '⭐', '⭐', '⭐'] },
    doStage: { kind: 'emoji', items: ['4.8점'] },
  },
  {
    id: 'isometric-3d-illustration-overuse',
    category: '아이콘·이모지',
    title: '3D 일러스트 남용',
    dont: '모든 섹션마다 화려한 3D 아이소메트릭 일러스트를 넣으면 제작 비용도 크고 실제 서비스 화면과 톤이 어긋난다.',
    do: '일러스트 대신 실제 데이터와 간결한 선 아이콘으로 설명해 서비스 화면과 같은 톤을 유지한다.',
    dontStage: { kind: 'emoji', items: ['🧑‍💻', '🏢', '📈'] },
    doStage: { kind: 'emoji', items: ['채용'] },
  },

  // ---------- 카드·레이아웃 ----------
  {
    id: 'card-in-card-nesting',
    category: '카드·레이아웃',
    title: '카드 속 카드',
    dont: '카드 안에 보더와 그림자를 가진 또 다른 카드를 넣으면 모든 레이어가 같은 무게로 보여 위계가 사라진다.',
    do: '하위 그룹은 옅은 배경 톤과 여백만으로 표현하고 별도의 보더나 그림자를 반복하지 않는다.',
    dontStage: {
      kind: 'box',
      content: '커버리지 73%',
      style: { background: 'linear-gradient(135deg,#eef2ff,#fdf2f8)', border: '1px solid #e5e7eb', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 20 },
      inner: { content: '상세 지표', style: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: 14 } },
    },
    doStage: {
      kind: 'box',
      content: '커버리지 73%',
      style: { background: 'rgba(120,124,150,0.08)', borderRadius: 14, padding: 16, fontWeight: 700, color: '#1c1d21' },
    },
  },
  {
    id: 'three-col-icon-card-cliche',
    category: '카드·레이아웃',
    title: '3열 카드 클리셰',
    dont: '아이콘 위에 제목, 아래에 설명을 두고 가운데 정렬한 카드 3개를 나란히 배치하는 구성은 어느 랜딩페이지에서나 똑같이 보인다.',
    do: '카드는 좌측 정렬로 정보 흐름을 자연스럽게 두고, 텍스트 위계로 내용을 구분한다.',
    dontStage: {
      kind: 'box',
      content: '빠른 매칭',
      style: { background: 'linear-gradient(160deg,#fef3c7,#fee2e2)', border: '1px solid #fde68a', borderRadius: 24, boxShadow: '0 12px 24px rgba(0,0,0,0.08)', textAlign: 'center', padding: 24, fontWeight: 700 },
    },
    doStage: {
      kind: 'box',
      content: '빠른 매칭',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', borderRadius: 14, textAlign: 'left', padding: 16, fontWeight: 700, color: '#1c1d21' },
    },
  },
  {
    id: 'rounded-3xl-everywhere',
    category: '카드·레이아웃',
    title: '과도한 둥근 모서리',
    dont: '카드, 버튼, 인풋 할 것 없이 전부 32px 이상의 큰 라운드로 통일하면 화면 전체가 장난감처럼 물렁해 보인다.',
    do: '모서리는 7~20px 사이의 절제된 값으로 통일해 정보 밀도가 높은 화면에서도 단단한 인상을 유지한다.',
    dontStage: {
      kind: 'box',
      content: '공고 카드',
      style: { borderRadius: 32, background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', border: 'none', padding: 20 },
    },
    doStage: {
      kind: 'box',
      content: '공고 카드',
      style: { borderRadius: 14, background: '#ffffff', border: '1px solid #e2e5ec', padding: 20, color: '#1c1d21' },
    },
  },
  {
    id: 'shadow-2xl-default',
    category: '카드·레이아웃',
    title: 'shadow-2xl 기본값',
    dont: '모든 카드에 짙고 넓게 퍼지는 shadow-2xl을 기본값으로 걸면 화면의 모든 요소가 동시에 떠 있어 정작 진짜로 떠야 할 요소(시트, 팝오버)가 구분되지 않는다.',
    do: '평면 요소는 그림자 없이 보더로만 경계를 표현하고, 그림자는 실제로 위에 떠 있는 시트·팝오버에만 남겨둔다.',
    dontStage: {
      kind: 'box',
      content: '카드',
      style: { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: 'none', borderRadius: 20, background: '#ffffff', padding: 20 },
    },
    doStage: {
      kind: 'box',
      content: '카드',
      style: { boxShadow: 'none', border: '1px solid #e2e5ec', borderRadius: 14, background: '#ffffff', padding: 20, color: '#1c1d21' },
    },
  },
  {
    id: 'sticky-glass-navbar-pill',
    category: '카드·레이아웃',
    title: '글래스 네비바',
    dont: '스크롤해도 따라다니는 반투명 블러 네비바에 알약 모양 버튼까지 얹으면 브라우저 크롬처럼 보이는 장식이 하나 더 늘어난다.',
    do: '네비바는 불투명한 배경에 얇은 하단 보더 하나로 경계를 짓고, 버튼도 다른 화면과 같은 라운드를 쓴다.',
    dontStage: {
      kind: 'box',
      content: 'NAV',
      style: { background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 999, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '10px 20px', border: '1px solid rgba(255,255,255,0.4)' },
    },
    doStage: {
      kind: 'box',
      content: 'NAV',
      style: { background: '#ffffff', borderBottom: '1px solid #e2e5ec', padding: '12px 20px', color: '#1c1d21' },
    },
  },
  {
    id: 'over-flattened-bootstrap',
    category: '카드·레이아웃',
    title: '과도한 플랫화',
    dont: 'AI틱함을 없앤다고 그림자·재질감을 전부 제거해버리면 2010년대 부트스트랩 수준의 납작하고 오래된 UI로 후퇴한다. "장식 없음"과 "깊이 없음"은 다르다.',
    do: 'iOS 26 Liquid Glass처럼 뜨는 요소(시트·팝오버·툴바)에는 단일 광원의 부드러운 그림자를 절제해서 남기고, 정적 카드도 아주 얕은 앰비언트 그림자 한 겹으로 종이 위에 얹힌 듯한 미세한 두께를 준다.',
    dontStage: {
      kind: 'box',
      content: '공고 카드',
      style: { background: '#ffffff', border: '1px solid #d8dbe0', borderRadius: 4, boxShadow: 'none', padding: 20, color: '#1c1d21' },
    },
    doStage: {
      kind: 'box',
      content: '공고 카드',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', borderRadius: 14, boxShadow: '0 1px 2px rgba(20,30,60,0.05), 0 1px 1px rgba(20,30,60,0.04)', padding: 20, color: '#1c1d21' },
    },
  },
  {
    id: 'non-concentric-radius',
    category: '카드·레이아웃',
    title: '동심원 아닌 라운드',
    dont: '부모 카드는 4px 각진 라운드인데 안의 배지는 999px 알약이거나, 큰 카드 32px 안에 작은 요소가 6px처럼 서로 무관한 곡률을 쓰면 같은 재질에서 나온 것처럼 보이지 않는다.',
    do: 'iOS 26의 동심원 코너 원칙처럼 자식 요소의 반경을 부모 반경에서 안쪽 여백만큼 뺀 값으로 맞춰, 하나의 재질을 그대로 오려낸 듯한 곡률을 유지한다.',
    dontStage: {
      kind: 'box',
      content: '카드 4px',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', borderRadius: 4, padding: 20, color: '#1c1d21' },
      inner: { content: '내부 999px', style: { background: '#eef1f6', borderRadius: 999, padding: '10px 16px', fontSize: 12 } },
    },
    doStage: {
      kind: 'box',
      content: '카드 20px',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', borderRadius: 20, padding: 20, color: '#1c1d21' },
      inner: { content: '내부 12px', style: { background: '#eef1f6', borderRadius: 12, padding: '10px 16px', fontSize: 12 } },
    },
  },

  // ---------- 데이터·숫자 ----------
  {
    id: 'baseless-big-stat',
    category: '데이터·숫자',
    title: '근거없는 대형 통계',
    dont: "출처도 기준일도 없이 '10,000+ 이용자'처럼 큰 숫자만 던지면 지어낸 값이라는 의심을 피할 수 없다.",
    do: '숫자에는 반드시 측정 기준과 시점을 캡션으로 붙여 검증 가능하게 만든다.',
    dontStage: { kind: 'stat', value: '10,000+', label: '이용자 수' },
    doStage: { kind: 'stat', value: '2,486', label: '이번 달 신규 지원자', caption: '현재 시점 · 2026-07-07 기준' },
  },
  {
    id: 'countup-vanity-metric',
    category: '데이터·숫자',
    title: '카운트업 허수 지표',
    dont: '0에서 목표값까지 빠르게 올라가는 카운트업 애니메이션은 시선을 끌 뿐 그 숫자가 무엇을 근거로 하는지는 말해주지 않는다.',
    do: '숫자는 정적으로 표시하고 라벨과 출처 캡션으로 신뢰를 준다. 움직임보다 근거가 우선이다.',
    dontStage: { kind: 'stat', value: '99%', label: '만족도' },
    doStage: { kind: 'stat', value: '87%', label: '서류 통과율', caption: '최근 30일 · 2026-07-07 기준' },
  },
  {
    id: 'rainbow-bar-chart-colors',
    category: '데이터·숫자',
    title: '무지개 바 차트',
    dont: '막대마다 빨강·주황·노랑·초록·파랑을 순서대로 칠하면 색이 값의 크기가 아니라 순서만 나타내는 장식이 된다.',
    do: '값이 클수록 진한 액센트, 작을수록 옅은 뉴트럴을 써서 색 자체가 크기를 설명하게 한다.',
    dontStage: { kind: 'bars', colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'], values: [40, 90, 55, 70, 30] },
    doStage: { kind: 'bars', colors: ['#2f61b8', '#2f61b8', '#7c7f88', '#7c7f88', '#e2e5ec'], values: [82, 64, 48, 35, 20] },
  },
  {
    id: 'rainbow-progress-bar',
    category: '데이터·숫자',
    title: '무지개 프로그레스바',
    dont: '하나의 진행률 막대 안에 여러 색을 그라디언트로 흘려 넣으면 진행률이 몇 퍼센트인지보다 색이 먼저 눈에 들어온다.',
    do: '진행률은 액센트 한 색으로 채운 부분과 뉴트럴 트랙 두 톤으로만 표현한다.',
    dontStage: { kind: 'bars', colors: ['#f472b6', '#a855f7', '#38bdf8'], values: [100, 100, 100] },
    doStage: { kind: 'bars', colors: ['#2f61b8', '#e2e5ec'], values: [62, 100] },
  },

  // ---------- 랜딩·히어로 ----------
  {
    id: 'solve-everything-hero-copy',
    category: '랜딩·히어로',
    title: '과장된 히어로 카피',
    dont: "'무엇이든 완벽하게 해결해드려요' 같은 만능형 카피는 실제로 무엇을 하는 서비스인지 알려주지 않는다.",
    do: '히어로 카피는 실제 기능과 대상 사용자를 구체적으로 명시해 첫 문장만 읽어도 무슨 서비스인지 알 수 있게 한다.',
    dontStage: {
      kind: 'text',
      content: '무엇이든, 완벽하게 해결해드려요',
      style: { background: 'linear-gradient(90deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900, fontSize: 26, textAlign: 'center' },
    },
    doStage: {
      kind: 'text',
      content: 'IT 개발자 채용, 상권 데이터로 검증하세요',
      style: { color: '#1c1d21', fontWeight: 800, fontSize: 22, textAlign: 'left' },
    },
  },
  {
    id: 'fake-trust-logo-strip',
    category: '랜딩·히어로',
    title: '가짜 신뢰 로고',
    dont: '실제 계약 여부와 무관하게 여러 회사 로고를 화려한 색으로 늘어놓는 신뢰 로고 스트립은 검증되지 않은 사회적 증거다.',
    do: '신뢰는 실제 계약 기업 수나 채용 성사 건수처럼 검증 가능한 지표로 보여준다.',
    dontStage: { kind: 'avatarRow', colors: ['#a855f7', '#3b82f6', '#f97316', '#22c55e', '#ec4899'] },
    doStage: { kind: 'stat', value: '214곳', label: '실제 계약 기업 수', caption: '2026-07-07 기준' },
  },
  {
    id: 'pastel-cta-card-trio',
    category: '랜딩·히어로',
    title: '파스텔 CTA 3종',
    dont: '가운데 정렬된 파스텔 그라디언트 CTA 카드 세 개를 나란히 두는 구성은 랜딩페이지 빌더의 기본 섹션 그대로다.',
    do: 'CTA는 하나의 명확한 문장과 버튼으로 압축하고, 배경은 옅은 뉴트럴 톤 하나로 둔다.',
    dontStage: {
      kind: 'box',
      content: '지금 시작하기',
      style: { background: 'linear-gradient(160deg,#fce7f3,#ede9fe)', border: '1px solid #f3e8ff', borderRadius: 24, boxShadow: '0 12px 24px rgba(0,0,0,0.08)', textAlign: 'center', padding: 28, fontWeight: 700 },
    },
    doStage: {
      kind: 'box',
      content: '지금 시작하기',
      style: { background: '#f6f8fc', border: '1px solid #e2e5ec', borderRadius: 14, textAlign: 'left', padding: 20, fontWeight: 700, color: '#1c1d21' },
    },
  },
  {
    id: 'fake-testimonial-stock-avatars',
    category: '랜딩·히어로',
    title: '가짜 테스티모니얼',
    dont: '스톡 사진 아바타와 별 다섯 개짜리 리뷰 카드를 늘어놓는 테스티모니얼 섹션은 누가 봐도 지어낸 후기처럼 보인다.',
    do: '실사용자 평가는 실제 리뷰 건수와 평균 점수를 출처와 함께 제시한다.',
    dontStage: { kind: 'avatarRow', colors: ['#f472b6', '#facc15', '#34d399', '#60a5fa'] },
    doStage: { kind: 'stat', value: '4.6', label: '실사용자 평가 평균', caption: '검증 리뷰 128건 · 2026-07-07 기준' },
  },

  // ---------- 배지·상태 ----------
  {
    id: 'new-hot-badge-overuse',
    category: '배지·상태',
    title: 'NEW/HOT 남발',
    dont: '그라디언트 배경에 빛나는 그림자까지 넣은 NEW 배지를 웬만한 항목마다 붙이면 정작 새로운 것이 무엇인지 구분되지 않는다.',
    do: 'NEW 표시는 꼭 필요한 항목에만, 뉴트럴 배경에 액센트 텍스트로 절제해서 쓴다.',
    dontStage: {
      kind: 'pill',
      content: 'NEW',
      style: { background: 'linear-gradient(90deg,#f97316,#ef4444)', color: '#ffffff', borderRadius: 999, fontWeight: 800, padding: '4px 12px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' },
    },
    doStage: {
      kind: 'pill',
      content: 'NEW',
      style: { background: '#eef1f6', color: '#2f61b8', border: '1px solid #e2e5ec', borderRadius: 8, fontWeight: 700, padding: '4px 10px' },
    },
  },
  {
    id: 'ai-powered-sparkle-badge',
    category: '배지·상태',
    title: 'AI-Powered 배지',
    dont: "보라-핑크 그라디언트에 반짝이는 배지로 'AI-Powered'를 강조하는 것은 기능 자체보다 유행어를 파는 것처럼 보인다.",
    do: 'AI 기능도 다른 배지와 같은 톤으로, 무엇을 하는지 설명하는 짧은 라벨로 표시한다.',
    dontStage: {
      kind: 'pill',
      content: '✨ AI-Powered',
      style: { background: 'linear-gradient(90deg,#8b5cf6,#ec4899)', color: '#ffffff', borderRadius: 999, fontWeight: 700, padding: '6px 14px', boxShadow: '0 4px 12px rgba(139,92,246,0.5)' },
    },
    doStage: {
      kind: 'pill',
      content: 'AI 추천',
      style: { background: '#eef1f6', color: '#1c1d21', border: '1px solid #e2e5ec', borderRadius: 8, padding: '6px 12px', fontWeight: 700 },
    },
  },
  {
    id: 'rank-row-full-color-fill',
    category: '배지·상태',
    title: '순위 행 전체 색칠',
    dont: '1~3위 행 전체를 금·은·동 그라디언트로 칠하면 순위 정보가 배경색과 뒤섞여 오히려 읽기 어렵다.',
    do: '행은 동일한 흰 배경과 보더를 유지하고, 순위 숫자 자체의 굵기·크기 차이만으로 상위권을 구분한다.',
    dontStage: {
      kind: 'box',
      content: '1위 · 김개발',
      style: { background: 'linear-gradient(90deg,#fde047,#facc15)', color: '#78350f', borderRadius: 12, fontWeight: 800, padding: '12px 16px' },
    },
    doStage: {
      kind: 'box',
      content: '1위 · 김개발',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', color: '#1c1d21', borderRadius: 10, fontWeight: 800, fontSize: 15, padding: '12px 16px' },
    },
  },
  {
    id: 'accent-border-cure-all',
    category: '배지·상태',
    title: '좌측 액센트 보더 만능 처방',
    dont: '순위든 알림이든 구분이 필요할 때마다 왼쪽에 색깔 스트라이프를 붙이는 것은 "AI틱함을 없애려다 만든 새 클리셰"다. 이미 수많은 AI 생성 대시보드가 이 처방을 기본값으로 쓰면서 그 자체가 하나의 전형이 되어버렸다.',
    do: '구분은 색이 아니라 타이포그래피(굵기·크기)나 배지, 혹은 정렬 순서 자체로 전달한다. 색은 정말 상태(성공/경고/위험)를 나타낼 때만 아껴 쓴다.',
    dontStage: {
      kind: 'box',
      content: '새 지원자 도착',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', borderLeft: '4px solid #8b5cf6', color: '#1c1d21', borderRadius: 8, fontWeight: 700, padding: '12px 16px' },
    },
    doStage: {
      kind: 'box',
      content: '새 지원자 도착',
      style: { background: '#ffffff', border: '1px solid #e2e5ec', color: '#1c1d21', borderRadius: 10, fontWeight: 700, padding: '12px 16px' },
    },
  },

  // ---------- 모션·애니메이션 ----------
  {
    id: 'confetti-success-animation',
    category: '모션·애니메이션',
    title: '컨페티 성공 연출',
    dont: '지원 완료 같은 일상적인 성공 상태에도 색종이가 터지는 컨페티 애니메이션을 넣으면 정작 중요한 순간(합격 등)과 차별화되지 않는다.',
    do: '성공 상태는 success 톤 배경과 짧은 메시지로 조용히 알리고, 큰 연출은 정말 중요한 순간을 위해 아껴둔다.',
    dontStage: {
      kind: 'box',
      content: '지원 완료!',
      style: { background: 'linear-gradient(135deg,#fbcfe8,#fde68a,#bbf7d0)', border: 'none', borderRadius: 20, boxShadow: '0 12px 30px rgba(0,0,0,0.15)', textAlign: 'center', fontWeight: 800, padding: 24 },
    },
    doStage: {
      kind: 'box',
      content: '지원 완료',
      style: { background: '#e6f5ed', color: '#1c7a4d', borderRadius: 12, fontWeight: 700, padding: 16, textAlign: 'left' },
    },
  },
  {
    id: 'bounce-spring-everywhere',
    category: '모션·애니메이션',
    title: '바운스 스프링 남발',
    dont: '알림 뱃지부터 버튼까지 등장할 때마다 통통 튀는 스프링 모션을 걸면 화면이 산만하고 장난감처럼 가벼워 보인다.',
    do: '모션은 iOS 스타일의 짧고 절제된 이징으로 통일하고, 튀는 움직임은 쓰지 않는다.',
    dontStage: {
      kind: 'pill',
      content: '알림 3',
      style: { background: '#3b82f6', color: '#ffffff', borderRadius: 999, fontWeight: 700, padding: '4px 10px', boxShadow: '0 4px 10px rgba(59,130,246,0.4)' },
    },
    doStage: {
      kind: 'pill',
      content: '알림 3',
      style: { background: '#2f61b8', color: '#ffffff', borderRadius: 8, fontWeight: 700, padding: '4px 10px' },
    },
  },
  {
    id: 'rainbow-skeleton-shimmer',
    category: '모션·애니메이션',
    title: '무지개 스켈레톤',
    dont: '로딩 스켈레톤에 파스텔 무지개 색이 번갈아 반짝이면 아직 뭐가 나올지도 모르는 상태에 불필요한 시선을 끈다.',
    do: '스켈레톤은 단일 뉴트럴 톤의 은은한 명암 변화로만 로딩 중임을 알린다.',
    dontStage: { kind: 'bars', colors: ['#fbcfe8', '#ddd6fe', '#bfdbfe'], values: [100, 100, 100] },
    doStage: { kind: 'bars', colors: ['#eef1f6', '#eef1f6', '#eef1f6'], values: [100, 100, 100] },
  },

  // ---------- 폼·인풋 ----------
  {
    id: 'rounded-full-giant-searchbar',
    category: '폼·인풋',
    title: '초대형 알약 검색바',
    dont: '화면 폭을 거의 다 차지하는 알약 모양 검색바에 보라색 보더와 은은한 그림자까지 더하면 검색이 아니라 장식이 주인공이 된다.',
    do: '검색창은 다른 인풋과 같은 라운드, 같은 보더로 통일해 폼 전체가 하나의 시스템처럼 보이게 한다.',
    dontStage: {
      kind: 'pill',
      content: '검색어를 입력하세요',
      style: { borderRadius: 999, background: '#ffffff', border: '2px solid #c4b5fd', padding: '16px 28px', boxShadow: '0 8px 24px rgba(196,181,253,0.4)', fontSize: 16 },
    },
    doStage: {
      kind: 'pill',
      content: '검색어를 입력하세요',
      style: { borderRadius: 10, background: '#ffffff', border: '1px solid #e2e5ec', padding: '12px 16px', fontSize: 14, color: '#7c7f88' },
    },
  },
  {
    id: 'neon-glow-input-focus',
    category: '폼·인풋',
    title: '포커스 네온 글로우',
    dont: '인풋에 포커스가 가면 보라색 네온이 두 겹으로 번지는 글로우 효과는 폼 전체의 절제된 톤과 어울리지 않는다.',
    do: '포커스 상태는 보더 색을 액센트로 바꾸고 두께를 살짝 키우는 것만으로 표현한다.',
    dontStage: {
      kind: 'box',
      content: '이메일 입력',
      style: { background: '#ffffff', border: '2px solid #8b5cf6', borderRadius: 14, boxShadow: '0 0 0 4px rgba(139,92,246,0.35), 0 0 20px rgba(139,92,246,0.5)', padding: '12px 16px' },
    },
    doStage: {
      kind: 'box',
      content: '이메일 입력',
      style: { background: '#ffffff', border: '2px solid #2f61b8', borderRadius: 10, padding: '12px 16px', color: '#1c1d21' },
    },
  },
  {
    id: 'input-icon-color-chaos',
    category: '폼·인풋',
    title: '인풋 아이콘 색 혼용',
    dont: '이메일 필드는 파란 아이콘, 이름 필드는 초록 아이콘처럼 인풋마다 다른 색을 쓰면 폼이 알록달록한 장난감처럼 보인다.',
    do: '모든 인풋 아이콘은 같은 뉴트럴 톤 하나로 통일해 폼 전체의 시각적 무게를 균일하게 만든다.',
    dontStage: { kind: 'swatches', colors: ['#3b82f6', '#22c55e', '#f97316', '#ec4899'] },
    doStage: { kind: 'swatches', colors: ['#7c7f88'] },
  },

  // ---------- AI 클리셰 ----------
  {
    id: 'chat-bubble-gradient',
    category: 'AI 클리셰',
    title: '챗버블 그라디언트',
    dont: "챗봇 말풍선에 보라-파랑 그라디언트를 입히는 것은 'AI 채팅'이라는 것을 색으로 과시하려는 클리셰다.",
    do: '챗봇 말풍선도 앱의 다른 정보성 박스와 같은 뉴트럴 배경과 보더를 쓴다.',
    dontStage: {
      kind: 'box',
      content: '무엇을 도와드릴까요?',
      style: { background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', color: '#ffffff', borderRadius: 20, padding: '12px 18px', boxShadow: '0 8px 20px rgba(139,92,246,0.4)' },
    },
    doStage: {
      kind: 'box',
      content: '무엇을 도와드릴까요?',
      style: { background: '#eef1f6', color: '#1c1d21', border: '1px solid #e2e5ec', borderRadius: 12, padding: '12px 16px' },
    },
  },
  {
    id: 'powered-by-ai-gradient-border-badge',
    category: 'AI 클리셰',
    title: '그라디언트 보더 배지',
    dont: "'Powered by AI' 배지에 보라-핑크 그라디언트 테두리를 두르는 것은 이제 너무 흔해서 오히려 진짜 기술력을 가려버린다.",
    do: 'AI로 만들어진 기능이라는 사실보다 그 기능이 실제로 무엇을 해주는지를 라벨로 설명한다.',
    dontStage: {
      kind: 'pill',
      content: 'Powered by AI',
      style: { background: '#0f172a', color: '#ffffff', borderRadius: 999, border: '2px solid #8b5cf6', padding: '6px 14px', fontWeight: 700, boxShadow: '0 0 12px rgba(139,92,246,0.6)' },
    },
    doStage: {
      kind: 'pill',
      content: 'AI 추천 공고',
      style: { background: '#eef1f6', color: '#1c1d21', border: '1px solid #e2e5ec', borderRadius: 8, padding: '6px 12px', fontWeight: 700 },
    },
  },
  {
    id: 'purple-as-official-ai-color',
    category: 'AI 클리셰',
    title: '보라=AI 고정관념',
    dont: "보라색을 쓰면 자동으로 'AI 기능'처럼 읽힌다는 업계의 암묵적 규칙을 그대로 따르면 브랜드 색 체계가 두 갈래로 쪼개진다.",
    do: 'AI 기능에도 별도의 브랜드 색을 만들지 않고 기존 액센트와 뉴트럴 팔레트를 그대로 적용한다.',
    dontStage: { kind: 'swatches', colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] },
    doStage: { kind: 'swatches', colors: ['#2f61b8', '#1c1d21', '#7c7f88'] },
  },
]
