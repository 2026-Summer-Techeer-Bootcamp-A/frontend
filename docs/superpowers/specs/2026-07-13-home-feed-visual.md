# 홈 피드 (LinkedIn 스타일 3컬럼) 비주얼 스펙

- 날짜: 2026-07-13
- 상태: 디자인 확정 (Opus 디자인 단계 산출물)
- 대상: frontend (React + Vite), 화면 경로 `/home`
- 상위 문서: `2026-07-13-home-feed-design.md` (레이아웃/필드/게스트 분기 결정본)
- 톤 참조: `2026-07-12-mono-command-center-redesign-design.md`
- 구현자(Sonnet)는 이 문서를 그대로 따른다. 값은 되도록 기존 토큰을 참조한다.
- 변경 노트 (2026-07-13 사용자 피드백 반영):
  1. **시각화 요소 저채도 컬러 도입.** 매치율 링(수준별 3단계) · 이력서 완성도 바 ·
     보유 스킬 칩 · 미니 카드 수치/증가율 · 뉴스 메트릭(포인트/스타/언어점)에
     저채도 팔레트 `--hf-viz-*`(1.1절)를 적용한다.
     무채색 기조(잉크/뮤트/라인)와 D-day 코랄/앰버 체계는 그대로 유지.
  2. **피드 배경 회색 분리.** 홈 화면에서는 콘텐츠 영역 배경을 옅은 회색
     `#f7f7f8`로 깔고 카드는 흰색(`--c-card`)을 유지해 카드-배경 분리를 만든다
     (2.0절의 `.dshell__content--home` 오버라이드 참조).

---

## 0. 원칙 (한 문단 요약)

near-black 모노크롬 커맨드센터 셸(`.dshell`, 검은 좌측 레일 + 흰 라운드 콘텐츠
카드)에 얹히는 **차분하지만 밀도 높은 정보 피드**. 크롬(카드/보더/타이포/버튼/필터)은
전부 잉크/뮤트/라인의 무채색을 유지하고, **색은 "데이터를 표현하는 요소"에만** 쓴다.
(1) **매치율 링·완성도 바·보유 스킬 칩·미니 카드 수치·뉴스 메트릭** — 저채도 팔레트
`--hf-viz-*`(1.1절), (2) **D-day 긴급도** — 기존 코랄/앰버 시맨틱.
채도 높은 원색은 어디에도 쓰지 않는다(전문적인 command-center 톤 유지).
바탕은 옅은 회색(`#f7f7f8`), 카드는 흰색 — 색이 아니라 **면의 밝기 차**로 위계를 만든다.
타임라인 느낌은 카드 장식이 아니라 **날짜 구분선**으로 만든다.
이모지는 코드/카피 어디에도 쓰지 않는다.

---

## 1. 토큰 레퍼런스 (이 문서에서 쓰는 값)

전역 테마 토큰은 `src/career/themes.ts`(THEME p3)에서 `.career`/셸 스코프에 주입된다.
홈 피드는 이 토큰 위에서 동작하며, `.career`가 로컬 오버라이드하는 뉴트럴 스케일도 그대로 쓴다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--c-accent` / `--c-primary` | `#0b0b0c` | 매치 링 채움, 필드 강조, 버튼, 활성 |
| `--c-ink` | `#18181b` | 본문 텍스트 |
| `--c-muted` | `#71717a` | 보조 텍스트/메타 |
| `--c-card` | `#ffffff` | 카드 배경 |
| `--c-chipbg` / `--c-chiptext` | `#f0f0f1` / `#18181b` | 로고 박스, 뉴트럴 칩 |
| `--c-gap` | `#e0453a` | D-3 이하 긴급 D-day (코랄) |
| `--c-radius` | `22px` | 큰 카드 기본 라운드 |
| `--line` | `#e6e9ef` | 카드 보더/구분선 |
| `--line2` | (더 옅은 라인, 없으면 `#f0f0f1`로 폴백) | 리스트 내부 분할선 |
| `--accent-50 / -100 / -200 / -300 / -700` | `#f0f0f1 / #e4e4e7 / #e4e4e7 / #a1a1aa / #18181b` | 소프트 칩·hover·보더 |
| `--e1` | `0 1px 2px rgba(20,30,60,.05), 0 1px 1px rgba(20,30,60,.04)` | 정적 카드 앰비언트 |
| `--e2` | `0 2px 8px rgba(20,30,60,.06), 0 1px 2px rgba(20,30,60,.05)` | hover/떠 있는 카드 |
| `--e3` | `0 8px 24px rgba(20,30,60,.08), 0 2px 6px rgba(20,30,60,.05)` | 팝오버/독 |
| 트랙 회색 | `#eceef3` | 진행바/링 트랙 |
| 아이스 배경 | `#f6f8fc` / `#f7f7f8` | 빈 상태·hover 로우 배경 |

보조 시맨틱(모노크롬 확장, 기존 CSS에서 이미 쓰는 값):
- 마감 임박(일반) 앰버: 배경 `#fbeee2`, 텍스트 `#c76a2e` (`.cr-dday` / `.badge--deadline`)
- 긴급(D-3 이하) 코랄: 배경 `#fbe9e7`, 텍스트 `#e0453a` (`--c-gap`)

### 1.1 시각화 저채도 팔레트 `--hf-viz-*` (신규 — 2026-07-13 피드백 반영)

**시각화 성격의 요소 전용** 팔레트. 크롬(버튼/보더/네비/필터 활성)에는 절대 쓰지 않는다.
4개 색상(dusty blue / sage / muted violet / clay) + 그래픽 전용 뉴트럴 slate 1개.
각 색상은 3단 변형을 가진다: 기본(`그래픽 채움` — 링/바/점, 텍스트 금지),
`-soft`(옅은 틴트 배경), `-text`(라이트 배경 위 텍스트용 — WCAG AA 4.5:1 이상 확보).

| 토큰 | 값 | 용도 |
|---|---|---|
| `--hf-viz-blue` | `#5b7d9e` | dusty blue. 기본 시각화 채움(완성도 바, 매치 링 50~74%) |
| `--hf-viz-blue-soft` | `#e9eff5` | 보유 스킬 칩 배경 |
| `--hf-viz-blue-line` | `#d5e2ee` | 보유 스킬 칩 보더 |
| `--hf-viz-blue-text` | `#3d5a78` | 보유 스킬 칩 텍스트, 미니 카드 수치 강조 (대비 약 7:1) |
| `--hf-viz-sage` | `#74957f` | sage green. 상승/양호(매치 링 75% 이상) |
| `--hf-viz-sage-soft` | `#e9f1ec` | (예비) sage 틴트 배경 |
| `--hf-viz-sage-text` | `#47705a` | 급상승 스킬 증가율 텍스트 (대비 약 5.6:1) |
| `--hf-viz-violet` | `#8a7fa8` | muted violet. 보조 계열(그래픽) |
| `--hf-viz-violet-soft` | `#efecf5` | (예비) violet 틴트 배경 |
| `--hf-viz-violet-text` | `#5e5580` | "내 매치 상위" 미니 카드 수치 (대비 약 6.8:1) |
| `--hf-viz-clay` | `#b08968` | clay. 메트릭 계열(그래픽) |
| `--hf-viz-clay-soft` | `#f5ede6` | (예비) clay 틴트 배경 |
| `--hf-viz-clay-text` | `#8a6247` | 뉴스 포인트/스타 수치 강조 (대비 약 5.4:1) |
| `--hf-viz-slate` | `#8a94a3` | 그래픽 전용 뉴트럴(매치 링 50% 미만, 언어점 폴백). 텍스트 금지 |

사용 규칙:
- **그래픽 채움**(링 conic, 바 fill, 언어점)은 기본 토큰. 대비 요건 없음(옆에 텍스트 라벨 동반).
- **텍스트**는 반드시 `-text` 변형만. 기본 토큰을 텍스트에 쓰지 않는다(AA 미달 가능).
- **틴트 배경 + `-text` 조합**은 보유 스킬 칩이 정본. 다른 곳에 임의 확장하지 않는다.
- D-day 코랄/앰버는 이 팔레트와 별개의 시맨틱으로 유지(긴급성 = 채도 소폭 높음이 의도).
- 한 화면에서 동시 사용은 blue/sage/violet/clay 4색 이내. 5색째가 필요하면 slate 또는 무채색.

폰트: `'Pretendard', -apple-system, sans-serif`. 숫자 강조에는 `font-variant-numeric: tabular-nums`.
letter-spacing 기본 `-0.6px`(`--c-ls`), 큰 타이틀은 개별 지정.

---

## 2. 레이아웃 · 컬럼 · 반응형

홈 피드는 셸 콘텐츠 영역(`.dshell__content`, 라운드 콘텐츠 카드, padding 18px, 자체 스크롤)
**안쪽**에서 렌더된다. 즉 페이지 전체 스크롤은 `.dshell__content`가 담당하고,
좌/우 컬럼은 이 스크롤 컨테이너 기준으로 sticky 된다.

### 2.0 배경 처리 (2026-07-13 피드백 반영 — 회색 바탕 + 흰 카드)

`.dshell__content`의 기본 배경은 흰색(`var(--c-card)`)이지만, **홈 라우트에서만**
배경을 옅은 회색으로 오버라이드해 흰 카드가 바탕에서 분리되어 보이게 한다.

```
/* DesktopShell: 홈 라우트(/home)일 때만 콘텐츠 카드에 modifier 부여 */
.dshell__content--home {
  background: #f7f7f8;   /* themes.ts screenBg와 동일 — 셸 크롬(#f7f7f8)과 하모나이즈 */
}
```

구현 규칙:
- modifier는 `DesktopShell.tsx`에서 현재 경로가 `/home`일 때 `.dshell__content`에
  추가한다. 다른 라우트의 흰 배경은 절대 건드리지 않는다.
- `.hfeed` 자체에는 배경을 깔지 않는다(그리드 밖 여백까지 회색이어야 하므로
  스크롤 컨테이너인 콘텐츠 카드가 배경을 담당하는 것이 정본).
- 라운드/보더(24px, `#eef1f6`)와 스크롤바 스타일은 기존 그대로 유지.
- 회색 바탕 위 카드 분리: 카드 흰색 배경 자체가 1차 분리, `border:1px solid var(--line)`이
  2차 윤곽, 섀도는 기존 `--e1`을 유지한다(회색 위에서 섀도 존재감이 줄어드는 것은
  의도 — 섀도를 키우지 말 것. hover 시에만 `--e2`로 승급).
- 배경이 회색이 되면서 함께 조정되는 값(각 절에 반영됨):
  필터 바 sticky 배경 `rgba(247,247,248,.92)`(4.5), 빈 상태 카드화(5.3),
  카드 내부 로우 hover는 `#f2f2f4`(4.3/4.10 — 배경색과 겹치지 않게 한 단계 아래).

### 2.1 그리드

```
.hfeed {
  display: grid;
  grid-template-columns: 280px minmax(0, 680px) 340px;
  gap: 28px;
  justify-content: center;      /* 넓은 화면에서 가운데 정렬 */
  align-items: start;
  max-width: 1360px;
  margin: 0 auto;
  padding-bottom: 80px;         /* 무한스크롤 로더 여백 */
}
.hfeed__left,
.hfeed__right {
  position: sticky;
  top: 4px;                     /* .dshell__content padding 안쪽 상단 */
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: start;
}
.hfeed__center { min-width: 0; }   /* 카드 말줄임을 위해 필수 */
```

### 2.2 브레이크포인트

- **≥ 1280px**: 3컬럼. 좌 280 sticky / 중앙 max 680 스크롤 / 우 340 sticky. gap 28px.
- **1024–1279px**: 우측 컬럼을 중앙 하단으로 이동.
  ```
  @media (max-width: 1279px) {
    .hfeed { grid-template-columns: 260px minmax(0, 1fr); }
    .hfeed__right {
      grid-column: 1 / -1;      /* 좌+중앙 아래로 전체 폭 */
      position: static;
      flex-direction: row;      /* 뉴스 패널 + 미니카드 가로 배치 */
      flex-wrap: wrap;
    }
    .hfeed__right > * { flex: 1 1 300px; }
  }
  ```
- **≤ 767px (모바일)**: 중앙 피드만.
  ```
  @media (max-width: 767px) {
    .hfeed { grid-template-columns: 1fr; padding: 0; }
    .hfeed__left, .hfeed__right { display: none; }
  }
  ```
  (모바일 탭바 체계는 건드리지 않는다. 게스트 CTA의 모바일 노출은 이번 스코프 밖.)

### 2.3 컬럼 구성 요약

| 컬럼 | 로그인 | 비로그인(게스트) |
|---|---|---|
| 좌(`.hfeed__left`) | 프로필 카드 → 이력서 요약 카드 → 빠른 링크 | 게스트 CTA 카드(다크) |
| 중앙(`.hfeed__center`) | 필터 바(sticky) → 날짜 구분선 + 공고 카드(무한스크롤) | 동일. 카드에서 개인화 요소만 조용히 제거 |
| 우(`.hfeed__right`) | 뉴스 패널(탭 3개) → 미니 요약 카드 2~3개 | 동일. 단 "내 매치 상위" 미니카드는 숨김 |

---

## 3. 클래스 네이밍 규약

기존 컨벤션(`dshell__`, `cr-`, `kit-`, `djd-`)과 정합하도록 블록 프리픽스 `hfeed`를 쓴다.

- 레이아웃 요소: `.hfeed`, `.hfeed__left`, `.hfeed__center`, `.hfeed__right`
- 컴포넌트 블록(카드류): `.hfeed-profile`, `.hfeed-resume`, `.hfeed-links`, `.hfeed-guest`,
  `.hfeed-filter`, `.hfeed-divider`, `.hfeed-card`, `.hfeed-news`, `.hfeed-mini`
- 컴포넌트 내부 요소: `__` (예: `.hfeed-card__head`, `.hfeed-card__title`)
- 상태 수식어: `.is-on`, `.is-urgent`, `.is-loading`, `.is-saved` (전역 상태) / `--변형`은
  구조 변형(예: `.hfeed-chip--owned`, `.hfeed-mini--list`, `.hfeed-news__item--hn`)
- 공용 칩: `.hfeed-chip`(소프트) · `.hfeed-chip--owned`(필드) · `.hfeed-chip--missing`(아웃라인)
  · `.hfeed-chip--cat`(뉴트럴) — 아래 4.6 참조.

---

## 4. 컴포넌트별 비주얼 해부

모든 카드 공통: `background:#fff; border:1px solid var(--line); box-shadow:var(--e1);`.
회색 바탕(`#f7f7f8`, 2.0절) 위에서 흰 카드가 면으로 분리된다 — 섀도를 키워 보정하지
않는다(hover 시에만 `--e2`). 정적 카드는 hover 변화를 주지 않는다(프로필/이력서/뉴스).
**클릭 가능한 공고 카드와 미니 요약 카드**만 hover/active 반응을 준다.

### 4.1 프로필 카드 `.hfeed-profile` (로그인)

- 컨테이너: `border-radius:20px; padding:18px;`
- 상단 행 `__top`: `display:flex; align-items:center; gap:12px;`
  - 아바타 `__avatar`: `44px; border-radius:50%; background:var(--accent-50); color:var(--accent-700);
    font:800 14px; display:grid; place-items:center;` (이니셜, 예: "김")
  - 이름 `__name`: `16px/700; color:var(--c-ink);`
  - 타깃 직무 `__target`: `12.5px; color:var(--c-muted);` 한 줄 말줄임. 예: "백엔드 개발자 지망"
- 하단 스탯 행 `__stats` (선택): 상단에서 14px 아래, `border-top:1px solid var(--line); padding-top:14px;`
  두 칸(북마크 수 / 최근 본 수), 각 칸 라벨 11px muted + 값 13px/700 ink tabular.

### 4.2 이력서 요약 카드 `.hfeed-resume` (로그인, 단일 이력서)

- 컨테이너: `border-radius:20px; padding:18px;`
- 헤더 행 `__head`: `display:flex; justify-content:space-between; align-items:baseline;`
  - 제목: "내 이력서" `13px/700 ink`
  - 편집 링크 `__edit`: "이력서 편집" `12px/700; color:var(--accent-700);` → `/resume`
- 완성도 행 `__meter` (margin-top 12px):
  - 캡션: "이력서 완성도 <b>82%</b>" `12.5px muted`, 숫자만 `ink/700`
  - 바: `height:8px; border-radius:5px; background:#eceef3;` 채움
    `i { background:var(--hf-viz-blue); }` (dusty blue 단색 — 그라디언트 금지.
    2026-07-13 피드백 반영: near-black → 저채도 블루)
- 보유 스킬 칩 `__skills` (margin-top 14px): `display:flex; flex-wrap:wrap; gap:6px;`
  - 여기서는 **소프트 칩 `.hfeed-chip`** 사용(전부 보유이므로 필드로 하지 않는다).
  - 상단 캡션 "보유 스킬 <b>12개</b>" `12px muted`.
  - 최대 8개 노출 + 초과분 `.hfeed-chip--more` ("+4") 뮤트 톤.

### 4.3 빠른 링크 `.hfeed-links` (로그인)

- 컨테이너: 카드 또는 카드 없는 리스트. 카드로 통일(`radius:20px; padding:8px 4px;`).
- 로우 `__row`: `display:flex; align-items:center; gap:12px; padding:12px 12px;
  border-radius:12px;` hover `background:#f2f2f4;` (페이지 배경 `#f7f7f8`보다 한 단계 아래)
  - 라벨 `14px/600 ink` (예: "북마크한 공고"), 우측 카운트 `13px/700 muted tabular`("8"),
    끝에 chevron(오른쪽 화살표, `color:var(--c-muted)`).
- 항목: "북마크한 공고", "최근 본 공고". (`bookmarkStore`/`viewHistoryStore` 재사용)

### 4.4 게스트 CTA 카드 `.hfeed-guest` (비로그인, 좌측 컬럼)

셸의 검은 레일/다크 히어로(`.kit-rhero`)와 한 몸으로 보이게 **다크 카드**로 만든다.

- 컨테이너: `border-radius:22px; padding:22px 20px; color:#fff;
  background:linear-gradient(145deg,#0b0b0c 0%,#18181b 100%);
  box-shadow:0 12px 30px -10px rgba(20,30,60,.45);`
- 아이브로 `__eyebrow`: "게스트" `11px/800; letter-spacing:.4px; text-transform:uppercase;
  color:rgba(255,255,255,.56);`
- 타이틀 `__title`: "로그인하고 매치율 확인하기" `18px/800; letter-spacing:-.5px; margin-top:8px;`
- 본문 `__body`: "로그인하면 공고마다 내 이력서 매치율이 보여요." `13.5px; line-height:1.5;
  color:rgba(255,255,255,.72); margin-top:8px;`
- 액션 `__actions` (margin-top 16px, `display:flex; flex-direction:column; gap:8px;`):
  - 주 버튼 "로그인": `background:#fff; color:#0b0b0c; border-radius:12px; padding:12px;
    font:700 14px;` hover `background:#f0f0f1;`
  - 보조 버튼 "회원가입": `background:rgba(255,255,255,.14); color:#fff;` hover `.24`
- 하단 텍스트 링크 `__skip`(선택): "먼저 둘러보기" `12.5px; color:rgba(255,255,255,.6);` 중앙.

### 4.5 필터 바 `.hfeed-filter` (중앙 상단, sticky)

- 컨테이너: 중앙 컬럼 최상단에 sticky.
  `position:sticky; top:0; z-index:5; padding:6px 0 12px;
  background:rgba(247,247,248,.92); backdrop-filter:blur(8px);`
  (회색 페이지 배경과 동일 계열 — 흰색 띠로 떠 보이지 않게)
  스크롤 시 하단 경계용 `box-shadow:0 1px 0 var(--line);`(스크롤 여부와 무관하게 얇게 유지 가능).
- 2행 구성:
  - 1행 `__pool`: pool 토글(전체/국내/해외). `.cr-pooltoggle` 문법 재사용.
    `display:inline-flex; background:#eef0f4; border-radius:20px; padding:3px;`
    버튼 `padding:8px 16px; font:650 13px; color:var(--c-muted);` 활성 `.is-on`:
    `background:#fff; color:var(--accent-700); font-weight:700; box-shadow:var(--e2);`
  - 2행 `__cats`: 직무 카테고리 퀵필터. `display:flex; gap:8px; overflow-x:auto;
    scrollbar-width:none;` (`::-webkit-scrollbar{display:none}`), margin-top 8px.
    - 칩 `.hfeed-filter__chip`: 캡슐. `padding:8px 14px; border-radius:999px; font:650 13px;
      background:#eef1f6; color:var(--c-ink);` hover `background:#e2e5ec;`
      활성 `.is-on`: `background:var(--c-ink); color:#fff;` (`.filter-chip` 규약과 동일)
    - 항목(예): 전체 · 백엔드 · 프론트엔드 · AI/ML · 데이터 · 모바일 · DevOps · 기획

### 4.6 공용 스킬/카테고리 칩

칩 의미를 원색이 아니라 **채움 방식 + 저채도 틴트**로 구분한다.
(2026-07-13 피드백 반영: 보유 칩을 near-black 필드 → dusty blue 틴트로 교체.
필드가 너무 무거워 카드가 얼룩져 보이던 문제 해소, "보유 = 파랑 계열" 의미 부여.)

| 클래스 | 배경 | 텍스트 | 보더 | 용도 |
|---|---|---|---|---|
| `.hfeed-chip` (소프트) | `var(--accent-50)` #f0f0f1 | `var(--accent-700)` #18181b | `var(--accent-100)` #e4e4e7 | 이력서 요약의 보유 스킬 나열 |
| `.hfeed-chip--owned` (틴트) | `var(--hf-viz-blue-soft)` #e9eff5 | `var(--hf-viz-blue-text)` #3d5a78 | `1px var(--hf-viz-blue-line)` #d5e2ee | 공고 카드: **내가 보유한** 요구 스킬 |
| `.hfeed-chip--missing` (아웃라인) | transparent | `var(--c-muted)` #71717a | `1px var(--line)` #e6e9ef | 공고 카드: **미보유** 요구 스킬 |
| `.hfeed-chip--cat` (뉴트럴) | `#f2f3f6` | `#5b5e66` | `1px var(--line)` | 직무 카테고리 태그(비클릭) |
| `.hfeed-chip--more` | transparent | `var(--c-muted)` | none | "+N" 초과 표시 |

공통 지오메트리: `display:inline-flex; align-items:center; gap:6px; border-radius:9px;
padding:6px 11px; font:650 12.5px; letter-spacing:-.1px;` (`.chip`/`.cr-chip` 규약).
비로그인 시 공고 카드의 스킬 칩은 owned/missing 구분 없이 **전부 `.hfeed-chip--cat`**(뉴트럴)로 렌더.

### 4.7 날짜 구분선 `.hfeed-divider`

타임라인 느낌은 여기서만 낸다. 카드에는 왼쪽 스트라이프/과한 장식 금지.

- 구조: `display:flex; align-items:center; gap:10px; margin:22px 0 12px;`
  첫 구분선은 `margin-top:0`.
- 점 `__dot`: `width:5px; height:5px; border-radius:50%; background:var(--c-accent); flex:none;`
  (near-black 점 하나로 타임라인 노드 암시)
- 라벨 `__label`: `font:700 12.5px;` — "오늘"은 `color:var(--c-ink)`, 그 외(어제/날짜)는
  `color:var(--c-muted)`. 예: "오늘", "어제", "7월 11일". 날짜는 tabular-nums.
- 라인 `__rule`: 나머지 폭을 채우는 `flex:1; height:1px; background:var(--line);`

### 4.8 공고 피드 카드 `.hfeed-card` (핵심)

클릭 시 `/job/:id` 이동. 카드 전체가 클릭 타깃이며 내부에 버튼(북마크/상세)이 중첩.

- 컨테이너: `border-radius:18px; padding:18px; margin-bottom:14px; cursor:pointer;
  transition:border-color .15s, box-shadow .15s, transform .12s cubic-bezier(.25,.1,.25,1);`
  - hover: `border-color:var(--accent-200); box-shadow:var(--e2);`
  - active: `transform:scale(.99);`
  - focus-visible: `outline:2px solid var(--c-ink); outline-offset:2px;`
- **헤드 `__head`**: `display:flex; align-items:flex-start; gap:12px;`
  - 로고 `__logo`: `44px; border-radius:12px; background:var(--c-chipbg); color:var(--c-chiptext);
    font:800 18px; display:grid; place-items:center; flex:none;` (회사 이니셜 또는 로고 이미지)
  - 본문 `__meta`(flex:1; min-width:0):
    - 회사 행 `__company`: 회사명 `13px/700 ink`, 말줄임. 뒤에 인더스트리/지역 메타.
    - 메타 행 `__sub`: `12px; color:var(--c-muted);` 형식 "인더스트리 · 지역".
      예: "핀테크 · 서울 강남구". 가운데점(·)으로 구분, 한 줄 말줄임.
    - 제목 `__title`: `15.5px/700; line-height:1.3; margin-top:6px; color:var(--c-ink);`
      최대 2줄(`-webkit-line-clamp:2`).
  - 링 `__ring`(로그인 전용, flex:none): 4.9 참조. 헤드 우측 상단 정렬.
- **시간/마감 행 `__timerow`**: `display:flex; align-items:center; gap:8px; margin-top:12px;`
  - 게시 상대시간 `__time`: `12px; color:var(--c-muted); font-variant-numeric:tabular-nums;`
    예: "2시간 전", "어제", "3일 전".
  - 스페이서(`margin-left:auto`) 후 D-day 뱃지 `.hfeed-badge`:
    - 일반: `.hfeed-badge--dday` → `background:#fbeee2; color:#c76a2e; border-radius:6px;
      padding:3px 7px; font:700 10.5px; font-variant-numeric:tabular-nums;` 예 "D-12"
    - 긴급(D-3 이하): 추가 `.is-urgent` → `background:#fbe9e7; color:var(--c-gap);` 예 "D-2"
    - 마감일 없음: `.hfeed-badge--always` → `background:#f2f3f6; color:#5b5e66;` "상시채용"
- **칩 행 `__chips`**: `display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;`
  - 순서: 직무 카테고리 칩(`--cat`) → 스킬 칩. 스킬은 보유(`--owned`, 필드) 먼저, 미보유
    (`--missing`, 아웃라인) 뒤. 스킬 칩 최대 6개 + `.hfeed-chip--more`("+3").
  - 비로그인: 카테고리 + 스킬 전부 `--cat`.
- **푸터 `__foot`**: `display:flex; align-items:center; justify-content:space-between;
  margin-top:14px; padding-top:12px; border-top:1px solid var(--line);`
  - 좌측 매치 요약 `__matchsum`(로그인 전용): "보유 <b>8</b> · 부족 <b>4</b>"
    `11.5px; color:var(--c-muted);` 숫자 `ink/700 tabular`. 비로그인 시 이 슬롯 비움.
  - 우측 액션 `__actions`(`display:flex; align-items:center; gap:10px;`):
    - 상세보기 링크 `__detail`: "상세보기" `13px/700; color:var(--accent-700);`
    - 북마크 토글 `__bookmark`: 아이콘 버튼 `32px; border-radius:10px; border:1px solid var(--line);
      background:#fff; color:var(--c-muted);` hover `background:var(--accent-50); color:var(--c-ink);`
      저장됨 `.is-saved`: `background:var(--c-ink); color:#fff; border-color:var(--c-ink);`
      aria-label "북마크"/"북마크 해제". active `transform:scale(.95);`

### 4.9 매치율 링 `.hfeed-ring` (로그인 전용)

- 지오메트리: `width:54px; height:54px; border-radius:50%; position:relative; flex:none;
  display:grid; place-items:center;`
- 채움: `background:conic-gradient(var(--ring-c) 0 <rate>%, #eceef3 <rate>%);`
  (`<rate>`는 정수 퍼센트. 인라인 style 또는 CSS 변수 `--rate`로 주입)
- **수준별 채움색 `--ring-c`** (2026-07-13 피드백 반영 — 저채도 3단계):

  | 매치율 | 클래스 | `--ring-c` |
  |---|---|---|
  | 75% 이상 | `.hfeed-ring--high` | `var(--hf-viz-sage)` #74957f |
  | 50~74% | `.hfeed-ring--mid` | `var(--hf-viz-blue)` #5b7d9e |
  | 50% 미만 | `.hfeed-ring--low` | `var(--hf-viz-slate)` #8a94a3 |

  숫자 텍스트는 세 단계 모두 `var(--c-ink)` 유지(색은 링에만, 텍스트는 잉크).
- 홀: `::after { content:''; position:absolute; width:40px; height:40px; border-radius:50%;
  background:#fff; box-shadow:inset 0 0 0 1px var(--line); }`
- 숫자 `b`: `position:relative; z-index:1; font:800 14px; color:var(--c-ink);
  font-variant-numeric:tabular-nums; letter-spacing:-.5px;` 예 "78%"
- 링 아래 라벨 `__caplabel`(선택): "매치" `10px; color:var(--c-muted); text-align:center;
  margin-top:4px;`
- 접근성: 링에 `role="img"` + `aria-label="이력서 매치율 78%"`.

### 4.10 뉴스 패널 `.hfeed-news` (우측 컬럼)

- 컨테이너: `border-radius:18px; padding:16px;`
- 헤더 `__head`: `display:flex; align-items:baseline; justify-content:space-between; gap:8px;`
  - 제목: "기술 뉴스" `14px/800 ink`
  - 갱신 캡션 `__updated`: "12분 전 갱신" `11px; color:var(--c-muted);
    font-variant-numeric:tabular-nums;` (응답 `fetched_at` 기반; 4.13 참조)
- 탭 `__tabs`: 슬림 세그먼트(`.kit-segctl` 문법). 3탭이 340px 폭에 맞게 등분.
  `display:flex; background:#eceef3; border-radius:10px; padding:3px; margin-top:12px;`
  버튼 `flex:1; padding:6px 8px; font:600 12px; color:var(--c-muted);` 활성 `.is-on`:
  `background:#fff; color:var(--accent-700); font-weight:700; box-shadow:var(--e1);`
  라벨: "해커뉴스" / "긱뉴스" / "GitHub"
- 리스트 `__list`: margin-top 8px. 각 아이템 `__item`은
  `display:block; padding:12px 8px; margin:0 -8px; border-radius:12px;
  border-bottom:1px solid var(--line2, #f0f0f1);` hover `background:#f2f2f4;`
  마지막 아이템 `border-bottom:none;`
- 메트릭 수치 강조 `__stat` (2026-07-13 피드백 반영): 포인트/댓글/스타의 **숫자만**
  `font-weight:700; color:var(--hf-viz-clay-text);` 로 강조. 라벨("포인트"/"스타")은
  muted 유지 — 숫자에만 저채도 클레이 포인트.
  - **HN `__item--hn`**:
    - 제목 `__title`: `13px/650 ink; line-height:1.4;` 최대 2줄. (원문 링크)
    - 메타 `__meta`: `margin-top:6px; font:500 11.5px; color:var(--c-muted);
      font-variant-numeric:tabular-nums;` 형식 "포인트 <b class=__stat>342</b> · 댓글 128".
      "댓글 128"은 HN 스레드 링크(`__thread`, `color:var(--accent-700); font-weight:700;`).
  - **긱뉴스 `__item--gn`**:
    - 제목(한국어) `__title`: `13px/650 ink; line-height:1.4;` 최대 2줄. (링크)
    - 출처 `__source`(선택): 도메인 `11.5px muted` 예 "news.hada.io".
  - **GitHub Trending `__item--gh`**:
    - repo `__repo`: "<span class=owner>vercel/</span><b>ai</b>" — owner `12.5px muted`,
      repo명 `13px/700 ink`. (링크)
    - 설명 `__desc`: `12px; color:var(--c-muted); line-height:1.4; margin-top:2px;` 최대 2줄.
    - 메타 `__meta`: `margin-top:6px; font:600 11.5px; color:var(--c-muted);
      font-variant-numeric:tabular-nums;` 형식 "언어점 TypeScript · 스타 <b class=__stat>1.2k</b>".
      언어점 `__langdot`: `width:8px; height:8px; border-radius:50%;` 배경은 **저채도
      언어 매핑** — TypeScript/JavaScript `var(--hf-viz-blue)`, Python `var(--hf-viz-sage)`,
      Rust/Go 등 시스템 계열 `var(--hf-viz-clay)`, 그 외 `var(--hf-viz-slate)` 폴백.
      (언어 브랜드 원색은 쓰지 않는다 — 팔레트 4색+slate 안에서만 매핑.)

### 4.11 미니 요약 카드 `.hfeed-mini` (우측 컬럼, 뉴스 아래)

컴팩트 신규 카드. 각 카드 클릭 시 딥링크 이동. 개별 실패 시 그 카드만 숨김(피드 전체 유지).

- 기본 `.hfeed-mini`: `border-radius:14px; padding:14px 16px; cursor:pointer;
  display:flex; flex-direction:column; gap:2px;` hover `border-color:var(--accent-200);
  box-shadow:var(--e2);` active `transform:scale(.99);`
- 라벨 `__label`: `12px/650; color:var(--c-muted);`
- 숫자 `__num`: `24px/800; font-variant-numeric:tabular-nums;`
  단위 `span { font:700 13px; color:var(--c-muted); margin-left:2px; }` 예 "128<span>건</span>"
  - **수치 강조색** (2026-07-13 피드백 반영 — 카드 성격별 저채도 매핑):
    "오늘 신규 공고"(시장 데이터) `color:var(--hf-viz-blue-text);` /
    "내 매치 상위 공고"(개인화 데이터) `color:var(--hf-viz-violet-text);`
    단위 span은 muted 유지.
- 힌트/링크 `__hint`: `11.5px; color:var(--accent-700); font-weight:700; margin-top:6px;
  display:flex; align-items:center; gap:4px;` (chevron 포함) 예 "시장에서 보기"
- **리스트 변형 `.hfeed-mini--list`** (급상승 스킬 Top3):
  - 라벨 아래 로우 `__row` ×3: `display:flex; align-items:center; gap:8px; padding:6px 0;
    border-bottom:1px solid var(--line2);` 마지막 no border.
    - 랭크 `__rank`: `16px 고정폭; font:800 12px; color:var(--c-muted); tabular;`
    - 스킬명 `__name`: `flex:1; 13px/700 ink;`
    - 증가율 `__delta`: `11.5px/800; color:var(--hf-viz-sage-text);` 예 "+38%"
      (상승 = 저채도 세이지. 기존 `#1f9d57` 그린 대체)
- 카드 목록:
  1. "오늘 신규 공고" — "128건" → 힌트 "시장에서 보기" (시장 페이지)
  2. "이번 주 급상승 스킬" — 리스트 변형 Top3 → "시장에서 보기"
  3. (로그인 시) "내 매치 상위 공고" — "23건" → 힌트 "대시보드에서 보기" (대시보드)
     비로그인 시 이 카드 숨김.

### 4.12 "N분 전 갱신" 캡션 규칙

- 뉴스 패널 헤더 우측(`.hfeed-news__updated`)이 정본 위치. 필요 시 리스트 하단에도 반복 가능.
- 텍스트 규칙: `< 60초`면 "방금 갱신", `< 60분`이면 "N분 전 갱신", 그 이상은 "H시간 전 갱신".
- 스타일 통일: `11px; color:var(--c-muted); font-variant-numeric:tabular-nums;`

---

## 5. 상태 (hover / active / focus / 로딩 / 빈 / 에러)

### 5.1 인터랙션 상태 요약

| 요소 | hover | active | focus-visible |
|---|---|---|---|
| 공고 카드 | 보더 `accent-200` + `e2` | `scale(.99)` | `outline:2px solid var(--c-ink); offset 2px` |
| 미니 카드 | 보더 `accent-200` + `e2` | `scale(.99)` | 동일 |
| 필터 칩 | `background:#e2e5ec` | — | outline 동일 |
| pool 토글 버튼 | (활성 아닐 때) 색만 진하게 | — | outline 동일 |
| 뉴스 탭 | 색 진하게 | — | outline 동일 |
| 뉴스 리스트 로우 | `background:#f2f2f4` | — | outline 동일 |
| 북마크 토글 | `background:accent-50` | `scale(.95)` | outline 동일 |
| 빠른 링크 로우 | `background:#f2f2f4` | — | outline 동일 |
| 다크 CTA 주버튼 | `background:#f0f0f1` | `scale(.97)` | `outline:2px solid #fff` |

모션: 트랜지션 `.12s~.15s`, iOS 프레스 곡선 `cubic-bezier(.25,.1,.25,1)`. 바운스/오버슈트 금지.
`prefers-reduced-motion: reduce`에서 transform/transition 제거.

### 5.2 로딩 스켈레톤

시머는 기존 `.kit-sk` 규약 재사용:
`background:linear-gradient(90deg,#eef1f6 25%,#e2e7f0 37%,#eef1f6 63%); background-size:400% 100%;
animation: hfeed-shimmer 1.2s ease-in-out infinite; border-radius:6px;`
```
@keyframes hfeed-shimmer { 0%{background-position:100% 0;} 100%{background-position:0 0;} }
```
- 공고 카드 스켈레톤 `.hfeed-card--skel` (초기 로드/무한스크롤 하단):
  - 로고 블록 `44×44 radius:12px`
  - 제목 2줄: `height:12px`(폭 70%), `height:12px`(폭 45%)
  - 링 자리 `54×54 원`
  - 칩 자리 3개: `height:24px; width:64px; radius:9px`
  - 3~4장 반복 노출.
- 뉴스 아이템 스켈레톤: 2줄(폭 90% / 55%) + 메타 1줄(폭 40%).
- 프로필/이력서 스켈레톤: 아바타 원 + 2줄.
- 무한스크롤 로더: 중앙 컬럼 하단에 스켈레톤 카드 2장 또는 슬림 인디케이터(indeterminate bar).

### 5.3 빈 상태

- 피드 빈 상태 `.hfeed-empty` (필터 결과 0건):
  `text-align:center; padding:40px 20px; background:#fff;
  border:1.5px dashed var(--line); border-radius:20px; color:var(--c-muted);`
  (배경이 회색이 되면서 기존 `#f6f8fc` 면이 묻힘 — 흰 대시 카드로 변경, 2.0절 참조)
  - 글리프 박스 `__glyph`(선택): `52px; border-radius:16px; background:var(--accent-50);
    color:var(--c-accent); display:grid; place-items:center; margin:0 auto 14px;`
    (라인 아이콘 SVG 삽입, 이모지 금지)
  - 제목 `__title`: "표시할 공고가 없어요" `14.5px/700 ink`
  - 본문 `__body`: "필터를 바꾸거나 잠시 후 다시 확인해 주세요." `12.5px muted`
- 미니카드 개별 데이터 없음: 해당 카드 자체를 렌더하지 않는다(숨김).

### 5.4 에러 상태

- 피드 목록 로드 실패 `.hfeed-error`: 기존 에러 상태 컴포넌트 톤 재사용.
  - 제목 "공고를 불러오지 못했어요" `14.5px/700 ink`
  - 본문 "네트워크 상태를 확인하고 다시 시도해 주세요." `12.5px muted`
  - 버튼 "다시 시도": `.btn--ghost` 톤 (흰 배경 + 라인 보더)
- 뉴스 에러(응답 `error` 플래그) `.hfeed-news__error`: 패널 리스트 자리에 인라인.
  - "뉴스를 불러오지 못했어요. 잠시 후 다시 시도해요." `12.5px muted`, "새로고침" 텍스트 버튼(accent-700).
  - stale 데이터를 대신 보여줄 때: 리스트 위에 캡션 `.hfeed-news__stale`
    "이전에 받아온 정보예요." `11px muted`.
- 개인화(매치) 계산 실패: 카드를 익명 카드로 degrade(링/보유·미보유 제거). 에러 표시 없음.

---

## 6. 카피 (한국어, 이모지 없음)

| 위치 | 카피 |
|---|---|
| 이력서 카드 제목/링크 | "내 이력서" / "이력서 편집" |
| 이력서 완성도 | "이력서 완성도 82%" |
| 보유 스킬 캡션 | "보유 스킬 12개" |
| 빠른 링크 | "북마크한 공고" / "최근 본 공고" |
| 게스트 아이브로/타이틀 | "게스트" / "로그인하고 매치율 확인하기" |
| 게스트 본문 | "로그인하면 공고마다 내 이력서 매치율이 보여요." |
| 게스트 버튼 | "로그인" / "회원가입" / (선택) "먼저 둘러보기" |
| pool 토글 | "전체" / "국내" / "해외" |
| 카테고리 필터 | "전체" · "백엔드" · "프론트엔드" · "AI/ML" · "데이터" · "모바일" · "DevOps" · "기획" |
| 날짜 구분선 | "오늘" / "어제" / "7월 11일" |
| 상대시간(예시) | "방금 전" / "2시간 전" / "어제" / "3일 전" |
| D-day | "D-12" / "D-2"(긴급) / "상시채용" |
| 매치 요약 | "보유 8 · 부족 4" |
| 링 라벨 | "매치" |
| 카드 액션 | "상세보기" / 북마크 aria "북마크 추가" · "북마크 해제" |
| 뉴스 패널 제목 | "기술 뉴스" |
| 뉴스 탭 | "해커뉴스" / "긱뉴스" / "GitHub" |
| HN 메타 | "포인트 342 · 댓글 128" (댓글=스레드 링크) |
| GitHub 메타 | "TypeScript · 스타 1.2k" |
| 갱신 캡션 | "방금 갱신" / "12분 전 갱신" / "3시간 전 갱신" |
| 미니카드 | "오늘 신규 공고" / "이번 주 급상승 스킬" / "내 매치 상위 공고" |
| 미니카드 힌트 | "시장에서 보기" / "대시보드에서 보기" |
| 피드 빈 상태 | "표시할 공고가 없어요" / "필터를 바꾸거나 잠시 후 다시 확인해 주세요." |
| 피드 에러 | "공고를 불러오지 못했어요" / "네트워크 상태를 확인하고 다시 시도해 주세요." / "다시 시도" |
| 뉴스 에러 | "뉴스를 불러오지 못했어요. 잠시 후 다시 시도해요." / "새로고침" |
| 뉴스 stale | "이전에 받아온 정보예요." |
| 로딩 aria | "불러오는 중" |

---

## 7. 구현 체크리스트 (Sonnet)

1. `.hfeed` 3컬럼 그리드 + 2개 브레이크포인트(1279 / 767). 좌/우 sticky, 중앙 min-width:0.
2. 좌측: 로그인=프로필/이력서/빠른링크, 게스트=다크 CTA. 조건부 렌더.
3. 중앙: sticky 필터 바(pool 토글 + 카테고리 스크롤 칩) → 날짜 그룹핑 구분선 → 공고 카드 리스트 → 무한스크롤 로더.
4. 공고 카드: 헤드(로고+회사+메타+제목+링) / 시간·D-day 행 / 칩 행(카테고리+보유틴트+미보유아웃라인) / 푸터(매치요약+상세+북마크). 비로그인 degrade 분기.
5. D-day: `dday <= 3`이면 `.is-urgent`(코랄), 마감 없으면 `상시채용`.
6. 링: conic-gradient에 정수 rate 주입 + 매치 수준별 `--ring-c` 3단계(sage/blue/slate, 4.9), 홀+숫자, aria-label.
7. 우측: 뉴스 패널(3탭 세그먼트 + 소스별 아이템 + 메트릭 `__stat` 강조 + 갱신 캡션) → 미니카드 2~3장(리스트 변형 포함).
8. 상태: 스켈레톤(카드/뉴스/프로필), 빈/에러(피드·뉴스), 뉴스 stale 캡션.
9. hover/active/focus-visible 전부 부여. `prefers-reduced-motion` 대응.
10. 배경: 홈 라우트에서만 `.dshell__content--home`으로 콘텐츠 배경 `#f7f7f8` 오버라이드(2.0). 카드는 흰색 유지, 섀도 승급 금지.
11. `--hf-viz-*` 토큰 정의(1.1)를 홈 피드 CSS 상단(`.hfeed` 스코프)에 선언. 크롬에는 사용 금지.
12. 색 사용 감사: 저채도 viz 팔레트는 링/바/칩/수치/언어점에만, 코랄/앰버는 D-day에만, 나머지 전부 무채색. 채도 높은 원색 금지.
