# demo-frontend — Job App UI Demo

`frontend-uiux/` 레퍼런스 이미지 3장을 폰 화면 6개로 재현한 데모예요.
React + TypeScript + Vite, 폰 목업(프레임·노치·상태바) 통짜 스타일로 구현했어요.

## 실행

```bash
npm install
npm run dev
```

→ http://localhost:5173 (갤러리 인덱스에서 6개 화면으로 이동)

## 라우트

| 경로 | 원본 | 화면 |
|---|---|---|
| `/` | — | 갤러리 인덱스 |
| `/p1-home` | 1번 이미지 | Let's Find Your Dream Job (연보라) |
| `/p1-list` | 1번 이미지 | 15 Jobs Available |
| `/p1-detail` | 1번 이미지 | Job Detail · 90% Sentiment 게이지 |
| `/p2-home` | 2번 이미지 | Discover New Job Matches (파란 3D 기울기) |
| `/p3-home` | 3번 이미지 | Matching Jobs (회색·블랙) |
| `/p3-detail` | 3번 이미지 | Led UX Designer 모달 |

## 구조

- `src/components/PhoneFrame.tsx` — 폰 프레임 + Dynamic Island + 상태바(+3D tilt 옵션)
- `src/components/BottomNav.tsx` — 하단 탭바
- `src/components/Logos.tsx` — 브랜드 로고 SVG (Google/Amazon/Netflix/Microsoft/Figma/Adobe)
- `src/pages/*` — 화면별 컴포넌트 + CSS

폰트는 Poppins(Google Fonts), 아이콘은 lucide-react, 원형 게이지·지도는 인라인 SVG/CSS로 재현했어요.