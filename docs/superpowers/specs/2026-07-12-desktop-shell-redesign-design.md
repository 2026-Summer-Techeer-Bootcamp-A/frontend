# 데스크톱 셸 개편 — 아이콘 레일 + 세부 메뉴 패널

날짜: 2026-07-12
상태: 승인됨
대상: `src/desktop/DesktopShell.tsx` / `DesktopShell.css`, `src/App.tsx` 라우트 배치

## 목표

PC(>=1024px) 레이아웃을 3열 구조로 개편한다. 왼쪽에 아이콘 전용 레일,
클릭 시 애니메이션으로 열리는 세부 메뉴 패널, 오른쪽에 콘텐츠 영역.
셸 크롬(레일·패널·톱바)은 흰 배경에 두고, **오른쪽 콘텐츠 영역만
라운딩된 카드**로 처리한다(레퍼런스 이미지의 콘텐츠 모서리 라운딩).
모바일 레이아웃은 어떤 변화도 없어야 한다.

## 구조

```
셸 배경 (카드 화이트)
├─ ① 아이콘 레일 — 72px 고정
├─ ② 세부 메뉴 패널 — 240px ↔ 0, width 트랜지션으로 개폐
└─ ③ 메인 — 톱바(검색·풀 토글·아바타 유지)
   └─ 콘텐츠 카드 — radius 24px, bg screenBg(#f6f8fc),
      보더 1px, 우/하 여백 16px, 내부 스크롤
```

### ① 아이콘 레일

- 상단: 브랜드 도트(기존 플레이스홀더 유지).
- 중앙: 섹션 아이콘 5개 — 직관적 식별이 우선.
  - 대시보드: `LayoutDashboard`
  - 맞춤 공고: `Briefcase`
  - 채용 시장: `ChartNoAxesColumn`
  - 지도: `MapPin`
  - 마이: `CircleUser`
- 하단: AI 채팅(`MessageSquare`, `/rag-docs`로 이동 — 셸 밖 라우트).
- 아이콘 호버 시 툴팁으로 라벨 표시(접근성: `aria-label` 병행).
- 활성 섹션 아이콘은 accent 칩 배경으로 표시.

### ② 세부 메뉴 패널

- 활성 섹션 제목 + 하위 메뉴 목록(NavLink, 활성 상태 표시).
- 동작: 다른 아이콘 클릭 → 해당 섹션 첫 라우트로 이동 + 패널 내용 전환.
  같은 아이콘 재클릭 → 패널 토글(열림/닫힘). 닫히면 콘텐츠가 넓어진다(밀기).
- 애니메이션: width 240px ↔ 0, 300ms(`motion.duration.base`),
  `motion.easing.standard`. 내부 콘텐츠는 열릴 때 fade-in(decelerate),
  닫힐 때 fade-out(accelerate). 바운스 금지.
- URL과 활성 섹션 동기화: 새로고침·딥링크 시 현재 경로가 속한 섹션이 열린다.

### 섹션별 하위 메뉴 (IA)

| 섹션 | 하위 메뉴 → 라우트 |
|---|---|
| 대시보드 | 개요 `/` |
| 맞춤 공고 | 공고 목록 `/jobs` |
| 채용 시장 | 시장 개요 `/market` · 자격증 갭 `/cert-gap` |
| 지도 | 지도 보기 `/map` |
| 마이 | 이력서 `/resume` · 이력서 제출 `/resume/submit` · 계정 `/settings/account` · 알림 `/settings/notifications` |

## 라우트 변경

`/settings`, `/settings/account`, `/settings/notifications`, `/settings/terms`,
`/settings/privacy`, `/settings/about`, `/cert-gap`, `/resume/submit`를
`ResponsiveProductLayout` 라우트 아래로 이동한다.

- 데스크톱: 셸(레일+패널+톱바) 안에서 렌더된다.
- 모바일: `ResponsiveProductLayout`이 `<Outlet />`을 그대로 통과시키므로
  동작 변화 없음.
- 알려진 트레이드오프: 이 페이지들은 아직 모바일 스타일 화면이라 셸 안에서
  좁게 보일 수 있다. 페이지 데스크톱화는 이번 스코프가 아니다.

## 디자인 시스템 준수

- 색·타이포·라운딩·그림자·모션 전부 `src/design/tokens.ts` 값을 사용한다.
- 콘텐츠 카드 radius 24px(xl~2xl 사이, 상수로 명시), 메뉴 아이템 radius.md(12px).
- 셸 루트에 `themeVars(THEME)` 주입 유지.

## 스코프 제외

- 하위 페이지들의 데스크톱 전용 리디자인
- 검색·국내/글로벌 풀 토글의 실제 동작
- 다크 모드
- 패널 열림 상태의 영속화(localStorage 등) — 세션 내 state만

## 검증

- `npm run build`(tsc + vite) 통과.
- 데스크톱 뷰포트에서: 레일 아이콘 클릭 → 섹션 이동 + 패널 전환,
  재클릭 → 패널 개폐 애니메이션, 콘텐츠 밀림 확인.
- `/settings/account` 등 딥링크 진입 시 마이 섹션이 활성으로 열리는지 확인.
- 모바일 뷰포트(<1024px)에서 기존 화면이 그대로인지 확인.
